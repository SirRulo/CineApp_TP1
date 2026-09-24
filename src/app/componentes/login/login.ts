import { Component, signal } from '@angular/core';
import { email, form, FormField, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { LoginData } from '../../models/login-data';
import { Auth } from '../../servicios/auth';

@Component({
  imports: [FormField, RouterLink],
  selector: 'app-login',
  styleUrl: './login.css',
  templateUrl: './login.html',
})
export class Login {
  loginModel = signal<LoginData>({
    email: '',
    password: '',
  });

  loginForm = form(this.loginModel, (schemaPath) => {
    required(schemaPath.email, { message: 'El mail es obligatorio' });
    email(schemaPath.email, { message: 'Ingresá un mail válido' });
    required(schemaPath.password, { message: 'La contraseña es obligatoria' });
  });

  mensaje = signal('');

  constructor(private auth: Auth, private router: Router) {}

  async onSubmit(event: Event) {
    event.preventDefault();
    const credenciales = this.loginModel();

    // 1) Iniciar sesión en Supabase Auth
    const result = await this.auth.signIn(credenciales.email, credenciales.password);
    if (result.error) {
      this.mensaje.set('No se pudo iniciar sesión: ' + result.error.message);
      return;
    }

    // 2) Buscar el perfil para saber el rol
    const perfil = await this.auth.getPerfil(result.data.user.id);
    if (perfil.error || perfil.data.length === 0) {
      this.mensaje.set('No se encontró el perfil del usuario');
      return;
    }

    // 3) Redirigir según el rol
    const rol = perfil.data[0].rol;
    if (rol === 'admin') {
      this.router.navigate(['/admin']);
    } else if (rol === 'empleado') {
      this.router.navigate(['/empleado']);
    } else {
      this.router.navigate(['/home']);
    }
  }
}
