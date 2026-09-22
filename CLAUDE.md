# TP1 Programación IV (UTN FRA, 2026 C2) — Sistema de Cine

Aplicación web para un cine: cartelera, compra de entradas con selección de butacas, candy bar, QR de validación, panel de administración y panel de empleados.

- **Entrega final:** lunes 05/10/2026. **Pre-entregas:** cada lunes y miércoles (se entrega la URL desplegada y se corrige en clase).
- **Aprobación:** depende de una **defensa oral**. El alumno (Franco) tiene que poder explicar cada línea.
- **Detalle completo** (requerimientos por mail, sprints, fichas del código de la cátedra, preguntas de defensa): `docs/roadmap-tp1-cine.md`. Leelo antes de empezar un sprint nuevo.

---

## 1. Cómo trabajar conmigo (IMPORTANTE)

Estoy aprendiendo Angular con este TP. El objetivo no es solo que el código funcione: tengo que entenderlo y defenderlo.

1. **Un paso chico por vez.** Antes de escribir código, decime en 2–4 líneas qué vas a hacer y en qué archivos. Esperá mi OK si el cambio toca más de 2–3 archivos.
2. **Después de cada cambio, explicame:**
   - qué hace cada parte nueva (en español, simple);
   - **en qué proyecto de la cátedra está basado** (ej.: "igual que `guards/src/app/guards/role-guard.ts`");
   - **una pregunta que me podría hacer el profe** sobre eso y cómo contestarla.
3. **Nada de cambios grandes de golpe** ni refactors que no pedí.
4. **No hagas commits ni deploys por tu cuenta.** Proponé el mensaje de commit y yo lo ejecuto.
5. Si algo falla, explicame **por qué** falló antes de arreglarlo.
6. Hablame en español rioplatense.

---

## 2. Regla de oro: solo lo que enseña la cátedra

- Usá **únicamente** las herramientas, patrones y librerías que aparecen en el repo de la cátedra (sección 3). No agregues librerías de UI (Angular Material, Bootstrap, Tailwind, PrimeNG…), ni NgRx, ni nada que no esté ahí.
- Si una funcionalidad del TP **no está cubierta** por el material (ver sección 10), **frená y avisame**. No elijas una librería por tu cuenta.
- Si hay dos formas de hacer algo y ambas están en el material, preguntame cuál prefiero y explicame la diferencia.

---

## 3. Material de referencia de la cátedra

Repo del profe clonado **al lado de este proyecto**: `../A342-2` (origen: `https://github.com/amorelli-utnfra/A342-2`). Si no existe, pedime que lo clone.

| Tema | Dónde mirar |
|---|---|
| Componentes, signals, `@if`/`@for`, `ngModel` | `../A342-2/clase1` |
| Rutas, `loadComponent`, parámetros (`snapshot` vs `paramMap.subscribe`) | `../A342-2/rutas` |
| Input / Output, `model()` | `../A342-2/ejemploInputOutput`, `../A342-2/inputOutput` |
| Servicios, `BehaviorSubject`, `HttpClient`, `unsubscribe` | `../A342-2/inputOutput` |
| Formularios reactivos, validadores propios y asíncronos | `../A342-2/clase-formularios` |
| Supabase (auth + tablas), formularios con signals (`form`, `[formField]`) | `../A342-2/ejemploSupabase` |
| Guards (`canActivate`, `canMatch`, `canActivateChild`, `canDeactivate`) | `../A342-2/guards` |
| Módulos (`NgModule`, `loadChildren`, `forChild`) | `../A342-2/modulos` |
| Directivas de atributo y estructurales, `ngClass`, `ng-content`, `ng-template` | `../A342-2/directivas` |
| Pipes propios y predefinidos, PWA, `firebase.json` | `../A342-2/pipes` |

Antes de implementar algo, **buscá primero el ejemplo equivalente** en esas carpetas y seguí el mismo estilo.

---

## 4. Stack y comandos

- **Angular 22** (standalone, signals, control flow `@if`/`@for`), TypeScript, CSS plano.
- **Supabase** (`@supabase/supabase-js`): autenticación y base de datos. Es el único back.
- **Firebase Hosting**: solo para publicar la app. No usar la base de datos de Firebase.
- **PWA**: `ng add @angular/pwa` (service worker + manifest).

```bash
ng serve -o                          # desarrollo
ng build                             # build de producción → dist/<proyecto>/browser
firebase deploy --only hosting       # publicar (siempre después de ng build)
```

`firebase.json` apunta directo al build (como mostró el profe en clase):
```json
{ "hosting": { "public": "dist/<proyecto>/browser",
               "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
               "rewrites": [ { "source": "**", "destination": "/index.html" } ] } }
```

---

## 5. Convenciones de código (las del repo de la cátedra)

- Componentes **standalone**. Todo lo que se usa en el HTML va en el `imports` del componente.
- Nombres de archivo sin sufijo, como genera Angular 22: `login.ts`, `login.html`, `login.css`; clase `Login`.
- Carpetas dentro de `src/app/`: `componentes/`, `servicios/`, `models/`, `guards/`, `pipes/`, `directivas/`.
- Servicios con `@Service()` (de `@angular/core`), como en `ejemploSupabase/src/app/services/auth.ts`. Inyección por constructor o con `inject()`.
- Estado local con **signals** (`signal()`, `.set()`, leer con `()`). Estado compartido entre componentes no relacionados: servicio con `BehaviorSubject` o signal.
- Suscripciones a Observables: siempre `unsubscribe()` en `ngOnDestroy`.
- Rutas con `loadComponent` (carga perezosa). La ruta `'**'` **siempre al final**.
- Modelos de datos como `interface` en `models/`.
- Supabase: `createClient(environment.supabaseUrl, environment.supabasePublishableKey)`; las llamadas devuelven Promises con `{ data, error }` → **siempre revisar `error`**.
- Config en `src/environments/environment.ts` (`supabaseUrl`, `supabasePublishableKey`).
- **Nunca** usar en el front la API de administración de Supabase (`auth.admin.*`) ni la service role key: solo la publishable key.
- Estilos globales con variables CSS en `:root` dentro de `src/styles.css` (como `guards/src/styles.css`). El estilo visual tiene que ser propio y cuidado.

---

## 6. Roles y navegación

- Roles: **anónimo**, **cliente**, **empleado**, **admin**.
- El rol es un campo `rol` en la tabla `perfiles` (**por rol, no por mail**, como indicó el profe).
- **Un solo login**: después de loguearse, se redirige según el rol. El registro público solo crea clientes. Admin y empleados se crean poniendo el rol a mano en Supabase.
- Rutas protegidas con guards (`authGuard`, `roleGuard` con `canMatch`) siguiendo `../A342-2/guards`, pero leyendo usuario y rol de Supabase (no de localStorage).
- Se puede comprar sin cuenta (anónimo).

---

## 7. Modelo de datos (Supabase)

Borrador; confirmar conmigo antes de crear o cambiar tablas.

| Tabla | Campos principales |
|---|---|
| `perfiles` | id (= id de Supabase Auth), nombre, apellido, fecha_nacimiento, tipo_sangre, color_ojos, dias_vacaciones, rol, puntos, credito |
| `peliculas` | nombre, sinopsis, duracion_min, imagen, restriccion_edad (0/13/18), fecha_estreno, dias_preventa, precio_preventa, activa |
| `generos`, `pelicula_generos` | relación N:M |
| `salas` | nombre |
| `butacas` | sala_id, fila (A–T), numero, tipo (normal / accesible / vip) |
| `funciones` | pelicula_id, sala_id, inicio, fin, formato (2D/3D/4D/5D), idioma (castellano/subtitulada), precio |
| `compras` | usuario_id (nulo si anónimo), total, descuento, credito_usado, puntos_ganados, estado, codigo_qr, entrada_validada, candy_entregado |
| `entradas` | compra_id, funcion_id, butaca_id, precio, estado |
| `categorias`, `productos`, `compra_productos` | candy bar |
| `combos` (+ ítems) | precio fijo |
| `cupones` | porcentaje, edad_minima, solo_primera_compra, activo |
| `resenas` | pelicula_id, usuario_id, estrellas, comentario |
| `recompensas`, `canjes` | costo en puntos; historial |
| `alertas_estreno` | usuario_id, pelicula_id |
| `log_actividad` | usuario_id, accion, detalle, fecha |

Para "borrar" o cancelar se usa un campo `estado` + `update` (el material solo muestra `select`, `insert`, `update`).

---

## 8. Distribución de butacas (igual en todas las salas)

Numeración **por posición**: los números **5 y 26 no existen** (son los pasillos entre bloques).

| Filas | Butacas | Tipo |
|---|---|---|
| A–I | 1–4 · 6–25 · 27–30 (28 por fila) | normal |
| J | 2–3 · 11–20 · 28–29 (14) | **accesible** |
| K | no existe (pasillo) | — |
| L–Q | 1–4 · 6–25 · 27–30 | normal |
| R, S, T | 1–4 · 6–25 · 27–30 | **vip** (más caras) |

Total: **518 butacas por sala**. Se generan por código/script, no a mano.
Mapa: cada fila se dibuja como 30 posiciones; donde no hay butaca va un hueco (`null`), así todo queda alineado. Clases con `ngClass`: `ocupada`, `seleccionada`, `accesible`, `vip`.

---

## 9. Reglas de negocio clave

- **30 minutos** mínimo entre el fin de una función y el inicio de la siguiente en la misma sala. Conflicto si `nuevo.inicio < existente.fin + 30min` **y** `existente.inicio < nuevo.fin + 30min`.
- **Asignación automática de sala**: el admin elige película, días y hora; el sistema busca la primera sala sin conflicto para cada día. Si no hay, avisa.
- **Cupón primera compra** (% configurable) para registrados sin compras previas. **Cupones +50 años** según fecha de nacimiento. Un cupón por compra: el de mayor descuento.
- **Restricción de edad** 13/18: menores no pueden comprar; la entrada aclara que debe ir un adulto.
- **Un QR por compra** con dos marcas (entrada validada / candy entregado). Una vez usado, deja de servir. Validación por escaneo o **código manual**.
- **Puntos**: 1 por peso pagado (solo registrados); canjeables; no transferibles; se revierten al cancelar.
- **Preventa**: desde `estreno − 7 días` hasta el estreno, precio especial configurable por película.
- **Cancelación** hasta 2 h antes de la función → **crédito** en la cuenta (no reembolso), usable junto con otro medio de pago.
- **Log de actividad**: registrar quién creó funciones, cambió precios o validó QR, con fecha y hora (`LogService`).
- **UX**: nada de selectores de fecha con calendario desplegable ni scroll excesivo. Días y horarios como botones; compra por pasos.
- **Fuera de alcance**: mapa del cine (el cliente no dio luz verde).

---

## 10. Pendiente de confirmar con el profe (NO implementar sin mi OK)

Estos temas **no se vieron en clase**. Si llegamos a uno, frená y preguntame:

- Generación del **PDF** de la entrada y del **QR**.
- **Lector de QR** con cámara (el ingreso manual del código sí se puede hacer).
- **Butacas en tiempo real** (¿Supabase Realtime?).
- **Notificaciones** de "Próximamente".
- **Exportar a PDF/Excel** y **gráficos** del admin.
- **Imágenes** de películas: ¿Supabase Storage o URL en un campo?
- **Seguridad RLS** en Supabase.
- **Pago**: ¿alcanza con uno simulado?

---

## 11. Estado del proyecto

Actualizá esta sección (con mi OK) cada vez que terminemos un paso.

| Pre-entrega | Objetivo | Estado |
|---|---|---|
| Lun 21/09 | Repo + proyecto Angular + primer deploy | ⏳ |
| Mié 23/09 | **S0** completo (PWA, rutas, estilos base, tablas) + **S1A** (registro, login, roles) + **S1B** (alta de películas y funciones desde el admin) | ⏳ |
| Lun 28/09 | **S1C** (cartelera, butacas, compra, cupón, QR) + **S2** (reseñas, promedio, top 3, buscador por género) | ⏳ |
| Mié 30/09 | **S3** (cupones, candy bar) + **S4** (empleados, validación QR, asignación automática de salas) | ⏳ |
| Lun 05/10 | **S5–S9** + README y documento de requerimientos | ⏳ |

Orden de trabajo recomendado por el profe: **primero lo que carga el admin, después lo que consume el cliente.**

**Próximo paso:** S0 — crear el proyecto Angular 22, estructura de carpetas, `environment.ts`, rutas base con `'**'` al final, layout con navbar/footer, variables CSS, `ng add @angular/pwa` y primer deploy en Firebase Hosting.
