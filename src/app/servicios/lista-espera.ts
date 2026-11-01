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

    // ---------- Turno de 15 minutos del avisado ----------

    readonly minutosTurno = 15;

    // Hasta cuándo le guardamos la butaca (avisado_en + 15 min)
    venceEn(espera: Espera) {
        return new Date(new Date(espera.avisado_en!).getTime() + this.minutosTurno * 60000);
    }

    // Avisado y todavía dentro de sus 15 minutos
    turnoVigente(espera: Espera) {
        return espera.estado === 'avisado' && !!espera.avisado_en && this.venceEn(espera) > new Date();
    }

    // Baja lógica: queda el historial, como el resto del proyecto
    salir(id: number) {
        return this.supabase.from('lista_espera').update({ estado: 'salio' }).eq('id', id);
    }

    // Cuenta perezosa de los 15 min (no hay nada corriendo en el servidor): la llama el mapa
    // al abrirse y con cada aviso de Realtime. Los avisados a los que se les pasó el turno
    // pasan a 'vencido' y su butaca va al siguiente de la fila.
    async vencerTurnos(funcionId: number, descripcion: string) {
        const result = await this.supabase.from('lista_espera').select('*')
            .eq('funcion_id', funcionId).eq('estado', 'avisado');
        if (result.error) {
            console.error(result.error);
            return;
        }
        for (const espera of result.data as Espera[]) {
            if (this.turnoVigente(espera)) {
                continue;
            }
            // Solo si sigue avisado: si dos personas abren el mapa a la vez, lo vence una sola
            const vencido = await this.supabase.from('lista_espera').update({ estado: 'vencido' })
                .eq('id', espera.id).eq('estado', 'avisado').select();
            if (vencido.error || vencido.data.length === 0) {
                continue;
            }
            const aviso = await this.notificaciones.addNotificaciones([{
                usuario_id: espera.usuario_id,
                mensaje: `Se venció tu turno para ${descripcion}: pasaron ${this.minutosTurno} minutos sin comprar.`,
                link: null,
            }]);
            if (aviso.error) {
                console.error(aviso.error);
            }
            // La butaca pasa al siguiente, salvo que justo la haya comprado alguien
            if (espera.butaca_id && await this.butacaLibre(funcionId, espera.butaca_id)) {
                await this.avisarAlPrimero(funcionId, espera.butaca_id, descripcion);
            }
        }
    }

    // ¿Nadie tiene una entrada activa para esa butaca en esa función?
    private async butacaLibre(funcionId: number, butacaId: number) {
        const result = await this.supabase.from('entradas').select('id')
            .eq('funcion_id', funcionId).eq('butaca_id', butacaId).eq('estado', 'activa');
        return !result.error && result.data.length === 0;
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
