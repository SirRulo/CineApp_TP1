export interface Compra {
    id?: number;
    codigo: string;             // el que se valida en la puerta (lo genera Angular)
    usuario_id: string | null;  // null = compra anónima
    funcion_id: number;
    cupon_id: number | null;    // null = sin cupón
    subtotal: number;
    descuento: number;
    total: number;
    credito_usado?: number;     // lo pone la base (0) hasta S9
    estado?: 'pagada' | 'cancelada';  // lo pone la base ('pagada')
    created_at?: string;
}
