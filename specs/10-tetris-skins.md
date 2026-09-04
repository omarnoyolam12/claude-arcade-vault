# SPEC 10 — Skins seleccionables (clásico / retro / neon) para Tetris

> **Status:** Aprobado
> **Depends on:** SPEC 07
> **Date:** 2026-09-04
> **Objective:** Añadir a `/jugar/tetris` un selector de skin visual con tres opciones (clásico, retro, neon) que cambia en caliente la paleta y el efecto de dibujo del canvas sin reiniciar la partida, persiste la elección en `localStorage` y deja al agente `skin-designer` documentado con el patrón para aplicarlo después a los demás juegos.

---

## Por qué existe esta spec

SPEC 07 dejó Tetris jugable en `/jugar/tetris` y **eliminó explícitamente** el sistema de tema propio del starter (`applyTheme`, `THEME_KEY`, `#theme-toggle`, lectura/escritura de `localStorage['tetris-theme']`): el fork fija `theme = 'dark'` para que `THEME_COLORS.dark` siga resolviendo en `drawBlock` / `drawGrid`, y no toca `document.documentElement` ni `localStorage`. Hoy Tetris **no tiene ningún sistema de skins**: es el único tema disponible.

Esta spec introduce el sistema de skins que el agente `skin-designer` (Modo A/B) exige para cada juego del catálogo: al menos 3 opciones seleccionables — **neon**, **retro** y **clásico (default)**. Tetris es el primer juego jugable en recibirlo; el patrón que se fija aquí (estructura de paletas en el fork, contrato `window.set<Slug>Skin`, clave de `localStorage` `<slug>-skin`, `<select>` nativo en el reproductor) se documenta en `.claude/agents/skin-designer.md` para que el agente lo proponga consistentemente en `asteroids`, `arkanoid` y `snake` en specs futuras — esta spec no los toca.

**Regla de estilos (heredada de SPEC 01–09):** `app/globals.css` no se toca. Todo estilo adicional se resuelve con utilidades de Tailwind en el JSX del reproductor; el dibujo de las skins vive enteramente en `public/games/tetris/game.js` (canvas), no en CSS.

---

## Scope

**In:**

- `public/games/tetris/game.js` — **modificado**:
  1. Se reemplaza `COLORS` (array plano) y `THEME_COLORS` (solo `dark`/`light`) por un mapa `SKINS` con tres entradas — `clasico`, `retro`, `neon` — cada una con: `pieceColors` (array de 8 posiciones, índice 0 `null` igual que hoy), `grid` (color de línea de rejilla), `highlight` (color del highlight de bloque asentado) y `glow` (`{ blur: number; alpha: number } | null`).
     - `clasico`: `pieceColors` = los 7 colores actuales de `COLORS` sin cambios; `grid` / `highlight` = los valores actuales de `THEME_COLORS.dark`; `glow: null`.
     - `retro`: paleta 8-bit desaturada verde/ámbar (7 tonos derivados de una gama tipo pantalla CRT monocromo: verdes `#8bac0f`, `#9bbc0f`, `#556b2f`, `#306230`, ámbar `#7a5c1e`, `#a67c27`, `#4f7942`); `grid` en verde oscuro apagado; `highlight` en verde claro translúcido; `glow: null`.
     - `neon`: mismos `pieceColors` que `clasico` (para no perder la asociación de color por tipo de pieza) pero con `glow: { blur: 16, alpha: 0.9 }`; `grid` y `highlight` más brillantes que `clasico` (p. ej. grid en un cian tenue, highlight blanco más opaco).
  2. `drawBlock` deja de indexar `COLORS[colorIndex]` directo: resuelve `SKINS[activeSkin].pieceColors[colorIndex]`. Cuando `SKINS[activeSkin].glow` no es `null`, antes de `ctx.fillRect` fija `ctx.shadowColor = color` y `ctx.shadowBlur = glow.blur` (con `ctx.globalAlpha` o un color con alpha para `glow.alpha`), y los resetea (`shadowBlur = 0`) al terminar de dibujar el bloque para no contaminar el resto del frame (rejilla, texto). Cuando `glow` es `null`, no toca `shadowBlur` (se asume ya en 0 por el reset anterior).
  3. `drawGrid` deja de leer `THEME_COLORS[theme].grid`: lee `SKINS[activeSkin].grid`. El highlight de bloque asentado (el que hoy usa `THEME_COLORS[theme].highlight`) pasa a `SKINS[activeSkin].highlight`.
  4. Se añade una variable mutable `activeSkin` (inicializada en `"clasico"`) en el closure de `startTetris`. Se elimina la constante `theme` fijada a `"dark"` (ya no se usa: `SKINS` sustituye a `THEME_COLORS`).
  5. Se expone `window.setTetrisSkin(skin: "clasico" | "retro" | "neon")`: valida que `skin` sea una clave de `SKINS` (si no, no hace nada) y reasigna `activeSkin = skin`. No fuerza un redibujado explícito: como `draw()` corre en cada frame del `rAF` mientras la partida está activa (jugando o en pausa se sigue pintando el último frame estático), el cambio se refleja en el siguiente frame sin reiniciar `board`, `score`, `lines` ni `level`. `stop()` elimina `window.setTetrisSkin` junto con `window.restartTetris` y `window.toggleTetrisPause`, siguiendo el mismo patrón.
  6. El resto de `game.js` (`collide`, `rotateCW`, `tryRotate`, `merge`, `clearLines`, `LINE_SCORES`, `ghostY`, `hardDrop`, `softDrop`, `lockPiece`, `spawn`, `draw`, `drawNext`, `loop`, manejo de teclado, `postMessage`) no cambia. `drawNext` usa el mismo `SKINS[activeSkin].pieceColors` que `drawBlock` (pasa por la misma función, no se duplica lógica de color).
  7. El fork **sigue sin tocar `localStorage`**: `setTetrisSkin` solo cambia estado en memoria. La persistencia vive en el componente React (punto siguiente).
- `components/tetris-player.tsx` — **modificado**:
  - Se declara el tipo `type TetrisSkin = "clasico" | "retro" | "neon"` y se añade `setTetrisSkin?: (skin: TetrisSkin) => void` a la interfaz `Window` del bloque `declare global` existente, junto a `startTetris` / `restartTetris` / `toggleTetrisPause`.
  - Estado local `const [skin, setSkin] = useState<TetrisSkin>("clasico")`. Al montar (antes de que `handleReady` arranque el motor), se lee `localStorage.getItem("tetris-skin")`; si el valor es una de las tres claves válidas se usa como estado inicial, si no (clave ausente, valor corrupto, `localStorage` no disponible) se mantiene `"clasico"`. La lectura se envuelve en `try/catch` (Safari en modo privado puede lanzar).
  - `handleReady` (tras `window.startTetris(...)`) llama además `window.setTetrisSkin?.(skin)` para sincronizar el motor recién arrancado con la preferencia guardada, ya que el motor siempre nace en `"clasico"`.
  - Un `<select>` nativo sobre el gabinete (fuera del canvas, junto al HUD existente — mismo bloque donde hoy viven las etiquetas de puntuación/líneas/nivel), con las tres opciones (`Clásico`, `Retro`, `Neon`), estilado con las utilidades Tailwind ya usadas en el reproductor (sin CSS nuevo en `globals.css`). Visible y habilitado en cualquier fase (`playing`, `paused`, `gameover`) — se puede cambiar de skin en cualquier momento, incluida una partida en curso.
  - `onChange` del `<select>`: actualiza el estado `skin`, llama `window.setTetrisSkin?.(nuevoSkin)` y escribe `localStorage.setItem("tetris-skin", nuevoSkin)` (también envuelto en `try/catch`).
- `.claude/agents/skin-designer.md` — **modificado** (último paso del plan, tras verificar Tetris):
  - Se añade una sección/nota con el **patrón de referencia** fijado por esta spec, para que el agente lo use como plantilla al proponer (Modo A) o verificar (Modo B) skins en otros juegos jugables:
    - Estructura `SKINS`/paleta con `pieceColors` (o equivalente por juego), `grid`, `highlight`, `glow` dentro del `game.js` bifurcado/autoral.
    - Contrato `window.set<Slug>Skin(skin)`, expuesto junto a `restart<Slug>` / `toggle<Slug>Pause` y retirado en `stop()`.
    - Persistencia en `localStorage` con clave `<slug>-skin`, leída/escrita **solo desde el componente React**, nunca desde el fork del motor.
    - UI: `<select>` nativo sobre el gabinete, visible en cualquier fase de juego (cambio de skin en caliente, sin reiniciar partida).
    - Nombres de skin canónicos: `clasico` (default), `retro`, `neon`.
  - No se reescribe el resto del agente; solo se añade esta referencia.

**Out of scope (para futuras specs):**

- Aplicar skins a `asteroids`, `arkanoid` o `snake`. Cada uno necesitará su propia spec (probablemente iniciada por `skin-designer` Modo A) — esta spec solo deja el patrón documentado en el agente, no lo implementa en los otros tres.
- Un hook o componente genérico reutilizable (`useGameSkin`, `<SkinSelector>`) compartido entre juegos. Se repite el patrón manualmente en cada spec futura; extraerlo se decide más adelante si el agente lo detecta como fricción real.
- Persistir la skin usada en Supabase (por partida o por score). La preferencia es puramente de `localStorage`, sin backend.
- Cambiar el HUD React (tipografías, marco CRT, colores de los paneles) por skin. Solo cambia el dibujo dentro del canvas del tablero/next.
- Sonido, animaciones de transición entre skins, o cualquier cambio de jugabilidad.
- Tocar `THEME_COLORS`/tema claro-oscuro del sitio (`app/globals.css`, modo oscuro global): no relacionado, el sitio sigue operando solo en modo oscuro.
- Auth, identidad de jugador o cualquier cambio a `guardarPuntuacionTetris` / la política RLS de SPEC 07.
- Aplicar el mismo selector a las cuatro rutas `/jugar/*` que siguen siendo maqueta.
- Tests automatizados (no hay framework configurado).
- Editar los archivos de las SPEC 01–09 salvo lo listado en Scope.

---

## Data model

Esta feature **no crea tablas ni migraciones**. Introduce solo estructuras en código (fork del motor) y una clave de `localStorage`.

### Paletas (`public/games/tetris/game.js`)

```ts
type TetrisSkinId = "clasico" | "retro" | "neon";

type TetrisSkinDef = {
  pieceColors: [null, string, string, string, string, string, string, string]; // índice 0 sin usar, igual que COLORS hoy
  grid: string;
  highlight: string;
  glow: { blur: number; alpha: number } | null;
};

const SKINS: Record<TetrisSkinId, TetrisSkinDef> = {
  clasico: {
    pieceColors: [
      null,
      "#4dd0e1",
      "#ffd54f",
      "#ba68c8",
      "#81c784",
      "#e57373",
      "#90caf9",
      "#ffb74d",
    ],
    grid: "#22222e",
    highlight: "rgba(255,255,255,0.12)",
    glow: null,
  },
  retro: {
    pieceColors: [
      null,
      "#8bac0f",
      "#9bbc0f",
      "#556b2f",
      "#306230",
      "#7a5c1e",
      "#a67c27",
      "#4f7942",
    ],
    grid: "#0d1f0d",
    highlight: "rgba(139,172,15,0.20)",
    glow: null,
  },
  neon: {
    pieceColors: [
      null,
      "#4dd0e1",
      "#ffd54f",
      "#ba68c8",
      "#81c784",
      "#e57373",
      "#90caf9",
      "#ffb74d",
    ],
    grid: "#0a3a44",
    highlight: "rgba(255,255,255,0.28)",
    glow: { blur: 16, alpha: 0.9 },
  },
};
```

### Contrato expuesto por el fork

```ts
// Además de window.startTetris / restartTetris / toggleTetrisPause (SPEC 07):
window.setTetrisSkin?: (skin: TetrisSkinId) => void;
```

### Persistencia (solo en React, `components/tetris-player.tsx`)

- Clave: `localStorage["tetris-skin"]`
- Valor: `TetrisSkinId` como string plano (`"clasico" | "retro" | "neon"`)
- Fallback si falta, es inválido, o `localStorage` no está disponible: `"clasico"`

---

## Plan de implementación

1. **`public/games/tetris/game.js`**: reemplazar `COLORS`/`THEME_COLORS` por `SKINS` (las tres entradas definidas arriba), añadir `activeSkin` mutable inicializado en `"clasico"`, actualizar `drawBlock` (color + glow condicional con reset de `shadowBlur`) y `drawGrid` (grid/highlight) para leer de `SKINS[activeSkin]`, y exponer/retirar `window.setTetrisSkin` en el mismo punto donde se exponen/retiran `restartTetris`/`toggleTetrisPause`. El sistema queda funcional y probable manualmente cambiando `activeSkin` desde la consola antes de tocar React.
2. **`components/tetris-player.tsx`**: añadir el tipo `TetrisSkin` y la declaración de `window.setTetrisSkin` al bloque `declare global`; estado `skin` inicializado desde `localStorage` (con `try/catch` y fallback `"clasico"`); sincronizar el motor en `handleReady`; añadir el `<select>` nativo con las tres opciones sobre el gabinete; `onChange` actualiza estado + motor + `localStorage`.
3. **Verificación manual en navegador**: iniciar partida, cambiar entre las tres skins durante el juego (jugando y en pausa) y confirmar que el tablero, la pieza actual y la pieza siguiente cambian de paleta/efecto sin reiniciar `score`/`lines`/`level`/posición de las piezas; recargar la página y confirmar que la skin elegida persiste.
4. **`.claude/agents/skin-designer.md`**: añadir la sección de patrón de referencia descrita en Scope, citando esta spec como origen.
5. **Invocar al agente `skin-designer` en Modo B** contra `components/tetris-player.tsx` + `public/games/tetris/game.js` para verificar de forma independiente que el selector funciona de verdad en código (no solo que la spec lo describe), y dejar la entrada correspondiente en `.claude/skin-designer/registro-skins.md`.

---

## Criterios de aceptación

- [ ] `/jugar/tetris` muestra un `<select>` con las opciones Clásico, Retro y Neon, con Clásico como valor inicial cuando no hay preferencia guardada.
- [ ] Cambiar la selección durante una partida en curso (fase `playing` o `paused`) cambia la paleta/efecto del tablero y del panel "next" en el siguiente frame, sin reiniciar `score`, `lines`, `level` ni el estado de las piezas.
- [ ] La skin `neon` dibuja un glow visible (`shadowBlur`) alrededor de los bloques; `clasico` y `retro` no tienen glow.
- [ ] La skin `retro` usa una paleta visualmente distinta (verde/ámbar desaturado) a la de `clasico`/`neon`.
- [ ] La elección de skin persiste en `localStorage["tetris-skin"]` y se restaura al recargar `/jugar/tetris`.
- [ ] Si `localStorage` no está disponible o el valor guardado es inválido, el reproductor arranca en `"clasico"` sin lanzar error.
- [ ] `npm run build` pasa sin errores de tipos ni de lint.
- [ ] El resto del comportamiento de Tetris (controles, pausa con `P`, guardado real de puntuación vía `guardarPuntuacionTetris`, `GameOverModal`) no cambia.
- [ ] `.claude/agents/skin-designer.md` incluye la sección de patrón de referencia de esta spec.
- [ ] El agente `skin-designer` fue invocado en Modo B sobre el resultado y su veredicto quedó registrado en `.claude/skin-designer/registro-skins.md`.

---

## Decisiones tomadas y descartadas

- **Cambio de skin en caliente (sin reiniciar partida) — elegido** sobre exigir reinicio: el usuario lo pidió explícitamente; técnicamente es barato porque `draw()` ya corre cada frame y solo hace falta que lea una variable mutable en vez de una constante.
- **`<select>` nativo — elegido** sobre pills/botones custom: más simple de implementar y de estilar sin CSS nuevo; el usuario lo prefirió explícitamente sobre la opción de pills.
- **Clave de `localStorage` por juego (`tetris-skin`) — elegida** sobre una clave global compartida (`arcade-skin`): evita acoplar la preferencia de Tetris a la de otros juegos antes de que existan, y es el patrón que se documenta para que los demás repitan (`<slug>-skin`), no una clave que fuerza el mismo valor en todos.
- **`clasico` reutiliza los valores actuales de `COLORS`/`THEME_COLORS.dark` tal cual — elegido** sobre redefinir las tres paletas desde cero: minimiza el riesgo de regresión visual en el modo por defecto, que es el que ya está en producción.
- **`neon` reutiliza los mismos `pieceColors` que `clasico` y solo añade glow — elegido** sobre una paleta de color distinta para neon: mantiene la asociación de color por tipo de pieza consistente entre ambas skins más cercanas visualmente, y aísla el efecto de glow como la única variable nueva.
- **Persistencia de la skin en `localStorage` únicamente — elegido** sobre guardarla en Supabase junto al score: no hay necesidad de que la skin sea visible para otros jugadores ni de que sobreviva a un cambio de navegador; añadir columnas/migraciones para esto se descarta por ahora.
- **El fork (`game.js`) sigue sin tocar `localStorage` — elegido**, igual que SPEC 07 (Cambio 3): toda la persistencia vive en React, el motor solo expone `setTetrisSkin` en memoria.
- **Alcance limitado a Tetris; el patrón se traslada a otros juegos vía `.claude/agents/skin-designer.md`, no implementándolo aquí — elegido** por decisión explícita del usuario: la spec cierra actualizando el agente y corriendo su Modo B sobre Tetris, no extendiendo el selector a `asteroids`/`arkanoid`/`snake`.

---

## Riesgos identificados

- **Costo de `ctx.shadowBlur` por frame.** Dibujar hasta ~200 bloques (tablero 10×20) con `shadowBlur` activo en la skin `neon` puede impactar el rendimiento en dispositivos de gama baja, ya que `shadowBlur` es una de las operaciones más caras de Canvas 2D. Mitigación dentro de esta spec: mantener el `blur` moderado (16px) y resetear `shadowBlur = 0` fuera de los bloques (no aplicarlo a `drawGrid` ni al texto). Si en la verificación manual se nota lag perceptible, ajustar el valor de `blur` antes de cerrar la spec; una optimización mayor (p. ej. pre-renderizar bloques con glow a un canvas offscreen) queda fuera de alcance.
