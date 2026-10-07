import { Service } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Pelicula } from '../models/pelicula';

@Service()
export class Peliculas {
    private supabase: SupabaseClient

    constructor() {
        this.supabase = createClient(environment.supabaseUrl, environment.supabasePublishableKey)
    }

    // ---- Preventa (mail 08/03). Son cuentas con fechas, no consultas: las usan el detalle y las butacas.

    // 'AAAA-MM-DD' → Date a las 00:00 hora local (como la fecha en AltaPelicula)
    fechaEstreno(p: Pelicula) {
        const [anio, mes, dia] = p.fecha_estreno.split('-').map(Number);
        return new Date(anio, mes - 1, dia);
    }

    // Desde cuándo se venden entradas: con preventa, dias_preventa (7) antes del estreno; sin preventa, el estreno.
    // new Date con día negativo o 0 lo resuelve Date (pasa al mes anterior), como los 14 días de AltaFuncion
    aperturaVenta(p: Pelicula) {
        const estreno = this.fechaEstreno(p);
        if (p.precio_preventa === null) {
            return estreno;
        }
        return new Date(estreno.getFullYear(), estreno.getMonth(), estreno.getDate() - (p.dias_preventa ?? 7));
    }

    ventaAbierta(p: Pelicula) {
        return new Date() >= this.aperturaVenta(p);
    }

    // En preventa = tiene precio de preventa y hoy está entre la apertura y el día del estreno (sin incluirlo)
    enPreventa(p: Pelicula) {
        return p.precio_preventa !== null && this.ventaAbierta(p) && new Date() < this.fechaEstreno(p);
    }

    getPeliculas() {
        // order: sin esto, Postgres no garantiza el orden y una fila recién actualizada puede saltar al final
        return this.supabase.from('peliculas').select('*').order('titulo');
    }

    // Cartelera: solo las activas; primero las destacadas (true antes que false) y después por título
    getPeliculasActivas() {
        return this.supabase.from('peliculas').select('*').eq('activa', true)
            .order('destacada', { ascending: false }).order('titulo');
    }

    // Como getPerfil: select con filtro → devuelve un arreglo, se lee data[0]
    getPelicula(id: number) {
        return this.supabase.from('peliculas').select('*').eq('id', id);
    }

    getGeneros() {
        return this.supabase.from('generos').select('*');
    }

    // .select() al final hace que Supabase devuelva la fila insertada (con su id nuevo),
    // que se necesita para después cargar sus géneros en pelicula_generos.
    addPelicula(pelicula: Pelicula) {
        return this.supabase.from('peliculas').insert([pelicula]).select();
    }

    updatePelicula(pelicula: Pelicula) {
        return this.supabase.from('peliculas').update(pelicula).eq('id', pelicula.id);
    }

    // Una fila por género: [{ pelicula_id: 1, genero_id: 3 }, { pelicula_id: 1, genero_id: 5 }]
    addGenerosDePelicula(peliculaId: number, generoIds: number[]) {
        const filas = generoIds.map(generoId => ({ pelicula_id: peliculaId, genero_id: generoId }));
        return this.supabase.from('pelicula_generos').insert(filas);
    }

    // Solo la columna genero_id: [{ genero_id: 3 }, { genero_id: 5 }]
    getGenerosDePelicula(peliculaId: number) {
        return this.supabase.from('pelicula_generos').select('genero_id').eq('pelicula_id', peliculaId);
    }

    // Toda la tabla de relación en una sola consulta (para el buscador de la cartelera):
    // [{ pelicula_id: 1, genero_id: 3 }, { pelicula_id: 1, genero_id: 5 }, { pelicula_id: 2, genero_id: 3 }, ...]
    getTodosLosGenerosDePeliculas() {
        return this.supabase.from('pelicula_generos').select('*');
    }

    // Borra las filas de la tabla de relación (no la película): se usa al editar,
    // antes de volver a insertar los géneros tildados.
    deleteGenerosDePelicula(peliculaId: number) {
        return this.supabase.from('pelicula_generos').delete().eq('pelicula_id', peliculaId);
    }
}
