import { DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Funcion } from '../../models/funcion';
import { Pelicula } from '../../models/pelicula';
import { Sala } from '../../models/sala';
import { Funciones } from '../../servicios/funciones';
import { Peliculas } from '../../servicios/peliculas';
import { haySolapamiento } from '../../validators/funcion.validators';

@Component({
  imports: [DatePipe, RouterLink],
  selector: 'app-lista-funciones',
  styleUrl: './lista-funciones.css',
  templateUrl: './lista-funciones.html',
})
export class ListaFunciones implements OnInit {
  funciones = signal<Funcion[]>([]);
  // La tabla funciones solo tiene los ids: título y nombre de sala se buscan en estas listas
  peliculas = signal<Pelicula[]>([]);
  salas = signal<Sala[]>([]);
  mensaje = signal('');

  constructor(private funcionesService: Funciones, private peliculasService: Peliculas) {}

  async ngOnInit() {
    const peliculas = await this.peliculasService.getPeliculas();
    if (peliculas.error) {
      this.mensaje.set('No se pudieron cargar las películas: ' + peliculas.error.message);
      return;
    }
    this.peliculas.set(peliculas.data);

    const salas = await this.funcionesService.getSalas();
    if (salas.error) {
      this.mensaje.set('No se pudieron cargar las salas: ' + salas.error.message);
      return;
    }
    this.salas.set(salas.data);

    this.cargarFunciones();
  }

  private async cargarFunciones() {
    const result = await this.funcionesService.getFunciones();
    if (result.error) {
      this.mensaje.set('No se pudieron cargar las funciones: ' + result.error.message);
      return;
    }
    this.funciones.set(result.data);
  }

  tituloDe(peliculaId: number) {
    return this.peliculas().find(p => p.id === peliculaId)?.titulo ?? '(película no encontrada)';
  }

  salaDe(salaId: number) {
    return this.salas().find(s => s.id === salaId)?.nombre ?? '(sala inactiva)';
  }

  // Para pintar el botón "Activar": ¿alguna función activa de la misma sala choca con esta?
  // Usa la lista ya cargada (sin ir a la base); alternarActiva vuelve a controlar con datos frescos.
  puedeActivarse(funcion: Funcion) {
    const inicio = new Date(funcion.inicio);
    const fin = new Date(funcion.fin);
    return !this.funciones().some(f =>
      f.activa && f.sala_id === funcion.sala_id
      && haySolapamiento(inicio, fin, new Date(f.inicio), new Date(f.fin)));
  }

  // Baja lógica, como en películas
  async alternarActiva(funcion: Funcion) {
    // Al reactivar, el horario pudo haberse ocupado mientras estaba inactiva: se vuelve a controlar la regla de 30 min
    if (!funcion.activa) {
      const activas = await this.funcionesService.getFuncionesDeSala(funcion.sala_id);
      if (activas.error) {
        this.mensaje.set('No se pudo controlar la sala: ' + activas.error.message);
        return;
      }
      const inicio = new Date(funcion.inicio);
      const fin = new Date(funcion.fin);
      // La que se reactiva no está en la lista (está inactiva), así que no choca consigo misma
      const choca = activas.data.some(f => haySolapamiento(inicio, fin, new Date(f.inicio), new Date(f.fin)));
      if (choca) {
        this.mensaje.set('No se puede activar: la sala ya tiene otra función en ese horario (o sin los 30 minutos de limpieza)');
        return;
      }
    }

    const result = await this.funcionesService.updateFuncion({ ...funcion, activa: !funcion.activa });
    if (result.error) {
      this.mensaje.set('No se pudo actualizar la función: ' + result.error.message);
      return;
    }
    this.mensaje.set('');
    this.cargarFunciones();
  }
}
