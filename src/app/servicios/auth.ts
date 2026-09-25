import { Service, signal } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Perfil } from '../models/perfil';

@Service()
export class Auth {
    private supabase: SupabaseClient

    // Estado de sesión compartido: el perfil del usuario logueado, o null si no hay nadie.
    // Lo leen el navbar y los guards; como es un signal, el navbar se actualiza solo.
    perfil = signal<Perfil | null>(null);

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

    // Pregunta a Supabase quién está logueado, busca su perfil y lo guarda en el signal.
    async cargarPerfil(): Promise<Perfil | null> {
        const usuario = await this.getUser();
        if (!usuario.data.user) {
            this.perfil.set(null);
            return null;
        }
        const result = await this.getPerfil(usuario.data.user.id);
        if (result.error || result.data.length === 0) {
            this.perfil.set(null);
            return null;
        }
        this.perfil.set(result.data[0]);
        return result.data[0];
    }

    // Para los guards: si el perfil ya está cargado lo devuelve; si no (ej. al recargar la página), lo busca.
    async obtenerPerfil(): Promise<Perfil | null> {
        if (this.perfil()) {
            return this.perfil();
        }
        return this.cargarPerfil();
    }

    async cerrarSesion() {
        await this.signOut();
        this.perfil.set(null);
    }
}
