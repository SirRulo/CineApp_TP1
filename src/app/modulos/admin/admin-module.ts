import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Admin } from '../../componentes/admin/admin';
import { AdminRoutingModule } from './admin-routing-module';

// Módulo del panel admin (como MiModuloModule de la cátedra):
// - declarations: los componentes que pertenecen al módulo (no standalone). Acá, el marco Admin.
// - imports: lo que esos componentes usan. AdminRoutingModule exporta RouterModule,
//   que trae routerLink, routerLinkActive y <router-outlet /> para el HTML de Admin.
@NgModule({
    declarations: [Admin],
    imports: [CommonModule, AdminRoutingModule],
})
export class AdminModule {}
