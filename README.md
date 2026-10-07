# CineApp — Sistema de gestión de un cine

Trabajo Práctico 1 · Programación IV · UTN FRA · 2.º cuatrimestre 2026
Alumno: Franco Barbizan

Aplicación web para un cine: cartelera, compra de entradas con selección de butacas en tiempo real, candy bar, cupones, preventa, reseñas, entrada con QR y PDF, cancelación con crédito, panel de administración (películas, funciones, candy, cupones, reportes y actividad) y panel de empleados (validación de compras por código).

- **App desplegada:** https://cine-app-flax.vercel.app
- **Repositorio:** https://github.com/SirRulo/CineApp_TP1
- **Documento de requerimientos:** [REQUERIMIENTOS.md](REQUERIMIENTOS.md)

---

## 1. Tecnologías

| Herramienta | Para qué |
|---|---|
| **Angular 22** | Frontend: componentes standalone, signals, control flow (`@if` / `@for`), rutas con carga perezosa, un módulo lazy para el admin |
| **Supabase** (`@supabase/supabase-js`) | Autenticación (mail y contraseña), base de datos Postgres y Realtime (butacas en vivo). Es el único backend |
| **PWA** (`@angular/pwa`) | Service worker y manifest: la app se puede instalar |
| **Vercel** | Hosting del build estático. Cada `git push` a `main` publica una versión nueva |
| **CSS plano** | Estilos propios con variables en `:root` (`src/styles.css`), incluidos los estilos de impresión. Sin librerías de UI |

Se usan solo las herramientas y los patrones vistos en la cursada (repositorio de la cátedra `A342-2`). Las pocas excepciones (Realtime, `window.print()`, barras con CSS) están explicadas en la sección 3.4.

### Cómo correrlo

```bash
npm install
ng serve -o      # desarrollo en http://localhost:4200
ng build         # build de producción → dist/CineApp/browser
```

La conexión a Supabase está en `src/environments/environment.ts` (`supabaseUrl` y `supabasePublishableKey`). En el front se usa **solo la publishable key**, nunca la service role ni la API `auth.admin`.

---

## 2. Arquitectura

### 2.1 Capas

```
Componentes (pantallas)  ──usan──▶  Servicios  ──consultan──▶  Supabase (Auth + tablas + Realtime)
        │                              │
        ├─ Pipes (transforman datos)   └─ Modelos (interfaces con la forma de cada tabla)
        ├─ Validadores (formularios)
        ├─ Directivas (*appAdmin)
        └─ Guards (protegen rutas)
```

- Los **componentes** muestran datos y reciben acciones del usuario. No hablan con Supabase directamente.
- Los **servicios** (`@Service()`) son los únicos que crean el cliente de Supabase y hacen `select`, `insert` y `update`. Devuelven Promises con `{ data, error }`, y el componente siempre revisa `error`.
- Los **modelos** son `interface` de TypeScript con la forma de cada fila.

### 2.2 Estructura de carpetas (`src/app/`)

| Carpeta | Contenido |
|---|---|
| `componentes/` | Una carpeta por componente (`.ts`, `.html`, `.css`) |
| `servicios/` | `auth`, `peliculas`, `funciones`, `compras`, `candy`, `resenas`, `log` (Supabase) y `carrito` (estado en memoria) |
| `models/` | Interfaces: `Pelicula`, `Funcion`, `Sala`, `Butaca`, `Compra`, `Entrada`, `Cupon`, `Producto`, `Categoria`, `CompraProducto`, `MovimientoCredito`, `Actividad`, `Resena`, `Perfil`, `ContenidoCarrito`, etc. |
| `guards/` | `authGuard` (`CanActivateFn`: pide sesión) y `roleGuard(rol)` (`CanMatchFn`: compara el rol del perfil) |
| `pipes/` | Pipes propios: `filtro` (buscador de la cartelera) y `promedio` (estrellas de las reseñas) |
| `validators/` | Regla de los 30 minutos entre funciones (`haySolapamiento`, `sinSolapamientoValidator`) |
| `directivas/` | `*appAdmin`: directiva estructural que muestra un elemento solo si el usuario es admin |
| `modulos/admin/` | `AdminModule` + `AdminRoutingModule` (`forChild`): el panel admin se carga con `loadChildren` |

### 2.3 Servicios y quién los usa

| Servicio | Tablas | Lo usan |
|---|---|---|
| `Auth` | Supabase Auth, `perfiles` | `Navbar`, `Login`, `Registro`, `DetallePelicula`, `Compra`, `MisCompras`, `Empleado`, `LogActividad`, `authGuard`, `roleGuard`, `*appAdmin`, `Log` |
| `Peliculas` | `peliculas`, `generos`, `pelicula_generos` | Cartelera, detalle, butacas, mis compras, empleado y casi todo el admin |
| `Funciones` | `salas`, `funciones`, `butacas`, `entradas` (ocupadas + canal Realtime) | `Home`, `DetallePelicula`, `SeleccionButacas`, `MisCompras`, `Empleado`, `ListaFunciones`, `AltaFuncion`, `ProgramarFunciones`, `ReporteFacturacion` |
| `Compras` | `compras`, `entradas`, `compra_productos`, `cupones`, `movimientos_credito` | `Home` (top 3), `Compra`, `MisCompras`, `Empleado`, `ListaCupones`, `ReporteFacturacion` |
| `Candy` | `categorias`, `productos` | `CandyBar`, `Empleado`, `ListaProductos`, `AltaProducto`, `ReporteFacturacion` |
| `Resenas` | `resenas` | `DetallePelicula` |
| `Log` | `log_actividad` | `AltaFuncion`, `ProgramarFunciones`, `AltaProducto`, `ListaCupones`, `Empleado` (registran) y `LogActividad` (muestra) |
| `Carrito` | — (en memoria, `BehaviorSubject`) | `SeleccionButacas` (escribe), `CandyBar` (agrega productos), `Compra` (lee y vacía) |

### 2.4 Rutas y roles

Todas las pantallas usan `loadComponent` (carga perezosa); el admin además es un módulo con `loadChildren`. La ruta comodín `'**'` va al final.

| Ruta | Pantalla | Acceso |
|---|---|---|
| `/home` | Cartelera, top 3 y buscador | Todos |
| `/pelicula/:id` | Detalle, reseñas, días y horarios | Todos |
| `/funcion/:id` | Mapa de butacas (en tiempo real) | Todos (se puede comprar sin cuenta; +13/+18 solo con cuenta) |
| `/candy` | Candy bar (paso opcional de la compra) | Todos |
| `/compra` | Resumen, cupón, crédito y pago simulado | Todos |
| `/mis-compras` | Compras del cliente, cancelación y saldo de crédito | Con sesión (`authGuard`) |
| `/registro`, `/login` | Alta de cliente e inicio de sesión | Todos |
| `/admin` → `peliculas`, `peliculas/nueva`, `peliculas/editar/:id`, `funciones`, `funciones/nueva`, `funciones/programar`, `productos`, `productos/nuevo`, `productos/editar/:id`, `cupones`, `reportes`, `log` | Panel de administración (módulo lazy con rutas hijas) | Rol `admin` |
| `/empleado` | Validación de compras por código | Rol `empleado` |
| `**` | Página de error | — |

**Roles:** anónimo, cliente, empleado y admin. El rol es un campo de la tabla `perfiles` (no se decide por el mail). Hay **un solo login**: después de ingresar, se redirige según el rol. El registro público crea solo clientes; admin y empleados se asignan en la base.

Las rutas de admin y empleado usan `canMatch: [roleGuard('...')]`. Si el rol no coincide, la ruta no existe para ese usuario, se muestra la página de error y el código del módulo admin ni siquiera se descarga. `/mis-compras` usa `canActivate: [authGuard]`: sin sesión, lleva al login.

### 2.5 Comunicación entre componentes

| Caso | Mecanismo |
|---|---|
| `Home` → `TarjetaPelicula` | `input()` (el padre pasa cada película) |
| `SeleccionButacas` ↔ `Asiento` | `input()` (butaca, ocupada, seleccionada) + `output()` (`elegida`): el hijo avisa el clic y el padre decide |
| Sesión (`Navbar`, guards, directiva, pantallas) | Signal `perfil` en el servicio `Auth` |
| Butacas → Candy → Compra (rutas distintas) | Servicio `Carrito` con `BehaviorSubject` (`next` / `subscribe`, `unsubscribe` en `ngOnDestroy`) |
| Compras de otras personas → mapa abierto | Canal de Supabase Realtime sobre `entradas` de esa función (se cierra en `ngOnDestroy`) |

### 2.6 Modelo de datos (Supabase)

Tablas en uso: `perfiles`, `peliculas`, `generos`, `pelicula_generos` (N:M), `salas`, `butacas`, `funciones`, `compras`, `entradas`, `cupones`, `categorias`, `productos`, `compra_productos`, `movimientos_credito`, `resenas` y `log_actividad`. Creadas para lo que falta (sección 4): `combos`, `combo_productos`, `recompensas`, `movimientos_puntos` y `alertas_estreno`.

- Claves `bigint generated by default as identity`, relaciones con `references` y restricciones con `not null`, `unique` y `check`.
- Índice único `butaca_vendida_una_vez (funcion_id, butaca_id)` sobre las entradas activas: impide vender dos veces la misma butaca.
- `unique (pelicula_id, usuario_id)` en `resenas`: una reseña por persona y película.
- **Saldo de crédito** (y de puntos) = suma de movimientos; no hay columna de saldo.
- Validación de una compra: dos marcas independientes, **fecha + quién** (`ingreso_validado_en/por`, `candy_entregado_en/por`).

**Salas:** todas tienen la misma distribución, con **518 butacas**. Las filas van de la A a la T, sin la K, que es pasillo. Los números 5 y 26 no existen: son los pasillos entre bloques. La fila **J** es de butacas accesibles (2–3, 11–20, 28–29) y las filas **R, S y T** son VIP, con el precio `precio_vip` de cada función.

---

## 3. Decisiones técnicas

### 3.1 Angular

- **Standalone y signals** para el estado local. Todo lo que usa un HTML va en el `imports` de su componente.
- **Dos tipos de formulario:** con **signals** (`form()` + `[formField]`) para registro, login y la búsqueda del empleado, y **reactivos** (`FormGroup` + `Validators`) para los formularios del admin y la reseña.
- **Validador propio de grupo** para la regla de los 30 minutos. La cuenta está en una función aparte (`haySolapamiento`), que se reutiliza al reactivar una función y en la asignación automática de sala.
- **Pipes propios** para el buscador (`filtro`: texto en el título + géneros elegidos) y el promedio de reseñas (`promedio`). Son pipes puros, así que se les pasan arreglos nuevos (nunca `push`) para que se recalculen.
- **Directiva estructural** `*appAdmin` (`TemplateRef` + `ViewContainerRef`): muestra el link "Editar película" solo al admin. Es solo visual; la seguridad la da el `canMatch`.
- **Módulo lazy** para el admin (`NgModule` + `RouterModule.forChild` + `loadChildren`); el resto de la app es standalone.
- **Parámetros de ruta:** `paramMap.subscribe` en el detalle de la película (se recarga si cambia el `:id`) y `snapshot` en las ediciones y en las butacas (el componente se recrea siempre).
- **Un cliente de Supabase por servicio**, como en el material. Todos comparten la sesión guardada en el navegador. Los servicios que usan otro servicio lo reciben con `inject()`.

### 3.2 Reglas de negocio

| Tema | Decisión |
|---|---|
| Funciones | **30 minutos** mínimo entre el fin de una función y el inicio de la siguiente en la misma sala. Se controla al crear, al reactivar y al programar |
| Asignación de sala | "Programar funciones": el admin elige película, varios días y hora; para cada día se busca la **primera sala libre**. Si no hay, se avisa por día |
| Borrado | **Baja lógica** con `activa` / `estado` y `update`; no se borran películas, funciones, productos ni compras. Único `delete`: la tabla de relación `pelicula_generos` al editar los géneros |
| Compra anónima | Permitida (`usuario_id = null`) para películas ATP |
| Edad | Películas +13/+18: solo con cuenta y edad suficiente (sale de la fecha de nacimiento). Se controla en el detalle y otra vez en el pago. La confirmación y el empleado avisan que los menores deben ir con un adulto |
| Butacas | Máximo **10 por compra**. Las VIP usan `precio_vip`. El mapa se actualiza solo cuando otra persona compra o cancela |
| Doble venta | Las entradas se guardan en **un solo `insert`**. Si otra persona compró una butaca, el índice único rechaza el insert (error `23505`), la compra queda `cancelada` y se avisa al usuario |
| Código de compra | 8 caracteres al azar generados en Angular, `unique` en la base. **Un código por compra**, sirve para la entrada y para el candy |
| Cupones | Un cupón por compra, automático: **el de mayor porcentaje** entre primera compra (registrados sin compras) y +50 años. El admin **crea** cupones (código, %, edad mínima opcional, solo primera compra), cambia el % y los activa o desactiva. Se aplica **solo sobre las entradas** |
| Candy bar | Paso opcional entre las butacas y el pago, solo junto con entradas. Precio guardado al momento de la venta (`precio_unitario`) |
| Preventa | Si la película tiene `precio_preventa`, la venta abre **7 días antes del estreno** y hasta el estreno **todas** las entradas (también VIP) cuestan ese precio. Sin preventa, la venta abre el día del estreno. Se controla en el detalle y en el mapa de butacas |
| Entrada | Al pagar se muestra el **QR** con el código de la compra y se puede **descargar en PDF**. El QR también aparece en "Mis compras" mientras la compra sirve |
| Pago | **Simulado** (botón "Pagar", sin datos de tarjeta) |
| Validación | El empleado busca por código (sin importar mayúsculas o espacios). **Ingreso**: desde 1 h antes del inicio hasta el fin de la función. **Candy**: en cualquier momento. Cada marca se usa una sola vez (`update ... where ... is null`) |
| Cancelación | Desde "Mis compras", hasta **2 h antes** y si no se usó. Se cancelan la compra y sus entradas (las butacas se liberan) y se acredita `total + credito_usado` como **crédito**, no reembolso |
| Crédito | Se puede usar en otra compra junto con el pago simulado; se usa solo lo necesario |
| Log de actividad | Se registra quién creó funciones, cambió precios (cupones y candy), validó entradas y entregó candy, con fecha y hora. El admin lo ve filtrado por acción |
| Reportes | Facturación por día (7 días / 30 días / todo, en hora local), películas más vistas (barras) y candy más vendido. Se exporta a **PDF** |
| Reseñas | Solo usuarios registrados; una por película; comentario opcional de hasta 200 caracteres |
| Top 3 | Películas activas con más entradas vendidas (entradas activas) |
| Cartelera | Todas las películas activas; primero las destacadas |
| UX | Sin selectores de fecha con calendario: días y horarios como botones; fechas lejanas en tres campos numéricos (día / mes / año). Compra por pasos: detalle → butacas → candy → pago |

### 3.3 Hosting

Se usa **Vercel** en lugar de Firebase Hosting (misma idea: sirve el build estático por HTTPS). Al ser una SPA, cualquier ruta devuelve `index.html` y Angular resuelve la pantalla. Vercel ya lo hace sin configuración extra (equivale al `rewrites` de `firebase.json`).

### 3.4 Fuera del material de la cursada (decisiones propias)

| Tema | Cómo se resolvió |
|---|---|
| Butacas en tiempo real | **Supabase Realtime**, que ya viene en `@supabase/supabase-js` (no se instaló nada). El mapa escucha los cambios en `entradas` de su función y vuelve a pedir las ocupadas |
| Exportar el reporte | **PDF con `window.print()`** y estilos `@media print` en `styles.css` (hoja blanca, sin navbar ni menú). Sin librerías |
| QR de la entrada | Imagen generada por **api.qrserver.com** a partir del código (`<img [src]>`), sin instalar librerías. Necesita internet; si no carga, el código en texto sirve igual |
| PDF de la entrada | **`window.print()`**, el mismo mecanismo del reporte |
| Gráfico de más vistas | Barras hechas con `div` y `[style.width.%]`. Sin librerías |

### 3.5 Limitaciones conocidas

- **Operaciones en varios pasos:** registro (`signUp` + perfil), película (película + géneros), compra (compra + candy + entradas) y cancelación (compra + entradas + crédito). Si falla un paso intermedio, no hay atomicidad. Se valida todo antes del primer paso y, en la compra, se marca `cancelada`. La atomicidad real requeriría funciones en la base, que no forman parte del material.
- **Carrito en memoria:** al recargar la página se vacía.
- **Funciones sin edición:** se desactivan y se carga otra.
- **Sin RLS** en Supabase por ahora (pendiente de confirmar con la cátedra).
- Los conteos de los reportes y del top 3 se hacen en Angular (traen las filas y cuentan). Con muchos datos convendría contar en la base.

---

## 4. Alcance

**Implementado:** registro y login con roles · panel de administración (películas, funciones con la regla de 30 minutos, asignación automática de sala, candy bar, alta y edición de cupones, reportes con gráfico y PDF, log de actividad) · cartelera con buscador y top 3 · detalle con reseñas y promedio · restricción de edad · mapa de butacas en tiempo real · candy bar en la compra · cupones de primera compra y +50 · preventa · entrada con QR y descarga en PDF · cancelación con crédito y uso del crédito · panel de empleados con validación por código · PWA y deploy.

**No implementado** (por tiempo; las tablas ya están creadas en la base):
- **Puntos** (mail 03/03): acumulación 1 punto por peso, canje, recompensas configurables y "Mi cuenta". Tablas `movimientos_puntos` y `recompensas`.
- **Combos** (mail 03/03): tablas `combos` y `combo_productos`; `compra_productos` ya admite `combo_id`.
- **"Próximamente", alertas de estreno y "Mis películas"** (mail 08/03). La preventa sí está.
- **Admin de salas y distribución de butacas** (mail 06/02): las salas y sus 518 butacas se cargan con el script SQL; la distribución es fija según los mails.
- **Exportar a Excel/CSV** (mail 10/03): el reporte se exporta solo a PDF.
- **Lector de QR con cámara**: la validación se hace con el **código escrito a mano**, que el mail permite como alternativa.
- **Notificaciones push.**

**Fuera de alcance:** el **mapa del cine** (el cliente no dio luz verde).

---

## 5. Pruebas

- **Camino principal** (04/10/2026, sobre la URL de Vercel): recorrido completo aprobado. Admin carga películas, funciones (con choque de horario rechazado y programación automática), candy y cupones → compra anónima con VIP y candy → cliente con cupón, tiempo real entre dos navegadores, reseña, cancelación y uso del crédito → menor de edad bloqueado en +18 → empleado busca el código y entrega el candy → reporte, gráfico, PDF y log → F5 en rutas protegidas, página de error, vista de celular y PWA instalable.
- **Tests automáticos:** pendientes (los `.spec.ts` generados por Angular no están actualizados).
