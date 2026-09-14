"use strict";

// Frogger de rejilla escrito desde cero para Arcade Vault (SPEC game-jam/frogger/01).
// No hay starter que bifurcar ni assets binarios: todo se dibuja con ctx
// (rectángulos y arcos), siguiendo la filosofía "sin curvas" de DESIGN.md.
//
// Contrato, calcado de asteroids/tetris/arkanoid/snake:
//   window.startFrogger(canvasEl)   → arranca el juego sobre ese <canvas> y
//                                      devuelve un stop() que cancela el rAF,
//                                      marca el flag "detenido" y quita el
//                                      listener de teclado.
//   window.restartFrogger()         → reinicia rana, vidas, nivel, casas,
//                                      temporizador y filas de peligro.
//   window.toggleFroggerPause()     → alterna playing ↔ paused (también la
//                                      tecla P).
//
// PASO 7 — pausa y reinicio programáticos: toggleFroggerPause() congela el
// avance de coches/troncos/temporizador (faseActual() ya cubre "paused") y
// restartFrogger() reinicia el motor sin recrear el <canvas>. stop() quita
// ambas funciones globales.

function startFrogger(canvasEl) {
  const canvas = canvasEl;
  const ctx = canvas.getContext("2d");

  // ── Rejilla ─────────────────────────────────────────────────────────────────
  const W = 800;
  const H = 600;
  const ROWS = 13;
  const COLS = 14;
  const CELL_W = W / COLS;
  const CELL_H = H / ROWS;

  // Índices de fila, de arriba (0) hacia abajo (ROWS - 1).
  const ROW_CASAS = 0;
  const ROW_RIO_INICIO = 1;
  const ROW_RIO_FIN = 5; // filas 1..5 = río
  const ROW_REFUGIO = 6;
  const ROW_CARRETERA_INICIO = 7;
  const ROW_CARRETERA_FIN = 11; // filas 7..11 = carretera
  const ROW_SALIDA = 12; // fila de inicio de la rana

  function tipoDeFila(row) {
    if (row === ROW_CASAS) return "casas";
    if (row >= ROW_RIO_INICIO && row <= ROW_RIO_FIN) return "rio";
    if (row === ROW_REFUGIO) return "segura";
    if (row >= ROW_CARRETERA_INICIO && row <= ROW_CARRETERA_FIN)
      return "carretera";
    return "segura"; // ROW_SALIDA
  }

  // ── Carriles de peligro ─────────────────────────────────────────────────────
  // Config fija por fila (dirección, velocidad, ancho de entidad y separación).
  // "dir": 1 = hacia la derecha, -1 = hacia la izquierda. "tipo" solo afecta
  // el dibujo (coche / tronco / tortuga); la colisión es igual para todos.
  //
  // Balance: CELL_W ≈ 57px (800/14). Para una fila de carretera, la fracción
  // de tiempo que un punto fijo queda bloqueado por algún coche es
  // (width + CELL_W) / (width + gap) — independiente de cuántos coches tenga
  // la fila, porque todos son copias desfasadas del mismo patrón periódico.
  // El primer ajuste dejaba ~53-56% (con 5 filas seguidas, cruzar sin
  // toparse con ninguna era casi imposible); un segundo ajuste bajó a
  // ~35-39% pero seguía sintiéndose injusto. Aquí se apunta a ~27-29% por
  // fila (menos coches en pantalla, huecos más generosos).
  const CONFIG_FILA = {
    7: { tipo: "coche", dir: -1, speed: 50, width: 50, gap: 320 },
    8: { tipo: "coche", dir: 1, speed: 60, width: 45, gap: 330 },
    9: { tipo: "coche", dir: -1, speed: 40, width: 65, gap: 350 },
    10: { tipo: "coche", dir: 1, speed: 65, width: 40, gap: 310 },
    11: { tipo: "coche", dir: -1, speed: 55, width: 50, gap: 330 },
    1: { tipo: "tronco", dir: 1, speed: 60, width: 140, gap: 40 },
    2: { tipo: "tortuga", dir: -1, speed: 80, width: 110, gap: 50 },
    3: { tipo: "tronco", dir: 1, speed: 50, width: 180, gap: 60 },
    4: { tipo: "tortuga", dir: -1, speed: 90, width: 100, gap: 70 },
    5: { tipo: "tronco", dir: 1, speed: 70, width: 150, gap: 50 },
  };

  // filasPeligro: row → { config, patternLength, entidades: [{ x, width }] }
  let filasPeligro;

  function crearFilasPeligro() {
    const filas = {};
    for (const rowStr of Object.keys(CONFIG_FILA)) {
      const row = Number(rowStr);
      const config = CONFIG_FILA[row];
      const patternLength = config.width + config.gap;
      const count = Math.ceil(W / patternLength) + 2;
      const entidades = [];
      for (let i = 0; i < count; i++) {
        entidades.push({ x: -config.width + i * patternLength });
      }
      filas[row] = { config, patternLength, count, entidades };
    }
    return filas;
  }

  function actualizarFilasPeligro(dtMs) {
    const dtS = dtMs / 1000;
    for (const rowStr of Object.keys(filasPeligro)) {
      const fila = filasPeligro[rowStr];
      const { config, patternLength, count } = fila;
      const avance = config.dir * config.speed * dtS;
      for (const entidad of fila.entidades) {
        entidad.x += avance;
        if (config.dir > 0 && entidad.x > W) {
          entidad.x -= count * patternLength;
        } else if (config.dir < 0 && entidad.x < -config.width) {
          entidad.x += count * patternLength;
        }
      }
    }
  }

  // ── Casas ───────────────────────────────────────────────────────────────────
  // Columnas (0..COLS-1) de las 5 ranuras de casa en ROW_CASAS.
  const HOUSE_COLS = [1, 4, 7, 10, 13];

  // ── Estado ──────────────────────────────────────────────────────────────────
  // rana.x es un float en píxeles (no una columna entera): en filas de río
  // deriva junto con la plataforma entre saltos y solo se redondea a columna
  // al recibir un salto nuevo (Decisions de la spec).
  let rana; // { x, row }
  let score;
  let homes; // 0..5, casas ocupadas en la ronda actual
  let level;
  let ocupadas; // Set<col>, casas ya ocupadas en la ronda actual
  let lives; // 0..3, corazones del HUD
  let pausado = false; // se alterna con toggleFroggerPause / tecla P
  let detenido = false;

  // ── Temporizador por vida ───────────────────────────────────────────────────
  const VIDA_MS = 30000;
  let tiempoRestante;

  function colInicial() {
    return Math.floor(COLS / 2);
  }

  function posicionInicial() {
    return { x: colInicial() * CELL_W, row: ROW_SALIDA };
  }

  function iniciar() {
    rana = posicionInicial();
    score = 0;
    homes = 0;
    level = 1;
    ocupadas = new Set();
    lives = 3;
    pausado = false;
    tiempoRestante = VIDA_MS;
    lastEmitted = null;
    filasPeligro = crearFilasPeligro();
  }

  function faseActual() {
    if (lives <= 0) return "gameover";
    return pausado ? "paused" : "playing";
  }

  // Alterna playing ↔ paused. No-op en gameover. El acumulador de tiempo no
  // avanza mientras "paused" (el bloque que lo mueve en loop() está guardado
  // por faseActual() === "playing"), así que coches/troncos/temporizador
  // quedan congelados y se reanudan exactamente donde estaban.
  function alternarPausa() {
    if (faseActual() === "gameover") return;
    pausado = !pausado;
  }

  // Devuelve la rana al inicio y le da un temporizador fresco. La llaman
  // tanto perderVida() (nueva vida) como resolverCasa() en éxito (nuevo
  // intento dentro de la misma vida).
  function reiniciarPosicionRana() {
    Object.assign(rana, posicionInicial());
    tiempoRestante = VIDA_MS;
  }

  // Resta una vida y reinicia la posición/temporizador. No-op si ya no
  // quedan vidas (el juego ya está en "gameover" y el bucle dejó de llamar a
  // las funciones que podrían disparar más muertes).
  function perderVida() {
    if (lives <= 0) return;
    lives--;
    reiniciarPosicionRana();
  }

  // Se evalúa al aterrizar en ROW_CASAS (ver saltar()): ranuras fuera de
  // HOUSE_COLS u ocupadas matan; una ranura vacía suma +50, ocupa la casa y
  // devuelve la rana al inicio. Completar las 5 casas sube el nivel y
  // reinicia las casas y las filas de peligro de la ronda siguiente (misma
  // dificultad: la progresión real es el incremento 02).
  function resolverCasa() {
    const col = Math.round(rana.x / CELL_W);
    if (!HOUSE_COLS.includes(col) || ocupadas.has(col)) {
      perderVida();
      return;
    }
    ocupadas.add(col);
    homes++;
    score += 50;
    if (homes >= 5) {
      level++;
      homes = 0;
      ocupadas = new Set();
      filasPeligro = crearFilasPeligro();
    }
    reiniciarPosicionRana();
  }

  // ── Emisión de estado hacia la ventana ──────────────────────────────────────
  // Mismo canal y filtros que asteroids/tetris/arkanoid/snake. Chequeo sucio
  // barato: solo se emite si score/lives/level/homes/phase cambiaron. Al
  // entrar en "gameover" se emite además un mensaje type:"gameover".
  let lastEmitted = null;

  function emitState() {
    const phase = faseActual();

    if (
      lastEmitted &&
      lastEmitted.score === score &&
      lastEmitted.lives === lives &&
      lastEmitted.level === level &&
      lastEmitted.homes === homes &&
      lastEmitted.phase === phase
    )
      return;

    const entroEnGameOver =
      phase === "gameover" &&
      (!lastEmitted || lastEmitted.phase !== "gameover");
    lastEmitted = { score, lives, level, homes, phase };

    window.postMessage(
      { source: "frogger", type: "state", score, lives, level, homes, phase },
      window.location.origin,
    );

    if (entroEnGameOver)
      window.postMessage(
        { source: "frogger", type: "gameover", score },
        window.location.origin,
      );
  }

  // ── Movimiento y colisión ───────────────────────────────────────────────────
  function saltar(dCol, dRow) {
    if (faseActual() !== "playing") return;
    const nuevaRow = rana.row + dRow;
    if (nuevaRow < 0 || nuevaRow > ROW_SALIDA) return; // fuera de la rejilla: no-op
    const colActual = Math.round(rana.x / CELL_W);
    rana.row = nuevaRow;
    rana.x = (colActual + dCol) * CELL_W;

    if (dRow === -1) score += 10; // salto hacia adelante

    if (nuevaRow === ROW_CASAS) resolverCasa();
  }

  function estaFueraDeLimites() {
    return rana.x < 0 || rana.x + CELL_W > W;
  }

  // El centro de la rana debe caer dentro del rectángulo de la plataforma
  // (Decisions: no basta un solape parcial).
  function hayPlataformaBajoRana() {
    const fila = filasPeligro[rana.row];
    if (!fila) return false;
    const centro = rana.x + CELL_W / 2;
    return fila.entidades.some(
      (e) => centro >= e.x && centro <= e.x + fila.config.width,
    );
  }

  // Coches sí matan con solape parcial (no hace falta que el centro entre).
  function colisionaConCoche() {
    const fila = filasPeligro[rana.row];
    if (!fila) return false;
    const izq = rana.x;
    const der = rana.x + CELL_W;
    return fila.entidades.some(
      (e) => e.x < der && e.x + fila.config.width > izq,
    );
  }

  function actualizarRana(dtMs) {
    const tipo = tipoDeFila(rana.row);

    if (tipo === "rio") {
      if (!hayPlataformaBajoRana()) {
        perderVida();
        return;
      }
      const config = filasPeligro[rana.row].config;
      rana.x += config.dir * config.speed * (dtMs / 1000);
    }

    if (estaFueraDeLimites()) {
      perderVida();
      return;
    }

    if (tipo === "carretera" && colisionaConCoche()) {
      perderVida();
    }
  }

  // ── Input ───────────────────────────────────────────────────────────────────
  // Cada flecha ejecuta un salto de una celda. El listener se registra sobre
  // window y se quita en stop().
  function onKeyDown(e) {
    switch (e.code) {
      case "ArrowUp":
        saltar(0, -1);
        e.preventDefault();
        break;
      case "ArrowDown":
        saltar(0, 1);
        e.preventDefault();
        break;
      case "ArrowLeft":
        saltar(-1, 0);
        e.preventDefault();
        break;
      case "ArrowRight":
        saltar(1, 0);
        e.preventDefault();
        break;
      case "KeyP":
        alternarPausa();
        break;
    }
  }

  // ── Dibujo ──────────────────────────────────────────────────────────────────
  const COLOR_FILA = {
    casas: "#0a1f14",
    rio: "#052033",
    segura: "#0a0a12",
    carretera: "#150a1f",
  };

  function dibujarFondo() {
    for (let row = 0; row < ROWS; row++) {
      ctx.fillStyle = COLOR_FILA[tipoDeFila(row)];
      ctx.fillRect(0, row * CELL_H, W, CELL_H);
    }
    ctx.strokeStyle = "rgba(99, 247, 255, 0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= COLS; x++) {
      ctx.moveTo(x * CELL_W, 0);
      ctx.lineTo(x * CELL_W, H);
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.moveTo(0, y * CELL_H);
      ctx.lineTo(W, y * CELL_H);
    }
    ctx.stroke();
  }

  const COLOR_ENTIDAD = {
    coche: "#ff3d81",
    tronco: "#a9662b",
    tortuga: "#31d977",
  };

  function dibujarEntidad(row, config, entidad) {
    const y = row * CELL_H;
    ctx.fillStyle = COLOR_ENTIDAD[config.tipo];
    if (config.tipo === "tortuga") {
      // Cluster de caparazones dibujados como arcos dentro del ancho de la
      // plataforma, en vez de un rectángulo (única entidad que usa arcos).
      const radio = (CELL_H - 10) / 2;
      const centroY = y + CELL_H / 2;
      const n = Math.max(1, Math.round(entidad.width / (radio * 2 + 6)));
      const paso = entidad.width / n;
      for (let i = 0; i < n; i++) {
        const centroX = entidad.x + paso * i + paso / 2;
        ctx.beginPath();
        ctx.arc(centroX, centroY, radio, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillRect(entidad.x, y + 5, entidad.width, CELL_H - 10);
    }
  }

  function dibujarFilasPeligro() {
    for (const rowStr of Object.keys(filasPeligro)) {
      const row = Number(rowStr);
      const fila = filasPeligro[rowStr];
      for (const entidad of fila.entidades) {
        dibujarEntidad(row, fila.config, {
          x: entidad.x,
          width: fila.config.width,
        });
      }
    }
  }

  function dibujarCasas() {
    const y = ROW_CASAS * CELL_H;
    for (const col of HOUSE_COLS) {
      const x = col * CELL_W;
      if (ocupadas.has(col)) {
        ctx.fillStyle = "#8affc1";
        ctx.fillRect(x + 6, y + 6, CELL_W - 12, CELL_H - 12);
      } else {
        ctx.strokeStyle = "rgba(138, 255, 193, 0.5)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 6, y + 6, CELL_W - 12, CELL_H - 12);
      }
    }
  }

  function dibujarRana() {
    const y = rana.row * CELL_H;
    const padX = CELL_W * 0.22;
    const padY = CELL_H * 0.18;
    ctx.fillStyle = "#8affc1";
    ctx.fillRect(rana.x + padX, y + padY, CELL_W - padX * 2, CELL_H - padY * 2);
  }

  // Único elemento de HUD que vive en el canvas (Decisions): necesita
  // actualizarse a 60fps sin generar tráfico extra de postMessage.
  function dibujarTemporizador() {
    const frac = Math.max(0, Math.min(1, tiempoRestante / VIDA_MS));
    const barH = 6;
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fillRect(0, H - barH, W, barH);
    ctx.fillStyle = frac > 0.3 ? "#8affc1" : "#ff3d81";
    ctx.fillRect(0, H - barH, W * frac, barH);
  }

  function dibujar() {
    dibujarFondo();
    dibujarCasas();
    dibujarFilasPeligro();
    dibujarRana();
    dibujarTemporizador();
  }

  // ── Bucle principal ─────────────────────────────────────────────────────────
  // Acumulador de tiempo real (dt entre frames) para mover coches/troncos y la
  // deriva de la rana sobre plataformas a velocidad constante, independiente
  // del framerate.
  let rafId = null;
  let ultimoTs = null;

  function loop(ts) {
    if (detenido) return;
    const dt = ultimoTs === null ? 0 : Math.min(ts - ultimoTs, 100);
    ultimoTs = ts;

    if (faseActual() === "playing") {
      actualizarFilasPeligro(dt);
      actualizarRana(dt);
      tiempoRestante -= dt;
      if (tiempoRestante <= 0) perderVida();
    }

    emitState();
    dibujar();
    rafId = requestAnimationFrame(loop);
  }

  // ── Arranque ────────────────────────────────────────────────────────────────
  iniciar();
  window.addEventListener("keydown", onKeyDown);
  rafId = requestAnimationFrame(loop);

  // Llamadas directas React → juego mientras hay partida activa (no son
  // mensajes). "Jugar de nuevo" reinicia el motor sin recrear el <canvas>; el
  // botón "Pausa" del control deck alterna igual que la tecla P.
  window.restartFrogger = iniciar;
  window.toggleFroggerPause = alternarPausa;
  // stop(): corta el bucle, marca el flag, quita el listener de teclado y
  // retira las funciones globales que expuso este arranque.
  return function stop() {
    detenido = true;
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    window.removeEventListener("keydown", onKeyDown);
    if (window.restartFrogger === iniciar) delete window.restartFrogger;
    if (window.toggleFroggerPause === alternarPausa)
      delete window.toggleFroggerPause;
  };
}

window.startFrogger = startFrogger;
