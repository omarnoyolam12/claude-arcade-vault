# SPEC 03 — Menú de inicio y pausa

> **Estado:** Implementado
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-08-28
> **Objetivo:** Reemplazar la pantalla de inicio por un menú de Nueva partida / Reanudar y añadir pausa con `P` (overlay) y `Esc` (menú de pausa), con la partida en curso persistida en `localStorage` al pausar.

---

## Por qué existe esta spec

SPEC 01 dejó `INICIO` como una pantalla de un solo texto ("Pulsa Espacio para jugar") y `FIN` reiniciaba directamente con `Espacio`. Esta spec convierte `INICIO` en un menú navegable, introduce un estado de pausa (que SPEC 01 y SPEC 02 marcaron explícitamente como fuera de alcance) y añade la primera persistencia de partida —no solo del highscore—, con su propia clave versionada en `localStorage`. Se apoya en dos módulos nuevos (`js/menu.js` para el dibujo y el hit-test de los menús, y ampliaciones a `js/storage.js`) para no engordar `hud.js` ni mezclar la lógica de menús con el HUD de juego.

---

## Alcance

**In:**

- Nueva pantalla `PAUSA` en `PANTALLAS` (`js/state.js`). El resto de estados de SPEC 01 se mantienen.
- La pantalla `INICIO` pasa a ser un menú con dos opciones: **Nueva partida** (índice 0) y **Reanudar** (índice 1).
  - Navegación con `ArrowUp` / `ArrowDown` (con clamp, sin wrap) y confirmación con `Espacio`, `Enter` o clic de ratón sobre la opción.
  - **Reanudar** aparece atenuada y no seleccionable cuando no hay partida guardada válida; en ese caso la selección queda forzada al índice 0.
  - El menú sigue mostrando el highscore, como hoy.
- **Nueva partida**: borra el guardado, reinicia contadores y arranca en el nivel 1 (comportamiento actual de `reiniciarContadores()` + `empezarNivel()`).
- **Reanudar**: carga el guardado, reconstruye el nivel guardado con sus bloques rotos, restaura `puntuacion`, `vidas` y `bola.rapidez`, deja la bola pegada al paddle esperando `Espacio`, borra el guardado y pasa a `JUGANDO`.
- Pausa durante `JUGANDO`:
  - `P` → **pausa rápida**: overlay simple sobre el juego congelado. `P` reanuda; `Esc` pasa al menú de pausa.
  - `Esc` → **menú de pausa**: overlay con dos opciones, **Continuar** (índice 0) y **Menú principal** (índice 1), navegable igual que el menú de inicio. `P` o `Esc` reanudan directamente.
  - En ambos casos, al entrar en `PAUSA` se escribe la partida guardada en `localStorage`.
  - En `PAUSA` se congela todo: bola, paddle y las explosiones de SPEC 02 (no avanza `dt` para nada del juego).
- **Menú principal** desde la pausa: vuelve a `INICIO`. El guardado ya escrito al pausar queda disponible, así que **Reanudar** aparece activa. La partida en memoria se descarta.
- El guardado se **borra** en tres momentos: al elegir **Reanudar** (se consume), al elegir **Nueva partida**, y al entrar en `FIN` (victoria o derrota).
- La pantalla `FIN` deja de reiniciar con `Espacio`: ahora `Espacio` vuelve al menú de inicio. El texto cambia a "Pulsa Espacio para volver al menú".
- Nueva clave `localStorage`: `arkanoid:savegame:v1`, independiente de `arkanoid:highscore:v1`.
- Nuevo módulo `js/menu.js`: layout de botones compartido entre dibujo y hit-test, funciones de dibujo de los tres overlays (menú inicio, overlay de pausa rápida, menú de pausa) y `opcionEnPunto(x, y, cantidad)`.
- Ampliación de `js/input.js`: buffer de teclas discretas (`consumirTecla(code)` para `KeyP`, `Escape`, `ArrowUp`, `ArrowDown`, `Enter`), buffer de clic (`consumirClic()`) y `input.ratonY`.

**Fuera de alcance (para specs futuras):**

- Guardar la posición y la velocidad exactas de la bola y del paddle: al reanudar, la bola vuelve pegada al paddle.
- Guardar o restaurar explosiones de SPEC 02 en curso.
- Guardado automático continuo o al cerrar la pestaña (`beforeunload`): solo se guarda al pausar.
- Varias ranuras de guardado, nombre de partida o fecha.
- Menú de opciones, dificultad, control de volumen, remapeo de teclas.
- Animación o transición entre pantallas; los overlays aparecen y desaparecen de golpe.
- Pausa fuera de `JUGANDO` (en menús o en `FIN` las teclas `P` / `Esc` no hacen nada).
- Soporte táctil o de gamepad para navegar los menús.
- Migración de formatos de guardado antiguos: un guardado con `version` distinta se ignora.

---

## Modelo de datos

Esta spec añade una estructura nueva (la partida guardada) y tres campos al `state` global. No cambia `paddle`, `bola` ni el objeto `bloque` de SPEC 01.

### `js/state.js`

```js
// PANTALLAS gana un estado nuevo.
export const PANTALLAS = {
  INICIO: 'INICIO',
  JUGANDO: 'JUGANDO',
  PAUSA: 'PAUSA',
  FIN: 'FIN',
};

// Campos nuevos en state (además de los de SPEC 01):
const state = {
  // ...campos de SPEC 01...
  pausaConMenu: false, // en PAUSA: false = overlay rápido (P), true = menú de pausa (Esc)
  menuIndice: 0,       // opción resaltada del menú activo (INICIO o PAUSA); se pone a 0 al entrar
  hayGuardado: false,  // cache de hayPartidaGuardada(); se refresca al entrar en INICIO
};
```

### `js/storage.js` — partida guardada

```js
const CLAVE_PARTIDA = 'arkanoid:savegame:v1';

// Forma del objeto JSON guardado:
const partidaGuardada = {
  version: 1,
  nivelIndice: 0,   // 0..NIVELES.length - 1
  puntuacion: 0,
  vidas: 3,
  rapidez: 260,     // bola.rapidez del nivel en curso
  vivos: [          // matriz fila x columna, paralela a NIVELES[nivelIndice]
    [true, true, false, /* ... */],
    // ...una sublista por fila del layout, con el mismo nº de columnas
  ],
};
```

API nueva de `storage.js` (toda envuelta en `try/catch`, importa `NIVELES` de `levels.js` para validar):

- `guardarPartida(datos)` — `localStorage.setItem(CLAVE_PARTIDA, JSON.stringify(datos))`.
- `cargarPartida()` — devuelve el objeto, o `null` si: falta la clave, no parsea, `version !== 1`, `nivelIndice` fuera de `[0, NIVELES.length - 1]`, o las dimensiones de `vivos` no coinciden con `NIVELES[nivelIndice]` (nº de filas y nº de columnas por fila).
- `hayPartidaGuardada()` — `cargarPartida() !== null`.
- `borrarPartida()` — `localStorage.removeItem(CLAVE_PARTIDA)`.

### `js/menu.js` — layout de menús

```js
// Rectángulo de una opción, en px lógicos del canvas (800x600). Idéntico
// entre dibujo y hit-test: ambos llaman a rectOpcion().
function rectOpcion(indice, cantidad) {
  // columna centrada, ancho fijo, alto fijo, apiladas verticalmente y
  // centradas respecto a ALTO. Devuelve { x, y, ancho, alto }.
}

// opcionEnPunto(x, y, cantidad) -> índice de la opción cuyo rect contiene (x, y), o -1.
```

### `js/input.js` — entrada discreta

```js
export const input = {
  izquierda: false,
  derecha: false,
  ratonX: null, // px lógicos, o null si el cursor no está sobre el canvas
  ratonY: null, // px lógicos, o null
};

// Teclas discretas con detección de flanco (no repetición):
// consumirTecla('KeyP' | 'Escape' | 'ArrowUp' | 'ArrowDown' | 'Enter') -> boolean
// consumirClic() -> { x, y } (px lógicos) una sola vez, o null
```

Convenciones: se reutilizan las de SPEC 01 (origen arriba-izquierda, px lógicos 800x600). El tiempo de las explosiones y de la física se congela en `PAUSA` simplemente no llamando a `actualizar()` del juego en ese estado.

---

## Plan de implementación

Cada paso deja el juego ejecutable (`python3 -m http.server` y abrir `index.html`).

1. **`js/state.js`.** Añadir `PAUSA` a `PANTALLAS`. Añadir `pausaConMenu: false`, `menuIndice: 0`, `hayGuardado: false` al objeto `state`. Verificar: la página carga sin errores y el juego se comporta igual que antes.

2. **`js/input.js`.** Añadir `input.ratonY` (fijarlo en `mousemove` y ponerlo a `null` en `mouseleave`, junto a `ratonX`). Añadir un `Set` de teclas discretas pendientes que se rellena en `keydown` (sin `e.repeat`) para `KeyP`, `Escape`, `ArrowUp`, `ArrowDown`, `Enter`, y `consumirTecla(code)` que devuelve `true` una vez y borra la entrada. Añadir un listener de `click` sobre el canvas que guarda `{ x, y }` en px lógicos (misma conversión que `mousemove`) y `consumirClic()` que lo devuelve una vez y lo pone a `null`. Exportar `consumirTecla` y `consumirClic`. Verificar: en consola sin errores; flechas, `A`/`D` y `Espacio` siguen moviendo el paddle y lanzando la bola.

3. **`js/storage.js`.** Añadir `CLAVE_PARTIDA` y las funciones `guardarPartida(datos)`, `cargarPartida()`, `hayPartidaGuardada()`, `borrarPartida()`, con la validación descrita en el modelo de datos e importando `NIVELES`. Verificar: desde la consola, `guardarPartida({version:1,nivelIndice:0,puntuacion:10,vidas:2,rapidez:260,vivos:...})` seguido de `cargarPartida()` devuelve el mismo objeto; escribir un JSON corrupto en la clave y `cargarPartida()` devuelve `null`.

4. **`js/entities.js`.** Añadir `snapshotBloquesVivos(nivelIndice)` que devuelve la matriz `vivos` (dimensiones del layout de `NIVELES[nivelIndice]`, `true`/`false` por celda a partir de la posición de cada bloque de `bloques`) y `aplicarBloquesVivos(vivos)` que recorre `bloques` y fija `b.vivo` según `vivos[fila][col]` (fila/col derivadas de `b.y`/`b.x` con `MARGEN_*` y `BLOQUE_*`). Verificar: tras `construirNivel(0)`, `aplicarBloquesVivos(snapshotBloquesVivos(0))` no cambia nada; poner a `false` una fila de la matriz y volver a aplicar oculta esos bloques al redibujar.

5. **`js/menu.js` (nuevo).** Crear el módulo con `rectOpcion(indice, cantidad)`, `opcionEnPunto(x, y, cantidad)`, `dibujarMenuInicio(ctx, state, hayGuardado)` (título "ARKANOID", las dos opciones con la resaltada según `state.menuIndice`, "Reanudar" atenuada si `!hayGuardado`, highscore debajo), `dibujarPausaOverlay(ctx)` (capa oscura translúcida + "PAUSA" + "P: continuar · Esc: menú") y `dibujarMenuPausa(ctx, state)` (capa oscura + "PAUSA" + opciones "Continuar" / "Menú principal"). Nadie lo llama todavía. Verificar: la página carga sin errores en consola.

6. **`js/main.js` — menú de inicio.** Importar de `menu.js` y de `storage.js` (`hayPartidaGuardada`, `cargarPartida`, `borrarPartida`, `guardarPartida`). Añadir helpers: `irAInicio()` (`state.pantalla = INICIO`, `state.menuIndice = 0`, `state.hayGuardado = hayPartidaGuardada()`); `nuevaPartida()` (`borrarPartida()`, `reiniciarContadores()`, `empezarNivel()`); `reanudarPartida()` (`cargarPartida()`; si `null`, no hace nada; si no, fija `nivelIndice`/`puntuacion`/`vidas`, `construirNivel(nivelIndice)`, `aplicarBloquesVivos(vivos)`, `bola.rapidez = rapidez`, `centrarPaddle()`, `state.bolaLanzada = false`, `pegarBolaAlPaddle()`, `limpiarExplosiones()`, `borrarPartida()`, `state.hayGuardado = false`, `state.pantalla = JUGANDO`). Reescribir la rama `INICIO` de `actualizar()`: si `!state.hayGuardado` forzar `state.menuIndice = 0`; `ArrowUp`/`ArrowDown` mueven `menuIndice` en `[0, 1]` con clamp; `consumirClic()` sobre una opción la selecciona y confirma; confirmar (`Espacio` / `Enter` / clic) ejecuta `nuevaPartida()` (índice 0) o `reanudarPartida()` (índice 1, solo si `hayGuardado`). En `dibujar()`, `case INICIO` → `dibujarMenuInicio(ctx, state, state.hayGuardado)`. Llamar `irAInicio()` en el arranque (antes de `requestAnimationFrame`). Verificar: el menú muestra las dos opciones; sin guardado "Reanudar" está atenuada y no seleccionable; "Nueva partida" (tecla o clic) arranca el nivel 1.

7. **`js/main.js` — entrar en pausa y dibujarla.** Añadir helper `guardarEstadoPartida()` que arma `{ version: 1, nivelIndice, puntuacion, vidas, rapidez: bola.rapidez, vivos: snapshotBloquesVivos(state.nivelIndice) }` y llama `guardarPartida(...)`. Al principio de la rama `JUGANDO` de `actualizar()`: `consumirTecla('KeyP')` → `guardarEstadoPartida()`, `state.pausaConMenu = false`, `state.pantalla = PAUSA`, `return`; `consumirTecla('Escape')` → `guardarEstadoPartida()`, `state.pausaConMenu = true`, `state.menuIndice = 0`, `state.pantalla = PAUSA`, `return`. En `dibujar()`, `case PAUSA`: pintar el juego congelado (`dibujarBloques`, `dibujarEfectos`, `dibujarPaddle`, `dibujarBola`, `dibujarHud`) y encima `dibujarMenuPausa` si `state.pausaConMenu`, si no `dibujarPausaOverlay`. Verificar: en juego, `P` congela todo con el overlay simple; `Esc` congela y muestra el menú de pausa; aparece `arkanoid:savegame:v1` en `localStorage`.

8. **`js/main.js` — rama `PAUSA` en `actualizar()`.** Si `!state.pausaConMenu` (overlay rápido): `consumirTecla('KeyP')` → `state.pantalla = JUGANDO`; `consumirTecla('Escape')` → `state.pausaConMenu = true`, `state.menuIndice = 0`. Si `state.pausaConMenu` (menú de pausa): `consumirTecla('KeyP')` o `consumirTecla('Escape')` → `state.pantalla = JUGANDO`; `ArrowUp`/`ArrowDown` mueven `menuIndice` en `[0, 1]` con clamp; confirmar (`Espacio` / `Enter` / clic vía `opcionEnPunto`) ejecuta: índice 0 → `state.pantalla = JUGANDO`; índice 1 → `irAInicio()`. Verificar: se pasa del overlay al menú con `Esc` y se reanuda con `P`; "Continuar" retoma la partida exactamente donde estaba; "Menú principal" lleva al menú de inicio con "Reanudar" ya activa, y al reanudar la partida es la misma.

9. **`js/main.js` y `js/hud.js` — cierre de partida.** En `terminarPartida()` añadir `borrarPartida()` (antes de cambiar de pantalla). En la rama `FIN` de `actualizar()`, sustituir `reiniciarContadores()` + `empezarNivel()` por `irAInicio()` cuando se consume `Espacio`. En `js/hud.js`, `dibujarFin()` cambia el texto final a `"Pulsa Espacio para volver al menú"`. Verificar: al ganar o perder, `arkanoid:savegame:v1` desaparece de `localStorage`; `Espacio` en `FIN` vuelve al menú de inicio con "Reanudar" deshabilitada; el highscore sigue guardándose como en SPEC 01.

---

## Criterios de aceptación

- [ ] `index.html` servido por HTTP carga sin errores ni warnings en consola.
- [ ] Al abrir el juego se ve un menú con "Nueva partida" y "Reanudar", más el highscore.
- [ ] Sin partida guardada, "Reanudar" se dibuja atenuada, no se puede seleccionar con las flechas ni confirmar, y el clic sobre ella no hace nada.
- [ ] `ArrowUp`/`ArrowDown` mueven la selección entre las dos opciones sin salirse del rango (sin wrap).
- [ ] "Nueva partida" (con `Espacio`, `Enter` o clic) arranca una partida en el nivel 1 con puntuación 0 y 3 vidas.
- [ ] Pulsar `P` durante `JUGANDO` congela la bola, el paddle y cualquier explosión en curso, y muestra el overlay "PAUSA" con la ayuda de teclas.
- [ ] Estando en la pausa rápida, `P` reanuda exactamente donde estaba la partida y `Esc` pasa al menú de pausa.
- [ ] Pulsar `Esc` durante `JUGANDO` muestra el menú de pausa con "Continuar" y "Menú principal".
- [ ] Estando en el menú de pausa, `P` o `Esc` reanudan la partida; "Continuar" también.
- [ ] Al entrar en pausa (por `P` o por `Esc`) se escribe `localStorage['arkanoid:savegame:v1']` con `nivelIndice`, `puntuacion`, `vidas`, `rapidez` y la matriz `vivos` del nivel en curso.
- [ ] "Menú principal" desde la pausa lleva al menú de inicio y allí "Reanudar" aparece activa.
- [ ] "Reanudar" carga el nivel guardado con los bloques ya rotos ausentes, restaura puntuación, vidas y velocidad de la bola, y deja la bola pegada al paddle esperando `Espacio`.
- [ ] Tras "Reanudar", `localStorage['arkanoid:savegame:v1']` ya no existe y "Reanudar" vuelve a estar deshabilitada hasta la siguiente pausa.
- [ ] "Nueva partida" borra cualquier `arkanoid:savegame:v1` existente antes de arrancar.
- [ ] Llegar a `FIN` por victoria o por derrota borra `arkanoid:savegame:v1`.
- [ ] En `FIN`, `Espacio` vuelve al menú de inicio (no reinicia una partida) y el texto dice "Pulsa Espacio para volver al menú".
- [ ] Un `arkanoid:savegame:v1` corrupto, con `version` distinta de 1, con `nivelIndice` fuera de rango o con `vivos` de dimensiones que no cuadran con el nivel se trata como "sin guardado" y no rompe el juego.
- [ ] Con `localStorage` deshabilitado (modo privado) el juego sigue funcionando: "Reanudar" queda siempre deshabilitada y pausar no lanza excepción.
- [ ] Las teclas `P` y `Esc` no tienen efecto en `INICIO` ni en `FIN`.
- [ ] El highscore se sigue guardando y mostrando igual que en SPEC 01.
- [ ] `js/menu.js` no importa nada de `collisions.js` ni de `effects.js` (solo dibujo y geometría de menús).

---

## Decisiones

- **Sí:** `INICIO` se convierte en el menú Nueva/Reanudar y `FIN` vuelve a ese menú. Un único punto de entrada a las partidas; el flujo de SPEC 01 ("Espacio reinicia en FIN") se rompe a propósito y su criterio queda superado por esta spec.
- **No:** añadir una pantalla `MENU` separada y conservar `INICIO` ("Pulsa Espacio") detrás. Sería un paso extra sin valor para el jugador.
- **Sí:** guardar solo al pausar. Es el momento en que el jugador decide parar; una sola llamada a `localStorage` por pausa, sin bucle de autoguardado.
- **No:** autoguardado continuo o en `beforeunload`. Más robusto ante cierres bruscos pero escribe en `localStorage` constantemente y complica el ciclo de vida del guardado; se puede revisar en otra spec.
- **Sí:** al reanudar, la bola vuelve pegada al paddle. Reutiliza `pegarBolaAlPaddle()` de SPEC 01 y evita serializar posición y velocidad de bola y paddle.
- **No:** guardar bola y paddle exactos. Da una reanudación "sin costura" pero añade cuatro campos frágiles al guardado y un caso raro (bola a mitad de rebote) por poco beneficio.
- **Sí:** `vivos` como matriz de booleanos fila×columna paralela a `NIVELES[nivelIndice]`. Es legible al depurar y se valida comparando dimensiones con el layout.
- **No:** lista de celdas rotas o bitmask por fila. Más compactas pero menos claras y con la misma necesidad de validación.
- **Sí:** borrar el guardado al reanudar (se consume), al empezar nueva y en `FIN`. El guardado representa "una partida pausada pendiente"; en cuanto se retoma o se termina, deja de tener sentido.
- **No:** conservar el guardado entre reanudaciones. Permitiría volver siempre al último punto de pausa (save-scumming) y difumina qué partida es la "actual".
- **Sí:** `P` y `Esc` intercambiables dentro de la pausa. Desde el overlay rápido se llega al menú con `Esc` y desde el menú se reanuda con `P` o `Esc`; una sola idea mental de "salir de la pausa".
- **Sí:** "Menú principal" desde la pausa deja el guardado escrito (ya se hizo al pausar) y descarta la partida en memoria. Volver al menú no penaliza: "Reanudar" recupera justo ese punto.
- **Sí:** módulo nuevo `js/menu.js` para dibujo y hit-test de los menús. `hud.js` se queda con una sola responsabilidad (HUD de juego y textos de `FIN`).
- **No:** meter los menús en `hud.js`. Menos archivos pero mezcla el HUD con la geometría de botones y el hit-test de ratón.
- **Sí:** clave `arkanoid:savegame:v1`, separada de `arkanoid:highscore:v1`. Sufijo `:v1` para poder cambiar el formato del guardado sin tocar el highscore.
- **Sí:** en `PAUSA` no se llama a la lógica de `actualizar()` del juego, así que `dt` no avanza para nada. Congela física y explosiones sin código de "congelación" por entidad.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `localStorage` deshabilitado (modo privado) lanza excepción al guardar o al leer el guardado | `guardarPartida` / `cargarPartida` / `borrarPartida` envueltas en `try/catch`; `hayPartidaGuardada()` devuelve `false`, "Reanudar" queda deshabilitada y pausar no falla. |
| Un guardado viejo deja de cuadrar si en el futuro se editan los layouts de `NIVELES` | `cargarPartida()` compara las dimensiones de `vivos` con `NIVELES[nivelIndice]`; si no cuadran, devuelve `null` y el menú trata la partida como inexistente. |
| El guardado queda desfasado respecto a la partida en curso (solo se escribe al pausar; perder una vida o cambiar de nivel después no lo actualiza) | Es intencional: el guardado representa el último punto de pausa. Se borra al terminar la partida, así que nunca sobrevive a un `FIN`. |
| `Esc` es usada por el navegador para salir de pantalla completa y podría no llegar al juego | El juego no entra en pantalla completa por sí mismo; si el usuario lo hace, `P` sigue disponible para pausar. |
| Doble disparo de confirmación si el clic sobre una opción coincide con `Espacio` en el mismo frame | `consumirClic()` y `consumirEspacio()` son de un solo uso por pulsación; la acción (nueva/reanudar/continuar) es idempotente respecto al estado resultante. |

---

## Lo que **no** entra en esta spec

- Guardar posición y velocidad exactas de la bola y del paddle.
- Autoguardado continuo o al cerrar la pestaña.
- Varias ranuras de guardado, nombre de partida o fecha.
- Menú de opciones, dificultad, volumen o remapeo de teclas.
- Transiciones o animaciones entre pantallas.
- Pausa fuera de `JUGANDO` y navegación de menús por gamepad o táctil.
- Migración de formatos de guardado con `version` distinta.

Cada uno, si llega, va en su propia spec.
