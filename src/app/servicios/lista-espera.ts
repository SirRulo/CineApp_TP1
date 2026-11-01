import { inject, Service } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Espera } from '../models/espera';
import { Notificaciones } from './notificaciones';

// Lista de espera de funciones agotadas (mail RPP)
@Service()
export class ListaEspera {
    private supabase: SupabaseClient
    // inject() y no constructor: una clase @Service() no admite inyección por constructor (como Log)
    private notificaciones = inject(Notificaciones);

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

    // Le guarda la butaca y arranca sus 15 min, SOLO si sigue esperando (como validarIngreso:
    // chequeo y cambio en una sentencia). data vacío = a esa persona ya la avisó otra cancelación
    private marcarAvisado(id: number, butacaId: number) {
        return this.supabase.from('lista_espera')
            .update({ estado: 'avisado', butaca_id: butacaId, avisado_en: new Date().toISOString() })
            .eq('id', id).eq('estado', 'esperando').select();
    }

    // Se liberó una butaca: se le da al primero que sigue esperando y se le avisa.
    // Si justo otra cancelación lo avisó antes (data vacío), se prueba con el siguiente.
    // Devuelve true si avisó a alguien; false si no había nadie (o falló: la butaca queda libre para todos)
    async avisarAlPrimero(funcionId: number, butacaId: number, descripcion: string) {
        for (let intento = 0; intento < 5; intento++) {
            const fila = await this.supabase.from('lista_espera').select('*')
                .eq('funcion_id', funcionId).eq('estado', 'esperando').order('created_at');
            if (fila.error || fila.data.length === 0) {
                return false;
            }
            const primero: Espera = fila.data[0];

            const result = await this.marcarAvisado(primero.id!, butacaId);
            if (result.error) {
                return false;
            }
            if (result.data.length === 0) {
                continue;   // ya lo había avisado otro: vuelve a buscar al primero
            }

            const aviso = await this.notificaciones.addNotificaciones([{
                usuario_id: primero.usuario_id,
                mensaje: `Se liberó una butaca para ${descripcion}. Tenés 15 minutos para comprarla.`,
                link: '/funcion/' + funcionId,
            }]);
            if (aviso.error) {
                console.error(aviso.error);   // quedó avisado igual: lo ve en el mapa y en su perfil
            }
            return true;
        }
        return false;
    }
}
