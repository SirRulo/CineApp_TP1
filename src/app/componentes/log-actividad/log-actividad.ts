import { DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { Actividad } from '../../models/actividad';
import { Auth } from '../../servicios/auth';
import { Log } from '../../servicios/log';

// Lo que viene de perfiles para el log (solo las columnas pedidas)
interface Autor {
  id: string;
  nombre: string;
  apellido: string;
  rol: string;
}

// Log de actividad del admin: quién creó funciones, cambió precios o validó compras, y cuándo
@Component({
  imports: [DatePipe],
  selector: 'app-log-actividad',
  styleUrl: './log-actividad.css',
  templateUrl: './log-actividad.html',
})
export class LogActividad implements OnInit {
  actividad = signal<Actividad[]>([]);
  private autores: Autor[] = [];

  // Las acciones que se registran (los mismos textos que se pasan a log.registrar). '' = todas
  acciones = ['', 'Crear función', 'Cambiar precio', 'Validar entrada', 'Entregar candy'];
  accionElegida = signal('');
  mensaje = signal('');

  constructor(private log: Log, private auth: Auth) {}

  async ngOnInit() {
    const actividad = await this.log.getActividad();
    if (actividad.error) {
      this.mensaje.set('No se pudo cargar el log');
      return;
    }
    // Si fallan los perfiles, el log se muestra igual (sin nombres)
    const perfiles = await this.auth.getPerfiles();
    if (perfiles.error) {
      console.error(perfiles.error);
    } else {
      this.autores = perfiles.data;
    }
    this.actividad.set(actividad.data);
  }

  elegirAccion(accion: string) {
    this.accionElegida.set(accion);
  }

  // Dato derivado como método (sin computed(), no está en el material)
  actividadFiltrada() {
    const accion = this.accionElegida();
    if (accion === '') {
      return this.actividad();
    }
    return this.actividad().filter(a => a.accion === accion);
  }

  // Nombre y rol del autor con .find(), como salaDe() en ListaFunciones
  autorDe(usuarioId: string | null) {
    if (!usuarioId) {
      return 'Sin usuario';
    }
    const autor = this.autores.find(p => p.id === usuarioId);
    return autor ? `${autor.nombre} ${autor.apellido} (${autor.rol})` : '(usuario)';
  }
}
