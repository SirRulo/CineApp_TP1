export interface Cupon {
    id: number;
    codigo: string;
    descripcion: string | null;
    porcentaje: number;
    solo_primera_compra: boolean;
    edad_minima: number | null;  // null = sin límite de edad (el +50 es de S3)
    activo: boolean;
}
