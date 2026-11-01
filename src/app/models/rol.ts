// Rol configurable que arma el admin (mail RPP), ej. "Reportes"
export interface Rol {
    id?: number;
    nombre: string;
    activo?: boolean;   // lo pone la base: true
}

// Una sección del admin a la que entra un rol (tabla rol_secciones, PK compuesta)
export interface RolSeccion {
    rol_id: number;
    seccion: string;    // path de la pantalla hija del admin: 'reportes', 'peliculas'...
}
