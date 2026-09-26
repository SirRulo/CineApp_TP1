import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ContenidoCarrito } from '../../models/contenido-carrito';
import { Cupon } from '../../models/cupon';
import { Entrada } from '../../models/entrada';
import { Auth } from '../../servicios/auth';
import { Carrito } from '../../servicios/carrito';
import { Compras } from '../../servicios/compras';

@Component({
  imports: [CurrencyPipe, DatePipe, RouterLink],
  selector: 'app-compra',
  styleUrl: './compra.css',
  templateUrl: './compra.html',
})
export class Compra implements OnInit, OnDestroy {
  contenido = signal<ContenidoCarrito | null>(null);
  usuarioId = signal<string | null>(null);   // null = compra anónima
  cupon = signal<Cupon | null>(null);
  pagando = signal(false);
  mensaje = signal('');

  // Lo que se muestra después de pagar (el carrito ya se vació)
  codigo = signal<string | null>(null);
  comprado = signal<ContenidoCarrito | null>(null);
  totalPagado = signal(0);

  private suscripcionCarrito?: Subscription;

  constructor(
    private carrito: Carrito,
    private comprasService: Compras,
    private auth: Auth,
  ) {}

  async ngOnInit() {
    // Como hijo2 de inputOutput: me suscribo al BehaviorSubject y guardo el valor en un signal.
    // Recibe enseguida el último valor (lo que cargó la pantalla de butacas, o null si se recargó).
    this.suscripcionCarrito = this.carrito.contenido.subscribe(contenido => {
      this.contenido.set(contenido);
    });

    if (this.contenido()) {
      await this.verificarCupon();
    }
  }

  ngOnDestroy() {
    this.suscripcionCarrito?.unsubscribe();
  }

  // Cupón de primera compra: solo para usuarios registrados que todavía no tienen compras pagadas
  private async verificarCupon() {
    const perfil = await this.auth.obtenerPerfil();
    if (!perfil) {
      return; // anónimo: compra sin cupón
    }
    this.usuarioId.set(perfil.id);

    const compras = await this.comprasService.getComprasPagadas(perfil.id);
    if (compras.error || compras.data.length > 0) {
      return; // ya compró antes (o no se pudo saber): sin cupón
    }

    const cupones = await this.comprasService.getCuponPrimeraCompra();
    if (cupones.error || cupones.data.length === 0) {
      return;
    }
    this.cupon.set(cupones.data[0]);
  }

  subtotal() {
    return this.contenido()?.total ?? 0;
  }

  // El porcentaje sale de la tabla cupones. Se redondea a centavos.
  descuento() {
    const cupon = this.cupon();
    if (!cupon) {
      return 0;
    }
    return Math.round(this.subtotal() * cupon.porcentaje) / 100;
  }

  totalAPagar() {
    return this.subtotal() - this.descuento();
  }

  // 8 caracteres al azar: toString(36) escribe el número con dígitos y letras (0-9, a-z).
  // Se sacan los "0." del principio y, si sale corto, se completa con ceros.
  private generarCodigo() {
    return Math.random().toString(36).substring(2, 10).toUpperCase().padEnd(8, '0');
  }

  // Pago simulado: no se pide tarjeta; "pagar" es guardar la compra y sus entradas
  async pagar() {
    const contenido = this.contenido();
    if (!contenido || this.pagando()) {
      return;
    }
    this.pagando.set(true);
    this.mensaje.set('');

    // 1) La compra (devuelve su id)
    const codigo = this.generarCodigo();
    const total = this.totalAPagar();
    const resultCompra = await this.comprasService.addCompra({
      codigo: codigo,
      usuario_id: this.usuarioId(),
      funcion_id: contenido.funcion.id!,
      cupon_id: this.cupon()?.id ?? null,
      subtotal: this.subtotal(),
      descuento: this.descuento(),
      total: total,
    });
    if (resultCompra.error) {
      // Incluye el caso (muy raro) de un código repetido: con otro clic se genera uno nuevo
      this.mensaje.set('No se pudo registrar la compra: ' + resultCompra.error.message + '. Probá de nuevo.');
      this.pagando.set(false);
      return;
    }
    const compraId = resultCompra.data[0].id;

    // 2) Las entradas, todas en un solo insert
    const entradas: Entrada[] = contenido.butacas.map(elegida => ({
      compra_id: compraId,
      funcion_id: contenido.funcion.id!,
      butaca_id: elegida.butaca.id,
      precio: elegida.precio,
    }));
    const resultEntradas = await this.comprasService.addEntradas(entradas);
    if (resultEntradas.error) {
      // La compra quedó sin entradas: se da de baja (baja lógica, sin delete)
      await this.comprasService.cancelarCompra(compraId);
      // 23505 = código de Postgres para "valor repetido" en un índice único (butaca_vendida_una_vez)
      if (resultEntradas.error.code === '23505') {
        this.mensaje.set('Alguien compró una de tus butacas mientras elegías. Volvé a elegir.');
      } else {
        this.mensaje.set('No se pudieron guardar las entradas: ' + resultEntradas.error.message);
      }
      this.pagando.set(false);
      return;
    }

    // 3) Listo: se guarda lo comprado para la confirmación y se vacía el carrito
    this.comprado.set(contenido);
    this.totalPagado.set(total);
    this.codigo.set(codigo);
    this.carrito.vaciar();
    this.pagando.set(false);
  }
}
