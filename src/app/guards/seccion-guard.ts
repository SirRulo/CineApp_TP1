import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { SECCIONES_ADMIN } from '../models/secciones-admin';
import { Auth } from '../servicios/auth';

// canActivateChild del panel admin (como childGuard de la cátedra): corre antes de cada pantalla hija.
// La sección es el primer tramo de su ruta: 'peliculas/editar/:id' → 'peliculas'.
// Si no la tiene, lo manda a la primera sección que sí puede ver (UrlTree = redirigir).
export const seccionGuard: CanActivateChildFn = async (childRoute, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  const perfil = await auth.obtenerPerfil();
  if (!perfil) {
    return router.createUrlTree(['/login']);
  }

  const seccion = childRoute.routeConfig?.path?.split('/')[0] ?? '';
  if (auth.puedeEntrar(seccion)) {
    return true;
  }

  // Ej.: /admin a secas redirige a 'peliculas'; con un rol "Reportes" termina en /admin/reportes
  const primera = SECCIONES_ADMIN.find(s => auth.puedeEntrar(s.path));
  return primera ? router.createUrlTree(['/admin', primera.path]) : router.createUrlTree(['/home']);
};
