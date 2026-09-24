import { Service } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Perfil } from '../models/perfil';

@Service()
export class Auth {
    private supabase: SupabaseClient

    constructor() {
        this.supabase = createClient(environment.supabaseUrl, environment.supabasePublishableKey)
    }

    signIn(email: string, password: string) {
        return this.supabase.auth.signInWithPassword({ email, password });
    }

    signUp(email: string, password: string) {
        return this.supabase.auth.signUp({ email, password });
    }

    signOut() {
        return this.supabase.auth.signOut();
    }

    getUser() {
        return this.supabase.auth.getUser();
    }

    getPerfil(id: string) {
        return this.supabase.from('perfiles').select('*').eq('id', id);
    }

    crearPerfil(perfil: Perfil) {
        return this.supabase.from('perfiles').insert([perfil]);
    }
}
