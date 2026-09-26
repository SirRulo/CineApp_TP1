export interface Resena {
    id?: number;
    pelicula_id: number;
    usuario_id: string;          // uuid del perfil (solo registrados reseñan)
    estrellas: number;           // 1 a 5 (check de la base)
    comentario: string | null;   // opcional: null = solo estrellas
    created_at?: string;         // lo pone la base
}
