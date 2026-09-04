# SPEC game-jam/frogger/01 — Frogger jugable en `/jugar/frogger` con guardado de puntuación

> **Status:** Borrador
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-09-04
> **Objective:** Poner un Frogger de rejilla jugable de verdad en `/jugar/frogger` (cruzar una carretera de tráfico y un río de troncos/tortugas hasta las cinco casas), escrito desde cero como `public/games/frogger/game.js`, con el HUD React del reproductor sincronizado por `postMessage` y "Guardar puntuación" insertando en `public.scores`.

---

## Por qué existe esta spec

Es la jam del tema "cruzar la carretera y el río sin convertirse en papilla": este es el juego que da nombre al tema, una implementación fiel del Frogger clásico (Konami/Sega, 1981). El agente `game-planner` ya lo evaluó el 2026-09-03 (`.claude/game-planner/registro-sugerencias.md`, entrada "Frogger") con veredicto **Recomendado con reservas**, estado `Propuesto` (no `Spec redactada` ni bloqueado): se retoma aquí, a petición directa del usuario para esta jam, con el mismo análisis de encaje y las mismas reservas de diseño resueltas en la sección Decisions de esta spec.

No hay starter en `resources/started-games/` para Frogger (solo `02-claude-asteroids`, `03-claude-tetris`, `04-arkanoid`, ya portados) ni assets propios como los de `snake` (`resources/snake-assets/`). Esta spec describe **escribir `game.js` desde cero**, siguiendo el mismo patrón que `specs/09-snake-jugable.md`: sin dependencias, sin bundler, contrato `window.start<Slug>` / `stop()` / `restart<Slug>()` / `toggle<Slug>Pause()`.

`frogger` **no existe** en `public.games` (`supabase/migrations/0001_create_games.sql` solo tiene `arkanoid`, `tetris`, `snake`, `pac-man`, `space-invaders`, `asteroids`), así que esta spec sí necesita una migración nueva de catálogo — a diferencia de snake/tetris/arkanoid. La política `anon_insert_scores` (SPEC 07 / `0003_scores_allow_anon_insert.sql`) **no es específica de slug**, así que no hace falta ninguna migración nueva sobre `public.scores`.

Frogger **no tiene la forma de asteroids ni de snake**: sí tiene vidas (3) y nivel, como Pac-Man, pero además mezcla movimiento discreto (saltos casilla a casilla) con deriva continua (la rana viaja pegada a un tronco entre saltos) — un caso que ningún juego portado hasta ahora tiene.

---

## Scope

**In:**

- **Alta en `public.games`.** Migración nueva `supabase/migrations/0004_add_frogger_game.sql` (descrita, no aplicada por este agente) que inserta la fila `frogger` (`category_label: "ARCADE"`, `tags: ['REFLEJOS', 'CLÁSICO']`, `year: 1981`, `sort_order: 7`, `best_score` semilla, `image` / `image_alt` de un cruce de carretera y río en neón). Opcionalmente siembra 3-5 filas de `public.scores` para que la pestaña del Salón de la Fama no salga vacía.
- **Fork del juego** en `public/games/frogger/game.js`, un único archivo de script clásico (sin `type="module"`, sin assets binarios: la rana, los coches, los troncos, las tortugas y las casas se dibujan con `ctx` como rectángulos y arcos, siguiendo la filosofía "sin curvas" de `DESIGN.md`):
  - `window.startFrogger(canvasEl)` arranca el bucle y expone `stop()`, que hace `cancelAnimationFrame`, marca un flag `detenido` y quita el `keydown` de `window`.
  - `window.restartFrogger()` reinicia rana, vidas, nivel, casas ocupadas, temporizador y las filas de peligro, sin recrear el `<canvas>`.
  - `window.toggleFroggerPause()` alterna `phase` `playing ↔ paused`, congelando el avance de coches/troncos y el temporizador. La tecla `P` hace lo mismo.
  - Motor: filas tipadas (`segura`, `carretera`, `río`, `casas`). Cada fila de peligro genera entidades rectangulares con velocidad y sentido propios, con envoltura horizontal. Backing store fijo `800×600` en horizontal (13 filas de 40-46 px), ver Decisions sobre el formato apaisado.
- **Emisión de estado** vía `window.postMessage({ source: "frogger", type: "state" | "gameover", score, lives, level, homes, phase }, window.location.origin)`, con chequeo sucio (solo se emite si cambió algún valor). `phase ∈ "playing" | "paused" | "gameover"`. `homes` (0..5, casas ocupadas) es un campo propio de este juego sin equivalente en `AsteroidsMessage`.
- **`components/frogger-player.tsx`**, `"use client"`, calcado de `components/snake-player.tsx`: un único `<Script strategy="afterInteractive" src="/games/frogger/game.js">` (sin spritesheet → sin doble gate), `<canvas>` `800×600` escalado por CSS manteniendo 4:3, gabinete CRT como marco, listener de `message` filtrado por `origin` / `event.source === window` / `data.source === "frogger"`, HUD local `{ score, lives, level, homes, phase }`.
- **Rama en `app/jugar/[slug]/page.tsx`**: `slug === "frogger"` renderiza `<FroggerPlayer game={game} />`; el resto de ramas (`asteroids`, `tetris`, `arkanoid`, `snake`) quedan intactas.
- **Escritura real de puntuación**: reutiliza la política `anon_insert_scores` ya existente (SPEC 07, no específica de slug — sin migración nueva sobre `scores`). Nueva Server Action `guardarPuntuacionFrogger({ score })` en `app/jugar/[slug]/actions.ts`, gemela de `guardarPuntuacionSnake`, que inserta `{ game_slug: "frogger", player: "G4M3R_X", score, achieved_at: null }` con el cliente `@/lib/supabase/anon`, y revalida `/salon-de-la-fama` y `/juegos/frogger`. Cableada a `onSave` de `<GameOverModal>` controlado.

**Out of scope (para futuras specs):**

- Auth real (`user_id`, sesión); la escritura sigue anclada a `"G4M3R_X"`.
- Pausa táctil / gamepad; sonido.
- Persistencia propia del juego (`localStorage`): ninguna. El leaderboard de Supabase es la única persistencia.
- Bonus de tiempo extra por completar todas las casas antes del límite, insecto bonus (fly) y puntuación por tiempo restante — se deja un modelo de puntuación mínimo (ver Data model); el incremento de esta carpeta (`02-frogger-progresion.md`) añade niveles y dificultad progresiva.
- Más de un nivel de dificultad en esta primera spec (velocidad y densidad de tráfico fijas); la progresión por niveles va en la spec incremental.
- Cambios a `lib/games.ts` / `lib/leaderboards.ts` más allá de lo ya genérico de SPEC 06.
- Cualquier otro `/jugar/[slug]` fuera de `frogger`.

---

## Data model

```ts
// Emitido por public/games/frogger/game.js
// vía window.postMessage(msg, window.location.origin)

type FroggerMessage =
  | {
      source: "frogger";
      type: "state";
      score: number; // puntuación acumulada (entero): 10 por salto hacia adelante, 50 por casa
      lives: number; // 0..3, corazones del HUD (como Pac-Man)
      level: number; // 1..n, sube al completar las 5 casas de una ronda
      homes: number; // 0..5, casas ocupadas en la ronda actual
      phase: "playing" | "paused" | "gameover";
    }
  | {
      source: "frogger";
      type: "gameover";
      score: number; // puntuación final
    };
```

- **No hay campo `length`** (eso es propio de `snake`): Frogger tiene vidas y nivel reales, como Pac-Man, así que el mensaje sí lleva ambos.
- **`homes`** es un campo nuevo sin precedente en `AsteroidsMessage` ni en `SnakeMessage`: da sabor al HUD (tercer bloque) igual que `length` lo dio en snake.
- **`level`** no es un multiplicador de velocidad en esta spec (eso queda para el incremento `02`): aquí solo cuenta rondas completas; empieza en `1`.

```ts
// app/jugar/[slug]/actions.ts — "use server"
async function guardarPuntuacionFrogger(input: {
  score: number; // entero > 0; el resto de campos los fija la acción
}): Promise<{ ok: boolean; error?: string }>;
// Inserta: { game_slug: "frogger", player: "G4M3R_X", score, achieved_at: null }
// En éxito revalida /salon-de-la-fama y /juegos/frogger.
```

```sql
-- supabase/migrations/0004_add_frogger_game.sql (descrita, no aplicada por este agente)
insert into public.games
  (slug, title, category_label, tags, short_description, long_description, year, best_score, image, image_alt, sort_order)
values
  ('frogger', 'FROGGER', 'ARCADE', array['REFLEJOS', 'CLÁSICO'],
   'Cruza la carretera y el río sin convertirte en papilla.',
   '<descripción larga siguiendo el tono de las 6 filas existentes>',
   1981, '000,000',
   '<url o placeholder de imagen>', '<alt en español>', 7);
```

---

## Implementation plan

1. **Migración de catálogo.** Redactar (no aplicar) `supabase/migrations/0004_add_frogger_game.sql` con la fila `frogger` descrita en Data model. El sistema sigue funcionando exactamente igual que hoy hasta que se aplique.
2. **Esqueleto de `game.js`.** Escribir `public/games/frogger/game.js` con `function startFrogger(canvasEl)` expuesta en `window.startFrogger`: backing `800×600`, 13 filas (1 meta + 5 río + 1 refugio central + 5 carretera + 1 salida), rana en la fila inferior central. Bucle `requestAnimationFrame` que solo mueve entidades y repinta; `stop()` cancela el frame y quita el `keydown`.
3. **Carriles de peligro.** Generador de coches (carretera) y troncos/tortugas (río) por fila: rectángulos con velocidad, sentido y separación fijos por fila, con envoltura horizontal al salir del canvas.
4. **Movimiento de la rana y colisión.** `keydown` de flechas mueve la rana una celda por pulsación (rejilla), con `preventDDefault`. En filas de río, la posición `x` de la rana deriva en float con la plataforma bajo sus pies entre saltos; si no hay plataforma bajo la rana, muere. En carretera, solapar un coche mata. Salir del campo por los lados mata.
5. **Casas y ronda.** Fila superior con 5 ranuras de casa. Saltar a una ranura vacía: `homes++`, `score += 50`, la rana vuelve al inicio. Ranura ocupada o hueco fuera de ranura: muerte. Al llenar las 5 casas: `level++`, se reinician `homes` y las filas de peligro con la misma dificultad (la progresión real es el incremento `02`).
6. **Vidas, temporizador y emisión de estado.** Cada muerte resta una vida y devuelve la rana al inicio; a 0 vidas, `phase = "gameover"`. Un temporizador por vida (p. ej. 30s) que si se agota también resta una vida. Tras cada cambio relevante, `postMessage` con chequeo sucio de `{ score, lives, level, homes, phase }`; al entrar en `gameover`, además el mensaje `type: "gameover"`.
7. **Pausa y reinicio programáticos.** Exponer `window.toggleFroggerPause` (alterna `playing ↔ paused`, congela temporizador y entidades) y `window.restartFrogger` (reinicia rana, vidas, nivel, `homes`, filas de peligro). `stop()` elimina ambas.
8. **`FroggerPlayer` — canvas y arranque.** Crear `components/frogger-player.tsx` calcado de `components/snake-player.tsx` pero con un solo `<Script>` (sin spritesheet): gabinete CRT, `<canvas>` 800×600 escalado `w-full aspect-[4/3]`, `onReady` + `canvasRef.current` antes de `window.startFrogger`. Montarlo en `app/jugar/[slug]/page.tsx` para `slug === "frogger"`.
9. **HUD sincronizado.** Estado local `{ score, lives, level, homes, phase }` alimentado por el listener de `message` con los mismos filtros que snake. HUD con el bloque "VIDAS" (corazones, como el mock actual y Pac-Man) + "NIVEL", más un indicador de "CASAS x/5" bajo el marcador de puntuación. Overlay "PAUSA" React cuando `phase === "paused"`.
10. **Modal controlado + Guardar.** `<GameOverModal>` controlado, se abre en `type: "gameover"` con la puntuación real; "Jugar de nuevo" llama a `window.restartFrogger()`. Añadir `guardarPuntuacionFrogger` a `app/jugar/[slug]/actions.ts` (gemela de `guardarPuntuacionSnake`) y cablearla a `onSave`.
11. **Cierre.** Recorrer `/jugar/frogger` completo (varias muertes, varias casas, game over, guardar puntuación), confirmar que aparece en `/salon-de-la-fama` y `/juegos/frogger`, y que el resto de rutas `/jugar/*` no cambia.

---

## Acceptance criteria

- [ ] Existe `public/games/frogger/game.js` y se sirve bajo `http://localhost:3000/games/frogger/game.js`.
- [ ] En `/jugar/frogger` se ve una rana en una rejilla; las flechas la mueven una celda por pulsación.
- [ ] Cruzar la carretera esquivando coches y no chocar suma progreso; chocar con un coche resta una vida y devuelve la rana al inicio.
- [ ] En el río, quedarse sin plataforma bajo la rana (agua libre) resta una vida; montada en un tronco/tortuga, la rana se desplaza con la plataforma.
- [ ] Llegar a una ranura de casa vacía suma `+50` puntos y marca esa casa como ocupada (`homes` sube); llegar a una ocupada o fuera de ranura resta una vida.
- [ ] Completar las 5 casas sube el `nivel` y reinicia las casas de la ronda siguiente.
- [ ] Agotarse el temporizador de una vida resta una vida, igual que una colisión.
- [ ] A 0 vidas la partida entra en `GAME OVER` y el modal se abre solo con la puntuación real.
- [ ] El HUD muestra puntuación (7 dígitos), vidas (corazones) y nivel reales, sincronizados con la lógica del juego.
- [ ] Pausar con `P` (o el botón "Pausa") congela coches, troncos, temporizador y rana; reanudar continúa donde estaba.
- [ ] "Guardar puntuación" inserta una fila en `public.scores` con `game_slug = 'frogger'`, `player = 'G4M3R_X'`, `score` real y `achieved_at = null`; un segundo click no duplica.
- [ ] La fila guardada aparece en `/salon-de-la-fama` (pestaña Frogger) y en `/juegos/frogger` tras la revalidación.
- [ ] `game.js` no arranca al cargar el `<script>`; solo cuando `FroggerPlayer` llama a `window.startFrogger(canvas)`; al desmontar se cancela el `requestAnimationFrame` y se quita el `keydown`.
- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] El resto de rutas `/jugar/*` no cambia de comportamiento.

---

## Decisions

- **Sí (ubicación del HUD):** el `game.js` no dibuja HUD dentro del canvas (puntuación/vidas/nivel/casas viven solo en el reproductor React, vía `postMessage`); el temporizador por vida sí se pinta dentro del canvas como una barra, porque es un elemento de juego en tiempo real que necesita actualizarse a 60 fps sin generar tráfico de mensajes extra.
- **Sí (persistencia propia):** ninguna. El juego no lee ni escribe `localStorage`; el leaderboard de Supabase es la única persistencia, igual que snake.
- **Sí (write policy):** la Server Action inserta como `anon` reutilizando `anon_insert_scores` (SPEC 07), sin gating por auth — no hay auth en el proyecto todavía; cerrarla bloquearía la feature. El `with check` (`achieved_at is null`, `score > 0`, `player <> ''`) es el único control hoy.
- **Sí:** título de catálogo `FROGGER` (nombre real), no un alias neutro. Precedente directo: `pac-man` y `space-invaders` ya usan nombres de marca reales en `public.games`; el catálogo de este proyecto ya acepta esa postura.
- **Sí:** lienzo horizontal `800×600` (4:3) aunque el Frogger original es más alto que ancho. Se ajusta el número de columnas (más anchas que en el arcade original) para aprovechar el gabinete apaisado del proyecto, igual que hicieron muchos ports domésticos.
- **Sí:** la posición `x` de la rana es un `float` que deriva con la plataforma en filas de río, y solo se redondea a columna al recibir un salto nuevo. Es la única forma de mezclar el movimiento discreto por rejilla con el arrastre continuo del tronco sin que se sienta "a saltos".
- **Sí:** montar en un tronco/tortuga exige que el **centro** de la rana quede dentro del rectángulo de la plataforma (no basta un solape parcial); simplifica la regla de colisión y es predecible para el jugador.
- **No:** insecto bonus, puntuación por tiempo restante ni bonus de "todas las casas antes de N segundos". Se deja fuera para que la primera spec quepa en el tamaño de SPEC 05/07/08/09; el incremento `02` de esta carpeta puede añadirlo si se decide.
- **No:** dificultad progresiva por nivel (más coches, más rápido). El nivel de esta spec solo cuenta rondas completas; la progresión real es el incremento `02-frogger-progresion.md`.

---

## Risks

| Riesgo                                                                                                          | Mitigación                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Mezclar salto discreto (rejilla) con deriva continua (tronco) puede sentirse inconsistente o "flotante".        | `x` como `float`, redondeo a columna solo en el salto; probar con velocidades de tronco bajas primero y ajustar en implementación. |
| Regla de "medio subido al tronco" ambigua produce muertes injustas o rana atravesando coches.                   | Regla fija en Decisions: colisión por centro de la rana, no por solape parcial; se documenta y no se improvisa en código.          |
| Temporizador por vida mal calibrado (muy corto) hace el juego injugable en la primera spec.                     | Valor inicial generoso (~30s) ajustable en implementación sin tocar el contrato.                                                   |
| Migración `0004_add_frogger_game.sql` con FK: si se aplica sin la fila de `games`, el `INSERT` de scores falla. | El orden del plan aplica primero la migración de catálogo (paso 1) antes de cablear la Server Action (paso 10).                    |

---

## Lo que **no** entra en esta spec

- Dificultad progresiva (más tráfico, más velocidad por nivel) — va en `02-frogger-progresion.md`.
- Insecto bonus, puntuación por tiempo restante, bonus por casas rápidas.
- Auth real, sonido, controles táctiles/gamepad.
- Cualquier otro `/jugar/[slug]` fuera de `frogger`.

Cada uno de esos, si llega, va en su propia spec.
