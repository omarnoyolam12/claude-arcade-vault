# Registro de sugerencias — game-planner

Memoria persistente del agente `game-planner`. **Se lee entero antes de cada análisis y se
anexa al final de cada uno.** No repetir un juego ya listado sin justificarlo.

## Índice

| Fecha      | Juego                     | Veredicto               | Estado    |
| ---------- | ------------------------- | ----------------------- | --------- |
| 2026-09-03 | Pac-Man                   | Recomendado             | Propuesto |
| 2026-09-03 | Q*bert                    | Alternativa considerada | Propuesto |
| 2026-09-03 | Dig Dug                   | Alternativa considerada | Propuesto |
| 2026-09-03 | Space Invaders            | Recomendado             | Propuesto |
| 2026-09-03 | Galaga                    | Alternativa considerada | Propuesto |
| 2026-09-03 | Centipede                 | Alternativa considerada | Propuesto |
| 2026-09-03 | Missile Command           | Descartado              | Rechazado |
| 2026-09-03 | ALETEO (flappy-style)     | Recomendado             | Propuesto |
| 2026-09-03 | SEÑAL (Simon / secuencia) | Alternativa considerada | Propuesto |
| 2026-09-03 | SINCRO (juego de ritmo)   | Alternativa considerada | Propuesto |
| 2026-09-03 | Columns                   | Recomendado             | Propuesto |
| 2026-09-03 | 2048                      | Alternativa considerada | Propuesto |
| 2026-09-03 | Lights Out                | Alternativa considerada | Propuesto |
| 2026-09-03 | Dr. Mario                 | Descartado              | Rechazado |
| 2026-09-03 | Minesweeper               | Descartado              | Rechazado |

## Formato de entrada

## AAAA-MM-DD — <Juego>

- **Veredicto:** Recomendado | Alternativa considerada | Descartado
- **Encaje:** <género + por qué pega con catálogo / estética CRT / HUD+leaderboard>
- **Origen del motor:** starter (`resources/started-games/NN-...`) | assets disponibles | desde cero
- **Complejidad:** Baja | Media | Alta — <motivo>
- **Estado:** Propuesto | Spec redactada (`specs/NN-...`) | Implementado | Rechazado por el usuario
- **Notas:** <opcional>

---

## Entradas

<!-- el agente anexa aquí, más reciente al final -->

---

## 2026-09-03 — Enfoque temático: reflejos / ritmo / timing / minijuegos de una mecánica

Tanda de 3 candidatos dentro del score chase puro (una mecánica, sin niveles ni jefes).
Ninguno figuraba antes en el registro (las tandas previas fueron laberinto y shooter).
Todos son **desde cero** en canvas vanilla, patrón "snake" (SPEC 09): no hay starter en
`resources/started-games/` para ninguno y ninguno existe en `public.games`, así que cada
spec necesita una migración `0004_*` que añada su fila al catálogo, además de la Server
Action de guardado (la política `anon_insert_scores` de SPEC 07 ya cubre el INSERT sin
cambios de esquema).

### 2026-09-03 — ALETEO (flappy-style vertical)

- **Veredicto:** Recomendado
- **Encaje:** Arcade de un botón / reflejos. Género que falta: hoy no hay ningún endless
  "one-button" en el catálogo (arkanoid y snake son reflejos pero con movimiento continuo
  dirigible; asteroids tiene inercia). Estética CRT inmejorable: columnas de neón cian/
  magenta sobre vacío negro, pájaro vectorial simple, parallax de scanlines. Score entero
  acumulable (+1 por columna superada) y game over inequívoco al chocar → encaja con HUD y
  `public.scores` sin tocar esquema.
- **Mapa al patrón de portado:**
  - Contrato: `window.startAleteo(canvasEl)` / `stop()` / `restartAleteo()` /
    `toggleAleteoPause()`. Backing store 800×600 escalado 4:3, sin assets binarios.
  - Entrada: solo teclado. `Space` / `ArrowUp` = impulso; `KeyP` = pausa. Listener sobre
    `window` con `preventDefault` de `Space`/flechas; se retira en `stop()`.
  - HUD por `postMessage({ source:"aleteo", type:"state", score, best, phase })` con
    `phase ∈ "playing"|"paused"|"gameover"` y, al morir,
    `{ source:"aleteo", type:"gameover", score }`. Chequeo sucio: solo emite si cambió algo.
  - Tercer bloque del HUD (el de "Vidas / Nivel" en la maqueta) → "MEJOR" (récord de la
    sesión) y "RÉCORD"; sin corazones, no hay vidas ni niveles. Puntuación a 7 dígitos con
    ceros a la izquierda en la capa React.
  - Guardado: `guardarPuntuacionAleteo({ score })` en `app/jugar/[slug]/actions.ts`, gemela
    de `guardarPuntuacionSnake`, inserta `{ game_slug:"aleteo", player:"G4M3R_X", score,
achieved_at:null }` con el cliente `@/lib/supabase/anon`. Revalida `/salon-de-la-fama` y
    `/juegos/aleteo`.
  - Leaderboard: `score DESC`, desempate `achieved_at ASC nulls last` — ya lo calcula
    `lib/leaderboards.ts`, sin cambios. Migración `0004_add_aleteo_game.sql` con la fila de
    catálogo (`category_label: "ARCADE"`, `tags: ['REFLEJOS','UN BOTÓN']`).
- **Origen del motor:** desde cero (canvas vanilla, sin dependencias ni bundler).
- **Complejidad:** Baja — física de un eje (gravedad + impulso), columnas como pares de
  rectángulos con hueco, colisión AABB, generador de huecos. Cabe holgado en una spec del
  tamaño de SPEC 09.
- **Riesgos:**
  1. Sensación de juego: gravedad, impulso y separación de columnas mal calibrados lo
     vuelven frustrante o trivial; hay que dejar constantes ajustables en implementación.
  2. Hitbox justa: la caja de colisión del pájaro debe ser más pequeña que el sprite para
     que no se sienta tramposo.
  3. Escalado del canvas a anchos grandes: fijar backing 800×600 + `image-rendering:
pixelated` y hueco a múltiplos de píxel.
- **Alternativa descartada (dentro de este candidato):** endless runner con salto a ras de
  suelo tipo dino de Chrome. Misma familia (un botón, scroll lateral, colisión), pero el
  salto parabólico da menos control fino que el impulso vertical continuo del flappy y una
  curva de tensión más plana; además el flappy lee mejor en vectorial CRT (columnas de neón
  vs. cactus pixelados). Se prefiere ALETEO.
- **Estado:** Propuesto

### 2026-09-03 — SEÑAL (Simon / memoria de secuencia)

- **Veredicto:** Alternativa considerada
- **Encaje:** Memoria / secuencia — género totalmente ausente del catálogo (todo lo actual
  es acción en tiempo real). Encaje estético directo: 4 paneles que mapean 1:1 a la paleta
  del design system (cian primario, magenta secundario, amarillo ácido terciario, verde) y
  parpadean con glow; el resto de la pantalla es vacío negro. Score = ronda alcanzada
  (longitud de la secuencia reproducida); game over al primer fallo → HUD + `public.scores`
  sin cambios de esquema.
- **Mapa al patrón de portado:**
  - Contrato: `window.startSenal(canvasEl)` / `stop()` / `restartSenal()` /
    `toggleSenalPause()`. Sin assets binarios; tonos opcionales con `AudioContext` +
    `OscillatorNode` (generados, sin ficheros de audio).
  - Entrada: solo teclado. Flechas ↑↓←→ (o `Q/W/A/S`) mapeadas a los 4 paneles; cada panel
    lleva su letra pintada para no depender solo del color. Input bloqueado mientras el
    juego reproduce la secuencia.
  - HUD por `postMessage({ source:"senal", type:"state", score, round, phase })` con
    `phase ∈ "watch"|"input"|"paused"|"gameover"`; al fallar,
    `{ source:"senal", type:"gameover", score }`. `score` y `round` coinciden (la ronda
    superada es la puntuación).
  - Tercer bloque del HUD → "RONDA" y "RITMO" (nivel de velocidad de reproducción, que sube
    cada N rondas). Sin vidas.
  - Guardado: `guardarPuntuacionSenal({ score })`, gemela de la de snake, `game_slug:
"senal"`. Migración `0004_add_senal_game.sql` (`category_label: "MEMORIA"`, `tags:
['MEMORIA','SECUENCIA']`).
- **Origen del motor:** desde cero.
- **Complejidad:** Baja-Media — la lógica de secuencia es trivial; el trabajo está en la
  máquina de estados de reproducción (cadenas de temporizadores) y su limpieza en `stop()`
  para no dejar timers huérfanos al desmontar el reproductor, más el bloqueo de input
  durante `watch`.
- **Riesgos:**
  1. Timers huérfanos: `setTimeout` encadenados de la reproducción deben cancelarse todos
     en `stop()` / pausa (guardar los ids); si no, al navegar fuera y volver siguen
     disparando `postMessage`.
  2. Accesibilidad de color: mitigado pintando la letra de la tecla en cada panel.
  3. Partidas potencialmente largas y "resolubles" por jugadores con buena memoria: el
     `RITMO` creciente (acelerar la reproducción y acortar la ventana) acota la duración.
- **Alternativa descartada (dentro de este candidato):** secuencia de acciones tipo "Bop
  It" (varios verbos: girar, tirar, pulsar). Necesita varios controles distintos y feedback
  sonoro para leerse, y el fin de partida es menos legible. Simon con 4 paneles de color se
  entiende de un vistazo, mapea a 4 teclas y a la paleta, y su game over es inequívoco.
- **Estado:** Propuesto

### 2026-09-03 — SINCRO (juego de ritmo por teclas)

- **Veredicto:** Alternativa considerada
- **Encaje:** Ritmo / timing — género ausente. Estéticamente potente: 4 carriles de neón
  con notas descendentes y una línea de golpeo con flash, muy vaporwave-CRT. Score
  ponderado por precisión (Perfect/Good/Miss) con multiplicador de combo; fin de partida al
  agotar la barra de vida (acumulación de Miss) o al terminar la pista → HUD + leaderboard
  sin cambios de esquema.
- **Mapa al patrón de portado:**
  - Contrato: `window.startSincro(canvasEl)` / `stop()` / `restartSincro()` /
    `toggleSincroPause()`.
  - Entrada: solo teclado. `D F J K` = 4 carriles. Listener sobre `window`, `preventDefault`
    de esas teclas y `Space`.
  - HUD por `postMessage({ source:"sincro", type:"state", score, combo, precision, phase })`
    con `phase ∈ "playing"|"paused"|"gameover"`; al acabar,
    `{ source:"sincro", type:"gameover", score }`.
  - Tercer bloque del HUD → "COMBO" y "PRECISIÓN %". Sin vidas visibles como corazones; la
    barra de vida se pinta dentro del canvas.
  - Guardado: `guardarPuntuacionSincro({ score })`, `game_slug: "sincro"`. Migración
    `0004_add_sincro_game.sql` (`category_label: "RITMO"`, `tags: ['RITMO','TIMING']`).
- **Origen del motor:** desde cero.
- **Complejidad:** Media-Alta — patrón (beatmap) que autorar, ventanas de juicio por
  timing, multiplicador de combo, barra de vida, y sincronía nota↔frame con `performance.now()`
  en vez de contar frames. Es el que más riesgo tiene de no caber en una sola spec del
  tamaño de SPEC 05/07/08/09.
- **Riesgos:**
  1. Licencia de música: usar una pista real es un problema de licencia y de sincronía
     audio↔render. Mitigación: correr sobre un patrón generado / metrónomo (o loops CC0
     cortos) y evaluar timing puro sin depender de audio.
  2. Deriva temporal: contar frames de `requestAnimationFrame` desincroniza las notas en
     equipos lentos; hay que anclar todo a un reloj (`performance.now()`).
  3. Scope: barra de vida + combo + juicios + editor de patrón puede desbordar una spec;
     habría que fijar un único patrón corto y fijo.
- **Alternativa descartada (dentro de este candidato):** Guitar-Hero con pista de audio
  real y chart largo. Descartada por licencia de assets y por la fragilidad de la
  sincronía audio-render; SINCRO sobre patrón generado mantiene la mecánica de timing sin
  esos dos problemas.
- **Estado:** Propuesto

**Cierre de la tanda:** se recomienda **ALETEO**. Es el de menor riesgo y menor superficie
(replica casi exacta del camino de SPEC 09: desde cero, un `game.js` de canvas, un
`components/aleteo-player.tsx` calcado de `snake-player`, una Server Action gemela y una
migración mínima de catálogo), cubre un hueco real (endless de un botón) y encaja en la
estética sin ningún asset. SEÑAL queda como primera reserva (aporta el género memoria);
SINCRO como segunda, condicionada a poder acotar el patrón a algo fijo y corto.

Siguiente paso sugerido: `/juego-jugable aleteo`.

---

# 2026-09-03 — Enfoque: puzzle / lógica / tablero (familia Tetris, sin Tetris)

Análisis temático acotado a puzzle / lógica / tablero. El catálogo ya cubre este espacio
solo con `tetris` (relleno de líneas con piezas que caen). No hay starter de puzzle sin
portar en `resources/started-games/` (02/03/04 ya están en `public/games/`), así que las
tres propuestas son **desde cero**, siguiendo el precedente de `snake` (SPEC 09): canvas
vanilla, sin dependencias ni bundler, contrato `window.start<Slug>` + `postMessage` + una
Server Action `guardarPuntuacion<Slug>` que reutiliza la política `anon_insert_scores`
(sin cambios de esquema en `public.scores`). Las tres necesitan **una fila nueva en
`public.games`** (migración de seed, sin cambio de columnas).

## 2026-09-03 — Columns

- **Veredicto:** Recomendado
- **Encaje:** Puzzle de emparejado por color con piezas que caen (Sega, 1990). Género
  distinto del de `tetris`: no se rellenan líneas, se alinean 3+ gemas del mismo color en
  cualquiera de las 8 direcciones y se disparan reacciones en cadena con gravedad. Gemas
  como rectángulos de neón con glow encajan de lleno en la paleta CRT / Neon-Brutalist
  (cian, magenta, amarillo ácido, verde) y en la rejilla rígida sin esquinas redondeadas.
  Solo teclado (izq/der mover columna, abajo soft-drop, arriba/Espacio rotar el trío de
  colores, P pausa). Puntuación entera acumulable (más por cadenas) y game over claro
  (la pila alcanza el techo) → encaja con el HUD y con `public.scores` /
  `anon_insert_scores` sin tocar esquema.
- **Origen del motor:** desde cero (no hay starter ni assets; se autora como `snake` en
  SPEC 09). Un solo `game.js` clásico + `components/columns-player.tsx` calcado de
  `snake-player.tsx` (un único `<Script>`, sin spritesheet).
- **Complejidad:** Media — la lógica no trivial es la detección de coincidencias en 8
  direcciones más el bucle de colapso/gravedad y re-chequeo de cadenas. El resto (columna
  de 3, mover, soft-drop) es sencillo. El "rotar colores del trío" es un input nuevo que
  ningún juego portado tiene: hay que documentarlo en la spec. Como no hay fuente, la spec
  debe fijar dimensiones, velocidades y umbral de cadena igual que hizo SPEC 09.
- **Estado:** Propuesto
- **Notas:** Requiere migración `0004_*` que inserta la fila `columns` en `public.games`
  (`category_label` `PUZZLE`, `year` 1990, tags `PUZZLE` / `COMBOS`) antes de poder
  insertar en `scores` (FK a `games.slug`). Mensaje sugerido:
  `{ source: "columns", type: "state", score, level, jewels, phase }` con
  `phase ∈ playing|paused|gameover`; tercer bloque del HUD = `NIVEL` + `JOYAS` (sin vidas).
  Siguiente paso recomendado: `/juego-jugable columns`.

## 2026-09-03 — 2048

- **Veredicto:** Alternativa considerada
- **Encaje:** Puzzle de deslizar-y-fusionar en rejilla 4×4 (Cirulli, 2014). Universalmente
  reconocible pese a no ser de la era dorada; el argumento de encaje visual es fuerte:
  fichas rectangulares con número centrado en tipografía arcade (Press Start 2P / Anybody),
  rampa de color neón por valor, rejilla rígida, cero "pills" — es casi una traducción
  literal de `DESIGN.md`. Solo teclado (flechas / WASD). Puntuación acumulable natural
  (suma de fusiones) y game over inequívoco (tablero lleno sin movimientos). Sin vidas ni
  nivel; pausa no aplica (por turnos, sin reloj).
- **Origen del motor:** desde cero. Lógica de colapso de fila muy corta; primer porte
  puede redibujar por pasos sin animación de deslizamiento.
- **Complejidad:** Baja — es el más rápido de portar de los tres. Riesgo menor: el slug
  `2048` es puramente numérico; conviene verificar `/jugar/2048`, `generateStaticParams` y
  los `revalidatePath` (es `text` PK, debería ir bien).
- **Estado:** Propuesto
- **Notas:** Mensaje sugerido:
  `{ source: "2048", type: "state", score, moves, max, phase }` con
  `phase ∈ playing|won|gameover` (`won` al aparecer la ficha 2048, se puede continuar);
  tercer bloque del HUD = `MOVIMIENTOS` + `MÁX`. Migración de seed con `year` 2014,
  `category_label` `PUZZLE`, tags `LÓGICA` / `NÚMEROS`. Decisión de scope a fijar en la
  spec: continuar tras 2048 o terminar. Es la opción si se pide "algo rápido de portar".

## 2026-09-03 — Lights Out

- **Veredicto:** Alternativa considerada
- **Encaje:** Puzzle de lógica pura por deducción (Tiger Electronics, 1995). Rejilla 5×5
  de luces; cada pulsación conmuta la celda y sus 4 vecinas ortogonales; objetivo: apagar
  todo. Aporta un sabor distinto al catálogo (deducción, no destreza ni reflejos). Luces
  encendidas = celdas de neón con glow sobre fondo negro; cursor magenta — encaja en CRT.
  Solo teclado (flechas mueven el cursor, Espacio/Enter conmuta). Por niveles: cada tablero
  es un scramble resoluble (N conmutaciones aleatorias desde el estado resuelto).
- **Origen del motor:** desde cero. Motor muy pequeño.
- **Complejidad:** Baja–Media — el motor es trivial; el trabajo de diseño está en que el
  game over **no es intrínseco** al juego: hay que introducir un presupuesto de movimientos
  por nivel (agotarlo termina la partida) para producir puntuación acumulable + fin claro.
- **Estado:** Propuesto
- **Notas:** Mensaje sugerido:
  `{ source: "lights-out", type: "state", score, level, movesLeft, phase }`; tercer bloque
  del HUD = `NIVEL` + `MOVIMIENTOS`. Migración de seed con `year` 1995, `category_label`
  `PUZZLE`, tags `LÓGICA` / `DEDUCCIÓN`. Menos reconocible que Columns/2048; el presupuesto
  de movimientos es una decisión de diseño que la spec debe justificar.

## 2026-09-03 — Dr. Mario

- **Veredicto:** Descartado
- **Encaje:** Puzzle de cápsulas bicolor que caen; eliminar todos los virus alineando 4+
  del mismo color (Nintendo, 1990). Muy reconocible y visualmente ideal para la paleta.
- **Origen del motor:** desde cero.
- **Complejidad:** Alta — generación del tablero de virus por nivel, cápsulas de dos
  mitades que se parten al caer, gravedad de mitades sueltas y cadenas de eliminación con
  re-chequeo. Más cerca de la familia "pieza que cae" de Tetris que las tres propuestas.
- **Estado:** Rechazado
- **Notas:** Descartado frente a Columns: mismo nicho de "gema que cae" pero con bastante
  más lógica (virus + partición de cápsulas + gravedad parcial) para una sola spec del
  tamaño de SPEC 05/07/08/09. Reconsiderar si se quiere un segundo match-por-color tras
  Columns.

## 2026-09-03 — Minesweeper

- **Veredicto:** Descartado
- **Encaje:** Puzzle de deducción en rejilla (Windows, 1990). Reconocible.
- **Origen del motor:** desde cero.
- **Complejidad:** Media.
- **Estado:** Rechazado
- **Notas:** Falla dos criterios duros. (1) Es intrínsecamente de ratón: clic izquierdo
  revelar / clic derecho bandera; el porte a solo-teclado (cursor + teclas revelar/marcar)
  es incómodo y poco fiel. (2) No produce puntuación acumulable natural: es tiempo o
  victoria/derrota, no encaja con el HUD de score creciente ni con el leaderboard
  `score DESC`. Descartado frente a Lights Out, que sí es teclado-nativo y puede generar
  score con un presupuesto de movimientos. Otras alternativas del mismo enfoque valoradas
  y no registradas por no aportar sobre las anteriores: Sokoban (score poco natural, hace
  falta undo/reset por bloqueo), match-3 tipo Bejeweled (nombre con marca; mecánica de
  intercambio muy cercana a Columns con más coste en cascadas y barajado).

# 2026-09-03 — Enfoque: plataformas, laberintos y recolección (familia Snake, distintos)

Primer análisis del agente. El registro estaba vacío: ninguna de estas tres es
repetición. Enfoque asignado: laberintos / recolección / plataformas de una pantalla.
Catálogo actual (`0001_create_games.sql`): `arkanoid`, `tetris`, `snake` jugables;
`pac-man` y `space-invaders` son maqueta; `asteroids` jugable con guardado solo visual.
Motores starter disponibles sin portar: ninguno nuevo (`resources/started-games/` solo
tiene asteroids/tetris/arkanoid, ya portados). Todo candidato de este enfoque se escribe
**desde cero en canvas vanilla**, como se hizo con `snake` (SPEC 09).

## 2026-09-03 — Pac-Man

- **Veredicto:** Recomendado
- **Encaje:** Laberinto de recolección. `pac-man` **ya existe** en `public.games`
  (`sort_order` 4, `category_label` `MAZE`, tags `LABERINTO`/`CLÁSICO`, `year` 1980,
  `best_score` `'333,330'`, imagen y `image_alt` de laberinto de neón ya sembrados) y
  hoy su `/jugar/pac-man` es maqueta. Portarlo **convierte en jugable un género que el
  catálogo anuncia pero no entrega** (MAZE), sin duplicar nada: Snake es cuadrícula
  abierta sin perseguidores con personalidad; aquí hay laberinto fijo, cuatro fantasmas
  con IA de scatter/chase y pastillas de poder que invierten la caza. Máximo valor de
  nostalgia arcade: el jugador lo reconoce al instante. Estética CRT: pasillos vectoriales
  - puntos, alto contraste sobre negro, encaja con el gabinete y el modo oscuro exclusivo.
    HUD: es el único candidato cuyo HUD mapea **1:1 con el mock actual** de
    `app/jugar/[slug]/page.tsx` (bloque "VIDAS / NIVEL" con corazones + `LVL n`) — Pac-Man
    sí tiene vidas (3) y niveles.
- **Origen del motor:** desde cero (canvas vanilla, sin dependencias ni bundler), igual
  que `snake` en SPEC 09. No hay starter en `resources/started-games/`. No hay assets
  propios (Snake tenía `fruits.png`); el laberinto y los sprites se dibujan con formas
  simples (arco para Pac-Man, "sábana" redondeada para fantasmas) o un tileset pixel
  minúsculo autoral. Laberinto como array de strings.
- **Mapa al patrón de portado:**
  - Contrato: `window.startPacman(canvasEl)` / `stop()` / `restartPacman()` /
    `togglePacmanPause()` (mismo cuarteto que arkanoid/snake). `stop()` hace
    `cancelAnimationFrame`, marca flag de detenido y quita el `keydown` de `window`.
  - HUD por `postMessage(msg, window.location.origin)` con chequeo sucio:
    `{ source: "pacman", type: "state", score, lives, level, phase }` con
    `phase ∈ "playing" | "paused" | "gameover"`; al morir la última vida, además
    `{ source: "pacman", type: "gameover", score }`. El reproductor
    `components/pacman-player.tsx` (calcado de `snake-player.tsx`) filtra por origin +
    `event.source === window` + `data.source === "pacman"` y pinta el HUD React.
  - Forma del score: entero acumulable — 10 por punto, 50 por pastilla de poder,
    cadena 200/400/800/1600 por fantasmas comidos en modo frightened, bonus de fruta.
    Game over claro: se agotan las 3 vidas. Encaja en `public.scores` /
    `anon_insert_scores` **sin cambios de esquema** (`score > 0`, `achieved_at null`,
    `player <> ''`).
  - Server Action: `guardarPuntuacionPacman({ score })` en `app/jugar/[slug]/actions.ts`,
    gemela de `guardarPuntuacionSnake`, inserta
    `{ game_slug: "pac-man", player: "G4M3R_X", score, achieved_at: null }` con el cliente
    `@/lib/supabase/anon`; revalida `/salon-de-la-fama` y `/juegos/pac-man`.
  - Leaderboard: la pestaña Pac-Man **ya existe** en el Salón de la Fama con seed
    histórico (`0002_create_scores.sql`); las marcas nuevas entran ahí sin tocar
    `lib/leaderboards.ts`.
  - Migraciones: **ninguna**. La fila de `games` existe y `anon_insert_scores` no es
    específica de slug (precedente exacto de SPEC 08 y SPEC 09).
  - Rama en la página: ampliar la condición jugable de `app/jugar/[slug]/page.tsx` a
    `"pac-man"` → `<PacmanPlayer game={game} />`; `space-invaders` sigue maqueta.
- **Complejidad:** Media-Alta — la IA de los cuatro fantasmas (modos scatter/chase, blanco
  por personalidad, frightened con parpadeo y regreso a la casa) y la colisión sobre la
  rejilla del laberinto con túnel de envoltura son el grueso. Se acota a "cuatro fantasmas,
  modos clásicos, un laberinto" para que quepa en una spec del tamaño de SPEC 09.
- **Riesgos:**
  1. Fidelidad de la IA de fantasmas vs. tamaño de una sola spec: mitigación = fijar en
     Decisions un modelo simplificado (tabla scatter/chase por tiempo, blanco por
     fantasma, sin "Elroy" ni cornering exacto) y dejar el resto fuera de alcance.
  2. Datos y colisión del laberinto: representar el mapa como array de strings y mover
     por centros de celda evita fugas por las paredes; el túnel lateral necesita
     envoltura explícita.
  3. Timing del modo frightened y de la fruta bonus: parámetros ajustables en
     implementación sin tocar el contrato, como hizo SPEC 09 con `tickMs`.
- **Estado:** Propuesto
- **Notas:** Es el port de menor fricción de infraestructura de todo el enfoque: cero
  migraciones, HUD idéntico al mock, entrada de catálogo y leaderboard ya sembrados. El
  trabajo es casi todo `game.js`.

## 2026-09-03 — Q*bert

- **Veredicto:** Alternativa considerada
- **Encaje:** Recolección sobre rejilla isométrica: saltar por una pirámide de cubos
  cambiándolos de color y esquivando enemigos. Género que **no** cubre el catálogo (no hay
  nada isométrico ni de "pintar el tablero"). Clásico reconocible (1982, el bicho naranja
  narigudo). La proyección isométrica de rombos de neón sobre negro encaja de lleno con la
  sensibilidad vaporwave/retro-future del `DESIGN.md` (formas rectas, sin curvas, alto
  contraste). Se juega entero con teclado (cuatro diagonales). Puntuación + game over
  claros.
- **Origen del motor:** desde cero (canvas vanilla). Sin starter y sin assets; los cubos
  son rombos dibujados con `ctx` y el personaje un sprite pixel autoral mínimo.
- **Mapa al patrón de portado:**
  - Contrato: `window.startQbert(canvasEl)` / `stop()` / `restartQbert()` /
    `toggleQbertPause()`.
  - `postMessage`: `{ source: "qbert", type: "state", score, lives, level, phase }` +
    `{ source: "qbert", type: "gameover", score }` al perder la última vida. `level` = ronda
    (cada pirámide completada sube la ronda y, con ella, el número/velocidad de enemigos).
  - Score entero: 25 por cubo cambiado por primera vez, bonus por completar la ronda,
    500 por derrotar a Coily. Game over: se agotan las vidas (caer fuera de la pirámide o
    contacto con enemigo).
  - Server Action `guardarPuntuacionQbert({ score })` → `{ game_slug: "qbert", ... }`;
    revalida `/salon-de-la-fama` y `/juegos/qbert`.
  - Migraciones: **una nueva** (`0004_add_qbert_game.sql`) que inserta la fila en
    `public.games` (slug `qbert`, `category_label` sugerido `ARCADE` o `MAZE`, `year` 1982,
    `sort_order` 7, `best_score` semilla, imagen). Opcionalmente un seed de leaderboard en
    esa misma migración para que la pestaña del Salón no salga vacía. `anon_insert_scores`
    ya cubre el `INSERT`.
  - Reproductor `components/qbert-player.tsx` calcado de `snake-player.tsx`; HUD con
    "VIDAS" y "NIVEL" (Q*bert sí tiene vidas, así que el bloque de corazones del mock se
    reutiliza).
- **Complejidad:** Media — la proyección isométrica (mapear celda fila/columna a x/y de
  pantalla y viceversa), la lógica de salto celda-a-celda y la detección de "salto al
  vacío". Menos IA que Pac-Man: los enemigos de Q*bert bajan por la pirámide de forma
  mayormente determinista.
- **Riesgos:**
  1. Los controles de teclado diagonal (arriba-izq, arriba-der, abajo-izq, abajo-der) son
     poco intuitivos; hay que elegir cuatro teclas claras (p. ej. `Q`/`W`/`A`/`S` o pares
     de flechas) y explicarlas en el aviso bajo el gabinete.
  2. Alcance de enemigos y extras (Coily, bolas rojas/verdes, discos voladores, Slick &
     Sam): fijar en Decisions un subconjunto (p. ej. solo Coily + bolas rojas, sin discos)
     para caber en una spec.
  3. Detección de borde de la pirámide para la caída: coordenadas fuera de rango deben
     resolverse como muerte, no como índice inválido.
- **Estado:** Propuesto
- **Notas:** Aporta un género visualmente nuevo (isométrico) que ningún otro candidato
  del enfoque cubre. Pierde frente a Pac-Man solo por la migración extra y por no tener
  entrada de catálogo previa.

## 2026-09-03 — Dig Dug

- **Veredicto:** Alternativa considerada
- **Encaje:** Cavar túneles en la tierra, recoger terreno y reventar enemigos con una
  bomba de aire o aplastándolos con rocas. Género de **excavación** que el catálogo no
  tiene; distinto de Snake (aquí el jugador esculpe el escenario) y de Pac-Man (el mapa se
  destruye en vez de ser fijo). Clásico reconocible de Namco (1982). Pixel art de tierra
  en capas de color sobre negro, encaja con la estética CRT. Solo teclado (flechas para
  cavar, una tecla para la bomba). Puntuación + game over claros.
- **Origen del motor:** desde cero (canvas vanilla). Sin starter, sin assets.
- **Mapa al patrón de portado:**
  - Contrato: `window.startDigDug(canvasEl)` / `stop()` / `restartDigDug()` /
    `toggleDigDugPause()`.
  - `postMessage`: `{ source: "digdug", type: "state", score, lives, level, phase }` +
    `{ source: "digdug", type: "gameover", score }`. `level` = fase (cada fase limpia de
    enemigos avanza).
  - Score entero: puntos por enemigo reventado según la profundidad a la que muere,
    puntos por roca que aplasta enemigos, bonus por vegetal. Game over: se agotan las
    vidas (contacto con Pooka/Fygar o quedar bajo una roca).
  - Server Action `guardarPuntuacionDigDug({ score })` → `{ game_slug: "dig-dug", ... }`;
    revalida `/salon-de-la-fama` y `/juegos/dig-dug`.
  - Migraciones: **una nueva** (`0004_add_dig_dug_game.sql`) con la fila de `public.games`
    (slug `dig-dug`, `year` 1982, `sort_order` 7, imagen, `best_score` semilla) y un seed
    opcional de leaderboard. `anon_insert_scores` cubre el `INSERT`.
  - Reproductor `components/dig-dug-player.tsx` calcado de `snake-player.tsx`; HUD con
    "VIDAS" y "NIVEL".
- **Complejidad:** Media-Alta — hay que llevar dos cosas no triviales a la vez en una
  sola spec: un buffer de terreno destructible (qué celdas están excavadas, dibujado por
  capas) y la IA de los enemigos, que patrullan por los túneles y además pueden
  "fantasmagorizarse" para atravesar la tierra en línea recta hacia el jugador. Más la
  física de rocas que caen y la mecánica de la bomba (inflar en 3 fases con hitbox
  direccional). El Fygar que escupe fuego suele dejarse fuera en un primer porte.
- **Riesgos:**
  1. Terreno destructible + pathfinding de enemigos por túneles son, juntos, más de lo
     que cabió en SPEC 09; hay riesgo real de desbordar el tamaño de una spec. Mitigación:
     acotar a un enemigo (Pooka), sin Fygar ni fuego, y a un layout de fase fijo.
  2. Física de rocas (detección de tierra bajo la roca, caída con retardo, aplastar tanto
     enemigos como al jugador) es fuente clásica de bugs de borde.
  3. La mecánica de la bomba (mantener pulsado para inflar, soltar antes de tiempo) añade
     estado de input que ni Snake ni Pac-Man tienen.
- **Estado:** Propuesto
- **Notas:** El más ambicioso del enfoque. Buen candidato para más adelante, cuando el
  patrón de "juego desde cero" esté más rodado; hoy es el que más arriesga el "una sola
  spec".

## 2026-09-03 — Alternativas descartadas del enfoque

- **Bomberman** — Descartado. Su gracia es el multijugador local; una campaña de un solo
  jugador con enemigos e IA de propagación de explosiones en cadena por una rejilla es más
  grande que una spec del tamaño de SPEC 09, y el modo que lo hace memorable necesita
  infraestructura de la que el proyecto aún carece (sin auth siquiera).
- **Lode Runner** — Descartado. Es un juego dirigido por su set de niveles: decenas de
  pantallas diseñadas a mano, cavar agujeros temporales, IA de guardias que recogen el
  oro y quedan atrapados. Sin un editor/colección de niveles no es "Lode Runner", y eso no
  cabe en una spec.
- **Donkey Kong** — Descartado. Necesita sprites reconocibles (Mario, DK, barriles,
  escaleras) y física de plataformas + escaleras + salto con hitbox fina, repartida en
  varias pantallas. Riesgo de licencia/assets con IP de Nintendo muy identificable y
  volumen de trabajo por encima de una spec. Un plataformero de una pantalla **genérico**
  (sin la IP) sería viable, pero pierde el valor de nostalgia "lo reconozco al verlo" que
  exige el checklist.

---

# 2026-09-03 — Ronda temática: arcade de acción / disparos / esquivar

Enfoque asignado: familia de Asteroids y Arkanoid, pero distintos (Space Invaders, Galaga,
Missile Command, Centipede, Defender, shoot'em up, tirador de oleadas…). Catálogo actual:
`arkanoid`, `tetris`, `snake`, `pac-man`, `space-invaders`, `asteroids`. Jugables de verdad
hoy: `asteroids`, `tetris`, `arkanoid`, `snake`. Maquetas: `pac-man`, `space-invaders`.
Starters disponibles sin portar: ninguno nuevo (`02-claude-asteroids`, `03-claude-tetris`,
`04-arkanoid` ya portados). Todo candidato de esta ronda sería **desde cero en canvas
vanilla**, como se hizo con `snake`.

## 2026-09-03 — Space Invaders

- **Veredicto:** Recomendado
- **Encaje:** Shooter de galería fijo. **Ya tiene fila en `public.games`** (`space-invaders`,
  `category_label` SHOOTER, `sort_order` 5, `year` 1978) sirviendo hoy como maqueta CRT:
  portarlo convierte un placeholder existente en juego real **sin migración de catálogo**.
  Clásico universalmente reconocible. Distinto de Asteroids (sin inercia, sin rotación 360°;
  cañón sobre riel horizontal) y de Arkanoid (se dispara, no se rebota). Estética perfecta
  para Neon-Brutalist: sprites pixel de invasores en cian/verde, láseres magenta, búnkeres
  erosionables, fondo negro puro con scanlines. HUD estándar: puntuación + vidas + oleada,
  game over claro al perder las vidas o cuando los invasores tocan el suelo.
- **Origen del motor:** desde cero (canvas vanilla, sin bundler). Se puede reaprovechar la
  estructura de bucle/entidades/balas del starter `02-claude-asteroids` como referencia.
- **Complejidad:** Media — la rejilla de invasores con descenso escalonado y aceleración a
  medida que se vacía es sencilla; el coste está en los búnkeres destructibles por píxel y
  en el ritmo de fuego enemigo. El OVNI de bonus es opcional.
- **Estado:** Propuesto
- **Notas:** Patrón de portado: contrato `window.startSpaceInvaders(canvasEl)` / `stop()` /
  `restartSpaceInvaders()`; `postMessage` con `{ type: "state", score, lives, wave,
status: "playing" | "gameover" }`; componente `components/space-invaders-player.tsx` monta
  el canvas y pinta el HUD en React; Server Action `guardarPuntuacionSpaceInvaders({ score })`
  en `app/jugar/[slug]/actions.ts` inserta `{ game_slug: "space-invaders", player: "G4M3R_X",
score, achieved_at: null }` con el cliente `anon` y la política `anon_insert_scores`
  (sin cambios de esquema), y revalida `/salon-de-la-fama` y `/juegos/space-invaders`.
  Score acumulable: 10/20/30 pts por fila de invasor + OVNI aleatorio; encaja tal cual en el
  leaderboard de `public.scores` (orden `score DESC`, se calcula en `lib/leaderboards.ts`).
  Riesgos: (1) máscara de colisión por píxel de los búnkeres; (2) regla de "una sola bala
  del jugador en pantalla" y cadencia de disparo enemigo que define la dificultad; (3)
  aceleración de la horda al quedar pocos invasores (timing, no trivial de afinar).
  Alternativa descartada dentro de este hueco: **Galaxian** puro (sin formación de entrada
  ni haz de captura) — demasiado parecido a Space Invaders para justificar dos shooters de
  galería fijos casi idénticos; si se quiere ese matiz, Galaga lo cubre mejor.

## 2026-09-03 — Galaga

- **Veredicto:** Alternativa considerada
- **Encaje:** Shooter de galería con enemigos que **entran en formación siguiendo
  trayectorias curvas y luego pican en picado** hacia el jugador. Aporta algo que Space
  Invaders no tiene: patrones de vuelo y esquiva de enemigos en movimiento libre, no una
  rejilla que baja en bloque. Clásico muy reconocible (1981). Encaja en la estética: naves
  pixel bicromáticas, estelas de neón, campo estelar. Requiere **nueva fila en
  `public.games`** (`galaga`, SHOOTER, 1981) vía migración `000N_add_galaga_game.sql` antes
  de poder guardar scores (FK `scores.game_slug → games.slug`).
- **Origen del motor:** desde cero (canvas vanilla). La gestión de balas/entidades del
  starter `02-claude-asteroids` es una base parcial; las trayectorias de entrada y los
  ataques en picado van desde cero (splines/beziers precalculadas por oleada).
- **Complejidad:** Media-Alta — las secuencias de entrada en formación y los patrones de
  picado son el grueso del trabajo y son delicados de afinar para que "se sientan" a Galaga.
- **Estado:** Propuesto
- **Notas:** Contrato `window.startGalaga(canvasEl)` / `stop()` / `restartGalaga()`;
  `postMessage` `{ type: "state", score, lives, stage, status }`; Server Action
  `guardarPuntuacionGalaga({ score })` con el mismo patrón `anon` + `anon_insert_scores`.
  Score: puntos por enemigo abatido, con bonus si se derriba en picado; acumulable, encaja
  en `public.scores` sin cambios de esquema. Riesgos: (1) coste de autoría de las
  trayectorias por oleada; (2) la mecánica de captura del caza y el doble caza (dual
  fighter) es icónica pero se debe dejar **fuera** para que quepa en una sola spec tamaño
  SPEC 05/07/08/09; (3) estructura de stages / challenging stages que puede inflar el
  alcance si no se acota a "oleadas infinitas con dificultad creciente".
  Alternativa descartada dentro de este hueco: **Defender** — scroll horizontal
  bidireccional, minimapa, rescate de humanoides y gestión de combustible; vuelo en dos ejes
  sobre un mundo que se desplaza. Demasiado grande para una spec y con HUD (radar) que se
  sale del patrón puntuación+vidas+nivel.

## 2026-09-03 — Centipede

- **Veredicto:** Alternativa considerada
- **Encaje:** Shooter de campo: el ciempiés serpentea hacia abajo a través de un campo de
  setas mientras el jugador, confinado a una banda inferior, dispara hacia arriba y esquiva.
  Género distinto tanto de Asteroids como de Space Invaders: campo con obstáculos
  destructibles que reconfiguran el recorrido enemigo, más arañas/pulgas/escorpiones. Muy
  reconocible (1981) y visualmente idóneo para CRT (segmentos de neón, setas pixel, alto
  contraste sobre negro). Se jugaba con trackball, pero los ports domésticos usaban teclado
  sin problema: mover en 4/8 direcciones dentro de la banda + disparo. Requiere **nueva fila
  en `public.games`** (`centipede`, SHOOTER, 1981) vía migración antes de guardar scores.
- **Origen del motor:** desde cero (canvas vanilla). Estado de campo en rejilla + tren de
  segmentos; poco reaprovechable de los starters.
- **Complejidad:** Media — la rejilla de setas y el "tren" de segmentos que se **parte en
  dos y genera una seta al recibir un impacto en mitad del cuerpo** es la pieza central;
  factible en el tamaño de una spec si se recorta el bestiario.
- **Estado:** Propuesto
- **Notas:** Contrato `window.startCentipede(canvasEl)` / `stop()` / `restartCentipede()`;
  `postMessage` `{ type: "state", score, lives, wave, status }`; Server Action
  `guardarPuntuacionCentipede({ score })` con el patrón `anon` + `anon_insert_scores`.
  Score: 10 por segmento, 100 por cabeza, 1 por seta, 300-900 por araña según cercanía;
  acumulable, encaja en `public.scores` sin cambios de esquema. Riesgos: (1) lógica de
  división del ciempiés y regeneración de setas (colisiones en rejilla); (2) tentación de
  meter todo el bestiario (pulga, escorpión, setas envenenadas que hacen picar al ciempiés)
  — dejar setas envenenadas y escorpión **fuera** de la primera spec; (3) sensación de
  control con teclado en la banda inferior frente al trackball original (aceptable, se
  documenta como decisión).
  Alternativa descartada dentro de este hueco: **Frogger** (versión tráfico) — es "esquivar"
  pero no se dispara y encaja mejor como juego de cruce/carriles que como shooter de acción;
  fuera del enfoque de esta ronda.

## 2026-09-03 — Missile Command

- **Veredicto:** Descartado
- **Encaje:** Shooter defensivo de "esquivar/interceptar" (defiendes ciudades derribando
  misiles con contraexplosiones). Temáticamente encajaría y la estética de estelas y
  explosiones de neón sobre negro sería espectacular en el gabinete.
- **Origen del motor:** desde cero (canvas vanilla).
- **Complejidad:** Media — pero con un choque de fondo con las reglas del proyecto.
- **Estado:** Rechazado por el usuario (descartado por el planner en esta ronda)
- **Notas:** Se descarta por la regla dura **"solo teclado"**: Missile Command es
  intrínsecamente de puntería con mira (trackball/ratón); un cursor de mira movido con
  teclado se siente mal y desvirtúa el juego. Si en el futuro se acepta una mira con
  teclado, se puede retomar. Puntuación + game over sí encajarían (puntos por misil
  interceptado + bonus por ciudades y munición restante; fin al perder las 6 ciudades).
