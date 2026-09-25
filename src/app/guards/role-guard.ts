import { inject } from '@angular/core';
import { CanMatchFn } from '@angular/router';
import { Auth } from '../servicios/auth';

// Función que DEVUELVE el guard, para poder pasarle el rol: roleGuard('admin').
// Misma idea que clavesCoincidenValidator(...) de clase-formularios, que devuelve un ValidatorFn.
export function roleGuard(rol: 'admin' | 'empleado'): CanMatchFn {
  return async (route, segments) => {
    const auth = inject(Auth);

    // El rol sale de la tabla 'perfiles' de Supabase (no de localStorage como en el ejemplo)
    const perfil = await auth.obtenerPerfil();

    if (!perfil || perfil.rol !== rol) {
      return false;
    }
    return true;
  };
}
