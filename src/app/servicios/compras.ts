import { Service } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Compra } from '../models/compra';
import { CompraProducto } from '../models/compra-producto';
import { Cupon } from '../models/cupon';
import { Entrada } from '../models/entrada';

@Service()
export class Compras {
    private supabase: SupabaseClient

    constructor() {
        this.supabase = createClient(environment.supabaseUrl, environment.supabasePublishableKey)
    }

    // .select() para que devuelva la fila con su id: hace falta para cargar las entradas
    addCompra(compra: Compra) {
        return this.supabase.from('compras').insert([compra]).select();
    }

    // Todas las entradas de la compra en un solo insert. Si una butaca ya estaba vendida,
    // el índice único butaca_vendida_una_vez hace fallar este insert (y no se guarda ninguna).
    addEntradas(entradas: Entrada[]) {
        return this.supabase.from('entradas').insert(entradas);
    }

    // El candy de la compra, todo en un solo insert (como las entradas)
    addProductosDeCompra(filas: CompraProducto[]) {
        return this.supabase.from('compra_productos').insert(filas);
    }

    // Baja lógica: se usa si fallan las entradas (y en S9, para la cancelación del cliente)
    cancelarCompra(id: number) {
        return this.supabase.from('compras').update({ estado: 'cancelada' }).eq('id', id);
    }

    // ---------- Validación en la puerta y en el candy (S4) ----------

    // El código se guarda en mayúsculas: se pasa a mayúsculas lo que tipeó el empleado
    getCompraPorCodigo(codigo: string) {
        return this.supabase.from('compras').select('*').eq('codigo', codigo.trim().toUpperCase());
    }

    getEntradasDeCompra(compraId: number) {
        return this.supabase.from('entradas').select('*').eq('compra_id', compraId);
    }

    getProductosDeCompra(compraId: number) {
        return this.supabase.from('compra_productos').select('*').eq('compra_id', compraId);
    }

    // Marca el ingreso. .is(..., null) = "solo si todavía nadie lo validó": si dos empleados
    // validan el mismo código a la vez, el segundo no encuentra fila para actualizar.
    // .select() devuelve las filas actualizadas: vacío = ya estaba usado.
    validarIngreso(compraId: number, empleadoId: string) {
        return this.supabase.from('compras')
            .update({ ingreso_validado_en: new Date().toISOString(), ingreso_validado_por: empleadoId })
            .eq('id', compraId).is('ingreso_validado_en', null).select();
    }

    // Lo mismo para el candy: se puede entregar una sola vez
    entregarCandy(compraId: number, empleadoId: string) {
        return this.supabase.from('compras')
            .update({ candy_entregado_en: new Date().toISOString(), candy_entregado_por: empleadoId })
            .eq('id', compraId).is('candy_entregado_en', null).select();
    }

    // Solo el id: alcanza para saber si el usuario ya compró alguna vez (cupón de primera compra)
    getComprasPagadas(usuarioId: string) {
        return this.supabase.from('compras').select('id')
            .eq('usuario_id', usuarioId).eq('estado', 'pagada');
    }

    // ---------- Reportes del admin (S6) ----------

    // Compras pagadas (las canceladas no facturan): fecha y total, de la más vieja a la más nueva
    getComprasParaReporte() {
        return this.supabase.from('compras').select('id, created_at, total')
            .eq('estado', 'pagada').order('created_at');
    }

    // compra_id de cada entrada activa: para contar cuántas entradas tiene cada compra
    getEntradasActivas() {
        return this.supabase.from('entradas').select('compra_id').eq('estado', 'activa');
    }

    // Para el top 3: solo el funcion_id de cada entrada activa (una cancelada no cuenta como vendida).
    // La cuenta por película se hace en Home (group by / count no están en el material).
    getEntradasVendidas() {
        return this.supabase.from('entradas').select('funcion_id').eq('estado', 'activa');
    }

    // El porcentaje sale de la tabla y no del código: el admin lo puede cambiar (S3)
    getCuponPrimeraCompra() {
        return this.supabase.from('cupones').select('*')
            .eq('solo_primera_compra', true).eq('activo', true);
    }

    // Cupones por edad (ej. MAYORES50): los activos que tienen edad_minima cargada.
    // Si el usuario llega a esa edad lo decide la compra (la edad sale de su fecha de nacimiento).
    getCuponesPorEdad() {
        return this.supabase.from('cupones').select('*')
            .eq('activo', true).not('edad_minima', 'is', null);
    }

    // Para el panel admin: todos (activos e inactivos), ordenados por código
    getCupones() {
        return this.supabase.from('cupones').select('*').order('codigo');
    }

    // Igual que updatePelicula: cambia porcentaje o activo
    updateCupon(cupon: Cupon) {
        return this.supabase.from('cupones').update(cupon).eq('id', cupon.id);
    }
}
