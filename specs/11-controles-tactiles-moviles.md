# SPEC 11 — Controles táctiles para jugar en móvil

> **Status:** Implementado
> **Depends on:** SPEC 05, SPEC 07, SPEC 08, SPEC 09
> **Date:** 2026-09-04
> **Objective:** Añadir un overlay táctil de D-pad + dos botones de acción a los cuatro reproductores jugables (asteroids, tetris, arkanoid, snake), visible solo en dispositivos sin teclado físico, que despacha `KeyboardEvent` sintéticos hacia los mismos `game.js` sin tocarlos.

---

## Por qué existe esta spec

Los cuatro motores jugables (`public/games/{asteroids,tetris,arkanoid,snake}/game.js`) escuchan `keydown` / `keyup` solo sobre `window` (Arkanoid además escucha `mousemove` / `click` sobre el canvas para la pala, pero sigue dependiendo de teclado para lanzar la bola, pausar y navegar sus menús). Cada `*-player.tsx` muestra hoy un aviso fijo "Requiere teclado" y no ofrece ninguna forma de jugar con solo una pantalla táctil. En un teléfono, hoy los cuatro juegos son literalmente injugables.

Se eligió despachar `KeyboardEvent` sintéticos en vez de tocar los cuatro `game.js`: los motores ya distinguen `keydown` mantenido de `keyup` (asteroids usa un objeto `keys` que consulta cada frame; arkanoid rastrea `moviendoIzquierda` / `moviendoDerecha` igual; tetris y snake reaccionan a `keydown` discretos). Un botón táctil que dispara `window.dispatchEvent(new KeyboardEvent("keydown", { code }))` en `touchstart` y su `keyup` en `touchend` / `touchcancel` es indistinguible para el motor de una tecla física mantenida — cero cambios en los cuatro `game.js`.

El mapeo elegido es un D-pad de 4 direcciones más dos botones de acción, **A** y **B** (estilo control de Nintendo), porque cada motor arcade de este catálogo ya reduce toda su acción a como mucho dos teclas no direccionales:

| Juego     | D-pad ← →                          | D-pad ↑                  | D-pad ↓                    | Botón A (`Space`)                                    | Botón B (`KeyP`)                                             |
| --------- | ---------------------------------- | ------------------------ | -------------------------- | ---------------------------------------------------- | ------------------------------------------------------------ |
| Asteroids | `ArrowLeft` / `ArrowRight` (girar) | `ArrowUp` (empuje)       | sin uso                    | Disparo / reiniciar en game over                     | **No aplica** (asteroids no tiene pausa, SPEC 05) — se omite |
| Tetris    | `ArrowLeft` / `ArrowRight` (mover) | `ArrowUp` (rotar)        | `ArrowDown` (soft drop)    | Hard drop                                            | Pausa                                                        |
| Arkanoid  | `ArrowLeft` / `ArrowRight` (pala)  | `ArrowUp` (navegar menú) | `ArrowDown` (navegar menú) | Lanzar bola / confirmar menú de inicio y pausa       | Pausa                                                        |
| Snake     | `ArrowLeft` / `ArrowRight` (girar) | `ArrowUp` (girar)        | `ArrowDown` (girar)        | **No aplica** (`Space` es no-op en snake) — se omite | Pausa                                                        |

Confirmado leyendo los cuatro `game.js`: en Arkanoid, `Space` y `Enter` cuentan por igual como "confirmar" tanto en el menú de inicio como en el menú de pausa (`consumirEspacio() || consumirTecla("Enter")`), así que el botón A cubre lanzar la bola y confirmar sin lógica especial.

---

## Scope

**In:**

- `components/touch-controls.tsx` — **nuevo**. Componente cliente compartido y parametrizable:
  - Renderiza un D-pad (4 flechas, cruceta) a la izquierda y hasta dos botones de acción (**A** y **B**) a la derecha, superpuestos sobre / debajo del gabinete CRT sin tapar el canvas de juego.
  - Recibe qué código de tecla despachar por cada botón que el juego use (ver tabla arriba); un botón cuyo juego no lo usa (D-pad ↓ en asteroids, botón A en snake, botón B en asteroids) simplemente no se renderiza.
  - Cada botón, en `touchstart`, despacha `window.dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true }))` inmediatamente y arma un intervalo que repite el `keydown` mientras el dedo sigue sobre el botón (mismo patrón que el autorepeat nativo de teclado: primer repeat tras ~300 ms, luego cada ~50 ms), para que un movimiento mantenido en tetris/snake avance celda a celda igual que con una tecla física sostenida. En `touchend` / `touchcancel` despacha un único `keyup` y limpia el intervalo.
  - `e.preventDefault()` en `touchstart` sobre cada botón, para que no dispare además un `click`/`mousedown` sintético del navegador ni haga scroll la página.
- `components/asteroids-player.tsx`, `components/tetris-player.tsx`, `components/arkanoid-player.tsx`, `components/snake-player.tsx` — **modificados**: cada uno detecta si el dispositivo es táctil (`matchMedia("(pointer: coarse)")`, con fallback `"ontouchstart" in window` si `matchMedia` no está disponible) al montar, y:
  - Si es táctil: oculta el aviso "Requiere teclado" (o el texto equivalente de cada juego) y renderiza `<TouchControls>` con el mapeo de esa tabla.
  - Si no es táctil: comportamiento actual sin cambios, `<TouchControls>` no se monta.
- Ajustes de layout responsive en esos mismos cuatro componentes donde el HUD (`flex-wrap` de las cabeceras de puntuación) o el gabinete CRT (`max-w-5xl`, `aspect-video` / `aspect-[1/2]` / `aspect-[4/3]`) se corten o desborden en un viewport angosto (~360–430 px de ancho), incluyendo el espacio que ahora ocupa `<TouchControls>` debajo del gabinete.
- `AGENTS.md` — si `next dev` lo regenera, se commitea junto con el trabajo.

**Out of scope (para futuras specs):**

- Gestos táctiles (swipe, drag directo sobre el canvas) como mecanismo alternativo o adicional al D-pad + A/B.
- Soporte de gamepad físico por Bluetooth/USB.
- Forzar orientación horizontal (`screen.orientation.lock`) o cualquier aviso de "gira tu teléfono"; cada juego se juega en la orientación que ya tenga.
- Vibración háptica (`navigator.vibrate`) al pulsar los botones táctiles.
- Hacer jugables `pac-man` / `space-invaders` en móvil (siguen siendo maqueta, sin motor real que enganchar).
- Cambiar el mapeo de teclado físico existente o los propios `game.js` (esta spec los deja intactos).
- Rediseño visual del gabinete CRT más allá de lo estrictamente necesario para que quepa en un viewport angosto.
- Tests automatizados (no hay framework configurado).

---

## Data model

Esta feature no toca Supabase ni introduce persistencia. Introduce un tipo de configuración en código para `TouchControls`:

```ts
// components/touch-controls.tsx
type TouchButtonConfig = {
  code: string; // KeyboardEvent.code a despachar, p.ej. "ArrowLeft"
  label: string; // texto / aria-label visible en el botón (p.ej. "A", "◀")
};

type TouchControlsProps = {
  dpad: {
    up?: TouchButtonConfig;
    down?: TouchButtonConfig;
    left?: TouchButtonConfig;
    right?: TouchButtonConfig;
  };
  actionA?: TouchButtonConfig;
  actionB?: TouchButtonConfig;
};
```

Cada `*-player.tsx` instancia `<TouchControls>` con la fila correspondiente de la tabla del apartado anterior, dejando `undefined` el botón que ese juego no usa.

---

## Implementation plan

1. **Esqueleto de `TouchControls`.** Crear `components/touch-controls.tsx` (`"use client"`) con el D-pad (4 botones en cruceta) y hasta dos botones de acción, recibiendo `TouchControlsProps` y renderizando solo los botones definidos. Sin lógica de eventos todavía, solo el marcado y estilos (Tailwind, estética Neon-Brutalist del resto del sitio) para verificar que el layout no tapa el canvas. Probar montándolo temporalmente en `/jugar/tetris` con props de ejemplo.
2. **Despacho de eventos.** Implementar el `touchstart` → `keydown` inmediato + intervalo de repetición (~300 ms delay, ~50 ms de paso) y `touchend`/`touchcancel` → `keyup` único, con `preventDefault` en `touchstart`. Verificar en el emulador de dispositivo táctil de DevTools que mantener presionado el D-pad izquierdo en `/jugar/tetris` mueve la pieza repetidamente y soltar detiene el movimiento.
3. **Detección de dispositivo táctil.** En `components/tetris-player.tsx`: añadir el `useEffect` con `matchMedia("(pointer: coarse)")` (fallback `"ontouchstart" in window`), estado `isTouch`, ocultar el aviso de teclado y montar `<TouchControls>` con el mapeo de Tetris (D-pad ←→ mover, ↑ rotar, ↓ soft drop; A=hard drop; B=pausa) solo cuando `isTouch` es verdadero. Verificar con el emulador de DevTools que aparece el overlay y que en un navegador de escritorio normal no aparece.
4. **Repetir en Snake.** Mismo cableado en `components/snake-player.tsx` con su mapeo (D-pad 4 direcciones giran; sin botón A; B=pausa). Jugar una partida completa solo con el D-pad emulado.
5. **Repetir en Arkanoid.** Mismo cableado en `components/arkanoid-player.tsx` (D-pad ←→ mueve la pala, ↑↓ navegan los menús de inicio/pausa; A=lanzar bola/confirmar; B=pausa). Verificar que el menú de inicio se navega y confirma solo con D-pad + A, y que la pala se mueve con el D-pad.
6. **Repetir en Asteroids.** Mismo cableado en `components/asteroids-player.tsx` (D-pad ←→ gira, ↑ empuje, sin ↓; A=disparo/reinicio; sin botón B). Verificar que se puede jugar una partida completa (girar, empujar, disparar, reiniciar tras game over) solo con el overlay emulado.
7. **Ajustes responsive.** Recorrer los cuatro reproductores en el emulador de DevTools a ~375 px y ~414 px de ancho: si el HUD (`flex-wrap`) o el gabinete (`max-w-5xl`, `aspect-*`) se cortan o el `<TouchControls>` queda tapado o tapa el canvas, ajustar las clases Tailwind mínimas necesarias (padding, tamaños de fuente, `flex-col` en vez de `flex-row` bajo cierto breakpoint, etc.) sin tocar `app/globals.css`.
8. **Cierre.** `npm run lint` y `npm run build` verdes. Recorrer los cuatro `/jugar/*` jugables en el emulador de dispositivo táctil de DevTools (overlay visible, partida completa jugable solo con el overlay) y en un navegador de escritorio normal (overlay ausente, teclado funciona exactamente igual que antes). Si `next dev` regeneró `AGENTS.md`, commitearlo junto con el trabajo.

---

## Acceptance criteria

- [ ] `npm run build` termina sin errores ni fallos de tipos.
- [ ] `npm run lint` pasa sin errores.
- [ ] Existe `components/touch-controls.tsx` con el componente compartido descrito en Data model.
- [ ] En el emulador de dispositivo táctil de DevTools (`pointer: coarse`), `/jugar/tetris`, `/jugar/snake`, `/jugar/arkanoid` y `/jugar/asteroids` muestran el overlay de D-pad + botones de acción y **no** muestran el aviso "Requiere teclado".
- [ ] En un navegador de escritorio normal (puntero fino), los cuatro reproductores **no** muestran `<TouchControls>` y siguen mostrando el aviso de teclado existente, sin cambio de comportamiento respecto a antes de esta spec.
- [ ] En `/jugar/tetris` emulado como táctil: el D-pad mueve y rota la pieza, el botón A hace hard drop y el botón B pausa/reanuda; mantener presionado el D-pad izquierdo/derecho repite el movimiento mientras el dedo sigue sobre el botón.
- [ ] En `/jugar/snake` emulado como táctil: el D-pad gira la serpiente en las 4 direcciones y el botón B pausa/reanuda; no hay botón A visible.
- [ ] En `/jugar/arkanoid` emulado como táctil: el D-pad mueve la pala y navega el menú de inicio/pausa, el botón A lanza la bola y confirma el menú de inicio, y el botón B pausa/reanuda.
- [ ] En `/jugar/asteroids` emulado como táctil: el D-pad gira y empuja la nave, el botón A dispara y reinicia la partida tras game over; no hay botón B visible.
- [ ] Es posible completar una partida entera (hasta game over o pausa/reanudación) en cada uno de los cuatro juegos usando exclusivamente el overlay táctil emulado, sin tocar el teclado.
- [ ] Ningún botón táctil dispara scroll de la página ni un `click` fantasma sobre elementos debajo del overlay.
- [ ] A ~375 px de ancho de viewport, el HUD, el gabinete CRT y el overlay de `<TouchControls>` de los cuatro reproductores son completamente visibles, sin recortes ni superposición entre el overlay y el canvas de juego.
- [ ] Los cuatro `public/games/*/game.js` no cambian de línea (esta spec no los toca).
- [ ] `app/globals.css` no tiene reglas nuevas respecto al estado actual.
- [ ] Todo el texto visible nuevo (etiquetas de los botones, si las hay) está en español con acentos correctos donde aplique.

---

## Decisions

- **Sí:** despachar `KeyboardEvent` sintéticos desde el overlay en vez de añadir una API táctil explícita a cada `game.js`. Los cuatro motores ya distinguen mantener vs. soltar sobre `window`; un evento sintético es indistinguible de uno real para ellos, así que cero riesgo de romper el input por teclado existente y cero cambios en `public/games/*/game.js`.
- **No:** exponer funciones nuevas tipo `window.pressLeftTetris()` en cada motor. Obligaría a tocar y volver a probar los cuatro `game.js` uno por uno para una necesidad que el evento sintético ya resuelve sin tocarlos.
- **Sí:** D-pad de 4 direcciones + como mucho dos botones de acción (**A** / **B**), un único componente `TouchControls` compartido y parametrizado por juego. Los cuatro motores arcade de este catálogo ya reducen toda su acción no direccional a una o dos teclas (`Space`, `KeyP`); un tercer botón sería redundante en los cuatro casos.
- **No:** un componente de overlay por juego. Los cuatro necesitan la misma cruceta y hasta dos botones; la única diferencia es qué `code` despacha cada uno, que ya cubre la prop `TouchControlsProps`.
- **Sí:** detección con `matchMedia("(pointer: coarse)")` (fallback `"ontouchstart" in window"`), evaluada una vez al montar cada `*-player.tsx`. Distingue dispositivo sin teclado físico de ancho de pantalla; un mouse en una ventana angosta no debe ver botones táctiles, y una tablet en modo `pointer: coarse` sí, sin importar su ancho.
- **No:** mostrar el overlay táctil siempre, junto al teclado, en todo dispositivo. Ensuciaría el escritorio con botones que nadie toca con mouse.
- **Sí:** en `touchstart` disparar `keydown` inmediato + repetición cada ~50 ms (tras ~300 ms de espera inicial) mientras el dedo sigue sobre el botón, y un único `keyup` en `touchend`/`touchcancel`. Replica el autorepeat nativo del teclado del que ya dependen tetris (mover pieza sosteniendo la flecha) y arkanoid (mover pala); sin repetición, sostener el D-pad solo movería una celda por toque.
- **No:** botón B en Asteroids ni botón A en Snake. Asteroids no tiene pausa (decisión ya tomada en SPEC 05) y `Space` es un no-op en el `game.js` de Snake; añadir un botón sin efecto sería confuso.
- **Sí:** el botón A de Arkanoid despacha `Space` tanto para lanzar la bola como para confirmar los menús de inicio/pausa. El propio `game.js` ya trata `Space` como "confirmar" en ambos menús (`consumirEspacio() || consumirTecla("Enter")`), así que no hace falta lógica especial por pantalla.
- **No:** gestos (swipe/drag) como mecanismo de control. Cada motor tendría que interpretar un gesto distinto; el D-pad + A/B es un mapeo mecánico y uniforme a las mismas teclas que ya existen, más rápido de implementar y de auditar en los cuatro motores.
- **No:** forzar orientación de pantalla ni pedir "gira tu teléfono". Añade una capa de UX (permisos de `screen.orientation`, aviso, fallback) que no se pidió y cada juego ya es jugable en la orientación que tenga el dispositivo.

---

## Risks

| Riesgo                                                                                                                                                                               | Mitigación                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Un `touchstart` sin `preventDefault` dispara además un `mousedown`/`click` sintético del navegador sobre el botón o lo que haya debajo.                                              | Cada botón de `TouchControls` llama `e.preventDefault()` en `touchstart`.                                                                                                                                     |
| El D-pad o los botones A/B tapan el canvas en un gabinete ya ajustado (`max-w-5xl`, `aspect-video`) en viewports angostos.                                                           | Paso 7 del plan revisa los cuatro reproductores a ~375–414 px y ajusta layout; criterio de aceptación explícito sobre visibilidad sin solapes a esa anchura.                                                  |
| `matchMedia("(pointer: coarse)")` no existe en algún navegador antiguo y lanza o siempre da falso, dejando el overlay oculto en un móvil real.                                       | Fallback a `"ontouchstart" in window"` si `matchMedia` no está disponible o no reporta `coarse`.                                                                                                              |
| Mantener presionado un botón sin límite de repetición sostiene, por ejemplo, el disparo de asteroids indefinidamente si el `touchend` no llega (el dedo se desliza fuera del botón). | Se escucha también `touchcancel` (no solo `touchend`) para cortar el `keyup` cuando el navegador cancela el toque.                                                                                            |
| El intervalo de repetición del D-pad queda huérfano si el componente se desmonta con el dedo aún sobre el botón (navegación fuera de la ruta).                                       | El `useEffect` de `TouchControls` limpia cualquier intervalo activo y despacha el `keyup` pendiente en su función de cleanup.                                                                                 |
| El overlay se muestra en un dispositivo híbrido (laptop con pantalla táctil y teclado) donde el usuario prefiere el teclado.                                                         | Aceptado: `pointer: coarse` es la señal estándar y sigue siendo un desktop con teclado; ese usuario puede simplemente ignorar el overlay y seguir usando el teclado, que sigue funcionando exactamente igual. |

---

## Lo que **no** entra en esta spec

- Gestos táctiles (swipe/drag) como alternativa o complemento al D-pad + A/B.
- Soporte de gamepad físico.
- Forzar orientación de pantalla.
- Vibración háptica.
- Hacer jugables `pac-man` / `space-invaders`.
- Cambios al mapeo de teclado físico o a los `game.js` existentes.
- Rediseño visual del gabinete CRT más allá de lo necesario para que quepa en móvil.
- Tests automatizados.

Cada uno de esos, si llega, va en su propia spec.
