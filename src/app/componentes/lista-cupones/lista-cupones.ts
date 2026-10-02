import { Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Cupon } from '../../models/cupon';
import { Compras } from '../../servicios/compras';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-lista-cupones',
  styleUrl: './lista-cupones.css',
  templateUrl: './lista-cupones.html',
})
export class ListaCupones implements OnInit {
  cupones = signal<Cupon[]>([]);
  mensaje = signal('');
  exito = signal(false);
  // id del cupón que se está editando (null = ninguno): solo uno a la vez
  editando = signal<number | null>(null);

  // Un solo control: el porcentaje. Mismos límites que el check de la base (1 a 100)
  formCupon = new FormGroup({
    porcentaje: new FormControl<number | null>(null, [Validators.required, Validators.min(1), Validators.max(100)])
  });

  constructor(private comprasService: Compras) {}

  ngOnInit() {
    this.cargarCupones();
  }

  private async cargarCupones() {
    const result = await this.comprasService.getCupones();
    if (result.error) {
      this.mensaje.set('No se pudieron cargar los cupones: ' + result.error.message);
      this.exito.set(false);
      return;
    }
    this.cupones.set(result.data);
  }

  // Abre el formulario de ese cupón con su porcentaje actual
  editar(cupon: Cupon) {
    this.editando.set(cupon.id);
    this.formCupon.reset({ porcentaje: cupon.porcentaje });
    this.mensaje.set('');
  }

  cancelar() {
    this.editando.set(null);
  }

  async guardar(cupon: Cupon) {
    const porcentaje = this.formCupon.value.porcentaje!;
    const result = await this.comprasService.updateCupon({ ...cupon, porcentaje });
    if (result.error) {
      this.mensaje.set('No se pudo guardar "' + cupon.codigo + '": ' + result.error.message);
      this.exito.set(false);
      return;
    }
    this.mensaje.set('Cupón ' + cupon.codigo + ' actualizado: ' + porcentaje + ' %');
    this.exito.set(true);
    this.editando.set(null);
    this.cargarCupones();
  }

  // Baja lógica, igual que películas: un cupón inactivo no se aplica en la compra
  async alternarActivo(cupon: Cupon) {
    const result = await this.comprasService.updateCupon({ ...cupon, activo: !cupon.activo });
    if (result.error) {
      this.mensaje.set('No se pudo actualizar "' + cupon.codigo + '": ' + result.error.message);
      this.exito.set(false);
      return;
    }
    this.mensaje.set('');
    this.cargarCupones();
  }
}
