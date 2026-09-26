import { Butaca } from './butaca';
import { Funcion } from './funcion';
import { Pelicula } from './pelicula';

// Cada butaca viaja con el precio que se calculó al elegirla (normal o VIP)
export interface ButacaElegida {
    butaca: Butaca;
    precio: number;
}

// Lo que pasa de la pantalla de butacas a la de compra
export interface ContenidoCarrito {
    funcion: Funcion;
    pelicula: Pelicula | null;
    butacas: ButacaElegida[];
    total: number;
}
