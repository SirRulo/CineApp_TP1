import { Routes } from '@angular/router';
import { roleGuard } from './guards/role-guard';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
    },
    {
        path: 'home',
        loadComponent: () => import('./componentes/home/home').then(m => m.Home)
    },
    // :id = parámetro: /pelicula/3 carga la película 3 (se lee con paramMap)
    {
        path: 'pelicula/:id',
        loadComponent: () => import('./componentes/detalle-pelicula/detalle-pelicula').then(m => m.DetallePelicula)
    },
    // Mapa de butacas de una función (se puede entrar sin cuenta: la compra anónima está permitida)
    {
        path: 'funcion/:id',
        loadComponent: () => import('./componentes/seleccion-butacas/seleccion-butacas').then(m => m.SeleccionButacas)
    },
    // Paso intermedio: candy bar (también sin cuenta)
    {
        path: 'candy',
        loadComponent: () => import('./componentes/candy-bar/candy-bar').then(m => m.CandyBar)
    },
    // Pago de lo que quedó en el carrito (también sin cuenta)
    {
        path: 'compra',
        loadComponent: () => import('./componentes/compra/compra').then(m => m.Compra)
    },
    {
        path: 'registro',
        loadComponent: () => import('./componentes/registro/registro').then(m => m.Registro)
    },
    {
        path: 'login',
        loadComponent: () => import('./componentes/login/login').then(m => m.Login)
    },
    // Panel admin como módulo con carga perezosa (loadChildren), como mi-modulo de la cátedra.
    // canMatch: si el rol no coincide, para ese usuario la ruta "no existe" y termina en '**'.
    // Al estar acá, protege todas las rutas del módulo.
    {
        path: 'admin',
        canMatch: [roleGuard('admin')],
        loadChildren: () => import('./modulos/admin/admin-module').then(m => m.AdminModule)
    },
    {
        path: 'empleado',
        loadComponent: () => import('./componentes/empleado/empleado').then(m => m.Empleado),
        canMatch: [roleGuard('empleado')]
    },
    // Siempre al final: el router prueba las rutas en orden y '**' atrapa cualquier cosa.
    {
        path: '**',
        loadComponent: () => import('./componentes/error/error').then(m => m.Error)
    }
];
