export interface Funcion {
    id?: number;
    pelicula_id: number;
    sala_id: number;
    inicio: string;   // fecha y hora en formato ISO (toISOString), columna timestamptz
    fin: string;      // inicio + duración de la película (lo calcula Angular)
    formato: '2D' | '3D' | '4D' | '5D';
    idioma: 'castellano' | 'subtitulada';
    precio: number;
    precio_vip: number;
    activa?: boolean;
}
