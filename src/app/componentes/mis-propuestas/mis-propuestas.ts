import { DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Propuesta } from '../../models/propuesta';
import { Auth } from '../../servicios/auth';
import { Propuestas } from '../../servicios/propuestas';

// El cliente propone películas que no están en cartelera (mail RPP): una pendiente a la vez
@Component({
  imports: [ReactiveFormsModule, DatePipe],
  selector: 'app-mis-propuestas',
  styleUrl: './mis-propuestas.css',
  templateUrl: './mis-propuestas.html',
})
export class MisPropuestas implements OnInit {
  readonly largoTitulo = 100;
  readonly largoTexto = 500;

  propuestas = signal<Propuesta[]>([]);
  cargando = signal(true);
  enviando = signal(false);
  mensaje = signal('');
  exito = signal(false);

  private usuarioId = '';

  formPropuesta = new FormGroup({
    titulo: new FormControl('', {
      validators: [Validators.required, Validators.maxLength(this.largoTitulo)],
    }),
    descripcion: new FormControl('', {
      validators: [Validators.required, Validators.maxLength(this.largoTexto)],
    }),
    // Por qué la quiere en el cine
    motivo: new FormControl('', {
      validators: [Validators.required, Validators.maxLength(this.largoTexto)],
    }),
  });

  constructor(private auth: Auth, private propuestasService: Propuestas) {}

  async ngOnInit() {
    // authGuard ya aseguró que hay sesión
    const perfil = await this.auth.obtenerPerfil();
    if (!perfil) {
      return;
    }
    this.usuarioId = perfil.id;
    await this.cargarPropuestas();
  }

  private async cargarPropuestas() {
    const result = await this.propuestasService.getPropuestasDeUsuario(this.usuarioId);
    this.cargando.set(false);
    if (result.error) {
      this.mensaje.set('No se pudieron cargar tus propuestas: ' + result.error.message);
      return;
    }
    this.propuestas.set(result.data);
  }

  // Primera barrera de "una a la vez": con una pendiente no se muestra el formulario
  tienePendiente() {
    return this.propuestas().some(p => p.estado === 'pendiente');
  }

  async enviar() {
    this.exito.set(false);
    this.enviando.set(true);
    const v = this.formPropuesta.value;

    const result = await this.propuestasService.addPropuesta({
      usuario_id: this.usuarioId,
      titulo: v.titulo!.trim(),
      descripcion: v.descripcion!.trim(),
      motivo: v.motivo!.trim(),
    });
    this.enviando.set(false);

    if (result.error) {
      // Segunda barrera: el índice una_propuesta_pendiente de la base
      if (result.error.code === '23505') {
        this.mensaje.set('Ya tenés una propuesta en revisión');
      } else {
        this.mensaje.set('No se pudo enviar la propuesta: ' + result.error.message);
      }
      await this.cargarPropuestas();
      return;
    }

    this.exito.set(true);
    this.mensaje.set('¡Gracias! Tu propuesta quedó en revisión');
    this.formPropuesta.reset();
    await this.cargarPropuestas();
  }
}
