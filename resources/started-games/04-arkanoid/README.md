# Juego Arkanoid

Juego de Arkanoid/Breakout jugable en el navegador, escrito en **HTML + CSS + JavaScript puro, cero dependencias**.

## Cómo jugar

Los módulos ES no funcionan al abrir el archivo con `file://`, así que hay que servirlo:

```bash
python3 -m http.server
```

Luego abre `http://localhost:8000` en el navegador.

## Controles

- **Mover paddle:** flechas ← →, teclas `A` / `D`, o el ratón sobre el canvas.
- **Lanzar la bola / confirmar en menús:** `Espacio` (también `Enter` o clic en los menús).
- **Navegar menús:** flechas ↑ ↓.
- **Pausa rápida:** `P` (overlay; `P` reanuda, `Esc` abre el menú de pausa).
- **Menú de pausa:** `Esc` (opciones *Continuar* / *Menú principal*; `P` o `Esc` reanudan).

## Funcionalidades

- Tres niveles con bloques de 7 colores y puntuación por color, velocidad de bola creciente por nivel.
- Rebotes en paredes, paddle (con efecto según el punto de impacto) y bloques.
- Vidas, puntuación y **highscore** persistido en `localStorage`.
- Animación de explosión al romper cada bloque y sonidos de rebote/rotura.
- Menú de inicio **Nueva partida / Reanudar** y pantalla de fin que vuelve al menú.
- **Guardado de partida** en `localStorage` al pausar: *Reanudar* reconstruye el nivel con los bloques ya rotos y restaura puntuación, vidas y velocidad. El guardado se consume al reanudar y se borra al empezar una nueva partida o al terminar.

## Estructura

- `index.html`, `styles.css` — página y canvas 800×600.
- `assets/` — spritesheet (`spritesheet-breakout.png` + `spritesheet.js`) y sonidos.
- `js/` — código del juego en módulos ES:
  - `main.js` — bucle, máquina de estados y orquestación.
  - `state.js` — estado global y constantes.
  - `levels.js` — layouts de los niveles y tabla de puntuación.
  - `entities.js` — paddle, bola y rejilla de bloques.
  - `collisions.js` — rebotes y caída de la bola.
  - `effects.js` — animación de explosión de bloques.
  - `input.js` — teclado y ratón.
  - `hud.js` — HUD de juego y textos de inicio/fin.
  - `menu.js` — layout, hit-test y dibujo de los menús y overlays de pausa.
  - `storage.js` — persistencia de highscore y de la partida guardada.
  - `audio.js` — carga y reproducción de sonidos.
- `specs/` — especificaciones del método spec-driven.

## Desarrollo

El desarrollo sigue el método spec-driven con las skills `/spec` y `/spec-impl`; ver `CLAUDE.md`.
