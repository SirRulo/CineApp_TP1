export interface Compra {
    id?: number;
    codigo: string;             // el que se valida en la puerta (lo genera Angular)
    usuario_id: string | null;  // null = compra anónima
    funcion_id: number;
    cupon_id: number | null;    // null = sin cupón
    subtotal: number;
    descuento: number;
    total: number;
    credito_usado?: number;     // crédito a favor usado en esta compra (default 0 en la base)
    estado?: 'pagada' | 'cancelada';  // lo pone la base ('pagada')
    created_at?: string;
    // Las dos marcas del código (S4): null = todavía no se usó. Las pone el empleado al validar.
    ingreso_validado_en?: string | null;   // fecha y hora (timestamptz)
    ingreso_validado_por?: string | null;  // uuid del empleado
    candy_entregado_en?: string | null;
    candy_entregado_por?: string | null;
}
