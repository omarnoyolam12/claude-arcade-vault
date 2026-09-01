# SPEC 02 — Animación de destrucción de bloques

> **Estado:** Implementado
> **Depende de:** SPEC 01
> **Fecha:** 2026-08-28
> **Objetivo:** Al romper un bloque, reproducir sobre su celda la animación de explosión de 4 frames del spritesheet sin alterar ninguna regla del juego.

---

## Por qué existe esta spec

El MVP (SPEC 01) dejó fuera la animación de explosión a propósito: es puramente estética y añade una máquina de animación por bloque. Ahora se incorpora como una capa de efectos visual, aislada en su propio módulo, para que no toque la física, la puntuación ni la máquina de estados.

---

## Alcance

**In:**

- Nuevo módulo `js/effects.js` con un array de explosiones activas, independiente de `bloques`.
- Al romper un bloque en `js/collisions.js`, se registra una explosión en la posición y tamaño exactos de ese bloque, con su color.
- La explosión recorre los 4 frames de `EXPLOSION_FRAMES[color]` a **150 ms por frame** (600 ms en total) y luego se elimina del array.
- Se dibuja con `drawFrame` en el mismo rectángulo que ocupaba el bloque (64x24), encima de la rejilla y debajo del HUD, durante la pantalla `JUGANDO`.
- Colores soportados: los siete del juego (`red`, `cyan`, `yellow`, `magenta`, `hotpink`, `green`, `gray`). `gray` usa los frames que ya define `EXPLOSION_FRAMES`.
- Varias explosiones simultáneas conviven en el array sin límite.
- El array de explosiones se vacía de inmediato al: cambiar de nivel, reiniciar la partida y perder una vida (bola caída por abajo).
- El avance de tiempo de las explosiones usa el `dt` del bucle (mismo `dt` limitado a 1/30 s que ya calcula `main.js`).

**Fuera de alcance (para specs futuras):**

- Sonido nuevo o distinto: se mantiene `break-sound.mp3` tal cual lo dispara hoy `colisionBloques()`.
- Partículas, sacudida de pantalla (screen shake), destellos o cualquier efecto que no sean los 4 frames del spritesheet.
- Animación de aparición de bloques, de rebote del paddle o de la bola.
- Que la animación retrase el cambio de nivel, el fin de partida o el conteo de puntos.
- Explosión que desborde la celda del bloque o tamaño configurable.
- Power-ups y cápsulas que caen.
- Estado de pausa (no existe todavía; si llega, decidirá entonces si congela las explosiones).

---

## Modelo de datos

Esta funcionalidad introduce una estructura nueva: la explosión activa. No modifica el `state` global ni el objeto `bloque` de SPEC 01.

```js
// js/effects.js — capa de efectos visuales

// Duración de cada frame en milisegundos. 4 frames * 150 = 600 ms totales.
const MS_POR_FRAME = 150;
const FRAMES_EXPLOSION = 4;

// Una explosión activa. transcurrido se acumula en milisegundos.
const explosion = {
  x: 0,          // misma x que tenía el bloque
  y: 0,          // misma y que tenía el bloque
  ancho: 64,     // BLOQUE_ANCHO
  alto: 24,      // BLOQUE_ALTO
  color: 'red',  // clave para EXPLOSION_FRAMES
  transcurrido: 0,
};

// Array de explosiones vivas. Módulo-privado; se manipula solo con la API.
const explosiones = [];
```

API pública del módulo:

- `emitirExplosion(x, y, ancho, alto, color)` — añade una explosión con `transcurrido = 0`.
- `actualizarEfectos(dt)` — suma `dt * 1000` a cada `transcurrido` y elimina las que llegan a `MS_POR_FRAME * FRAMES_EXPLOSION`.
- `dibujarEfectos(ctx)` — por cada explosión, `frameIndice = Math.min(FRAMES_EXPLOSION - 1, Math.floor(transcurrido / MS_POR_FRAME))` y `drawFrame(ctx, EXPLOSION_FRAMES[color][frameIndice], x, y, ancho, alto)`.
- `limpiarExplosiones()` — vacía el array (`explosiones.length = 0`).

Notas:

- `EXPLOSION_FRAMES` y `drawFrame` son globales cargados por `assets/spritesheet.js` (script clásico). `drawFrame` es una función y también está en `window`; `EXPLOSION_FRAMES` es un `const`, así que **no** vive en `window` y se referencia por su nombre directo desde el módulo.
- `drawFrame` ya hace `if (!ssLoaded) return;`, así que no hace falta comprobar la carga del spritesheet en `effects.js`.

---

## Plan de implementación

Cada paso deja el juego ejecutable (`python3 -m http.server` y abrir `index.html`).

1. Crear `js/effects.js` con `MS_POR_FRAME`, `FRAMES_EXPLOSION`, el array `explosiones` y las cuatro funciones exportadas (`emitirExplosion`, `actualizarEfectos`, `dibujarEfectos`, `limpiarExplosiones`) implementadas por completo pero sin que nadie las llame. Verificar: la página sigue cargando sin errores en consola.
2. En `js/main.js`, importar `actualizarEfectos` y `dibujarEfectos`. Llamar `actualizarEfectos(dt)` dentro de `actualizar(dt)` en la rama `JUGANDO` (tras mover la bola y resolver colisiones) y `dibujarEfectos(ctx)` en `dibujar()` en el `case PANTALLAS.JUGANDO`, entre `dibujarBloques(ctx)` y `dibujarPaddle(ctx)`. Verificar: el juego se comporta igual que antes (aún no se emite ninguna explosión).
3. En `js/collisions.js`, importar `emitirExplosion` desde `./effects.js`. En `colisionBloques()`, justo después de `b.vivo = false`, llamar `emitirExplosion(b.x, b.y, b.ancho, b.alto, b.color)`. Verificar: romper un bloque muestra la animación de 4 frames sobre su celda durante 600 ms y luego desaparece; la puntuación y el sonido siguen igual.
4. En `js/main.js`, importar `limpiarExplosiones`. Llamarla al principio de `empezarNivel()` (cubre inicio de nivel, avance de nivel y reinicio de partida, ya que `empezarNivel()` se invoca en los tres casos). Verificar: limpiar el nivel 1 carga el nivel 2 sin arrastrar explosiones a medias.
5. En `js/collisions.js`, dentro de `comprobarCaida()`, cuando la bola se pierde por abajo (antes del `return true`), llamar `limpiarExplosiones()`. Verificar: si la bola cae justo después de romper un bloque, las explosiones en curso desaparecen al perder la vida.

---

## Criterios de aceptación

- [ ] `index.html` servido por HTTP sigue cargando sin errores ni warnings en consola.
- [ ] Romper un bloque dibuja sobre su celda la secuencia de 4 frames de `EXPLOSION_FRAMES[color]` correspondiente a su color.
- [ ] Cada frame se muestra 150 ms y la animación completa dura 600 ms; después no queda nada dibujado en esa celda.
- [ ] La explosión se dibuja en el mismo rectángulo (x, y, 64x24) que ocupaba el bloque, sin solaparse con los bloques vecinos.
- [ ] La explosión se dibuja por encima de la rejilla de bloques y por debajo del HUD.
- [ ] Romper varios bloques en menos de 600 ms muestra varias explosiones a la vez, cada una con su propio color y progreso.
- [ ] Un bloque `gray` produce animación de explosión (no queda sin efecto).
- [ ] La puntuación sumada al romper un bloque es idéntica a la de SPEC 01 y `break-sound.mp3` suena una sola vez por bloque.
- [ ] La animación no retrasa el avance de nivel: limpiar el último bloque de un nivel carga el siguiente en el mismo frame que antes.
- [ ] Limpiar el nivel 3 pasa a la pantalla `FIN` sin esperar a que termine ninguna explosión.
- [ ] Al avanzar de nivel o reiniciar la partida no aparece ninguna explosión heredada del nivel anterior.
- [ ] Si la bola cae por abajo con explosiones en curso, esas explosiones desaparecen al restar la vida.
- [ ] El módulo `js/effects.js` no importa nada de `entities.js`, `collisions.js`, `state.js` ni `main.js` (la capa de efectos no depende de la lógica del juego).

---

## Decisiones

- **Sí:** módulo nuevo `js/effects.js` con array propio de explosiones. Mantiene la animación desacoplada de `bloques` y de la máquina de estados; ninguna regla del juego cambia.
- **No:** guardar el estado de animación dentro del objeto `bloque`. Obligaría a mantener bloques "muertos pero animándose" en el array y a filtrarlos en `quedanBloques()`, mezclando lo visual con la lógica de fin de nivel.
- **Sí:** 150 ms por frame (600 ms totales), tomando `EXPLOSION_DURATION` como duración por frame. Explosión lenta y bien visible; el valor vive en una sola constante `MS_POR_FRAME`.
- **No:** 150 ms para toda la animación (37,5 ms/frame). Sería un parpadeo casi imperceptible a 60 fps.
- **Sí:** dibujar la explosión en el rectángulo exacto del bloque (64x24). El asset se escala desde 32x16 igual que hace `drawSprite` con los bloques; queda contenida y predecible.
- **No:** explosión mayor y centrada que desborde la celda. Más vistosa pero se solapa con bloques vecinos y complica el encuadre; se puede revisar en otra spec.
- **Sí:** vaciar todas las explosiones al cambiar de nivel, reiniciar y perder una vida. Evita ver restos de animación sobre un nivel nuevo o tras un evento de partida; el corte dura como mucho 600 ms y casi nunca coincide.
- **No:** dejar que las explosiones en curso terminen de animarse tras un cambio de nivel. Se verían frames sueltos sobre la rejilla nueva sin relación con nada.
- **Sí:** reutilizar `break-sound.mp3` tal cual. El feedback sonoro de rotura ya existe en `colisionBloques()`; esta spec es solo visual.
- **Sí:** avanzar el tiempo de las explosiones con el `dt` del bucle. Coherente con la física de la bola y del paddle, que ya usan `dt` limitado a 1/30 s.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El spritesheet aún no está cargado cuando se emite una explosión | `drawFrame` ya hace `if (!ssLoaded) return;`; además el bucle solo arranca dentro del callback de `loadSpritesheet`, así que en la práctica siempre está listo. |
| Acumulación de explosiones si se rompen muchos bloques muy rápido (multibola futura) | Cada explosión se elimina sola a los 600 ms y el coste por frame es un `drawImage`; si en una spec futura hay decenas simultáneas, se podrá poner un tope al array entonces. |
| `EXPLOSION_FRAMES` no cubre algún color usado en los niveles | Define los siete colores del juego; `gray` reutiliza los frames de `red`. Si un nivel futuro usa un color nuevo, habrá que añadir sus frames al asset. |

---

## Lo que **no** entra en esta spec

- Sonido nuevo o distinto al romper bloques.
- Partículas, screen shake, destellos u otros efectos fuera de los 4 frames del spritesheet.
- Explosión que desborde la celda o de tamaño configurable.
- Que la animación bloquee o retrase el avance de nivel o el fin de partida.
- Animaciones de aparición de bloques, del paddle o de la bola.
- Estado de pausa y su efecto sobre las explosiones.

Cada uno, si llega, va en su propia spec.
