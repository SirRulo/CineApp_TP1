// Crédito del cliente: no hay columna de saldo, el saldo es la suma de estos movimientos.
// cancelacion = suma a favor (se canceló una compra) · uso = se gastó al pagar (S9 paso 2).
// El monto se guarda siempre positivo; el tipo dice si suma o resta.
export interface MovimientoCredito {
    id?: number;
    usuario_id: string;
    tipo: 'cancelacion' | 'uso';
    monto: number;
    compra_id: number | null;
    created_at?: string;
}
