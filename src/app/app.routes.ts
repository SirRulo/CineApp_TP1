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
    {
        path: 'registro',
        loadComponent: () => import('./componentes/registro/registro').then(m => m.Registro)
    },
    {
        path: 'login',
        loadComponent: () => import('./componentes/login/login').then(m => m.Login)
    },
    // canMatch: si el rol no coincide, para ese usuario la ruta "no existe" y termina en '**'
    // Al estar en el padre, protege también a todas las rutas hijas (children).
    {
        path: 'admin',
        loadComponent: () => import('./componentes/admin/admin').then(m => m.Admin),
        canMatch: [roleGuard('admin')],
        children: [
            // /admin a secas muestra el listado
            {
                path: '',
                redirectTo: 'peliculas',
                pathMatch: 'full'
            },
            {
                path: 'peliculas',
                loadComponent: () => import('./componentes/lista-peliculas/lista-peliculas').then(m => m.ListaPeliculas)
            },
            {
                path: 'peliculas/nueva',
                loadComponent: () => import('./componentes/alta-pelicula/alta-pelicula').then(m => m.AltaPelicula)
            },
            // Mismo componente: si viene :id, trabaja en modo edición
            {
                path: 'peliculas/editar/:id',
                loadComponent: () => import('./componentes/alta-pelicula/alta-pelicula').then(m => m.AltaPelicula)
            },
            {
                path: 'funciones',
                loadComponent: () => import('./componentes/lista-funciones/lista-funciones').then(m => m.ListaFunciones)
            },
            {
                path: 'funciones/nueva',
                loadComponent: () => import('./componentes/alta-funcion/alta-funcion').then(m => m.AltaFuncion)
            }
        ]
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
