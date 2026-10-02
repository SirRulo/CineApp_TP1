import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AdminDirective } from '../../directivas/admin.directive';
import { Funcion } from '../../models/funcion';
import { Pelicula } from '../../models/pelicula';
import { Resena } from '../../models/resena';
import { Sala } from '../../models/sala';
import { PromedioPipe } from '../../pipes/promedio-pipe';
import { Auth } from '../../servicios/auth';
import { Funciones } from '../../servicios/funciones';
import { Peliculas } from '../../servicios/peliculas';
import { Resenas } from '../../servicios/resenas';

@Component({
  imports: [DatePipe, DecimalPipe, RouterLink, PromedioPipe, ReactiveFormsModule, AdminDirective],
  selector: 'app-detalle-pelicula',
  styleUrl: './detalle-pelicula.css',
  templateUrl: './detalle-pelicula.html',
})
export class DetallePelicula implements OnInit, OnDestroy {
  nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  pelicula = signal<Pelicula | null>(null);
  generos = signal<string[]>([]);
  funciones = signal<Funcion[]>([]);
  salas = signal<Sala[]>([]);
  resenas = signal<Resena[]>([]);

  // Días distintos que tienen funciones (a las 00:00), para los botones de día
  dias = signal<Date[]>([]);
  diaElegido = signal<Date | null>(null);
  funcionElegida = signal<Funcion | null>(null);

  mensaje = signal('');

  // Formulario de reseña (solo con sesión)
  largoMaximo = 200;
  mensajeResena = signal('');
  publicando = signal(false);
  publicada = signal(false);   // true después de publicar: muestra el "gracias"

  formResena = new FormGroup({
    // No tiene input: lo carga el botón de la estrella con setValue() (como el día en AltaFuncion)
    estrellas: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1), Validators.max(5)],
    }),
    // Opcional: vacío se guarda como null
    comentario: new FormControl('', {
      validators: [Validators.maxLength(this.largoMaximo)],
    }),
  });

  private suscripcionRuta?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private peliculasService: Peliculas,
    private funcionesService: Funciones,
    private resenasService: Resenas,
    public auth: Auth,   // public: el HTML lee auth.perfil() (como en Navbar)
  ) {}

  ngOnInit() {
    // paramMap (y no snapshot): si el :id cambia con el componente abierto, se vuelve a cargar
    // (como rutas/detalle.ts del profe)
    this.suscripcionRuta = this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      this.cargar(Number(id));
    });
  }

  ngOnDestroy() {
    this.suscripcionRuta?.unsubscribe();
  }

  private async cargar(id: number) {
    // Se limpia lo de la película anterior (por si el componente se reutiliza)
    this.mensaje.set('');
    this.pelicula.set(null);
    this.diaElegido.set(null);
    this.funcionElegida.set(null);
    this.resenas.set([]);
    this.mensajeResena.set('');
    this.publicada.set(false);
    this.formResena.reset();

    const result = await this.peliculasService.getPelicula(id);
    if (result.error || result.data.length === 0 || !result.data[0].activa) {
      this.mensaje.set('Esta película no está disponible');
      return;
    }
    this.pelicula.set(result.data[0]);

    await this.cargarGeneros(id);
    await this.cargarResenas(id);
    await this.cargarFunciones(id);
  }

  private async cargarResenas(id: number) {
    const result = await this.resenasService.getResenasDePelicula(id);
    if (result.error) {
      return; // sin reseñas el detalle se puede ver igual (como los géneros)
    }
    this.resenas.set(result.data);
  }

  // Primera barrera contra la reseña repetida: si ya hay una suya en la lista, no se muestra el formulario
  yaReseno() {
    const perfil = this.auth.perfil();
    if (!perfil) {
      return false;
    }
    return this.resenas().some(r => r.usuario_id === perfil.id);
  }

  elegirEstrellas(cantidad: number) {
    this.formResena.controls.estrellas.setValue(cantidad);
  }

  async publicarResena() {
    const perfil = this.auth.perfil();
    const pelicula = this.pelicula();
    if (!perfil || !pelicula || this.formResena.invalid) {
      return;
    }
    this.publicando.set(true);
    this.mensajeResena.set('');

    const v = this.formResena.value;
    const result = await this.resenasService.addResena({
      pelicula_id: pelicula.id!,
      usuario_id: perfil.id,
      estrellas: v.estrellas!,
      comentario: v.comentario?.trim() || null,   // '' o solo espacios → null
    });
    this.publicando.set(false);

    if (result.error) {
      // Segunda barrera: el unique (pelicula_id, usuario_id) de la base
      if (result.error.code === '23505') {
        this.mensajeResena.set('Ya dejaste una reseña de esta película');
      } else {
        this.mensajeResena.set('No se pudo publicar la reseña. Probá de nuevo.');
      }
      return;
    }

    this.publicada.set(true);
    this.formResena.reset();
    // Nuevo arreglo en el signal → el pipe promedio se recalcula solo
    await this.cargarResenas(pelicula.id!);
  }

  // Restricción de edad (primera barrera): '' = puede comprar.
  // Lee el signal auth.perfil() (lo carga el navbar al arrancar): cuando llega el perfil, se recalcula solo.
  restriccion() {
    const pelicula = this.pelicula();
    if (!pelicula) {
      return '';
    }
    return this.auth.restriccionDeEdad(pelicula.edad_minima, this.auth.perfil());
  }

  // Ej.: 4 → '★★★★☆' (llenas + vacías, siempre 5)
  dibujarEstrellas(cantidad: number) {
    return '★'.repeat(cantidad) + '☆'.repeat(5 - cantidad);
  }

  // pelicula_generos solo tiene ids: se cruzan con la lista de géneros para tener los nombres
  private async cargarGeneros(id: number) {
    const todos = await this.peliculasService.getGeneros();
    const deLaPelicula = await this.peliculasService.getGenerosDePelicula(id);
    if (todos.error || deLaPelicula.error) {
      return; // sin géneros el detalle se puede ver igual
    }
    const ids = deLaPelicula.data.map(fila => fila.genero_id);
    this.generos.set(todos.data.filter(g => ids.includes(g.id)).map(g => g.nombre));
  }

  private async cargarFunciones(id: number) {
    const salas = await this.funcionesService.getSalas();
    const funciones = await this.funcionesService.getFuncionesDePelicula(id);
    if (salas.error || funciones.error) {
      this.mensaje.set('No se pudieron cargar las funciones');
      return;
    }
    this.salas.set(salas.data);
    this.funciones.set(funciones.data);

    // Un Date por día distinto. Las funciones ya vienen ordenadas por inicio, así que los días también.
    const dias: Date[] = [];
    for (const f of funciones.data) {
      const inicio = new Date(f.inicio);
      const dia = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
      if (!dias.some(d => d.getTime() === dia.getTime())) {
        dias.push(dia);
      }
    }
    this.dias.set(dias);

    // Arranca con el primer día elegido, para no mostrar la sección vacía
    if (dias.length > 0) {
      this.diaElegido.set(dias[0]);
    }
  }

  elegirDia(dia: Date) {
    this.diaElegido.set(dia);
    this.funcionElegida.set(null);
  }

  elegirFuncion(funcion: Funcion) {
    this.funcionElegida.set(funcion);
  }

  // Funciones del día elegido (se compara año, mes y día en hora local)
  funcionesDelDia() {
    const dia = this.diaElegido();
    if (!dia) {
      return [];
    }
    return this.funciones().filter(f => {
      const inicio = new Date(f.inicio);
      return inicio.getFullYear() === dia.getFullYear()
          && inicio.getMonth() === dia.getMonth()
          && inicio.getDate() === dia.getDate();
    });
  }

  salaDe(salaId: number) {
    return this.salas().find(s => s.id === salaId)?.nombre ?? '';
  }
}
