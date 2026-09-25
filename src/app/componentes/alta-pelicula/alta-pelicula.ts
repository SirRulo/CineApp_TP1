import { Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Genero } from '../../models/genero';
import { Pelicula } from '../../models/pelicula';
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

  // null = alta (peliculas/nueva); con número = edición (peliculas/editar/:id)
  peliculaId = signal<number | null>(null);

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

  constructor(private peliculas: Peliculas, private route: ActivatedRoute, private router: Router) {}

  async ngOnInit() {
    const result = await this.peliculas.getGeneros();
    if (result.error) {
      this.mensaje.set('No se pudieron cargar los géneros: ' + result.error.message);
      return;
    }
    this.generos.set(result.data);

    // snapshot alcanza (como en rutas/detalle): al pasar de una película a otra
    // se vuelve por el listado, así que el componente se crea de nuevo
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.peliculaId.set(Number(id));
      await this.cargarPelicula(Number(id));
    }
  }

  // Modo edición: trae la película y sus géneros y los pone en el formulario
  private async cargarPelicula(id: number) {
    const result = await this.peliculas.getPelicula(id);
    if (result.error || result.data.length === 0) {
      this.mensaje.set('No se encontró la película');
      return;
    }
    const pelicula: Pelicula = result.data[0];

    // '2026-10-01' → [2026, 10, 1]
    const [anio, mes, dia] = pelicula.fecha_estreno.split('-').map(Number);

    // patchValue: carga solo los controles que se le pasan (como reset, pero sin vaciar el resto)
    this.formPelicula.patchValue({
      titulo: pelicula.titulo,
      sinopsis: pelicula.sinopsis,
      duracion_min: pelicula.duracion_min,
      imagen_url: pelicula.imagen_url,
      edad_minima: pelicula.edad_minima,
      dia: dia,
      mes: mes,
      anio: anio,
      precio_preventa: pelicula.precio_preventa,
      destacada: pelicula.destacada,
    });

    const generos = await this.peliculas.getGenerosDePelicula(id);
    if (generos.error) {
      this.mensaje.set('No se pudieron cargar los géneros de la película: ' + generos.error.message);
      return;
    }
    this.generosSeleccionados.set(generos.data.map(fila => fila.genero_id));
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

    // Sin 'activa': en el alta la pone la base (true) y en la edición no se toca
    const datos: Pelicula = {
      titulo: v.titulo!,
      sinopsis: v.sinopsis!,
      duracion_min: v.duracion_min!,
      imagen_url: v.imagen_url!,
      edad_minima: v.edad_minima!,
      fecha_estreno: `${v.anio}-${mes}-${dia}`,
      precio_preventa: v.precio_preventa ?? null,
      destacada: v.destacada ?? false,
    };

    const id = this.peliculaId();
    if (id) {
      await this.editar(id, datos);
    } else {
      await this.crear(datos);
    }
  }

  private async crear(datos: Pelicula) {
    // 1) Insertar la película y recuperar su id
    const result = await this.peliculas.addPelicula(datos);
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
    this.mensaje.set(`"${datos.titulo}" se guardó correctamente`);
    // reset() deja todo en null: a edad y destacada les devolvemos su valor inicial
    this.formPelicula.reset({ edad_minima: 0, destacada: false });
    this.generosSeleccionados.set([]);
  }

  private async editar(id: number, datos: Pelicula) {
    // 1) Actualizar los datos de la película
    const result = await this.peliculas.updatePelicula({ ...datos, id: id });
    if (result.error) {
      this.mensaje.set('No se pudo actualizar la película: ' + result.error.message);
      return;
    }

    // 2) Géneros: borrar los viejos y cargar los tildados
    const borrado = await this.peliculas.deleteGenerosDePelicula(id);
    if (borrado.error) {
      this.mensaje.set('Se actualizó la película, pero no se pudieron cambiar los géneros: ' + borrado.error.message);
      return;
    }
    const generos = await this.peliculas.addGenerosDePelicula(id, this.generosSeleccionados());
    if (generos.error) {
      this.mensaje.set('Se borraron los géneros viejos pero fallaron los nuevos (volvé a guardar): ' + generos.error.message);
      return;
    }

    // Al editar, se vuelve al listado para ver el cambio
    this.router.navigate(['/admin/peliculas']);
  }
}
