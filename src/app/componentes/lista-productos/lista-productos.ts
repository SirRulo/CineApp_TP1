import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Categoria } from '../../models/categoria';
import { Producto } from '../../models/producto';
import { Candy } from '../../servicios/candy';

@Component({
  imports: [CurrencyPipe, RouterLink],
  selector: 'app-lista-productos',
  styleUrl: './lista-productos.css',
  templateUrl: './lista-productos.html',
})
export class ListaProductos implements OnInit {
  productos = signal<Producto[]>([]);
  categorias = signal<Categoria[]>([]);
  mensaje = signal('');

  constructor(private candy: Candy) {}

  async ngOnInit() {
    const categorias = await this.candy.getCategorias();
    if (categorias.error) {
      this.mensaje.set('No se pudieron cargar las categorías: ' + categorias.error.message);
      return;
    }
    this.categorias.set(categorias.data);
    this.cargarProductos();
  }

  private async cargarProductos() {
    const result = await this.candy.getProductos();
    if (result.error) {
      this.mensaje.set('No se pudieron cargar los productos: ' + result.error.message);
      return;
    }
    this.productos.set(result.data);
  }

  // Como salaDe() en ListaFunciones: el nombre se busca en la lista ya cargada
  categoriaDe(categoriaId: number) {
    return this.categorias().find(c => c.id === categoriaId)?.nombre ?? '(sin categoría)';
  }

  // Baja lógica: un producto inactivo no aparece en la compra
  async alternarActivo(producto: Producto) {
    const result = await this.candy.updateProducto({ ...producto, activo: !producto.activo });
    if (result.error) {
      this.mensaje.set('No se pudo actualizar "' + producto.nombre + '": ' + result.error.message);
      return;
    }
    this.mensaje.set('');
    this.cargarProductos();
  }
}
