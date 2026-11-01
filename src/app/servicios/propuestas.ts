import { Service } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Propuesta } from '../models/propuesta';

@Service()
export class Propuestas {
    private supabase: SupabaseClient

    constructor() {
        this.supabase = createClient(environment.supabaseUrl, environment.supabasePublishableKey)
    }

    // Las del cliente, la más nueva primero (la primera es la que se muestra como "tu propuesta")
    getPropuestasDeUsuario(usuarioId: string) {
        return this.supabase.from('propuestas').select('*')
            .eq('usuario_id', usuarioId).order('created_at', { ascending: false });
    }

    // Todas, para el admin (más nuevas primero)
    getPropuestas() {
        return this.supabase.from('propuestas').select('*').order('created_at', { ascending: false });
    }

    // Una pendiente por cliente: si ya tiene una, el índice una_propuesta_pendiente
    // de la base rechaza el insert con el error 23505
    addPropuesta(propuesta: Propuesta) {
        return this.supabase.from('propuestas').insert([propuesta]);
    }

    // Aceptar o rechazar, solo si sigue pendiente (como validarIngreso: chequeo y cambio
    // en una sola sentencia). data vacío = otro admin ya la había respondido
    responderPropuesta(id: number, estado: 'aceptada' | 'rechazada') {
        return this.supabase.from('propuestas').update({ estado })
            .eq('id', id).eq('estado', 'pendiente').select();
    }
}
