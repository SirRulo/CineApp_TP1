// Fila de log_actividad: quién hizo qué y cuándo
export interface Actividad {
    id?: number;                 // lo pone la base
    usuario_id: string | null;   // uuid del perfil (null si no se pudo saber quién fue)
    accion: string;              // ej. 'Crear función', 'Cambiar precio', 'Validar entrada'
    detalle: string | null;
    created_at?: string;         // default now() en la base: fecha y hora
}
