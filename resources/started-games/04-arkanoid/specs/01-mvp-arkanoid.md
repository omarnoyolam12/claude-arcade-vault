# SPEC 01 — MVP jugable de Arkanoid

> **Estado:** Implementado
> **Depende de:** —
> **Fecha:** 2026-08-28
> **Objetivo:** Entregar un Arkanoid jugable de principio a fin con tres niveles, paddle por ratón y teclado, pelota con rebote angular, bloques con puntuación por color, tres vidas, highscore persistente y pantallas de inicio, juego y fin.

---

## Por qué existe esta spec

Es la primera funcionalidad grande del proyecto y no hay nada de código todavía. La spec fija de una vez la arquitectura de módulos ES, la máquina de estados y el modelo de datos para que los siguientes specs (power-ups, más niveles, efectos) construyan encima sin reescribir el núcleo.

---

## Alcance

**In:**

- Un `index.html` con un `<canvas>` de resolución lógica fija 800x600, centrado en la página, más `styles.css`.
- Código repartido en módulos ES (`<script type="module">`), servido por HTTP (no `file://`).
- Bucle de juego con `requestAnimationFrame` y paso de tiempo (delta) para física estable.
- Máquina de estados con tres pantallas: `INICIO`, `JUGANDO`, `FIN`.
- Pantalla `INICIO`: texto "Pulsa Espacio para jugar" sobre el canvas.
- Pantalla `FIN`: mensaje de victoria o derrota, puntuación final, highscore, y "Pulsa Espacio para reiniciar".
- Paddle controlado a la vez por ratón (sigue el cursor cuando está sobre el canvas) y teclado (flechas izquierda/derecha y `A`/`D`, velocidad fija).
- Pelota que empieza pegada al paddle y se lanza con `Espacio`.
- Rebote de la pelota contra paredes superior y laterales, contra el paddle y contra los bloques.
- Ángulo de salida de la pelota en el paddle según el punto de impacto (más al borde, más abierto).
- Velocidad base de la pelota constante dentro de un nivel y con un incremento fijo al pasar al siguiente nivel.
- Tres niveles definidos como un array de matrices en `js/levels.js`. Al limpiar el nivel 3 se pasa a `FIN` con victoria.
- Bloques dibujados con `drawSprite` usando los siete colores del spritesheet.
- Puntuación por color de bloque (tabla fija). El marcador se muestra en el HUD.
- Tres vidas. Al caer la pelota por abajo: −1 vida y la pelota vuelve pegada al paddle esperando `Espacio`. Los bloques ya rotos siguen rotos. A 0 vidas: `FIN` con derrota.
- HUD superpuesto con vidas, puntuación, highscore y número de nivel.
- Sonido: `assets/sounds/ball-bounce.mp3` en cada rebote y `assets/sounds/break-sound.mp3` al romper un bloque.
- Highscore único global (mejor puntuación total de una partida) persistido en `localStorage` con clave versionada.

**Fuera de alcance (para specs futuras):**

- Power-ups / cápsulas que caen (paddle largo, multibola, láser, etc.).
- Animación de explosión al romper bloques (`drawFrame` / `EXPLOSION_FRAMES`).
- Bloques con varios impactos, bloques indestructibles o con color cambiante.
- Estado de pausa.
- Más de tres niveles, editor de niveles o niveles generados.
- Música de fondo y control de volumen.
- Diseño responsive / escalado del canvas, soporte táctil y móvil.
- Tabla de varios highscores, nombre del jugador y fecha.
- Menú de opciones, dificultad seleccionable.

---

## Modelo de datos

Convenciones:

- Coordenadas con origen arriba-izquierda del canvas.
- Posiciones en píxeles; velocidades en píxeles por segundo (se multiplican por `dt` en segundos).
- El canvas lógico mide `800 x 600`.

```js
// js/state.js — estado global de la partida
const PANTALLAS = { INICIO: 'INICIO', JUGANDO: 'JUGANDO', FIN: 'FIN' };

const state = {
  pantalla: 'INICIO',
  nivelIndice: 0,        // 0..2
  puntuacion: 0,
  vidas: 3,
  highscore: 0,          // cargado de localStorage al arrancar
  resultado: null,       // 'VICTORIA' | 'DERROTA' cuando pantalla === 'FIN'
  bolaLanzada: false,
};
```

```js
// js/entities.js — entidades del juego
const paddle = { x: 360, y: 560, ancho: 80, alto: 16, velocidad: 480 };

const bola = {
  x: 400, y: 544, radio: 8,
  vx: 0, vy: 0,           // dirección * rapidez actual
  rapidez: 260,           // módulo de la velocidad en el nivel actual
};

// Un bloque vivo de la rejilla
const bloque = {
  x: 0, y: 0, ancho: 64, alto: 24,
  color: 'red',          // clave para drawSprite: 'block_red', etc.
  vivo: true,
  puntos: 70,
};
```

```js
// js/levels.js — tres layouts. Cada celda es una letra de color o '.' (vacío).
// Colores válidos: R=red, C=cyan, Y=yellow, M=magenta, H=hotpink, G=green, X=gray
const NIVELES = [
  [
    'RRRRRRRRRRRR',
    'YYYYYYYYYYYY',
    'GGGGGGGGGGGG',
    'CCCCCCCCCCCC',
  ],
  // nivel 2 y nivel 3: otras disposiciones (más filas, huecos)
];

// Rejilla: 12 columnas. Bloque 64x24, separación 0. Margen superior 60 px,
// margen lateral 16 px. (16 + 12*64 + 16 = 800.)
```

```js
// js/storage.js — persistencia del highscore
const CLAVE_HIGHSCORE = 'arkanoid:highscore:v1';
// getHighscore(): number   — Number(localStorage.getItem(CLAVE)) || 0
// setHighscore(n): void     — solo escribe si n > highscore actual; try/catch
```

```js
// Puntuación por color (js/levels.js o js/entities.js)
const PUNTOS_POR_COLOR = {
  red: 90, hotpink: 80, magenta: 70, yellow: 60, cyan: 50, green: 40, gray: 30,
};
```

```js
// Física de la pelota en el paddle (js/collisions.js)
// offset = (bola.x - centroPaddle) / (paddle.ancho / 2)  → rango [-1, 1]
// anguloMax = 60 grados desde la vertical
// nuevoAngulo = offset * anguloMax
// vx = rapidez * sin(nuevoAngulo);  vy = -rapidez * cos(nuevoAngulo)
```

```js
// Incremento de rapidez por nivel (js/state.js)
const RAPIDEZ_BASE = 260;         // nivel 1
const INCREMENTO_RAPIDEZ = 40;    // +40 px/s por cada nivel superado
// rapidez del nivel n (1-indexado) = RAPIDEZ_BASE + (n - 1) * INCREMENTO_RAPIDEZ
```

---

## Plan de implementación

Cada paso deja el juego ejecutable (`python3 -m http.server` y abrir `index.html`).

1. Crear `index.html` con el `<canvas id="juego" width="800" height="600">`, `styles.css` (fondo oscuro, canvas centrado) y `js/main.js` vacío cargado como módulo. Verificar: la página carga sin errores y se ve el canvas negro.
2. En `js/main.js`, montar el bucle `requestAnimationFrame` con cálculo de `dt` y funciones `actualizar(dt)` y `dibujar()` vacías. Pintar un rectángulo de fondo cada frame. Verificar: bucle corriendo sin errores.
3. Crear `js/state.js` con `PANTALLAS`, `state` y `NIVELES` mínimos. Crear `js/hud.js` que dibuje texto de la pantalla `INICIO`. Cablear en `main.js` el dibujo según `state.pantalla`. Verificar: se lee "Pulsa Espacio para jugar".
4. Crear `js/input.js`: escuchar `keydown`/`keyup` (flechas, `A`/`D`, `Espacio`) y `mousemove` sobre el canvas; exponer el estado de entrada. En `INICIO`, `Espacio` cambia `state.pantalla` a `JUGANDO`. Verificar: la transición ocurre.
5. Crear `js/entities.js` con `paddle` y `bola`. Cargar el spritesheet con `loadSpritesheet` antes de arrancar el bucle. Dibujar el paddle con `drawSprite`. Mover el paddle con ratón (cursor sobre el canvas) y teclado, con clamp a los bordes. Verificar: el paddle se mueve con ambos y no se sale.
6. Añadir la bola pegada al centro del paddle mientras `state.bolaLanzada` es `false`. Al pulsar `Espacio` en `JUGANDO`, lanzar hacia arriba con `rapidez` del nivel 1. Verificar: la bola sale al pulsar Espacio.
7. Crear `js/collisions.js`: rebote de la bola contra paredes superior y laterales (con sonido `ball-bounce`). Si la bola cae por debajo de `y = 600`: `state.vidas--`, re-pegar la bola al paddle, `state.bolaLanzada = false`. Verificar: rebota en tres paredes y pierde vida por abajo.
8. Rebote contra el paddle con ángulo según `offset` (fórmula del modelo de datos) y sonido. Verificar: golpear con el borde del paddle abre el ángulo.
9. Construir la rejilla de bloques del nivel actual a partir de `NIVELES[state.nivelIndice]` (posición, color, `puntos` por `PUNTOS_POR_COLOR`). Dibujar los bloques vivos con `drawSprite`. Verificar: se ve la rejilla del nivel 1.
10. Colisión bola-bloque: marcar `vivo = false`, invertir la componente de velocidad correspondiente, sumar `puntos` a `state.puntuacion`, sonar `break-sound`. Verificar: romper un bloque suma sus puntos y la bola rebota.
11. Crear `js/hud.js` completo: vidas, puntuación, highscore y nivel durante `JUGANDO`. Verificar: el HUD refleja los valores en vivo.
12. Fin de nivel: si no quedan bloques vivos y `state.nivelIndice < 2`, avanzar nivel, recalcular `rapidez` (`RAPIDEZ_BASE + nivel*INCREMENTO`), reconstruir rejilla y re-pegar la bola. Si era el nivel 3: `state.pantalla = 'FIN'`, `state.resultado = 'VICTORIA'`. Verificar: limpiar el nivel 1 carga el 2 con la bola más rápida.
13. Derrota: cuando `state.vidas === 0`, `state.pantalla = 'FIN'`, `state.resultado = 'DERROTA'`. Dibujar la pantalla `FIN` con mensaje según `resultado`, puntuación y "Pulsa Espacio para reiniciar". Verificar: a 0 vidas aparece la pantalla de derrota.
14. Crear `js/storage.js`. Al entrar en `FIN`, `setHighscore(state.puntuacion)`. Cargar `highscore` al arrancar y mostrarlo en HUD y en `FIN`. Verificar: superar el récord y recargar la página conserva el highscore.
15. Reinicio: en `FIN`, `Espacio` resetea `state` (nivel 0, puntuación 0, vidas 3, rejilla nivel 1) y vuelve a `JUGANDO`. Verificar: se puede jugar otra partida completa sin recargar.
16. Definir los layouts reales de los niveles 2 y 3 en `NIVELES` (más filas y algún hueco). Verificar: los tres niveles se ven distintos y son superables.

---

## Criterios de aceptación

- [ ] `index.html` servido por HTTP carga sin errores ni warnings en la consola.
- [ ] Al abrir se ve la pantalla `INICIO` con el texto de arranque.
- [ ] `Espacio` en `INICIO` pasa a `JUGANDO` y muestra paddle, bola y rejilla del nivel 1.
- [ ] El paddle sigue el cursor cuando está sobre el canvas.
- [ ] El paddle se mueve con flechas y con `A`/`D`, y nunca se sale del canvas.
- [ ] La bola arranca pegada al paddle y solo se mueve tras pulsar `Espacio`.
- [ ] La bola rebota en las paredes superior e izquierda y derecha, y no en la inferior.
- [ ] Golpear la bola con el borde del paddle produce un ángulo más abierto que golpearla en el centro.
- [ ] Romper un bloque lo hace desaparecer, suma exactamente los puntos de su color según `PUNTOS_POR_COLOR` y reproduce `break-sound.mp3`.
- [ ] Cada rebote contra pared o paddle reproduce `ball-bounce.mp3`.
- [ ] El HUD muestra vidas, puntuación, highscore y nivel, y se actualiza en vivo.
- [ ] Perder la bola por abajo resta una vida y devuelve la bola al paddle sin restaurar los bloques rotos.
- [ ] Limpiar todos los bloques de un nivel (1 o 2) carga el siguiente con la bola más rápida.
- [ ] Limpiar el nivel 3 muestra la pantalla `FIN` con mensaje de victoria y la puntuación final.
- [ ] Llegar a 0 vidas muestra la pantalla `FIN` con mensaje de derrota y la puntuación final.
- [ ] Si la puntuación final supera el highscore guardado, `localStorage['arkanoid:highscore:v1']` se actualiza.
- [ ] Recargar la página tras batir el récord muestra el nuevo highscore en `INICIO` y en el HUD.
- [ ] `Espacio` en `FIN` reinicia una partida completa desde el nivel 1 sin recargar la página.
- [ ] Los tres niveles tienen disposiciones de bloques distintas.

---

## Decisiones

- **Sí:** módulos ES servidos por HTTP. Mantiene el código separado por responsabilidad sin bundler; el coste es no poder abrir con `file://`.
- **No:** un único `main.js`. Funcionaría en `file://` pero mezcla loop, estado, física y audio en un archivo que crecerá con las specs futuras.
- **Sí:** ratón y teclado a la vez para el paddle. El ratón da precisión, el teclado permite jugar sin ratón; el ratón solo actúa con el cursor sobre el canvas para no secuestrar el puntero.
- **Sí:** `Espacio` como tecla única de lanzar y de avanzar en `INICIO`/`FIN`. Una sola tecla para todo el flujo.
- **Sí:** puntuación por color con tabla fija `PUNTOS_POR_COLOR`. Da variedad de puntuación sin lógica de filas; los valores son ajustables en un solo sitio.
- **Sí:** highscore único en `localStorage` con clave `arkanoid:highscore:v1`. El sufijo `:v1` permite cambiar el formato más adelante sin romper datos viejos.
- **No:** tabla de varios highscores con nombre y fecha. Overengineering para el MVP; va en otra spec.
- **Sí:** tres vidas con relanzamiento desde el paddle (los bloques rotos permanecen). Es el comportamiento clásico y evita frustración de reiniciar el nivel.
- **No:** reiniciar el nivel al perder vida. Castiga demasiado y alarga las partidas.
- **Sí:** velocidad de bola constante dentro del nivel y +40 px/s por nivel. Progresión de dificultad simple y predecible.
- **No:** aceleración continua de la bola con el tiempo o con cada golpe. Difícil de equilibrar en un MVP.
- **Sí:** sonido de rebote y de rotura desde el primer entregable. Son dos assets ya disponibles y el feedback sonoro es barato.
- **No:** animación de explosión con `EXPLOSION_FRAMES`. Es puramente estético y añade una máquina de animación por bloque; va en otra spec.
- **No:** canvas responsive. Resolución fija 800x600 simplifica física y layout de rejilla (16 + 12·64 + 16 = 800).

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `localStorage` deshabilitado (modo privado) lanza excepción | `getHighscore`/`setHighscore` envueltos en `try/catch`; si falla, el highscore vive solo en memoria y el juego sigue. |
| Autoplay de audio bloqueado hasta la primera interacción del usuario | El primer sonido se dispara tras pulsar `Espacio` (gesto de usuario), así que la reproducción queda desbloqueada antes de necesitarla. |
| Túnel de la bola a alta velocidad (atraviesa un bloque o el paddle sin colisionar) | La rapidez máxima del nivel 3 (340 px/s) por frame a 60 fps es ~5,7 px, muy por debajo del alto de bloque (24) y del paddle (16); si aún así ocurre, limitar el `dt` por frame a 1/30 s. |
| Abrir `index.html` con `file://` rompe los módulos ES | El `README` y esta spec indican servir con `python3 -m http.server`; añadir una nota visible en el `index.html`. |

---

## Lo que **no** entra en esta spec

- Power-ups y cápsulas que caen.
- Animación de explosión de bloques.
- Estado de pausa.
- Más de tres niveles, editor o generación de niveles.
- Diseño responsive, soporte táctil y versión móvil.
- Tabla de varios highscores con nombre y fecha.
- Música de fondo y ajustes de volumen.

Cada uno, si llega, va en su propia spec.
