// Una fila por butaca comprada
export interface Entrada {
    id?: number;
    compra_id: number;
    funcion_id: number;
    butaca_id: number;
    precio: number;
    estado?: 'activa' | 'cancelada';  // lo pone la base ('activa')
}
