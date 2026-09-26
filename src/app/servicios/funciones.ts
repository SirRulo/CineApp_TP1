import { Service } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Funcion } from '../models/funcion';

@Service()
export class Funciones {
    private supabase: SupabaseClient

    constructor() {
        this.supabase = createClient(environment.supabaseUrl, environment.supabasePublishableKey)
    }

    // Solo las salas activas: son las únicas donde se puede programar una función
    getSalas() {
        return this.supabase.from('salas').select('*').eq('activa', true).order('nombre');
    }

    // Todas las funciones (activas e inactivas) para el listado del admin
    getFunciones() {
        return this.supabase.from('funciones').select('*').order('inicio');
    }

    // Las funciones activas de una sala: contra estas se controla la regla de los 30 minutos
    getFuncionesDeSala(salaId: number) {
        return this.supabase.from('funciones').select('*').eq('sala_id', salaId).eq('activa', true);
    }

    // Para el detalle de la película (cliente): solo las activas que todavía no empezaron.
    // gte = "mayor o igual que" (greater than or equal)
    getFuncionesDePelicula(peliculaId: number) {
        return this.supabase.from('funciones').select('*')
            .eq('pelicula_id', peliculaId).eq('activa', true)
            .gte('inicio', new Date().toISOString())
            .order('inicio');
    }

    // Una sola función (para la pantalla de butacas): devuelve un arreglo, se lee data[0]
    getFuncion(id: number) {
        return this.supabase.from('funciones').select('*').eq('id', id);
    }

    // Las 518 butacas de la sala, ordenadas por fila (A–T) y número (1–30) para armar el mapa
    getButacasDeSala(salaId: number) {
        return this.supabase.from('butacas').select('*').eq('sala_id', salaId)
            .order('fila').order('numero');
    }

    // Las butacas ya vendidas de la función: solo las entradas activas
    // (una entrada cancelada libera la butaca)
    getButacasOcupadas(funcionId: number) {
        return this.supabase.from('entradas').select('butaca_id')
            .eq('funcion_id', funcionId).eq('estado', 'activa');
    }

    addFuncion(funcion: Funcion) {
        return this.supabase.from('funciones').insert([funcion]);
    }

    updateFuncion(funcion: Funcion) {
        return this.supabase.from('funciones').update(funcion).eq('id', funcion.id);
    }
}
