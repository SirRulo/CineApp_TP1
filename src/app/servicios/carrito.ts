import { Service } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ContenidoCarrito } from '../models/contenido-carrito';

// Estado compartido entre dos pantallas que no son padre e hijo (SeleccionButacas → Compra).
// Como Data de inputOutput: un BehaviorSubject que guarda el último valor.
// null = carrito vacío.
@Service()
export class Carrito {
    contenido = new BehaviorSubject<ContenidoCarrito | null>(null);

    // next() reemplaza el valor y avisa a todos los que están suscriptos
    cargar(contenido: ContenidoCarrito) {
        this.contenido.next(contenido);
    }

    // Después de pagar (o si se abandona la compra)
    vaciar() {
        this.contenido.next(null);
    }
}
