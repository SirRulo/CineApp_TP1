import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CompraProducto } from '../../models/compra-producto';
import { ContenidoCarrito } from '../../models/contenido-carrito';
import { Cupon } from '../../models/cupon';
import { Entrada } from '../../models/entrada';
import { Auth } from '../../servicios/auth';
import { Carrito } from '../../servicios/carrito';
import { Compras } from '../../servicios/compras';
import { Puntos } from '../../servicios/puntos';

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
  // '' = puede comprar; si no, el motivo (película +13/+18 y usuario menor o sin sesión)
  restriccion = signal('');
  // Crédito a favor (cancelaciones): solo registrados. Se usa si tilda el checkbox.
  saldoCredito = signal(0);
  usarCredito = signal(false);

  // Lo que se muestra después de pagar (el carrito ya se vació)
  codigo = signal<string | null>(null);
  comprado = signal<ContenidoCarrito | null>(null);
  totalPagado = signal(0);
  puntosSumados = signal(0);   // para la confirmación: "Sumaste N puntos"

  private suscripcionCarrito?: Subscription;

  constructor(
    private carrito: Carrito,
    private comprasService: Compras,
    private auth: Auth,
    private puntosService: Puntos,
  ) {}

  async ngOnInit() {
    // Como hijo2 de inputOutput: me suscribo al BehaviorSubject y guardo el valor en un signal.
    // Recibe enseguida el último valor (lo que cargó la pantalla de butacas, o null si se recargó).
    this.suscripcionCarrito = this.carrito.contenido.subscribe(contenido => {
      this.contenido.set(contenido);
    });

    const contenido = this.contenido();
    if (contenido) {
      // Segunda barrera de la edad (la primera es el detalle): por si se llega con la URL a mano
      const perfil = await this.auth.obtenerPerfil();
      this.restriccion.set(this.auth.restriccionDeEdad(contenido.pelicula?.edad_minima ?? 0, perfil));
      await this.verificarCupon();
      // verificarCupon deja el usuarioId si hay sesión
      const usuarioId = this.usuarioId();
      if (usuarioId) {
        const saldo = await this.comprasService.getSaldoCredito(usuarioId);
        this.saldoCredito.set(saldo ?? 0);
      }
    }
  }

  ngOnDestroy() {
    this.suscripcionCarrito?.unsubscribe();
  }

  // Junta los cupones que le corresponden al usuario y aplica UNO: el de mayor porcentaje.
  // - Primera compra: registrados sin compras pagadas.
  // - Por edad (ej. MAYORES50): si la edad del usuario llega a edad_minima.
  private async verificarCupon() {
    const perfil = await this.auth.obtenerPerfil();
    if (!perfil) {
      return; // anónimo: compra sin cupón
    }
    this.usuarioId.set(perfil.id);

    const candidatos: Cupon[] = [];

    // Si no se puede saber si ya compró, no se ofrece (mejor no dar un descuento que no corresponde)
    const compras = await this.comprasService.getComprasPagadas(perfil.id);
    if (!compras.error && compras.data.length === 0) {
      const primeraCompra = await this.comprasService.getCuponPrimeraCompra();
      if (!primeraCompra.error && primeraCompra.data.length > 0) {
        candidatos.push(primeraCompra.data[0]);
      }
    }

    const porEdad = await this.comprasService.getCuponesPorEdad();
    if (!porEdad.error) {
      const edad = this.auth.calcularEdad(perfil.fecha_nacimiento);
      for (const cupon of porEdad.data) {
        if (edad >= cupon.edad_minima) {
          candidatos.push(cupon);
        }
      }
    }

    // Un cupón por compra: el de mayor descuento
    let mejor: Cupon | null = null;
    for (const cupon of candidatos) {
      if (!mejor || cupon.porcentaje > mejor.porcentaje) {
        mejor = cupon;
      }
    }
    this.cupon.set(mejor);
  }

  subtotalEntradas() {
    return this.contenido()?.total ?? 0;
  }

  totalCandy() {
    let total = 0;
    for (const e of this.contenido()?.productos ?? []) {
      total += e.producto.precio * e.cantidad;
    }
    return total;
  }

  // Entradas + candy (es el subtotal que se guarda en la compra)
  subtotal() {
    return this.subtotalEntradas() + this.totalCandy();
  }

  // El porcentaje sale de la tabla cupones y se aplica solo a las entradas. Se redondea a centavos.
  descuento() {
    const cupon = this.cupon();
    if (!cupon) {
      return 0;
    }
    return Math.round(this.subtotalEntradas() * cupon.porcentaje) / 100;
  }

  // Crédito que se usa en esta compra: nunca más que el saldo ni más de lo que hay que pagar
  creditoAplicado() {
    if (!this.usarCredito()) {
      return 0;
    }
    return Math.min(this.saldoCredito(), this.subtotal() - this.descuento());
  }

  // Lo que se paga con el otro medio (simulado): entradas − cupón + candy − crédito
  totalAPagar() {
    return this.subtotal() - this.descuento() - this.creditoAplicado();
  }

  // Checkbox "Usar mi crédito" (como los géneros de AltaPelicula: [checked] + (change))
  alternarCredito() {
    this.usarCredito.set(!this.usarCredito());
  }

  // QR de la compra: la imagen la genera api.qrserver.com con el código (sin instalar librerías).
  // El QR guarda el mismo código que el empleado valida a mano en /empleado.
  urlQr(codigo: string) {
    return 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + codigo;
  }

  // PDF de la entrada: igual que el reporte, se imprime la página con los estilos @media print
  // de styles.css (sin navbar ni botones) y el navegador ofrece "Guardar como PDF"
  descargarPdf() {
    window.print();
  }

  // 8 caracteres al azar: toString(36) escribe el número con dígitos y letras (0-9, a-z).
  // Se sacan los "0." del principio y, si sale corto, se completa con ceros.
  private generarCodigo() {
    return Math.random().toString(36).substring(2, 10).toUpperCase().padEnd(8, '0');
  }

  // Pago simulado: no se pide tarjeta; "pagar" es guardar la compra y sus entradas
  async pagar() {
    const contenido = this.contenido();
    if (!contenido || this.pagando() || this.restriccion()) {
      return;
    }
    this.pagando.set(true);
    this.mensaje.set('');

    // 1) La compra (devuelve su id)
    const codigo = this.generarCodigo();
    const total = this.totalAPagar();
    const creditoUsado = this.creditoAplicado();
    const resultCompra = await this.comprasService.addCompra({
      codigo: codigo,
      usuario_id: this.usuarioId(),
      funcion_id: contenido.funcion.id!,
      cupon_id: this.cupon()?.id ?? null,
      subtotal: this.subtotal(),
      descuento: this.descuento(),
      credito_usado: creditoUsado,
      total: total,   // lo cobrado con el otro medio (el crédito va aparte)
    });
    if (resultCompra.error) {
      // Incluye el caso (muy raro) de un código repetido: con otro clic se genera uno nuevo
      this.mensaje.set('No se pudo registrar la compra: ' + resultCompra.error.message + '. Probá de nuevo.');
      this.pagando.set(false);
      return;
    }
    const compraId = resultCompra.data[0].id;

    // 2) El candy (si eligió algo), antes que las entradas: si falla, todavía no se ocupó ninguna butaca
    if (contenido.productos.length > 0) {
      const filas: CompraProducto[] = contenido.productos.map(elegido => ({
        compra_id: compraId,
        producto_id: elegido.producto.id!,
        combo_id: null,
        cantidad: elegido.cantidad,
        precio_unitario: elegido.producto.precio,
      }));
      const resultCandy = await this.comprasService.addProductosDeCompra(filas);
      if (resultCandy.error) {
        await this.comprasService.cancelarCompra(compraId);
        this.mensaje.set('No se pudo guardar el candy: ' + resultCandy.error.message + '. Probá de nuevo.');
        this.pagando.set(false);
        return;
      }
    }

    // 3) Las entradas, todas en un solo insert
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

    // 4) Si usó crédito, se descuenta del saldo con un movimiento 'uso' (recién ahora que la compra salió bien)
    if (creditoUsado > 0) {
      const resultCredito = await this.comprasService.addMovimientoCredito({
        usuario_id: this.usuarioId()!,
        tipo: 'uso',
        monto: creditoUsado,
        compra_id: compraId,
      });
      if (resultCredito.error) {
        // La compra ya está hecha: solo queda registrado para revisar (no se le corta la compra al cliente)
        console.error('No se pudo descontar el crédito:', resultCredito.error.message);
      }
    }

    // 5) Puntos (mail 03/03): solo registrados, 1 por peso de lo cobrado (total, sin el crédito usado)
    const puntos = this.puntosService.puntosPor(total);
    if (this.usuarioId() && puntos > 0) {
      const resultPuntos = await this.puntosService.addMovimiento({
        usuario_id: this.usuarioId()!,
        tipo: 'acumulacion',
        puntos: puntos,
        compra_id: compraId,
      });
      if (resultPuntos.error) {
        // Igual que el crédito: la compra ya está hecha, no se corta
        console.error('No se pudieron sumar los puntos:', resultPuntos.error.message);
      } else {
        this.puntosSumados.set(puntos);
      }
    }

    // 6) Listo: se guarda lo comprado para la confirmación y se vacía el carrito
    this.comprado.set(contenido);
    this.totalPagado.set(total);
    this.codigo.set(codigo);
    this.carrito.vaciar();
    this.pagando.set(false);
  }
}
