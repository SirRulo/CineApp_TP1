import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Funcion } from '../../models/funcion';
import { Pelicula } from '../../models/pelicula';
import { Sala } from '../../models/sala';
import { Funciones } from '../../servicios/funciones';
import { Peliculas } from '../../servicios/peliculas';
import { sinSolapamientoValidator } from '../../validators/funcion.validators';

@Component({
  imports: [ReactiveFormsModule, DatePipe],
  selector: 'app-alta-funcion',
  styleUrl: './alta-funcion.css',
  templateUrl: './alta-funcion.html',
})
export class AltaFuncion implements OnInit, OnDestroy {
  formatos = ['2D', '3D', '4D', '5D'];
  idiomas = ['castellano', 'subtitulada'];
  // getDay() devuelve 0 = domingo … 6 = sábado
  nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Los próximos 14 días como botones (nada de calendario desplegable)
  dias: Date[] = [];

  peliculas = signal<Pelicula[]>([]);
  salas = signal<Sala[]>([]);

  // Funciones activas de la sala elegida: contra estas valida la regla de los 30 minutos.
  // Tiene que estar declarado antes del FormGroup, que lo usa.
  funcionesDeSala = signal<Funcion[]>([]);

  private suscripcionSala?: Subscription;

  mensaje = signal('');
  exito = signal(false);

  formFuncion = new FormGroup({
    // Se guarda la película entera (no solo el id): hace falta su duración para calcular el fin
    pelicula: new FormControl<Pelicula | null>(null, {
      validators: [Validators.required],
    }),
    sala_id: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    // No tiene input: lo carga el botón del día con setValue()
    dia: new FormControl<Date | null>(null, {
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
    // En la base: check (precio > 0)
    precio: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
    }),
    precio_vip: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
    }),
  }, {
    // Validador del grupo entero (no de un control): necesita película, día, hora y minutos a la vez.
    // Un signal es una función, así que se lo puede pasar tal cual.
    validators: [sinSolapamientoValidator(this.funcionesDeSala)],
  });

  constructor(private funciones: Funciones, private peliculasService: Peliculas) {
    const hoy = new Date();
    for (let i = 0; i < 14; i++) {
      // Si el día se pasa del fin de mes (ej. 32), Date lo convierte solo al mes siguiente
      this.dias.push(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i));
    }
  }

  async ngOnInit() {
    const peliculas = await this.peliculasService.getPeliculas();
    if (peliculas.error) {
      this.mensaje.set('No se pudieron cargar las películas: ' + peliculas.error.message);
      return;
    }
    // Solo se programan funciones de películas activas
    this.peliculas.set(peliculas.data.filter(p => p.activa));

    const salas = await this.funciones.getSalas();
    if (salas.error) {
      this.mensaje.set('No se pudieron cargar las salas: ' + salas.error.message);
      return;
    }
    this.salas.set(salas.data);

    // Cada vez que cambia la sala elegida, se traen sus funciones
    this.suscripcionSala = this.formFuncion.controls.sala_id.valueChanges.subscribe(salaId => {
      this.cargarFuncionesDeSala(salaId);
    });
  }

  ngOnDestroy() {
    this.suscripcionSala?.unsubscribe();
  }

  private async cargarFuncionesDeSala(salaId: number | null) {
    // null = sin sala (por ejemplo, después del reset)
    if (salaId === null) {
      this.funcionesDeSala.set([]);
    } else {
      const result = await this.funciones.getFuncionesDeSala(salaId);
      if (result.error) {
        this.mensaje.set('No se pudieron cargar las funciones de la sala: ' + result.error.message);
        return;
      }
      this.funcionesDeSala.set(result.data);
    }
    // El formulario no se entera solo de que cambió el signal: se le pide que vuelva a validar
    this.formFuncion.updateValueAndValidity();
  }

  elegirDia(dia: Date) {
    this.formFuncion.controls.dia.setValue(dia);
  }

  async guardar() {
    this.exito.set(false);
    // El botón solo se habilita con el form válido, así que ningún campo es null (!)
    const v = this.formFuncion.value;
    const pelicula = v.pelicula!;
    const dia = v.dia!;

    // Hora local de Argentina; toISOString() la pasa a UTC y Supabase la guarda bien (timestamptz)
    const inicio = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), v.hora!, v.minutos!);
    // getTime() = milisegundos: duración en minutos × 60.000
    const fin = new Date(inicio.getTime() + pelicula.duracion_min * 60000);

    if (inicio < new Date()) {
      this.mensaje.set('Ese horario ya pasó');
      return;
    }

    const datos: Funcion = {
      pelicula_id: pelicula.id!,
      sala_id: v.sala_id!,
      inicio: inicio.toISOString(),
      fin: fin.toISOString(),
      formato: v.formato!,
      idioma: v.idioma!,
      precio: v.precio!,
      precio_vip: v.precio_vip!,
    };

    const result = await this.funciones.addFuncion(datos);
    if (result.error) {
      this.mensaje.set('No se pudo guardar la función: ' + result.error.message);
      return;
    }

    this.exito.set(true);
    this.mensaje.set(`Función de "${pelicula.titulo}" guardada`);
    // reset() deja todo en null: formato e idioma vuelven a su valor inicial
    this.formFuncion.reset({ formato: '2D', idioma: 'castellano' });
  }
}
