import { Component, OnInit, signal } from '@angular/core';
import { Pelicula } from '../../models/pelicula';
import { Compras } from '../../servicios/compras';
import { Funciones } from '../../servicios/funciones';
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
  top3 = signal<Pelicula[]>([]);
  mensaje = signal('');

  constructor(
    private peliculasService: Peliculas,
    private funcionesService: Funciones,
    private comprasService: Compras,
  ) {}

  async ngOnInit() {
    const result = await this.peliculasService.getPeliculasActivas();
    if (result.error) {
      this.mensaje.set('No se pudo cargar la cartelera: ' + result.error.message);
      return;
    }
    this.peliculas.set(result.data);

    await this.cargarTop3();
  }

  // Las 3 películas con más entradas vendidas. Las entradas solo tienen funcion_id,
  // así que cada una se traduce a su película buscando la función.
  private async cargarTop3() {
    const entradas = await this.comprasService.getEntradasVendidas();
    const funciones = await this.funcionesService.getFunciones();
    if (entradas.error || funciones.error) {
      return; // sin top 3 la cartelera se ve igual
    }

    // ventas[peliculaId] = cantidad de entradas vendidas
    const ventas: { [peliculaId: number]: number } = {};
    for (const entrada of entradas.data) {
      const funcion = funciones.data.find(f => f.id === entrada.funcion_id);
      if (funcion) {
        ventas[funcion.pelicula_id] = (ventas[funcion.pelicula_id] ?? 0) + 1;
      }
    }

    // Solo activas y con al menos una venta, de mayor a menor, y las 3 primeras
    const top = this.peliculas()
      .filter(p => (ventas[p.id!] ?? 0) > 0)
      .sort((a, b) => ventas[b.id!] - ventas[a.id!])
      .slice(0, 3);
    this.top3.set(top);
  }
}
