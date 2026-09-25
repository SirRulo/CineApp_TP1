export interface Pelicula {
    id?: number;
    titulo: string;
    sinopsis: string;
    duracion_min: number;
    imagen_url: string;
    edad_minima: 0 | 13 | 18;
    fecha_estreno: string;
    dias_preventa?: number;
    precio_preventa: number | null;
    destacada?: boolean;
    activa?: boolean;
}
