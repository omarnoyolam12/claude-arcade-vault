# Registro de skins — skin-designer

Memoria persistente del agente `skin-designer`. **Se lee entero antes de cada análisis y se
anexa al final de cada uno.** No repetir una propuesta o verificación ya registrada para el
mismo juego sin justificarlo.

## Índice

| Fecha      | Juego   | Modo | Veredicto | Estado                        |
| ---------- | ------- | ---- | --------- | ----------------------------- |
| 2026-09-04 | Tetris  | B    | Pasa      | Implementado y verificado     |
| 2026-09-14 | Frogger | B    | No pasa   | Verificado — brecha pendiente |

## Formato de entrada

## AAAA-MM-DD — <Juego> (Modo A|B)

- **Modo:** A (Diseño) | B (Verificación)
- **Veredicto:** <para Modo A: Propuesta lista> | <para Modo B: Pasa | No pasa — <qué falta>>
- **Skins propuestas/encontradas:** Neon (<paleta/nota>), Retro (<paleta/nota>), Clásico (<paleta/nota>)
- **Riesgos técnicos:** <opcional>
- **Estado:** Propuesto | Spec recomendada (`/spec`) | Spec redactada (`specs/NN-...`) | Implementado y verificado | Verificado — brecha pendiente
- **Notas:** <opcional>

---

## Entradas

## 2026-09-04 — Tetris (Modo B)

- **Modo:** B (Verificación)
- **Veredicto:** Pasa
- **Skins propuestas/encontradas:**
  - Clásico (`SKINS.clasico` en `public/games/tetris/game.js:30-44`): reutiliza los 7 `pieceColors` originales (`#4dd0e1`, `#ffd54f`, `#ba68c8`, `#81c784`, `#e57373`, `#90caf9`, `#ffb74d`), `grid: "#22222e"`, `highlight: "rgba(255,255,255,0.12)"`, `glow: null`.
  - Retro (`SKINS.retro`, líneas 45-59): paleta 8-bit desaturada verde/ámbar (`#8bac0f`, `#9bbc0f`, `#556b2f`, `#306230`, `#7a5c1e`, `#a67c27`, `#4f7942`), `grid: "#0d1f0d"`, `highlight: "rgba(139,172,15,0.20)"`, `glow: null`. Visualmente distinta de clásico y neon a simple vista (monocromo verde vs. paleta arcoíris saturada).
  - Neon (`SKINS.neon`, líneas 60-75): mismos `pieceColors` que clásico (asociación de color por pieza intacta) pero `grid: "#0a3a44"`, `highlight: "rgba(255,255,255,0.28)"` y `glow: { blur: 16, alpha: 0.9 }`, único que activa `ctx.shadowBlur`.
- **Evidencia de verificación:**
  1. **Selector real en UI:** `components/tetris-player.tsx:199-212` renderiza un `<select id="tetris-skin-select">` con las 3 opciones (`SKIN_OPTIONS`, líneas 33-37: Clásico/Retro/Neon), siempre visible en el HUD sobre el gabinete, sin condicionar por fase de juego.
  2. **Contrato del motor:** `public/games/tetris/game.js:493-499` define `setSkin(skin)` que valida `SKINS[skin]` antes de reasignar `activeSkin`, y lo expone como `window.setTetrisSkin`. `drawBlock` (líneas 289-307) y `drawGrid` (líneas 309-324) leen `SKINS[activeSkin]` en vez de las antiguas constantes `COLORS`/`THEME_COLORS`; el glow solo se activa `if (skin.glow)` y se resetea (`shadowBlur = 0`) tras cada bloque, confirmando que clásico/retro no tienen glow y neon sí.
  3. **Redibujado inmediato, incluida pausa:** `setSkin` (líneas 493-498) llama explícitamente a `draw()` y `drawNext()` tras reasignar `activeSkin`, exactamente el matiz de la brecha anticipada en la plantilla del agente — confirmado en el código, no solo delegado al loop de `rAF` (que no corre en pausa, ver `togglePause`/`loop` líneas 386-413).
  4. **Persistencia solo en React:** `game.js` no referencia `localStorage` en ningún punto. `components/tetris-player.tsx` define `readStoredSkin()` (líneas 43-50, con `try/catch` y fallback a `"clasico"` si la clave falta, el valor es inválido o `localStorage` no está disponible) y `handleSkinChange` (líneas 106-115) que escribe `localStorage.setItem("tetris-skin", ...)` también con `try/catch`. `handleReady` (líneas 92-104) sincroniza el motor recién arrancado con `window.setTetrisSkin?.(skin)`, ya que el fork siempre nace en `"clasico"`.
  5. **`stop()` retira el contrato limpiamente:** línea 509, `if (window.setTetrisSkin === setSkin) delete window.setTetrisSkin`, mismo patrón que `restartTetris`/`toggleTetrisPause`.
  6. **Contrato de puntuación intacto:** `postMessage` (`emitState`, líneas 153-168) y `guardarPuntuacionTetris` (`components/tetris-player.tsx:283`) no fueron tocados por el cambio de skin; el `GameOverModal` sigue recibiendo `finalScore`/`onSave` sin alteración.
- **Riesgos técnicos:** el propio `game.js` documenta (comentario líneas 15-18 y SPEC 10 "Riesgos identificados") el costo de `ctx.shadowBlur` en la skin neon sobre ~200 bloques; mitigado con `blur: 16` moderado y reseteo fuera de los bloques. No se detectó otro riesgo sobre el contrato `window.start<Slug>`/`stop()`/`postMessage`.
- **Estado:** Implementado y verificado
- **Notas:** Primer juego jugable con sistema de skins real del catálogo (patrón de referencia para `asteroids`, `arkanoid`, `snake`, documentado en `.claude/agents/skin-designer.md`). Confirmado que `.claude/agents/skin-designer.md` ya incluye la sección "Patrón de referencia (SPEC 10 — Tetris)" citada como origen.

## 2026-09-14 — Frogger (Modo B)

- **Modo:** B (Verificación)
- **Veredicto:** No pasa — el sistema de skins simplemente no existe todavía; ni selector en la UI, ni parámetro de skin en el motor, ni una segunda paleta en ningún lado del fork.
- **Skins propuestas/encontradas:** Ninguna. Solo hay una paleta fija (la "clásica" de facto):
  - `public/games/frogger/game.js:336-341` — `COLOR_FILA` (`casas: "#0a1f14"`, `rio: "#052033"`, `segura: "#0a0a12"`, `carretera: "#150a1f"`), constante única, sin variantes.
  - `public/games/frogger/game.js:362-366` — `COLOR_ENTIDAD` (`coche: "#ff3d81"`, `tronco: "#a9662b"`, `tortuga: "#31d977"`), también constante única.
  - Rana (`dibujarRana`, línea 417-423) y casas ocupadas (`dibujarCasas`, línea 402-415) usan el hex `#8affc1` embebido directamente en las llamadas a `ctx.fillStyle`, ni siquiera extraído a una constante nombrada.
- **Evidencia de la brecha (contraste directo con el patrón de Tetris, SPEC 10):**
  1. **Sin mapa de skins en el motor.** No existe ningún equivalente a `SKINS = { clasico, retro, neon }` en `public/games/frogger/game.js`. `COLOR_FILA`/`COLOR_ENTIDAD` son objetos planos de un solo nivel, no un mapa de paletas.
  2. **Sin contrato `window.setFroggerSkin`.** El bloque de funciones globales expuestas (líneas 476-488: `window.restartFrogger`, `window.toggleFroggerPause`, y su limpieza en `stop()`) no incluye ningún setter de skin. `dibujar()` (línea 436-442) llama directamente a `dibujarFondo`/`dibujarCasas`/`dibujarFilasPeligro`/`dibujarRana`/`dibujarTemporizador` sin indirección de paleta activa.
  3. **Sin `<select>` en el HUD.** `components/frogger-player.tsx` no tiene ningún `<select>`, `SKIN_OPTIONS`, `readStoredSkin`, ni referencia a `localStorage` con clave `frogger-skin`. El HUD (líneas 121-165) solo muestra jugador, puntuación, casas, vidas y nivel; no hay ningún control de personalización visual en el "control deck" ni sobre el gabinete.
  4. **Sin persistencia.** No hay lectura/escritura de `localStorage` en ningún punto del componente (a diferencia de `readStoredSkin`/`handleSkinChange` en `tetris-player.tsx`).
  5. Confirmado además contra el catálogo (`supabase/migrations/0001_create_games.sql`) y `lib/games.ts`: ninguno de los dos define ni ha definido nunca un campo de skin/tema por juego, así que tampoco hay una fuente de verdad de catálogo que el reproductor pudiera estar leyendo en su lugar.
- **Riesgos técnicos:** ninguno nuevo que señalar sobre el contrato `window.startFrogger`/`stop()`/`postMessage` — está intacto y no se tocó nada; el riesgo es puramente de alcance (la spec de portado, `specs/game-jam/frogger/01-frogger-jugable.md`, es de tipo `/juego-jugable` y nunca prometió skins, así que la brecha es esperable, no un bug de implementación).
- **Estado:** Verificado — brecha pendiente
- **Notas:** Recomendado abrir una spec de skins específica para Frogger, calcada del patrón SPEC 10 — Tetris: un mapa `SKINS = { clasico, retro, neon }` en `game.js` con paleta por fila (`casas`/`rio`/`segura`/`carretera`) y por entidad (`coche`/`tronco`/`tortuga`) más color de rana/casas ocupadas, un `window.setFroggerSkin(skin)` que fuerce `dibujar()` inmediatamente (incluida pausa, igual que el matiz documentado para Tetris), y un `<select>` en `components/frogger-player.tsx` con persistencia en `localStorage["frogger-skin"]`. Como Frogger no usa sprites ni spritesheet (todo es `ctx.fillRect`/`ctx.arc`), el patrón de Tetris aplica casi sin fricción; no se detectó necesidad de Modo A por separado — la propuesta de diseño puede vivir directamente en la spec `/spec` recomendada.
