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

    // Para el log del admin: solo lo necesario para mostrar quién hizo cada acción
    getPerfiles() {
        return this.supabase.from('perfiles').select('id, nombre, apellido, rol');
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

    // fecha 'AAAA-MM-DD' → años cumplidos hoy (antes estaba en Compra, para el cupón +50).
    // Resta los años y, si este año todavía no llegó el cumpleaños, resta uno más.
    calcularEdad(fechaNacimiento: string) {
        const [anio, mes, dia] = fechaNacimiento.split('-').map(Number);
        const hoy = new Date();
        let edad = hoy.getFullYear() - anio;
        const mesHoy = hoy.getMonth() + 1; // getMonth va de 0 a 11
        if (mesHoy < mes || (mesHoy === mes && hoy.getDate() < dia)) {
            edad--;
        }
        return edad;
    }

    // Restricción de edad de una película (0 = ATP, 13 o 18): '' si puede comprar, o el motivo.
    // Sin sesión no se sabe la edad: para +13/+18 hay que ingresar (decisión de Franco, 02/10).
    restriccionDeEdad(edadMinima: number, perfil: Perfil | null) {
        if (edadMinima === 0) {
            return '';
        }
        if (!perfil) {
            return `Película +${edadMinima}: ingresá con tu cuenta para comprar`;
        }
        if (this.calcularEdad(perfil.fecha_nacimiento) < edadMinima) {
            return `Esta película es solo para mayores de ${edadMinima} años`;
        }
        return '';
    }

    async cerrarSesion() {
        await this.signOut();
        this.perfil.set(null);
    }
}
