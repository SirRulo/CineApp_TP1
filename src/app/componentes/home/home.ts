import { DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Genero } from '../../models/genero';
import { Pelicula } from '../../models/pelicula';
import { FiltroPipe } from '../../pipes/filtro-pipe';
import { Compras } from '../../servicios/compras';
import { Funciones } from '../../servicios/funciones';
import { Peliculas } from '../../servicios/peliculas';
import { TarjetaPelicula } from '../tarjeta-pelicula/tarjeta-pelicula';

@Component({
  imports: [TarjetaPelicula, FormsModule, FiltroPipe, DatePipe],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home implements OnInit {
  peliculas = signal<Pelicula[]>([]);
  top3 = signal<Pelicula[]>([]);
  proximamente = signal<Pelicula[]>([]);   // mail 08/03: las que todavía no se estrenaron
  mensaje = signal('');

  // Buscador (como pipes/app.ts del profe: signal + [(ngModel)])
  busqueda = signal('');
  generos = signal<Genero[]>([]);
  generosElegidos = signal<number[]>([]);
  generosPorPelicula = signal<{ [peliculaId: number]: number[] }>({});

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
    // Se separan por fecha de estreno: las que ya se estrenaron van a la cartelera (y al top 3 y al buscador),
    // las que no, a "Próximamente" (ordenadas por estreno, la más cercana primero)
    const hoy = new Date();
    this.peliculas.set(result.data.filter(p => this.peliculasService.fechaEstreno(p) <= hoy));
    this.proximamente.set(result.data
      .filter(p => this.peliculasService.fechaEstreno(p) > hoy)
      .sort((a, b) => this.peliculasService.fechaEstreno(a).getTime() - this.peliculasService.fechaEstreno(b).getTime()));

    await this.cargarTop3();
    await this.cargarGeneros();
  }

  // Etiqueta de cada película de "Próximamente" (usa las reglas de preventa del servicio)
  estadoEstreno(p: Pelicula) {
    if (this.peliculasService.enPreventa(p)) {
      return 'Preventa abierta';
    }
    if (p.precio_preventa !== null) {
      return 'Preventa desde el ' + this.peliculasService.aperturaVenta(p).toLocaleDateString('es-AR');
    }
    return 'Venta desde el estreno';
  }

  // Géneros para los botones + qué géneros tiene cada película (para el pipe filtro)
  private async cargarGeneros() {
    const generos = await this.peliculasService.getGeneros();
    const relaciones = await this.peliculasService.getTodosLosGenerosDePeliculas();
    if (generos.error || relaciones.error) {
      return; // sin géneros el buscador funciona igual, solo por texto
    }
    this.generos.set(generos.data);

    // porPelicula[peliculaId] = [genero_id, genero_id, ...] (mismo patrón que ventas del top 3)
    const porPelicula: { [peliculaId: number]: number[] } = {};
    for (const fila of relaciones.data) {
      porPelicula[fila.pelicula_id] = [...(porPelicula[fila.pelicula_id] ?? []), fila.genero_id];
    }
    this.generosPorPelicula.set(porPelicula);
  }

  // Arreglo nuevo (nunca push): el pipe es puro y solo se recalcula si cambia la referencia
  alternarGenero(id: number) {
    const actuales = this.generosElegidos();
    if (actuales.includes(id)) {
      this.generosElegidos.set(actuales.filter(g => g !== id));
    } else {
      this.generosElegidos.set([...actuales, id]);
    }
  }

  limpiarFiltros() {
    this.busqueda.set('');
    this.generosElegidos.set([]);
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
