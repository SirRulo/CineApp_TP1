import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../servicios/auth';

// Solo pide estar logueado (cualquier rol). Igual que authGuard de la cátedra (guards),
// pero el usuario sale de la sesión de Supabase. Si no hay sesión, manda al login.
// canActivate (y no canMatch) porque la ruta sí existe para todos: solo hay que iniciar sesión.
export const authGuard: CanActivateFn = async (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  const perfil = await auth.obtenerPerfil();
  if (perfil) {
    return true;
  }
  router.navigate(['/login']);
  return false;
};
