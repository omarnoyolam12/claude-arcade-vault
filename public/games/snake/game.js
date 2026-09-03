"use strict";

// Snake de cuadrícula escrito desde cero para Arcade Vault (SPEC 09).
// No hay juego starter que bifurcar: solo los assets de resources/snake-assets/
// (fruits.png + sprites.js, que expone window.SPRITE_ATLAS).
//
// Contrato, calcado de asteroids/tetris/arkanoid:
//   window.startSnake(canvasEl)  → arranca el juego sobre ese <canvas> y
//                                  devuelve un stop() que cancela el rAF y quita
//                                  el listener de teclado.
//   window.restartSnake()        → (se expone en un paso posterior)
//   window.toggleSnakePause()    → (se expone en un paso posterior)
//
// PASO 2 — esqueleto: malla, serpiente que avanza sola con acumulador de tiempo,
// carga asíncrona de fruits.png (el bucle no avanza hasta img.onload) y una
// fruta dibujada con un recorte aleatorio del atlas. Reglas de juego (comer,
// crecer, puntuar, morir), emisión de estado y reinicio/pausa llegan después.

function startSnake(canvasEl) {
  const canvas = canvasEl;
  const ctx = canvas.getContext("2d");

  // ── Malla ───────────────────────────────────────────────────────────────────
  const W = 800;
  const H = 600;
  const CELL = 40;
  const COLS = W / CELL; // 20
  const ROWS = H / CELL; // 15

  // ── Estado ──────────────────────────────────────────────────────────────────
  let serpiente; // array de celdas { x, y }; la cabeza es el índice 0
  let dir; // dirección aplicada en el último paso { x, y }
  let dirDeseada; // giro pendiente del jugador; se aplica un único giro por paso
  let fruta; // { celda: { x, y }, sprite: { x, y, w, h } }
  let tickMs; // ms entre pasos de la serpiente
  let score; // puntuación acumulada (entero)
  let frutas; // frutas comidas (entero)
  let nivel; // 1..n, = floor(frutas / 5) + 1
  let muerto; // true cuando la serpiente choca con un muro o consigo misma
  let pausado = false; // se alterna desde el Paso 5 (tecla P / toggleSnakePause)
  let lastEmitted = null; // último estado emitido (chequeo sucio de emitState)

  const FRUTAS = Object.values(window.SPRITE_ATLAS.fruits); // los 22 recortes

  function celdaLibre() {
    let c;
    do {
      c = {
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS),
      };
    } while (serpiente.some((s) => s.x === c.x && s.y === c.y));
    return c;
  }

  function colocarFruta() {
    fruta = {
      celda: celdaLibre(),
      sprite: FRUTAS[Math.floor(Math.random() * FRUTAS.length)],
    };
  }

  function iniciar() {
    const cx = Math.floor(COLS / 2);
    const cy = Math.floor(ROWS / 2);
    serpiente = [
      { x: cx, y: cy },
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy },
    ];
    dir = { x: 1, y: 0 };
    dirDeseada = { x: 1, y: 0 };
    tickMs = 140;
    score = 0;
    frutas = 0;
    nivel = 1;
    muerto = false;
    lastEmitted = null;
    colocarFruta();
  }

  // ── Emisión de estado hacia la ventana ──────────────────────────────────────
  // Mismo canal y filtros que asteroids/tetris/arkanoid. Chequeo sucio barato:
  // solo se emite si score / length / level / phase cambiaron. Al entrar en
  // "gameover" se emite además un mensaje type:"gameover" con la puntuación final.
  function faseActual() {
    return muerto ? "gameover" : pausado ? "paused" : "playing";
  }

  function emitState() {
    const length = serpiente.length;
    const phase = faseActual();

    if (
      lastEmitted &&
      lastEmitted.score === score &&
      lastEmitted.length === length &&
      lastEmitted.level === nivel &&
      lastEmitted.phase === phase
    )
      return;

    const entroEnGameOver =
      phase === "gameover" &&
      (!lastEmitted || lastEmitted.phase !== "gameover");
    lastEmitted = { score, length, level: nivel, phase };

    window.postMessage(
      { source: "snake", type: "state", score, length, level: nivel, phase },
      window.location.origin,
    );

    if (entroEnGameOver)
      window.postMessage(
        { source: "snake", type: "gameover", score },
        window.location.origin,
      );
  }

  // ── Paso de simulación ──────────────────────────────────────────────────────
  // Aplica el giro pendiente (uno por paso), avanza la cabeza, resuelve muerte
  // (muro o cola) y, si come, crece + puntúa + sube de nivel.
  function paso() {
    dir = dirDeseada;

    const cabeza = {
      x: serpiente[0].x + dir.x,
      y: serpiente[0].y + dir.y,
    };

    const fueraDeLaMalla =
      cabeza.x < 0 || cabeza.x >= COLS || cabeza.y < 0 || cabeza.y >= ROWS;
    // La cola (último segmento) se libera en este paso salvo que se coma, así
    // que chocar contra ella no cuenta.
    const chocaConsigoMisma = serpiente
      .slice(0, -1)
      .some((s) => s.x === cabeza.x && s.y === cabeza.y);

    if (fueraDeLaMalla || chocaConsigoMisma) {
      muerto = true;
      return;
    }

    serpiente.unshift(cabeza);

    if (fruta && cabeza.x === fruta.celda.x && cabeza.y === fruta.celda.y) {
      frutas++;
      nivel = Math.floor(frutas / 5) + 1;
      score += 10 * nivel;
      tickMs = Math.max(60, 140 - (nivel - 1) * 20);
      colocarFruta();
      // no se hace pop: la serpiente crece un segmento
    } else {
      serpiente.pop();
    }
  }

  // ── Input ───────────────────────────────────────────────────────────────────
  // Cada flecha guarda un giro deseado, rechazando el reverso exacto de la
  // dirección ya aplicada. paso() consume dirDeseada una sola vez, así que dos
  // teclas en el mismo tick no encadenan un giro de 180°. El listener se registra
  // sobre window y se quita en stop().
  function girar(nx, ny) {
    if (nx === -dir.x && ny === -dir.y) return; // reverso exacto: ignorado
    dirDeseada = { x: nx, y: ny };
  }

  function onKeyDown(e) {
    switch (e.code) {
      case "ArrowUp":
        girar(0, -1);
        e.preventDefault();
        break;
      case "ArrowDown":
        girar(0, 1);
        e.preventDefault();
        break;
      case "ArrowLeft":
        girar(-1, 0);
        e.preventDefault();
        break;
      case "ArrowRight":
        girar(1, 0);
        e.preventDefault();
        break;
      case "Space":
        e.preventDefault();
        break;
      case "KeyP":
        alternarPausa();
        break;
    }
  }

  // Alterna playing ↔ paused. Fuera de una partida activa (muerto) es no-op. El
  // acumulador de tiempo no crece mientras pausado (el bloque que lo incrementa
  // está guardado por !pausado), así que la serpiente no avanza ni acelera al
  // reanudar. La expone window.toggleSnakePause para el botón "Pausa" del deck.
  function alternarPausa() {
    if (muerto) return;
    pausado = !pausado;
  }

  // ── Dibujo ──────────────────────────────────────────────────────────────────
  function dibujarFondo() {
    ctx.fillStyle = "#05140b";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(99, 247, 255, 0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= COLS; x++) {
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, H);
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(W, y * CELL);
    }
    ctx.stroke();
  }

  function dibujarCargando() {
    dibujarFondo();
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.font = "20px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Cargando…", W / 2, H / 2);
  }

  function dibujarSerpiente() {
    for (let i = 0; i < serpiente.length; i++) {
      const s = serpiente[i];
      ctx.fillStyle = i === 0 ? "#8affc1" : "#31d977";
      ctx.fillRect(s.x * CELL + 2, s.y * CELL + 2, CELL - 4, CELL - 4);
    }
  }

  function dibujarFruta() {
    if (!fruta) return;
    const sp = fruta.sprite;
    ctx.drawImage(
      img,
      sp.x,
      sp.y,
      sp.w,
      sp.h,
      fruta.celda.x * CELL,
      fruta.celda.y * CELL,
      CELL,
      CELL,
    );
  }

  function dibujar() {
    if (!imagenLista) {
      dibujarCargando();
      return;
    }
    dibujarFondo();
    dibujarFruta();
    dibujarSerpiente();
  }

  // ── Bucle principal ─────────────────────────────────────────────────────────
  // Acumulador de tiempo: la serpiente avanza una celda cada tickMs; entre pasos
  // el bucle solo repinta. El acumulador no corre hasta que la imagen cargó.
  let rafId = null;
  let ultimoTs = null;
  let acumulador = 0;
  let detenido = false;

  function loop(ts) {
    if (detenido) return;
    const dt = ultimoTs === null ? 0 : Math.min(ts - ultimoTs, 100);
    ultimoTs = ts;

    if (imagenLista && !muerto && !pausado) {
      acumulador += dt;
      while (acumulador >= tickMs) {
        acumulador -= tickMs;
        paso();
        if (muerto) break;
      }
    }

    emitState();
    dibujar();
    rafId = requestAnimationFrame(loop);
  }

  // ── Carga de la comida ──────────────────────────────────────────────────────
  // sprites.js trae sources.fruits como ruta relativa ('snake-assets/fruits.png')
  // que no resuelve servida desde /games/snake/: se fija la ruta absoluta aquí.
  const img = new Image();
  let imagenLista = false;
  img.onload = function () {
    if (detenido) return;
    imagenLista = true;
  };
  img.src = "/games/snake/fruits.png";

  // ── Arranque ────────────────────────────────────────────────────────────────
  iniciar();
  window.addEventListener("keydown", onKeyDown);
  rafId = requestAnimationFrame(loop);

  // Llamadas directas React → juego mientras hay partida activa (no son
  // mensajes). "Jugar de nuevo" reinicia el motor sin recrear el <canvas>; el
  // botón "Pausa" del control deck alterna igual que la tecla P.
  window.restartSnake = iniciar;
  window.toggleSnakePause = alternarPausa;

  // stop(): corta el bucle, marca el flag para que un img.onload tardío no lo
  // rearranque, quita el listener de teclado y retira las funciones globales que
  // expuso este arranque.
  return function stop() {
    detenido = true;
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    window.removeEventListener("keydown", onKeyDown);
    if (window.restartSnake === iniciar) delete window.restartSnake;
    if (window.toggleSnakePause === alternarPausa)
      delete window.toggleSnakePause;
  };
}

window.startSnake = startSnake;
