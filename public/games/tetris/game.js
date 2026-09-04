"use strict";

// Fork de resources/started-games/03-claude-tetris/game.js
// Cambio 1: el cuerpo del juego se envuelve en startTetris(boardEl, nextEl),
//   expuesta como window.startTetris. Ya no arranca solo al cargar el script; la
//   invoca el componente React con los dos <canvas> ya montados y devuelve un
//   stop() que cancela el requestAnimationFrame y quita el listener de teclado
//   registrado aquí.
// Cambio 2: fuera el HUD del DOM (#score, #lines, #level, #overlay, #restart-btn,
//   #theme-toggle). updateHUD() ya no escribe textContent; endGame() y
//   togglePause() ya no muestran #overlay. El estado viaja por postMessage
//   (cambio 4, se añade en el paso 4).
// Cambio 3: fuera el tema propio (applyTheme, THEME_KEY, localStorage,
//   #theme-toggle). El fork no toca document.documentElement ni localStorage.
// SPEC 10 (skins): THEME_COLORS/COLORS se sustituyen por SKINS (clasico/retro/
//   neon). activeSkin es una variable mutable en memoria; window.setTetrisSkin
//   la reasigna. La persistencia en localStorage vive solo en React
//   (components/tetris-player.tsx), el fork nunca la toca.
// El resto de game.js (collide, rotateCW, tryRotate, merge, clearLines,
// LINE_SCORES, ghostY, hardDrop, softDrop, lockPiece, spawn, draw, drawGrid,
// drawNext, loop y su temporización) no se toca.

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

// SPEC 10: SKINS sustituye a COLORS/THEME_COLORS. Cada entrada define la
// paleta de piezas y el aspecto del tablero para una skin seleccionable.
const SKINS = {
  clasico: {
    pieceColors: [
      null,
      "#4dd0e1", // I - cyan
      "#ffd54f", // O - yellow
      "#ba68c8", // T - purple
      "#81c784", // S - green
      "#e57373", // Z - red
      "#90caf9", // J - pale blue
      "#ffb74d", // L - orange
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

const PIECES = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
];

const LINE_SCORES = [0, 100, 300, 500, 800];

function startTetris(boardEl, nextEl) {
  const canvas = boardEl;
  const ctx = canvas.getContext("2d");
  const nextCanvas = nextEl;
  const nextCtx = nextCanvas.getContext("2d");

  // SPEC 10: skin activa, mutable en memoria. window.setTetrisSkin la
  // reasigna; draw() la lee en cada frame, así el cambio se refleja sin
  // reiniciar la partida.
  let activeSkin = "clasico";

  let board,
    current,
    next,
    score,
    lines,
    level,
    paused,
    gameOver,
    lastTime,
    dropAccum,
    dropInterval,
    animId;

  // Cambio 4: emisión de estado hacia la ventana vía postMessage, con chequeo
  // sucio barato: solo se emite si score / lines / level o la fase derivada
  // cambiaron respecto a lo último emitido. Emisor y receptor están en la misma
  // ventana; se usa window.location.origin por portabilidad futura (igual que
  // SPEC 05). La fase no existe como variable: se deriva de gameOver / paused.
  let lastEmitted = null;

  function currentPhase() {
    return gameOver ? "gameover" : paused ? "paused" : "playing";
  }

  function emitState() {
    const phase = currentPhase();
    if (
      lastEmitted &&
      lastEmitted.score === score &&
      lastEmitted.lines === lines &&
      lastEmitted.level === level &&
      lastEmitted.phase === phase
    )
      return;
    lastEmitted = { score, lines, level, phase };
    window.postMessage(
      { source: "tetris", type: "state", score, lines, level, phase },
      window.location.origin,
    );
  }

  function createBoard() {
    return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  }

  function randomPiece() {
    const type = Math.floor(Math.random() * 7) + 1;
    const shape = PIECES[type].map((row) => [...row]);
    return {
      type,
      shape,
      x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
      y: 0,
    };
  }

  function collide(shape, ox, oy) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = ox + c;
        const ny = oy + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }

  function rotateCW(shape) {
    const rows = shape.length,
      cols = shape[0].length;
    const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
    return result;
  }

  function tryRotate() {
    const rotated = rotateCW(current.shape);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!collide(rotated, current.x + kick, current.y)) {
        current.shape = rotated;
        current.x += kick;
        return;
      }
    }
  }

  function merge() {
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          board[current.y + r][current.x + c] = current.shape[r][c];
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((v) => v !== 0)) {
        board.splice(r, 1);
        board.unshift(new Array(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      lines += cleared;
      score += (LINE_SCORES[cleared] || 0) * level;
      level = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(100, 1000 - (level - 1) * 90);
      updateHUD();
    }
  }

  function ghostY() {
    let gy = current.y;
    while (!collide(current.shape, current.x, gy + 1)) gy++;
    return gy;
  }

  function hardDrop() {
    const gy = ghostY();
    score += (gy - current.y) * 2;
    current.y = gy;
    lockPiece();
  }

  function softDrop() {
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
      score += 1;
      updateHUD();
    } else {
      lockPiece();
    }
  }

  function lockPiece() {
    merge();
    clearLines();
    spawn();
  }

  function spawn() {
    current = next;
    next = randomPiece();
    if (collide(current.shape, current.x, current.y)) {
      endGame();
    }
    drawNext();
  }

  // Cambio 2/4: el HUD vive en React. updateHUD() ya no escribe en el DOM; ahora
  // emite el estado actual (score / lines / level / phase) hacia la ventana.
  function updateHUD() {
    emitState();
  }

  function drawBlock(context, x, y, colorIndex, size, alpha) {
    if (!colorIndex) return;
    const skin = SKINS[activeSkin];
    const color = skin.pieceColors[colorIndex];
    context.globalAlpha = alpha ?? 1;
    context.fillStyle = color;
    if (skin.glow) {
      context.shadowColor = color;
      context.shadowBlur = skin.glow.blur;
      context.globalAlpha = alpha ?? skin.glow.alpha;
    }
    context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
    context.shadowBlur = 0;
    context.globalAlpha = alpha ?? 1;
    // highlight
    context.fillStyle = skin.highlight;
    context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
    context.globalAlpha = 1;
  }

  function drawGrid() {
    ctx.strokeStyle = SKINS[activeSkin].grid;
    ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * BLOCK, 0);
      ctx.lineTo(c * BLOCK, ROWS * BLOCK);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * BLOCK);
      ctx.lineTo(COLS * BLOCK, r * BLOCK);
      ctx.stroke();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();

    // board
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) drawBlock(ctx, c, r, board[r][c], BLOCK);

    // ghost
    const gy = ghostY();
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          drawBlock(
            ctx,
            current.x + c,
            gy + r,
            current.shape[r][c],
            BLOCK,
            0.2,
          );

    // current piece
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          drawBlock(
            ctx,
            current.x + c,
            current.y + r,
            current.shape[r][c],
            BLOCK,
          );
  }

  function drawNext() {
    const NB = 30;
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    const shape = next.shape;
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = Math.floor((4 - shape.length) / 2);
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
  }

  // Cambio 2/4: endGame() ya no muestra #overlay; emite el estado final y, al
  // entrar en gameOver, además un mensaje type:"gameover" con la puntuación.
  function endGame() {
    gameOver = true;
    cancelAnimationFrame(animId);
    emitState();
    window.postMessage(
      { source: "tetris", type: "gameover", score },
      window.location.origin,
    );
  }

  // Cambio 2/4: togglePause() ya no muestra #overlay; la fase "paused" viaja en
  // el mensaje de estado que se emite tras alternar.
  function togglePause() {
    if (gameOver) return;
    paused = !paused;
    if (!paused) {
      lastTime = performance.now();
      loop(lastTime);
    } else {
      cancelAnimationFrame(animId);
    }
    emitState();
  }

  function loop(ts) {
    if (paused || gameOver) return;
    const dt = ts - lastTime;
    lastTime = ts;
    dropAccum += dt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(current.shape, current.x, current.y + 1)) {
        current.y++;
      } else {
        lockPiece();
      }
    }
    draw();
    animId = requestAnimationFrame(loop);
  }

  function init() {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    paused = false;
    gameOver = false;
    dropInterval = 1000;
    dropAccum = 0;
    lastTime = performance.now();
    next = randomPiece();
    spawn();
    updateHUD();
    cancelAnimationFrame(animId);
    animId = requestAnimationFrame(loop);
  }

  // Cambio 1: el listener keydown se registra sobre document dentro de
  // startTetris (se quita en stop()). El switch (mover, rotar con ↑/X, soft drop,
  // hard drop, pausa con P) no cambia.
  // Cambio 5: preventDefault para flechas, Space y KeyP, para que la página no
  // haga scroll mientras se juega.
  const HANDLED_KEYS = [
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Space",
    "KeyP",
  ];

  function handleKeyDown(e) {
    if (HANDLED_KEYS.includes(e.code)) e.preventDefault();
    if (e.code === "KeyP") {
      togglePause();
      return;
    }
    if (paused || gameOver) return;
    switch (e.code) {
      case "ArrowLeft":
        if (!collide(current.shape, current.x - 1, current.y)) current.x--;
        break;
      case "ArrowRight":
        if (!collide(current.shape, current.x + 1, current.y)) current.x++;
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate();
        break;
      case "Space":
        e.preventDefault();
        hardDrop();
        break;
    }
    updateHUD();
  }

  document.addEventListener("keydown", handleKeyDown);
  init();

  // Cambio 6: reinicio programático desde React ("Jugar de nuevo"). init() ya
  // reinicializa tablero / score / lines / level y cancela el rAF previo, sin
  // recrear los <canvas>.
  window.restartTetris = init;

  // Cambio 7: pausa programática para el botón "Pausa" del control deck. La
  // tecla P sigue alternando pausa igual que hoy.
  window.toggleTetrisPause = togglePause;

  // SPEC 10: cambio de skin en caliente desde React. Mientras se juega,
  // draw() ya corre en cada frame del rAF y leería activeSkin solo; pero en
  // pausa loop() no llama a draw() (ver togglePause/loop), y drawNext() solo
  // se invoca desde spawn(). Se fuerzan ambos redibujados aquí para que el
  // tablero y el panel "next" reflejen la skin nueva de inmediato en
  // cualquier fase (jugando o en pausa), sin esperar al siguiente evento.
  function setSkin(skin) {
    if (!SKINS[skin]) return;
    activeSkin = skin;
    draw();
    drawNext();
  }
  window.setTetrisSkin = setSkin;

  // Cambio 1: stop() cancela el requestAnimationFrame en curso, quita el listener
  // de teclado que registró este arranque y elimina las funciones expuestas.
  return function stop() {
    cancelAnimationFrame(animId);
    document.removeEventListener("keydown", handleKeyDown);
    if (window.restartTetris === init) delete window.restartTetris;
    if (window.toggleTetrisPause === togglePause)
      delete window.toggleTetrisPause;
    if (window.setTetrisSkin === setSkin) delete window.setTetrisSkin;
  };
}

window.startTetris = startTetris;
