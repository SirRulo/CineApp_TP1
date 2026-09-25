import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from '../../servicios/auth';

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-navbar',
  styleUrl: './navbar.css',
  templateUrl: './navbar.html',
})
export class Navbar {
  // 'public' para poder usar auth.perfil() en el HTML (como 'public data' en inputOutput/hijo2)
  constructor(public auth: Auth, private router: Router) {
    // Al abrir o recargar la app, recupera la sesión que Supabase guardó en el navegador
    this.auth.cargarPerfil();
  }

  async salir() {
    await this.auth.cerrarSesion();
    this.router.navigate(['/home']);
  }
}
