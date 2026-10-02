import { Component } from '@angular/core';

// Marco del panel admin. No es standalone: pertenece a AdminModule (está en sus declarations),
// como Componente1 de la cátedra (modulos). Por eso no tiene 'imports': routerLink,
// routerLinkActive y <router-outlet /> le llegan desde el módulo (AdminRoutingModule exporta RouterModule).
@Component({
  standalone: false,
  selector: 'app-admin',
  styleUrl: './admin.css',
  templateUrl: './admin.html',
})
export class Admin {}
