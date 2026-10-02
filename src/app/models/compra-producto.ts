// Fila de compra_productos: lleva producto_id O combo_id (los combos son de S7)
export interface CompraProducto {
    id?: number;                 // lo pone la base
    compra_id: number;
    producto_id: number | null;
    combo_id: number | null;
    cantidad: number;            // check (cantidad > 0)
    precio_unitario: number;     // el precio de ese momento: si después cambia, la compra no se altera
}
