import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Funcion } from '../models/funcion';

// Minutos de limpieza obligatorios entre una función y la siguiente en la misma sala
const LIMPIEZA_MS = 30 * 60000;

// Regla de los 30 minutos: dos funciones de la misma sala chocan si
// nueva.inicio < existente.fin + 30 min  Y  existente.inicio < nueva.fin + 30 min.
// Va aparte del validador para reusarla en la asignación automática de sala (S4).
export function haySolapamiento(inicioA: Date, finA: Date, inicioB: Date, finB: Date): boolean {
  return inicioA.getTime() < finB.getTime() + LIMPIEZA_MS
      && inicioB.getTime() < finA.getTime() + LIMPIEZA_MS;
}

// Validador propio del FormGroup (como clavesCoincidenValidator, pero mira varios controles).
// Recibe una función que devuelve las funciones de la sala (el signal del componente):
// así lee la lista actual cada vez que valida, no la que había al crear el formulario.
export function sinSolapamientoValidator(funcionesDeSala: () => Funcion[]): ValidatorFn {
  return (grupo: AbstractControl): ValidationErrors | null => {
    const pelicula = grupo.get('pelicula')?.value;
    const dia = grupo.get('dia')?.value;
    const hora = grupo.get('hora')?.value;
    const minutos = grupo.get('minutos')?.value;

    // Si falta algún dato no se puede calcular: de eso ya se encarga el required de cada control
    if (!pelicula || !dia || hora === null || minutos === null) {
      return null;
    }

    const inicio = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), hora, minutos);
    const fin = new Date(inicio.getTime() + pelicula.duracion_min * 60000);

    // find: la primera función existente que choca con la nueva (o undefined si ninguna)
    const choca = funcionesDeSala().find(f => haySolapamiento(inicio, fin, new Date(f.inicio), new Date(f.fin)));
    if (choca) {
      // Se devuelve la función que choca para poder mostrar su horario en el mensaje
      return { salaOcupada: choca };
    } else {
      return null;
    }
  };
}
