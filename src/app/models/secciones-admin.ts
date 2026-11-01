// Las partes del panel admin que se pueden dar con un rol configurable (mail RPP).
// path = el primer tramo de la ruta hija: 'peliculas' cubre también peliculas/nueva y peliculas/editar/:id.
// "Roles" NO está: crear roles y asignarlos queda solo para el admin (nadie se da permisos a sí mismo).
export interface SeccionAdmin {
    path: string;
    nombre: string;
}

export const SECCIONES_ADMIN: SeccionAdmin[] = [
    { path: 'peliculas', nombre: 'Películas' },
    { path: 'funciones', nombre: 'Funciones' },
    { path: 'productos', nombre: 'Candy bar' },
    { path: 'cupones', nombre: 'Cupones' },
    { path: 'propuestas', nombre: 'Propuestas' },
    { path: 'reportes', nombre: 'Reportes' },
    { path: 'log', nombre: 'Actividad' },
];
