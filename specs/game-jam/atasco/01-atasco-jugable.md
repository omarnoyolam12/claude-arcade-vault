# SPEC game-jam/atasco/01 — Atasco jugable en `/jugar/atasco` con guardado de puntuación

> **Status:** Borrador
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-09-04
> **Objective:** Poner un cruce de carretera infinito jugable de verdad en `/jugar/atasco` (avanzar carril a carril sin fin, con el tráfico acelerando y una pared que empuja desde abajo), escrito desde cero como `public/games/atasco/game.js`, con HUD por `postMessage` y "Guardar puntuación" escribiendo en `public.scores`.

---

## Por qué existe esta spec

Dentro de la jam "cruzar la carretera y el río sin convertirse en papilla", este juego cubre la mitad "carretera" del tema con una vuelta distinta a Frogger: en vez de niveles con meta fija (5 casas), es un **score chase infinito** — solo carriles de tráfico, sin río, sin vidas ni pausa de nivel, con una "pared de atasco" que sube desde abajo y obliga a avanzar sin poder quedarse quieto. Aporta al catálogo un género que ninguno de los otros juegos de esta jam ni del catálogo actual cubre: dodging de un solo sentido con presión constante (parecido en espíritu a un endless runner, pero en rejilla discreta como snake).

No hay starter en `resources/started-games/` ni assets propios: se escribe desde cero, patrón `snake` (SPEC 09). `atasco` **no existe** en `public.games`, así que esta spec necesita una migración nueva de catálogo. La política `anon_insert_scores` (SPEC 07) no es específica de slug, así que no hace falta ninguna migración nueva sobre `scores`.

---

## Scope

**In:**

- **Alta en `public.games`.** Migración nueva `supabase/migrations/0005_add_atasco_game.sql` (descrita, no aplicada por este agente) con la fila `atasco` (`category_label: "ARCADE"`, `tags: ['REFLEJOS', 'ENDLESS']`, `year: 2026` — original del Vault, no un clon de un arcade histórico —, `sort_order: 8`, `best_score` semilla, imagen/alt de un coche visto desde arriba entre carriles de neón).
- **Fork del juego** en `public/games/atasco/game.js` (script clásico, sin assets binarios; coches y peatón se dibujan como rectángulos):
  - `window.startAtasco(canvasEl)` / `stop()` (cancela el frame, marca `detenido`, quita el `keydown`).
  - `window.restartAtasco()` reinicia posición, `score`, velocidad de la pared y las filas de tráfico.
  - **Sin pausa funcional** en esta primera spec (ver Decisions) — no se expone `toggleAtascoPause`.
  - Motor: el jugador ocupa siempre una columna fija cerca del centro vertical de la pantalla; el "carril actual" avanza hacia arriba con cada salto (`ArrowUp`), generando una fila de tráfico nueva por debajo. Una "pared de atasco" (banda roja) sube desde el borde inferior a velocidad creciente; si alcanza al jugador, game over. `ArrowLeft` / `ArrowRight` mueven una columna dentro del ancho de carril; `ArrowUp` avanza una fila (y cuenta como carril cruzado); no hay `ArrowDown`.
- **Emisión de estado** vía `window.postMessage({ source: "atasco", type: "state" | "gameover", score, lanes, speedLevel, phase }, window.location.origin)`, `phase ∈ "playing" | "gameover"` (sin `"paused"`, ver Decisions). Chequeo sucio.
- **`components/atasco-player.tsx`**, `"use client"`, calcado de `components/snake-player.tsx`: un `<Script strategy="afterInteractive" src="/games/atasco/game.js">`, `<canvas>` 800×600 escalado 4:3, HUD local `{ score, lanes, speedLevel, phase }`.
- **Rama en `app/jugar/[slug]/page.tsx`**: `slug === "atasco"` → `<AtascoPlayer game={game} />`; el resto de ramas intactas.
- **Escritura real**: reutiliza `anon_insert_scores` existente. Server Action `guardarPuntuacionAtasco({ score })` gemela de `guardarPuntuacionSnake`, inserta `{ game_slug: "atasco", player: "G4M3R_X", score, achieved_at: null }`, revalida `/salon-de-la-fama` y `/juegos/atasco`.

**Out of scope (para futuras specs):**

- Pausa funcional (se añade, si se decide, en un incremento; ver Decisions de por qué queda fuera aquí).
- Auth real, sonido, controles táctiles/gamepad.
- Persistencia propia (`localStorage`).
- Power-ups (invulnerabilidad, doble salto), obstáculos distintos de coches (no hay río ni troncos: este juego es solo carretera).
- Selección de dificultad inicial por el jugador.

---

## Data model

```ts
// Emitido por public/games/atasco/game.js
// vía window.postMessage(msg, window.location.origin)

type AtascoMessage =
  | {
      source: "atasco";
      type: "state";
      score: number; // +10 por carril cruzado, sin bonus adicional en esta spec
      lanes: number; // carriles cruzados en la partida actual (entero, ≥ 0)
      speedLevel: number; // 1..n, sube cada N carriles y acelera tráfico + pared de atasco
      phase: "playing" | "gameover";
    }
  | {
      source: "atasco";
      type: "gameover";
      score: number;
    };
```

- **No hay `lives`:** una sola colisión (con un coche o con la pared de atasco) termina la partida, igual que en `snake`.
- **No hay `phase: "paused"`:** esta primera spec no tiene pausa funcional (ver Decisions); el campo solo toma `"playing"` o `"gameover"`.
- **`lanes`** ocupa el hueco que en Frogger usa `homes`: es el contador de progreso propio de este juego.

```ts
// app/jugar/[slug]/actions.ts — "use server"
async function guardarPuntuacionAtasco(input: {
  score: number;
}): Promise<{ ok: boolean; error?: string }>;
// Inserta: { game_slug: "atasco", player: "G4M3R_X", score, achieved_at: null }
```

---

## Implementation plan

1. **Migración de catálogo.** Redactar (no aplicar) `supabase/migrations/0005_add_atasco_game.sql` con la fila descrita arriba.
2. **Esqueleto de `game.js`.** `function startAtasco(canvasEl)` en `window.startAtasco`: backing `800×600`, columna del jugador fija cerca del centro horizontal, fila de peligro inmediatamente por debajo generada al arrancar. Bucle `requestAnimationFrame`. `stop()` cancela y quita el `keydown`.
3. **Movimiento y generación de carriles.** `ArrowLeft`/`ArrowRight` mueven una columna dentro del carril (con tope en los bordes); `ArrowUp` avanza una fila, genera una fila nueva de tráfico por debajo con velocidad y densidad según `speedLevel`, `lanes++`, `score += 10`.
4. **Pared de atasco.** Banda que sube desde el borde inferior del canvas a velocidad `paredVelocidad = base + speedLevel * incremento`; si su borde superior alcanza la fila del jugador, `phase = "gameover"`.
5. **Colisión de tráfico y velocidad.** Solapar un coche en la fila actual también termina la partida. `speedLevel = floor(lanes / 10) + 1`, sube la velocidad del tráfico y de la pared cada 10 carriles, con techo.
6. **Emisión de estado y reinicio.** `postMessage` con chequeo sucio tras cada cambio de `score`/`lanes`/`speedLevel`/`phase`; `type: "gameover"` al morir. `window.restartAtasco()` reinicia jugador, `score`, `lanes`, `speedLevel`, pared y filas. `stop()` elimina el listener y `restartAtasco`.
7. **`AtascoPlayer` — canvas y arranque.** `components/atasco-player.tsx` calcado de `snake-player.tsx` con un solo `<Script>`; `onReady` + canvas montado antes de `startAtasco`. Montar en `app/jugar/[slug]/page.tsx` para `slug === "atasco"`.
8. **HUD sincronizado.** Estado `{ score, lanes, speedLevel, phase }`; tercer bloque del HUD = "CARRILES" + "VELOCIDAD" (sin corazones, sin "PAUSA": no hay pausa en esta spec).
9. **Modal + Guardar.** `<GameOverModal>` controlado en `type: "gameover"`; "Jugar de nuevo" llama a `window.restartAtasco()`. Añadir `guardarPuntuacionAtasco` a `actions.ts` y cablear `onSave`.
10. **Cierre.** Jugar varias partidas hasta morir por coche y hasta morir por la pared de atasco; confirmar guardado y aparición en `/salon-de-la-fama` y `/juegos/atasco`.

---

## Acceptance criteria

- [ ] Existe `public/games/atasco/game.js`, servido bajo `http://localhost:3000/games/atasco/game.js`.
- [ ] `ArrowLeft`/`ArrowRight` mueven al jugador dentro del carril; `ArrowUp` avanza una fila y genera tráfico nuevo por debajo.
- [ ] Chocar con un coche termina la partida inmediatamente.
- [ ] La pared de atasco sube desde abajo de forma visible y termina la partida si alcanza al jugador.
- [ ] `speedLevel` sube cada 10 carriles cruzados y el tráfico/pared se sienten más rápidos tras cada subida.
- [ ] El HUD muestra puntuación (7 dígitos), carriles cruzados y nivel de velocidad reales.
- [ ] Al morir, el modal "Fin del juego" se abre solo con la puntuación real; "Guardar puntuación" inserta una fila con `game_slug = 'atasco'` y no duplica en un segundo click.
- [ ] La fila guardada aparece en `/salon-de-la-fama` (pestaña Atasco) y `/juegos/atasco`.
- [ ] `game.js` no arranca al cargar el `<script>`; el `requestAnimationFrame` y el `keydown` se limpian al desmontar el componente.
- [ ] `npm run build` y `npm run lint` terminan sin errores.

---

## Decisions

- **Sí (ubicación del HUD):** todo el HUD (puntuación, carriles, velocidad) vive solo en React vía `postMessage`; `game.js` no dibuja texto, solo la pared de atasco y las entidades de juego, que sí son elementos jugables en tiempo real.
- **Sí (persistencia propia):** ninguna. Sin `localStorage`; el leaderboard de Supabase es la única persistencia.
- **Sí (write policy):** reutiliza `anon_insert_scores` (SPEC 07) sin gating por auth, misma postura que el resto del catálogo — no hay auth en el proyecto todavía.
- **No (pausa):** esta primera spec no expone `toggleAtascoPause` ni `phase: "paused"`. Al ser un endless con presión constante (la pared de atasco), una pausa funcional necesitaría decidir si la pared también se congela y cambia la sensación central del juego ("no puedes parar"); se deja como decisión explícita fuera de alcance en vez de improvisarla. Si se pide, es un incremento propio de esta carpeta.
- **Sí:** `year: 2026` en la fila de catálogo. A diferencia de Frogger (clon fiel de un arcade de 1981), `atasco` es un diseño original del Vault para esta jam, sin año histórico que reclamar — mismo criterio que `game-planner` aplicó a ALETEO/SEÑAL/SINCRO.
- **No:** río, troncos ni tortugas. Este juego cubre deliberadamente solo la mitad "carretera" del tema; la mitad "río" la cubre `rapidos` (otro juego de esta misma jam).

---

## Risks

| Riesgo                                                                                                       | Mitigación                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| La pared de atasco mal calibrada alcanza al jugador casi de inmediato o nunca lo alcanza.                    | Velocidad inicial baja y creciente por `speedLevel`, ajustable en implementación sin tocar el contrato.                    |
| Sin pausa, una partida larga es incómoda si el jugador necesita interrumpirla.                               | Aceptado como parte del diseño (endless de presión constante); documentado explícitamente en Decisions, no es un olvido.   |
| Sensación de "carril infinito" requiere generar filas de tráfico coherentes sin patrones repetitivos obvios. | Aleatoriedad acotada por fila (densidad y hueco mínimo transitable) en vez de un patrón fijo; se ajusta en implementación. |

---

## Lo que **no** entra en esta spec

- Pausa funcional.
- Río, troncos, tortugas u otra mecánica de agua.
- Power-ups, obstáculos distintos de coches.
- Auth real, sonido, controles táctiles/gamepad.
- Selección de dificultad inicial.

Cada uno de esos, si llega, va en su propia spec.
