import { Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Categoria } from '../../models/categoria';
import { Producto } from '../../models/producto';
import { Candy } from '../../servicios/candy';
import { Log } from '../../servicios/log';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-alta-producto',
  styleUrl: './alta-producto.css',
  templateUrl: './alta-producto.html',
})
export class AltaProducto implements OnInit {
  categorias = signal<Categoria[]>([]);
  mensaje = signal('');
  exito = signal(false);

  // null = alta (productos/nuevo); con número = edición (productos/editar/:id), igual que AltaPelicula
  productoId = signal<number | null>(null);
  // Precio antes de editar: para dejar en el log solo los cambios de precio reales
  precioOriginal = signal<number | null>(null);

  formProducto = new FormGroup({
    nombre: new FormControl('', {
      validators: [Validators.required],
    }),
    // Guarda el id de la categoría (con [ngValue] en el select)
    categoria_id: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    // check (precio >= 0) de la base
    precio: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0)],
    }),
    // Opcionales: vacío = null en la base
    descripcion: new FormControl(''),
    imagen_url: new FormControl(''),
  });

  constructor(private candy: Candy, private log: Log, private route: ActivatedRoute, private router: Router) {}

  async ngOnInit() {
    const result = await this.candy.getCategorias();
    if (result.error) {
      this.mensaje.set('No se pudieron cargar las categorías: ' + result.error.message);
      return;
    }
    this.categorias.set(result.data);

    // snapshot, como en AltaPelicula: para editar otro se vuelve por el listado
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.productoId.set(Number(id));
      await this.cargarProducto(Number(id));
    }
  }

  private async cargarProducto(id: number) {
    const result = await this.candy.getProducto(id);
    if (result.error || result.data.length === 0) {
      this.mensaje.set('No se encontró el producto');
      return;
    }
    const producto: Producto = result.data[0];
    this.precioOriginal.set(producto.precio);
    this.formProducto.patchValue({
      nombre: producto.nombre,
      categoria_id: producto.categoria_id,
      precio: producto.precio,
      descripcion: producto.descripcion ?? '',
      imagen_url: producto.imagen_url ?? '',
    });
  }

  async guardar() {
    this.exito.set(false);
    const v = this.formProducto.value;

    // Sin 'activo': en el alta lo pone la base (true) y en la edición no se toca.
    // trim() || null: un texto vacío o con espacios se guarda como null
    const datos: Producto = {
      nombre: v.nombre!.trim(),
      categoria_id: v.categoria_id!,
      precio: v.precio!,
      descripcion: v.descripcion?.trim() || null,
      imagen_url: v.imagen_url?.trim() || null,
    };

    const id = this.productoId();
    if (id) {
      const result = await this.candy.updateProducto({ ...datos, id: id });
      if (result.error) {
        this.mensaje.set('No se pudo actualizar el producto: ' + result.error.message);
        return;
      }
      if (datos.precio !== this.precioOriginal()) {
        await this.log.registrar('Cambiar precio',
          `Producto "${datos.nombre}": $${this.precioOriginal()} → $${datos.precio}`);
      }
      this.router.navigate(['/admin/productos']);
      return;
    }

    const result = await this.candy.addProducto(datos);
    if (result.error) {
      this.mensaje.set('No se pudo guardar el producto: ' + result.error.message);
      return;
    }
    this.exito.set(true);
    this.mensaje.set(`"${datos.nombre}" se guardó correctamente`);
    this.formProducto.reset();
  }
}
