import { DatePipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { Butaca } from '../../models/butaca';
import { Compra } from '../../models/compra';
import { Funcion } from '../../models/funcion';
import { ValidacionData } from '../../models/validacion-data';
import { Auth } from '../../servicios/auth';
import { Candy } from '../../servicios/candy';
import { Compras } from '../../servicios/compras';
import { Funciones } from '../../servicios/funciones';
import { Log } from '../../servicios/log';
import { Peliculas } from '../../servicios/peliculas';

// Lo que se muestra del candy: nombre y cantidad
interface LineaCandy {
  nombre: string;
  cantidad: number;
}

// Panel del empleado: busca una compra por su código (ingreso manual) y marca
// el ingreso a la sala y la entrega del candy. Cada cosa se puede usar una sola vez.
@Component({
  imports: [DatePipe, FormField],
  selector: 'app-empleado',
  styleUrl: './empleado.css',
  templateUrl: './empleado.html',
})
export class Empleado {
  // Formulario con signals, como Login: un solo campo
  validacionModel = signal<ValidacionData>({ codigo: '' });
  validacionForm = form(this.validacionModel, (schemaPath) => {
    required(schemaPath.codigo, { message: 'Ingresá el código de la compra' });
  });

  // Lo encontrado
  compra = signal<Compra | null>(null);
  funcion = signal<Funcion | null>(null);
  titulo = signal('');
  edadMinima = signal(0);   // 0 = ATP; 13 o 18 = avisar que los menores van con un adulto
  sala = signal('');
  butacas = signal<Butaca[]>([]);
  candy = signal<LineaCandy[]>([]);

  mensaje = signal('');
  exito = signal(false);
  procesando = signal(false);

  // Ventana para validar el ingreso: desde 1 hora antes del inicio hasta el fin de la función
  minutosAntes = 60;

  constructor(
    private comprasService: Compras,
    private funcionesService: Funciones,
    private peliculasService: Peliculas,
    private candyService: Candy,
    private log: Log,
    private auth: Auth,
  ) {}

  private limpiar() {
    this.compra.set(null);
    this.funcion.set(null);
    this.titulo.set('');
    this.edadMinima.set(0);
    this.sala.set('');
    this.butacas.set([]);
    this.candy.set([]);
    this.mensaje.set('');
    this.exito.set(false);
  }

  async buscar(event: Event) {
    event.preventDefault();
    this.limpiar();

    const result = await this.comprasService.getCompraPorCodigo(this.validacionModel().codigo);
    if (result.error) {
      this.mensaje.set('No se pudo buscar: ' + result.error.message);
      return;
    }
    if (result.data.length === 0) {
      this.mensaje.set('No existe ninguna compra con ese código');
      return;
    }
    const compra: Compra = result.data[0];

    // Función, película y sala (para que el empleado sepa a qué sala va)
    const funcion = await this.funcionesService.getFuncion(compra.funcion_id);
    if (funcion.error || funcion.data.length === 0) {
      this.mensaje.set('No se encontró la función de esta compra');
      return;
    }
    const f: Funcion = funcion.data[0];
    const pelicula = await this.peliculasService.getPelicula(f.pelicula_id);
    const salas = await this.funcionesService.getSalas();
    this.titulo.set(pelicula.data?.[0]?.titulo ?? '(película)');
    this.edadMinima.set(pelicula.data?.[0]?.edad_minima ?? 0);
    this.sala.set(salas.data?.find(s => s.id === f.sala_id)?.nombre ?? '(sala)');

    // Butacas: las entradas activas de la compra, buscadas en las butacas de la sala
    const entradas = await this.comprasService.getEntradasDeCompra(compra.id!);
    const butacasSala = await this.funcionesService.getButacasDeSala(f.sala_id);
    if (!entradas.error && !butacasSala.error) {
      const ids = entradas.data.filter(e => e.estado === 'activa').map(e => e.butaca_id);
      this.butacas.set(butacasSala.data.filter(b => ids.includes(b.id)));
    }

    // Candy: filas de compra_productos con el nombre del producto
    const filas = await this.comprasService.getProductosDeCompra(compra.id!);
    const productos = await this.candyService.getProductos();
    if (!filas.error && !productos.error) {
      this.candy.set(filas.data.map(fila => ({
        nombre: productos.data.find(p => p.id === fila.producto_id)?.nombre ?? '(combo)',
        cantidad: fila.cantidad,
      })));
    }

    this.funcion.set(f);
    this.compra.set(compra);
  }

  // Por qué no se puede validar el ingreso ahora ('' = se puede).
  // Se calcula cuando la pantalla se redibuja (al buscar o tocar un botón), no en vivo:
  // si el cliente llega temprano, se vuelve a buscar el código más tarde.
  motivoSinIngreso() {
    const compra = this.compra();
    const funcion = this.funcion();
    if (!compra || !funcion) {
      return 'Sin compra';
    }
    if (compra.estado === 'cancelada') {
      return 'Compra cancelada: no es válida';
    }
    if (compra.ingreso_validado_en) {
      return 'Ya ingresó';
    }
    const ahora = new Date().getTime();
    const inicio = new Date(funcion.inicio).getTime();
    const fin = new Date(funcion.fin).getTime();
    if (ahora < inicio - this.minutosAntes * 60000) {
      return 'Todavía no: se valida desde 1 hora antes de la función';
    }
    if (ahora > fin) {
      return 'La función ya terminó';
    }
    return '';
  }

  async validarIngreso() {
    const compra = this.compra();
    const empleado = this.auth.perfil();
    if (!compra || !empleado || this.motivoSinIngreso()) {
      return;
    }
    this.procesando.set(true);
    const result = await this.comprasService.validarIngreso(compra.id!, empleado.id);
    this.procesando.set(false);
    if (result.error) {
      this.mostrarError('No se pudo validar: ' + result.error.message);
      return;
    }
    // Vacío = el update no encontró la compra sin validar: alguien la usó antes
    if (result.data.length === 0) {
      this.mostrarError('Este código ya se usó para ingresar');
      await this.recargarCompra(compra.codigo);
      return;
    }
    this.compra.set(result.data[0]);
    await this.log.registrar('Validar entrada', `Compra ${compra.codigo} · ${this.titulo()} · ${this.sala()}`);
    this.mostrarOk(`Ingreso validado: ${this.butacas().length} persona(s) a ${this.sala()}`);
  }

  async entregarCandy() {
    const compra = this.compra();
    const empleado = this.auth.perfil();
    if (!compra || !empleado || compra.estado === 'cancelada' || compra.candy_entregado_en) {
      return;
    }
    this.procesando.set(true);
    const result = await this.comprasService.entregarCandy(compra.id!, empleado.id);
    this.procesando.set(false);
    if (result.error) {
      this.mostrarError('No se pudo marcar el candy: ' + result.error.message);
      return;
    }
    if (result.data.length === 0) {
      this.mostrarError('El candy de este código ya se entregó');
      await this.recargarCompra(compra.codigo);
      return;
    }
    this.compra.set(result.data[0]);
    await this.log.registrar('Entregar candy', `Compra ${compra.codigo}`);
    this.mostrarOk('Candy entregado');
  }

  // Trae de nuevo la compra para mostrar cuándo se usó (si otro empleado la validó recién)
  private async recargarCompra(codigo: string) {
    const result = await this.comprasService.getCompraPorCodigo(codigo);
    if (!result.error && result.data.length > 0) {
      this.compra.set(result.data[0]);
    }
  }

  nuevaBusqueda() {
    this.limpiar();
    this.validacionModel.set({ codigo: '' });
  }

  private mostrarOk(texto: string) {
    this.exito.set(true);
    this.mensaje.set(texto);
  }

  private mostrarError(texto: string) {
    this.exito.set(false);
    this.mensaje.set(texto);
  }
}
