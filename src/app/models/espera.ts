// Un lugar en la lista de espera de una función agotada (tabla lista_espera)
export interface Espera {
    id?: number;
    funcion_id: number;
    usuario_id: string;          // solo registrados
    // esperando: en la fila · avisado: se le liberó una butaca (15 min para comprar)
    // compro / vencido / salio: ya no está en la fila
    estado?: 'esperando' | 'avisado' | 'compro' | 'vencido' | 'salio';   // lo pone la base: 'esperando'
    butaca_id?: number | null;   // la butaca que se le guarda mientras está avisado
    avisado_en?: string | null;  // desde cuándo corren sus 15 min
    created_at?: string;         // lo pone la base; ordena la fila (la posición se calcula)
}
