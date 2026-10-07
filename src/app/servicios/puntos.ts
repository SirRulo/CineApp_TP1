import { Service } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { MovimientoPuntos } from '../models/movimiento-puntos';

// Programa de puntos (mail 03/03). Mismo patrón que el crédito en Compras: movimientos + saldo calculado.
@Service()
export class Puntos {
    private supabase: SupabaseClient

    constructor() {
        this.supabase = createClient(environment.supabaseUrl, environment.supabasePublishableKey)
    }

    addMovimiento(movimiento: MovimientoPuntos) {
        return this.supabase.from('movimientos_puntos').insert([movimiento]);
    }

    getMovimientos(usuarioId: string) {
        return this.supabase.from('movimientos_puntos').select('*')
            .eq('usuario_id', usuarioId).order('created_at', { ascending: false });
    }

    // Saldo = acumulaciones − canjes − reversos. null si no se pudo calcular (como getSaldoCredito)
    async getSaldo(usuarioId: string): Promise<number | null> {
        const result = await this.getMovimientos(usuarioId);
        if (result.error) {
            return null;
        }
        let saldo = 0;
        for (const m of result.data) {
            saldo += m.tipo === 'acumulacion' ? m.puntos : -m.puntos;
        }
        return saldo;
    }

    // Los puntos que sumó una compra (para el reverso al cancelar). 0 si no sumó (anónima o anterior a los puntos)
    async getPuntosDeCompra(usuarioId: string, compraId: number) {
        const result = await this.getMovimientos(usuarioId);
        if (result.error) {
            return 0;
        }
        let puntos = 0;
        for (const m of result.data) {
            if (m.compra_id === compraId && m.tipo === 'acumulacion') {
                puntos += m.puntos;
            }
        }
        return puntos;
    }

    // 1 punto por peso pagado, sin centavos. Solo lo cobrado con el otro medio (total), no lo pagado con crédito:
    // esa plata ya había sumado puntos en la compra que se canceló
    puntosPor(total: number) {
        return Math.floor(Number(total));
    }
}
