import { Component, signal } from '@angular/core';
import { email, form, FormField, max, min, minLength, required } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { RegistroData } from '../../models/registro-data';
import { Auth } from '../../servicios/auth';

@Component({
  imports: [FormField],
  selector: 'app-registro',
  styleUrl: './registro.css',
  templateUrl: './registro.html',
})
export class Registro {
  // Listas cerradas para los <select>
  tiposSangre = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'];
  coloresOjos = ['Marrones', 'Negros', 'Verdes', 'Celestes', 'Grises', 'Otro'];
  anioActual = new Date().getFullYear();

  // Un input numérico vacío vale NaN: así arrancan vacíos y "required" los marca.
  registroModel = signal<RegistroData>({
    email: '',
    password: '',
    nombre: '',
    apellido: '',
    dia: NaN,
    mes: NaN,
    anio: NaN,
    tipo_sangre: '',
    color_ojos: '',
    dias_vacaciones: NaN,
  });

  registroForm = form(this.registroModel, (schemaPath) => {
    required(schemaPath.email, { message: 'El mail es obligatorio' });
    email(schemaPath.email, { message: 'Ingresá un mail válido' });
    required(schemaPath.password, { message: 'La contraseña es obligatoria' });
    minLength(schemaPath.password, 6, { message: 'Mínimo 6 caracteres' });
    required(schemaPath.nombre, { message: 'El nombre es obligatorio' });
    required(schemaPath.apellido, { message: 'El apellido es obligatorio' });
    required(schemaPath.dia, { message: 'Falta el día' });
    min(schemaPath.dia, 1, { message: 'Día entre 1 y 31' });
    max(schemaPath.dia, 31, { message: 'Día entre 1 y 31' });
    required(schemaPath.mes, { message: 'Falta el mes' });
    min(schemaPath.mes, 1, { message: 'Mes entre 1 y 12' });
    max(schemaPath.mes, 12, { message: 'Mes entre 1 y 12' });
    required(schemaPath.anio, { message: 'Falta el año' });
    min(schemaPath.anio, 1900, { message: 'Año inválido' });
    max(schemaPath.anio, this.anioActual, { message: 'Año inválido' });
    required(schemaPath.tipo_sangre, { message: 'Elegí un tipo de sangre' });
    required(schemaPath.color_ojos, { message: 'Elegí un color de ojos' });
    required(schemaPath.dias_vacaciones, { message: 'Faltan los días de vacaciones' });
    min(schemaPath.dias_vacaciones, 0, { message: 'Entre 0 y 365' });
    max(schemaPath.dias_vacaciones, 365, { message: 'Entre 0 y 365' });
  });

  mensaje = signal('');

  constructor(private auth: Auth, private router: Router) {}

  async onSubmit(event: Event) {
    event.preventDefault();
    const datos = this.registroModel();

    // 0) Validar que la fecha exista ANTES del signUp. Si el insert de 'perfiles' fallara
    //    después, el usuario quedaría creado en Auth sin perfil (y desde el front no se puede borrar).
    //    new Date(2026, 1, 31) "se pasa" al 3 de marzo: si el mes cambió, la fecha no existe.
    const fecha = new Date(datos.anio, datos.mes - 1, datos.dia);
    if (fecha.getMonth() !== datos.mes - 1) {
      this.mensaje.set('La fecha de nacimiento no existe');
      return;
    }

    // 1) Crear el usuario en Supabase Auth (solo mail y contraseña)
    const result = await this.auth.signUp(datos.email, datos.password);
    if (result.error || !result.data.user) {
      this.mensaje.set('No se pudo registrar: ' + result.error?.message);
      return;
    }

    // 2) Guardar el resto en la tabla 'perfiles' (el rol lo pone la base: 'cliente')
    const mes = String(datos.mes).padStart(2, '0');
    const dia = String(datos.dia).padStart(2, '0');
    const perfil = await this.auth.crearPerfil({
      id: result.data.user.id,
      email: datos.email,
      nombre: datos.nombre,
      apellido: datos.apellido,
      fecha_nacimiento: `${datos.anio}-${mes}-${dia}`,
      tipo_sangre: datos.tipo_sangre,
      color_ojos: datos.color_ojos,
      dias_vacaciones: datos.dias_vacaciones,
    });
    if (perfil.error) {
      this.mensaje.set('No se pudo guardar el perfil: ' + perfil.error.message);
      return;
    }

    // Si Supabase ya dejó la sesión iniciada, el navbar muestra al usuario
    await this.auth.cargarPerfil();
    this.router.navigate(['/home']);
  }
}
