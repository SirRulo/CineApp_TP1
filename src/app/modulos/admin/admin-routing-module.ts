import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Admin } from '../../componentes/admin/admin';

// Rutas del panel admin. Son relativas a /admin (el path 'admin' está en app.routes.ts).
// Admin es el marco (menú + <router-outlet />); las pantallas son sus hijas, cada una
// standalone y con carga perezosa (loadComponent), igual que antes.
const routes: Routes = [
    {
        path: '',
        component: Admin,
        children: [
            // /admin a secas muestra el listado
            {
                path: '',
                redirectTo: 'peliculas',
                pathMatch: 'full'
            },
            {
                path: 'peliculas',
                loadComponent: () => import('../../componentes/lista-peliculas/lista-peliculas').then(m => m.ListaPeliculas)
            },
            {
                path: 'peliculas/nueva',
                loadComponent: () => import('../../componentes/alta-pelicula/alta-pelicula').then(m => m.AltaPelicula)
            },
            // Mismo componente: si viene :id, trabaja en modo edición
            {
                path: 'peliculas/editar/:id',
                loadComponent: () => import('../../componentes/alta-pelicula/alta-pelicula').then(m => m.AltaPelicula)
            },
            {
                path: 'funciones',
                loadComponent: () => import('../../componentes/lista-funciones/lista-funciones').then(m => m.ListaFunciones)
            },
            {
                path: 'funciones/nueva',
                loadComponent: () => import('../../componentes/alta-funcion/alta-funcion').then(m => m.AltaFuncion)
            },
            // Asignación automática de sala (varios días a la vez)
            {
                path: 'funciones/programar',
                loadComponent: () => import('../../componentes/programar-funciones/programar-funciones').then(m => m.ProgramarFunciones)
            },
            {
                path: 'productos',
                loadComponent: () => import('../../componentes/lista-productos/lista-productos').then(m => m.ListaProductos)
            },
            {
                path: 'productos/nuevo',
                loadComponent: () => import('../../componentes/alta-producto/alta-producto').then(m => m.AltaProducto)
            },
            // Mismo componente en modo edición, como peliculas/editar/:id
            {
                path: 'productos/editar/:id',
                loadComponent: () => import('../../componentes/alta-producto/alta-producto').then(m => m.AltaProducto)
            },
            {
                path: 'cupones',
                loadComponent: () => import('../../componentes/lista-cupones/lista-cupones').then(m => m.ListaCupones)
            }
        ]
    }
];

// forChild (no forRoot): son rutas de un módulo hijo; las rutas principales ya las registró la app
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class AdminRoutingModule {}
