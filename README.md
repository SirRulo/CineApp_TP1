# CineApp — Sistema de gestión de un cine

Trabajo Práctico 1 · Programación IV · UTN FRA · 2.º cuatrimestre 2026
Alumno: Franco Barbizan

Aplicación web para un cine: cartelera, compra de entradas con selección de butacas, reseñas, panel de administración (películas y funciones) y panel de empleados.

- **App desplegada:** _(URL de Vercel)_
- **Repositorio:** https://github.com/SirRulo/CineApp_TP1

---

## 1. Tecnologías

| Herramienta | Para qué |
|---|---|
| **Angular 22** | Frontend: componentes standalone, signals, control flow (`@if` / `@for`), rutas con carga perezosa |
| **Supabase** (`@supabase/supabase-js`) | Autenticación (mail y contraseña) y base de datos Postgres. Es el único backend |
| **PWA** (`@angular/pwa`) | Service worker y manifest: la app se puede instalar |
| **Vercel** | Hosting del build estático. Cada `git push` a `main` publica una versión nueva |
| **CSS plano** | Estilos propios con variables en `:root` (`src/styles.css`). Sin librerías de UI |

Se usan solo las herramientas y los patrones vistos en la cursada (repositorio de la cátedra `A342-2`).

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
Componentes (pantallas)  ──usan──▶  Servicios  ──consultan──▶  Supabase (Auth + tablas)
        │                              │
        ├─ Pipes (transforman datos)   └─ Modelos (interfaces con la forma de cada tabla)
        ├─ Validadores (formularios)
        └─ Guards (protegen rutas)
```

- Los **componentes** muestran datos y reciben acciones del usuario. No hablan con Supabase directamente.
- Los **servicios** (`@Service()`) son los únicos que crean el cliente de Supabase y hacen `select`, `insert` y `update`. Devuelven Promises con `{ data, error }`, y el componente siempre revisa `error`.
- Los **modelos** son `interface` de TypeScript con la forma de cada fila.

### 2.2 Estructura de carpetas (`src/app/`)

| Carpeta | Contenido |
|---|---|
| `componentes/` | Una carpeta por componente (`.ts`, `.html`, `.css`) |
| `servicios/` | `auth`, `peliculas`, `funciones`, `compras`, `resenas` (Supabase) y `carrito` (estado en memoria) |
| `models/` | Interfaces: `Pelicula`, `Funcion`, `Butaca`, `Compra`, `Entrada`, `Cupon`, `Resena`, `Perfil`, etc. |
| `guards/` | `roleGuard(rol)`: `CanMatchFn` que compara el rol del perfil |
| `pipes/` | Pipes propios: `filtro` (buscador de la cartelera) y `promedio` (estrellas de las reseñas) |
| `validators/` | Regla de los 30 minutos entre funciones (`haySolapamiento`, `sinSolapamientoValidator`) |

### 2.3 Servicios y quién los usa

| Servicio | Tablas | Lo usan |
|---|---|---|
| `Auth` | Supabase Auth, `perfiles` | `Navbar`, `Login`, `Registro`, `DetallePelicula`, `Compra`, `roleGuard` |
| `Peliculas` | `peliculas`, `generos`, `pelicula_generos` | `Home`, `DetallePelicula`, `SeleccionButacas`, `ListaPeliculas`, `AltaPelicula`, `ListaFunciones`, `AltaFuncion` |
| `Funciones` | `salas`, `funciones`, `butacas`, `entradas` (ocupadas) | `Home`, `DetallePelicula`, `SeleccionButacas`, `ListaFunciones`, `AltaFuncion` |
| `Compras` | `compras`, `entradas`, `cupones` | `Home` (top 3), `Compra` |
| `Resenas` | `resenas` | `DetallePelicula` |
| `Carrito` | — (en memoria, `BehaviorSubject`) | `SeleccionButacas` (escribe), `Compra` (lee) |

### 2.4 Rutas y roles

Todas las rutas usan `loadComponent` (carga perezosa). La ruta comodín `'**'` va al final.

| Ruta | Pantalla | Acceso |
|---|---|---|
| `/home` | Cartelera, top 3 y buscador | Todos |
| `/pelicula/:id` | Detalle, reseñas, días y horarios | Todos |
| `/funcion/:id` | Mapa de butacas | Todos (se puede comprar sin cuenta) |
| `/compra` | Resumen, cupón y pago simulado | Todos |
| `/registro`, `/login` | Alta de cliente e inicio de sesión | Todos |
| `/admin` → `peliculas`, `peliculas/nueva`, `peliculas/editar/:id`, `funciones`, `funciones/nueva` | Panel de administración (rutas hijas) | Rol `admin` |
| `/empleado` | Panel de empleados | Rol `empleado` |
| `**` | Página de error | — |

**Roles:** anónimo, cliente, empleado y admin. El rol es un campo de la tabla `perfiles` (no se decide por el mail). Hay **un solo login**: después de ingresar, se redirige según el rol. El registro público crea solo clientes; admin y empleados se asignan en la base.

Las rutas de admin y empleado usan `canMatch: [roleGuard('...')]`. Si el rol no coincide, la ruta no existe para ese usuario y se muestra la página de error. En `admin`, el guard está en la ruta padre y protege a todas las hijas.

### 2.5 Comunicación entre componentes

| Caso | Mecanismo |
|---|---|
| `Home` → `TarjetaPelicula` | `input()` (el padre pasa cada película) |
| `SeleccionButacas` ↔ `Asiento` | `input()` (butaca, ocupada, seleccionada) + `output()` (`elegida`): el hijo avisa el clic y el padre decide |
| Sesión (`Navbar`, guards, pantallas) | Signal `perfil` en el servicio `Auth` |
| Butacas → Compra (dos rutas distintas) | Servicio `Carrito` con `BehaviorSubject` (`next` / `subscribe`, `unsubscribe` en `ngOnDestroy`) |

### 2.6 Modelo de datos (Supabase)

`perfiles`, `peliculas`, `generos`, `pelicula_generos` (N:M), `salas`, `butacas`, `funciones`, `compras`, `entradas`, `cupones`, `resenas`. Para los próximos sprints ya están creadas: `categorias`, `productos`, `combos`, `combo_productos`, `compra_productos`, `recompensas`, `movimientos_puntos`, `movimientos_credito`, `alertas_estreno` y `log_actividad`.

- Claves `bigint generated by default as identity`, relaciones con `references` y restricciones con `not null`, `unique` y `check`.
- Índice único `butaca_vendida_una_vez (funcion_id, butaca_id)` sobre las entradas activas: impide vender dos veces la misma butaca.
- `unique (pelicula_id, usuario_id)` en `resenas`: una reseña por persona y película.
- **Saldo de puntos y de crédito** = suma de movimientos (no hay columna de saldo).

**Salas:** todas tienen la misma distribución, con **518 butacas**. Las filas van de la A a la T, sin la K, que es pasillo. Los números 5 y 26 no existen: son los pasillos entre bloques. La fila **J** es de butacas accesibles (2–3, 11–20, 28–29) y las filas **R, S y T** son VIP, con el precio `precio_vip` de cada función.

---

## 3. Decisiones técnicas

### 3.1 Angular

- **Standalone y signals** para el estado local. Todo lo que usa un HTML va en el `imports` de su componente.
- **Dos tipos de formulario:** con **signals** (`form()` + `[formField]`) para registro y login, y **reactivos** (`FormGroup` + `Validators`) para los formularios del admin y la reseña.
- **Validador propio de grupo** para la regla de los 30 minutos. La cuenta está en una función aparte (`haySolapamiento`), que se reutiliza al reactivar una función.
- **Pipes propios** para el buscador (`filtro`: texto en el título + géneros elegidos) y el promedio de reseñas (`promedio`). Son pipes puros, así que se les pasan arreglos nuevos (nunca `push`) para que se recalculen.
- **Parámetros de ruta:** `paramMap.subscribe` en el detalle de la película (se recarga si cambia el `:id`) y `snapshot` en la edición y en las butacas (el componente se recrea siempre).
- **Un cliente de Supabase por servicio**, como en el material. Todos comparten la sesión guardada en el navegador.

### 3.2 Reglas de negocio

| Tema | Decisión |
|---|---|
| Funciones | **30 minutos** mínimo entre el fin de una función y el inicio de la siguiente en la misma sala. Se controla al crear y al reactivar |
| Borrado | **Baja lógica** con `activa` / `estado` y `update`; no se borran películas, funciones ni compras. Único `delete`: la tabla de relación `pelicula_generos` al editar los géneros |
| Compra anónima | Permitida: `usuario_id = null` |
| Butacas | Máximo **10 por compra**. Las VIP usan `precio_vip` |
| Doble venta | Las entradas se guardan en **un solo `insert`**. Si otra persona compró una butaca, el índice único rechaza el insert (error `23505`), la compra queda `cancelada` y se avisa al usuario |
| Código de compra | 8 caracteres al azar generados en Angular, `unique` en la base. Un código por compra |
| Cupón de primera compra | Automático para registrados sin compras pagadas; el porcentaje se lee de la tabla `cupones` |
| Cupones (próximo sprint) | Un cupón por compra: se aplica el de mayor descuento (primera compra o +50 años) |
| Pago | **Simulado** (botón "Pagar", sin datos de tarjeta) |
| Reseñas | Solo usuarios registrados; una por película; comentario opcional de hasta 200 caracteres |
| Top 3 | Películas activas con más entradas vendidas (entradas activas) |
| Cartelera | Todas las películas activas; primero las destacadas |
| UX | Sin selectores de fecha con calendario: días y horarios como botones; fechas lejanas en tres campos numéricos (día / mes / año) |

### 3.3 Hosting

Se usa **Vercel** en lugar de Firebase Hosting (misma idea: sirve el build estático por HTTPS). Al ser una SPA, cualquier ruta devuelve `index.html` y Angular resuelve la pantalla. Vercel ya lo hace sin configuración extra (equivale al `rewrites` de `firebase.json`).

### 3.4 Limitaciones conocidas

- **Operaciones en dos pasos:** registro (`signUp` + perfil), película (película + géneros) y compra (compra + entradas). Si falla el segundo paso, no hay atomicidad. Se valida todo antes del primer paso y, en la compra, se marca `cancelada`. La atomicidad real requeriría funciones en la base, que no forman parte del material.
- **Sin tiempo real:** si alguien compra una butaca mientras otra persona mira el mapa, no se ve hasta recargar. La última barrera es el índice único.
- **Carrito en memoria:** al recargar la página se vacía.
- **Sin RLS** en Supabase por ahora (pendiente de confirmar con la cátedra).

---

## 4. Alcance

**Implementado:** registro y login con roles, panel de administración (películas y funciones con la regla de 30 minutos), cartelera con buscador y top 3, detalle con reseñas y promedio, mapa de butacas, compra con cupón de primera compra, PWA y deploy.

**En desarrollo:** cupón +50 y cupones configurables, candy bar, panel de empleados (validación de compras por código), asignación automática de salas, puntos, combos, cancelación con crédito, preventa, log de actividad.

**Pendiente de confirmar con la cátedra:** QR y PDF de la entrada, lector de QR con cámara, butacas en tiempo real, notificaciones, exportación a PDF/Excel y gráficos.

**Fuera de alcance:** el **mapa del cine** (el cliente todavía no dio luz verde).
