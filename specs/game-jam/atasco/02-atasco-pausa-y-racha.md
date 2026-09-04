# SPEC game-jam/atasco/02 — Pausa funcional y multiplicador de racha en Atasco

> **Status:** Borrador
> **Depends on:** SPEC game-jam/atasco/01, SPEC 05, SPEC 06
> **Date:** 2026-09-04
> **Objective:** Añadir pausa funcional (congelando también la pared de atasco) y un multiplicador de puntuación por racha de carriles cruzados sin detenerse a `/jugar/atasco`.

---

## Por qué existe esta spec

`01-atasco-jugable.md` dejó la pausa deliberadamente fuera porque cambiaba la sensación central del juego ("no puedes parar") y quería resolverse como una decisión explícita, no improvisada. Esta spec la resuelve: se añade pausa funcional que congela **todo**, incluida la pared de atasco (no solo el tráfico), de modo que pausar nunca es una forma de "ganar tiempo" frente a la pared. De paso, añade una mecánica de riesgo/recompensa que hoy no existe: una racha de avances consecutivos sin quedarse quieto sube un multiplicador de puntuación, que se resetea si el jugador se queda una fila sin avanzar (deja pasar un ciclo de `requestAnimationFrame` sin pulsar `ArrowUp`) o si recibe una colisión.

---

## Scope

**In:**

- **Pausa funcional.** `window.toggleAtascoPause()` alterna `phase` `playing ↔ paused`; la tecla `P` hace lo mismo. En pausa se congelan: el tráfico, la pared de atasco y el contador de racha (no decae mientras está en pausa). `phase` gana el valor `"paused"` en `AtascoMessage` (ya estaba tipado como posible en el `postMessage` genérico del proyecto, pero `01` no lo emitía nunca).
- **Multiplicador de racha.** Un contador interno `racha` sube en 1 cada vez que el jugador avanza una fila (`ArrowUp`) sin haber estado más de un umbral de tiempo fijo sin avanzar. Cada carril cruzado suma `10 * multiplicador(racha)` en vez de los `10` fijos de `01`, donde `multiplicador` crece por tramos (p. ej. `+1×` cada 5 de racha, con techo). La racha se resetea a `0` si el jugador tarda demasiado en avanzar o si muere.
- **HUD.** El bloque "PAUSA" en pantalla (overlay React) cuando `phase === "paused"`, igual que en snake/tetris/arkanoid. El bloque "VELOCIDAD" del HUD existente pasa a mostrar también la racha actual (p. ej. "VELOCIDAD 3 · RACHA 12") sin añadir un campo nuevo obligatorio al mensaje — ver Data model.

**Out of scope (para futuras specs):**

- Persistir la mejor racha entre partidas.
- Cualquier control táctil/gamepad de pausa.
- Cambiar el cálculo de `speedLevel` o de la pared de atasco definido en `01`.

---

## Data model

`AtascoMessage` (definido en `01-atasco-jugable.md`) se extiende con un campo opcional:

```ts
type AtascoMessage =
  | {
      source: "atasco";
      type: "state";
      score: number;
      lanes: number;
      speedLevel: number;
      streak: number; // NUEVO: racha actual de avances consecutivos sin detenerse
      phase: "playing" | "paused" | "gameover"; // "paused" ahora sí se emite
    }
  | { source: "atasco"; type: "gameover"; score: number };
```

- **`streak`** es el único campo nuevo; no rompe la forma anterior porque los consumidores existentes de `AtascoMessage` (solo `components/atasco-player.tsx`, propio de esta misma jam) se actualizan en el mismo cambio.

---

## Implementation plan

1. En `public/games/atasco/game.js`, añadir el estado interno `racha` y `pausado`, junto a un temporizador de "última fila avanzada". El sistema arranca igual que en `01`.
2. Congelar tráfico, pared de atasco y el temporizador de racha cuando `pausado === true`; exponer `window.toggleAtascoPause` y enlazar la tecla `P`. Verificar en consola que pausar detiene visualmente todo, incluida la pared.
3. Calcular `multiplicador(racha)` por tramos y aplicarlo al sumar puntos en cada `ArrowUp`; resetear `racha` a `0` si pasa el umbral de tiempo sin avanzar o al morir. Verificar que una racha larga da más puntos por carril que al inicio de la partida.
4. Incluir `streak` en el `postMessage` de estado (chequeo sucio incluye ahora también `streak`); actualizar `components/atasco-player.tsx` para leer y mostrar `streak` y para pintar el overlay "PAUSA" reutilizando el mismo patrón que `SnakePlayer`. Pasar `onPause={() => window.toggleAtascoPause?.()}` a `<GameOverModal>`.
5. Jugar una partida completa alternando avances rápidos y pausas: confirmar que la racha sube, se resetea al detenerse demasiado tiempo, y que pausar no hace avanzar la pared de atasco.

---

## Acceptance criteria

- [ ] Pulsar `P` (o el botón "Pausa" del control deck) congela tráfico, pared de atasco y racha; reanudar continúa exactamente donde estaba.
- [ ] Avanzar varias filas seguidas sin detenerse sube visiblemente el multiplicador de puntos por carril.
- [ ] Detenerse más del umbral fijado sin pulsar `ArrowUp` resetea la racha a `0`.
- [ ] Morir resetea la racha a `0` (verificable al reiniciar con `restartAtasco`).
- [ ] El HUD muestra la racha actual junto al nivel de velocidad.
- [ ] `AtascoMessage` sigue siendo válido para todo consumidor existente: los campos de `01` (`score`, `lanes`, `speedLevel`, `phase`) no cambian de tipo ni de significado.
- [ ] `npm run build` y `npm run lint` terminan sin errores.

---

## Decisions

- **Sí:** la pausa congela también la pared de atasco, no solo el tráfico. Si solo congelara el tráfico, pausar sería una forma de "comprar tiempo" gratis frente a la pared, contradiciendo la razón por la que `01` la dejó fuera.
- **Sí:** multiplicador de racha con techo fijo (no crecimiento indefinido). Evita que una partida muy larga produzca puntuaciones desproporcionadas respecto al riesgo real de cada carril.
- **No:** persistir la mejor racha fuera de la partida actual. El leaderboard de Supabase (puntuación final) ya captura el resultado agregado; una racha histórica es una métrica secundaria que no aporta al HUD actual.

---

## Risks

| Riesgo                                                                                             | Mitigación                                                                                                 |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Multiplicador mal calibrado hace que rachas largas dominen por completo la puntuación final.       | Techo fijo del multiplicador, ajustable en implementación sin tocar el contrato ni `postMessage`.          |
| Pausar y reanudar de forma repetida podría usarse para "leer" la posición del tráfico sin presión. | Aceptado: es el comportamiento estándar de pausa en snake/tetris/arkanoid; no es específico de este juego. |

---

## Lo que **no** entra en esta spec

- Persistencia de la mejor racha.
- Controles táctiles/gamepad de pausa.
- Cambios al cálculo de `speedLevel` o de la pared de atasco.

Cada uno de esos, si llega, va en su propia spec.
