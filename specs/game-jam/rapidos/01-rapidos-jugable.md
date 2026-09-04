# SPEC game-jam/rapidos/01 — Rápidos jugable en `/jugar/rapidos` con guardado de puntuación

> **Status:** Borrador
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-09-04
> **Objective:** Poner una balsa descendiendo por rápidos jugable de verdad en `/jugar/rapidos` (esquivar rocas, remolinos y lagartos en un río que se desplaza sin fin), escrito desde cero como `public/games/rapidos/game.js`, con HUD por `postMessage` y "Guardar puntuación" escribiendo en `public.scores`.

---

## Por qué existe esta spec

Cierra la jam "cruzar la carretera y el río sin convertirse en papilla" cubriendo la mitad **río** del tema en solitario, con una mecánica distinta a la de Frogger (movimiento continuo, no discreto por rejilla) y a la de Atasco (aquí no hay carretera). El jugador pilota una balsa que desciende un río que se desplaza verticalmente sin fin, esquivando rocas, remolinos y lagartos; los checkpoints (banderas en las orillas) dan puntos extra. Convertirse "en papilla" aquí es chocar contra una roca o quedar atrapado en un remolino.

No hay starter en `resources/started-games/` ni assets propios: desde cero, patrón `snake` (SPEC 09). `rapidos` **no existe** en `public.games`, así que necesita una migración nueva de catálogo. `anon_insert_scores` (SPEC 07) no es específica de slug: no hace falta migración nueva sobre `scores`.

---

## Scope

**In:**

- **Alta en `public.games`.** Migración nueva `supabase/migrations/0006_add_rapidos_game.sql` (descrita, no aplicada por este agente) con la fila `rapidos` (`category_label: "ARCADE"`, `tags: ['REFLEJOS', 'SUPERVIVENCIA']`, `year: 2026` — original del Vault —, `sort_order: 9`, `best_score` semilla, imagen/alt de una balsa entre rocas de neón cian sobre un río oscuro).
- **Fork del juego** en `public/games/rapidos/game.js` (script clásico, sin assets binarios; balsa, rocas, remolinos y lagartos como rectángulos/formas simples con `ctx`):
  - `window.startRapidos(canvasEl)` / `stop()` (cancela el frame, marca `detenido`, quita listeners de teclado).
  - `window.restartRapidos()` reinicia posición de la balsa, vidas, nivel, distancia recorrida y el generador de obstáculos.
  - `window.toggleRapidosPause()` alterna `phase` `playing ↔ paused`, congelando el desplazamiento del río y los obstáculos. `P` hace lo mismo.
  - Motor: el río se desplaza continuamente hacia el jugador (de arriba hacia abajo en pantalla, la balsa avanza "hacia el visor"); la balsa se mueve en **movimiento continuo** (no por celdas) con `ArrowLeft`/`ArrowRight` (velocidad lateral constante mientras se mantiene pulsada) y `ArrowUp`/`ArrowDown` (ajuste fino de posición vertical dentro de una banda cercana a la parte inferior del canvas, sin adelantar el desplazamiento del río). Rocas y remolinos fijos por tramo, lagartos con movimiento lateral propio dentro de su carril de agua.
- **Emisión de estado** vía `window.postMessage({ source: "rapidos", type: "state" | "gameover", score, lives, level, phase }, window.location.origin)`, `phase ∈ "playing" | "paused" | "gameover"`. Chequeo sucio.
- **`components/rapidos-player.tsx`**, `"use client"`, calcado de `components/snake-player.tsx`: un `<Script strategy="afterInteractive" src="/games/rapidos/game.js">`, `<canvas>` 800×600 escalado 4:3, HUD local `{ score, lives, level, phase }` con bloque "VIDAS" (corazones) + "NIVEL", como Frogger/Pac-Man.
- **Rama en `app/jugar/[slug]/page.tsx`**: `slug === "rapidos"` → `<RapidosPlayer game={game} />`; resto de ramas intactas.
- **Escritura real**: reutiliza `anon_insert_scores`. Server Action `guardarPuntuacionRapidos({ score })` gemela de `guardarPuntuacionSnake`, inserta `{ game_slug: "rapidos", player: "G4M3R_X", score, achieved_at: null }`, revalida `/salon-de-la-fama` y `/juegos/rapidos`.

**Out of scope (para futuras specs):**

- Auth real, sonido, controles táctiles/gamepad.
- Persistencia propia (`localStorage`).
- Power-ups (escudo, invulnerabilidad temporal); botín visual más allá de checkpoints.
- Modo de dificultad seleccionable; el aumento de velocidad del río por nivel actual es fijo (ver Data model) y se profundiza en el incremento `02` de esta carpeta.
- Carretera o cualquier mecánica de tráfico: ese lado del tema lo cubren `frogger` y `atasco`, otros juegos de esta misma jam.

---

## Data model

```ts
// Emitido por public/games/rapidos/game.js
// vía window.postMessage(msg, window.location.origin)

type RapidosMessage =
  | {
      source: "rapidos";
      type: "state";
      score: number; // +1 por unidad de distancia recorrida, +25 por checkpoint alcanzado
      lives: number; // 0..3, corazones del HUD (como Pac-Man/Frogger)
      level: number; // 1..n, sube cada tramo de distancia fijo; acelera el río
      phase: "playing" | "paused" | "gameover";
    }
  | {
      source: "rapidos";
      type: "gameover";
      score: number;
    };
```

- **No hay campo de "posición lateral" en el mensaje:** el movimiento continuo de la balsa es puramente interno al `game.js` (se redibuja cada frame); el HUD React no necesita conocer la coordenada exacta, a diferencia de `homes` en Frogger o `lanes` en Atasco, que sí son contadores de progreso visibles.
- **`level`** se deriva de la distancia recorrida (análogo a `frogger.homes`/`atasco.lanes`, pero aquí no viaja como campo propio porque la distancia ya se refleja en `score`).

```ts
// app/jugar/[slug]/actions.ts — "use server"
async function guardarPuntuacionRapidos(input: {
  score: number;
}): Promise<{ ok: boolean; error?: string }>;
// Inserta: { game_slug: "rapidos", player: "G4M3R_X", score, achieved_at: null }
```

---

## Implementation plan

1. **Migración de catálogo.** Redactar (no aplicar) `supabase/migrations/0006_add_rapidos_game.sql` con la fila descrita arriba.
2. **Esqueleto de `game.js`.** `function startRapidos(canvasEl)` en `window.startRapidos`: backing `800×600`, balsa en una banda cercana al borde inferior, río que se desplaza verticalmente a velocidad constante. Bucle `requestAnimationFrame`. `stop()` cancela y quita listeners.
3. **Movimiento continuo de la balsa.** `keydown`/`keyup` de flechas fijan un vector de velocidad lateral (y un ajuste vertical acotado a la banda inferior) que se aplica cada frame mientras la tecla está pulsada; tope de velocidad y límites del cauce (bordes del río) impiden salir del agua.
4. **Obstáculos.** Generador de rocas fijas y remolinos por tramo (aparecen por arriba y se desplazan con el río hasta salir por abajo), más lagartos con movimiento lateral propio dentro de su carril. Colisión con roca o lagarto: resta una vida. Entrar en un remolino: resta una vida (o arrastra brevemente la balsa antes de restar, ver Decisions).
5. **Distancia, checkpoints y nivel.** `score` acumula por distancia recorrida; checkpoints (banderas periódicas en la orilla) suman `+25` al cruzarlos. `level = floor(distancia / N) + 1`, sube la velocidad del río y la densidad de obstáculos por tramo, con techo (ver spec incremental `02` para el detalle fino).
6. **Vidas y game over.** Cada colisión resta una vida y da un breve periodo de invulnerabilidad visual (parpadeo) antes de poder chocar de nuevo; a 0 vidas, `phase = "gameover"`.
7. **Emisión de estado, pausa y reinicio.** `postMessage` con chequeo sucio de `{ score, lives, level, phase }`; `type: "gameover"` al morir la última vida. `window.toggleRapidosPause` congela el desplazamiento del río y los obstáculos; `window.restartRapidos` reinicia balsa, vidas, nivel y distancia. `stop()` elimina ambas.
8. **`RapidosPlayer` — canvas y arranque.** `components/rapidos-player.tsx` calcado de `snake-player.tsx` con un solo `<Script>`; `onReady` + canvas montado antes de `startRapidos`. Montar en `app/jugar/[slug]/page.tsx` para `slug === "rapidos"`.
9. **HUD sincronizado.** Estado `{ score, lives, level, phase }`; bloque "VIDAS" (corazones) + "NIVEL", overlay "PAUSA" React.
10. **Modal + Guardar.** `<GameOverModal>` controlado en `type: "gameover"`; "Jugar de nuevo" llama a `window.restartRapidos()`. Añadir `guardarPuntuacionRapidos` a `actions.ts` y cablear `onSave` y `onPause`.
11. **Cierre.** Jugar varias partidas completas (rocas, remolinos, lagartos, checkpoints, game over); confirmar guardado y aparición en `/salon-de-la-fama` y `/juegos/rapidos`.

---

## Acceptance criteria

- [ ] Existe `public/games/rapidos/game.js`, servido bajo `http://localhost:3000/games/rapidos/game.js`.
- [ ] Mantener pulsada una flecha lateral mueve la balsa de forma continua (no a saltos de celda); soltarla la detiene.
- [ ] El río se desplaza sin fin; rocas, remolinos y lagartos aparecen por arriba y avanzan hacia el jugador.
- [ ] Chocar con una roca o un lagarto resta una vida y da un breve parpadeo de invulnerabilidad.
- [ ] Entrar en un remolino resta una vida (o arrastra brevemente antes, según lo decidido en Decisions).
- [ ] Cruzar un checkpoint suma `+25` puntos de forma visible en el HUD.
- [ ] El nivel sube con la distancia recorrida y el río/obstáculos se sienten más rápidos tras cada subida.
- [ ] A 0 vidas la partida entra en `GAME OVER` y el modal se abre solo con la puntuación real.
- [ ] Pausar con `P` congela el río, los obstáculos y la balsa; reanudar continúa igual.
- [ ] "Guardar puntuación" inserta una fila con `game_slug = 'rapidos'`, `player = 'G4M3R_X'`, `score` real; un segundo click no duplica.
- [ ] La fila guardada aparece en `/salon-de-la-fama` (pestaña Rápidos) y `/juegos/rapidos`.
- [ ] `game.js` no arranca al cargar el `<script>`; el `requestAnimationFrame` y los listeners se limpian al desmontar.
- [ ] `npm run build` y `npm run lint` terminan sin errores.

---

## Decisions

- **Sí (ubicación del HUD):** el `game.js` no dibuja HUD dentro del canvas; vive solo en React vía `postMessage`, igual que Frogger y Atasco de esta misma jam.
- **Sí (persistencia propia):** ninguna. Sin `localStorage`; el leaderboard de Supabase es la única persistencia.
- **Sí (write policy):** reutiliza `anon_insert_scores` (SPEC 07) sin gating por auth, misma postura que el resto del catálogo.
- **Sí:** movimiento **continuo** de la balsa (no por rejilla). A diferencia de Frogger (saltos discretos) y de Atasco (avance por filas), la sensación de "rápidos" pide control fino y fluido; es la variante de movimiento que distingue a este juego de los otros dos de la jam.
- **Sí:** un remolino resta una vida directamente en la primera versión, sin arrastre previo. Simula ser "arrastrado" con la regla más simple posible; el arrastre gradual (mover la balsa lateralmente antes de restar la vida) es una mejora de sensación que puede llegar en un incremento si se pide, pero no es necesaria para que el juego sea jugable y coherente con el tema.
- **Sí:** invulnerabilidad breve tras perder una vida (parpadeo). Sin ella, quedar atrapado entre dos obstáculos consecutivos vacía las 3 vidas en un solo frame, lo que se siente injusto.
- **Sí:** `year: 2026` en la fila de catálogo, como `atasco`. Es un diseño original del Vault para esta jam.
- **No:** carretera ni tráfico de coches en este juego. Ese lado del tema ya lo cubren `frogger` y `atasco` en esta misma jam; duplicarlo aquí sería redundante.

---

## Risks

| Riesgo                                                                                                                                       | Mitigación                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| El movimiento continuo (a diferencia del resto del catálogo, que es por celdas) puede sentirse impreciso en teclado sin aceleración/frenado. | Velocidad lateral constante y tope fijo, sin inercia; ajustable como constante en implementación, similar a `tickMs` en snake.     |
| Sin invulnerabilidad breve tras chocar, la balsa puede perder varias vidas en un solo tramo estrecho.                                        | Parpadeo de invulnerabilidad de duración fija tras cada colisión (paso 6 del plan).                                                |
| Remolinos sin arrastre visual pueden sentirse como "roca invisible" si no se diferencian claramente.                                         | Diferenciar remolino de roca por color/forma (espiral vs. bloque sólido) y mantener la regla de colisión documentada en Decisions. |
| Migración `0006_add_rapidos_game.sql` con FK: si se aplica sin la fila de `games`, el `INSERT` de scores falla.                              | El plan aplica primero la migración de catálogo (paso 1) antes de cablear la Server Action (paso 10).                              |

---

## Lo que **no** entra en esta spec

- Detalle fino de la curva de dificultad por nivel (techo, tramos exactos) — puede ir en un incremento propio de esta carpeta si se pide.
- Arrastre gradual en remolinos (en vez de resta directa de vida).
- Auth real, sonido, controles táctiles/gamepad.
- Carretera o tráfico de coches.
- Cualquier otro `/jugar/[slug]` fuera de `rapidos`.

Cada uno de esos, si llega, va en su propia spec.
