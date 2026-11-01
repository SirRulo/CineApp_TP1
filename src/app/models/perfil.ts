export interface Perfil {
    id: string;
    email: string;
    nombre: string;
    apellido: string;
    fecha_nacimiento: string;
    tipo_sangre: string;
    color_ojos: string;
    dias_vacaciones: number;
    rol?: 'cliente' | 'empleado' | 'admin';
    rol_id?: number | null;   // rol configurable (mail RPP): suma secciones del admin. null = ninguno
}
