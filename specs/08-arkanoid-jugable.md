# SPEC 08 — Arkanoid jugable en `/jugar/arkanoid` con guardado de puntuación

> **Status:** Implementado
> **Depends on:** SPEC 05, SPEC 06, SPEC 07
> **Date:** 2026-09-02
> **Objective:** Integrar el juego canvas de `resources/started-games/04-arkanoid/` en la ruta `/jugar/arkanoid` para que se pueda jugar de verdad con teclado y ratón, con el HUD React del reproductor sincronizado al estado real del juego, y que "Guardar puntuación" inserte la marca en `public.scores` reutilizando la escritura real que SPEC 07 estrenó para Tetris.

---

## Por qué existe esta spec

SPEC 05 dejó `asteroids` jugable en `/jugar/asteroids` bifurcando su `game.js` a `public/games/asteroids/`, envuelto en `window.startAsteroids(canvas)` / `stop()` / `restartAsteroids()` y sincronizado con el HUD React vía `window.postMessage`. SPEC 07 repitió el patrón para `tetris` y añadió la primera escritura real del proyecto: la política RLS `anon_insert_scores` sobre `public.scores` (`supabase/migrations/0003_scores_allow_anon_insert.sql`) y la Server Action `guardarPuntuacionTetris` en `app/jugar/[slug]/actions.ts`, más las props opcionales `onPause` / `onSave` de `GameOverModal`.

Esta spec hace lo mismo para `arkanoid`. La política `anon_insert_scores` **no es específica de slug** (`with check (achieved_at is null and score > 0 and player <> '')`), así que **no hace falta ninguna migración nueva**: solo una segunda Server Action que inserta con `game_slug = "arkanoid"`. Sigue sin haber auth: la marca se identifica por la etiqueta fija `"G4M3R_X"`.

`arkanoid` **ya existe** en `public.games` (`supabase/migrations/0001_create_games.sql`, `sort_order` 1): esta spec **no** crea ninguna migración de `games`.

Arkanoid **no tiene la forma de un solo archivo** como asteroids o tetris. Es **ES multi-módulo**: `js/main.js` importa nueve módulos (`state`, `levels`, `hud`, `input`, `entities`, `collisions`, `storage`, `menu`, `effects`) más `js/audio.js`, y depende de `assets/spritesheet.js` (script **clásico**, no módulo, que expone `window.loadSpritesheet` / `window.drawSprite` / `window.drawFrame` y la const global `EXPLOSION_FRAMES` que usa `effects.js`). Hay assets binarios (`assets/spritesheet-breakout.png`, dos `.mp3`). El bucle `requestAnimationFrame` **no arranca al cargar el script**: espera dentro del callback de `window.loadSpritesheet(...)`, tras cargar el PNG. El estado usa nombres en español (`state.puntuacion`, `state.vidas`, `state.nivelIndice`, `state.pantalla` ∈ `INICIO | JUGANDO | PAUSA | FIN`, `state.resultado` ∈ `VICTORIA | DERROTA`). Hay un **menú de INICIO dibujado en canvas** que exige pulsar `Espacio` para empezar, una **pausa nativa funcional** con `P` / `Esc`, **control de la pala con ratón** (además de `←→`), y **persistencia propia en `localStorage`** (`arkanoid:highscore:v1`, `arkanoid:savegame:v1`). Los cambios del fork se describen contra esa realidad.

**Regla de estilos (heredada de SPEC 01–07):** `app/globals.css` no se toca. Todo estilo adicional se resuelve con utilidades de Tailwind en el JSX. El fork conserva su propio dibujo en canvas (bloques, pala, bola, explosiones, HUD interno, menús) y no aporta CSS.

---

## Scope

**In:**

- `public/games/arkanoid/game.js` — **nuevo**. Fork del juego de `resources/started-games/04-arkanoid/`, **concatenado en un único archivo clásico** (no `type="module"`) que:
  1. **Inlina la API del spritesheet** (`assets/spritesheet.js`: `loadSpritesheet`, `drawFrame`, `drawSprite`, `EXPLOSION_FRAMES`, `SPRITES`) y el contenido de los nueve módulos ES en orden de dependencia, quitando los `import` / `export`. El PNG se sirve desde una ruta absoluta.
  2. **Boot re-entrante.** El cuerpo se envuelve en `function startArkanoid(canvasEl)` expuesta como `window.startArkanoid`. Usa `canvasEl` en vez de `document.getElementById('juego')`. Ya no arranca solo: la invoca el componente React. Dentro llama a `iniciarInput(canvasEl)`, `irAInicio()` y `loadSpritesheet(() => { … requestAnimationFrame(bucle) … })`, guardando el id del `requestAnimationFrame` en curso. Devuelve `stop()` que hace `cancelAnimationFrame(idActual)`, marca un flag `detenido` (para que el callback pendiente de `loadSpritesheet` no arranque el bucle si `stop()` corrió antes de que cargara el PNG) y quita **todos** los listeners que registró (ver punto 4).
  3. **Fuera el audio.** No se incluye `js/audio.js` en el bundle; las llamadas a `reproducir(...)` de `collisions.js` se eliminan (o se dejan como no-op). No se copia ningún `.mp3`. El juego queda mudo (el sonido está fuera de alcance en este tipo de spec).
  4. **Input con teardown.** `iniciarInput(canvasEl)` pasa a registrar sus listeners guardando las referencias para poder quitarlas en `stop()`:
     - Sobre `window`: `keydown` / `keyup` (flechas + `A`/`D` para la pala, `Space` con `preventDefault`, teclas discretas `KeyP` / `Escape` / `ArrowUp` / `ArrowDown` / `Enter`, con `preventDefault` de `ArrowUp` / `ArrowDown`). **No se mueven a `document` ni al canvas**: siguen sobre `window`.
     - Sobre `canvasEl`: `mousemove` / `mouseleave` (la pala sigue al cursor cuando está sobre la pantalla) y `click` (selección de opción de menú). Se mantienen: el control con ratón es nativo de Arkanoid.
  5. **Fuera el `localStorage` propio.** No se incluye `js/storage.js`. `getHighscore()` / `setHighscore()` pasan a no-op que devuelven `0` (el HUD interno del canvas muestra `Highscore: 0`). `hayPartidaGuardada()` devuelve siempre `false` → la opción "Reanudar" del menú de INICIO queda permanentemente deshabilitada. `guardarEstadoPartida()` no escribe nada; la pausa deja de persistir la partida. El fork no lee ni escribe `localStorage`.
  6. **Emisión de estado** con `window.postMessage(msg, window.location.origin)`, con chequeo sucio barato (solo se emite si cambió algún valor):
     - Cuando cambian `state.puntuacion`, `state.vidas`, `state.nivelIndice` o `state.pantalla`: `{ source: "arkanoid", type: "state", score, lives, level, phase }` con `score = state.puntuacion`, `lives = state.vidas`, `level = state.nivelIndice + 1` y `phase` derivada de `state.pantalla` (`INICIO → "menu"`, `JUGANDO → "playing"`, `PAUSA → "paused"`, `FIN → "gameover"`).
     - Al entrar en `state.pantalla === PANTALLAS.FIN` (`terminarPartida()`, tanto `DERROTA` como `VICTORIA`): además `{ source: "arkanoid", type: "gameover", score }` con la puntuación final.
  7. **Reinicio programático.** Mientras hay partida activa se expone `window.restartArkanoid` = `reiniciarContadores()` + `empezarNivel()` (una "nueva partida" sin `borrarPartida`, que ya no existe), para que "Jugar de nuevo" reinicie el motor sin recrear el `<canvas>`. `stop()` la elimina.
  8. **Pausa programática.** Mientras hay partida activa se expone `window.toggleArkanoidPause` que alterna `JUGANDO ↔ PAUSA` en modo overlay rápido (`state.pausaConMenu = false`), equivalente a pulsar `P`. Fuera de `JUGANDO` / `PAUSA` es no-op. `stop()` la elimina. Las teclas `P` / `Esc` siguen funcionando igual que hoy.
     El resto del juego (física de bola y pala, colisiones, construcción de niveles, explosiones de `effects.js`, dibujo de HUD y menús, avance de nivel, condición de `VICTORIA` al superar el nivel 3) **no se toca**.
- `components/arkanoid-player.tsx` — **nuevo**, `"use client"`. Calcado de `components/tetris-player.tsx` / `components/asteroids-player.tsx`:
  - Un `<canvas ref>` `width={800} height={600}` (backing store nativo 800×600) escalado por CSS a lo ancho del gabinete manteniendo 4:3 (`w-full aspect-[4/3]`), con `image-rendering: pixelated` (el spritesheet es pixel-art). El gabinete CRT (borde, scanlines, viñeta) se mantiene como marco.
  - `<Script src="/games/arkanoid/game.js" strategy="afterInteractive" onReady={…}>` de `next/script`. En `onReady` (con el `<canvas>` ya montado) llama a `window.startArkanoid(canvasRef.current)` y guarda el `stop()`. El cleanup del `useEffect` llama a `stop()`. Mismo guardarraíl que `TetrisPlayer` contra el doble arranque (`if (stopRef.current || !canvasRef.current || !window.startArkanoid) return`).
  - Estado local `{ score, lives, level, phase }` alimentado por un listener de `message` sobre `window` que filtra `event.origin === window.location.origin`, `event.source === window` y `event.data?.source === "arkanoid"`. Si llega un `state` con `phase !== "gameover"`, cierra el modal (para que "Jugar de nuevo" no lo deje tapando la partida reiniciada).
  - El HUD React del reproductor con **el mismo marcado y clases** que hoy tiene el bloque mock de `app/jugar/[slug]/page.tsx`: el tercer bloque es **"Vidas / Nivel"** con los corazones SVG (`state.lives`) y `LVL {state.level}` reales — Arkanoid sí tiene vidas y nivel, así que se reutiliza tal cual. La etiqueta de jugador queda fija (`"G4M3R_X"`). Puntuación formateada a 7 dígitos con ceros a la izquierda.
  - **Sin overlay React de "PAUSA".** A diferencia de `TetrisPlayer`, Arkanoid ya
    dibuja su propia pantalla de PAUSA dentro del canvas (`dibujarPausaOverlay` /
    `dibujarMenuPausa` de `js/menu.js`), así que **no** se añade un `<p>PAUSA</p>`
    React: duplicaría el indicador. (Ajustado durante la implementación tras
    verlo en pantalla.)
  - `<GameOverModal>` en modo controlado: se abre al recibir `type: "gameover"` con `finalScore` = la puntuación final real (formateada igual que el HUD); "Salir" del control deck lo abre con la puntuación vigente. Al cerrar con "Jugar de nuevo" en estado `gameover` llama a `window.restartArkanoid()`. Pasa `onPause={() => window.toggleArkanoidPause?.()}` y `onSave={() => guardarPuntuacionArkanoid({ score: state.score })}`.
  - Bajo el gabinete, un aviso discreto: `←→` mueven la pala, `Espacio` empieza la partida y lanza la bola, `P` o `Esc` pausan; además, mover el cursor sobre la pantalla mueve la pala. No se añaden controles táctiles.
- `app/jugar/[slug]/actions.ts` — **modificado**. Se añade `guardarPuntuacionArkanoid(input: { score: number }): Promise<{ ok: boolean; error?: string }>`, gemela de `guardarPuntuacionTetris`:
  - Valida `Number.isInteger(input.score) && input.score > 0`; si no, devuelve `{ ok: false, error }` sin tocar la BD.
  - Inserta `{ game_slug: "arkanoid", player: "G4M3R_X", score: input.score, achieved_at: null }` en `public.scores` con el cliente sin cookies `@/lib/supabase/anon` (la política `anon_insert_scores` de SPEC 07 lo permite; no se usa `SUPABASE_SECRET_KEY`).
  - En éxito: `revalidatePath("/salon-de-la-fama")` y `revalidatePath("/juegos/arkanoid")`; devuelve `{ ok: true }`. En error de Supabase: `console.error` y `{ ok: false, error }`.
  - `PLAYER_LABEL` y el tipo `GuardarResult` ya existentes en el archivo se reutilizan.
- `app/jugar/[slug]/page.tsx` — **modificado**. La rama jugable pasa a `slug === "asteroids" || slug === "tetris" || slug === "arkanoid"`, con `slug === "arkanoid"` → `<ArkanoidPlayer game={game} />`. Para los otros tres slugs (`snake`, `pac-man`, `space-invaders`) la página queda **exactamente igual** (HUD mock + `<Image>` + `GameOverModal` no controlado). `generateStaticParams`, `getGame` y `notFound()` no cambian.
- `AGENTS.md` — si `next dev` lo regenera, se commitea junto con el trabajo.

**Out of scope (para futuras specs):**

- Hacer jugables `snake`, `pac-man`, `space-invaders`. Sus `/jugar/[slug]` siguen siendo maqueta. No se añade ningún mecanismo genérico de embebido.
- Auth real: `scores.user_id`, sesión en el header, identidad de jugador. La escritura sigue anclada a la etiqueta fija `"G4M3R_X"`.
- Sonido: el módulo `js/audio.js` y los `.mp3` se quedan fuera del fork.
- Persistencia propia del juego: highscore local (`arkanoid:highscore:v1`), partida guardada (`arkanoid:savegame:v1`) y el flujo "Reanudar" del menú de INICIO. El leaderboard de Supabase es la única persistencia.
- Controles táctiles o gamepad; cualquier cambio de jugabilidad (velocidad de bola, ángulos de rebote, puntuación por color, layout de niveles, power-ups).
- Nueva migración de `games` o de `scores`: `arkanoid` ya está en `public.games` y la política `anon_insert_scores` de SPEC 07 ya cubre este `INSERT`.
- Regenerar `lib/supabase/database.types.ts`: no cambia el esquema.
- `games.best_score` derivado de `scores` o refrescado al guardar. Sigue siendo columna propia sembrada.
- Ranking global / `lib/activity.ts`: siguen mock.
- Cambiar `lib/games.ts` / `lib/leaderboards.ts`: no necesitan edición para esta ruta.
- Cambiar `app/juegos/[slug]/page.tsx` (detalle) salvo su revalidación on-demand vía `revalidatePath`.
- Copiar `index.html` / `styles.css` del juego original.
- Migrar el juego a TypeScript o a un componente React que lo reimplemente.
- "Guardar puntuación" funcional en `/jugar/asteroids` (SPEC 05 lo dejó visual; SPEC 07 solo lo cableó para tetris).
- Rate limiting / anti-spam del `INSERT` más allá del `with check` de la política y del botón que se deshabilita tras guardar.
- Tests automatizados (no hay framework configurado).
- Editar los archivos de las SPEC 01–07 salvo lo listado en Scope.

---

## Data model

Esta feature **no crea tablas ni migraciones** (`arkanoid` ya está en `public.games`; la política `anon_insert_scores` de SPEC 07 ya permite el `INSERT`). Introduce dos estructuras en código.

### Mensaje emitido por el fork

```ts
// Emitido por public/games/arkanoid/game.js
// vía window.postMessage(msg, window.location.origin)

type ArkanoidMessage =
  | {
      source: "arkanoid";
      type: "state";
      score: number; // state.puntuacion — puntuación acumulada (entero)
      lives: number; // state.vidas — vidas restantes (arranca en 3, llega a 0)
      level: number; // state.nivelIndice + 1 — nivel actual (1..3)
      phase: "menu" | "playing" | "paused" | "gameover";
    }
  | {
      source: "arkanoid";
      type: "gameover";
      score: number; // puntuación final (DERROTA o VICTORIA)
    };
```

- **`lives` y `level` sí aplican:** Arkanoid tiene ambos conceptos, así que el mensaje transporta la misma tripleta `score` / `lives` / `level` que `AsteroidsMessage` (SPEC 05). El HUD "Vidas / Nivel" de la maqueta se reutiliza sin cambios de marcado.
- **`phase`** no existe como variable en el juego: se deriva de `state.pantalla` en el momento de emitir. `"menu"` es fase nueva (el juego arranca en un menú de INICIO dibujado en canvas que exige pulsar `Espacio`); `"paused"` corresponde a la pausa nativa con `P` / `Esc`.
- **`VICTORIA` y `DERROTA` no se distinguen** en el mensaje: ambas llevan a `state.pantalla === FIN` → `phase: "gameover"` y un `type: "gameover"` con la puntuación final. El canvas sigue pintando internamente `HAS GANADO` o `GAME OVER`; el modal React "Fin del juego" se abre igual en los dos casos.
- Emisor y receptor están en la **misma ventana** (no hay iframe); se usa `window.postMessage` a `window.location.origin` por portabilidad futura, igual que SPEC 05 / 07.
- El receptor descarta cualquier mensaje cuyo `origin` no sea el propio, cuyo `source` no sea `window`, o cuyo `data.source` no sea `"arkanoid"`.
- La puntuación se formatea a 7 dígitos con ceros a la izquierda solo en la capa React; el fork la emite como entero.
- Además del canal de mensajes, el fork expone `window.restartArkanoid()` y `window.toggleArkanoidPause()`: no son mensajes, son llamadas directas React → juego, disponibles solo mientras la partida está activa; `stop()` las elimina.

### Entrada de la Server Action

```ts
// app/jugar/[slug]/actions.ts — "use server"
// Inserta una fila en public.scores.
async function guardarPuntuacionArkanoid(input: {
  score: number; // entero > 0; el resto de campos los fija la acción
}): Promise<{ ok: boolean; error?: string }>;
// Inserta: { game_slug: "arkanoid", player: "G4M3R_X", score, achieved_at: null }
// En éxito revalida /salon-de-la-fama y /juegos/arkanoid.
```

No se añaden políticas RLS. La política `anon_insert_scores` de SPEC 07 (`for insert to anon with check (achieved_at is null and score > 0 and player <> '')`) cubre este `INSERT`. `lib/games.ts`, `lib/leaderboards.ts` y `lib/supabase/database.types.ts` no cambian.

---

## Implementation plan

1. **Bifurcar el juego a un único archivo.** Crear `public/games/arkanoid/game.js` concatenando la API del spritesheet + los nueve módulos ES (sin `import` / `export`, sin `js/audio.js`, sin `js/storage.js`) en orden de dependencia, y copiar `assets/spritesheet-breakout.png` a `public/games/arkanoid/assets/spritesheet-breakout.png` (ajustar la `src` del `Image` interno a `/games/arkanoid/assets/spritesheet-breakout.png`). De momento el archivo mantiene el arranque automático. `npm run build` sigue verde (nada lo referencia).

2. **Quitar audio y `localStorage`.** Eliminar las llamadas a `reproducir(...)` de las colisiones; convertir `getHighscore` / `setHighscore` en no-op (`0`), `hayPartidaGuardada` en `false`, `guardarEstadoPartida` en no-op. Verificar en una consola de navegador (sirviendo el archivo suelto) que el juego arranca, rompe bloques, pierde vidas y llega a `GAME OVER` sin tocar `localStorage` ni pedir `.mp3`.

3. **Boot re-entrante + teardown de input.** Envolver el cuerpo en `function startArkanoid(canvasEl)` que usa `canvasEl`, expone `window.startArkanoid` y ejecuta dentro `iniciarInput(canvasEl)` / `irAInicio()` / `loadSpritesheet(cb)`. Guardar el id del `requestAnimationFrame`; sustituir el arranque final por `return stop`, donde `stop()` hace `cancelAnimationFrame`, marca `detenido = true` (el callback de `loadSpritesheet` comprueba ese flag antes de programar el bucle) y quita los listeners de `window` (`keydown` / `keyup`) y de `canvasEl` (`mousemove` / `mouseleave` / `click`). Probar en consola que `window.startArkanoid(document.querySelector('canvas'))` arranca sobre un canvas suelto y que el `stop()` devuelto deja de dibujar y libera el teclado.

4. **Emisión de estado.** Tras `actualizar(dt)` (donde ya se conocen `puntuacion` / `vidas` / `nivelIndice` / `pantalla`), comparar con lo último emitido y `window.postMessage({ source:"arkanoid", type:"state", score, lives, level, phase }, window.location.origin)`. En `terminarPartida()`, emitir además `{ source:"arkanoid", type:"gameover", score }`. Comprobar los mensajes con `addEventListener("message", …)` en la consola: menú → `phase:"menu"`, jugando → `"playing"`, `P` → `"paused"`, fin → `"gameover"` + `gameover`.

5. **Reinicio y pausa programáticos.** Dentro de `startArkanoid`, exponer `window.restartArkanoid` (= `reiniciarContadores()` + `empezarNivel()`) y `window.toggleArkanoidPause` (alterna `JUGANDO ↔ PAUSA` overlay); eliminarlas en `stop()`. Verificar en consola que ambas funcionan y que tras `stop()` no queda bucle huérfano ni listeners.

6. **Componente `ArkanoidPlayer` — canvas + arranque.** Crear `components/arkanoid-player.tsx` (`"use client"`) con el gabinete CRT (portado del bloque mock actual, sin `<Image>`), el `<canvas ref>` 800×600 escalado a `w-full aspect-[4/3]` con `image-rendering: pixelated`, y `<Script src="/games/arkanoid/game.js" strategy="afterInteractive" onReady={…}>`. En `onReady` llamar a `window.startArkanoid(canvasRef.current)` y guardar el `stop`; cleanup del `useEffect` → `stop()`. Montarlo en `app/jugar/[slug]/page.tsx` para `slug === "arkanoid"`. Abrir `/jugar/arkanoid`: se ve el menú, `Espacio` empieza, se juega con `←→` y con el ratón.

7. **HUD sincronizado + PAUSA.** En `ArkanoidPlayer`, añadir estado `{ score, lives, level, phase }` y el listener de `message` (filtros de origen / source / window). Portar el marcado del HUD "Vidas / Nivel" (corazones + `LVL n`) leyendo del estado real. Mostrar "PAUSA" sobre el canvas cuando `phase === "paused"`. Jugar y comprobar que los números del HUD React coinciden con lo que el juego pinta dentro del canvas y que `P` / `Esc` pausan.

8. **Modal controlado + Pausa + Guardar.** En `ArkanoidPlayer`, abrir el modal al recibir `type:"gameover"` con `finalScore` real; "Salir" lo abre con la puntuación vigente; "Jugar de nuevo" en `gameover` → `window.restartArkanoid()`; `onPause={() => window.toggleArkanoidPause?.()}`. Añadir `guardarPuntuacionArkanoid` a `app/jugar/[slug]/actions.ts` y pasar `onSave={() => guardarPuntuacionArkanoid({ score: state.score })}`. Recorrer `/jugar/asteroids`, `/jugar/tetris`, `/jugar/snake`: sus modales siguen igual (asteroids con "Guardar" visual, tetris con su propia acción, snake no controlado).

9. **Escritura real end-to-end.** Jugar una partida completa en `/jugar/arkanoid` hasta `FIN` (derrota o victoria), pulsar "Guardar puntuación": el botón pasa a "Guardando…" y luego a "Puntuación guardada" (deshabilitado). Verificar la fila nueva en `public.scores` (`select * from public.scores where game_slug='arkanoid' order by created_at desc limit 1`) y que aparece en `/salon-de-la-fama` (pestaña Arkanoid) y en `/juegos/arkanoid` (tabla lateral) tras la revalidación. Comprobar que un segundo click no inserta otra fila y que un `score` de `0` (rechazado por la acción) no toca la BD.

10. **Rama de `arkanoid` en la página.** Dejar `app/jugar/[slug]/page.tsx` con las tres ramas jugables (`asteroids`, `tetris`, `arkanoid`) y el JSX mock intacto para `snake`, `pac-man`, `space-invaders`. Confirmar que esas tres rutas renderizan igual que antes de la spec.

11. **Cierre.** `npm run lint` y `npm run build` verdes. **Verificar el teclado en build de producción** (`npm run build` + `npm run start`, no solo `next dev`): `←→`, `Espacio`, `P` y `Esc` deben responder en `/jugar/arkanoid` (regresión conocida: en el juego suelto el teclado dejó de funcionar al subir a producción). Recorrer `/jugar/arkanoid` (partida completa + guardar), `/jugar/asteroids`, `/jugar/tetris`, `/jugar/pac-man` (maqueta intacta), `/salon-de-la-fama`, `/juegos/arkanoid`, `/`. Si `next dev` regeneró `AGENTS.md`, commitearlo junto con el trabajo. No hay `.sql` nuevo que commitear.

---

## Acceptance criteria

- [x] `npm run build` termina sin errores ni fallos de tipos.
- [x] `npm run lint` pasa sin errores.
- [x] Existe `public/games/arkanoid/game.js` (archivo único, no `type="module"`) y se sirve en `http://localhost:3000/games/arkanoid/game.js`; `public/games/arkanoid/assets/spritesheet-breakout.png` también se sirve.
- [x] En `/jugar/arkanoid` se ve el juego real: arranca en el menú de INICIO, `Espacio` (o clic en "Nueva partida") empieza la partida, `←→` y el ratón mueven la pala, `Espacio` lanza la bola, los bloques se rompen y suman puntos, perder la bola resta una vida y la partida llega a `GAME OVER` al agotar las 3 vidas o a `HAS GANADO` al superar el nivel 3.
- [x] **El teclado responde en un build de producción** (`npm run start`), no solo en `next dev`: `←→`, `Espacio`, `P` y `Esc` funcionan en `/jugar/arkanoid`.
- [x] `game.js` no arranca al cargar el `<script>`; arranca cuando `ArkanoidPlayer` llama a `window.startArkanoid(canvas)`, y al desmontar el componente se cancela el `requestAnimationFrame` y se quitan los listeners de teclado (`window`) y de ratón (`canvas`) — no queda bucle huérfano al navegar a otra ruta y volver, ni siquiera si se navega antes de que cargue el spritesheet.
- [x] El HUD React de `/jugar/arkanoid` muestra puntuación (7 dígitos, ceros a la izquierda), **vidas** (corazones) y **nivel** reales, sincronizados con lo que el juego pinta dentro del canvas.
- [x] Al pausar con `P` o `Esc` aparece **un solo** indicador "PAUSA" sobre el canvas —el que dibuja el propio juego—; al reanudar, desaparece. (No se añade overlay React: evitaría el doble "PAUSA".)
- [x] El botón "Pausa" del control deck alterna la pausa del juego, igual que la tecla `P`.
- [x] Al llegar a `FIN` (derrota o victoria), el modal "Fin del juego" se abre solo y su "Puntuación final" es la puntuación real de esa partida (no un valor mock).
- [x] El botón "Salir" del control deck abre el modal con la puntuación real vigente.
- [x] "Guardar puntuación" inserta una fila en `public.scores` con `game_slug = 'arkanoid'`, `player = 'G4M3R_X'`, `score` = la puntuación real y `achieved_at = null`. Tras el guardado el botón queda deshabilitado con texto de confirmación; un segundo click no inserta otra fila.
- [x] `guardarPuntuacionArkanoid` rechaza (sin tocar la BD) un `score` no entero o `≤ 0`.
- [x] La fila guardada aparece en `/salon-de-la-fama` (pestaña Arkanoid) y en `/juegos/arkanoid` (tabla lateral) sin reiniciar el servidor (revalidación on-demand).
- [x] Al reabrir el modal en una partida nueva, "Guardar puntuación" vuelve a estar habilitado.
- [x] "Jugar de nuevo" cierra el modal y, si la partida había terminado, reinicia el motor vía `window.restartArkanoid()` sin recrear el `<canvas>`.
- [x] El fork no lee ni escribe `localStorage`, no reproduce sonido y no solicita ningún `.mp3`; la opción "Reanudar" del menú de INICIO aparece siempre deshabilitada.
- [x] No se ha creado ninguna migración nueva bajo `supabase/migrations/`; `public.scores` conserva exactamente las políticas de SPEC 06 + SPEC 07.
- [x] `/jugar/asteroids` y `/jugar/tetris` siguen jugables como en SPEC 05 / 07 y su comportamiento de guardado no cambia.
- [x] `/jugar/snake`, `/jugar/pac-man`, `/jugar/space-invaders` renderizan igual que antes de esta spec: HUD mock, gabinete con `<Image>` y texto "Insert coin", `GameOverModal` no controlado.
- [x] `lib/games.ts`, `lib/leaderboards.ts` y `lib/supabase/database.types.ts` no cambian.
- [x] `app/globals.css` no tiene reglas nuevas respecto al estado actual.
- [x] `SUPABASE_SECRET_KEY` sigue sin importarse en ningún archivo de la app; `guardarPuntuacionArkanoid` usa `@/lib/supabase/anon`.
- [x] Todo el texto visible nuevo (`ArkanoidPlayer`, aviso de controles) está en español con acentos correctos.
- [x] Un `slug` inexistente bajo `/jugar/` sigue devolviendo la 404 de Next.

---

## Decisions

- **Sí:** integrar `arkanoid` como su propia spec, con su propio fork y sus propias fricciones (multi-módulo, spritesheet clásico, menú de INICIO, pausa nativa, ratón, `localStorage` propio). Igual que SPEC 05 con `asteroids` y SPEC 07 con `tetris`, uno a uno.
- **Sí (empaquetado):** concatenar los nueve módulos ES + la API del spritesheet en un **único `game.js` clásico**. Es lo que ya hacen `asteroids` y `tetris` en `public/games/`; mantiene el contrato `window.startArkanoid(canvas)` / `stop()` y la re-entrada en navegación SPA sencillos. Servir el árbol de módulos ES con `<Script type="module">` haría más frágil el `stop()` y la carga previa del script clásico del spritesheet.
- **Sí (placement del HUD):** portar el HUD (score / vidas / nivel) al reproductor React vía `postMessage`, no replicarlo aparte. El HUD del juego ya se dibuja dentro del canvas y **no depende de DOM externo** (a diferencia de tetris); se acepta la duplicación temporal (HUD en canvas + HUD React) para no tocar `dibujarHud`. El overlay de `GAME OVER` / `HAS GANADO` del canvas lo acompaña el `GameOverModal` React.
- **Sí (persistencia propia):** eliminar del fork **todo** el `localStorage` (`arkanoid:highscore:v1` y `arkanoid:savegame:v1`). El highscore local y el flujo "Reanudar" (con su escritura de partida al pausar) son estado paralelo al leaderboard de Supabase, que es ahora la persistencia real; quitarlos reduce el fork y evita un segundo sistema de guardado que el usuario no ve. Misma postura que SPEC 07 tomó con el `localStorage` de tetris.
- **Sí:** mantener el **menú de INICIO** dibujado en canvas (el jugador pulsa `Espacio` para "Nueva partida"). Autoarrancar el nivel 1 exigiría tocar el boot del juego; el menú es cero cambio de jugabilidad y la fase `"menu"` viaja en el mensaje. "Reanudar" queda deshabilitada porque no hay partida guardada.
- **Sí:** mantener el **control de la pala con ratón** (además de `←→`). Es control nativo de Arkanoid y no estorba; los listeners van sobre el `canvas` y se quitan en `stop()`.
- **Sí:** cablear el botón "Pausa" del control deck vía `window.toggleArkanoidPause()`, además de la pausa nativa con `P` / `Esc`. Mismo planteamiento que SPEC 07 para tetris; el usuario lo pidió.
- **Sí:** `phase` con cuatro valores (`"menu" | "playing" | "paused" | "gameover"`), derivada de `state.pantalla` al emitir. Arkanoid no tiene una variable de fase única y arranca en un menú que asteroids / tetris no tenían.
- **Sí:** `VICTORIA` y `DERROTA` emiten el mismo `type: "gameover"` sin distinguirse en el mensaje. El modal "Fin del juego" muestra la puntuación final en ambos casos; el canvas ya pinta el texto correcto ("HAS GANADO" / "GAME OVER"). Añadir una fase `"won"` sería más código en el reproductor para un caso poco frecuente.
- **Sí:** quitar el audio del fork (no incluir `js/audio.js`, no copiar los `.mp3`). El sonido está fuera de alcance en este tipo de spec, igual que en `asteroids` y `tetris`.
- **Sí (write policy):** reutilizar la política RLS `anon_insert_scores` de SPEC 07 sin crear ninguna migración. No es específica de slug (`with check (achieved_at is null and score > 0 and player <> '')`) y **no hay auth en el proyecto todavía** (postura heredada de SPEC 06 para `SELECT`): cerrarla bloquearía la feature. El anti-abuso real llega con la spec de auth.
- **Sí:** una segunda Server Action `guardarPuntuacionArkanoid` en el mismo `app/jugar/[slug]/actions.ts`, gemela de `guardarPuntuacionTetris`, en vez de generalizar una sola acción por `slug`. Mantiene cada juego con su `game_slug` y sus `revalidatePath` explícitos y el cambio pequeño; generalizar es refactor para otra spec si llegan más juegos.
- **Sí:** validar `score` entero `> 0` y confiar en que el reproductor solo ofrece "Guardar" en `gameover`. Guardar un 0 no aporta nada al leaderboard.
- **Sí:** `revalidatePath("/salon-de-la-fama")` y `revalidatePath("/juegos/arkanoid")` tras insertar. Son las dos únicas rutas que leen el leaderboard de Arkanoid.
- **No:** reimplementar el juego como componente React. Reescribe un juego que funciona; alto coste, sin beneficio.
- **No:** "Guardar puntuación" funcional en `/jugar/asteroids`. SPEC 05 lo dejó visual; ampliarlo es otra decisión. `onSave` solo se pasa desde `TetrisPlayer` y `ArkanoidPlayer`.
- **No:** controles táctiles / gamepad, sonido, cambios de jugabilidad. Scope creep; otra spec si se pide.

---

## Risks

| Riesgo                                                                                                                                                                                                              | Mitigación                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| El bucle `requestAnimationFrame` solo arranca dentro del callback de `loadSpritesheet(...)`; si `stop()` corre antes de que el PNG cargue, el callback programaría un bucle huérfano sobre un canvas ya desmontado. | `startArkanoid` marca un flag `detenido` en `stop()`; el callback de `loadSpritesheet` comprueba ese flag antes de llamar a `requestAnimationFrame(bucle)`. Criterio de aceptación: "navegar fuera y volver, incluso antes de que cargue el spritesheet".                                  |
| Regresión conocida: en el juego suelto el teclado dejó de responder al subir a producción.                                                                                                                          | El fork registra `keydown` / `keyup` sobre `window` (no sobre el canvas, que necesitaría foco) dentro de `startArkanoid`. Criterio de aceptación explícito: verificar el teclado en `npm run build` + `npm run start`, no solo en `next dev`.                                              |
| Concatenar nueve módulos ES a mano puede dejar un orden de dependencias incorrecto o colisiones de nombres (`ANCHO`, `ALTO`, `texto`, `limitar` se repiten entre módulos).                                          | El paso 1 concatena en orden de dependencia y envuelve todo en el scope de `startArkanoid` (una sola función), evitando fugas al scope global salvo `window.startArkanoid` / `restartArkanoid` / `toggleArkanoidPause`. `npm run build` y el recorrido manual del paso 11 cubren el resto. |
| `effects.js` usa la const global `EXPLOSION_FRAMES` y `drawFrame` del script clásico `spritesheet.js`; al inlinar como módulo podrían quedar fuera de alcance.                                                      | La API del spritesheet se inlina **primero** en el mismo scope de función, de modo que `EXPLOSION_FRAMES` / `drawFrame` / `drawSprite` son visibles para el resto del fork.                                                                                                                |
| El juego arranca en un menú de INICIO: un jugador que no pulsa `Espacio` cree que el juego está "colgado".                                                                                                          | Aviso bajo el gabinete ("`Espacio` empieza la partida"); la fase `"menu"` está documentada y el HUD ya muestra valores iniciales coherentes (3 vidas, nivel 1, 0 puntos).                                                                                                                  |
| Los listeners de teclado hacen `preventDefault` de flechas y `Space`, bloqueando el scroll de la página mientras se juega.                                                                                          | Comportamiento aceptado en un arcade a pantalla completa (igual que SPEC 05 / 07); `stop()` retira los listeners al desmontar.                                                                                                                                                             |
| Emitir un `postMessage` por frame satura el hilo o dispara renders de React en cada frame.                                                                                                                          | El fork solo emite cuando `puntuacion` / `vidas` / `nivelIndice` / `pantalla` cambian (chequeo sucio); React re-renderiza pocas veces por partida.                                                                                                                                         |
| Un `postMessage` de otro origen o de una extensión se cuela como estado del juego.                                                                                                                                  | El receptor filtra por `event.origin === window.location.origin`, `event.source === window` y `event.data.source === "arkanoid"`.                                                                                                                                                          |
| Sin auth, cualquiera puede insertar filas en `public.scores` (spam del leaderboard).                                                                                                                                | Postura heredada de SPEC 06 / 07: sin auth no hay identidad que verificar. El `with check` acota los valores y el botón se deshabilita tras guardar; el anti-abuso real es la spec de auth.                                                                                                |
| `revalidatePath` sobre `/juegos/arkanoid` y `/salon-de-la-fama`, que se generan de forma estática, no refresca la vista.                                                                                            | La revalidación on-demand desde la Server Action invalida el caché de esas rutas; el criterio de aceptación exige ver la fila nueva sin reiniciar el servidor.                                                                                                                             |
| `next dev` reescribe `AGENTS.md` y deja el árbol sucio.                                                                                                                                                             | Commitear el `AGENTS.md` regenerado junto con el trabajo (paso 11).                                                                                                                                                                                                                        |

---

## Lo que **no** entra en esta spec

- Hacer jugables `snake`, `pac-man`, `space-invaders`.
- Auth real: `scores.user_id`, sesión en el header, identidad de jugador.
- Sonido del juego (`js/audio.js`, los `.mp3`).
- Persistencia propia del juego: highscore local, partida guardada, flujo "Reanudar".
- "Guardar puntuación" funcional en `/jugar/asteroids`.
- Nueva migración de `games` o `scores`; regenerar `lib/supabase/database.types.ts`.
- Derivar / refrescar `games.best_score` desde `scores`.
- Ranking global agregado en la home; migrar `lib/activity.ts` a Supabase.
- Controles táctiles / gamepad; cambios de jugabilidad.
- Rate limiting del `INSERT` más allá del `with check` y del botón deshabilitado.
- Tests automatizados; edición de las SPEC 01–07 fuera de lo listado en Scope.

Cada uno de esos, si llega, va en su propia spec.
