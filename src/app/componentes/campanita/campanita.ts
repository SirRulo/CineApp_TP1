import { DatePipe } from '@angular/common';
import { Component, input, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Notificacion } from '../../models/notificacion';
import { Notificaciones } from '../../servicios/notificaciones';

// Campanita del navbar. Va dentro del @if de sesión: se crea al loguearse
// (ngOnInit abre el canal de Realtime) y se destruye al salir (ngOnDestroy lo cierra).
@Component({
  imports: [DatePipe, RouterLink],
  selector: 'app-campanita',
  styleUrl: './campanita.css',
  templateUrl: './campanita.html',
})
export class Campanita implements OnInit, OnDestroy {
  usuarioId = input<string>();

  notificaciones = signal<Notificacion[]>([]);
  abierta = signal(false);

  private canal: RealtimeChannel | null = null;

  constructor(private notificacionesService: Notificaciones) {}

  async ngOnInit() {
    const id = this.usuarioId();
    if (!id) {
      return;
    }
    const result = await this.notificacionesService.getNotificacionesDeUsuario(id);
    if (result.error) {
      console.error(result.error);
    } else {
      this.notificaciones.set(result.data);
    }

    // Cada aviso nuevo: arriba de la lista + notificación del sistema
    this.canal = this.notificacionesService.escucharNotificaciones(id, n => {
      this.notificaciones.set([n, ...this.notificaciones()]);
      this.avisarAlSistema(n);
    });
  }

  ngOnDestroy() {
    if (this.canal) {
      this.notificacionesService.dejarDeEscuchar(this.canal);
    }
  }

  sinLeer() {
    return this.notificaciones().filter(n => !n.leida).length;
  }

  // Abrir: pide permiso para avisos del sistema (necesita un clic del usuario) y marca
  // todas como leídas en la base. Cerrar: recién ahí se apagan en pantalla, así mientras
  // está abierta se distinguen las nuevas.
  async alternar() {
    if (this.abierta()) {
      this.cerrar();
      return;
    }
    this.abierta.set(true);
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    if (this.sinLeer() > 0) {
      const result = await this.notificacionesService.marcarLeidas(this.usuarioId()!);
      if (result.error) {
        console.error(result.error);
      }
    }
  }

  cerrar() {
    this.abierta.set(false);
    this.notificaciones.set(this.notificaciones().map(n => ({ ...n, leida: true })));
  }

  // Notification API del navegador: solo si el usuario dio permiso.
  // Funciona con la app abierta (aunque esté en otra pestaña), no con el navegador cerrado.
  private avisarAlSistema(n: Notificacion) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('CineApp', { body: n.mensaje, icon: 'icons/icon-192x192.png' });
    }
  }
}
