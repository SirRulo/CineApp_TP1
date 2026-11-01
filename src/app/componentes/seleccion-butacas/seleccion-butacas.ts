import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Butaca } from '../../models/butaca';
import { Espera } from '../../models/espera';
import { Funcion } from '../../models/funcion';
import { Pelicula } from '../../models/pelicula';
import { Auth } from '../../servicios/auth';
import { Carrito } from '../../servicios/carrito';
import { Funciones } from '../../servicios/funciones';
import { ListaEspera } from '../../servicios/lista-espera';
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
export class SeleccionButacas implements OnInit, OnDestroy {
  readonly maximo = 10;

  funcion = signal<Funcion | null>(null);
  pelicula = signal<Pelicula | null>(null);
  filas = signal<Fila[]>([]);
  ocupadas = signal<number[]>([]);          // ids de las butacas ya vendidas
  seleccionadas = signal<Butaca[]>([]);
  mensaje = signal('');

  // Lista de espera (mail RPP): cuántas butacas tiene la sala y quiénes esperan, en orden
  totalButacas = signal(0);
  espera = signal<Espera[]>([]);
  mensajeEspera = signal('');
  anotando = signal(false);

  // Canal de Supabase Realtime (butacas en tiempo real); se cierra en ngOnDestroy
  private canal?: RealtimeChannel;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private funcionesService: Funciones,
    private peliculasService: Peliculas,
    private carrito: Carrito,
    public listaEspera: ListaEspera,   // public: el HTML usa venceEn() para el cartel del turno
    public auth: Auth,   // public: el HTML pregunta si hay sesión para la lista de espera
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

    const pelicula = await this.peliculasService.getPelicula(funcion.pelicula_id);
    if (!pelicula.error && pelicula.data.length > 0) {
      this.pelicula.set(pelicula.data[0]);
      // Preventa: antes de que abra la venta no se puede comprar (aunque la función ya exista)
      if (!this.peliculasService.ventaAbierta(pelicula.data[0])) {
        const apertura = this.peliculasService.aperturaVenta(pelicula.data[0]);
        this.mensaje.set('La venta de esta película abre el ' + apertura.toLocaleDateString('es-AR'));
        return;
      }
    }
    this.funcion.set(funcion);

    const butacas = await this.funcionesService.getButacasDeSala(funcion.sala_id);
    const ocupadas = await this.funcionesService.getButacasOcupadas(id);
    if (butacas.error || ocupadas.error) {
      this.mensaje.set('No se pudieron cargar las butacas');
      return;
    }
    this.ocupadas.set(ocupadas.data.map(fila => fila.butaca_id));
    this.filas.set(this.armarFilas(butacas.data));
    this.totalButacas.set(butacas.data.length);
    await this.listaEspera.vencerTurnos(id, this.descripcion());
    await this.cargarEspera(id);

    // Tiempo real: si alguien compra (o cancela) una butaca de esta función, se recargan las ocupadas
    // y la lista de espera (al cancelar, la butaca liberada puede quedar guardada para un avisado)
    this.canal = this.funcionesService.escucharEntradas(id, () => this.recargarOcupadas(id));
  }

  // Al salir de la pantalla se cierra el canal (si no, seguiría escuchando para nada)
  ngOnDestroy() {
    if (this.canal) {
      this.funcionesService.dejarDeEscuchar(this.canal);
    }
  }

  // Vuelve a pedir las ocupadas. Si una butaca que el usuario tenía elegida ya no está libre,
  // se la saca de la selección y se avisa.
  private async recargarOcupadas(funcionId: number) {
    const result = await this.funcionesService.getButacasOcupadas(funcionId);
    if (result.error) {
      return; // se queda con lo que tenía; la barrera final sigue siendo el índice único al pagar
    }
    this.ocupadas.set(result.data.map(fila => fila.butaca_id));
    await this.listaEspera.vencerTurnos(funcionId, this.descripcion());
    await this.cargarEspera(funcionId);

    // estaOcupada cuenta también las reservadas para un avisado de la lista de espera
    const perdidas = this.seleccionadas().filter(b => this.estaOcupada(b));
    if (perdidas.length > 0) {
      this.seleccionadas.set(this.seleccionadas().filter(b => !this.estaOcupada(b)));
      const nombres = perdidas.map(b => b.fila + b.numero).join(', ');
      this.mensaje.set(`Otra persona acaba de comprar: ${nombres}. Elegí otra.`);
    }
  }

  // ---------- Lista de espera (mail RPP) ----------

  // Para los avisos: '"Título" del 15/11/2026, 20:30:00' (como en MisCompras)
  private descripcion() {
    const funcion = this.funcion();
    const fecha = funcion ? new Date(funcion.inicio).toLocaleString('es-AR') : '';
    return `"${this.pelicula()?.titulo ?? ''}" del ${fecha}`;
  }

  private async cargarEspera(funcionId: number) {
    const result = await this.listaEspera.getEsperaDeFuncion(funcionId);
    if (result.error) {
      console.error(result.error);   // el mapa se muestra igual
      return;
    }
    this.espera.set(result.data);
  }

  // Butacas guardadas para OTROS avisados con el turno vigente: para mí se ven ocupadas
  reservadas() {
    const perfil = this.auth.perfil();
    return this.espera()
      .filter(e => this.listaEspera.turnoVigente(e) && e.usuario_id !== perfil?.id)
      .map(e => e.butaca_id!);
  }

  // Mi turno, si me avisaron y siguen corriendo mis 15 minutos (null = no tengo)
  miTurno() {
    const mia = this.miEspera();
    return mia && this.listaEspera.turnoVigente(mia) ? mia : null;
  }

  // La butaca que me guardaron (para el cartel)
  miButacaGuardada() {
    const turno = this.miTurno();
    if (!turno) {
      return null;
    }
    for (const fila of this.filas()) {
      const b = fila.posiciones.find(p => p?.id === turno.butaca_id);
      if (b) {
        return b;
      }
    }
    return null;
  }

  // Agotada = no queda ninguna butaca que yo pueda comprar (vendidas + guardadas para otros)
  agotada() {
    return this.totalButacas() > 0
      && this.ocupadas().length + this.reservadas().length >= this.totalButacas();
  }

  // Mi lugar en la fila (null = no estoy anotado)
  miEspera() {
    const perfil = this.auth.perfil();
    if (!perfil) {
      return null;
    }
    return this.espera().find(e => e.usuario_id === perfil.id) ?? null;
  }

  // Posición = cuántos se anotaron antes + 1 (la lista viene ordenada por created_at)
  miPosicion() {
    const mia = this.miEspera();
    return mia ? this.espera().indexOf(mia) + 1 : 0;
  }

  async anotarme() {
    const perfil = this.auth.perfil();
    const funcion = this.funcion();
    if (!perfil || !funcion) {
      return;
    }
    this.anotando.set(true);
    const result = await this.listaEspera.anotarse(funcion.id!, perfil.id);
    this.anotando.set(false);
    if (result.error) {
      // Segunda barrera: índice una_vez_en_la_lista
      this.mensajeEspera.set(result.error.code === '23505'
        ? 'Ya estabas anotado en esta lista'
        : 'No se pudo anotarte: ' + result.error.message);
    } else {
      this.mensajeEspera.set('¡Listo! Te avisamos si se libera una butaca');
    }
    await this.cargarEspera(funcion.id!);
  }

  async salirDeLaLista() {
    const mia = this.miEspera();
    if (!mia || !confirm('¿Salir de la lista de espera? Perdés tu lugar.')) {
      return;
    }
    const result = await this.listaEspera.salir(mia.id!);
    this.mensajeEspera.set(result.error ? 'No se pudo salir: ' + result.error.message : 'Saliste de la lista de espera');
    await this.cargarEspera(this.funcion()!.id!);
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

  // Vendida, o guardada 15 min para otra persona de la lista de espera
  estaOcupada(b: Butaca) {
    return this.ocupadas().includes(b.id) || this.reservadas().includes(b.id);
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

  // El precio lo fija la función: las VIP (filas R, S, T) usan precio_vip, el resto precio.
  // En preventa todas las entradas (también las VIP) cuestan el precio de preventa de la película
  precioDe(b: Butaca) {
    const funcion = this.funcion();
    if (!funcion) {
      return 0;
    }
    const pelicula = this.pelicula();
    if (pelicula && this.peliculasService.enPreventa(pelicula)) {
      return Number(pelicula.precio_preventa);  // numeric puede llegar como texto (como en el reporte)
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
      productos: [],   // el candy se elige en la pantalla siguiente
    });
    this.router.navigate(['/candy']);
  }
}
