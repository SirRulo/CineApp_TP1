import { Service } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Resena } from '../models/resena';

@Service()
export class Resenas {
    private supabase: SupabaseClient

    constructor() {
        this.supabase = createClient(environment.supabaseUrl, environment.supabasePublishableKey)
    }

    // Las más nuevas primero (ascending: false, como la cartelera con destacada)
    getResenasDePelicula(peliculaId: number) {
        return this.supabase.from('resenas').select('*')
            .eq('pelicula_id', peliculaId).order('created_at', { ascending: false });
    }

    // Una por persona y película: si ya existe, el unique (pelicula_id, usuario_id)
    // de la base rechaza el insert con el error 23505
    addResena(resena: Resena) {
        return this.supabase.from('resenas').insert([resena]);
    }
}
