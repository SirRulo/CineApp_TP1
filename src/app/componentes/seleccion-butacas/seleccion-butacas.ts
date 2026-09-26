import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Butaca } from '../../models/butaca';
import { Funcion } from '../../models/funcion';
import { Pelicula } from '../../models/pelicula';
import { Carrito } from '../../servicios/carrito';
import { Funciones } from '../../servicios/funciones';
import { Peliculas } from '../../servicios/peliculas';
import { Asiento } from '../asiento/asiento';

// Una fila del mapa: 30 lugares; donde no hay butaca (pasillos 5 y 26, huecos de la J) va null
interface Fila {
  letra: string;
  posiciones: (Butaca | null)[];
}

@Component({
  imports: [Asiento, CurrencyPipe, DatePipe, RouterLink],
  selector: 'app-seleccion-butacas',
  styleUrl: './seleccion-butacas.css',
  templateUrl: './seleccion-butacas.html',
})
export class SeleccionButacas implements OnInit {
  readonly maximo = 10;

  funcion = signal<Funcion | null>(null);
  pelicula = signal<Pelicula | null>(null);
  filas = signal<Fila[]>([]);
  ocupadas = signal<number[]>([]);          // ids de las butacas ya vendidas
  seleccionadas = signal<Butaca[]>([]);
  mensaje = signal('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private funcionesService: Funciones,
    private peliculasService: Peliculas,
    private carrito: Carrito,
  ) {}

  // snapshot alcanza: para cambiar de función se vuelve al detalle y el componente se recrea
  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    const result = await this.funcionesService.getFuncion(id);
    if (result.error || result.data.length === 0 || !result.data[0].activa) {
      this.mensaje.set('Esta función no está disponible');
      return;
    }
    const funcion: Funcion = result.data[0];
    if (new Date(funcion.inicio) < new Date()) {
      this.mensaje.set('Esta función ya empezó');
      return;
    }
    this.funcion.set(funcion);

    const pelicula = await this.peliculasService.getPelicula(funcion.pelicula_id);
    if (!pelicula.error && pelicula.data.length > 0) {
      this.pelicula.set(pelicula.data[0]);
    }

    const butacas = await this.funcionesService.getButacasDeSala(funcion.sala_id);
    const ocupadas = await this.funcionesService.getButacasOcupadas(id);
    if (butacas.error || ocupadas.error) {
      this.mensaje.set('No se pudieron cargar las butacas');
      return;
    }
    this.ocupadas.set(ocupadas.data.map(fila => fila.butaca_id));
    this.filas.set(this.armarFilas(butacas.data));
  }

  // Las butacas vienen ordenadas por fila y número. Cada vez que cambia la letra se abre
  // una fila nueva con 30 lugares en null, y cada butaca va en la posición numero - 1.
  private armarFilas(butacas: Butaca[]) {
    const filas: Fila[] = [];
    for (const b of butacas) {
      let fila = filas.find(f => f.letra === b.fila);
      if (!fila) {
        fila = { letra: b.fila, posiciones: new Array(30).fill(null) };
        filas.push(fila);
      }
      fila.posiciones[b.numero - 1] = b;
    }
    return filas;
  }

  estaOcupada(b: Butaca) {
    return this.ocupadas().includes(b.id);
  }

  estaSeleccionada(b: Butaca) {
    return this.seleccionadas().some(s => s.id === b.id);
  }

  // Lo llama el (elegida) del hijo Asiento: si ya estaba, la saca; si no, la agrega (hasta 10)
  alternar(b: Butaca) {
    this.mensaje.set('');
    if (this.estaOcupada(b)) {
      return;
    }
    if (this.estaSeleccionada(b)) {
      this.seleccionadas.set(this.seleccionadas().filter(s => s.id !== b.id));
    } else if (this.seleccionadas().length >= this.maximo) {
      this.mensaje.set(`Podés elegir hasta ${this.maximo} butacas por compra`);
    } else {
      this.seleccionadas.set([...this.seleccionadas(), b]);
    }
  }

  // El precio lo fija la función: las VIP (filas R, S, T) usan precio_vip, el resto precio
  precioDe(b: Butaca) {
    const funcion = this.funcion();
    if (!funcion) {
      return 0;
    }
    return b.tipo === 'vip' ? funcion.precio_vip : funcion.precio;
  }

  // Suma de los precios de las butacas elegidas
  total() {
    let suma = 0;
    for (const b of this.seleccionadas()) {
      suma += this.precioDe(b);
    }
    return suma;
  }

  // Deja la selección en el carrito (servicio compartido) y pasa a la pantalla de compra
  continuar() {
    const funcion = this.funcion();
    if (!funcion || this.seleccionadas().length === 0) {
      return;
    }
    this.carrito.cargar({
      funcion: funcion,
      pelicula: this.pelicula(),
      butacas: this.seleccionadas().map(b => ({ butaca: b, precio: this.precioDe(b) })),
      total: this.total(),
    });
    this.router.navigate(['/compra']);
  }
}
