# Registro de auditorías — mobile-porter

Memoria persistente del agente `mobile-porter`. **Se lee entero antes de cada auditoría y se
anexa al final de cada una.** No repetir una auditoría ya registrada para la misma
página/flujo sin justificarlo.

## Índice

| Fecha      | Alcance                                                                                                         | Veredicto               | Estado                     |
| ---------- | --------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------- |
| 2026-09-14 | `components/frogger-player.tsx` + `public/games/frogger/game.js` + `app/jugar/[slug]/page.tsx` (rama `frogger`) | Brechas encontradas (2) | Spec recomendada (`/spec`) |

## Formato de entrada

## AAAA-MM-DD — <Alcance auditado>

- **Alcance:** <página(s)/componente(s) revisados>
- **Veredicto:** Cumple | Brechas encontradas (N)
- **Hallazgos:** <lista con evidencia: archivo + línea/clase Tailwind>
- **Fuera de alcance:** <opcional: hallazgos tipo PWA/app nativa descartados>
- **Estado:** Auditado | Spec recomendada (`/spec`) | Spec redactada (`specs/NN-...`)
- **Notas:** <opcional>

---

## Entradas

## 2026-09-14 — Reproductor de Frogger (`/jugar/frogger`)

- **Alcance:** `components/frogger-player.tsx`, `public/games/frogger/game.js`,
  `app/jugar/[slug]/page.tsx` (rama `slug === "frogger"`), contrastados contra
  `components/snake-player.tsx` (referencia SPEC 11) y `components/touch-controls.tsx`.

- **Veredicto:** Brechas encontradas (2).

- **Hallazgos:**

  1. **[Bloqueante] Frogger es 100% dependiente de teclado físico — sin controles táctiles.**
     Confirmado en tres puntos:
     - `public/games/frogger/game.js:470` registra únicamente
       `window.addEventListener("keydown", onKeyDown)`; no hay ningún listener
       `touchstart`/`touchend`/`pointerdown` en todo el archivo (verificado con grep sobre
       `touch|pointer`, cero coincidencias).
     - `components/frogger-player.tsx` no importa `TouchControls` ni `useIsTouchDevice` de
       `@/components/touch-controls` (a diferencia de `components/snake-player.tsx:8,70`).
       En su lugar, la línea 198-200 renderiza un `<p>` fijo y no condicional:
       `"Flechas para saltar, P para pausar."`, sin la rama `isTouch ? <TouchControls .../> : <p>…</p>`
       que sí existe en `snake-player.tsx:204-218`.
     - Esto es **consistente con lo que declara el propio spec**:
       `specs/game-jam/frogger/01-frogger-jugable.md:40` ("Pausa táctil / gamepad; sonido.") y
       línea 164 ("Auth real, sonido, controles táctiles/gamepad.") excluyen explícitamente
       controles táctiles del alcance de SPEC game-jam/frogger/01. No es un bug de
       implementación respecto de su propio spec — es una brecha respecto del **resto del
       catálogo jugable**: `asteroids`, `tetris`, `arkanoid` y `snake` (los otros 4 juegos con
       motor real) ya integraron SPEC 11 y son jugables en un navegador móvil sin teclado
       Bluetooth; Frogger, siendo el quinto jugable, no lo es. Un usuario en un teléfono puede
       cargar `/jugar/frogger`, ver el gabinete CRT y el HUD, pero no tiene ninguna forma de
       mover la rana: el juego es inservible en mobile-web tal como está hoy.

  2. **[Cosmético] El mensaje de ayuda no distingue dispositivo táctil vs. teclado.**
     `frogger-player.tsx:198-200` muestra siempre "Flechas para saltar, P para pausar.",
     incluso cuando `useIsTouchDevice()` (si se integrara) detectaría un dispositivo sin
     teclado físico. `snake-player.tsx:215-217` sí condiciona el texto
     ("Requiere teclado: flechas para girar, P para pausar.") solo para el caso `!isTouch`.
     Es una consecuencia directa del hallazgo 1, no un problema independiente: al no existir
     la rama táctil, tampoco existe el mensaje diferenciado. Se documenta aparte porque, si se
     implementa SPEC 11 para Frogger, este texto debe actualizarse a la vez (mismo patrón que
     `snake-player.tsx`).

- **Resto del checklist responsive (Cumple):**
  - **Breakpoints / layout ~375-414px:** `frogger-player.tsx` reutiliza exactamente el mismo
    marcado y las mismas clases que `snake-player.tsx` para el HUD (`mb-4 flex w-full
max-w-5xl items-end justify-between px-4`, líneas 123 vs. snake:137) y para el gabinete
    CRT (`relative flex w-full max-w-5xl items-center justify-center overflow-hidden
rounded-[18px] ...`, líneas 169 vs. snake:172). El `<canvas>` usa idéntico
    `className="block aspect-[4/3] h-auto w-full [image-rendering:pixelated]"`
    (frogger:176, snake:179): escala fluida por `w-full`/`aspect-[4/3]`, sin overflow
    horizontal esperado en 375-414px. No hay clases `sm:`/`md:`/`lg:` en ninguno de los dos
    componentes (a diferencia de `tetris-player.tsx:221,240`, que sí ajusta el tamaño del
    "next piece" con `sm:`), pero como el layout es 100% fluido (`w-full` + `flex`), no hay
    indicio de corte de contenido — es el mismo patrón ya usado (y presumiblemente ya
    validado) en snake/asteroids/arkanoid, no una brecha nueva de Frogger.
  - **HUD de 3 columnas (`Jugador 1` / `Puntuación+Casas` / `Vidas+Nivel`):** mismo patrón
    `flex items-end justify-between` de snake ya probado en viewports angostos; el bloque
    central de Frogger añade una línea extra ("Casas x/5", línea 139-141) respecto de snake,
    pero es texto corto (`text-label-sm`) que no debería forzar overflow.
  - **Áreas tocables del control deck / modal:** `GameOverModal` (compartido, no auditado en
    detalle por no ser específico de Frogger) se reutiliza sin cambios respecto de snake.
  - **Maqueta CRT estática del resto del catálogo:** fuera del alcance pedido en esta
    invocación (solo se auditó Frogger).

- **Fuera de alcance:** Ninguna observación de tipo "instalable"/PWA/manifest aplica a este
  alcance; no se descartó ningún hallazgo de esa naturaleza porque no surgió ninguno.

- **Estado:** Spec recomendada (`/spec`).

- **Notas:** La recomendación de `/spec` agruparía los hallazgos 1 y 2 en una sola spec de
  incremento ("Controles táctiles para Frogger"), reutilizando el contrato
  `TouchControls({ dpad, actionB })` ya existente en `components/touch-controls.tsx` (sin
  `actionA`, igual que snake: Frogger no tiene una acción de "salto especial" más allá de las
  4 direcciones) y el hook `useIsTouchDevice()`, sin reinventar mecanismo de detección. Esto
  es territorio explícitamente abierto por SPEC 11 ("gestos táctiles... fuera de scope de
  SPEC 11" no aplica aquí porque el patrón D-pad+botón ya cubre el caso de Frogger; solo falta
  cablear el mismo patrón al motor de `public/games/frogger/game.js`, que ya escucha
  `KeyboardEvent` sintéticos igual que el resto — `TouchControls` despacha eventos hacia
  `window`, cero cambios necesarios en el motor salvo, potencialmente, exponer un
  `KeyCode` de pausa consistente, que ya existe: `KeyP`, ver `frogger-player.tsx:220`
  `onPause={() => window.toggleFroggerPause?.()}`).
