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

    getPeliculas() {
        // order: sin esto, Postgres no garantiza el orden y una fila recién actualizada puede saltar al final
        return this.supabase.from('peliculas').select('*').order('titulo');
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
}
