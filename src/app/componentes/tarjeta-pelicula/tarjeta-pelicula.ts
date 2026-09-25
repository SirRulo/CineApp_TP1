import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Pelicula } from '../../models/pelicula';

@Component({
  imports: [RouterLink],
  selector: 'app-tarjeta-pelicula',
  styleUrl: './tarjeta-pelicula.css',
  templateUrl: './tarjeta-pelicula.html',
})
export class TarjetaPelicula {
  // Entra desde el padre (Home): <app-tarjeta-pelicula [pelicula]="p" />
  pelicula = input<Pelicula>();
}
