import { Butaca } from './butaca';
import { Funcion } from './funcion';
import { Pelicula } from './pelicula';
import { Producto } from './producto';

// Cada butaca viaja con el precio que se calculó al elegirla (normal o VIP)
export interface ButacaElegida {
    butaca: Butaca;
    precio: number;
}

// Un producto del candy y cuántos se llevan
export interface ProductoElegido {
    producto: Producto;
    cantidad: number;
}

// Lo que pasa de butacas → candy → compra
export interface ContenidoCarrito {
    funcion: Funcion;
    pelicula: Pelicula | null;
    butacas: ButacaElegida[];
    total: number;                  // total de las entradas (el candy se suma aparte)
    productos: ProductoElegido[];   // vacío = sin candy
}
