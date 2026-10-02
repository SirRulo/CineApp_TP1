import { Service } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Producto } from '../models/producto';

@Service()
export class Candy {
    private supabase: SupabaseClient

    constructor() {
        this.supabase = createClient(environment.supabaseUrl, environment.supabasePublishableKey)
    }

    getCategorias() {
        return this.supabase.from('categorias').select('*').order('nombre');
    }

    // Para el panel admin: todos (activos e inactivos)
    getProductos() {
        return this.supabase.from('productos').select('*').order('nombre');
    }

    // Para la compra: solo los que se venden
    getProductosActivos() {
        return this.supabase.from('productos').select('*').eq('activo', true).order('nombre');
    }

    // Como getPelicula: select con filtro → arreglo, se lee data[0]
    getProducto(id: number) {
        return this.supabase.from('productos').select('*').eq('id', id);
    }

    // Sin .select(): después del alta no hace falta el id
    addProducto(producto: Producto) {
        return this.supabase.from('productos').insert([producto]);
    }

    // Editar datos o activar/desactivar (baja lógica)
    updateProducto(producto: Producto) {
        return this.supabase.from('productos').update(producto).eq('id', producto.id);
    }
}
