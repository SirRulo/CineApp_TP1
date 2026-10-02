export interface Cupon {
    id: number;
    codigo: string;
    descripcion: string | null;
    porcentaje: number;
    solo_primera_compra: boolean;
    edad_minima: number | null;  // null = sin límite de edad; 50 = cupón para mayores de 50
    activo: boolean;
}
