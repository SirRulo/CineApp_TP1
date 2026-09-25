import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Funcion } from '../../models/funcion';
import { Pelicula } from '../../models/pelicula';
import { Sala } from '../../models/sala';
import { Funciones } from '../../servicios/funciones';
import { Peliculas } from '../../servicios/peliculas';

@Component({
  imports: [DatePipe, RouterLink],
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

  // Días distintos que tienen funciones (a las 00:00), para los botones de día
  dias = signal<Date[]>([]);
  diaElegido = signal<Date | null>(null);
  funcionElegida = signal<Funcion | null>(null);

  mensaje = signal('');

  private suscripcionRuta?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private peliculasService: Peliculas,
    private funcionesService: Funciones,
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

    const result = await this.peliculasService.getPelicula(id);
    if (result.error || result.data.length === 0 || !result.data[0].activa) {
      this.mensaje.set('Esta película no está disponible');
      return;
    }
    this.pelicula.set(result.data[0]);

    await this.cargarGeneros(id);
    await this.cargarFunciones(id);
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
