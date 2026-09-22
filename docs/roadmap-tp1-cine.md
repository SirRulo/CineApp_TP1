# TP1 Programación IV — Sistema de Cine
### Roadmap por sprints (un sprint por mail del cliente)

Actualizado el 21/09/2026 · Pre-entregas: **lunes y miércoles** · Entrega final: **lunes 05/10/2026**
Fuentes: enunciado · repo de la cátedra (`amorelli-utnfra/A342-2`) · transcripciones de las clases 1 a 7

> **Regla de este documento:** solo se usa lo que aparece en el material de la cátedra (los 10 proyectos del repo, las clases grabadas y el enunciado). Lo que **no** encontré en ese material va marcado con **⚠️ W#** y está reunido en la sección 8, para que lo confirmes con el profe antes de usarlo.

---

## 1. Qué exige la consigna

**Entregables**
1. Documento que resuma todos los requerimientos.
2. Aplicación que use **todos los temas vistos en clase**.
3. Defensa oral de tus decisiones (de ella depende la aprobación/promoción).
4. App **desplegada** con URL funcional, código en GitHub y README con arquitectura y decisiones técnicas.

**Qué se evalúa:** uso correcto de Angular y buenas prácticas · integración con **Supabase** · integración **PWA** · lógica de negocio · estilo visual único y producido.

> **Firebase se usa solo para hosting** (confirmado). Supabase es el back (auth y datos); Firebase Hosting sirve la app compilada y da la URL pública. En la clase 6 el profe explicó por qué: la base de datos de Firebase pide cargar una cuenta de facturación, el hosting no.

### 1.1 Lo que dijo el profe en clase sobre el TP

- **El TP no trae sprints oficiales**: "ustedes lo planifiquen de principio a fin" (clase 5). Los sprints de este documento son tu planificación, y poder explicarla también suma en la defensa.
- **Empezar por el lado del admin** (clase 5): primero quien *carga* los datos (películas, funciones), después quien los *consume* (el cliente). Si arrancás por el cliente con datos inventados, después tenés que cambiar los dos lados. Esto reordena el S1 (ver abajo).
- **Roles por rol, no por mail** (clase 6): el admin y los empleados se definen con un campo de rol en Supabase, no comparando el mail. **Un solo login** que te lleva a tu vista según el rol; el registro es solo para clientes.
- **Pre-entregas** (clases 5 a 7): se habilita un formulario, se pega la **URL desplegada** y se corrige en clase. Llevá algo con sustancia: a un compañero que solo tenía el login conectado a Supabase el profe le dijo que así no tenía sentido presentarlo todavía.
- **GitHub**: agregá como colaboradores a **los dos profesores** (clase 5).
- Temas que el profe marcó como **"pregunta de parcial"**: ver sección 9.

---

## 2. Los mails y su sprint

Son 10 mails. Los dos del 16/01 van juntos: el segundo es una línea que aclara el buscador del primero.

| Sprint | Mail | Tema central |
|---|---|---|
| **S0** | — | Base del proyecto (no es un mail, pero todo depende de esto) |
| **S1** | 01/01 | Núcleo: salas, películas, funciones, registro, compra, cupón 20%, QR/PDF |
| **S2** | 16/01 (×2) | Reseñas, promedio, top 3 más vendidas, buscador por género |
| **S3** | 30/01 | Cupón configurable, cupón +50 años, candy bar (mapa: sin luz verde) |
| **S4** | 06/02 | Admin y empleados, validación de QR, asignación automática de salas |
| **S5** | 12/02 | Restricción de edad, butacas accesibles, tiempo real |
| **S6** | 28/02 | UX (fechas, horas, scroll) y reporte de facturación |
| **S7** | 03/03 | Puntos de fidelización y combos |
| **S8** | 08/03 | Próximamente, alertas, preventa, "Mis películas" |
| **S9** | 10/03 | Cancelación con crédito, VIP, reportes PDF/Excel, gráficos, log |
| **S10** | — | Cierre: documento, README, deploy final, ensayo de defensa |

---

## 3. Decisiones previas (se toman en S0, mirando los 10 mails juntos)

Los mails van agregando cosas sobre lo ya hecho (tipos de butaca, restricción de edad, preventa…). Si el modelo de datos se piensa recién en S1, en S5 y S9 hay que rehacer. Por eso se diseña **una vez, con todo a la vista**.

### 3.1 Roles
Anónimo · Cliente (registrado) · Empleado (valida QR) · Admin (controla todo). Sale de los mails 30/01, 06/02 y 08/03.

### 3.2 Modelo de datos (propuesta mía, ajustala)
El material no trae ejemplo de diseño de tablas (solo `Cosas` con `id` y `nombre`), así que esto es un borrador.

| Tabla | Guarda | Mails |
|---|---|---|
| `perfiles` | id (= usuario de Supabase Auth), nombre, apellido, fecha_nacimiento, tipo_sangre, color_ojos, dias_vacaciones, **rol**, puntos, credito | 01/01, 06/02, 03/03, 10/03 |
| `peliculas` | nombre, sinopsis, duracion_min, imagen (⚠️ W8), restriccion_edad (0/13/18), fecha_estreno, preventa (días antes, precio), activa | 01/01, 12/02, 08/03 |
| `generos`, `pelicula_generos` | géneros y relación N:M (varios géneros por película) | 16/01 |
| `salas`, `butacas` | sala; butaca con fila (A–T), bloque (1–3), número y **tipo** (normal / accesible / vip) | 01/01, 12/02, 10/03 |
| `funciones` | película, sala, inicio, fin, formato (2D/3D/4D/5D), idioma, precio | 01/01, 06/02 |
| `compras` | usuario (nulo si es anónimo), total, descuento, crédito usado, puntos ganados, estado, código QR, marcas de uso | 01/01, 30/01, 06/02, 10/03 |
| `entradas` | compra, función, butaca, precio, estado | 01/01 |
| `categorias`, `productos`, `compra_productos` | candy bar | 30/01 |
| `combos` (+ ítems) | combo a precio fijo | 03/03 |
| `cupones` | porcentaje, edad_minima, solo_primera_compra, activo | 01/01, 30/01 |
| `resenas` | película, usuario, estrellas, comentario | 16/01 |
| `recompensas`, `canjes` | costo en puntos; historial | 03/03 |
| `alertas_estreno` | usuario + película | 08/03 |
| `log_actividad` | quién, qué, cuándo | 10/03 |

### 3.3 Cosas que el enunciado deja ambiguas → decidilas y dejalas escritas en el README

El canal con el "cliente" está abierto (lo dice el mail 1): si dudás, consultale al profe.

| Tema | Qué dice el mail | Propuesta |
|---|---|---|
| Butacas accesibles (12/02) | Resuelto con el Excel de la cátedra (sección 3.4) | Una sola fila accesible **J** (J2–J3, J11–J20, J28–J29); la **K** desaparece y queda como pasillo |
| Anónimos y edad | Se puede comprar sin registrarse (01/01) pero hay que bloquear a menores (12/02) | Para películas con restricción, exigir login o pedir fecha de nacimiento antes de comprar |
| Pago | "Siempre que paguen" — no define medio de pago | Pago simulado (⚠️ W10) |
| QR de entrada + candy | Mismo QR para ambas cosas, y "deja de funcionar" al usarse | Un código por compra con **dos marcas de uso** (entrada validada / candy entregado) |
| Cupones | Hay cupón de primera compra y cupón +50 | Uno por compra, se aplica el de mayor descuento |
| Reseñas | "Cada persona puede calificar" | Solo registrados, una por película |
| Puntos y cancelación | 1 punto por peso; se puede cancelar (10/03) | Puntos sobre lo efectivamente pagado; se revierten al cancelar |
| Preventa | Venta desde 7 días antes del estreno, después vuelve el precio normal | Precio de preventa desde `estreno − 7 días` hasta la fecha de estreno; configurable por película |
| "Vio la película" (Mis películas) | No define | Entrada validada por un empleado |
| Sin sala libre | No define | Rechazar con mensaje claro |
| Mapa del cine (30/01) | "No tenemos luz verde aún" | **No se implementa.** Queda en el README como fuera de alcance |

### 3.4 Distribución de butacas (Excel de la cátedra)

Así queda la sala después de los mails 12/02 y 10/03. Es la misma en todas las salas.

| Filas | Butacas | Tipo |
|---|---|---|
| A – I (9 filas) | 1–4 · 6–25 · 27–30 (4 + 20 + 4 = 28 por fila) | Normal |
| **J** | 2–3 · 11–20 · 28–29 (2 + 10 + 2 = 14) | **Accesible** (verde en el Excel) |
| K | — | No existe: queda como pasillo |
| L – Q (6 filas) | 1–4 · 6–25 · 27–30 | Normal |
| **R, S, T** | 1–4 · 6–25 · 27–30 | **VIP** (celeste en el Excel) |

**Total: 18 filas × 28 + 14 = 518 butacas por sala** (420 normales, 84 VIP, 14 accesibles).

Claves para entender el Excel:
- **La numeración es corrida por posición**: los números **5 y 26 no existen** porque son los pasillos entre bloques. Por eso el bloque del medio arranca en 6 y el de la derecha en 27.
- La fila J mantiene esa numeración: J2 y J3 están en el lugar de las butacas 2 y 3 de las otras filas, J11–J20 en el centro del bloque del medio, J28–J29 a la derecha. Eso hace que el mapa quede alineado sin cálculos extra.
- Ojo, el Excel tiene un error de tipeo: en la fila C, la butaca de la columna G dice **C1** y debería ser **C7**. No lo copies.

**Cómo se modela:** en `butacas` guardás `fila` (letra), `numero` (el del Excel) y `tipo` (normal / accesible / vip). No hace falta guardar el bloque: sale del número (1–4 izquierda, 6–25 centro, 27–30 derecha). Las 518 filas de la tabla se generan una vez por sala (con un insert armado en TypeScript o un script SQL), no a mano.

---

## 4. Fichas del código de la cátedra

Cada ficha explica **una vez** cómo funciona el código del profe. Los sprints las citan como F1, F2…

### F1 · Arranque y componente standalone (`clase1`, todos los proyectos)
- `main.ts` llama a `bootstrapApplication(App, appConfig)`: arranca la app con el componente raíz y la configuración global (`app.config.ts`, donde va `provideRouter(routes)`).
- Un componente es una clase con `@Component({ imports, selector, styleUrl, templateUrl })`. **Todo lo que uses en su HTML** (otros componentes, pipes, directivas, `FormsModule`) tiene que estar en su `imports`; si no, Angular no reconoce la etiqueta.
- **Signal:** `miDato = signal('valor inicial')`. Se lee *llamándolo* (`miDato()`) y se cambia con `.set(...)`. En el HTML: `{{ miDato() }}`.
- `[(ngModel)]="miDato"` enlaza un input con la propiedad en las dos direcciones (requiere `FormsModule`).
- Control de flujo: `@for (item of lista; track item) { … }` y `@if (cond) { … } @else { … }`. `track` le dice a Angular cómo identificar cada elemento para no redibujar todo. El material también muestra la sintaxis vieja (`*ngIf`, `*ngFor`).

### F2 · Servicios e inyección (`inputOutput/servicios`, `ejemploSupabase/services`)
- Un servicio es una clase con `@Service()` que guarda lógica o datos compartidos por varios componentes; hay una sola instancia para toda la app. (`directivas` usa la forma equivalente vieja `@Injectable({ providedIn: 'root' })`.)
- Se usa de dos formas: en el constructor (`constructor(private auth: Auth) {}`) o con `inject(Auth)` (en servicios, guards y validadores).
- `inject()` solo funciona en un "contexto de inyección" (constructor, inicializador de campo, función de guard). Por eso en `clase-formularios` el `FormGroup` puede llamar a `usuarioUnicoValidator()` (que hace `inject(ApiClient)`): se crea al declarar el campo de la clase.

### F3 · Input / Output (`ejemploInputOutput`, `inputOutput`)
```ts
// hijo (card-usuario.ts)
usuario  = input<Usuario>();        // entra desde el padre
selected = output<Usuario>();       // sale hacia el padre
seleccionar() { this.selected.emit(this.usuario()!); }
```
```html
<!-- padre (app.html) -->
<app-card-usuario [usuario]="usuario" (selected)="recibirUsuario($event)"></app-card-usuario>
```
- `[prop]` baja datos (padre → hijo). `(evento)` sube avisos (hijo → padre). `$event` es lo que el hijo emitió.
- El padre guarda lo recibido en un signal (`usuarioSeleccionado`) y con `@if` muestra otro componente. Es el patrón **lista → detalle**.
- El `!` de `this.usuario()!` significa "confío en que no es undefined".
- El material también muestra la forma vieja (`@Input()`, `@Output() EventEmitter`) y `model()` para dos vías.

### F4 · Estado compartido con `BehaviorSubject` (`inputOutput/servicios/data.ts`, `hijo2.ts`)
- Cuando dos componentes **no** son padre-hijo, comparten un servicio: `datosServicio = new BehaviorSubject<number>(0)`; `incrementar()` hace `next(valor + 1)`. Quien quiera enterarse hace `subscribe(...)` (en `ngOnInit`) y guarda el valor en un signal.
- Siempre cancelar la suscripción en `ngOnDestroy` (`unsubscribe()`, como en `lista-usuarios.ts`).
- En el cine: carrito (butacas + candy + combos) y usuario logueado.

### F5 · Rutas (`rutas`, `guards`, `inputOutput`)
- `redirectTo` + `pathMatch: 'full'` para la ruta vacía. `loadComponent: () => import('...').then(m => m.X)` = **carga perezosa** (el componente se descarga recién al visitarlo). `children` + `<router-outlet>` dentro del padre. `'**'` atrapa todo lo no definido.
- Navegar: `routerLink`, `routerLinkActive="active"` o `Router.navigate(['detalle', id])`.
- Leer parámetros de `detalle/:id`: `route.snapshot.paramMap` es una foto del momento en que entrás; `route.paramMap.subscribe(...)` se entera si el parámetro cambia con el componente ya abierto (el profe lo explica en los comentarios de `detalle.ts`). `queryParamMap` sirve para `?id=`.
- Ojo: en `rutas` el path activo es `detalle` (sin `:id`) y la versión con `:id` está comentada. La que funciona con parámetro es `detalle/:id`, como en `guards`.

### F6 · Guards (`guards`)
| Tipo | Pregunta que responde | Ejemplo del profe |
|---|---|---|
| `canActivate` (`CanActivateFn`) | ¿puede entrar a esta ruta? | `authGuard`: sin usuario → `router.navigate(['/login'])` y `false` |
| `canMatch` (`CanMatchFn`) | ¿esta ruta "existe" para este usuario? Si da `false`, el router sigue probando otras rutas y termina en `**` | `roleGuard` |
| `canActivateChild` | ¿puede entrar a las rutas hijas? | `childGuard` |
| `canDeactivate` (`CanDeactivateFn<Registro>`) | ¿puede salir de esta pantalla? | `formGuard`: `confirm(...)` si el form es inválido |

- Son funciones que usan `inject()`. Se declaran en la ruta: `canActivate: [authGuard]`, `canMatch: [roleGuard]`, etc.
- Ojo: en el material `Auth` es de mentira (usuario fijo guardado en `localStorage`); el profe aclaró en la clase 5 que en el TP eso se hace con Supabase. El usuario y su **rol** salen de Supabase.

### F7 · Formularios reactivos (`clase-formularios`)
- `FormGroup` con un `FormControl` por campo; cada uno con `validators: [Validators.required, Validators.minLength(3)]`.
- HTML: `[formGroup]="form"`, `formControlName="nombre"`, `(ngSubmit)="mostrar()"`, `[disabled]="!form.valid"`.
- Mostrar errores: `@if (control.touched && control.hasError('clave')) { … }`.
- **Validador propio síncrono:** una función que devuelve un `ValidatorFn`; retorna `{ losControlesNoCoinciden: true }` si falla y `null` si está bien (`clavesCoincidenValidator`).
- **Validador asincrónico:** devuelve una `Promise` (consulta a un servicio) y va en `asyncValidators`; con `updateOn: 'blur'` corre al salir del campo, no en cada tecla. Mientras espera, el control queda `ng-pending`.
- Clases CSS automáticas `ng-touched`, `ng-invalid`, `ng-valid`, `ng-pending`: `form-usuarios.css` las usa para pintar los bordes.

### F8 · Formularios con signals (`ejemploSupabase/login` y `register`)
```ts
loginModel = signal<LoginData>({ email: '', password: '' });
loginForm  = form(this.loginModel, (schemaPath) => {
  required(schemaPath.email, { message: 'Email is required' });
  email(schemaPath.email,    { message: 'Enter a valid email address' });
});
```
```html
<form (submit)="onSubmit($event)">
  <input type="email" [formField]="loginForm.email" />
```
- El modelo es un signal; `form(...)` le suma las reglas; en el HTML cada input se conecta con `[formField]`. En `onSubmit` se hace `event.preventDefault()` y se lee `this.loginModel()`.
- Es el estilo que usa el profe junto con Supabase. Para validaciones más elaboradas está F7. Podés usar ambos: lo importante es poder explicar por qué elegiste cada uno.

### F9 · Supabase (`ejemploSupabase`)
- `createClient(environment.supabaseUrl, environment.supabasePublishableKey)` crea el cliente. URL y key viven en `environment.ts` (en el ejemplo dicen `YOUR_SUPABASE_URL`: se reemplazan por los de tu proyecto).
- **Auth:** `signInWithPassword({ email, password })`, `signUp({ email, password })`, `signOut()`, `getUser()`. Todas devuelven una **Promise** con `{ data, error }`: siempre revisar `result.error` (como hace `login.ts`).
- **Datos:** `from('Tabla').select('*')`, `.insert([obj])`, `.update(obj).eq('id', id)`. Se consumen con `.then(result => result.data || [])` (o `async/await`).
- `signUp` solo maneja mail y clave. Nombre, fecha de nacimiento, etc. van a una tabla propia con `insert` (mismo patrón que `addCosa`).
- Del material solo veo `select`, `insert` y `update` (no `delete`). Para "cancelar" o "desactivar" usá un campo `estado` + `update`.
- Ojo con el ejemplo: `getCosas` lee de `'Cosas'` pero `addCosa` inserta en `'Cosas2'` (parece un typo). Revisá siempre los nombres de tabla. Además, cada servicio crea su propio `createClient`; podés hacer lo mismo o centralizarlo, pero tené clara la razón.
- Para la defensa: Supabase devuelve **Promises** (`then`/`await`); `HttpClient` (F12) devuelve **Observables** (`subscribe`).

### F10 · Pipes (`pipes`)
- Predefinidos: `currency`, `date: 'dd/MM/yyyy'`, `uppercase`.
- Propio: `@Pipe({ name: 'filtro' })` + `transform(lista, busqueda)`, que devuelve `lista.filter(x => texto.toLowerCase().includes(busqueda.toLowerCase()))`. Uso: `@for (u of users() | filtro: busqueda(); track $index)` con un `<input [(ngModel)]="busqueda">`.
- Cada pipe se agrega al `imports` del componente.
- Es la base directa del **buscador de películas** (S2).

### F11 · Directivas (`directivas`)
- **De atributo:** `HoverZoomDirective` (`@Input() appHoverZoom`, `@HostListener('mouseenter')`, `Renderer2.setStyle`). Uso: `[appHoverZoom]="1.5"`.
- **Estructural:** `AdminDirective` con `TemplateRef` + `ViewContainerRef`: `createEmbeddedView` muestra el bloque y `clear` lo oculta. Uso: `*appAdmin`. Ojo: en el material el rol está escrito a mano (`rolUsuario = "admin"`); en el TP debe venir de la sesión.
- `[ngClass]="{ 'casa-stark': p.family === 'House Stark' }"` aplica clases CSS según condiciones. Es la base para pintar butacas (normal / ocupada / seleccionada / accesible / VIP).
- **Proyección de contenido:** `<ng-content select="[imagen]">` en `carta-personaje` es un componente contenedor reutilizable al que el padre le "inyecta" HTML. También `<ng-template #cardContent>` + `[ngTemplateOutlet]`.

### F12 · Módulos y HttpClient (`modulos`, `directivas`)
- **Módulos:** `@NgModule({ declarations, imports, exports })`; sus componentes llevan `standalone: false`; las rutas del módulo usan `RouterModule.forChild(routes)`; se carga perezoso con `loadChildren: () => import(...).then(m => m.MiModuloModule)`. Un componente standalone usa un módulo poniéndolo en su `imports` (`Componente3`).
- **HttpClient:** el servicio hace `this.http.get<Tipo[]>(url)` (devuelve un Observable); el componente hace `.subscribe({ next, error, complete })` y `unsubscribe()` al destruirse. En `directivas` se agrega `provideHttpClient()` en `app.config.ts`; si te aparece `NullInjectorError: No provider for HttpClient`, agregalo como ahí.

### F13 · PWA (`pipes`)
- `app.config.ts`: `provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000' })`. `index.html`: `<link rel="manifest" href="manifest.webmanifest">`.
- El **service worker** cachea los archivos de la app para que cargue rápido y sin conexión. El **manifest** le dice al navegador cómo instalarla (nombre, íconos). Está activado solo fuera de modo desarrollo (`!isDevMode()`): para probarlo hay que hacer el build de producción o mirarlo ya desplegado.
- Las compras siguen necesitando conexión con Supabase; lo que se cachea es la app, no los datos.
- **Cómo se agrega (clase 7):** con `ng add @angular/pwa`. `ng add` es "un npm install potenciado": instala el paquete y además configura la app. Genera `ngsw-config.json` (qué se guarda en caché), el `manifest.webmanifest`, los íconos en `public/icons` y agrega el link del manifest en `index.html` y `provideServiceWorker` en `app.config.ts`. No hay que escribir código.
- **Solo funciona en un sitio seguro (HTTPS)** o en localhost. Firebase Hosting ya da HTTPS; por eso el profe lo probó desplegado: aparece el botón de instalar en el navegador.
- Para la defensa, ejemplos que dio el profe: GitHub y YouTube son PWA (se ven en DevTools → Application → Service Workers).

---

## 5. Sprints

### S0 · Base del proyecto (21–23/09)
**Objetivo:** dejar el esqueleto que no cambia durante el resto del TP.
- Proyecto Angular con la estructura de los ejemplos (F1), repo en GitHub, proyecto en Supabase y `environment.ts` (F9).
- **Deploy vacío en Firebase Hosting desde el día 1** (clase 6-2): la consigna exige URL funcional y esto no se deja para el final. Pasos que hizo el profe:
  1. Crear el proyecto en la consola de Firebase.
  2. `npm install -g firebase-tools` y `firebase login` (abre el navegador para loguearte con esa cuenta).
  3. `firebase init hosting`: elegir el proyecto; como carpeta pública, la del build (ver abajo); **sí** a "single-page app"; **no** al deploy automático con GitHub.
  4. `ng build` y `firebase deploy --only hosting`. La consola te devuelve la URL: esa va al formulario de entrega.
  5. De ahí en más, por cada cambio: `ng build` + `firebase deploy --only hosting`.

  El `firebase.json` queda así (el de `pipes` en el repo, con la carpeta que terminó usando el profe en clase):
  ```json
  { "hosting": { "public": "dist/<nombre-proyecto>/browser",
                 "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
                 "rewrites": [ { "source": "**", "destination": "/index.html" } ] } }
  ```
  - `rewrites` → todas las rutas devuelven `index.html`. Es lo que se configura al responder "sí" a single-page app. Firebase solo sirve archivos: si entrás directo a `/admin`, ese archivo no existe; con esta regla entrega `index.html` y Angular resuelve la ruta. El profe lo conectó con una pregunta de parcial: nuestra app es una **SPA** (un solo HTML, contenido que cambia dinámicamente).
  - `public` → la carpeta que Firebase sube. En `pipes` (clase 7) el profe copió a mano el contenido de `dist/…/browser` a `public/`; en la clase 6-2 mostró la forma más fácil: apuntar `firebase.json` directo a `dist/<nombre-proyecto>/browser`, sin tocar `angular.json` ni copiar nada. Usá esta.
- PWA con `ng add` (F13, clase 7). Se prueba sobre la versión desplegada.
- Identidad visual: variables CSS y tipografías globales en `styles.css`, como `guards/src/styles.css` (`:root` con colores, `@import` de Google Fonts). La consigna pide estilo "único y producido".
- Rutas base con `loadComponent` (F5), con la ruta `'**'` **al final** (pregunta de parcial).
- Layout con navbar y footer como en la clase 6-1: el profe mostró cómo ocultar el navbar en el login con un `@if` o una directiva según la sesión.
- Tablas de la sección 3.2 creadas en Supabase.

**Defensa:** ¿qué hace `bootstrapApplication`? ¿Por qué carga perezosa? ¿Por qué la key de Supabase puede estar en el front (⚠️ W9)?

---

### S1 · Mail 01/01 — Núcleo del sistema (22–24/09)
Es el sprint más pesado. Partilo en tres, **en el orden que recomendó el profe (primero lo que carga el admin)**:
- **1A** registro y login con Supabase + campo `rol` en `perfiles` + redirección según rol + guards básicos. El admin se crea poniéndole `rol = 'admin'` en Supabase; el registro público siempre crea clientes.
- **1B** panel admin: alta y edición de películas y funciones (con la regla de 30 min), con las salas y butacas ya cargadas.
- **1C** lado cliente: cartelera con datos reales, detalle, mapa de butacas, compra, cupón y QR/PDF.

**Pide**
- Sala fija: 20 filas (A–T) × 3 bloques de 4 / 20 / 4 butacas. Implementalo **directamente con la distribución final** de la sección 3.4 (fila J accesible, sin K, R–T VIP): así no rehacés nada en S5 y S9.
- Admin elige qué películas se ven, sus horarios, formato (2D/3D/4D/5D) e idioma (castellano/subtitulada).
- Película: nombre, imagen, duración, sinopsis.
- Entre el fin de una función y el inicio de la siguiente en la misma sala: **mínimo 30 minutos**.
- Registro: mail, nombre, apellido, fecha de nacimiento, tipo de sangre, color de ojos, días de vacaciones por año.
- Cupón de 20% en la primera compra (solo registrados). También se puede comprar anónimo.
- Al comprar: PDF con los datos de la entrada y un QR (⚠️ W3).

**Aplicar:** F8 y F7 (registro y login) · F9 (Supabase) · F5 (`pelicula/:id` con `paramMap`) · F3 (tarjeta de película → detalle) · F4 (carrito) · F10 (`currency`, `date`) · F11 (`ngClass` en butacas).

**Lógica clave**
1. **Regla de los 30 minutos.** Con `fin = inicio + duración`, hay conflicto en la misma sala si:
   `nuevo.inicio < existente.fin + 30 min` **y** `existente.inicio < nuevo.fin + 30 min`.
2. **Cupón 20%:** solo para usuario registrado que todavía no tiene compras.
3. **Butaca ocupada:** consultar las entradas de esa función antes de confirmar. Los errores del `insert` se manejan (`result.error`); la base debe ser la última barrera.
4. **Formulario de registro:** tipo de sangre y color de ojos como listas cerradas; días de vacaciones como número con rango razonable; fecha de nacimiento porque se usa en S3 y S5.

**Boceto del mapa de butacas** (composición propia con F1, F3 y F11; no está tal cual en el material):

La idea es que cada fila sea un arreglo de **30 posiciones** (1 a 30). Donde hay butaca va el objeto; donde no hay (pasillos 5 y 26, huecos de la fila J) va `null`. Así todas las filas miden lo mismo y el mapa queda alineado como en el Excel.
```html
@for (fila of filas(); track fila.letra) {
  <div class="fila">
    <span class="letra">{{ fila.letra }}</span>
    @for (b of fila.posiciones; track $index) {
      @if (b) {
        <button [ngClass]="{ ocupada: b.ocupada, seleccionada: b.seleccionada,
                             accesible: b.tipo === 'accesible', vip: b.tipo === 'vip' }"
                [disabled]="b.ocupada"
                (click)="alternar(b)">{{ b.numero }}</button>
      } @else {
        <span class="hueco"></span>
      }
    }
  </div>
}
```
`filas()` se arma en TypeScript: agrupás las butacas por `fila` y, para cada una, creás un arreglo de 30 lugares y ponés cada butaca en la posición `numero - 1`. La fila K no existe en la tabla; si querés que se vea el pasillo horizontal, lo agregás como un espacio con CSS entre J y L.

**Defensa:** ¿cómo evitás que dos personas compren la misma butaca? ¿Cómo modelaste al comprador anónimo? ¿Por qué elegiste reactivos o signals para el registro?

---

### S2 · Mails 16/01 (×2) — Reseñas, top 3 y buscador (25/09)
**Pide:** reseñas con estrellas y comentario corto, visibles **antes** de comprar · puntuación promedio · home con las 3 más vendidas primero · listado con buscador · el buscador filtra por género (una película puede tener varios).

**Aplicar:** F7 (formulario de reseña: `Validators.maxLength` para el comentario corto) · F10 (pipe del buscador) · F3 (tarjetas) · F9.

**Lógica clave**
- Promedio = suma de estrellas / cantidad de reseñas, calculado en TypeScript (o en un pipe propio con el patrón de F10).
- Top 3: contar entradas por película, ordenar de mayor a menor y tomar 3.
- Buscador: extender el `FiltroPipe` del profe con un segundo criterio. Cada película trae su arreglo de géneros; se filtra por texto en el nombre **y** por `generos.some(g => seleccionados.includes(g))`.
- Las reseñas se muestran en el detalle de la película, por encima del botón de elegir función.

**Defensa:** ¿cómo funciona tu pipe? ¿Por qué el filtro se hace ahí y no en el componente?

---

### S3 · Mail 30/01 — Cupones y candy bar (26/09)
**Pide:** % del cupón de primera compra **configurable** por el admin · cupones que solo aplican a mayores de 50 · candy bar: crear productos, ponerlos en categorías, comprarlos junto con la entrada y retirarlos con el mismo QR · mapa del cine (sin luz verde).

**Aplicar:** F7 (formularios del admin) · F6 (proteger las pantallas de admin) · F4 (el carrito ahora mezcla entradas y productos) · F9.

**Lógica clave**
- La edad se calcula desde `fecha_nacimiento`; el cupón +50 valida `edad >= edad_minima`.
- El porcentaje sale de la tabla `cupones`, no del código: así el admin lo cambia cuando quiera.
- Qué pasa si aplican dos cupones: regla documentada (sección 3.3).
- **El mapa no se hace.** Anotalo en el README como fuera de alcance por decisión del cliente.

**Defensa:** ¿por qué el descuento no está escrito en el código? ¿Cómo compartís el carrito entre componentes?

---

### S4 · Mail 06/02 — Administración, empleados y salas automáticas (27–28/09)
**Pide:** usuario admin que controla salas, funciones, distribución de butacas y productos · usuarios empleados que **escanean QR** (cine y candy) · ingreso **manual** del código si el lector falla · el QR deja de funcionar una vez usado · asignación **automática** de sala: nunca dos funciones en la misma sala al mismo tiempo (ej.: lunes, martes y viernes a las 18 hs).

**Aplicar:** F6 (los guards de S1A se extienden a `/empleado`) · F11 (`*appAdmin` para ocultar botones) · F12 (área de admin como **módulo lazy**, para cubrir el tema módulos) · F9.

Como los roles y el panel admin arrancaron en S1, acá se completa lo que falta: pantalla del empleado, validación de QR y asignación automática de salas.

**Lógica clave**
- Validación manual: un `<input>` + botón que busca la compra por su código y hace `update` marcando la parte usada (entrada o candy). El lector con cámara es ⚠️ W4.
- **Asignación automática:**
  ```
  para cada día pedido (lun, mar, vie…):
    inicio = día + hora ; fin = inicio + duración
    para cada sala, en orden:
      si NO hay conflicto (regla de 30 min de S1) → asignar y cortar
    si ninguna sala sirve → avisar "no hay sala libre el martes 18:00"
  ```
- Desde acá conviene tener un `LogService` que inserte en `log_actividad`: en S9 solo se lo muestra en pantalla.

**Defensa:** ¿diferencia entre `canActivate` y `canMatch`? ¿Cómo evitás que un empleado entre a `/admin` escribiendo la URL? ¿Por qué un módulo para el admin?

---

### S5 · Mail 12/02 — Edad, butacas accesibles y tiempo real (29/09)
**Pide:** restricción de edad (18 / 13 / ninguna): los menores no compran y la entrada aclara que debe ir un adulto · sala sin filas J y K + fila accesible 2/10/2 · butacas **en tiempo real** (ver las ocupadas por otras compras al instante) · accesibles resaltadas visualmente.

**Aplicar:** F11 (`ngClass`) · F3 · F9.

**Lógica clave**
- `restriccion_edad` en la película; al comprar, edad del usuario ≥ restricción; si no, bloquear con mensaje. El aviso "debe ir un adulto" va en pantalla **y** en el PDF.
- Anónimos: decisión de la sección 3.3.
- La distribución accesible ya está cargada desde S1 (sección 3.4). En este sprint se valida que se vea distinta (clase `accesible`) y se agrega una leyenda de colores al mapa.
- Tiempo real: ⚠️ W5. No aparece en el material; no lo agregues sin confirmar.

**Defensa:** ¿cómo validás la edad? ¿Qué pasa si un usuario manipula el front?

---

### S6 · Mail 28/02 — UX y facturación (30/09)
**Pide:** interfaces fáciles para clientes y empleados · **nada** de selectores de fecha/hora con calendario desplegable ni exceso de scroll (imagen del mail) · reporte admin: facturación por día y cantidad de entradas vendidas.

**Aplicar:** F1 (`@if`/`@for`) · F10 (`date`, `currency`) · F9.

**Lógica clave**
- Fechas y horas **sin calendario**: días como botones ("hoy", "mañana", días siguientes) y horarios como botones debajo del día elegido; para el admin, días de la semana como chips (encaja con "lunes, martes y viernes") y hora en una lista. Fecha de nacimiento: tres listas (día / mes / año).
- Menos scroll: compra en **pasos** (función → butacas → candy → pago) mostrados con `@if`.
- Reporte: traer compras pagadas y agrupar por día en TypeScript; tabla como `lista-usuarios.html` de `inputOutput`.

**Defensa:** ¿por qué elegiste ese selector de fechas? ¿Cómo agrupás por día?

---

### S7 · Mail 03/03 — Fidelización y combos (01/10)
**Pide:** 1 punto por peso gastado (solo registrados) · canje por entradas gratis o productos del candy · el admin configura el costo en puntos de cada recompensa · el perfil muestra puntos e historial de canjes · no transferibles · **combos** (entrada + pochoclos + bebida) a precio fijo, configurables y destacados en la compra.

**Aplicar:** F9 · F3 · F11 (destacar combos con `ngClass`) · F7 (formularios admin).

**Lógica clave**
- Al confirmar la compra: `puntos += total pagado` (`update` de `perfiles`).
- Canje: validar `puntos >= costo`, descontar, insertar en `canjes`. Que no sean transferibles se cumple no ofreciendo ninguna operación que mueva puntos entre usuarios.
- Costos en la tabla `recompensas`, no en el código.

**Defensa:** ¿cómo garantizás que no se canjee sin puntos suficientes? ¿Dónde está el costo de cada recompensa?

---

### S8 · Mail 08/03 — Próximamente, alertas, preventa y "Mis películas" (02/10)
**Pide:** sección "Próximamente" · alerta por película para avisar cuando se abra la venta · preventa desde 7 días antes del estreno con precio especial, configurable por película · "Mis películas": historial visual con pósters, fechas y calificación propia.

**Aplicar:** F9 · F10 · F1 · F5.

**Lógica clave**
- Próximamente = películas con `fecha_estreno` futura.
- Alerta: guardar en `alertas_estreno`. Cómo *notificar* es ⚠️ W6; hasta confirmarlo, un aviso dentro de la app al entrar es un mínimo razonable.
- Precio: si `hoy >= estreno − 7 días` y `hoy < estreno` → precio de preventa; si no, precio normal.
- Mis películas: entradas validadas del usuario + su reseña (cruce por película).

**Defensa:** ¿cómo decidís qué precio se cobra? ¿Qué es "haber visto" una película en tu sistema?

---

### S9 · Mail 10/03 — Cancelación, VIP, reportes y log (03/10)
**Pide:** cancelar hasta 2 h antes de la función, con **crédito** (no dinero) visible en el perfil y combinable con otros medios de pago · butacas VIP (filas R, S, T) más caras, diferenciadas y con aviso claro antes de pagar · admin: exportar facturación a PDF y Excel (⚠️ W7), gráfico de películas más vistas por semana y por mes (⚠️ W7), producto del candy más vendido · log de actividad con fecha y hora.

**Aplicar:** F9 · F11 (`ngClass` VIP) · F10 (`date` con hora) · F6.

**Lógica clave**
- Cancelar: permitido si `función.inicio − ahora >= 2 h`. Se marca la compra y sus entradas como `cancelada` (`update`), se suma el total a `perfiles.credito` y la butaca queda libre porque la consulta de ocupadas ignora entradas canceladas. Solo registrados.
- Checkout: `a pagar = total − crédito usado`; el resto va por el pago simulado.
- VIP (filas R, S, T, ya cargadas desde S1): el precio sale de `butacas.tipo` (recargo VIP configurable); el resumen previo al pago dice explícitamente "Butaca VIP".
- Log: `LogService.registrar(accion, detalle)` llamado desde los servicios (crear función, cambiar precio, validar QR).

**Defensa:** ¿por qué crédito y no reembolso? ¿Cómo garantizás que todo quede en el log?

---

### S10 · Cierre (04/10)
- **Documento de requerimientos** (entregable 1): las listas "Pide" de cada sprint son la base; redactalo con tus palabras.
- **README** (entregable 4): arquitectura, decisiones de la sección 3.3, qué quedó fuera de alcance.
- Deploy final verificado (URL, PWA, Supabase).
- Guion de demo de 5 minutos y ensayo de preguntas (sección 9).
- 05/10: solo entrega. No se programa.

---

## 6. Calendario por pre-entregas

Las pre-entregas son **lunes y miércoles**. Cada una cierra un bloque de sprints: el objetivo es llegar a cada pre-entrega con algo **desplegado y funcionando**, aunque sea chico.

| Pre-entrega | Qué mostrar | Mails | Días de trabajo |
|---|---|---|---|
| **Lun 21/09** (hoy) | Lo que haya de S0: repo, proyecto Angular creado, primer deploy en Firebase, borrador del documento de requerimientos | — | — |
| **Mié 23/09** | S0 completo (PWA, rutas, estilo base, tablas en Supabase) + **S1A** (registro, login, roles) + **S1B** (alta de películas y funciones desde el admin). Solo login no alcanza para presentar | 01/01 (parte) | 2 |
| **Lun 28/09** | **S1C**: cartelera, mapa de butacas, compra, cupón 20%, QR/PDF (y lo que falte de S1B) + **S2**: reseñas, promedio, top 3, buscador por género | 01/01 + 16/01 | 5 |
| **Mié 30/09** | **S3**: cupones configurables y +50, candy bar + **S4**: roles admin/empleado, validación de QR (manual), asignación automática de salas | 30/01 + 06/02 | 2 |
| **Lun 05/10** (final) | **S5** a **S9** + **S10** (README, documento final, ensayo) | 12/02, 28/02, 03/03, 08/03, 10/03 | 5 |

Los bloques de 2 días (hasta el miércoles) llevan menos carga que los de 5 días (hasta el lunes).

**El último bloque es el más cargado.** Orden de prioridad dentro de él, de más a menos importante:
1. **S5** (edad y accesibles): casi todo ya está hecho desde S1; es rápido y muy visible.
2. **S6** (selector de fechas sin calendario y reporte de facturación): la UX se evalúa y el reporte es simple.
3. **S9** cancelación con crédito y VIP (el VIP ya está cargado desde S1) + log de actividad (si hiciste el `LogService` en S4, es solo una tabla en pantalla).
4. **S7** puntos y combos.
5. **S8** próximamente, preventa y "Mis películas".
6. **S9** exportar PDF/Excel y gráficos (dependen de librerías sin confirmar, W7).
7. Tiempo real (W5) y alertas (W6), solo si el profe confirma cómo se hacen.

Si no llegás, recortá **desde abajo de esa lista** y dejalo escrito en el README como no implementado. La consigna dice que la aprobación depende de la defensa: una app más chica que podés explicar línea por línea vale más que una completa que no.

**Domingo 04/10 no se programa funcionalidad nueva**: README, documento de requerimientos, deploy final verificado y ensayo de la demo.

---

## 7. Cobertura de temas ("todos los temas vistos en clase")

| Tema (proyecto) | Dónde lo usás |
|---|---|
| Componentes, signals, `@if`/`@for` (`clase1`) | En toda la app |
| Formularios reactivos y validadores (`clase-formularios`) | Registro, reseñas, formularios de admin |
| Formularios con signals (`ejemploSupabase`) | Login y registro |
| Input/Output (`inputOutput`, `ejemploInputOutput`) | Tarjeta de película, butaca, lista → detalle |
| Servicios y `BehaviorSubject` (`inputOutput`) | Carrito, sesión, `LogService` |
| Rutas, lazy loading, parámetros (`rutas`) | `pelicula/:id`, admin, empleado |
| Guards (`guards`) | Rutas de admin y empleado, salida de formularios |
| Módulos (`modulos`) | Área de admin como módulo lazy |
| Pipes (`pipes`) | Buscador, `currency`, `date` |
| Directivas y proyección de contenido (`directivas`) | `*appAdmin`, `ngClass` de butacas, tarjeta reutilizable |
| Supabase (`ejemploSupabase`) | Auth y todas las tablas |
| PWA (`pipes`) | Service worker y manifest |
| HttpClient (`directivas`, `pipes`) | Ver W11: el back del TP es Supabase |

---

## 8. ⚠️ Para confirmar con el profe (lo que no encontré en el material)

Revisado contra el repo y las clases 1 a 7: **ninguno de estos temas se vio todavía**. En la clase 5 el profe dijo que faltaban "dos o tres temas" más de Angular, así que alguno puede aparecer en las próximas clases; cuando subas las nuevas transcripciones lo actualizo. Resueltos: W1 (Firebase = hosting) y W2 (deploy con Firebase, clase 6-2).

| # | Duda | Afecta |
|---|---|---|
| W3 | Generación del PDF de la entrada con QR: ¿qué librería vieron? | S1 |
| W4 | Lector de QR con cámara: ¿qué usaron? (el ingreso manual ya está resuelto con formularios) | S4 |
| W5 | Butacas en tiempo real: ¿se resuelve con Supabase Realtime (la misma librería que usa `ejemploSupabase`)? | S5 |
| W6 | Alertas de "Próximamente": ¿notificaciones push de la PWA o algo dentro de la app? | S8 |
| W7 | Exportar a PDF y Excel, y gráficos: ¿qué librerías vieron? | S9 |
| W8 | Imagen de la película: ¿Storage de Supabase o una URL guardada en un campo (como `imageUrl` en el modelo `Personaje` de `directivas`)? | S1 |
| W9 | Seguridad en Supabase: la key va en el front, así que la protección real está en las reglas de la base (RLS). ¿Se vio? | S0, todo |
| W10 | Pago: ¿alcanza con un pago simulado? | S1, S9 |
| W11 | ¿Esperan ver `HttpClient` en el TP aunque el back sea Supabase? (se vio en la clase 3-2 y en `inputOutput`) | Cobertura |

---

## 9. Cómo defender

**Para cada decisión, tené cuatro cosas listas:** (1) qué hace, (2) en qué archivo está, (3) por qué así y no de otra forma, (4) qué archivo de la cátedra la inspiró.

Preguntas que conviene poder contestar sin mirar el código:
1. ¿Qué es un componente standalone y qué va en su `imports`? (F1)
2. ¿Cuándo usás `@Input`/`input()` y cuándo un servicio? (F3, F4)
3. ¿Signal o `BehaviorSubject`? ¿Por qué hacés `unsubscribe`? (F1, F4)
4. ¿Diferencia entre `canActivate`, `canMatch`, `canActivateChild` y `canDeactivate`? (F6)
5. ¿Qué pasa cuando `canMatch` devuelve `false`? (F6)
6. ¿Por qué Supabase devuelve Promises y `HttpClient` Observables? (F9, F12)
7. ¿Cómo funciona tu buscador y por qué es un pipe? (F10)
8. ¿Qué hace `track` en `@for`? (F1)
9. ¿Cómo evitás la doble venta de una butaca? (S1)
10. ¿Qué cachea tu PWA y qué pasa sin conexión? (F13)
11. ¿Qué parte de la lógica de negocio es la más compleja y dónde vive? (regla de 30 minutos, asignación de salas)
12. ¿Por qué empezaste por el admin? (lo que carga datos va antes que lo que los consume, clase 5)

**Marcadas por el profe como "pregunta de parcial"** (clases 2, 6 y 7):
- **¿Qué es una SPA?** Un solo `index.html`; al navegar no se carga otro HTML, Angular cambia el contenido. Por eso Firebase se configura como single-page app.
- **¿Por qué la ruta `'**'` va al final?** El router prueba las rutas en orden; si el comodín está antes, atrapa todo y las de abajo nunca se alcanzan.
- **Directiva estructural vs. de atributo.** La estructural agrega o quita partes del DOM (`*appAdmin`, con `TemplateRef` y `ViewContainerRef`); la de atributo cambia el aspecto o comportamiento de un elemento que ya existe (`appHoverZoom`, con `Renderer2` y `HostListener`).
- **¿Qué hace el asterisco?** Es la forma corta de envolver el elemento en un `<ng-template>`; sin él, la directiva no recibe el template. Y no se pueden poner dos estructurales en el mismo elemento (por eso se usa `ng-container`).
- **¿Dónde se importa un pipe, componente o directiva?** En el `imports` del componente que lo usa (o del módulo, si el componente no es standalone).

Otros conceptos que el profe repitió en clase:
- **Signals y detección de cambios** (clase 1): la señal "levanta la mano" y avisa que cambió; con una variable común el framework tiene que revisar todo. Se leen con `()` y se cambian con `.set()`; asignarles con `=` las convierte en otra cosa.
- **Encapsulamiento de estilos** (clase 1): el CSS de un componente solo afecta a ese componente.
- **`snapshot` vs. `paramMap.subscribe`** (clase 2): si navegás de `/detalle/1` a `/detalle/2`, el componente ya está en memoria y no se vuelve a inicializar; con `snapshot` te quedás con el dato viejo, con la suscripción te enterás del cambio.
- **Observable y `unsubscribe`** (clase 3): si la fuente se actualiza en el tiempo y no cancelás la suscripción, la conexión queda abierta.
- **Módulos** (clases 3 y 4): antes de standalone eran la única forma de carga perezosa; en la segunda parte de la materia (Nest) todo es modular.
- **Pipes e inmutabilidad** (clase 7): transforman lo que se muestra sin modificar el valor original.
