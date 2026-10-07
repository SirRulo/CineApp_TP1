// Puntos del cliente (mail 03/03): igual que el crédito, no hay columna de saldo; el saldo es la suma de los movimientos.
// acumulacion = suma (1 punto por peso pagado) · canje = resta (no implementado) · reverso = resta (se canceló la compra).
// Los puntos se guardan siempre positivos; el tipo dice si suman o restan.
export interface MovimientoPuntos {
    id?: number;
    usuario_id: string;
    tipo: 'acumulacion' | 'canje' | 'reverso';
    puntos: number;
    compra_id: number | null;
    recompensa_id?: number | null;
    created_at?: string;
}
