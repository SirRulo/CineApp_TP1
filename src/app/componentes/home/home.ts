import { Component, OnInit, signal } from '@angular/core';
import { Pelicula } from '../../models/pelicula';
import { Peliculas } from '../../servicios/peliculas';
import { TarjetaPelicula } from '../tarjeta-pelicula/tarjeta-pelicula';

@Component({
  imports: [TarjetaPelicula],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home implements OnInit {
  peliculas = signal<Pelicula[]>([]);
  mensaje = signal('');

  constructor(private peliculasService: Peliculas) {}

  async ngOnInit() {
    const result = await this.peliculasService.getPeliculasActivas();
    if (result.error) {
      this.mensaje.set('No se pudo cargar la cartelera: ' + result.error.message);
      return;
    }
    this.peliculas.set(result.data);
  }
}
