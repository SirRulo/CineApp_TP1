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
    {
        path: 'registro',
        loadComponent: () => import('./componentes/registro/registro').then(m => m.Registro)
    },
    {
        path: 'login',
        loadComponent: () => import('./componentes/login/login').then(m => m.Login)
    },
    // canMatch: si el rol no coincide, para ese usuario la ruta "no existe" y termina en '**'
    {
        path: 'admin',
        loadComponent: () => import('./componentes/admin/admin').then(m => m.Admin),
        canMatch: [roleGuard('admin')]
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
