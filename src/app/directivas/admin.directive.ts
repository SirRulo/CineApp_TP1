import { Directive, TemplateRef, ViewContainerRef } from '@angular/core';
import { Auth } from '../servicios/auth';

// Directiva estructural: *appAdmin muestra el bloque solo si el usuario logueado es admin.
// Igual que AdminDirective de la cátedra (directivas), pero el rol sale de la sesión
// (perfil en Supabase) en vez de estar escrito a mano.
@Directive({
  selector: '[appAdmin]',
})
export class AdminDirective {

  // template = el bloque marcado con *appAdmin; viewContainer = el lugar donde se dibuja
  constructor(private template: TemplateRef<any>, private viewContainer: ViewContainerRef, private auth: Auth) {
    // Arranca oculto. El perfil se busca de forma asíncrona (puede hacer falta pedirlo a Supabase),
    // así que se decide cuando llega la respuesta.
    this.viewContainer.clear();
    this.auth.obtenerPerfil().then(perfil => {
      if (perfil?.rol === 'admin') {
        this.viewContainer.createEmbeddedView(this.template);
      }
    });
  }
}
