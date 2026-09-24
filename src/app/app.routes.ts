import { Routes } from '@angular/router';

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
    {
        path: 'registro',
        loadComponent: () => import('./componentes/registro/registro').then(m => m.Registro)
    },
    {
        path: 'login',
        loadComponent: () => import('./componentes/login/login').then(m => m.Login)
    },
    // Sin guards todavía: se agregan en el próximo paso
    {
        path: 'admin',
        loadComponent: () => import('./componentes/admin/admin').then(m => m.Admin)
    },
    {
        path: 'empleado',
        loadComponent: () => import('./componentes/empleado/empleado').then(m => m.Empleado)
    },
    // Siempre al final: el router prueba las rutas en orden y '**' atrapa cualquier cosa.
    {
        path: '**',
        loadComponent: () => import('./componentes/error/error').then(m => m.Error)
    }
];
