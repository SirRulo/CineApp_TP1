export interface Producto {
    id?: number;                 // lo pone la base al insertar
    categoria_id: number;
    nombre: string;
    descripcion: string | null;  // opcional en la tabla
    precio: number;              // check (precio >= 0)
    imagen_url: string | null;   // URL en un campo, como imagen_url de peliculas
    activo?: boolean;            // default true en la base; baja lógica
}
