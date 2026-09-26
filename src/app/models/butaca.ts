export interface Butaca {
    id: number;
    sala_id: number;
    fila: string;
    numero: number;
    tipo: 'normal' | 'accesible' | 'vip';
}
