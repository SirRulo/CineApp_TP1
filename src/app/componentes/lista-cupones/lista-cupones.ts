import { Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Cupon } from '../../models/cupon';
import { Compras } from '../../servicios/compras';
import { Log } from '../../servicios/log';

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

  // Alta de cupón: otro formulario reactivo, independiente del de edición
  formNuevo = new FormGroup({
    codigo: new FormControl('', [Validators.required, Validators.minLength(3)]),
    descripcion: new FormControl(''),
    porcentaje: new FormControl<number | null>(null, [Validators.required, Validators.min(1), Validators.max(100)]),
    edad_minima: new FormControl<number | null>(null, [Validators.min(1), Validators.max(120)]),  // vacío = sin límite
    solo_primera_compra: new FormControl(false)
  });

  constructor(private comprasService: Compras, private log: Log) {}

  async crear() {
    const v = this.formNuevo.value;
    const codigo = v.codigo!.trim().toUpperCase();  // se busca en mayúsculas, igual que el código de compra
    const result = await this.comprasService.addCupon({
      codigo,
      descripcion: v.descripcion?.trim() || null,
      porcentaje: v.porcentaje!,
      edad_minima: v.edad_minima || null,  // input vacío → null (sin límite de edad)
      solo_primera_compra: v.solo_primera_compra ?? false
    });
    if (result.error) {
      // 23505 = violación de unique: ya existe un cupón con ese código
      this.mensaje.set(result.error.code === '23505'
        ? 'Ya existe un cupón con el código ' + codigo
        : 'No se pudo crear el cupón: ' + result.error.message);
      this.exito.set(false);
      return;
    }
    await this.log.registrar('Crear cupón', `${codigo}: ${v.porcentaje} %` + (v.edad_minima ? `, desde ${v.edad_minima} años` : ''));
    this.mensaje.set('Cupón ' + codigo + ' creado');
    this.exito.set(true);
    this.formNuevo.reset({ solo_primera_compra: false });
    this.cargarCupones();
  }

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
    // Log: solo si de verdad cambió el porcentaje
    if (porcentaje !== cupon.porcentaje) {
      await this.log.registrar('Cambiar precio', `Cupón ${cupon.codigo}: ${cupon.porcentaje} % → ${porcentaje} %`);
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
