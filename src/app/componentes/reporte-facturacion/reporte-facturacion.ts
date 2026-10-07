import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { Funcion } from '../../models/funcion';
import { Pelicula } from '../../models/pelicula';
import { Producto } from '../../models/producto';
import { Candy } from '../../servicios/candy';
import { Compras } from '../../servicios/compras';
import { Funciones } from '../../servicios/funciones';
import { Peliculas } from '../../servicios/peliculas';

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

// Lo que viene de entradas (solo las columnas pedidas)
interface EntradaReporte {
  compra_id: number;
  funcion_id: number;
}

// Una barra del gráfico de más vistas
interface BarraPelicula {
  titulo: string;
  entradas: number;
  porcentaje: number;   // ancho de la barra: 100 = la más vista
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
  private entradas: EntradaReporte[] = [];
  private funciones: Funcion[] = [];
  private peliculas: Pelicula[] = [];
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
  masVistas = signal<BarraPelicula[]>([]);
  mensaje = signal('');
  // Fecha y hora del encabezado impreso: se fija al abrir el reporte y al tocar "Descargar PDF"
  generado = signal(new Date());

  constructor(
    private comprasService: Compras,
    private candy: Candy,
    private funcionesService: Funciones,
    private peliculasService: Peliculas,
  ) {}

  async ngOnInit() {
    const compras = await this.comprasService.getComprasParaReporte();
    const entradas = await this.comprasService.getEntradasActivas();
    if (compras.error || entradas.error) {
      this.mensaje.set('No se pudo armar el reporte');
      return;
    }
    this.compras = compras.data;
    this.entradas = entradas.data;

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

    // Más vistas: hace falta saber de qué película es cada función. Si falla, lo demás se muestra igual
    const funciones = await this.funcionesService.getFunciones();
    const peliculas = await this.peliculasService.getPeliculas();
    if (funciones.error || peliculas.error) {
      console.error(funciones.error ?? peliculas.error);
    } else {
      this.funciones = funciones.data;
      this.peliculas = peliculas.data;
    }

    this.armarFilas();
  }

  elegirPeriodo(dias: number) {
    this.periodo.set(dias);
    this.armarFilas();
  }

  // PDF sin librerías: abre el diálogo de impresión del navegador y ahí se elige "Guardar como PDF".
  // Lo que se ve en la hoja lo decide el @media print de styles.css (oculta navbar, menú y botones).
  descargarPdf() {
    this.generado.set(new Date());
    // setTimeout: Angular redibuja después de este método; si imprimiera ya, la hoja saldría con la hora vieja
    setTimeout(() => window.print());
  }

  // Excel sin librerías (mail 10/03): se arma un CSV (texto con una fila por línea) y se descarga.
  // Separador ";" y decimales con "," porque así lo abre Excel en español; '﻿' (BOM) para que lea bien los acentos.
  descargarExcel() {
    const lineas = ['Día;Compras;Entradas vendidas;Facturación'];
    for (const f of this.filas()) {
      lineas.push(`${f.dia.toLocaleDateString('es-AR')};${f.compras};${f.entradas};${String(f.facturacion).replace('.', ',')}`);
    }
    lineas.push(`Total;${this.totalCompras()};${this.totalEntradas()};${String(this.totalFacturacion()).replace('.', ',')}`);

    // Blob = el archivo en memoria; un <a download> temporal hace que el navegador lo baje
    const archivo = new Blob(['﻿' + lineas.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(archivo);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'reporte-facturacion.csv';
    link.click();
    URL.revokeObjectURL(url);  // se libera la memoria del Blob
  }

  // Para el encabezado que solo sale impreso
  nombreDelPeriodo() {
    return this.periodos.find(p => p.dias === this.periodo())?.nombre ?? '';
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
    this.armarMasVistas(desde);
    this.armarTopCandy(desde);
  }

  // Compras pagadas (this.compras ya son solo esas) que entran en el período: { compraId: true }.
  // Lo usan el gráfico y el candy, así los tres bloques del reporte hablan del mismo período.
  private comprasDelPeriodo(desde: Date | null) {
    const marcadas: { [compraId: number]: boolean } = {};
    for (const c of this.compras) {
      if (!desde || new Date(c.created_at) >= desde) {
        marcadas[c.id] = true;
      }
    }
    return marcadas;
  }

  // Gráfico de más vistas: entradas activas por película, contadas por la fecha de la COMPRA
  // (decisión A de Franco: mismo criterio que la tabla). 7 días = la semana, 30 = el mes.
  private armarMasVistas(desde: Date | null) {
    const delPeriodo = this.comprasDelPeriodo(desde);

    // Contador como el top 3 de Home: { peliculaId: entradas }
    const porPelicula: { [peliculaId: number]: number } = {};
    for (const e of this.entradas) {
      if (!delPeriodo[e.compra_id]) {
        continue;
      }
      const funcion = this.funciones.find(f => f.id === e.funcion_id);
      if (!funcion) {
        continue;
      }
      porPelicula[funcion.pelicula_id] = (porPelicula[funcion.pelicula_id] ?? 0) + 1;
    }

    // Object.keys da los ids como texto: Number() para compararlos
    const ids = Object.keys(porPelicula).map(id => Number(id));
    ids.sort((a, b) => porPelicula[b] - porPelicula[a]);
    const top = ids.slice(0, 5);

    // La más vista es la barra entera (100 %); las demás, en proporción a ella
    const maximo = top.length > 0 ? porPelicula[top[0]] : 0;
    this.masVistas.set(top.map(id => ({
      titulo: this.peliculas.find(p => p.id === id)?.titulo ?? '(película)',
      entradas: porPelicula[id],
      porcentaje: Math.round(porPelicula[id] / maximo * 100),
    })));
  }

  // Candy más vendido del período: solo productos de compras pagadas que entran en el período.
  // Se marcan las compras que sirven y se cuenta como el top 3.
  private armarTopCandy(desde: Date | null) {
    const comprasDelPeriodo = this.comprasDelPeriodo(desde);

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
