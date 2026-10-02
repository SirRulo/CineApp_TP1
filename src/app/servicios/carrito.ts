import { Service } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ContenidoCarrito } from '../models/contenido-carrito';

import { ProductoElegido } from '../models/contenido-carrito';

// Estado compartido entre pantallas que no son padre e hijo (SeleccionButacas → CandyBar → Compra).
// Como Data de inputOutput: un BehaviorSubject que guarda el último valor.
// null = carrito vacío.
@Service()
export class Carrito {
    contenido = new BehaviorSubject<ContenidoCarrito | null>(null);

    // next() reemplaza el valor y avisa a todos los que están suscriptos
    cargar(contenido: ContenidoCarrito) {
        this.contenido.next(contenido);
    }

    // Desde la pantalla del candy: mismo contenido, con los productos nuevos.
    // .value = el último valor guardado (como datosServicio.value en Data de inputOutput)
    cambiarProductos(productos: ProductoElegido[]) {
        const actual = this.contenido.value;
        if (actual) {
            this.contenido.next({ ...actual, productos: productos });
        }
    }

    // Después de pagar (o si se abandona la compra)
    vaciar() {
        this.contenido.next(null);
    }
}
