import { DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Pelicula } from '../../models/pelicula';
import { Peliculas } from '../../servicios/peliculas';

@Component({
  imports: [DatePipe, RouterLink],
  selector: 'app-lista-peliculas',
  styleUrl: './lista-peliculas.css',
  templateUrl: './lista-peliculas.html',
})
export class ListaPeliculas implements OnInit {
  peliculas = signal<Pelicula[]>([]);
  mensaje = signal('');

  constructor(private peliculasService: Peliculas) {}

  ngOnInit() {
    this.cargarPeliculas();
  }

  // Igual que loadCosas del profe: pide la lista y la guarda en el signal
  private async cargarPeliculas() {
    const result = await this.peliculasService.getPeliculas();
    if (result.error) {
      this.mensaje.set('No se pudieron cargar las películas: ' + result.error.message);
      return;
    }
    this.peliculas.set(result.data);
  }

  // No se borra: se cambia el campo activa con update (baja lógica)
  async alternarActiva(pelicula: Pelicula) {
    const result = await this.peliculasService.updatePelicula({ ...pelicula, activa: !pelicula.activa });
    if (result.error) {
      this.mensaje.set('No se pudo actualizar "' + pelicula.titulo + '": ' + result.error.message);
      return;
    }
    this.mensaje.set('');
    this.cargarPeliculas();
  }
}
