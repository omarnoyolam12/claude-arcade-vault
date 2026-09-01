# SPEC 05 — Asteroids jugable en `/jugar/asteroids`

> **Status:** Aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-09-01
> **Objective:** Integrar el juego canvas de `resources/started-games/02-claude-asteroids/` en la ruta `/jugar/asteroids` para que se pueda jugar de verdad con teclado, con el HUD React del reproductor sincronizado al estado real del juego y el modal "Fin del juego" mostrando la puntuación final real (sin persistir).

---

## Por qué existe esta spec

La SPEC 01 dejó `/jugar/[slug]` como maqueta visual para los seis juegos: HUD con datos mock, gabinete CRT con una imagen estática y el texto "Insert coin", más el modal "Fin del juego" oculto. No hay motor de juego en el repo ("Out of scope" explícito de SPEC 01: "Motor de juego, canvas jugable, lógica de puntuación real").

Esta spec rompe esa regla **solo para `asteroids`**. Toma el `game.js` vanilla de `resources/started-games/02-claude-asteroids/` (canvas 800×600, sin dependencias, sin bundler), lo sirve desde `public/`, lo carga con `next/script` sobre un `<canvas>` real dentro del gabinete y conecta su estado con el HUD React del reproductor mediante `window.postMessage`. Los otros cinco juegos siguen siendo maqueta.

Sigue **sin haber persistencia**: no se crea ninguna tabla en Supabase, "Guardar puntuación" no guarda nada y "Jugar de nuevo" no cambia respecto al mock. La única novedad de datos es el mensaje que el juego emite hacia la página.

**Regla de estilos (heredada de SPEC 01–04):** `app/globals.css` no se toca. Todo estilo adicional se resuelve con utilidades de Tailwind en el JSX. El `game.js` bifurcado conserva su propio dibujo en canvas (incluye su HUD interno) y no aporta CSS.

---

## Scope

**In:**

- `public/games/asteroids/game.js` — **nuevo**. Copia bifurcada de `resources/started-games/02-claude-asteroids/game.js` con tres cambios acotados:
  1. El cuerpo del juego se envuelve en una función `startAsteroids(canvasEl)` expuesta como `window.startAsteroids`. Ya no arranca solo al cargar el script: la invoca el componente React. Devuelve una función `stop()` que cancela el `requestAnimationFrame` en curso y quita los listeners de teclado que registró.
  2. Los listeners `keydown` / `keyup` se registran dentro de `startAsteroids` (siguen sobre `window`, siguen haciendo `preventDefault` de flechas y `Space`) y se eliminan en `stop()`.
  3. Emisión de estado con `window.postMessage(msg, window.location.origin)`:
     - Cuando cambian `score`, `lives`, `level` o `state`: `{ source: "asteroids", type: "state", score, lives, level, phase }` con `phase` ∈ `"playing" | "dead" | "gameover"`. Chequeo sucio barato: solo se emite si algún valor cambió respecto al último emitido.
     - Al entrar en `state === "gameover"`: además `{ source: "asteroids", type: "gameover", score }`.
       El resto de `game.js` (física, `drawHUD()` con SCORE / NIVEL / vidas dentro del canvas, `drawOverlay('GAME OVER', …)`, reinicio con `Space`) **no se toca**.
- `components/asteroids-player.tsx` — **nuevo**, `"use client"`. Contiene todo lo jugable:
  - Un `<canvas id="canvas" width={800} height={600}>` con backing store nativo 800×600, escalado por CSS para llenar el ancho del gabinete manteniendo la relación 4:3 (`w-full h-auto aspect-[4/3]`, `image-rendering` según convenga). El gabinete CRT (borde, scanlines, viñeta) se mantiene como marco alrededor.
  - `<Script src="/games/asteroids/game.js" strategy="afterInteractive" onReady={…}>` de `next/script`. En `onReady` (y con el `<canvas>` ya montado vía `ref`) llama a `window.startAsteroids(canvasEl)` y guarda el `stop()` devuelto. En el cleanup del `useEffect` llama a `stop()`.
  - Estado local `{ score, lives, level, phase }` alimentado por un listener de `message` sobre `window`, que filtra `event.origin === window.location.origin`, `event.source === window` y `event.data?.source === "asteroids"`.
  - El HUD React del reproductor (jugador, puntuación, vidas, nivel) con **el mismo marcado y clases** que hoy tiene `app/jugar/[slug]/page.tsx`, pero leyendo del estado local en vez del objeto `hud` mock. La etiqueta de jugador queda fija (`"G4M3R_X"`, no hay auth). Puntuación formateada a 7 dígitos con ceros a la izquierda, como el mock. Vidas y nivel reales.
  - `<GameOverModal>` en modo controlado: se abre automáticamente al recibir un mensaje `type: "gameover"` y su `finalScore` es esa puntuación final real (formateada igual que el HUD). El botón "Salir" del control deck también lo abre manualmente, mostrando la puntuación real vigente en ese momento.
  - Bajo el gabinete, un aviso discreto (texto pequeño, `text-outline`): el juego requiere teclado (flechas para rotar/propulsar, `Espacio` para disparar). No se añaden controles táctiles.
- `components/game-over-modal.tsx` — **modificado**. Se añade modo controlado opcional: props `open?: boolean` y `onOpenChange?: (open: boolean) => void`. Si se pasan, el padre controla la visibilidad; si no, se mantiene el comportamiento actual (estado interno, "Salir" abre, "Jugar de nuevo" cierra) para las otras cinco rutas `/jugar/*`. "Guardar puntuación" y "Pausa" siguen **sin lógica** (visuales). "Jugar de nuevo" sigue solo cerrando el modal.
- `app/jugar/[slug]/page.tsx` — **modificado**. Si `slug === "asteroids"`, renderiza `<AsteroidsPlayer game={game} />` en lugar del bloque HUD mock + `<Image>` del gabinete + `<GameOverModal>` mock. Para los otros cinco slugs, la página queda **exactamente igual** que hoy. `generateStaticParams`, `getGame`, `notFound()` y el `SiteHeader` / `SiteFooter` no cambian.
- `AGENTS.md` — si `next dev` lo regenera, se commitea junto con el trabajo.

**Out of scope (para futuras specs):**

- Hacer jugables `arkanoid`, `tetris`, `snake`, `space-invaders`, `pac-man`. Sus `/jugar/[slug]` siguen siendo maqueta. No se añade ningún mecanismo genérico (`game.embedUrl` en `lib/games.ts` u otro) en esta spec.
- Persistir la puntuación: tabla en Supabase, escritura de leaderboard, `lib/leaderboards.ts` sigue mock. "Guardar puntuación" no guarda.
- Identidad de jugador real: el HUD muestra una etiqueta fija; no se lee sesión de Supabase.
- Cambiar `app/juegos/[slug]/page.tsx` (detalle) ni `lib/games.ts`.
- Botón "Pausa" funcional. El juego solo se reinicia con `Espacio` (comportamiento nativo de `game.js` en GAME OVER); "Jugar de nuevo" no reinicia el motor.
- Controles táctiles o gamepad para móvil.
- Quitar el HUD que el propio `game.js` dibuja dentro del canvas (queda duplicado con el HUD React, es aceptado).
- Sonido, power-ups nuevos o cualquier modificación de la jugabilidad de `game.js`.
- Copiar `index.html` o `favicon.svg` del juego original (la página aporta el `<canvas>`; no hacen falta).
- Migrar `game.js` a TypeScript o a un componente React que reimplemente el juego.
- Tests automatizados (no hay framework configurado).
- Editar los archivos de las SPEC 01–04.

---

## Data model

Esta feature **no introduce estructuras persistidas ni tablas**. No hay esquema SQL, ni `localStorage`, ni escritura en Supabase.

La única estructura nueva es el mensaje que el juego bifurcado emite hacia la ventana y que el componente React consume:

```ts
// Mensajes emitidos por public/games/asteroids/game.js
// vía window.postMessage(msg, window.location.origin)

type AsteroidsMessage =
  | {
      source: "asteroids";
      type: "state";
      score: number; // puntuación acumulada (entero)
      lives: number; // vidas restantes (0..3)
      level: number; // nivel actual (1..n)
      phase: "playing" | "dead" | "gameover";
    }
  | {
      source: "asteroids";
      type: "gameover";
      score: number; // puntuación final
    };
```

Convenciones:

- El emisor y el receptor están en la **misma ventana** (no hay iframe). Se usa `window.postMessage` a `window.location.origin` en lugar de un `CustomEvent` para dejar el canal listo por si el juego se muda a un `<iframe>` en el futuro.
- El receptor descarta cualquier mensaje cuyo `origin` no sea el propio, cuyo `source` no sea `window`, o cuyo `data.source` no sea `"asteroids"`.
- Coordenadas y velocidades del juego: las de `game.js` (origen arriba-izquierda, 800×600, espacio toroidal). No cambian.
- La puntuación se muestra formateada a 7 dígitos con ceros a la izquierda solo en la capa React; `game.js` sigue emitiéndola y pintándola como entero.

`lib/games.ts` y `lib/leaderboards.ts` no cambian.

---

## Implementation plan

1. **Bifurcar `game.js` verbatim.** Copiar `resources/started-games/02-claude-asteroids/game.js` a `public/games/asteroids/game.js` sin cambios. `npm run build` sigue verde (nada lo referencia todavía).

2. **Boot re-entrante en el fork.** En `public/games/asteroids/game.js`: envolver el cuerpo en `function startAsteroids(canvasEl)` que usa `canvasEl` en vez de `document.getElementById('canvas')`, registra los listeners `keydown` / `keyup` dentro y expone `window.startAsteroids`. Sustituir el `initGame(); requestAnimationFrame(loop);` final por el `return () => { … }` (`stop()`) que hace `cancelAnimationFrame` y `removeEventListener`. Verificar en una consola de navegador que `window.startAsteroids(document.querySelector('canvas'))` arranca el juego sobre un canvas suelto.

3. **Emisión de estado.** En el fork, tras cada `update(dt)` (o donde ya se conocen `score`, `lives`, `level`, `state`), comparar con los últimos valores emitidos y, si cambió alguno, `window.postMessage({ source:"asteroids", type:"state", score, lives, level, phase: state }, window.location.origin)`. En la transición a `state === "gameover"`, emitir además `{ source:"asteroids", type:"gameover", score }`. Comprobar los mensajes en la pestaña de eventos / `addEventListener("message", …)` de la consola.

4. **Componente `AsteroidsPlayer` — canvas + arranque.** Crear `components/asteroids-player.tsx` (`"use client"`) con el gabinete CRT (portado del bloque actual de `app/jugar/[slug]/page.tsx`, sin el `<Image>`), un `<canvas ref>` 800×600 escalado a `w-full aspect-[4/3]`, y `<Script src="/games/asteroids/game.js" strategy="afterInteractive" onReady={…}>`. En `onReady` llamar a `window.startAsteroids(canvasRef.current)` y guardar el `stop`; en el cleanup del `useEffect`, `stop()`. Montarlo temporalmente en `app/jugar/[slug]/page.tsx` solo para `slug === "asteroids"`. Abrir `/jugar/asteroids`: el juego se ve y se juega con teclado.

5. **HUD sincronizado.** En `AsteroidsPlayer`, añadir estado `{ score, lives, level, phase }` y un listener de `message` (con los filtros de origen / source). Portar el marcado del HUD de `app/jugar/[slug]/page.tsx` (jugador, puntuación, vidas, nivel) al componente, leyendo del estado. Jugar y comprobar que los números del HUD React coinciden con los que `game.js` pinta dentro del canvas.

6. **Modal controlado.** En `components/game-over-modal.tsx`, añadir props opcionales `open` / `onOpenChange`; si están presentes, la visibilidad la manda el padre. Sin esas props, comportamiento idéntico al actual. En `AsteroidsPlayer`, abrir el modal al recibir `type:"gameover"` y pasarle `finalScore` = esa puntuación real formateada; "Salir" del control deck también lo abre con la puntuación vigente. Recorrer las otras rutas `/jugar/arkanoid`, `/jugar/tetris`, etc.: el modal sigue funcionando como antes (no controlado).

7. **Aviso de teclado.** Añadir bajo el gabinete, en `AsteroidsPlayer`, el texto pequeño de "requiere teclado (flechas + Espacio)". Sin controles táctiles.

8. **Rama de `asteroids` en la página.** Dejar `app/jugar/[slug]/page.tsx` con la bifurcación definitiva: `slug === "asteroids"` → `<AsteroidsPlayer game={game} />`; el resto → el JSX actual intacto. Confirmar que `/jugar/pac-man` y compañía renderizan byte a byte igual que antes de la spec.

9. **Cierre.** `npm run lint` y `npm run build` verdes. Recorrer `/jugar/asteroids` (jugar una partida completa hasta GAME OVER), `/jugar/pac-man`, `/juegos/asteroids`, `/` y `/juegos`. Si `next dev` regeneró `AGENTS.md`, commitearlo junto con el trabajo.

---

## Acceptance criteria

- [ ] `npm run build` termina sin errores ni fallos de tipos.
- [ ] `npm run lint` pasa sin errores.
- [ ] Existe `public/games/asteroids/game.js` y se sirve en `http://localhost:3000/games/asteroids/game.js`.
- [ ] En `/jugar/asteroids` se ve un canvas jugable: las flechas rotan y propulsan la nave, `Espacio` dispara, los asteroides se parten al recibir impactos y el juego llega a `GAME OVER` al perder las 3 vidas.
- [ ] `game.js` no arranca al cargar el `<script>`; arranca cuando `AsteroidsPlayer` llama a `window.startAsteroids(canvas)`, y al desmontar el componente se cancela el `requestAnimationFrame` y se quitan los listeners de teclado (no queda un loop huérfano tras navegar a otra ruta).
- [ ] El HUD React de `/jugar/asteroids` (puntuación, vidas, nivel) refleja el estado real del juego y coincide con lo que `game.js` dibuja dentro del canvas; la puntuación React se muestra con 7 dígitos y ceros a la izquierda.
- [ ] Al llegar a `GAME OVER`, el modal "Fin del juego" se abre automáticamente y su "Puntuación final" es la puntuación real de esa partida (no `0149250` ni ningún valor mock).
- [ ] El botón "Salir" del control deck abre el modal mostrando la puntuación real vigente.
- [ ] "Guardar puntuación", "Pausa" y "Jugar de nuevo" no persisten ni reinician nada: siguen siendo visuales ("Jugar de nuevo" solo cierra el modal).
- [ ] Bajo el gabinete de `/jugar/asteroids` hay un aviso de que el juego requiere teclado.
- [ ] `/jugar/pac-man`, `/jugar/arkanoid`, `/jugar/tetris`, `/jugar/snake`, `/jugar/space-invaders` renderizan igual que antes de esta spec: HUD mock, gabinete con `<Image>` y texto "Insert coin", y el `GameOverModal` no controlado (se abre con "Salir", se cierra con "Jugar de nuevo").
- [ ] `/juegos/asteroids` (detalle) y `lib/games.ts` no han cambiado.
- [ ] No existe ninguna tabla nueva en Supabase, ni archivo `.sql`, ni `lib/leaderboards.ts` modificado, ni uso de `localStorage`.
- [ ] `app/globals.css` no tiene reglas nuevas respecto al estado actual.
- [ ] Todo el texto visible nuevo (`AsteroidsPlayer`, aviso de teclado) está en español con acentos correctos.
- [ ] Un `slug` inexistente bajo `/jugar/` sigue devolviendo la 404 de Next.

---

## Decisions

- **Sí:** integrar solo `asteroids`, no un mecanismo genérico para los seis juegos. Cada juego tiene su propio `game.js` y sus propias fricciones; hacerlos jugables uno a uno mantiene cada cambio pequeño y revisable.
- **No:** `arkanoid` y `tetris` en esta spec, aunque también estén en `resources/started-games/`. Cada uno es su propia spec.
- **Sí:** servir `game.js` desde `public/games/asteroids/` y cargarlo con `next/script` (`strategy="afterInteractive"`) sobre un `<canvas>` de la propia página. Es la opción con menos reescritura del juego.
- **No:** `<iframe>` apuntando al `index.html` del juego. Aísla más, pero complica la sincronización del HUD y añade una barra de scroll / dimensionado extra; con `postMessage` a la misma ventana el canal queda igual de portable.
- **No:** reimplementar `game.js` como componente React con `useRef` + `useEffect`. Reescribe un juego que ya funciona; alto coste, sin beneficio para el MVP.
- **Sí:** bifurcar `game.js` a `public/` y envolver su arranque en `window.startAsteroids(canvas)` con un `stop()`. Hace el montaje re-entrante y permite cancelar el `rAF` al desmontar; sin esto, navegar fuera y volver deja un loop huérfano y un `canvas` obsoleto.
- **Sí:** sincronizar el HUD React con el estado real vía `window.postMessage`. El reproductor ya tiene ese HUD; alimentarlo con datos reales es coherente con la maqueta existente.
- **No:** quitar el HUD que `game.js` pinta dentro del canvas. Tocaría `drawHUD()` del juego; se acepta la duplicación temporal (HUD en canvas + HUD React) para no modificar la jugabilidad.
- **Sí:** el modal "Fin del juego" muestra la puntuación final real y se abre solo al `GAME OVER`. Es el significado natural de "capturar sin persistir".
- **No:** persistir la puntuación en Supabase. No hay tabla ni identidad de jugador conectada; es su propia spec (requiere auth real primero).
- **No:** "Pausa" funcional ni "Jugar de nuevo" que reinicie el motor. Fuera de alcance; el reinicio nativo con `Espacio` de `game.js` basta para el MVP.
- **Sí:** escalar el canvas por CSS a lo ancho del gabinete manteniendo 4:3. Aprovecha toda la pantalla del reproductor; el backing store sigue a 800×600, así que la lógica del juego no cambia.
- **No:** mostrar el canvas a tamaño nativo con letterboxing. Deja bandas negras grandes dentro de un gabinete `aspect-video`.
- **Sí:** aviso de "requiere teclado" en móvil. El juego es solo teclado; es más honesto que un canvas que no responde.
- **No:** controles táctiles. Scope creep; otra spec si se pide.
- **Sí:** modo controlado **opcional** en `GameOverModal` (`open` / `onOpenChange`). Deja intactas las otras cinco rutas `/jugar/*` que lo usan sin controlar.

---

## Risks

| Riesgo                                                                                                                                                  | Mitigación                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `next/script` no re-ejecuta el archivo en navegación SPA; al volver a `/jugar/asteroids` el juego no re-arranca o usa un `canvas` obsoleto.             | El fork expone `window.startAsteroids(canvas)` y el `useEffect` de `AsteroidsPlayer` lo invoca en cada montaje con el `canvas` actual; el cleanup llama a `stop()`. El criterio de aceptación cubre "navegar fuera y volver". |
| Los listeners de teclado de `game.js` hacen `preventDefault` de flechas y `Space`, bloqueando el scroll de la página mientras el foco está en el juego. | Comportamiento aceptado y esperado en un arcade; el juego ocupa el viewport del reproductor. `stop()` retira los listeners al desmontar.                                                                                      |
| Emitir un `postMessage` por frame (60/s) satura el hilo o provoca renders de React en cada frame.                                                       | El fork solo emite cuando `score` / `lives` / `level` / `state` cambian (chequeo sucio); React re-renderiza pocas veces por partida.                                                                                          |
| Un `postMessage` de otro origen o de una extensión se cuela como estado del juego.                                                                      | El receptor filtra por `event.origin === window.location.origin`, `event.source === window` y `event.data.source === "asteroids"`.                                                                                            |
| Escalar el canvas 800×600 a un ancho mayor produce un juego borroso o con aliasing.                                                                     | Backing store nativo 800×600 + escalado CSS entero-ish; ajustar `image-rendering` si hace falta. El juego es vectorial de líneas finas sobre negro, tolera bien el escalado.                                                  |
| El HUD React y el HUD interno del canvas muestran valores distintos por un frame de desfase.                                                            | Ambos leen del mismo estado del juego; el desfase máximo es un frame y el criterio de aceptación pide "coinciden", no "idénticos al milisegundo".                                                                             |
| `next dev` reescribe `AGENTS.md` y deja el árbol sucio.                                                                                                 | Commitear el `AGENTS.md` regenerado junto con el trabajo (paso 9).                                                                                                                                                            |

---

## Lo que **no** entra en esta spec

- Hacer jugables `arkanoid`, `tetris`, `snake`, `space-invaders`, `pac-man`.
- Mecanismo genérico de embebido de juegos en `lib/games.ts`.
- Persistir la puntuación (tabla Supabase, leaderboard real, "Guardar puntuación" funcional).
- Identidad de jugador real desde la sesión de Supabase.
- "Pausa" funcional y "Jugar de nuevo" que reinicie el motor.
- Controles táctiles / gamepad.
- Quitar el HUD interno del canvas de `game.js`.
- Sonido o cambios de jugabilidad en `game.js`.
- Cambios en `app/juegos/[slug]/page.tsx` o `lib/games.ts`.
- Tests automatizados; edición de las SPEC 01–04.

Cada uno de esos, si llega, va en su propia spec.
