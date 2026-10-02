import { Service } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Compra } from '../models/compra';
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

    // Baja lógica: se usa si fallan las entradas (y en S9, para la cancelación del cliente)
    cancelarCompra(id: number) {
        return this.supabase.from('compras').update({ estado: 'cancelada' }).eq('id', id);
    }

    // Solo el id: alcanza para saber si el usuario ya compró alguna vez (cupón de primera compra)
    getComprasPagadas(usuarioId: string) {
        return this.supabase.from('compras').select('id')
            .eq('usuario_id', usuarioId).eq('estado', 'pagada');
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
