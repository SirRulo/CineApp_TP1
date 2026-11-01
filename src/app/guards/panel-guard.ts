import { inject } from '@angular/core';
import { CanMatchFn } from '@angular/router';
import { Auth } from '../servicios/auth';

// canMatch del panel (/admin): entra el admin o quien tenga un rol configurable con alguna sección
// (mail RPP). Reemplaza a roleGuard('admin') en esa ruta. Si no puede, la ruta "no existe" (Error).
// A qué pantalla de adentro puede ir lo decide seccionGuard.
export const panelGuard: CanMatchFn = async (route, segments) => {
  const auth = inject(Auth);
  const perfil = await auth.obtenerPerfil();
  if (!perfil) {
    return false;
  }
  return perfil.rol === 'admin' || auth.secciones().length > 0;
};
