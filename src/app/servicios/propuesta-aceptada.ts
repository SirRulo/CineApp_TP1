import { Service } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Propuesta } from '../models/propuesta';

// Lleva la propuesta que aceptó el admin desde ListaPropuestas hasta AltaPelicula
// (dos pantallas que no son padre e hijo). Como Carrito y Data de inputOutput:
// un BehaviorSubject que guarda el último valor. null = no hay ninguna.
@Service()
export class PropuestaAceptada {
    propuesta = new BehaviorSubject<Propuesta | null>(null);

    guardar(propuesta: Propuesta) {
        this.propuesta.next(propuesta);
    }

    // AltaPelicula la vacía apenas la usa: si después entra a "Nueva película"
    // desde el menú, el formulario arranca vacío
    vaciar() {
        this.propuesta.next(null);
    }
}
