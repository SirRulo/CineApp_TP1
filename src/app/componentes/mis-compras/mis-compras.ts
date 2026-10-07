import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Compra } from '../../models/compra';
import { Funcion } from '../../models/funcion';
import { Pelicula } from '../../models/pelicula';
import { Auth } from '../../servicios/auth';
import { Compras } from '../../servicios/compras';
import { Funciones } from '../../servicios/funciones';
import { Peliculas } from '../../servicios/peliculas';

// Una compra con lo necesario para mostrarla
interface CompraVista {
  compra: Compra;
  titulo: string;
  funcion: Funcion | null;
  entradas: number;   // entradas activas (o las que tenía, si se canceló)
}

// Historial de compras del cliente + saldo de crédito + cancelación (hasta 2 h antes)
@Component({
  imports: [CurrencyPipe, DatePipe, RouterLink],
  selector: 'app-mis-compras',
  styleUrl: './mis-compras.css',
  templateUrl: './mis-compras.html',
})
export class MisCompras implements OnInit {
  // Cancelar hasta 2 horas antes del inicio de la función
  readonly horasMinimas = 2;

  compras = signal<CompraVista[]>([]);
  saldo = signal(0);
  cargando = signal(true);
  cancelando = signal<number | null>(null);   // id de la compra que se está cancelando
  mensaje = signal('');
  exito = signal(false);

  private usuarioId = '';

  constructor(
    private auth: Auth,
    private comprasService: Compras,
    private funcionesService: Funciones,
    private peliculasService: Peliculas,
  ) {}

  async ngOnInit() {
    // authGuard ya aseguró que hay sesión
    const perfil = await this.auth.obtenerPerfil();
    if (!perfil) {
      return;
    }
    this.usuarioId = perfil.id;
    await this.cargar();
  }

  private async cargar() {
    this.cargando.set(true);
    const compras = await this.comprasService.getComprasDeUsuario(this.usuarioId);
    const funciones = await this.funcionesService.getFunciones();
    const peliculas = await this.peliculasService.getPeliculas();
    if (compras.error || funciones.error || peliculas.error) {
      this.mostrar('No se pudieron cargar tus compras', false);
      this.cargando.set(false);
      return;
    }

    const vistas: CompraVista[] = [];
    for (const c of compras.data as Compra[]) {
      // Como tituloDe/salaDe del listado de funciones: se buscan en las listas ya cargadas
      const funcion: Funcion | null = funciones.data.find(f => f.id === c.funcion_id) ?? null;
      const pelicula: Pelicula | undefined = peliculas.data.find(p => p.id === funcion?.pelicula_id);
      const entradas = await this.comprasService.getEntradasDeCompra(c.id!);
      vistas.push({
        compra: c,
        titulo: pelicula?.titulo ?? '(película)',
        funcion: funcion,
        entradas: entradas.error ? 0 : entradas.data.length,
      });
    }
    this.compras.set(vistas);

    const saldo = await this.comprasService.getSaldoCredito(this.usuarioId);
    this.saldo.set(saldo ?? 0);
    this.cargando.set(false);
  }

  // '' = se puede cancelar; si no, el motivo (se muestra en lugar del botón)
  // Mismo QR que la confirmación de la compra (api.qrserver.com arma la imagen con el código)
  urlQr(codigo: string) {
    return 'https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=' + codigo;
  }

  motivoSinCancelar(v: CompraVista) {
    const c = v.compra;
    if (c.estado === 'cancelada') {
      return 'Cancelada';
    }
    if (c.ingreso_validado_en || c.candy_entregado_en) {
      return 'Ya usada';
    }
    if (!v.funcion) {
      return 'Función no disponible';
    }
    const faltaMs = new Date(v.funcion.inicio).getTime() - new Date().getTime();
    if (faltaMs < this.horasMinimas * 3600000) {
      return faltaMs < 0 ? 'Función pasada' : 'Faltan menos de 2 h: ya no se puede cancelar';
    }
    return '';
  }

  // Lo que vuelve como crédito: todo el valor de la compra (lo pagado + el crédito que se haya usado)
  creditoDe(c: Compra) {
    return Number(c.total) + Number(c.credito_usado ?? 0);
  }

  async cancelar(v: CompraVista) {
    if (this.motivoSinCancelar(v) || this.cancelando()) {
      return;
    }
    if (!confirm(`¿Cancelar la compra ${v.compra.codigo}? Vas a recibir $${this.creditoDe(v.compra)} de crédito (no se devuelve dinero).`)) {
      return;
    }
    const c = v.compra;
    this.cancelando.set(c.id!);

    // 1) La compra (solo si sigue pagada y sin usar)
    const result = await this.comprasService.cancelarCompraDelCliente(c.id!);
    if (result.error || result.data.length === 0) {
      this.mostrar(result.error ? 'No se pudo cancelar: ' + result.error.message : 'Esta compra ya no se puede cancelar', false);
      this.cancelando.set(null);
      await this.cargar();
      return;
    }

    // 2) Las entradas: liberan las butacas
    const entradas = await this.comprasService.cancelarEntradasDeCompra(c.id!);
    // 3) El crédito a favor
    const credito = await this.comprasService.addMovimientoCredito({
      usuario_id: this.usuarioId,
      tipo: 'cancelacion',
      monto: this.creditoDe(c),
      compra_id: c.id!,
    });
    this.cancelando.set(null);

    if (entradas.error || credito.error) {
      // La compra ya quedó cancelada: se avisa para revisarlo a mano (mismo problema de "dos llamadas")
      this.mostrar('La compra se canceló, pero hubo un error al liberar las butacas o cargar el crédito. Avisá en boletería con el código ' + c.codigo, false);
    } else {
      this.mostrar(`Compra ${c.codigo} cancelada. Se sumó el crédito a tu cuenta.`, true);
    }
    await this.cargar();
  }

  private mostrar(texto: string, ok: boolean) {
    this.mensaje.set(texto);
    this.exito.set(ok);
  }
}
