import { Pipe, PipeTransform } from '@angular/core';
import { Pelicula } from '../models/pelicula';

@Pipe({
  name: 'filtro',
})
export class FiltroPipe implements PipeTransform {
  // Como el FiltroPipe del profe (texto en el nombre), con un segundo criterio: los géneros.
  // generosPorPelicula = { peliculaId: [ids de sus géneros] }
  transform(
    peliculas: Pelicula[],
    busqueda: string,
    generosElegidos: number[],
    generosPorPelicula: { [peliculaId: number]: number[] },
  ): Pelicula[] {

    if (!busqueda && generosElegidos.length === 0) {
      return peliculas;
    }
    return peliculas.filter(p => {
      const coincideTexto = p.titulo.toLowerCase().includes(busqueda.toLowerCase());

      // Sin géneros elegidos no se filtra por género. Si hay, alcanza con que tenga uno de ellos.
      const suyos = generosPorPelicula[p.id!] ?? [];
      const coincideGenero = generosElegidos.length === 0
        || suyos.some(g => generosElegidos.includes(g));

      return coincideTexto && coincideGenero;
    });
  }
}
