import { DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Funcion } from '../../models/funcion';
import { Pelicula } from '../../models/pelicula';
import { Sala } from '../../models/sala';
import { Funciones } from '../../servicios/funciones';
import { Log } from '../../servicios/log';
import { Peliculas } from '../../servicios/peliculas';
import { haySolapamiento } from '../../validators/funcion.validators';

// Resultado de un día: en qué sala quedó, o por qué no se pudo
interface ResultadoDia {
  dia: Date;
  sala: string | null;   // null = no se creó
  motivo: string;        // '' si salió bien
}

// Asignación automática de sala: el admin elige película, días y hora;
// el sistema busca, para cada día, la primera sala sin choque (regla de los 30 minutos).
@Component({
  imports: [ReactiveFormsModule, DatePipe],
  selector: 'app-programar-funciones',
  styleUrl: './programar-funciones.css',
  templateUrl: './programar-funciones.html',
})
export class ProgramarFunciones implements OnInit {
  formatos = ['2D', '3D', '4D', '5D'];
  idiomas = ['castellano', 'subtitulada'];
  nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  dias: Date[] = [];

  peliculas = signal<Pelicula[]>([]);
  salas = signal<Sala[]>([]);
  // Varios días a la vez: fuera del FormGroup, como los géneros de AltaPelicula
  diasElegidos = signal<Date[]>([]);
  resultados = signal<ResultadoDia[]>([]);
  procesando = signal(false);
  mensaje = signal('');

  // Igual que AltaFuncion pero sin sala ni día (la sala la elige el sistema; los días van aparte)
  formProgramar = new FormGroup({
    pelicula: new FormControl<Pelicula | null>(null, {
      validators: [Validators.required],
    }),
    hora: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0), Validators.max(23)],
    }),
    minutos: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0), Validators.max(59)],
    }),
    formato: new FormControl<'2D' | '3D' | '4D' | '5D'>('2D', {
      validators: [Validators.required],
    }),
    idioma: new FormControl<'castellano' | 'subtitulada'>('castellano', {
      validators: [Validators.required],
    }),
    precio: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
    }),
    precio_vip: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
    }),
  });

  constructor(private funciones: Funciones, private peliculasService: Peliculas, private log: Log) {
    const hoy = new Date();
    for (let i = 0; i < 14; i++) {
      this.dias.push(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i));
    }
  }

  async ngOnInit() {
    const peliculas = await this.peliculasService.getPeliculas();
    if (peliculas.error) {
      this.mensaje.set('No se pudieron cargar las películas: ' + peliculas.error.message);
      return;
    }
    this.peliculas.set(peliculas.data.filter(p => p.activa));

    // getSalas ya viene ordenado por nombre: es el orden en que se prueban
    const salas = await this.funciones.getSalas();
    if (salas.error) {
      this.mensaje.set('No se pudieron cargar las salas: ' + salas.error.message);
      return;
    }
    this.salas.set(salas.data);
  }

  estaElegido(dia: Date) {
    return this.diasElegidos().includes(dia);
  }

  // Como alternarGenero: si estaba lo saca, si no lo agrega (arreglo nuevo para que el signal avise)
  alternarDia(dia: Date) {
    const actuales = this.diasElegidos();
    if (actuales.includes(dia)) {
      this.diasElegidos.set(actuales.filter(d => d !== dia));
    } else {
      this.diasElegidos.set([...actuales, dia]);
    }
  }

  async programar() {
    this.procesando.set(true);
    this.mensaje.set('');
    this.resultados.set([]);

    const v = this.formProgramar.value;
    const pelicula = v.pelicula!;
    // En orden de fecha (se pueden haber tocado desordenados)
    const dias = [...this.diasElegidos()].sort((a, b) => a.getTime() - b.getTime());
    const resultados: ResultadoDia[] = [];

    for (const dia of dias) {
      const inicio = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), v.hora!, v.minutos!);
      const fin = new Date(inicio.getTime() + pelicula.duracion_min * 60000);

      if (inicio < new Date()) {
        resultados.push({ dia: inicio, sala: null, motivo: 'ese horario ya pasó' });
        continue;
      }

      // Primera sala sin choque. Las funciones se piden de nuevo en cada vuelta:
      // así también cuentan las que se acaban de crear para los días anteriores.
      let asignada: Sala | null = null;
      let motivo = 'no hay sala libre';
      for (const sala of this.salas()) {
        const result = await this.funciones.getFuncionesDeSala(sala.id);
        if (result.error) {
          motivo = 'error al consultar ' + sala.nombre + ': ' + result.error.message;
          continue;
        }
        const funcionesSala: Funcion[] = result.data;
        const choca = funcionesSala.some(f =>
          haySolapamiento(inicio, fin, new Date(f.inicio), new Date(f.fin)));
        if (!choca) {
          asignada = sala;
          break;   // la primera que sirve: no se siguen probando las demás
        }
      }

      if (!asignada) {
        resultados.push({ dia: inicio, sala: null, motivo: motivo });
        continue;
      }

      const datos: Funcion = {
        pelicula_id: pelicula.id!,
        sala_id: asignada.id,
        inicio: inicio.toISOString(),
        fin: fin.toISOString(),
        formato: v.formato!,
        idioma: v.idioma!,
        precio: v.precio!,
        precio_vip: v.precio_vip!,
      };
      const alta = await this.funciones.addFuncion(datos);
      if (alta.error) {
        resultados.push({ dia: inicio, sala: null, motivo: 'no se pudo guardar: ' + alta.error.message });
        continue;
      }
      await this.log.registrar('Crear función',
        `"${pelicula.titulo}" · ${asignada.nombre} (automática) · ${inicio.toLocaleString('es-AR')} · ${datos.formato} ${datos.idioma} · $${datos.precio} / VIP $${datos.precio_vip}`);
      resultados.push({ dia: inicio, sala: asignada.nombre, motivo: '' });
    }

    this.resultados.set(resultados);
    this.diasElegidos.set([]);
    this.procesando.set(false);
  }
}
