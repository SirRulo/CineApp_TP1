export interface Notificacion {
    id?: number;
    usuario_id: string;          // a quién va dirigida
    mensaje: string;
    link: string | null;         // a dónde lleva al tocarla, ej. '/funcion/12' (null = a ningún lado)
    leida?: boolean;             // lo pone la base: arranca en false
    created_at?: string;         // lo pone la base
}
