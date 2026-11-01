import { Service } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Espera } from '../models/espera';

// Lista de espera de funciones agotadas (mail RPP)
@Service()
export class ListaEspera {
    private supabase: SupabaseClient

    constructor() {
        this.supabase = createClient(environment.supabaseUrl, environment.supabasePublishableKey)
    }

    // Los que siguen en la fila de una función, en orden de llegada:
    // la posición de cada uno es su lugar en este arreglo + 1
    getEsperaDeFuncion(funcionId: number) {
        return this.supabase.from('lista_espera').select('*')
            .eq('funcion_id', funcionId).in('estado', ['esperando', 'avisado'])
            .order('created_at');
    }

    // Si ya está en la fila de esa función, el índice una_vez_en_la_lista
    // de la base rechaza el insert con el error 23505
    anotarse(funcionId: number, usuarioId: string) {
        const espera: Espera = { funcion_id: funcionId, usuario_id: usuarioId };
        return this.supabase.from('lista_espera').insert([espera]);
    }

    // Baja lógica: queda el historial, como el resto del proyecto
    salir(id: number) {
        return this.supabase.from('lista_espera').update({ estado: 'salio' }).eq('id', id);
    }
}
