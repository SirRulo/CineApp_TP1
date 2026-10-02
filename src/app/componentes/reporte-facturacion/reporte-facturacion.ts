import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
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

  // 7, 30 o 0 (= todo)
  periodos = [
    { dias: 7, nombre: 'Últimos 7 días' },
    { dias: 30, nombre: 'Últimos 30 días' },
    { dias: 0, nombre: 'Todo' },
  ];
  periodo = signal(7);
  filas = signal<FilaReporte[]>([]);
  mensaje = signal('');

  constructor(private comprasService: Compras) {}

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
