# CineApp — Documento de requerimientos

Resumen de los requerimientos de la consigna y de los mails del cliente, con su estado en la aplicación.

Referencias: ✅ implementado · ⚠️ implementado con una interpretación o alternativa (ver "Criterios adoptados") · ❌ no implementado

---

## Consigna

| Requerimiento | Estado |
|---|---|
| Documento que resuma todos los requerimientos | ✅ este archivo |
| Aplicación completa con los temas vistos en clase | ✅ |
| Aplicación desplegada con URL funcional | ✅ https://cine-app-flax.vercel.app (Vercel) |
| Código en GitHub | ✅ https://github.com/SirRulo/CineApp_TP1 |
| Arquitectura y decisiones técnicas documentadas | ✅ [README.md](README.md) |
| Estilo visual propio | ✅ paleta y tipografías propias en `styles.css` |
| Integración con Supabase (auth y base de datos) | ✅ |
| PWA | ✅ `@angular/pwa` (service worker + manifest) |

## Mail 01/01 · Sistema base

| Requerimiento | Estado | Dónde |
|---|---|---|
| Página propia para sacar entradas | ✅ | cartelera → detalle → butacas → candy → pago |
| Un edificio con varias salas | ⚠️ | 4 salas cargadas en la base; sin pantalla de administración de salas |
| La compra genera un PDF con los datos y un QR para ingresar | ✅ | confirmación de la compra: QR + "Descargar entrada (PDF)" |
| Salas de 20 filas con letras, bloques de 4, 20 y 4 butacas | ✅ | `butacas` (518 por sala), mapa en `SeleccionButacas` |
| Elegir qué películas aparecen en la página (cartelera) | ✅ | `activa` y `destacada` en el admin de películas |
| Horarios de cada película (funciones) | ✅ | alta, listado y activar/desactivar funciones |
| Formato 2D, 3D, 4D o 5D | ✅ | |
| Idioma castellano o subtitulada | ✅ | |
| Película con duración, imagen, nombre y sinopsis | ✅ | `AltaPelicula` |
| 30 minutos entre el fin de una función y el inicio de la siguiente en la sala | ✅ | validador propio del formulario + control al reactivar |
| Registro con mail, nombre, apellido, nacimiento, tipo de sangre, color de ojos y días de vacaciones | ✅ | `Registro` |
| Cupón de 20 % en la primera compra por registrarse | ✅ | `BIENVENIDA`, automático en la compra |
| Compra sin registrarse | ✅ | películas ATP |

## Mails 16/01 · Reseñas, más vendidas, buscador y géneros

| Requerimiento | Estado | Dónde |
|---|---|---|
| Reseñas con estrellas y comentario corto | ✅ | detalle de la película (solo registrados, una por película) |
| Reseñas visibles antes de sacar la entrada | ✅ | entre la ficha y las funciones |
| Puntaje promedio | ✅ | pipe propio `promedio` |
| Primero las 3 películas más vendidas | ✅ | "Las más vistas" en `Home` |
| Buscador de películas | ✅ | pipe propio `filtro` |
| Filtro por género; varias categorías por película | ✅ | relación N:M `pelicula_generos` |

## Mail 30/01 · Cupones y candy bar

| Requerimiento | Estado | Dónde |
|---|---|---|
| % del cupón de primera compra configurable | ✅ | admin › Cupones |
| Crear cupones para mayores de 50 | ✅ | admin › Cupones (alta con edad mínima) |
| Productos del candy bar con categorías | ✅ | admin › Candy bar |
| Comprar productos junto con la entrada | ✅ | paso `/candy` de la compra |
| Retirar los productos con el mismo QR | ✅ | un código por compra; el empleado marca "candy entregado" |
| Mapa del cine | — | fuera de alcance: el cliente no dio luz verde |

## Mail 06/02 · Roles y validación

| Requerimiento | Estado | Dónde |
|---|---|---|
| Administrador de salas, funciones, distribución de butacas, productos | ⚠️ | funciones, productos, películas y cupones sí; salas y distribución fijas en la base |
| Empleados que validan los QR (ingreso y candy bar) | ✅ | `/empleado` |
| Ingreso manual del código si falla el lector | ✅ | formulario de código |
| El QR deja de servir una vez usado | ✅ | `update … where … is null`: cada marca una sola vez |
| Asignación automática de sala | ✅ | admin › Programar funciones |
| Una película varios días a la misma hora | ✅ | días como botones de selección múltiple |

## Mail 12/02 · Edad, accesibilidad y tiempo real

| Requerimiento | Estado | Dónde |
|---|---|---|
| Restricción de edad ATP / +13 / +18 | ✅ | `edad_minima` de la película |
| Menores no pueden comprar | ✅ | detalle y pago (`Auth.restriccionDeEdad`) |
| La entrada aclara que debe ir un adulto | ✅ | confirmación y pantalla del empleado |
| Fila de butacas para personas con discapacidad (2, 10 y 2) | ⚠️ | fila J accesible y K como pasillo (ver criterios) |
| Butacas accesibles resaltadas | ✅ | color propio y leyenda |
| Butacas ocupadas en tiempo real | ✅ | Supabase Realtime |

## Mail 28/02 · Usabilidad y reporte

| Requerimiento | Estado | Dónde |
|---|---|---|
| Interfaces fáciles para clientes y empleados | ✅ | compra por pasos; el empleado solo ingresa un código |
| Sin calendarios desplegables lentos | ✅ | días y horarios como botones; fechas lejanas en 3 campos numéricos |
| Evitar el scroll excesivo | ✅ | funciones de un día por vez |
| Reporte de facturación por día y entradas vendidas | ✅ | admin › Reportes |

## Mail 03/03 · Puntos y combos

| Requerimiento | Estado |
|---|---|
| 1 punto por peso gastado (registrados) | ✅ al pagar (sobre lo cobrado, sin el crédito); se revierte al cancelar |
| Canje de puntos por entradas o candy | ❌ |
| Admin configura los puntos de cada recompensa | ❌ |
| Perfil con puntos e historial de canjes | ⚠️ saldo de puntos en "Mis compras"; sin canjes |
| Los puntos no se transfieren | ✅ solo los suma o resta el sistema, siempre del mismo usuario |
| Combos a precio fijo, destacados en la compra | ❌ |

Las tablas `recompensas`, `combos` y `combo_productos` están creadas; falta la parte de Angular.

## Mail 08/03 · Próximamente, preventa y Mis películas

| Requerimiento | Estado | Dónde |
|---|---|---|
| Preventa desde 7 días antes del estreno con precio especial por película | ✅ | `precio_preventa` en la película; se aplica en el mapa de butacas |
| Sección "Próximamente" | ❌ | (el detalle sí muestra "Estrena DD/MM" y bloquea la venta) |
| Alerta cuando se habilita la venta | ❌ | |
| "Mis películas" | ❌ | |

## Mail 10/03 · Cancelaciones, VIP, reportes y log

| Requerimiento | Estado | Dónde |
|---|---|---|
| Cancelar hasta 2 h antes | ✅ | Mis compras |
| Devolución como crédito, combinable con otro medio de pago | ✅ | saldo en Mis compras; checkbox al pagar |
| Butacas VIP (filas R, S, T) más caras y marcadas en el mapa | ✅ | `precio_vip` por función |
| Exportar el reporte a PDF | ✅ | `window.print()` |
| Exportar el reporte a Excel | ✅ | CSV que abre Excel (sin librerías) |
| Gráfico de películas más vistas por semana y por mes | ✅ | barras, 7 / 30 días |
| Producto del candy más vendido | ✅ | top 5 del período |
| Log: quién creó funciones, cambió precios, validó QR, con fecha y hora | ✅ | admin › Actividad |

---

## Criterios adoptados

Puntos que los mails no definen y cómo se resolvieron:

| Tema | Criterio |
|---|---|
| Filas J y K | El mail 12/02 dice que se quitaron dos filas para dar lugar a una con 2, 10 y 2 butacas. Se tomó la **J como fila accesible** y la **K como pasillo**, como en el Excel de la cátedra |
| Edad en compras sin cuenta | Las películas +13/+18 piden iniciar sesión (la edad sale de la fecha de nacimiento del perfil). Las ATP se compran sin cuenta |
| "Lunes, martes y viernes a las 18 h" | El admin elige días sueltos entre los próximos 14 y una hora; para cada día se busca la primera sala libre |
| Semana / mes del gráfico | Últimos 7 y últimos 30 días, por fecha de compra |
| Cupones | Un cupón por compra: el de mayor %. Se aplica solo sobre las entradas, no sobre el candy |
| Preventa | Durante la preventa todas las entradas (también VIP) cuestan el precio de preventa |
| Validación del ingreso | Desde 1 h antes del inicio hasta el fin de la función. El candy, en cualquier momento |
| Butacas por compra | Máximo 10 |
| Pago | Simulado (sin datos de tarjeta) |
| QR | Imagen generada por un servicio externo con el código de la compra; el empleado lo valida escribiendo el código |
| Puntos | 1 por peso de lo cobrado con el medio de pago (`total`). Lo pagado con crédito no suma: esa plata ya había sumado puntos en la compra cancelada |
| Borrado | Baja lógica (`activa` / `estado`); no se borran datos |
