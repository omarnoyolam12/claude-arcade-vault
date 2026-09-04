# SPEC game-jam/rapidos/02 — Arrastre de remolinos y curva de dificultad por tramos en Rápidos

> **Status:** Borrador
> **Depends on:** SPEC game-jam/rapidos/01, SPEC 05, SPEC 06
> **Date:** 2026-09-04
> **Objective:** Sustituir la resta de vida directa de los remolinos por un arrastre lateral breve, y fijar una curva de dificultad por tramos de distancia en `/jugar/rapidos`.

---

## Por qué existe esta spec

`01-rapidos-jugable.md` dejó explícitamente fuera de alcance dos mejoras de sensación de juego, marcadas como Decisions "Sí" pero simplificadas para caber en una sola spec: (1) los remolinos restan una vida directamente en vez de arrastrar, y (2) la curva de dificultad por nivel no tenía tramos ni techo concretos. Esta spec resuelve ambas sin tocar el contrato `window.startRapidos` / `stop()` / `restartRapidos()` / `toggleRapidosPause()` ni la forma de `RapidosMessage` definidos en `01`.

---

## Scope

**In:**

- **Arrastre en remolinos.** Al entrar en un remolino, la balsa deja de responder al control lateral del jugador durante una ventana de tiempo fija y es empujada gradualmente hacia el centro del remolino; si sale del remolino (por desplazamiento del río) sin chocar contra una roca durante el arrastre, no pierde vida. Si durante el arrastre colisiona con una roca u otro obstáculo, sí pierde vida (además del susto del arrastre).
- **Curva de dificultad por tramos.** La distancia recorrida se divide en tramos fijos (constantes en `game.js`); cada tramo nuevo aumenta la velocidad del río y la densidad de rocas/lagartos un escalón, hasta un techo definido, igual que hace la spec `02` de la carpeta `frogger` para su propia progresión.

**Out of scope (para futuras specs):**

- Distintos tipos de remolino (grande/pequeño, dirección variable).
- Selección de dificultad inicial por el jugador.
- Cualquier cambio a `postMessage`, a la Server Action `guardarPuntuacionRapidos` o a `components/rapidos-player.tsx`.

---

## Data model

Esta spec no introduce campos nuevos en `RapidosMessage` (definido en `01-rapidos-jugable.md`). Constantes internas de `game.js`:

```js
// public/games/rapidos/game.js — constantes internas, no forman parte del contrato
const REMOLINO_DURACION_ARRASTRE_MS = 900;
const NIVEL_MAX_DIFICULTAD = 6;
const VELOCIDAD_RIO_INCREMENTO = 0.12; // por tramo, hasta el techo
const DENSIDAD_OBSTACULOS_INCREMENTO = 0.1; // por tramo, hasta el techo
```

---

## Implementation plan

1. Añadir en `game.js` el estado interno `enRemolino` (con temporizador de arrastre) junto a las constantes de dificultad, sin tocar el contrato público. El sistema arranca igual que en `01`.
2. Al entrar en un remolino, ignorar el input lateral del jugador y desplazar su posición gradualmente hacia el centro del remolino durante `REMOLINO_DURACION_ARRASTRE_MS`; si el temporizador termina sin colisión adicional, la balsa recupera el control sin perder vida. Verificar en consola que atravesar un remolino sin más obstáculos cerca no resta vidas.
3. Detectar colisión con roca/lagarto **durante** el arrastre igual que fuera de él (resta una vida, con la misma invulnerabilidad breve de `01`). Verificar que un remolino junto a una roca sí es peligroso.
4. Calcular el tramo actual a partir de la distancia recorrida y aplicar `VELOCIDAD_RIO_INCREMENTO` / `DENSIDAD_OBSTACULOS_INCREMENTO` hasta `NIVEL_MAX_DIFICULTAD`, reflejado en el `level` ya existente en `RapidosMessage`. Jugar varios tramos y confirmar que la dificultad sube de forma perceptible y luego se estabiliza.

---

## Acceptance criteria

- [ ] Entrar en un remolino y salir de él sin chocar con nada más no resta ninguna vida.
- [ ] Chocar con una roca mientras se está siendo arrastrado por un remolino sí resta una vida.
- [ ] Durante el arrastre, el input lateral del jugador no mueve la balsa (queda claramente "atrapada").
- [ ] La velocidad del río y la densidad de obstáculos aumentan de forma perceptible al cruzar cada tramo de distancia, hasta `NIVEL_MAX_DIFICULTAD`.
- [ ] Por encima de `NIVEL_MAX_DIFICULTAD` la dificultad deja de subir.
- [ ] El contrato `window.startRapidos` / `stop()` / `restartRapidos()` / `toggleRapidosPause()` y la forma de `RapidosMessage` no cambian respecto a `01`.
- [ ] `npm run build` y `npm run lint` terminan sin errores.

---

## Decisions

- **Sí:** arrastre temporal en vez de resta de vida directa. Es más fiel a la idea de "remolino" (te atrapa, no te mata al instante) y da al jugador una segunda oportunidad si reacciona a tiempo alejándose de rocas cercanas antes de entrar.
- **Sí:** el arrastre bloquea el input lateral por completo durante su ventana, en vez de solo reducir la sensibilidad. Es la forma más simple de comunicar "estás atrapado" sin añadir un estado intermedio confuso.
- **Sí:** curva de dificultad por tramos fijos con techo, igual criterio que `frogger/02-frogger-progresion.md`. Mantiene coherencia de diseño entre los juegos de la misma jam.
- **No:** distintos tipos de remolino. Añade variedad visual sin cambiar la mecánica central; se puede pedir como otra spec si se quiere.

---

## Risks

| Riesgo                                                                                            | Mitigación                                                                                                    |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Un arrastre demasiado largo se siente como pérdida de control injusta, sobre todo cerca de rocas. | `REMOLINO_DURACION_ARRASTRE_MS` ajustable como constante; valor inicial corto (~1s) para probar y afinar.     |
| Curva de dificultad mal calibrada puede volver el juego injugable a partir de cierto tramo.       | Constantes ajustables sin tocar el contrato; probar manualmente hasta `NIVEL_MAX_DIFICULTAD` antes de cerrar. |

---

## Lo que **no** entra en esta spec

- Distintos tipos de remolino.
- Selección de dificultad inicial por el jugador.
- Cambios al contrato `window.startRapidos` o a `RapidosMessage` más allá del comportamiento numérico descrito aquí.

Cada uno de esos, si llega, va en su propia spec.
