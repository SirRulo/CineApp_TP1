import { Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Genero } from '../../models/genero';
import { Peliculas } from '../../servicios/peliculas';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-alta-pelicula',
  styleUrl: './alta-pelicula.css',
  templateUrl: './alta-pelicula.html',
})
export class AltaPelicula implements OnInit {
  edades = [0, 13, 18];
  anioActual = new Date().getFullYear();

  // Géneros que vienen de la base y los que tildó el admin (por id).
  // Van en signals aparte, fuera del FormGroup: la lista es dinámica y viene de Supabase.
  generos = signal<Genero[]>([]);
  generosSeleccionados = signal<number[]>([]);

  mensaje = signal('');
  exito = signal(false);

  // Un FormControl por campo, cada uno con sus validadores (como form-usuarios)
  formPelicula = new FormGroup({
    titulo: new FormControl('', {
      validators: [Validators.required],
    }),
    sinopsis: new FormControl('', {
      validators: [Validators.required, Validators.minLength(10)],
    }),
    duracion_min: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1), Validators.max(400)],
    }),
    imagen_url: new FormControl('', {
      validators: [Validators.required],
    }),
    edad_minima: new FormControl<0 | 13 | 18>(0, {
      validators: [Validators.required],
    }),
    dia: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1), Validators.max(31)],
    }),
    mes: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1), Validators.max(12)],
    }),
    anio: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1900), Validators.max(this.anioActual + 2)],
    }),
    // Opcional: vacío = sin preventa (null en la base)
    precio_preventa: new FormControl<number | null>(null, {
      validators: [Validators.min(0)],
    }),
    destacada: new FormControl(false),
  });

  constructor(private peliculas: Peliculas) {}

  async ngOnInit() {
    const result = await this.peliculas.getGeneros();
    if (result.error) {
      this.mensaje.set('No se pudieron cargar los géneros: ' + result.error.message);
      return;
    }
    this.generos.set(result.data);
  }

  // Si el id ya estaba, lo saca; si no, lo agrega. Se crea un arreglo nuevo para que el signal avise.
  alternarGenero(id: number) {
    const actuales = this.generosSeleccionados();
    if (actuales.includes(id)) {
      this.generosSeleccionados.set(actuales.filter(g => g !== id));
    } else {
      this.generosSeleccionados.set([...actuales, id]);
    }
  }

  async guardar() {
    this.exito.set(false);
    // El botón solo se habilita con el form válido, así que los campos obligatorios no son null (!)
    const v = this.formPelicula.value;

    // Igual que en Registro: new Date(2026, 1, 31) "se pasa" a marzo → la fecha no existe
    const fecha = new Date(v.anio!, v.mes! - 1, v.dia!);
    if (fecha.getMonth() !== v.mes! - 1) {
      this.mensaje.set('La fecha de estreno no existe');
      return;
    }
    const mes = String(v.mes).padStart(2, '0');
    const dia = String(v.dia).padStart(2, '0');

    // 1) Insertar la película y recuperar su id
    const result = await this.peliculas.addPelicula({
      titulo: v.titulo!,
      sinopsis: v.sinopsis!,
      duracion_min: v.duracion_min!,
      imagen_url: v.imagen_url!,
      edad_minima: v.edad_minima!,
      fecha_estreno: `${v.anio}-${mes}-${dia}`,
      precio_preventa: v.precio_preventa ?? null,
      destacada: v.destacada ?? false,
    });
    if (result.error) {
      this.mensaje.set('No se pudo guardar la película: ' + result.error.message);
      return;
    }
    const peliculaId = result.data[0].id;

    // 2) Insertar sus géneros en pelicula_generos
    const generos = await this.peliculas.addGenerosDePelicula(peliculaId, this.generosSeleccionados());
    if (generos.error) {
      this.mensaje.set('La película se guardó, pero fallaron los géneros: ' + generos.error.message);
      return;
    }

    this.exito.set(true);
    this.mensaje.set(`"${v.titulo}" se guardó correctamente`);
    // reset() deja todo en null: a edad y destacada les devolvemos su valor inicial
    this.formPelicula.reset({ edad_minima: 0, destacada: false });
    this.generosSeleccionados.set([]);
  }
}
