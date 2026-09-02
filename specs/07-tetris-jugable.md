# SPEC 07 — Tetris jugable en `/jugar/tetris` con guardado de puntuación

> **Status:** Aprobado
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-09-02
> **Objective:** Integrar el juego canvas de `resources/started-games/03-claude-tetris/` en la ruta `/jugar/tetris` para que se pueda jugar de verdad con teclado, con el HUD React del reproductor sincronizado al estado real del juego, y hacer que "Guardar puntuación" inserte de verdad la marca en `public.scores` (primera escritura real del proyecto).

---

## Por qué existe esta spec

SPEC 05 dejó `asteroids` jugable en `/jugar/asteroids` bifurcando su `game.js` a `public/games/asteroids/`, envuelto en `window.startAsteroids(canvas)` / `stop()` / `restartAsteroids()` y sincronizado con el HUD React vía `window.postMessage`. SPEC 06 creó `public.games` y `public.scores` en Supabase **solo lectura**: "Guardar puntuación" quedó como botón visual.

Esta spec hace lo mismo para `tetris` y añade lo que 05/06 dejaron fuera: **una política RLS `INSERT` en `public.scores` abierta a `anon` y una Server Action** que inserta la puntuación de la partida. Sigue sin haber auth: la marca se identifica por la etiqueta fija `"G4M3R_X"` del HUD, igual que las lecturas se identifican por un `player` de texto libre.

Tetris **no tiene la forma de asteroids**: no hay "vidas" (sí `lines` y `level`), el HUD original vive en el DOM (`#score`, `#lines`, `#level`) y no en el canvas, la pantalla de GAME OVER es un overlay HTML, la pieza siguiente se dibuja en un **segundo canvas** `#next-canvas`, hay **pausa funcional nativa** con la tecla `P`, y el juego lee/escribe `localStorage['tetris-theme']` mutando `document.documentElement[data-theme]`. Los cambios del fork se describen contra esa realidad.

`tetris` **ya existe** en `public.games` (`supabase/migrations/0001_create_games.sql`, `sort_order` 2): esta spec **no** crea ninguna migración de `games`.

**Regla de estilos (heredada de SPEC 01–06):** `app/globals.css` no se toca. Todo estilo adicional se resuelve con utilidades de Tailwind en el JSX. El `game.js` bifurcado conserva su propio dibujo en canvas (tablero, rejilla, piezas, fantasma, pieza siguiente) y no aporta CSS.

---

## Scope

**In:**

- `public/games/tetris/game.js` — **nuevo**. Copia bifurcada de `resources/started-games/03-claude-tetris/game.js` con estos cambios acotados:
  1. **Boot re-entrante.** El cuerpo del juego se envuelve en `function startTetris(boardEl, nextEl)` expuesta como `window.startTetris`. Usa `boardEl` para `canvas` / `ctx` y `nextEl` para `nextCanvas` / `nextCtx` en vez de `document.getElementById('board')` / `'next-canvas'`. Ya no arranca solo al cargar el script: la invoca el componente React. Devuelve `stop()` que hace `cancelAnimationFrame(animId)` y quita el listener de teclado que registró.
  2. **Fuera el HUD DOM.** Se eliminan las búsquedas de `scoreEl`, `linesEl`, `levelEl`, `overlay`, `overlayTitle`, `overlayScore`, `restartBtn`, `themeToggle` y el listener de `restartBtn`. `updateHUD()` deja de escribir `textContent`: en su lugar emite estado (punto 4). `endGame()` deja de mostrar `#overlay`: emite `gameover`. `togglePause()` deja de mostrar `#overlay`: la fase `"paused"` viaja en el mensaje de estado.
  3. **Fuera el tema propio.** Se eliminan `applyTheme`, `THEME_KEY`, el `themeToggle` y todas las llamadas a `localStorage`. `theme` se fija a `'dark'` (p. ej. `const theme = 'dark'`) para que `THEME_COLORS[theme]` siga resolviendo en `drawBlock` / `drawGrid`. El fork no toca `document.documentElement` ni `localStorage`.
  4. **Emisión de estado** con `window.postMessage(msg, window.location.origin)`, con chequeo sucio barato (solo se emite si cambió algún valor):
     - Cuando cambian `score`, `lines`, `level` o la fase derivada: `{ source: "tetris", type: "state", score, lines, level, phase }` con `phase = gameOver ? "gameover" : paused ? "paused" : "playing"`.
     - Al entrar en `gameOver` (dentro de `endGame()`): además `{ source: "tetris", type: "gameover", score }`.
  5. **Teclado.** El listener `keydown` se registra sobre `document` dentro de `startTetris` (se quita en `stop()`). Se añade `e.preventDefault()` para `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`, `Space` y `KeyP`, para que la página no haga scroll mientras se juega. El resto del `switch` (mover, rotar con `↑`/`X`, soft drop, hard drop, pausa con `P`) no cambia.
  6. **Reinicio programático.** Mientras hay partida activa se expone `window.restartTetris` (= `init`) para que "Jugar de nuevo" reinicie el motor sin recrear los `<canvas>`. `init()` ya reinicializa tablero / `score` / `lines` / `level` y cancela el `rAF` previo. `stop()` la elimina.
  7. **Pausa programática.** Mientras hay partida activa se expone `window.toggleTetrisPause` (= `togglePause`) para el botón "Pausa" del control deck. `stop()` la elimina. La tecla `P` sigue alternando pausa igual que hoy.
     El resto de `game.js` (`collide`, `rotateCW`, `tryRotate`, `merge`, `clearLines`, `LINE_SCORES`, `ghostY`, `hardDrop`, `softDrop`, `lockPiece`, `spawn`, `draw`, `drawGrid`, `drawNext`, `loop` y su temporización) **no se toca**.
- `components/tetris-player.tsx` — **nuevo**, `"use client"`. Calcado de `components/asteroids-player.tsx`:
  - Dos `<canvas>` con `ref`: el tablero `width={300} height={600}` y la pieza siguiente `width={120} height={120}`. Dentro del gabinete CRT, el tablero se escala **a la altura** del gabinete (retrato, `h-full w-auto` / `aspect-[1/2]`), centrado con bandas laterales; el canvas NEXT y una etiqueta pequeña "NEXT" van a su lado (o encima en pantallas estrechas). El gabinete (borde, scanlines, viñeta) se mantiene como marco.
  - `<Script src="/games/tetris/game.js" strategy="afterInteractive" onReady={…}>` de `next/script`. En `onReady` (con ambos `<canvas>` ya montados) llama a `window.startTetris(boardRef.current, nextRef.current)` y guarda el `stop()`. El cleanup del `useEffect` llama a `stop()`.
  - Estado local `{ score, lines, level, phase }` alimentado por un listener de `message` sobre `window` que filtra `event.origin === window.location.origin`, `event.source === window` y `event.data?.source === "tetris"`.
  - El HUD React del reproductor con **el mismo marcado y clases** que hoy tiene `app/jugar/[slug]/page.tsx`, pero el tercer bloque (que en asteroids era "Vidas / Nivel" con corazones) pasa a mostrar **LÍNEAS y NIVEL** con los valores reales (sin corazones SVG). La etiqueta de jugador queda fija (`"G4M3R_X"`). Puntuación formateada a 7 dígitos con ceros a la izquierda, como el mock.
  - Un texto "PAUSA" sobre el canvas cuando `phase === "paused"`.
  - `<GameOverModal>` en modo controlado: se abre al recibir `type: "gameover"` con `finalScore` = la puntuación final real (formateada igual que el HUD); "Salir" del control deck lo abre con la puntuación vigente. Al cerrar con "Jugar de nuevo" en estado `gameover` llama a `window.restartTetris()`. Pasa `onPause={() => window.toggleTetrisPause?.()}` y `onSave` (envoltorio de la Server Action, ver abajo).
  - Bajo el gabinete, un aviso discreto: el juego requiere teclado (`←→` mover, `↑`/`X` rotar, `↓` bajar, `Espacio` caída, `P` pausa). No se añaden controles táctiles.
- `components/game-over-modal.tsx` — **modificado**. Se añaden dos props opcionales, sin cambiar el comportamiento actual cuando no se pasan (las otras cinco rutas `/jugar/*` y `asteroids` siguen igual):
  - `onPause?: () => void` — si se pasa, el botón "Pausa" del control deck la invoca; si no, sigue siendo visual.
  - `onSave?: (() => Promise<{ ok: boolean; error?: string }>)` — si se pasa, "Guardar puntuación" la invoca. Mientras corre, el botón queda deshabilitado ("Guardando…"); al terminar con `ok: true` queda deshabilitado con texto "Puntuación guardada"; con `ok: false` muestra un texto de error y permite reintentar. El estado "guardada" se reinicia cuando el modal pasa de cerrado a abierto (nueva partida). Sin `onSave`, el botón sigue siendo visual (asteroids y las cuatro rutas mock no cambian).
- `app/jugar/[slug]/actions.ts` — **nuevo**, `"use server"`. `guardarPuntuacionTetris(input: { score: number }): Promise<{ ok: boolean; error?: string }>`:
  - Valida `Number.isInteger(input.score) && input.score > 0`; si no, devuelve `{ ok: false, error }` sin tocar la BD.
  - Inserta `{ game_slug: "tetris", player: "G4M3R_X", score: input.score, achieved_at: null }` en `public.scores` usando el cliente sin cookies `@/lib/supabase/anon` (la nueva política RLS `INSERT` para `anon` lo permite; no se usa `SUPABASE_SECRET_KEY`).
  - En éxito: `revalidatePath("/salon-de-la-fama")` y `revalidatePath("/juegos/tetris")`; devuelve `{ ok: true }`. En error de Supabase: `console.error` y `{ ok: false, error }`.
  - El reproductor solo habilita "Guardar puntuación" en estado `gameover`, así que la Server Action asume esa precondición y no recibe más contexto que `score`.
- `supabase/migrations/0003_scores_allow_anon_insert.sql` — **nuevo**. Aplicado con el MCP de Supabase (`apply_migration`) **y** versionado con el mismo contenido. Añade **solo** una política `INSERT` a `public.scores`:
  ```sql
  create policy "anon_insert_scores" on public.scores
    for insert to anon
    with check (achieved_at is null and score > 0 and player <> '');
  ```
  No se tocan las políticas `SELECT` de SPEC 06 ni se añaden `UPDATE` / `DELETE`.
- `app/jugar/[slug]/page.tsx` — **modificado**. Se añade la rama `slug === "tetris"` → `<TetrisPlayer game={game} />`, junto a la de `asteroids`. Para los otros cuatro slugs la página queda **exactamente igual**. `generateStaticParams`, `getGame` y `notFound()` no cambian.
- `AGENTS.md` — si `next dev` lo regenera, se commitea junto con el trabajo.

**Out of scope (para futuras specs):**

- Hacer jugables `arkanoid`, `snake`, `space-invaders`, `pac-man`. Sus `/jugar/[slug]` siguen siendo maqueta. No se añade ningún mecanismo genérico de embebido.
- Auth real: `scores.user_id`, sesión en el header, identidad de jugador. La escritura sigue anclada a la etiqueta fija `"G4M3R_X"`.
- Guardar puntuación desde `asteroids`: SPEC 05 lo dejó visual y esta spec no lo cambia (solo añade `onSave` a `tetris`).
- `games.best_score` derivado de `scores`, o refrescarlo al guardar. Sigue siendo columna propia sembrada.
- Ranking global / `lib/activity.ts`: siguen mock.
- Cambiar `lib/games.ts` / `lib/leaderboards.ts`: no necesitan edición para esta ruta.
- Cambiar `app/juegos/[slug]/page.tsx` (detalle) salvo su revalidación on-demand vía `revalidatePath`.
- Tema claro/oscuro del Tetris original (toggle + su `localStorage`): se elimina del fork; el juego se ve siempre con su paleta oscura.
- Botón "Pausa" funcional en las otras cinco rutas `/jugar/*` (allí sigue visual).
- Controles táctiles o gamepad; sonido; cualquier cambio de jugabilidad (velocidad de caída, sistema de rotación, puntuación por línea).
- Copiar `index.html` / `style.css` del juego original.
- Migrar `game.js` a TypeScript o a un componente React que reimplemente Tetris.
- Rate limiting / anti-spam del `INSERT` más allá del `with check` de la política y del botón que se deshabilita tras guardar.
- Regenerar `lib/supabase/database.types.ts`: añadir una política no cambia el esquema; el tipo `scores.Insert` ya existe desde SPEC 06.
- Tests automatizados (no hay framework configurado).
- Editar los archivos de las SPEC 01–06 salvo lo listado en Scope.

---

## Data model

Esta feature **no crea tablas nuevas** (`tetris` ya está en `public.games`; `public.scores` ya existe). Añade una política RLS y dos estructuras en código.

### Mensaje emitido por el fork

```ts
// Emitido por public/games/tetris/game.js
// vía window.postMessage(msg, window.location.origin)

type TetrisMessage =
  | {
      source: "tetris";
      type: "state";
      score: number; // puntuación acumulada (entero)
      lines: number; // líneas eliminadas (entero, ≥ 0)
      level: number; // nivel actual (1..n), = floor(lines / 10) + 1
      phase: "playing" | "paused" | "gameover";
    }
  | {
      source: "tetris";
      type: "gameover";
      score: number; // puntuación final
    };
```

- **No hay campo `lives`:** Tetris no tiene vidas. El slot del HUD que en `AsteroidsMessage` transportaba `lives` se sustituye por `lines`.
- **`phase`** no existe como variable en el juego: se deriva de los booleanos `gameOver` / `paused` en el momento de emitir. `"paused"` es fase nueva respecto a asteroids (que no tenía pausa).
- Emisor y receptor están en la **misma ventana** (no hay iframe); se usa `window.postMessage` a `window.location.origin` por portabilidad futura, igual que SPEC 05.
- El receptor descarta cualquier mensaje cuyo `origin` no sea el propio, cuyo `source` no sea `window`, o cuyo `data.source` no sea `"tetris"`.
- La puntuación se formatea a 7 dígitos con ceros a la izquierda solo en la capa React; `game.js` la emite como entero.
- Además del canal de mensajes, el fork expone `window.restartTetris()` y `window.toggleTetrisPause()`: no son mensajes, son llamadas directas React → juego, disponibles solo mientras la partida está activa.

### Entrada de la Server Action

```ts
// app/jugar/[slug]/actions.ts — "use server"
// Inserta una fila en public.scores.
async function guardarPuntuacionTetris(input: {
  score: number; // entero > 0; el resto de campos los fija la acción
}): Promise<{ ok: boolean; error?: string }>;
// Inserta: { game_slug: "tetris", player: "G4M3R_X", score, achieved_at: null }
// En éxito revalida /salon-de-la-fama y /juegos/tetris.
```

### Política RLS nueva sobre `public.scores`

```sql
create policy "anon_insert_scores" on public.scores
  for insert to anon
  with check (achieved_at is null and score > 0 and player <> '');
```

Sin políticas `UPDATE` / `DELETE`. Las de `SELECT` de SPEC 06 (`public_read_scores`) no se tocan. `lib/games.ts` y `lib/leaderboards.ts` no cambian.

---

## Implementation plan

1. **Política `INSERT` en `scores`.** Escribir `supabase/migrations/0003_scores_allow_anon_insert.sql` con la política `anon_insert_scores`. Aplicar con el MCP de Supabase. Verificar con `get_advisors` (seguridad) y con un `insert` de prueba como `anon` (`{ game_slug:'tetris', player:'G4M3R_X', score: 1, achieved_at: null }` → OK; `score: 0` → rechazado). Borrar la fila de prueba. `npm run build` sigue verde (nada la usa aún).

2. **Bifurcar `game.js` verbatim.** Copiar `resources/started-games/03-claude-tetris/game.js` a `public/games/tetris/game.js` sin cambios. `npm run build` verde.

3. **Boot re-entrante + fuera HUD DOM + fuera tema.** En `public/games/tetris/game.js`: envolver el cuerpo en `function startTetris(boardEl, nextEl)` (usa `boardEl`/`nextEl` en vez de los `getElementById`), exponer `window.startTetris`, sustituir el `init()` final por `return () => { … }` (`stop()` con `cancelAnimationFrame` + `removeEventListener`). Eliminar las búsquedas y usos de `scoreEl` / `linesEl` / `levelEl` / `overlay*` / `restartBtn` / `themeToggle`, `applyTheme`, `THEME_KEY` y `localStorage`; fijar `theme = 'dark'`. Probar en una consola de navegador que `window.startTetris(boardCanvas, nextCanvas)` arranca el juego sobre dos canvas sueltos y se juega con teclado.

4. **Emisión de estado + preventDefault.** En el fork, tras cada cambio de `score` / `lines` / `level` / fase (fin de `updateHUD()`, `endGame()`, `togglePause()`), comparar con lo último emitido y `window.postMessage({ source:"tetris", type:"state", score, lines, level, phase }, window.location.origin)`. En `endGame()`, emitir además `{ source:"tetris", type:"gameover", score }`. Añadir `e.preventDefault()` para flechas, `Space` y `KeyP` en el `keydown`. Comprobar los mensajes con `addEventListener("message", …)` en la consola.

5. **Reinicio y pausa programáticos.** En el fork, exponer `window.restartTetris = init` y `window.toggleTetrisPause = togglePause` dentro de `startTetris`; eliminarlas en `stop()`. Verificar en consola que ambas funcionan y que `stop()` deja `window.startTetris`/`restartTetris`/`toggleTetrisPause` sin loop huérfano.

6. **Componente `TetrisPlayer` — canvas + arranque.** Crear `components/tetris-player.tsx` (`"use client"`) con el gabinete CRT (portado del bloque actual, sin `<Image>`), el `<canvas>` del tablero 300×600 escalado a la altura del gabinete y centrado, el `<canvas>` NEXT 120×120 al lado con su etiqueta, y `<Script src="/games/tetris/game.js" strategy="afterInteractive" onReady={…}>`. En `onReady` llamar a `window.startTetris(boardRef.current, nextRef.current)` y guardar el `stop`; cleanup del `useEffect` → `stop()`. Montarlo en `app/jugar/[slug]/page.tsx` para `slug === "tetris"`. Abrir `/jugar/tetris`: el juego se ve y se juega.

7. **HUD sincronizado + PAUSA.** En `TetrisPlayer`, añadir estado `{ score, lines, level, phase }` y el listener de `message` (filtros de origen / source / window). Portar el marcado del HUD, con el tercer bloque mostrando LÍNEAS y NIVEL reales (sin corazones). Mostrar "PAUSA" sobre el canvas cuando `phase === "paused"`. Jugar y comprobar que los números del HUD React coinciden con la lógica del juego y que `P` pausa/reanuda.

8. **Modal controlado + Pausa + Guardar.** En `components/game-over-modal.tsx`, añadir props opcionales `onPause` y `onSave` (comportamiento idéntico al actual sin ellas). En `TetrisPlayer`, abrir el modal al recibir `type:"gameover"` con `finalScore` real; "Salir" lo abre con la puntuación vigente; "Jugar de nuevo" en `gameover` → `window.restartTetris()`. Pasar `onPause={() => window.toggleTetrisPause?.()}`. Crear `app/jugar/[slug]/actions.ts` con `guardarPuntuacionTetris` y pasar un envoltorio como `onSave`. Recorrer `/jugar/arkanoid`, `/jugar/asteroids`, etc.: el modal sigue igual (Pausa visual, "Guardar puntuación" visual).

9. **Escritura real end-to-end.** Jugar una partida completa en `/jugar/tetris` hasta GAME OVER, pulsar "Guardar puntuación": el botón pasa a "Guardando…" y luego a "Puntuación guardada" (deshabilitado). Verificar la fila nueva en `public.scores` (`select * from public.scores where game_slug='tetris' order by created_at desc limit 1`) y que aparece en `/salon-de-la-fama` (pestaña Tetris) y en `/juegos/tetris` (tabla lateral) tras la revalidación. Comprobar que un segundo click no inserta otra fila y que reabrir el modal en una nueva partida vuelve a habilitar el botón.

10. **Rama de `tetris` en la página.** Dejar `app/jugar/[slug]/page.tsx` con las dos ramas (`asteroids`, `tetris`) y el JSX mock intacto para los otros cuatro. Confirmar que `/jugar/pac-man`, `/jugar/snake`, `/jugar/arkanoid`, `/jugar/space-invaders` renderizan igual que antes de la spec.

11. **Cierre.** `npm run lint` y `npm run build` verdes. Recorrer `/jugar/tetris` (partida completa + guardar), `/jugar/asteroids` (sigue jugable, "Guardar puntuación" sigue visual), `/jugar/pac-man` (maqueta intacta), `/salon-de-la-fama`, `/juegos/tetris`, `/`. Si `next dev` regeneró `AGENTS.md`, commitearlo junto con el trabajo. Commitear el `.sql` de `supabase/migrations/`.

---

## Acceptance criteria

- [ ] `npm run build` termina sin errores ni fallos de tipos.
- [ ] `npm run lint` pasa sin errores.
- [ ] Existe `public/games/tetris/game.js` y se sirve en `http://localhost:3000/games/tetris/game.js`.
- [ ] En `/jugar/tetris` se ve un tablero jugable: `←→` mueve la pieza, `↑`/`X` la rota, `↓` acelera la bajada, `Espacio` hace caída dura, `P` pausa y reanuda, se completan líneas y la partida llega a `GAME OVER` cuando la pila alcanza el techo.
- [ ] El tablero (retrato) aparece centrado dentro del gabinete CRT con bandas laterales, y la pieza siguiente se dibuja en un segundo canvas "NEXT" junto a él.
- [ ] `game.js` no arranca al cargar el `<script>`; arranca cuando `TetrisPlayer` llama a `window.startTetris(boardEl, nextEl)`, y al desmontar el componente se cancela el `requestAnimationFrame` y se quita el listener de teclado (no queda loop huérfano al navegar a otra ruta y volver).
- [ ] El HUD React de `/jugar/tetris` muestra puntuación (7 dígitos, ceros a la izquierda), **líneas** y **nivel** reales, sincronizados con la lógica del juego. No se dibujan corazones de "vidas".
- [ ] Al pausar con `P`, aparece un indicador "PAUSA" sobre el canvas; al reanudar, desaparece.
- [ ] El botón "Pausa" del control deck (bajo el canvas) alterna la pausa del juego, igual que la tecla `P`.
- [ ] Al llegar a `GAME OVER`, el modal "Fin del juego" se abre solo y su "Puntuación final" es la puntuación real de esa partida (no un valor mock).
- [ ] El botón "Salir" del control deck abre el modal con la puntuación real vigente.
- [ ] "Guardar puntuación" inserta una fila en `public.scores` con `game_slug = 'tetris'`, `player = 'G4M3R_X'`, `score` = la puntuación real y `achieved_at = null`. Tras el guardado el botón queda deshabilitado con texto de confirmación; un segundo click no inserta otra fila.
- [ ] La Server Action rechaza (sin tocar la BD) un `score` no entero o `≤ 0`.
- [ ] La fila guardada aparece en `/salon-de-la-fama` (pestaña Tetris) y en `/juegos/tetris` (tabla lateral) sin reiniciar el servidor (revalidación on-demand).
- [ ] Al reabrir el modal en una partida nueva, el botón "Guardar puntuación" vuelve a estar habilitado.
- [ ] "Jugar de nuevo" cierra el modal y, si la partida había terminado, reinicia el motor vía `window.restartTetris()` sin recrear los `<canvas>`.
- [ ] Existe `supabase/migrations/0003_scores_allow_anon_insert.sql` versionado; `public.scores` tiene una política `INSERT` para `anon` con `with check (achieved_at is null and score > 0 and player <> '')` y ninguna política `UPDATE` / `DELETE`. Las políticas `SELECT` de SPEC 06 siguen intactas.
- [ ] El fork no lee ni escribe `localStorage` y no modifica `document.documentElement` (`data-theme`); el juego se ve siempre con su paleta oscura.
- [ ] `/jugar/asteroids` sigue jugable como en SPEC 05, y su "Guardar puntuación" sigue siendo visual (no inserta nada).
- [ ] `/jugar/pac-man`, `/jugar/snake`, `/jugar/arkanoid`, `/jugar/space-invaders` renderizan igual que antes de esta spec: HUD mock, gabinete con `<Image>` y texto "Insert coin", `GameOverModal` no controlado con "Pausa" y "Guardar puntuación" visuales.
- [ ] `lib/games.ts`, `lib/leaderboards.ts` y `lib/supabase/database.types.ts` no cambian.
- [ ] `app/globals.css` no tiene reglas nuevas respecto al estado actual.
- [ ] `SUPABASE_SECRET_KEY` sigue sin importarse en ningún archivo de la app; la Server Action usa `@/lib/supabase/anon`.
- [ ] Todo el texto visible nuevo (`TetrisPlayer`, aviso de teclado, estados del botón "Guardar puntuación") está en español con acentos correctos.
- [ ] Un `slug` inexistente bajo `/jugar/` sigue devolviendo la 404 de Next.

---

## Decisions

- **Sí:** integrar `tetris` como su propia spec, con su propio `game.js` y sus propias fricciones (HUD en DOM, segundo canvas, pausa nativa, tema propio). Igual que SPEC 05 hizo con `asteroids`, uno a uno.
- **Sí (placement del HUD):** portar el HUD de Tetris (score / lines / level) al reproductor React vía `postMessage`, no replicarlo dentro del canvas. El reproductor ya tiene ese HUD como maqueta; alimentarlo con datos reales es coherente y evita tocar el dibujo del juego. El overlay HTML de GAME OVER lo sustituye el `GameOverModal` React.
- **Sí:** mantener el segundo canvas `#next-canvas` como un `<canvas>` propio del reproductor que el fork recibe como parámetro. Es el cambio mínimo: `drawNext()` no se toca, solo cambia de dónde sale `nextCtx`.
- **Sí:** tablero retrato 300×600 centrado en el gabinete ancho con bandas laterales, escalado por altura. El backing store sigue a 300×600, la lógica del juego no cambia. Estirarlo a lo ancho deformaría las piezas.
- **Sí (persistencia propia):** eliminar del fork el tema claro/oscuro y su `localStorage['tetris-theme']`. `applyTheme()` muta `document.documentElement[data-theme]`, que es exactamente el atributo que usa el theming del sitio Next: dejarlo lo haría pelearse con la app. El juego se fija a su paleta oscura, que es la que encaja con el gabinete CRT.
- **Sí:** mantener la pausa nativa con `P` (ya funciona; quitarla es trabajo para restar valor) y **además** cablear el botón "Pausa" del control deck vía `window.toggleTetrisPause()`. Es lo que pidió el usuario; SPEC 05 dejó la pausa fuera porque asteroids no la tenía.
- **Sí:** `phase` con tres valores (`"playing" | "paused" | "gameover"`), derivada de `gameOver` / `paused` al emitir. Tetris no tiene una variable de estado única.
- **Sí:** `lines` en el mensaje en el hueco donde asteroids llevaba `lives`. Tetris no tiene vidas; `lines` es el dato equivalente que el HUD debe mostrar.
- **Sí (write policy):** la política RLS `INSERT` sobre `public.scores` se abre a `anon`, no se cierra tras auth. **No hay auth en el proyecto todavía** (SPEC 06 ya aceptó esa postura para `SELECT`); cerrarla bloquearía la feature por completo. El `with check` limita a `achieved_at is null`, `score > 0` y `player` no vacío; el anti-abuso real llega con la spec de auth.
- **Sí:** una Server Action (`app/jugar/[slug]/actions.ts`), no un `insert` desde el cliente. Mantiene la clave y la lógica de validación / revalidación en el servidor, igual que la Server Action de contacto de SPEC 03.
- **Sí:** validar `score` entero `> 0` y confiar en que el reproductor solo ofrece "Guardar" en `gameover`. Guardar un 0 o una marca negativa no aporta nada al leaderboard.
- **Sí:** `revalidatePath("/salon-de-la-fama")` y `revalidatePath("/juegos/tetris")` tras insertar. Son las dos únicas rutas que leen el leaderboard de Tetris (`getAllLeaderboards`, `getLeaderboard`).
- **Sí:** deshabilitar "Guardar puntuación" tras un guardado correcto y reactivarlo al abrir el modal en una partida nueva. Evita filas duplicadas por doble click sin necesitar deduplicación en BD.
- **No:** guardar puntuación desde `asteroids` en esta spec. SPEC 05 lo dejó visual; ampliarlo es otra decisión. `onSave` solo se pasa desde `TetrisPlayer`.
- **No:** regenerar `lib/supabase/database.types.ts`. Añadir una política no cambia columnas; `scores.Insert` ya existe.
- **No:** reimplementar Tetris como componente React. Reescribe un juego que funciona; alto coste, sin beneficio.
- **No:** controles táctiles / gamepad, sonido, cambios de jugabilidad. Scope creep; otra spec si se pide.

---

## Risks

| Riesgo                                                                                                                               | Mitigación                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Al quitar `applyTheme` del fork, `theme` queda `undefined` y `THEME_COLORS[theme]` lanza en `drawBlock` / `drawGrid`.                | El fork fija `const theme = 'dark'` (o equivalente) para que `THEME_COLORS[theme]` siga resolviendo. Criterio de aceptación: el juego se ve con la paleta oscura.                                                              |
| `next/script` no re-ejecuta el archivo en navegación SPA; al volver a `/jugar/tetris` el juego no re-arranca o usa canvas obsoletos. | El fork expone `window.startTetris(boardEl, nextEl)` y el `useEffect` de `TetrisPlayer` lo invoca en cada montaje con los canvas actuales; el cleanup llama a `stop()`. Criterio de aceptación cubre "navegar fuera y volver". |
| El `keydown` va sobre `document` y ahora hace `preventDefault` de las flechas: bloquea el scroll de la página mientras se juega.     | Comportamiento aceptado en un arcade a pantalla completa; `stop()` retira el listener al desmontar.                                                                                                                            |
| El tablero 1:2 dentro del gabinete ancho deja bandas laterales grandes.                                                              | Se centra el tablero escalado por altura y se coloca el canvas NEXT + info al lado para ocupar el espacio; es la disposición pedida.                                                                                           |
| Sin auth, cualquiera puede insertar filas en `public.scores` (spam del leaderboard).                                                 | Postura heredada de SPEC 06 para lecturas: sin auth no hay identidad que verificar. El `with check` acota los valores y el botón se deshabilita tras guardar; el anti-abuso real es la spec de auth.                           |
| `revalidatePath` sobre `/juegos/tetris` y `/salon-de-la-fama`, que se generan de forma estática, no refresca la vista.               | La revalidación on-demand desde una Server Action invalida el caché de esas rutas; el criterio de aceptación exige ver la fila nueva sin reiniciar el servidor.                                                                |
| Doble click en "Guardar puntuación" inserta dos filas antes de que llegue la respuesta.                                              | El botón pasa a deshabilitado ("Guardando…") en cuanto se pulsa y solo se reactiva al abrir el modal en otra partida.                                                                                                          |
| El envoltorio `onSave` en `GameOverModal` rompe el modal no controlado de las otras cinco rutas.                                     | `onPause` / `onSave` son opcionales; sin ellas el comportamiento es idéntico al actual. Criterio de aceptación explícito para las cuatro rutas mock y para `asteroids`.                                                        |
| `next dev` reescribe `AGENTS.md` y deja el árbol sucio.                                                                              | Commitear el `AGENTS.md` regenerado junto con el trabajo (paso 11).                                                                                                                                                            |

---

## Lo que **no** entra en esta spec

- Hacer jugables `arkanoid`, `snake`, `space-invaders`, `pac-man`.
- Auth real: `scores.user_id`, sesión en el header, identidad de jugador.
- "Guardar puntuación" funcional en `/jugar/asteroids`.
- Derivar / refrescar `games.best_score` desde `scores`.
- Ranking global agregado en la home; migrar `lib/activity.ts` a Supabase.
- Botón "Pausa" funcional en las otras cinco rutas `/jugar/*`.
- Tema claro/oscuro del Tetris original; su `localStorage`.
- Controles táctiles / gamepad; sonido; cambios de jugabilidad.
- Rate limiting del `INSERT` más allá del `with check` y del botón deshabilitado.
- Regenerar `lib/supabase/database.types.ts`.
- Tests automatizados; edición de las SPEC 01–06 fuera de lo listado en Scope.

Cada uno de esos, si llega, va en su propia spec.
