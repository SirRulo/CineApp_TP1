import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { Producto } from '../../models/producto';
import { Candy } from '../../servicios/candy';
import { Compras } from '../../servicios/compras';

// Lo que viene de la base para el reporte (solo las columnas pedidas)
interface CompraReporte {
  id: number;
  created_at: string;
  total: number;
}

// Una fila de la tabla: un día
interface FilaReporte {
  dia: Date;          // 00:00 de ese día (hora local)
  compras: number;
  entradas: number;
  facturacion: number;
}

// Lo que viene de compra_productos (solo las columnas pedidas)
interface ProductoVendido {
  compra_id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
}

// Un puesto del ranking del candy
interface PuestoCandy {
  nombre: string;
  unidades: number;
  recaudado: number;
}

// Reporte del admin: facturación y entradas vendidas por día
@Component({
  imports: [CurrencyPipe, DatePipe],
  selector: 'app-reporte-facturacion',
  styleUrl: './reporte-facturacion.css',
  templateUrl: './reporte-facturacion.html',
})
export class ReporteFacturacion implements OnInit {
  // Lo que se trae una sola vez; el período solo cambia cómo se filtra
  private compras: CompraReporte[] = [];
  private entradasPorCompra: { [compraId: number]: number } = {};
  private productosVendidos: ProductoVendido[] = [];
  private productos: Producto[] = [];

  // 7, 30 o 0 (= todo)
  periodos = [
    { dias: 7, nombre: 'Últimos 7 días' },
    { dias: 30, nombre: 'Últimos 30 días' },
    { dias: 0, nombre: 'Todo' },
  ];
  periodo = signal(7);
  filas = signal<FilaReporte[]>([]);
  topCandy = signal<PuestoCandy[]>([]);
  mensaje = signal('');

  constructor(private comprasService: Compras, private candy: Candy) {}

  async ngOnInit() {
    const compras = await this.comprasService.getComprasParaReporte();
    const entradas = await this.comprasService.getEntradasActivas();
    if (compras.error || entradas.error) {
      this.mensaje.set('No se pudo armar el reporte');
      return;
    }
    this.compras = compras.data;

    // Contador como el del top 3: { compraId: cantidad de entradas }
    const contador: { [compraId: number]: number } = {};
    for (const e of entradas.data) {
      contador[e.compra_id] = (contador[e.compra_id] ?? 0) + 1;
    }
    this.entradasPorCompra = contador;

    // Candy: si falla, el reporte de días se muestra igual (como el top 3 en Home)
    const vendidos = await this.comprasService.getProductosVendidos();
    const productos = await this.candy.getProductos();
    if (vendidos.error || productos.error) {
      console.error(vendidos.error ?? productos.error);
    } else {
      this.productosVendidos = vendidos.data;
      this.productos = productos.data;
    }

    this.armarFilas();
  }

  elegirPeriodo(dias: number) {
    this.periodo.set(dias);
    this.armarFilas();
  }

  // Agrupa por día en TypeScript (group by no está en el material).
  // La clave es el día en hora local ('2026-10-02'): una compra a las 23:30 de Argentina
  // es de ese día aunque en UTC ya sea el siguiente.
  private armarFilas() {
    const desde = this.inicioDelPeriodo();
    const porDia: { [clave: string]: FilaReporte } = {};

    for (const c of this.compras) {
      const fecha = new Date(c.created_at);
      if (desde && fecha < desde) {
        continue;
      }
      const dia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
      const clave = `${dia.getFullYear()}-${dia.getMonth() + 1}-${dia.getDate()}`;
      if (!porDia[clave]) {
        porDia[clave] = { dia: dia, compras: 0, entradas: 0, facturacion: 0 };
      }
      porDia[clave].compras++;
      porDia[clave].entradas += this.entradasPorCompra[c.id] ?? 0;
      porDia[clave].facturacion += Number(c.total);
    }

    // Object.values: las filas del objeto en un arreglo; lo más nuevo arriba
    const filas = Object.values(porDia).sort((a, b) => b.dia.getTime() - a.dia.getTime());
    this.filas.set(filas);
    this.armarTopCandy(desde);
  }

  // Candy más vendido del período: solo productos de compras pagadas que entran en el período.
  // this.compras ya son solo las pagadas, así que se marcan las que sirven y se cuenta como el top 3.
  private armarTopCandy(desde: Date | null) {
    const comprasDelPeriodo: { [compraId: number]: boolean } = {};
    for (const c of this.compras) {
      if (!desde || new Date(c.created_at) >= desde) {
        comprasDelPeriodo[c.id] = true;
      }
    }

    // Contador por producto: { productoId: { unidades, recaudado } }
    const porProducto: { [productoId: number]: { unidades: number; recaudado: number } } = {};
    for (const v of this.productosVendidos) {
      if (!comprasDelPeriodo[v.compra_id]) {
        continue;
      }
      if (!porProducto[v.producto_id]) {
        porProducto[v.producto_id] = { unidades: 0, recaudado: 0 };
      }
      porProducto[v.producto_id].unidades += v.cantidad;
      porProducto[v.producto_id].recaudado += v.cantidad * Number(v.precio_unitario);
    }

    // Object.keys da los ids como texto: Number() para comparar con producto.id
    const puestos: PuestoCandy[] = Object.keys(porProducto).map(id => ({
      nombre: this.productos.find(p => p.id === Number(id))?.nombre ?? '(producto)',
      unidades: porProducto[Number(id)].unidades,
      recaudado: porProducto[Number(id)].recaudado,
    }));

    // Más unidades primero; los 5 primeros
    this.topCandy.set(puestos.sort((a, b) => b.unidades - a.unidades).slice(0, 5));
  }

  // 00:00 de hace N-1 días (así "últimos 7" incluye hoy); null = sin límite
  private inicioDelPeriodo() {
    const dias = this.periodo();
    if (dias === 0) {
      return null;
    }
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - (dias - 1));
  }

  // Fila de totales
  totalCompras() {
    let total = 0;
    for (const f of this.filas()) {
      total += f.compras;
    }
    return total;
  }

  totalEntradas() {
    let total = 0;
    for (const f of this.filas()) {
      total += f.entradas;
    }
    return total;
  }

  totalFacturacion() {
    let total = 0;
    for (const f of this.filas()) {
      total += f.facturacion;
    }
    return total;
  }
}
