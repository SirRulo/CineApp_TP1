import { Service } from '@angular/core';
import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Notificacion } from '../models/notificacion';

// Avisos dentro de la app (mail RPP: lista de espera y funciones canceladas).
// Se guardan en la tabla notificaciones y llegan en vivo con Realtime.
@Service()
export class Notificaciones {
    private supabase: SupabaseClient

    constructor() {
        this.supabase = createClient(environment.supabaseUrl, environment.supabasePublishableKey)
    }

    // Las del usuario, la más nueva primero
    getNotificacionesDeUsuario(usuarioId: string) {
        return this.supabase.from('notificaciones').select('*')
            .eq('usuario_id', usuarioId).order('created_at', { ascending: false });
    }

    // Varias en un solo insert (ej. a todos los compradores de una función cancelada)
    addNotificaciones(notificaciones: Notificacion[]) {
        return this.supabase.from('notificaciones').insert(notificaciones);
    }

    // Todas las del usuario que no había leído
    marcarLeidas(usuarioId: string) {
        return this.supabase.from('notificaciones').update({ leida: true })
            .eq('usuario_id', usuarioId).eq('leida', false);
    }

    // Igual que escucharEntradas (S5), pero solo los insert de este usuario.
    // payload.new = la fila nueva: se le pasa al componente para mostrarla sin volver a pedir todo
    escucharNotificaciones(usuarioId: string, alLlegar: (n: Notificacion) => void): RealtimeChannel {
        return this.supabase
            .channel('notificaciones-' + usuarioId)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: 'usuario_id=eq.' + usuarioId },
                (payload) => alLlegar(payload.new as Notificacion))
            .subscribe();
    }

    // Cierra el canal (se llama en ngOnDestroy, como unsubscribe)
    dejarDeEscuchar(canal: RealtimeChannel) {
        return this.supabase.removeChannel(canal);
    }
}
