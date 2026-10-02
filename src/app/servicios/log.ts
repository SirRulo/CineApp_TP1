import { inject, Service } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Actividad } from '../models/actividad';
import { Auth } from './auth';

// Log de actividad: lo llaman los componentes después de una acción que hay que dejar registrada
// (crear función, cambiar un precio, validar un QR). La pantalla para verlo es de S9.
@Service()
export class Log {
    private supabase: SupabaseClient

    // Un servicio puede usar a otro: Auth, para saber quién está logueado.
    // Con inject() y no por constructor: una clase @Service() no admite inyección por constructor
    // (Angular lo marca como error). Es la misma inject() que usa roleGuard.
    private auth = inject(Auth);

    constructor() {
        this.supabase = createClient(environment.supabaseUrl, environment.supabasePublishableKey)
    }

    // La fecha y hora la pone la base (created_at default now()).
    // Si falla, no se corta la acción que ya se hizo: solo queda el error en consola (como el profe).
    async registrar(accion: string, detalle: string) {
        const perfil = await this.auth.obtenerPerfil();
        const actividad: Actividad = {
            usuario_id: perfil?.id ?? null,
            accion: accion,
            detalle: detalle,
        };
        const result = await this.supabase.from('log_actividad').insert([actividad]);
        if (result.error) {
            console.error('No se pudo registrar en el log:', result.error.message);
        }
    }

    // Para la pantalla del admin (S9): lo más nuevo primero
    getActividad() {
        return this.supabase.from('log_actividad').select('*').order('created_at', { ascending: false });
    }
}
