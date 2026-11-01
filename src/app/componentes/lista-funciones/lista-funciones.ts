import { DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Funcion } from '../../models/funcion';
import { Pelicula } from '../../models/pelicula';
import { Sala } from '../../models/sala';
import { Funciones } from '../../servicios/funciones';
import { Log } from '../../servicios/log';
import { Peliculas } from '../../servicios/peliculas';
import { haySolapamiento } from '../../validators/funcion.validators';

@Component({
  imports: [DatePipe, RouterLink],
  selector: 'app-lista-funciones',
  styleUrl: './lista-funciones.css',
  templateUrl: './lista-funciones.html',
})
export class ListaFunciones implements OnInit {
  funciones = signal<Funcion[]>([]);
  // La tabla funciones solo tiene los ids: título y nombre de sala se buscan en estas listas
  peliculas = signal<Pelicula[]>([]);
  salas = signal<Sala[]>([]);
  mensaje = signal('');
  exito = signal(false);
  cancelando = signal<number | null>(null);   // id de la función que se está cancelando

  constructor(private funcionesService: Funciones, private peliculasService: Peliculas, private log: Log) {}

  async ngOnInit() {
    const peliculas = await this.peliculasService.getPeliculas();
    if (peliculas.error) {
      this.mensaje.set('No se pudieron cargar las películas: ' + peliculas.error.message);
      return;
    }
    this.peliculas.set(peliculas.data);

    const salas = await this.funcionesService.getSalas();
    if (salas.error) {
      this.mensaje.set('No se pudieron cargar las salas: ' + salas.error.message);
      return;
    }
    this.salas.set(salas.data);

    this.cargarFunciones();
  }

  private async cargarFunciones() {
    const result = await this.funcionesService.getFunciones();
    if (result.error) {
      this.mensaje.set('No se pudieron cargar las funciones: ' + result.error.message);
      return;
    }
    this.funciones.set(result.data);
  }

  tituloDe(peliculaId: number) {
    return this.peliculas().find(p => p.id === peliculaId)?.titulo ?? '(película no encontrada)';
  }

  salaDe(salaId: number) {
    return this.salas().find(s => s.id === salaId)?.nombre ?? '(sala inactiva)';
  }

  // Para pintar el botón "Activar": ¿alguna función activa de la misma sala choca con esta?
  // Usa la lista ya cargada (sin ir a la base); alternarActiva vuelve a controlar con datos frescos.
  puedeActivarse(funcion: Funcion) {
    const inicio = new Date(funcion.inicio);
    const fin = new Date(funcion.fin);
    return !this.funciones().some(f =>
      f.activa && f.sala_id === funcion.sala_id
      && haySolapamiento(inicio, fin, new Date(f.inicio), new Date(f.fin)));
  }

  // Baja lógica, como en películas
  async alternarActiva(funcion: Funcion) {
    // Al reactivar, el horario pudo haberse ocupado mientras estaba inactiva: se vuelve a controlar la regla de 30 min
    if (!funcion.activa) {
      const activas = await this.funcionesService.getFuncionesDeSala(funcion.sala_id);
      if (activas.error) {
        this.mensaje.set('No se pudo controlar la sala: ' + activas.error.message);
        return;
      }
      const inicio = new Date(funcion.inicio);
      const fin = new Date(funcion.fin);
      // La que se reactiva no está en la lista (está inactiva), así que no choca consigo misma
      const choca = activas.data.some(f => haySolapamiento(inicio, fin, new Date(f.inicio), new Date(f.fin)));
      if (choca) {
        this.mensaje.set('No se puede activar: la sala ya tiene otra función en ese horario (o sin los 30 minutos de limpieza)');
        return;
      }
    }

    const result = await this.funcionesService.updateFuncion({ ...funcion, activa: !funcion.activa });
    if (result.error) {
      this.mensaje.set('No se pudo actualizar la función: ' + result.error.message);
      return;
    }
    this.mensaje.set('');
    this.exito.set(false);
    this.cargarFunciones();
  }

  // Se puede cancelar mientras no esté cancelada y no haya terminado (la base lo vuelve a controlar)
  puedeCancelarse(funcion: Funcion) {
    return !funcion.cancelada_en && new Date(funcion.fin) > new Date();
  }

  // Cancelación por el cine (mail RPP): todo lo hace la función de la base en una transacción
  async cancelar(funcion: Funcion) {
    const titulo = this.tituloDe(funcion.pelicula_id);
    if (!confirm(`¿Cancelar la función de "${titulo}"? Todas las compras pasan a crédito, se liberan las butacas y se avisa a los compradores. No se puede deshacer.`)) {
      return;
    }
    this.cancelando.set(funcion.id!);
    const result = await this.funcionesService.cancelarFuncion(funcion.id!);
    this.cancelando.set(null);

    if (result.error) {
      // La transacción se deshizo: no se acreditó a nadie
      this.exito.set(false);
      this.mensaje.set('No se pudo cancelar la función (no se hizo ningún cambio): ' + result.error.message);
      return;
    }

    const r = result.data;
    let texto = `Función cancelada. ${r.acreditadas} compra(s) con cuenta recibieron $${r.monto} de crédito en total y un aviso.`;
    if (r.anonimas > 0) {
      texto += ` ${r.anonimas} compra(s) anónima(s): reintegro en boletería con el código.`;
    }
    this.exito.set(true);
    this.mensaje.set(texto);

    await this.log.registrar('Cancelar función',
      `"${titulo}" del ${new Date(funcion.inicio).toLocaleString('es-AR')} en ${this.salaDe(funcion.sala_id)}: `
      + `${r.acreditadas} con crédito ($${r.monto}), ${r.anonimas} anónimas`);
    this.cargarFunciones();
  }
}
