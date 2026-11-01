export interface Propuesta {
    id?: number;
    usuario_id: string;          // uuid del perfil (solo registrados proponen)
    titulo: string;
    descripcion: string;
    motivo: string;              // por qué la quiere en el cine
    estado?: 'pendiente' | 'aceptada' | 'rechazada';   // lo pone la base: arranca en 'pendiente'
    created_at?: string;         // lo pone la base
}
