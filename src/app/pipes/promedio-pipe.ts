import { Pipe, PipeTransform } from '@angular/core';
import { Resena } from '../models/resena';

@Pipe({
  name: 'promedio',
})
export class PromedioPipe implements PipeTransform {
  transform(resenas: Resena[]): number {

    // Sin reseñas no hay promedio (y se evita dividir por 0)
    if (resenas.length === 0) {
      return 0;
    }
    let suma = 0;
    for (const r of resenas) {
      suma += r.estrellas;
    }
    return suma / resenas.length;
  }
}
