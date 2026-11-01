import { Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Rol, RolSeccion } from '../../models/rol';
import { SECCIONES_ADMIN } from '../../models/secciones-admin';
import { Auth } from '../../servicios/auth';
import { Log } from '../../servicios/log';
import { Roles } from '../../servicios/roles';

// Lo que viene de perfiles (solo las columnas pedidas), como Autor en LogActividad
interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  rol_id: number | null;
}

// Admin: roles configurables (mail RPP). Crear un rol con sus secciones y dárselo a un usuario.
@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-lista-roles',
  styleUrl: './lista-roles.css',
  templateUrl: './lista-roles.html',
})
export class ListaRoles implements OnInit {
  readonly secciones = SECCIONES_ADMIN;

  roles = signal<Rol[]>([]);
  rolSecciones = signal<RolSeccion[]>([]);   // todas las filas de rol_secciones
  usuarios = signal<Usuario[]>([]);
  mensaje = signal('');
  exito = signal(false);

  // Secciones tildadas para el rol nuevo: fuera del FormGroup, como los géneros de AltaPelicula
  seccionesNuevas = signal<string[]>([]);
  // Edición de las secciones de un rol existente: uno a la vez, como el % de los cupones
  editando = signal<number | null>(null);
  seccionesEditadas = signal<string[]>([]);

  formRol = new FormGroup({
    nombre: new FormControl('', {
      validators: [Validators.required, Validators.maxLength(40)],
    }),
  });

  // rol_id null = "Sin rol" (se lo saca)
  formAsignar = new FormGroup({
    usuario_id: new FormControl<string | null>(null, {
      validators: [Validators.required],
    }),
    rol_id: new FormControl<number | null>(null),
  });

  constructor(private rolesService: Roles, private auth: Auth, private log: Log) {}

  async ngOnInit() {
    await this.cargar();
  }

  private async cargar() {
    const roles = await this.rolesService.getRoles();
    const secciones = await this.rolesService.getTodasLasSecciones();
    const perfiles = await this.auth.getPerfiles();
    if (roles.error || secciones.error || perfiles.error) {
      this.mostrar('No se pudieron cargar los roles', false);
      return;
    }
    this.roles.set(roles.data);
    this.rolSecciones.set(secciones.data);
    this.usuarios.set(perfiles.data);
  }

  // ---------- Listado ----------

  // Nombres de las secciones de un rol, en el orden de SECCIONES_ADMIN
  seccionesDe(rolId: number) {
    const paths = this.rolSecciones().filter(rs => rs.rol_id === rolId).map(rs => rs.seccion);
    return this.secciones.filter(s => paths.includes(s.path)).map(s => s.nombre);
  }

  rolesActivos() {
    return this.roles().filter(r => r.activo);
  }

  nombreDeRol(rolId: number | null) {
    return this.roles().find(r => r.id === rolId)?.nombre ?? '';
  }

  // A quién se le puede dar un rol: a todos menos al admin (ya entra a todo)
  usuariosAsignables() {
    return this.usuarios().filter(u => u.rol !== 'admin');
  }

  usuariosConRol() {
    return this.usuarios().filter(u => u.rol_id !== null);
  }

  async alternarActivo(rol: Rol) {
    const result = await this.rolesService.updateRol({ ...rol, activo: !rol.activo });
    if (result.error) {
      this.mostrar('No se pudo actualizar el rol: ' + result.error.message, false);
      return;
    }
    this.mensaje.set('');
    await this.cargar();
  }

  // ---------- Alta ----------

  // Arreglo nuevo para que el signal avise (como alternarGenero)
  alternarNueva(path: string) {
    const actuales = this.seccionesNuevas();
    this.seccionesNuevas.set(actuales.includes(path) ? actuales.filter(p => p !== path) : [...actuales, path]);
  }

  async crear() {
    const nombre = this.formRol.value.nombre!.trim();
    const result = await this.rolesService.addRol(nombre);
    if (result.error) {
      this.mostrar(result.error.code === '23505'
        ? `Ya existe un rol llamado "${nombre}"`
        : 'No se pudo crear el rol: ' + result.error.message, false);
      return;
    }
    const rolId = result.data[0].id;
    const secciones = await this.rolesService.addSeccionesDeRol(rolId, this.seccionesNuevas());
    if (secciones.error) {
      // Mismo caso que película sin géneros: se corrige editando las secciones
      this.mostrar('El rol se creó pero no se guardaron sus secciones: editalo y volvé a guardar', false);
    } else {
      this.mostrar(`Rol "${nombre}" creado`, true);
    }
    await this.log.registrar('Crear rol', `"${nombre}": ${this.seccionesNuevas().join(', ')}`);
    this.formRol.reset();
    this.seccionesNuevas.set([]);
    await this.cargar();
  }

  // ---------- Editar secciones ----------

  editar(rol: Rol) {
    this.editando.set(rol.id!);
    this.seccionesEditadas.set(this.rolSecciones().filter(rs => rs.rol_id === rol.id).map(rs => rs.seccion));
    this.mensaje.set('');
  }

  cancelarEdicion() {
    this.editando.set(null);
  }

  alternarEditada(path: string) {
    const actuales = this.seccionesEditadas();
    this.seccionesEditadas.set(actuales.includes(path) ? actuales.filter(p => p !== path) : [...actuales, path]);
  }

  // Borrar las viejas e insertar las nuevas, como los géneros al editar una película
  async guardarSecciones(rol: Rol) {
    const borrado = await this.rolesService.deleteSeccionesDeRol(rol.id!);
    if (borrado.error) {
      this.mostrar('No se pudieron cambiar las secciones: ' + borrado.error.message, false);
      return;
    }
    const alta = await this.rolesService.addSeccionesDeRol(rol.id!, this.seccionesEditadas());
    if (alta.error) {
      this.mostrar('Se borraron las secciones viejas pero no se guardaron las nuevas: volvé a guardar', false);
      return;
    }
    await this.log.registrar('Editar rol', `"${rol.nombre}": ${this.seccionesEditadas().join(', ')}`);
    this.mostrar(`Secciones de "${rol.nombre}" actualizadas`, true);
    this.editando.set(null);
    await this.cargar();
  }

  // ---------- Asignar ----------

  async asignar() {
    const v = this.formAsignar.value;
    const usuario = this.usuarios().find(u => u.id === v.usuario_id);
    if (!usuario) {
      return;
    }
    const rolId = v.rol_id ?? null;
    const result = await this.rolesService.asignarRol(usuario.id, rolId);
    if (result.error) {
      this.mostrar('No se pudo asignar el rol: ' + result.error.message, false);
      return;
    }
    const quien = `${usuario.nombre} ${usuario.apellido}`;
    const que = rolId ? `"${this.nombreDeRol(rolId)}"` : 'sin rol';
    await this.log.registrar('Asignar rol', `${quien} (${usuario.email}) → ${que}`);
    this.mostrar(`${quien} quedó ${rolId ? 'con el rol ' + que : 'sin rol configurable'}`, true);
    this.formAsignar.reset();
    await this.cargar();
  }

  private mostrar(texto: string, ok: boolean) {
    this.mensaje.set(texto);
    this.exito.set(ok);
  }
}
