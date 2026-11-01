import { Service } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Rol, RolSeccion } from '../models/rol';

// Roles configurables (mail RPP): el admin los crea, elige a qué secciones entran y se los da a un usuario
@Service()
export class Roles {
    private supabase: SupabaseClient

    constructor() {
        this.supabase = createClient(environment.supabaseUrl, environment.supabasePublishableKey)
    }

    getRoles() {
        return this.supabase.from('roles').select('*').order('nombre');
    }

    // Devuelve el rol creado (con su id), como addPelicula. nombre es unique: si se repite, 23505
    addRol(nombre: string) {
        return this.supabase.from('roles').insert([{ nombre }]).select();
    }

    // Baja lógica (activo), como cupones y productos
    updateRol(rol: Rol) {
        return this.supabase.from('roles').update(rol).eq('id', rol.id);
    }

    // Todas las filas de rol_secciones en una consulta (el listado las agrupa por rol)
    getTodasLasSecciones() {
        return this.supabase.from('rol_secciones').select('*');
    }

    getSeccionesDeRol(rolId: number) {
        return this.supabase.from('rol_secciones').select('seccion').eq('rol_id', rolId);
    }

    // Cambiar las secciones = borrar las viejas e insertar las nuevas, igual que los géneros de una
    // película (pelicula_generos): es una tabla de relación, no se pierde ningún dato propio
    deleteSeccionesDeRol(rolId: number) {
        return this.supabase.from('rol_secciones').delete().eq('rol_id', rolId);
    }

    addSeccionesDeRol(rolId: number, secciones: string[]) {
        const filas: RolSeccion[] = secciones.map(seccion => ({ rol_id: rolId, seccion }));
        return this.supabase.from('rol_secciones').insert(filas);
    }

    // Darle (o sacarle, con null) un rol configurable a un usuario
    asignarRol(usuarioId: string, rolId: number | null) {
        return this.supabase.from('perfiles').update({ rol_id: rolId }).eq('id', usuarioId);
    }
}
