# SPEC 09 — Snake jugable en `/jugar/snake` con guardado de puntuación

> **Status:** Implementado
> **Depends on:** SPEC 05, SPEC 06, SPEC 07
> **Date:** 2026-09-03
> **Objective:** Poner un Snake de cuadrícula jugable de verdad en la ruta `/jugar/snake`, escrito desde cero sobre `resources/snake-assets/` (spritesheet de frutas), con el HUD React del reproductor sincronizado al estado real del juego y "Guardar puntuación" insertando la marca en `public.scores` reutilizando la escritura real que SPEC 07 estrenó para Tetris.

---

## Por qué existe esta spec

SPEC 05 dejó `asteroids` jugable en `/jugar/asteroids` bifurcando su `game.js` a `public/games/asteroids/`, envuelto en `window.startAsteroids(canvas)` / `stop()` / `restartAsteroids()` y sincronizado con el HUD React vía `window.postMessage`. SPEC 07 repitió el patrón para `tetris` y añadió la primera escritura real del proyecto: la política RLS `anon_insert_scores` sobre `public.scores` (`supabase/migrations/0003_scores_allow_anon_insert.sql`), la Server Action `guardarPuntuacionTetris` en `app/jugar/[slug]/actions.ts` y las props opcionales `onPause` / `onSave` de `GameOverModal`. SPEC 08 lo repitió para `arkanoid` sin migración nueva (la política `anon_insert_scores` no es específica de slug).

Esta spec hace lo mismo para `snake`, con **una diferencia de fondo respecto a 05/07/08: no hay juego starter que bifurcar.** `resources/started-games/` solo contiene asteroids, tetris y arkanoid. Lo único de Snake es `resources/snake-assets/`:

- `fruits.png` — spritesheet RGBA `3790×442`, una fila de 22 frutas con fondo transparente (585 KB, binario).
- `sprites.js` — script **clásico** (no módulo) que define `window.SPRITE_ATLAS` con `sources.fruits` y el recorte `{ x, y, w, h }` de cada fruta (`banana`, `orange`, … `melon`).

Por tanto esta spec describe **escribir `public/games/snake/game.js` desde cero**: un Snake de cuadrícula minimalista que respeta el mismo contrato `window.startSnake(canvasEl)` / `stop()` / `restartSnake()` / `toggleSnakePause()` de las specs anteriores y usa `fruits.png` como comida. No se reimplementa nada existente; se autora lo mínimo para tener una partida completa.

`snake` **ya existe** en `public.games` (`supabase/migrations/0001_create_games.sql`, `sort_order` 3, `best_score` `'003,150'`): esta spec **no** crea ninguna migración de `games`. La política `anon_insert_scores` de SPEC 07 (`with check (achieved_at is null and score > 0 and player <> '')`) **no es específica de slug**, así que **esta spec no crea ninguna migración**: solo una tercera Server Action que inserta con `game_slug = "snake"`.

Snake **no tiene la forma de asteroids**: **no hay vidas** (una sola colisión termina la partida), no dibuja HUD dentro del canvas (lo autoramos nosotros y lo dejamos fuera), no lee ni escribe `localStorage`, y su comida es un sprite bitmap que hay que cargar de forma asíncrona antes de que el bucle pueda dibujar. Sí hay un "nivel" derivado: la serpiente acelera por tramos conforme come.

**Regla de estilos (heredada de SPEC 01–08):** `app/globals.css` no se toca. Todo estilo adicional se resuelve con utilidades de Tailwind en el JSX. El `game.js` autoral dibuja su propio tablero, rejilla, serpiente y fruta en canvas y no aporta CSS.

---

## Scope

**In:**

- `public/games/snake/fruits.png` — **nuevo**. Copia verbatim de `resources/snake-assets/fruits.png`.
- `public/games/snake/sprites.js` — **nuevo**. Copia verbatim de `resources/snake-assets/sprites.js` (sigue exponiendo `window.SPRITE_ATLAS`). Su campo `sources.fruits: 'snake-assets/fruits.png'` es una ruta relativa que **no resuelve** servida desde `/games/snake/`; el `game.js` autoral **no usa esa cadena**: fija `img.src = "/games/snake/fruits.png"` él mismo.
- `public/games/snake/game.js` — **nuevo**. Snake de cuadrícula escrito desde cero (script clásico, no `type="module"`, sin dependencias ni bundler), con:
  1. **Boot re-entrante.** Todo el juego vive dentro de `function startSnake(canvasEl)` expuesta como `window.startSnake`. Usa `canvasEl` (no `document.getElementById`). No arranca solo al cargar el script: lo invoca el componente React. Devuelve `stop()` que hace `cancelAnimationFrame` del frame en curso, marca un flag `detenido` (para que el `img.onload` pendiente no arranque el bucle si `stop()` corrió antes de que cargara el PNG) y quita el listener de teclado que registró.
  2. **Malla y serpiente.** Backing store nativo `800×600`, celda de `40 px` → cuadrícula `20×15`. Serpiente inicial de 3 segmentos en el centro, avanzando a la derecha. Un acumulador de tiempo hace avanzar la serpiente una celda cada `tickMs` (inicial `140`); entre ticks el bucle solo repinta. (Las cifras concretas —celda, tamaño de malla, `tickMs`— son ajustables durante la implementación sin cambiar el contrato.)
  3. **Comida.** Al comer (la cabeza entra en la celda de la fruta): la serpiente crece un segmento, `frutas++`, `score += 10 * level`, y se coloca una fruta nueva en una celda libre aleatoria con un **sprite aleatorio** de `window.SPRITE_ATLAS.fruits` (una de las 22), dibujado con `ctx.drawImage(img, s.x, s.y, s.w, s.h, celdaX, celdaY, 40, 40)`. La primera fruta se coloca al arrancar / reiniciar.
  4. **Nivel y velocidad.** `level = Math.floor(frutas / 5) + 1`. `tickMs = Math.max(60, 140 - (level - 1) * 20)`: cada 5 frutas la serpiente acelera un escalón hasta un suelo de `60 ms`. El nivel viaja en el mensaje de estado y multiplica la puntuación por fruta.
  5. **Muerte.** La partida entra en `phase = "gameover"` cuando la cabeza sale de la malla (**colisión con el muro**, no hay envoltura) o cae sobre un segmento propio. No hay vidas: una colisión termina la partida.
  6. **Giro.** El `keydown` fija la dirección deseada; se **rechaza el giro de 180°** (no puede invertir sobre sí misma) y se aplica **a lo sumo un giro por tick** (buffer de un giro) para que dos teclas rápidas en el mismo tick no provoquen un suicidio instantáneo.
  7. **Emisión de estado** con `window.postMessage(msg, window.location.origin)`, con chequeo sucio barato (solo se emite si cambió algún valor):
     - Cuando cambian `score`, `length` (segmentos), `level` o la fase: `{ source: "snake", type: "state", score, length, level, phase }` con `phase ∈ "playing" | "paused" | "gameover"`.
     - Al entrar en `gameover`: además `{ source: "snake", type: "gameover", score }` con la puntuación final.
  8. **Teclado.** El listener `keydown` se registra sobre `window` dentro de `startSnake` y se quita en `stop()`. `preventDefault` de `ArrowUp` / `ArrowDown` / `ArrowLeft` / `ArrowRight` / `Space` (para que la página no haga scroll mientras se juega). Flechas → giro; `KeyP` → alterna pausa.
  9. **Reinicio programático.** Mientras hay partida activa se expone `window.restartSnake`: reinicia serpiente (3 segmentos al centro, dirección derecha), `score`, `frutas`, `level`, `tickMs` y coloca la primera fruta, sin recrear el `<canvas>` ni el `requestAnimationFrame`. `stop()` la elimina.
  10. **Pausa programática.** Mientras hay partida activa se expone `window.toggleSnakePause`: alterna `phase` `playing ↔ paused` congelando el acumulador de tiempo (la serpiente no avanza en pausa). La tecla `P` hace lo mismo. Fuera de `playing` / `paused` es no-op. `stop()` la elimina.
- `components/snake-player.tsx` — **nuevo**, `"use client"`. Calcado de `components/arkanoid-player.tsx`:
  - Un `<canvas ref>` `width={800} height={600}` (backing store nativo `800×600`) escalado por CSS a lo ancho del gabinete manteniendo 4:3 (`w-full aspect-[4/3]`), con `image-rendering: pixelated` (los sprites de fruta son bitmap). El gabinete CRT (borde, scanlines, viñeta) se mantiene como marco.
  - Dos `<Script strategy="afterInteractive">` de `next/script`: `src="/games/snake/sprites.js"` y `src="/games/snake/game.js"`. El orden de ejecución entre dos scripts `afterInteractive` no está garantizado, así que el componente **exige ambos `onReady`** (un contador / dos flags) **y** el `<canvas>` montado antes de llamar a `window.startSnake(canvasRef.current)`. Guarda el `stop()` devuelto; el cleanup del `useEffect` lo llama. Mismo guardarraíl que `ArkanoidPlayer` contra el doble arranque (`if (stopRef.current || !canvasRef.current || !window.startSnake) return`).
  - Estado local `{ score, length, level, phase }` alimentado por un listener de `message` sobre `window` que filtra `event.origin === window.location.origin`, `event.source === window` y `event.data?.source === "snake"`. Si llega un `state` con `phase !== "gameover"`, cierra el modal (para que "Jugar de nuevo" no lo deje tapando la partida reiniciada).
  - El HUD React del reproductor con **el mismo marcado y clases** que hoy tiene el bloque mock de `app/jugar/[slug]/page.tsx`, con **el tercer bloque** (en la maqueta "Vidas / Nivel" con corazones SVG) sustituido por **"LONGITUD"** y **"NIVEL"** con los valores reales (`length` y `level`), **sin corazones SVG** — Snake no tiene vidas. La etiqueta de jugador queda fija (`"G4M3R_X"`). Puntuación formateada a 7 dígitos con ceros a la izquierda, como el mock.
  - Un texto "PAUSA" React sobre el canvas cuando `phase === "paused"` (el `game.js` autoral no pinta overlay de pausa dentro del canvas).
  - `<GameOverModal>` en modo controlado: se abre al recibir `type: "gameover"` con `finalScore` = la puntuación final real (formateada igual que el HUD); "Salir" del control deck lo abre con la puntuación vigente. Al cerrar con "Jugar de nuevo" en estado `gameover` llama a `window.restartSnake()`. Pasa `onPause={() => window.toggleSnakePause?.()}` y `onSave={() => guardarPuntuacionSnake({ score: state.score })}`.
  - Bajo el gabinete, un aviso discreto (texto pequeño, `text-outline`): el juego requiere teclado (flechas para girar, `P` para pausar). No se añaden controles táctiles.
- `app/jugar/[slug]/actions.ts` — **modificado**. Se añade `guardarPuntuacionSnake(input: { score: number }): Promise<{ ok: boolean; error?: string }>`, gemela de `guardarPuntuacionTetris` / `guardarPuntuacionArkanoid`:
  - Valida `Number.isInteger(input.score) && input.score > 0`; si no, devuelve `{ ok: false, error }` sin tocar la BD.
  - Inserta `{ game_slug: "snake", player: "G4M3R_X", score: input.score, achieved_at: null }` en `public.scores` con el cliente sin cookies `@/lib/supabase/anon` (la política `anon_insert_scores` de SPEC 07 lo permite; no se usa `SUPABASE_SECRET_KEY`).
  - En éxito: `revalidatePath("/salon-de-la-fama")` y `revalidatePath("/juegos/snake")`; devuelve `{ ok: true }`. En error de Supabase: `console.error` y `{ ok: false, error }`.
  - `PLAYER_LABEL` y el tipo `GuardarResult` ya existentes en el archivo se reutilizan.
- `app/jugar/[slug]/page.tsx` — **modificado**. La condición de la rama jugable pasa a incluir `"snake"`: `slug === "asteroids" || slug === "tetris" || slug === "arkanoid" || slug === "snake"`, con `slug === "snake"` → `<SnakePlayer game={game} />`. Para los otros dos slugs (`pac-man`, `space-invaders`) la página queda **exactamente igual** (HUD mock + `<Image>` + `GameOverModal` no controlado). `generateStaticParams`, `getGame` y `notFound()` no cambian.
- `AGENTS.md` — si `next dev` lo regenera, se commitea junto con el trabajo.

**Out of scope (para futuras specs):**

- Hacer jugables `pac-man` y `space-invaders`. Sus `/jugar/[slug]` siguen siendo maqueta. No se añade ningún mecanismo genérico de embebido.
- Auth real: `scores.user_id`, sesión en el header, identidad de jugador. La escritura sigue anclada a la etiqueta fija `"G4M3R_X"`.
- Persistencia propia del juego: highscore local, partida guardada, tema. El leaderboard de Supabase es la única persistencia; el `game.js` autoral no toca `localStorage`.
- Envoltura toroidal de los muros: la serpiente muere al tocar el borde.
- Sonido; controles táctiles o gamepad; cualquier variante de jugabilidad más allá de lo descrito (power-ups, obstáculos, frutas con efecto).
- Nueva migración de `games` o de `scores`: `snake` ya está en `public.games` y la política `anon_insert_scores` de SPEC 07 ya cubre este `INSERT`.
- Regenerar `lib/supabase/database.types.ts`: no cambia el esquema; `scores.Insert` ya existe desde SPEC 06.
- `games.best_score` derivado de `scores` o refrescado al guardar. Sigue siendo columna propia sembrada.
- Ranking global / `lib/activity.ts`: siguen mock.
- Cambiar `lib/games.ts` / `lib/leaderboards.ts`: no necesitan edición para esta ruta.
- Cambiar `app/juegos/[slug]/page.tsx` (detalle) salvo su revalidación on-demand vía `revalidatePath`.
- "Guardar puntuación" funcional en `/jugar/asteroids` (SPEC 05 lo dejó visual; 07/08 solo lo cablearon para tetris y arkanoid).
- Rate limiting / anti-spam del `INSERT` más allá del `with check` de la política y del botón que se deshabilita tras guardar.
- Tests automatizados (no hay framework configurado).
- Editar los archivos de las SPEC 01–08 salvo lo listado en Scope.

---

## Data model

Esta feature **no crea tablas ni migraciones** (`snake` ya está en `public.games`; la política `anon_insert_scores` de SPEC 07 ya permite el `INSERT`). Introduce dos estructuras en código.

### Mensaje emitido por el juego

```ts
// Emitido por public/games/snake/game.js
// vía window.postMessage(msg, window.location.origin)

type SnakeMessage =
  | {
      source: "snake";
      type: "state";
      score: number; // puntuación acumulada (entero); +10 * level por fruta
      length: number; // segmentos de la serpiente (entero, ≥ 3)
      level: number; // 1..n, = floor(frutas / 5) + 1
      phase: "playing" | "paused" | "gameover";
    }
  | {
      source: "snake";
      type: "gameover";
      score: number; // puntuación final
    };
```

- **No hay campo `lives`:** Snake no tiene vidas; una colisión (muro o cola) termina la partida. El slot del HUD que en `AsteroidsMessage` transportaba `lives` se sustituye por `length` (segmentos de la serpiente).
- **`level`** no es un contador propio del juego: se deriva de `frutas` al emitir (`floor(frutas / 5) + 1`) y controla `tickMs` y el multiplicador de puntuación.
- **`phase`** se deriva de los booleanos internos (`muerto` / `pausado`) en el momento de emitir; `"paused"` sale del `toggleSnakePause()` / tecla `P`.
- Emisor y receptor están en la **misma ventana** (no hay iframe); se usa `window.postMessage` a `window.location.origin` por portabilidad futura, igual que SPEC 05.
- El receptor descarta cualquier mensaje cuyo `origin` no sea el propio, cuyo `source` no sea `window`, o cuyo `data.source` no sea `"snake"`.
- La puntuación se formatea a 7 dígitos con ceros a la izquierda solo en la capa React; `game.js` la emite como entero.
- Además del canal de mensajes, el juego expone `window.restartSnake()` y `window.toggleSnakePause()`: no son mensajes, son llamadas directas React → juego, disponibles solo mientras la partida está activa.

### Entrada de la Server Action

```ts
// app/jugar/[slug]/actions.ts — "use server"
// Inserta una fila en public.scores.
async function guardarPuntuacionSnake(input: {
  score: number; // entero > 0; el resto de campos los fija la acción
}): Promise<{ ok: boolean; error?: string }>;
// Inserta: { game_slug: "snake", player: "G4M3R_X", score, achieved_at: null }
// En éxito revalida /salon-de-la-fama y /juegos/snake.
```

La política RLS `anon_insert_scores` de SPEC 07 (`for insert to anon with check (achieved_at is null and score > 0 and player <> '')`) ya cubre este `INSERT`. Sin políticas `UPDATE` / `DELETE` nuevas. `lib/games.ts` y `lib/leaderboards.ts` no cambian.

---

## Implementation plan

1. **Copiar los assets.** `resources/snake-assets/fruits.png` → `public/games/snake/fruits.png` y `resources/snake-assets/sprites.js` → `public/games/snake/sprites.js`, ambos verbatim. `npm run build` sigue verde (nada los referencia todavía). Comprobar que `http://localhost:3000/games/snake/fruits.png` y `.../sprites.js` se sirven.

2. **Esqueleto de `game.js`.** Escribir `public/games/snake/game.js` con `function startSnake(canvasEl)` expuesta en `window.startSnake`: `ctx` desde `canvasEl`, malla `20×15` (celda 40 px sobre backing 800×600), serpiente de 3 segmentos al centro con dirección derecha, bucle `requestAnimationFrame` con acumulador y `tickMs = 140`. Cargar la comida con `const img = new Image(); img.src = "/games/snake/fruits.png";` y **no avanzar el bucle** hasta `img.onload` (mientras tanto, pintar fondo + "Cargando…"). `stop()` = `cancelAnimationFrame` + flag `detenido` + `removeEventListener` de teclado. Probar en consola: `window.startSnake(document.querySelector('canvas'))` mueve la serpiente y, tras cargar el PNG, dibuja una fruta con un recorte de `window.SPRITE_ATLAS.fruits`.

3. **Reglas de juego.** En `game.js`: comer fruta → crecer un segmento, `frutas++`, `score += 10 * level`, recolocar la fruta en celda libre aleatoria con sprite aleatorio del atlas. `level = floor(frutas / 5) + 1`; `tickMs = max(60, 140 - (level - 1) * 20)`. Muerte → `muerto = true` cuando la cabeza sale de `[0,20)×[0,15)` o pisa un segmento propio. Buffer de giro: se guarda la dirección deseada del `keydown`, se rechaza el reverso exacto y se aplica un solo giro por tick. Jugar en consola una partida completa hasta la muerte.

4. **Emisión de estado + teclado.** Tras cada tick (y en cada cambio de fase) comparar `score` / `length` / `level` / `phase` con lo último emitido y `window.postMessage({ source:"snake", type:"state", score, length, level, phase }, window.location.origin)`. Al pasar a `muerto`, emitir además `{ source:"snake", type:"gameover", score }`. Registrar el `keydown` sobre `window` dentro de `startSnake` con `preventDefault` de flechas y `Space`; quitarlo en `stop()`. Comprobar los mensajes con `addEventListener("message", …)` en la consola.

5. **Reinicio y pausa programáticos.** En `game.js`, exponer `window.restartSnake` (reinicia serpiente / `score` / `frutas` / `level` / `tickMs` y coloca la primera fruta) y `window.toggleSnakePause` (alterna `pausado`, congela el acumulador); la tecla `P` llama a la misma función. `stop()` elimina ambas y no deja loop huérfano. Verificar en consola.

6. **Componente `SnakePlayer` — canvas + arranque.** Crear `components/snake-player.tsx` (`"use client"`) con el gabinete CRT (portado del bloque actual de `app/jugar/[slug]/page.tsx`, sin `<Image>`), el `<canvas ref>` 800×600 escalado a `w-full aspect-[4/3] [image-rendering:pixelated]`, y los dos `<Script strategy="afterInteractive">` (`sprites.js`, `game.js`). Un contador `ready` (o dos flags) exige ambos `onReady` + `canvasRef.current` antes de llamar `window.startSnake(canvasRef.current)` y guardar el `stop`; cleanup del `useEffect` → `stop()`. Montarlo en `app/jugar/[slug]/page.tsx` para `slug === "snake"`. Abrir `/jugar/snake`: el juego se ve y se juega con teclado.

7. **HUD sincronizado + PAUSA.** En `SnakePlayer`, añadir estado `{ score, length, level, phase }` y el listener de `message` (filtros de origen / source / window; cierra el modal si `phase !== "gameover"`). Portar el marcado del HUD de la maqueta, con el tercer bloque mostrando **LONGITUD** y **NIVEL** reales (sin corazones). Mostrar "PAUSA" React sobre el canvas cuando `phase === "paused"`. Jugar y comprobar que los números del HUD coinciden con la lógica del juego y que `P` pausa/reanuda.

8. **Modal controlado + Pausa + Guardar.** En `SnakePlayer`, abrir `<GameOverModal>` (modo controlado) al recibir `type:"gameover"` con `finalScore` real; "Salir" lo abre con la puntuación vigente; "Jugar de nuevo" en `gameover` → `window.restartSnake()`. Pasar `onPause={() => window.toggleSnakePause?.()}`. Añadir `guardarPuntuacionSnake` a `app/jugar/[slug]/actions.ts` (gemela de las existentes, reusando `PLAYER_LABEL` y `GuardarResult`) y pasar `onSave={() => guardarPuntuacionSnake({ score: state.score })}`. `GameOverModal` **no se modifica** (las props `open` / `onOpenChange` / `onPause` / `onSave` ya existen desde SPEC 07). Recorrer `/jugar/asteroids`, `/jugar/pac-man`, etc.: el modal sigue igual.

9. **Escritura real end-to-end.** Jugar una partida completa en `/jugar/snake` hasta GAME OVER, pulsar "Guardar puntuación": el botón pasa a "Guardando…" y luego a "Puntuación guardada" (deshabilitado). Verificar la fila nueva en `public.scores` (`select * from public.scores where game_slug='snake' order by created_at desc limit 1`) y que aparece en `/salon-de-la-fama` (pestaña Snake) y en `/juegos/snake` (tabla lateral) tras la revalidación. Comprobar que un segundo click no inserta otra fila y que reabrir el modal en una partida nueva vuelve a habilitar el botón.

10. **Rama de `snake` en la página.** Dejar `app/jugar/[slug]/page.tsx` con la condición ampliada a los cuatro slugs jugables (`asteroids`, `tetris`, `arkanoid`, `snake`) y el JSX mock intacto para `pac-man` y `space-invaders`. Confirmar que `/jugar/pac-man` y `/jugar/space-invaders` renderizan igual que antes de la spec.

11. **Cierre.** `npm run lint` y `npm run build` verdes. Recorrer `/jugar/snake` (partida completa + guardar), `/jugar/tetris` y `/jugar/arkanoid` (siguen jugables y guardando), `/jugar/asteroids` ("Guardar puntuación" sigue visual), `/jugar/pac-man` (maqueta intacta), `/salon-de-la-fama`, `/juegos/snake`, `/`. Si `next dev` regeneró `AGENTS.md`, commitearlo junto con el trabajo. No hay `.sql` nuevo que commitear.

---

## Acceptance criteria

- [ ] `npm run build` termina sin errores ni fallos de tipos.
- [ ] `npm run lint` pasa sin errores.
- [ ] Existen `public/games/snake/game.js`, `public/games/snake/sprites.js` y `public/games/snake/fruits.png`, y se sirven bajo `http://localhost:3000/games/snake/`.
- [ ] En `/jugar/snake` se ve un tablero de cuadrícula jugable: las flechas giran la serpiente, la serpiente avanza sola, comer una fruta la hace crecer y suma puntos, y la partida llega a `GAME OVER` al chocar con un muro o con la propia cola.
- [ ] La comida se dibuja con un sprite recortado de `fruits.png` (vía `window.SPRITE_ATLAS`), y el sprite cambia (fruta aleatoria de las 22) en cada aparición.
- [ ] La serpiente acelera por tramos: cada 5 frutas el intervalo entre pasos baja un escalón (hasta un suelo), y el HUD refleja el nivel resultante.
- [ ] `game.js` no arranca al cargar el `<script>`; arranca cuando `SnakePlayer` llama a `window.startSnake(canvas)` tras cargar **ambos** scripts, y al desmontar el componente se cancela el `requestAnimationFrame` y se quita el listener de teclado (no queda loop huérfano al navegar a otra ruta y volver).
- [ ] El HUD React de `/jugar/snake` muestra puntuación (7 dígitos, ceros a la izquierda), **longitud** y **nivel** reales, sincronizados con la lógica del juego. No se dibujan corazones de "vidas".
- [ ] Al pausar con `P` (o con el botón "Pausa" del control deck) aparece un indicador "PAUSA" sobre el canvas y la serpiente deja de avanzar; al reanudar, desaparece y sigue.
- [ ] Al llegar a `GAME OVER`, el modal "Fin del juego" se abre solo y su "Puntuación final" es la puntuación real de esa partida (no un valor mock).
- [ ] El botón "Salir" del control deck abre el modal con la puntuación real vigente.
- [ ] "Guardar puntuación" inserta una fila en `public.scores` con `game_slug = 'snake'`, `player = 'G4M3R_X'`, `score` = la puntuación real y `achieved_at = null`. Tras el guardado el botón queda deshabilitado con texto de confirmación; un segundo click no inserta otra fila.
- [ ] La Server Action `guardarPuntuacionSnake` rechaza (sin tocar la BD) un `score` no entero o `≤ 0`.
- [ ] La fila guardada aparece en `/salon-de-la-fama` (pestaña Snake) y en `/juegos/snake` (tabla lateral) sin reiniciar el servidor (revalidación on-demand).
- [ ] Al reabrir el modal en una partida nueva, el botón "Guardar puntuación" vuelve a estar habilitado.
- [ ] "Jugar de nuevo" cierra el modal y, si la partida había terminado, reinicia el motor vía `window.restartSnake()` sin recrear el `<canvas>`.
- [ ] `game.js` no lee ni escribe `localStorage` y no modifica `document.documentElement`.
- [ ] No se crea ninguna migración nueva en `supabase/migrations/`; las políticas de `public.scores` (`public_read_scores`, `anon_insert_scores`) quedan exactamente como tras SPEC 07.
- [ ] `/jugar/asteroids`, `/jugar/tetris` y `/jugar/arkanoid` siguen jugables como en sus specs; "Guardar puntuación" sigue siendo visual solo en asteroids y funcional en tetris / arkanoid / snake.
- [ ] `/jugar/pac-man` y `/jugar/space-invaders` renderizan igual que antes de esta spec: HUD mock, gabinete con `<Image>` y texto "Insert coin", `GameOverModal` no controlado con "Pausa" y "Guardar puntuación" visuales.
- [ ] `lib/games.ts`, `lib/leaderboards.ts`, `lib/supabase/database.types.ts` y `components/game-over-modal.tsx` no cambian.
- [ ] `app/globals.css` no tiene reglas nuevas respecto al estado actual.
- [ ] `SUPABASE_SECRET_KEY` sigue sin importarse en ningún archivo de la app; la Server Action usa `@/lib/supabase/anon`.
- [ ] Todo el texto visible nuevo (`SnakePlayer`, aviso de teclado, overlay "PAUSA") está en español con acentos correctos.
- [ ] Un `slug` inexistente bajo `/jugar/` sigue devolviendo la 404 de Next.

---

## Decisions

- **Sí:** escribir `game.js` de Snake **desde cero**, no bifurcar. No existe un juego starter de Snake en `resources/started-games/`; lo único disponible son los assets (`fruits.png`, `sprites.js`). Se autora lo mínimo para una partida completa, respetando el mismo contrato de wrapper que 05/07/08 para que `SnakePlayer` sea calcado de los reproductores anteriores.
- **Sí:** copiar `sprites.js` y `fruits.png` a `public/games/snake/` y cargar `sprites.js` como script clásico aparte (expone `window.SPRITE_ATLAS`). Es el uso natural del asset tal cual viene; inlinar el atlas en `game.js` no aporta nada y aleja el fork del recurso original.
- **Sí:** `game.js` fija `img.src = "/games/snake/fruits.png"` y **no** usa `SPRITE_ATLAS.sources.fruits`. Esa cadena (`'snake-assets/fruits.png'`) es relativa y no resuelve servida desde `/games/snake/`.
- **Sí (placement del HUD):** el `game.js` autoral **no** dibuja HUD dentro del canvas; el HUD vive solo en el reproductor React, alimentado por `postMessage`. Al escribirse desde cero no hay HUD interno que replicar ni que quitar; duplicarlo sería trabajo extra sin valor. El overlay "PAUSA" sí es React (el canvas no pinta nada de pausa).
- **Sí:** el tercer bloque del HUD muestra **LONGITUD** y **NIVEL** (sin corazones). Snake no tiene vidas; la longitud de la serpiente es el dato equivalente que da sensación de progreso, y el nivel refleja la velocidad.
- **Sí:** `length` en el mensaje en el hueco donde `AsteroidsMessage` llevaba `lives`, y `level` derivado de `frutas`. Snake no tiene ninguna de las dos como variable propia.
- **Sí (persistencia propia):** el juego **no** usa `localStorage` (highscore, tema, partida guardada). Se escribe desde cero sin esa capa; el leaderboard de Supabase es la única persistencia. `applyTheme` / `data-theme` no aplican aquí (a diferencia de tetris, que sí traía un tema propio que hubo que quitar).
- **Sí:** muerte al tocar el muro, **sin envoltura toroidal**. Es el Snake clásico de referencia y hace las partidas más cortas y tensas; la envoltura es una variante que, si se pide, va en otra spec.
- **Sí:** fruta con sprite aleatorio de las 22 en cada aparición. Aprovecha todo el atlas y da variedad visual sin coste de jugabilidad.
- **Sí:** aceleración por tramos con un `level` que viaja en el mensaje y multiplica la puntuación (`+10 * level` por fruta). Da curva de dificultad y un número que enseñar en el HUD; el `tickMs` tiene suelo para que no se vuelva injugable.
- **Sí:** pausa funcional (tecla `P` + `window.toggleSnakePause()` para el botón "Pausa" del control deck), como tetris y arkanoid. SPEC 05 dejó la pausa fuera porque asteroids no la tenía; aquí se pide.
- **Sí:** buffer de un giro por tick y rechazo del giro de 180°. Sin esto, dos teclas rápidas en un mismo tick invierten la dirección y matan la serpiente al instante.
- **Sí:** lienzo `800×600` 4:3 a lo ancho del gabinete con `image-rendering: pixelated`, como asteroids/arkanoid. Los sprites de fruta son bitmap; el escalado entero-ish con `pixelated` los mantiene nítidos. Backing store nativo → la lógica de la malla no cambia.
- **Sí:** dos `<Script strategy="afterInteractive">` con el reproductor esperando **ambos** `onReady` antes de `startSnake`. El orden de ejecución entre scripts `afterInteractive` no está garantizado; el gate por doble `onReady` lo hace determinista sin depender del orden del DOM.
- **Sí (write policy):** la Server Action inserta como `anon` reutilizando la política `anon_insert_scores` de SPEC 07, sin gating por auth. **No hay auth en el proyecto todavía** (SPEC 06 ya aceptó esa postura para `SELECT`, SPEC 07 para `INSERT`); cerrarla bloquearía la feature. El `with check` limita a `achieved_at is null`, `score > 0` y `player` no vacío; el anti-abuso real llega con la spec de auth.
- **Sí:** una tercera Server Action `guardarPuntuacionSnake` en `app/jugar/[slug]/actions.ts`, gemela de las dos existentes, en vez de un `insert` desde el cliente. Mantiene clave, validación y revalidación en el servidor.
- **Sí:** `revalidatePath("/salon-de-la-fama")` y `revalidatePath("/juegos/snake")` tras insertar. Son las dos únicas rutas que leen el leaderboard de Snake.
- **No:** crear ninguna migración. `snake` ya está en `public.games` y `anon_insert_scores` no es específica de slug.
- **No:** modificar `components/game-over-modal.tsx`. Las props `open` / `onOpenChange` / `onPause` / `onSave` ya existen desde SPEC 07 y cubren este caso tal cual.
- **No:** regenerar `lib/supabase/database.types.ts`. No cambia el esquema; `scores.Insert` ya existe.
- **No:** reimplementar Snake como componente React con `useRef` / `useEffect`. El bucle de juego vive mejor en un script de canvas suelto, igual que asteroids/tetris/arkanoid.
- **No:** controles táctiles / gamepad, sonido, obstáculos o frutas con efecto. Scope creep; otra spec si se pide.

---

## Risks

| Riesgo                                                                                                                                                                             | Mitigación                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fruits.png` (585 KB) tarda en cargar: el bucle intenta dibujar la fruta antes de que la imagen esté lista y lanza / no pinta nada.                                                | El bucle está gateado a `img.onload`: hasta entonces pinta fondo + "Cargando…". `stop()` marca un flag `detenido` para que un `onload` que llega tarde (tras desmontar) no arranque el bucle.                        |
| `sprites.js` y `game.js` son dos `<Script strategy="afterInteractive">` y el orden de ejecución no está garantizado: `game.js` podría llamar a `SPRITE_ATLAS` antes de que exista. | El reproductor exige **ambos** `onReady` (contador / dos flags) y el `<canvas>` montado antes de llamar a `window.startSnake`; `game.js` lee `window.SPRITE_ATLAS` en tiempo de llamada, no de parseo.               |
| `SPRITE_ATLAS.sources.fruits` es `'snake-assets/fruits.png'`, ruta relativa que da 404 servida desde `/games/snake/`.                                                              | `game.js` no usa esa cadena: fija `img.src = "/games/snake/fruits.png"` explícitamente. Criterio de aceptación: la fruta se ve.                                                                                      |
| `next/script` no re-ejecuta el archivo en navegación SPA; al volver a `/jugar/snake` el juego no re-arranca o usa un canvas obsoleto.                                              | El juego expone `window.startSnake(canvas)` y el `useEffect` de `SnakePlayer` lo invoca en cada montaje con el canvas actual; el cleanup llama a `stop()`. El criterio de aceptación cubre "navegar fuera y volver". |
| El `keydown` va sobre `window` y hace `preventDefault` de las flechas y `Space`: bloquea el scroll de la página mientras se juega.                                                 | Comportamiento aceptado en un arcade a pantalla completa; `stop()` retira el listener al desmontar.                                                                                                                  |
| Dos teclas de giro en el mismo tick invierten la dirección y matan la serpiente al instante.                                                                                       | Buffer de un solo giro por tick + rechazo del reverso exacto de la dirección actual.                                                                                                                                 |
| Emitir un `postMessage` por frame (60/s) satura el hilo o dispara renders de React en cada frame.                                                                                  | El juego solo emite tras un tick y solo si `score` / `length` / `level` / `phase` cambiaron (chequeo sucio); React re-renderiza pocas veces por segundo.                                                             |
| Un `postMessage` de otro origen o de una extensión se cuela como estado del juego.                                                                                                 | El receptor filtra por `event.origin === window.location.origin`, `event.source === window` y `event.data.source === "snake"`.                                                                                       |
| Escalar el canvas 800×600 a un ancho mayor produce sprites de fruta borrosos o con aliasing.                                                                                       | Backing store nativo 800×600 + `image-rendering: pixelated`; celdas a múltiplos de píxel.                                                                                                                            |
| Sin auth, cualquiera puede insertar filas en `public.scores` (spam del leaderboard).                                                                                               | Postura heredada de SPEC 06/07: sin auth no hay identidad que verificar. El `with check` acota los valores y el botón se deshabilita tras guardar; el anti-abuso real es la spec de auth.                            |
| `revalidatePath` sobre `/juegos/snake` y `/salon-de-la-fama`, que se generan de forma estática, no refresca la vista.                                                              | La revalidación on-demand desde la Server Action invalida el caché de esas rutas; el criterio de aceptación exige ver la fila nueva sin reiniciar el servidor.                                                       |
| `next dev` reescribe `AGENTS.md` y deja el árbol sucio.                                                                                                                            | Commitear el `AGENTS.md` regenerado junto con el trabajo (paso 11).                                                                                                                                                  |

---

## Lo que **no** entra en esta spec

- Hacer jugables `pac-man` y `space-invaders`.
- Auth real: `scores.user_id`, sesión en el header, identidad de jugador.
- "Guardar puntuación" funcional en `/jugar/asteroids`.
- Envoltura toroidal de los muros.
- Persistencia propia del juego (`localStorage`: highscore, tema, partida guardada).
- Derivar / refrescar `games.best_score` desde `scores`.
- Ranking global agregado en la home; migrar `lib/activity.ts` a Supabase.
- Botón "Pausa" funcional en las otras rutas `/jugar/*` que aún son maqueta.
- Controles táctiles / gamepad; sonido; power-ups u obstáculos.
- Rate limiting del `INSERT` más allá del `with check` y del botón deshabilitado.
- Nueva migración de `games` o de `scores`; regenerar `lib/supabase/database.types.ts`.
- Modificar `components/game-over-modal.tsx`.
- Tests automatizados; edición de las SPEC 01–08 fuera de lo listado en Scope.

Cada uno de esos, si llega, va en su propia spec.
