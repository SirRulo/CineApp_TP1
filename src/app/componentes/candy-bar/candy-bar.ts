import { CurrencyPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Categoria } from '../../models/categoria';
import { ContenidoCarrito, ProductoElegido } from '../../models/contenido-carrito';
import { Producto } from '../../models/producto';
import { Candy } from '../../servicios/candy';
import { Carrito } from '../../servicios/carrito';

// Paso intermedio de la compra: butacas → candy → pago
@Component({
  imports: [CurrencyPipe, RouterLink],
  selector: 'app-candy-bar',
  styleUrl: './candy-bar.css',
  templateUrl: './candy-bar.html',
})
export class CandyBar implements OnInit, OnDestroy {
  contenido = signal<ContenidoCarrito | null>(null);
  categorias = signal<Categoria[]>([]);
  productos = signal<Producto[]>([]);
  // Lo que va eligiendo: se pasa al carrito recién al continuar
  elegidos = signal<ProductoElegido[]>([]);
  mensaje = signal('');

  maximoPorProducto = 10;

  private suscripcionCarrito?: Subscription;

  constructor(private candy: Candy, private carrito: Carrito, private router: Router) {}

  async ngOnInit() {
    // Igual que en Compra: suscripción al BehaviorSubject → signal
    this.suscripcionCarrito = this.carrito.contenido.subscribe(contenido => {
      this.contenido.set(contenido);
    });

    const contenido = this.contenido();
    if (!contenido) {
      return; // carrito vacío (F5): el HTML lo avisa
    }
    // Si vuelve desde el pago, recupera lo que ya había elegido
    this.elegidos.set(contenido.productos);

    const categorias = await this.candy.getCategorias();
    const productos = await this.candy.getProductosActivos();
    if (categorias.error || productos.error) {
      this.mensaje.set('No se pudo cargar el candy bar. Podés seguir sin candy.');
      return;
    }
    this.categorias.set(categorias.data);
    this.productos.set(productos.data);
  }

  ngOnDestroy() {
    this.suscripcionCarrito?.unsubscribe();
  }

  // Para agrupar por categoría en el HTML
  productosDe(categoriaId: number) {
    return this.productos().filter(p => p.categoria_id === categoriaId);
  }

  // Categorías que tienen al menos un producto activo (las vacías no se muestran)
  categoriasConProductos() {
    return this.categorias().filter(c => this.productosDe(c.id).length > 0);
  }

  cantidadDe(producto: Producto) {
    return this.elegidos().find(e => e.producto.id === producto.id)?.cantidad ?? 0;
  }

  // +1: si no estaba, se agrega con cantidad 1; si estaba, se reemplaza por uno con cantidad + 1.
  // Siempre arreglos nuevos para que el signal avise (como alternar en las butacas).
  sumar(producto: Producto) {
    const cantidad = this.cantidadDe(producto);
    if (cantidad >= this.maximoPorProducto) {
      return;
    }
    const otros = this.elegidos().filter(e => e.producto.id !== producto.id);
    this.elegidos.set([...otros, { producto: producto, cantidad: cantidad + 1 }]);
  }

  // −1: si llega a 0, se saca de la lista
  restar(producto: Producto) {
    const cantidad = this.cantidadDe(producto);
    const otros = this.elegidos().filter(e => e.producto.id !== producto.id);
    if (cantidad <= 1) {
      this.elegidos.set(otros);
    } else {
      this.elegidos.set([...otros, { producto: producto, cantidad: cantidad - 1 }]);
    }
  }

  totalCandy() {
    let total = 0;
    for (const e of this.elegidos()) {
      total += e.producto.precio * e.cantidad;
    }
    return total;
  }

  continuar() {
    this.carrito.cambiarProductos(this.elegidos());
    this.router.navigate(['/compra']);
  }

  seguirSinCandy() {
    this.carrito.cambiarProductos([]);
    this.router.navigate(['/compra']);
  }
}
