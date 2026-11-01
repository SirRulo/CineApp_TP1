import { Component } from '@angular/core';
import { Auth } from '../../servicios/auth';

// Marco del panel admin. No es standalone: pertenece a AdminModule (está en sus declarations),
// como Componente1 de la cátedra (modulos). Por eso no tiene 'imports': routerLink,
// routerLinkActive y <router-outlet /> le llegan desde el módulo (AdminRoutingModule exporta RouterModule).
@Component({
  standalone: false,
  selector: 'app-admin',
  styleUrl: './admin.css',
  templateUrl: './admin.html',
})
export class Admin {
  // public: el menú muestra solo los links de las secciones que puede ver (auth.puedeEntrar)
  constructor(public auth: Auth) {}
}
