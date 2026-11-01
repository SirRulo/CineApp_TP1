import { DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Propuesta } from '../../models/propuesta';
import { Auth } from '../../servicios/auth';
import { Log } from '../../servicios/log';
import { PropuestaAceptada } from '../../servicios/propuesta-aceptada';
import { Propuestas } from '../../servicios/propuestas';

// Lo que viene de perfiles (solo las columnas pedidas), como en LogActividad
interface Autor {
  id: string;
  nombre: string;
  apellido: string;
  rol: string;
}

// Admin: propuestas de películas de los clientes (mail RPP). Aceptar lleva al alta con los datos.
@Component({
  imports: [DatePipe],
  selector: 'app-lista-propuestas',
  styleUrl: './lista-propuestas.css',
  templateUrl: './lista-propuestas.html',
})
export class ListaPropuestas implements OnInit {
  propuestas = signal<Propuesta[]>([]);
  perfiles = signal<Autor[]>([]);
  respondiendo = signal<number | null>(null);   // id de la que se está respondiendo
  mensaje = signal('');

  constructor(
    private propuestasService: Propuestas,
    private propuestaAceptada: PropuestaAceptada,
    private auth: Auth,
    private log: Log,
    private router: Router,
  ) {}

  async ngOnInit() {
    // Si fallan los perfiles, la lista se muestra igual (sin nombres), como en el log
    const perfiles = await this.auth.getPerfiles();
    if (perfiles.error) {
      console.error(perfiles.error);
    } else {
      this.perfiles.set(perfiles.data);
    }
    await this.cargarPropuestas();
  }

  private async cargarPropuestas() {
    const result = await this.propuestasService.getPropuestas();
    if (result.error) {
      this.mensaje.set('No se pudieron cargar las propuestas: ' + result.error.message);
      return;
    }
    this.propuestas.set(result.data);
  }

  // Las que esperan respuesta van arriba; el resto queda como historial
  pendientes() {
    return this.propuestas().filter(p => p.estado === 'pendiente');
  }

  respondidas() {
    return this.propuestas().filter(p => p.estado !== 'pendiente');
  }

  // Igual que salaDe() en ListaFunciones: busca en la lista ya cargada
  autorDe(usuarioId: string) {
    const perfil = this.perfiles().find(p => p.id === usuarioId);
    return perfil ? `${perfil.nombre} ${perfil.apellido}` : 'Cliente';
  }

  async rechazar(p: Propuesta) {
    if (!confirm(`¿Rechazar la propuesta "${p.titulo}"?`)) {
      return;
    }
    if (await this.responder(p, 'rechazada')) {
      await this.cargarPropuestas();
    }
  }

  // Se marca aceptada y se pasa al alta con los datos (la película la termina de cargar el admin)
  async aceptar(p: Propuesta) {
    if (await this.responder(p, 'aceptada')) {
      this.propuestaAceptada.guardar(p);
      this.router.navigate(['/admin/peliculas/nueva']);
    }
  }

  // Cambia el estado y deja el log. Devuelve true si salió bien
  private async responder(p: Propuesta, estado: 'aceptada' | 'rechazada') {
    this.mensaje.set('');
    this.respondiendo.set(p.id!);
    const result = await this.propuestasService.responderPropuesta(p.id!, estado);
    this.respondiendo.set(null);

    if (result.error) {
      this.mensaje.set('No se pudo responder la propuesta: ' + result.error.message);
      return false;
    }
    // data vacío: ya no estaba pendiente (la respondió otro admin)
    if (result.data.length === 0) {
      this.mensaje.set(`"${p.titulo}" ya había sido respondida`);
      await this.cargarPropuestas();
      return false;
    }

    await this.log.registrar(estado === 'aceptada' ? 'Aceptar propuesta' : 'Rechazar propuesta',
      `"${p.titulo}" de ${this.autorDe(p.usuario_id)}`);
    return true;
  }
}
