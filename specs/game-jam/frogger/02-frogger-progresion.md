# SPEC game-jam/frogger/02 — Progresión de dificultad y bonus de tiempo en Frogger

> **Status:** Borrador
> **Depends on:** SPEC game-jam/frogger/01, SPEC 05, SPEC 06
> **Date:** 2026-09-04
> **Objective:** Hacer que cada nivel de `/jugar/frogger` aumente la densidad y velocidad del tráfico y del río, y sumar un bonus de puntuación por tiempo restante al completar una ronda.

---

## Por qué existe esta spec

La spec `01-frogger-jugable.md` deja el nivel como un contador de rondas completas sin efecto en la dificultad, para caber en el tamaño de una sola spec. Esta la complementa: un Frogger sin curva de dificultad se vuelve repetitivo tras la primera ronda, y el temporizador por vida sin recompensa no aporta tensión real a la puntuación. Ambos cambios son puramente numéricos y de generación de entidades: no tocan el contrato `window.startFrogger` / `stop()` / `restartFrogger()` / `toggleFroggerPause()` ni el canal de `postMessage` ya definidos en `01`.

---

## Scope

**In:**

- **Progresión por nivel.** Cada vez que se completan las 5 casas (`level++` en `01`), la siguiente ronda aumenta la velocidad de coches y troncos/tortugas un escalón, y añade un carril de tráfico adicional cada 2 niveles, hasta un techo (p. ej. nivel 5). Fórmulas y techos concretos se fijan en `public/games/frogger/game.js` como constantes ajustables, igual que `tickMs` en `snake`.
- **Bonus de tiempo.** Al completar una casa (`homes++`), la puntuación suma, además de los `50` fijos de `01`, un bonus proporcional al tiempo restante de esa vida (redondeado a entero), con un tope máximo por casa para no desbalancear el marcador.
- **HUD.** El bloque "NIVEL" del reproductor ya existente (de `01`) pasa a reflejar visualmente (color o `+` visual) que subió de nivel; no se añade ningún campo nuevo al mensaje de `postMessage` — `level` ya viaja desde `01` y ahora además cambia la dificultad real del juego, no solo el contador.

**Out of scope (para futuras specs):**

- Insecto bonus (fly) u otros power-ups.
- Un techo de nivel distinto de uno fijo por implementación (no configurable desde el HUD).
- Cualquier cambio a `postMessage`, a la Server Action `guardarPuntuacionFrogger` o a `components/frogger-player.tsx` más allá de lo que ya describe `01`.
- Persistencia del nivel alcanzado entre partidas (`localStorage` o Supabase): el nivel se reinicia en cada `restartFrogger()`, como en `01`.

---

## Data model

Esta spec no introduce campos nuevos en `FroggerMessage` (definido en `01-frogger-jugable.md`): `level` y `score` ya existen y ahora se calculan con las reglas de esta spec. Constantes internas de `game.js` (no expuestas fuera del script):

```js
// public/games/frogger/game.js — constantes internas, no forman parte del contrato
const NIVEL_MAX_DIFICULTAD = 5; // a partir de aquí, la dificultad ya no sube
const VELOCIDAD_BASE = 1; // multiplicador de velocidad en nivel 1
const VELOCIDAD_INCREMENTO = 0.15; // por nivel, hasta el techo
const BONUS_TIEMPO_MAX = 20; // puntos máximos de bonus por casa
```

---

## Implementation plan

1. Añadir en `game.js` las constantes de progresión (arriba) junto al resto de parámetros ajustables del motor (junto a los definidos en `01`, p. ej. `tickMs`/duración del temporizador). El sistema sigue arrancando igual que en `01`.
2. Al completar la ronda (todas las casas ocupadas), recalcular la velocidad de cada fila de peligro con `VELOCIDAD_BASE + VELOCIDAD_INCREMENTO * min(level, NIVEL_MAX_DIFICULTAD - 1)` y, en niveles pares hasta el techo, añadir un carril extra de tráfico. Verificar en consola que el nivel 2 se siente más rápido que el nivel 1.
3. Al ocupar una casa, calcular el bonus de tiempo (`min(BONUS_TIEMPO_MAX, tiempoRestanteRedondeado)`) y sumarlo a `score` junto con los `50` fijos, antes de emitir el `postMessage` de estado. Verificar que el HUD refleja el bonus inmediatamente.
4. Jugar varias rondas completas de `/jugar/frogger` y confirmar que la dificultad sube de forma perceptible hasta el techo y luego se estabiliza, y que completar una casa con poco tiempo restante da menos bonus que completarla recién empezada la vida.

---

## Acceptance criteria

- [ ] Completar la ronda 1 y empezar la ronda 2 hace que los coches y troncos se muevan perceptiblemente más rápido.
- [ ] A partir del nivel 3, hay al menos un carril de tráfico adicional respecto al nivel 1.
- [ ] La dificultad deja de subir a partir de `NIVEL_MAX_DIFICULTAD`; niveles superiores no siguen acelerando indefinidamente.
- [ ] Ocupar una casa con el temporizador casi lleno suma más puntos que ocuparla con el temporizador casi agotado.
- [ ] El bonus de tiempo por casa nunca supera `BONUS_TIEMPO_MAX`.
- [ ] El contrato `window.startFrogger` / `stop()` / `restartFrogger()` / `toggleFroggerPause()` y la forma de `FroggerMessage` no cambian respecto a `01`.
- [ ] `npm run build` y `npm run lint` terminan sin errores.

---

## Decisions

- **Sí:** progresión por escalones fijos (velocidad + carriles) en vez de una curva continua o aleatoria. Es predecible, fácil de ajustar como constantes y coherente con cómo `snake` (SPEC 09) escalona su `tickMs` cada 5 frutas.
- **Sí:** bonus de tiempo con tope máximo por casa (`BONUS_TIEMPO_MAX`). Sin tope, un jugador que ocupe una casa muy rápido tras reiniciar el temporizador podría inflar la puntuación de forma desproporcionada respecto al riesgo asumido.
- **No:** exponer las constantes de dificultad como parte del contrato público o del `postMessage`. Son parámetros internos de balance, igual que `tickMs` en snake; cambiarlas no debe requerir tocar el reproductor React.
- **No:** techo de nivel configurable desde fuera del script. Mantiene el alcance acotado; si se pide selección de dificultad, es otra spec.

---

## Risks

| Riesgo                                                                                              | Mitigación                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Progresión mal calibrada vuelve el juego injugable a partir de cierto nivel.                        | Constantes ajustables sin tocar el contrato; probar manualmente hasta `NIVEL_MAX_DIFICULTAD` antes de cerrar.                                                                 |
| El bonus de tiempo, si se calcula mal (p. ej. sin redondear), puede emitir puntuaciones no enteras. | `score` se mantiene siempre entero: el bonus se redondea antes de sumarse, como exige la política `anon_insert_scores` (`score > 0`, entero implícito en el HUD a 7 dígitos). |

---

## Lo que **no** entra en esta spec

- Insecto bonus u otros power-ups de puntuación.
- Selección de dificultad por el jugador.
- Persistencia del nivel alcanzado entre partidas.
- Cambios al contrato `window.startFrogger` o a `FroggerMessage` más allá del comportamiento numérico descrito aquí.

Cada uno de esos, si llega, va en su propia spec.
