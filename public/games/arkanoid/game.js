"use strict";

// Fork de resources/started-games/04-arkanoid/ (juego ES multi-modulo),
// concatenado en un unico archivo clasico (no type="module"):
//   - Se inlinan, en orden de dependencia, la API del spritesheet
//     (assets/spritesheet.js) y los nueve modulos ES del juego, sin
//     `import` / `export`.
//   - NO se incluye js/audio.js ni js/storage.js (juego mudo, sin persistencia
//     propia; el leaderboard de Supabase es la unica persistencia).
//   - El PNG del spritesheet se sirve desde la ruta absoluta
//     /games/arkanoid/assets/spritesheet-breakout.png.
//
// PASO 3 — Boot re-entrante: todo el cuerpo se envuelve en
// `function startArkanoid(canvasEl)`, expuesta como `window.startArkanoid`. Ya no
// arranca solo: la invoca el componente React con el <canvas> ya montado y
// devuelve un `stop()` que cancela el requestAnimationFrame en curso, marca un
// flag `detenido` (para que el callback pendiente de `loadSpritesheet` no arranque
// el bucle si `stop()` corrio antes de que cargara el PNG) y quita todos los
// listeners que registro (`keydown` / `keyup` en window; `mousemove` /
// `mouseleave` / `click` en el canvas).

function startArkanoid(canvasEl) {
  const canvas = canvasEl;
  const ctx = canvas.getContext("2d");

  // id del requestAnimationFrame en curso y flag de parada (los usan `bucle`,
  // `stop` y el callback de `loadSpritesheet`).
  let rafId = null;
  let detenido = false;

  // ═════════════════════════════════════════════════════════════════════════════
  // API del spritesheet (assets/spritesheet.js — inlinada primero, en el mismo
  // scope, para que EXPLOSION_FRAMES / drawFrame / drawSprite sean visibles).
  // ═════════════════════════════════════════════════════════════════════════════

  const EXPLOSION_FRAMES = {
    red: [
      { sx: 256, sy: 176, sw: 32, sh: 16 },
      { sx: 288, sy: 176, sw: 32, sh: 16 },
      { sx: 320, sy: 176, sw: 32, sh: 16 },
      { sx: 352, sy: 176, sw: 32, sh: 16 },
    ],
    cyan: [
      { sx: 256, sy: 192, sw: 32, sh: 16 },
      { sx: 288, sy: 192, sw: 32, sh: 16 },
      { sx: 320, sy: 192, sw: 32, sh: 16 },
      { sx: 352, sy: 192, sw: 32, sh: 16 },
    ],
    green: [
      { sx: 256, sy: 208, sw: 32, sh: 16 },
      { sx: 288, sy: 208, sw: 32, sh: 16 },
      { sx: 320, sy: 208, sw: 32, sh: 16 },
      { sx: 352, sy: 208, sw: 32, sh: 16 },
    ],
    magenta: [
      { sx: 256, sy: 224, sw: 32, sh: 16 },
      { sx: 288, sy: 224, sw: 32, sh: 16 },
      { sx: 320, sy: 224, sw: 32, sh: 16 },
      { sx: 352, sy: 224, sw: 32, sh: 16 },
    ],
    yellow: [
      { sx: 256, sy: 240, sw: 32, sh: 16 },
      { sx: 288, sy: 240, sw: 32, sh: 16 },
      { sx: 320, sy: 240, sw: 32, sh: 16 },
      { sx: 352, sy: 240, sw: 32, sh: 16 },
    ],
    hotpink: [
      { sx: 256, sy: 256, sw: 32, sh: 16 },
      { sx: 288, sy: 256, sw: 32, sh: 16 },
      { sx: 320, sy: 256, sw: 32, sh: 16 },
      { sx: 352, sy: 256, sw: 32, sh: 16 },
    ],
    gray: [
      { sx: 256, sy: 176, sw: 32, sh: 16 },
      { sx: 288, sy: 176, sw: 32, sh: 16 },
      { sx: 320, sy: 176, sw: 32, sh: 16 },
      { sx: 352, sy: 176, sw: 32, sh: 16 },
    ],
  };

  const SPRITES = {
    paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
    ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
    blocks: {
      gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
      red: { sx: 32, sy: 176, sw: 32, sh: 16 },
      yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
      cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
      magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
      hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
      green: { sx: 32, sy: 208, sw: 32, sh: 16 },
    },
  };

  let ssImg = null;
  let ssLoaded = false;
  const ssCallbacks = [];

  function loadSpritesheet(cb) {
    if (ssLoaded) {
      cb();
      return;
    }
    ssCallbacks.push(cb);
    if (ssImg) return;

    const rawImg = new Image();
    rawImg.onload = () => {
      const oc = document.createElement("canvas");
      oc.width = rawImg.width;
      oc.height = rawImg.height;
      const octx = oc.getContext("2d");
      octx.drawImage(rawImg, 0, 0);
      ssImg = oc;
      ssLoaded = true;
      ssCallbacks.forEach((f) => f());
    };
    rawImg.onerror = () => console.error("Failed to load spritesheet");
    rawImg.src = "/games/arkanoid/assets/spritesheet-breakout.png";
  }

  function drawFrame(ctx, frame, x, y, w, h) {
    if (!ssLoaded) return;
    ctx.drawImage(ssImg, frame.sx, frame.sy, frame.sw, frame.sh, x, y, w, h);
  }

  function drawSprite(ctx, name, x, y, w, h) {
    if (!ssLoaded) return;
    let sp;
    if (name.startsWith("block_")) {
      sp = SPRITES.blocks[name.slice(6)];
    } else {
      sp = SPRITES[name];
    }
    if (!sp) return;
    ctx.drawImage(ssImg, sp.sx, sp.sy, sp.sw, sp.sh, x, y, w, h);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // js/state.js — Estado global de la partida y constantes de configuracion.
  // ═══════════════════════════════════════════════════════════════════════════════

  const PANTALLAS = {
    INICIO: "INICIO",
    JUGANDO: "JUGANDO",
    PAUSA: "PAUSA",
    FIN: "FIN",
  };

  const RESULTADOS = { VICTORIA: "VICTORIA", DERROTA: "DERROTA" };

  // Dimensiones logicas del canvas.
  const ANCHO = 800;
  const ALTO = 600;

  // Vidas iniciales.
  const VIDAS_INICIALES = 3;

  // Rapidez de la bola por nivel (px/s).
  const RAPIDEZ_BASE = 260;
  const INCREMENTO_RAPIDEZ = 40;

  // rapidez del nivel n (1-indexado) = RAPIDEZ_BASE + (n - 1) * INCREMENTO_RAPIDEZ
  function rapidezDeNivel(nivelIndice) {
    return RAPIDEZ_BASE + nivelIndice * INCREMENTO_RAPIDEZ;
  }

  const state = {
    pantalla: PANTALLAS.INICIO,
    nivelIndice: 0, // 0..2
    puntuacion: 0,
    vidas: VIDAS_INICIALES,
    highscore: 0, // se carga de localStorage en el Paso 14
    resultado: null, // 'VICTORIA' | 'DERROTA' cuando pantalla === 'FIN'
    bolaLanzada: false,
    pausaConMenu: false, // en PAUSA: false = overlay rapido (P), true = menu de pausa (Esc)
    menuIndice: 0, // opcion resaltada del menu activo (INICIO o PAUSA); se pone a 0 al entrar
    hayGuardado: false, // cache de hayPartidaGuardada(); se refresca al entrar en INICIO
  };

  // Reinicia los contadores de la partida. La preparacion del nivel (rejilla,
  // paddle, bola, pantalla) la hace empezarNivel() en main.js.
  function reiniciarContadores() {
    state.nivelIndice = 0;
    state.puntuacion = 0;
    state.vidas = VIDAS_INICIALES;
    state.resultado = null;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // js/levels.js — Definicion de los tres niveles y tabla de puntuacion por color.
  // ═══════════════════════════════════════════════════════════════════════════════

  // SPEC 08: `COLUMNAS` del modulo original se omite (no se referencia en el juego).
  const BLOQUE_ANCHO = 64;
  const BLOQUE_ALTO = 24;
  const MARGEN_SUPERIOR = 60;
  const MARGEN_LATERAL = 16;

  const LETRA_A_COLOR = {
    R: "red",
    C: "cyan",
    Y: "yellow",
    M: "magenta",
    H: "hotpink",
    G: "green",
    X: "gray",
  };

  const PUNTOS_POR_COLOR = {
    red: 90,
    hotpink: 80,
    magenta: 70,
    yellow: 60,
    cyan: 50,
    green: 40,
    gray: 30,
  };

  // Tres niveles. Cada fila mide exactamente 12 caracteres.
  const NIVELES = [
    // Nivel 1: cuatro filas solidas, calentamiento.
    ["RRRRRRRRRRRR", "YYYYYYYYYYYY", "GGGGGGGGGGGG", "CCCCCCCCCCCC"],
    // Nivel 2: seis filas con huecos alternos entre filas solidas.
    [
      "M.M.M.M.M.M.",
      "HHHHHHHHHHHH",
      "Y.YY.YY.YY.Y",
      "CCCCCCCCCCCC",
      "G..G..G..G..",
      "RRRRRRRRRRRR",
    ],
    // Nivel 3: diamante hueco de ocho filas.
    [
      ".....RR.....",
      "....RYYR....",
      "...RYMMYR...",
      "..RYMGGMYR..",
      "..RYMGGMYR..",
      "...RYMMYR...",
      "....RYYR....",
      ".....RR.....",
    ],
  ];

  // ═══════════════════════════════════════════════════════════════════════════════
  // js/input.js — Estado de entrada: teclado (flechas, A/D, Espacio) y raton.
  // ═══════════════════════════════════════════════════════════════════════════════

  const input = {
    izquierda: false,
    derecha: false,
    ratonX: null, // posicion X dentro del canvas (px logicos), o null si el cursor no esta encima
    ratonY: null, // posicion Y dentro del canvas (px logicos), o null si el cursor no esta encima
  };

  let espacioPendiente = false;

  // Teclas discretas pendientes (flanco de bajada, sin repeticion). Se consumen
  // una sola vez con consumirTecla(code).
  const teclasDiscretas = new Set();
  const CODIGOS_DISCRETOS = ["KeyP", "Escape", "ArrowUp", "ArrowDown", "Enter"];

  // Clic sobre el canvas pendiente de consumir, en px logicos.
  let clicPendiente = null;

  function aLogico(canvas, e) {
    const rect = canvas.getBoundingClientRect();
    const escalaX = canvas.width / rect.width;
    const escalaY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * escalaX,
      y: (e.clientY - rect.top) * escalaY,
    };
  }

  // SPEC 08: los listeners se guardan en referencias con nombre (scope de
  // startArkanoid) para poder quitarlas en stop(). keydown / keyup siguen sobre
  // window (no sobre el canvas, que necesitaria foco — regresion conocida en
  // produccion); mousemove / mouseleave / click siguen sobre el canvas.
  let onKeyDown = null;
  let onKeyUp = null;
  let onMouseMove = null;
  let onMouseLeave = null;
  let onClick = null;

  function iniciarInput(canvas) {
    onKeyDown = (e) => {
      switch (e.code) {
        case "ArrowLeft":
        case "KeyA":
          input.izquierda = true;
          break;
        case "ArrowRight":
        case "KeyD":
          input.derecha = true;
          break;
        case "Space":
          if (!e.repeat) espacioPendiente = true;
          e.preventDefault(); // evita el scroll de la pagina
          break;
      }
      if (!e.repeat && CODIGOS_DISCRETOS.includes(e.code)) {
        teclasDiscretas.add(e.code);
        if (e.code === "ArrowUp" || e.code === "ArrowDown") {
          e.preventDefault(); // evita el scroll de la pagina al navegar menus
        }
      }
    };

    onKeyUp = (e) => {
      switch (e.code) {
        case "ArrowLeft":
        case "KeyA":
          input.izquierda = false;
          break;
        case "ArrowRight":
        case "KeyD":
          input.derecha = false;
          break;
      }
    };

    onMouseMove = (e) => {
      const p = aLogico(canvas, e);
      input.ratonX = p.x;
      input.ratonY = p.y;
    };

    onMouseLeave = () => {
      input.ratonX = null;
      input.ratonY = null;
    };

    onClick = (e) => {
      clicPendiente = aLogico(canvas, e);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);
    canvas.addEventListener("click", onClick);
  }

  // Devuelve true una sola vez por cada pulsacion de Espacio (flanco, no repeticion).
  function consumirEspacio() {
    if (espacioPendiente) {
      espacioPendiente = false;
      return true;
    }
    return false;
  }

  // Devuelve true una sola vez por cada pulsacion de la tecla discreta indicada
  // ('KeyP' | 'Escape' | 'ArrowUp' | 'ArrowDown' | 'Enter').
  function consumirTecla(code) {
    if (teclasDiscretas.has(code)) {
      teclasDiscretas.delete(code);
      return true;
    }
    return false;
  }

  // Devuelve { x, y } (px logicos) del ultimo clic sobre el canvas una sola vez,
  // o null si no hay clic pendiente.
  function consumirClic() {
    if (clicPendiente) {
      const p = clicPendiente;
      clicPendiente = null;
      return p;
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // js/effects.js — Capa de efectos visuales: animacion de explosion.
  // ═══════════════════════════════════════════════════════════════════════════════

  // Duracion de cada frame en milisegundos. 4 frames * 150 = 600 ms totales.
  const MS_POR_FRAME = 150;
  const FRAMES_EXPLOSION = 4;

  // Array de explosiones vivas. Modulo-privado: se manipula solo con la API.
  // Cada explosion: { x, y, ancho, alto, color, transcurrido }.
  const explosiones = [];

  // Registra una explosion nueva en la posicion y tamano del bloque roto.
  function emitirExplosion(x, y, ancho, alto, color) {
    explosiones.push({ x, y, ancho, alto, color, transcurrido: 0 });
  }

  // Avanza el tiempo de cada explosion y descarta las que ya terminaron.
  function actualizarEfectos(dt) {
    const total = MS_POR_FRAME * FRAMES_EXPLOSION;
    for (let i = explosiones.length - 1; i >= 0; i--) {
      explosiones[i].transcurrido += dt * 1000;
      if (explosiones[i].transcurrido >= total) {
        explosiones.splice(i, 1);
      }
    }
  }

  // Dibuja el frame actual de cada explosion en el rect que ocupaba el bloque.
  // EXPLOSION_FRAMES y drawFrame son globales de assets/spritesheet.js (script
  // clasico): EXPLOSION_FRAMES es un const, asi que no vive en window.
  function dibujarEfectos(ctx) {
    for (const e of explosiones) {
      const frameIndice = Math.min(
        FRAMES_EXPLOSION - 1,
        Math.floor(e.transcurrido / MS_POR_FRAME),
      );
      const frames = EXPLOSION_FRAMES[e.color];
      if (!frames) continue;
      drawFrame(ctx, frames[frameIndice], e.x, e.y, e.ancho, e.alto);
    }
  }

  // Vacia el array de explosiones (cambio de nivel, reinicio, perder vida).
  function limpiarExplosiones() {
    explosiones.length = 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // js/storage.js — ELIMINADO (SPEC 08).
  //
  // El fork no lee ni escribe localStorage: el leaderboard de Supabase es la unica
  // persistencia. Se dejan stubs no-op para no tocar la orquestacion de main.js:
  //   - getHighscore() / setHighscore() -> no-op, devuelven 0 (el HUD interno del
  //     canvas muestra "Highscore: 0").
  //   - hayPartidaGuardada() -> siempre false: la opcion "Reanudar" del menu de
  //     INICIO queda permanentemente deshabilitada.
  //   - guardarPartida() / cargarPartida() / borrarPartida() -> no-op: la pausa
  //     deja de persistir la partida.
  // ═══════════════════════════════════════════════════════════════════════════════

  function getHighscore() {
    return 0;
  }

  function setHighscore() {
    // no-op: sin persistencia propia.
  }

  function hayPartidaGuardada() {
    return false;
  }

  function guardarPartida() {
    // no-op: sin persistencia propia.
  }

  function cargarPartida() {
    return null;
  }

  function borrarPartida() {
    // no-op: sin persistencia propia.
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // js/entities.js — Entidades del juego: paddle y bola. Movimiento y dibujo.
  // ═══════════════════════════════════════════════════════════════════════════════

  const paddle = {
    x: 360,
    y: 560,
    ancho: 80,
    alto: 16,
    velocidad: 480, // px/s con teclado
  };

  const bola = {
    x: 400,
    y: 544,
    radio: 8,
    vx: 0,
    vy: 0,
    rapidez: 260, // modulo de la velocidad en el nivel actual
  };

  // Bloques del nivel actual. Se rellena con construirNivel().
  const bloques = [];

  // Construye la rejilla del nivel a partir de su layout de letras de color.
  function construirNivel(nivelIndice) {
    bloques.length = 0;
    const layout = NIVELES[nivelIndice];
    for (let f = 0; f < layout.length; f++) {
      const fila = layout[f];
      for (let c = 0; c < fila.length; c++) {
        const color = LETRA_A_COLOR[fila[c]];
        if (!color) continue; // '.' u otro caracter = celda vacia
        bloques.push({
          x: MARGEN_LATERAL + c * BLOQUE_ANCHO,
          y: MARGEN_SUPERIOR + f * BLOQUE_ALTO,
          ancho: BLOQUE_ANCHO,
          alto: BLOQUE_ALTO,
          color,
          vivo: true,
          puntos: PUNTOS_POR_COLOR[color],
        });
      }
    }
  }

  function quedanBloques() {
    return bloques.some((b) => b.vivo);
  }

  // Fila/columna de rejilla de un bloque a partir de su posicion en px.
  function filaDeBloque(b) {
    return Math.round((b.y - MARGEN_SUPERIOR) / BLOQUE_ALTO);
  }
  function colDeBloque(b) {
    return Math.round((b.x - MARGEN_LATERAL) / BLOQUE_ANCHO);
  }

  // Matriz fila x columna (dimensiones del layout de NIVELES[nivelIndice]) con el
  // estado vivo/muerto de cada celda. Las celdas sin bloque quedan en false.
  function snapshotBloquesVivos(nivelIndice) {
    const layout = NIVELES[nivelIndice];
    const vivos = layout.map((fila) => new Array(fila.length).fill(false));
    for (const b of bloques) {
      const f = filaDeBloque(b);
      const c = colDeBloque(b);
      if (vivos[f] && c >= 0 && c < vivos[f].length) {
        vivos[f][c] = b.vivo;
      }
    }
    return vivos;
  }

  // Fija b.vivo de cada bloque segun vivos[fila][col].
  function aplicarBloquesVivos(vivos) {
    for (const b of bloques) {
      const f = filaDeBloque(b);
      const c = colDeBloque(b);
      if (vivos[f] && c >= 0 && c < vivos[f].length) {
        b.vivo = vivos[f][c];
      }
    }
  }

  function dibujarBloques(ctx) {
    for (const b of bloques) {
      if (!b.vivo) continue;
      drawSprite(ctx, `block_${b.color}`, b.x, b.y, b.ancho, b.alto);
    }
  }

  function limitar(valor, min, max) {
    return Math.max(min, Math.min(max, valor));
  }

  // Coloca el paddle centrado horizontalmente y la bola pegada encima de el.
  function centrarPaddle() {
    paddle.x = (ANCHO - paddle.ancho) / 2;
  }

  // Deja la bola pegada al centro del paddle, sin velocidad.
  function pegarBolaAlPaddle() {
    bola.x = paddle.x + paddle.ancho / 2;
    bola.y = paddle.y - bola.radio;
    bola.vx = 0;
    bola.vy = 0;
  }

  // Lanza la bola recta hacia arriba con la rapidez del nivel actual.
  function lanzarBola() {
    bola.vx = 0;
    bola.vy = -bola.rapidez;
  }

  // Integra la posicion de la bola. Las colisiones llegan en el Paso 7.
  function moverBola(dt) {
    bola.x += bola.vx * dt;
    bola.y += bola.vy * dt;
  }

  function actualizarPaddle(dt) {
    // Teclado: siempre activo.
    if (input.izquierda) paddle.x -= paddle.velocidad * dt;
    if (input.derecha) paddle.x += paddle.velocidad * dt;

    // Raton: solo cuando el cursor esta sobre el canvas; su posicion manda.
    if (input.ratonX !== null) {
      paddle.x = input.ratonX - paddle.ancho / 2;
    }

    paddle.x = limitar(paddle.x, 0, ANCHO - paddle.ancho);
  }

  function dibujarPaddle(ctx) {
    drawSprite(ctx, "paddle", paddle.x, paddle.y, paddle.ancho, paddle.alto);
  }

  function dibujarBola(ctx) {
    drawSprite(
      ctx,
      "ball",
      bola.x - bola.radio,
      bola.y - bola.radio,
      bola.radio * 2,
      bola.radio * 2,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // js/collisions.js — Colisiones de la bola: paredes, caida, paddle y bloques.
  // ═══════════════════════════════════════════════════════════════════════════════

  const ANGULO_MAX = (60 * Math.PI) / 180; // 60 grados desde la vertical

  // Rebote contra las paredes superior, izquierda y derecha (la inferior no rebota).
  function rebotarEnParedes() {
    let reboto = false;

    if (bola.x - bola.radio < 0) {
      bola.x = bola.radio;
      bola.vx = Math.abs(bola.vx);
      reboto = true;
    } else if (bola.x + bola.radio > ANCHO) {
      bola.x = ANCHO - bola.radio;
      bola.vx = -Math.abs(bola.vx);
      reboto = true;
    }

    if (bola.y - bola.radio < 0) {
      bola.y = bola.radio;
      bola.vy = Math.abs(bola.vy);
      reboto = true;
    }

    // SPEC 08: sin audio — eliminado `if (reboto) reproducir("rebote");`.
    void reboto;
  }

  // Rebote contra el paddle. El punto de impacto define el angulo de salida.
  function rebotarEnPaddle() {
    if (bola.vy <= 0) return; // solo cuando baja

    const dentroX =
      bola.x + bola.radio >= paddle.x &&
      bola.x - bola.radio <= paddle.x + paddle.ancho;
    const tocaY =
      bola.y + bola.radio >= paddle.y &&
      bola.y - bola.radio <= paddle.y + paddle.alto;
    if (!dentroX || !tocaY) return;

    const centroPaddle = paddle.x + paddle.ancho / 2;
    let offset = (bola.x - centroPaddle) / (paddle.ancho / 2);
    offset = Math.max(-1, Math.min(1, offset));

    const angulo = offset * ANGULO_MAX;
    bola.vx = bola.rapidez * Math.sin(angulo);
    bola.vy = -bola.rapidez * Math.cos(angulo);
    bola.y = paddle.y - bola.radio; // evita que quede encajada en el paddle

    // SPEC 08: sin audio — eliminado `reproducir("rebote");`.
  }

  // Colision de la bola contra los bloques vivos. Rompe como maximo uno por frame.
  function colisionBloques() {
    const izq = bola.x - bola.radio;
    const der = bola.x + bola.radio;
    const arr = bola.y - bola.radio;
    const aba = bola.y + bola.radio;

    for (const b of bloques) {
      if (!b.vivo) continue;
      if (der < b.x || izq > b.x + b.ancho || aba < b.y || arr > b.y + b.alto)
        continue;

      // Se invierte el eje con menor solapamiento (por donde entro la bola).
      const solapaX = Math.min(der, b.x + b.ancho) - Math.max(izq, b.x);
      const solapaY = Math.min(aba, b.y + b.alto) - Math.max(arr, b.y);
      if (solapaX < solapaY) {
        bola.vx = -bola.vx;
      } else {
        bola.vy = -bola.vy;
      }

      b.vivo = false;
      emitirExplosion(b.x, b.y, b.ancho, b.alto, b.color);
      state.puntuacion += b.puntos;
      // SPEC 08: sin audio — eliminado `reproducir("romper");`.
      return true;
    }
    return false;
  }

  // Si la bola cae por debajo del canvas: resta vida y la devuelve al paddle.
  // Devuelve true si se ha perdido la bola en este frame.
  function comprobarCaida() {
    if (bola.y - bola.radio <= ALTO) return false;

    state.vidas--;
    state.bolaLanzada = false;
    pegarBolaAlPaddle();
    limpiarExplosiones();
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // js/menu.js — Layout, hit-test y dibujo de los menus superpuestos.
  // ═══════════════════════════════════════════════════════════════════════════════

  const OPCION_ANCHO = 320;
  const OPCION_ALTO = 48;
  const OPCION_ESPACIADO = 16;

  // Rectangulo de una opcion en px logicos (800x600). Columna centrada, ancho y
  // alto fijos, opciones apiladas verticalmente y centradas respecto a ALTO.
  function rectOpcion(indice, cantidad) {
    const alturaTotal =
      cantidad * OPCION_ALTO + (cantidad - 1) * OPCION_ESPACIADO;
    const yPrimera = (ALTO - alturaTotal) / 2;
    return {
      x: (ANCHO - OPCION_ANCHO) / 2,
      y: yPrimera + indice * (OPCION_ALTO + OPCION_ESPACIADO),
      ancho: OPCION_ANCHO,
      alto: OPCION_ALTO,
    };
  }

  // Indice de la opcion cuyo rect contiene (x, y), o -1.
  function opcionEnPunto(x, y, cantidad) {
    for (let i = 0; i < cantidad; i++) {
      const r = rectOpcion(i, cantidad);
      if (x >= r.x && x <= r.x + r.ancho && y >= r.y && y <= r.y + r.alto) {
        return i;
      }
    }
    return -1;
  }

  function texto(ctx, cadena, x, y, tamano, color, alineacion = "center") {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `${tamano}px "Courier New", Courier, monospace`;
    ctx.textAlign = alineacion;
    ctx.textBaseline = "middle";
    ctx.fillText(cadena, x, y);
    ctx.restore();
  }

  function capaOscura(ctx) {
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, ANCHO, ALTO);
    ctx.restore();
  }

  // Dibuja una opcion: recuadro + etiqueta. resaltada la marca; atenuada la apaga.
  function dibujarOpcion(ctx, indice, cantidad, etiqueta, resaltada, atenuada) {
    const r = rectOpcion(indice, cantidad);
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = atenuada ? "#555555" : resaltada ? "#8aa0ff" : "#aaaaaa";
    if (resaltada && !atenuada) {
      ctx.fillStyle = "rgba(138, 160, 255, 0.20)";
      ctx.fillRect(r.x, r.y, r.ancho, r.alto);
    }
    ctx.strokeRect(r.x, r.y, r.ancho, r.alto);
    ctx.restore();

    const color = atenuada ? "#666666" : resaltada ? "#ffffff" : "#cccccc";
    texto(ctx, etiqueta, r.x + r.ancho / 2, r.y + r.alto / 2, 22, color);
  }

  // Menu de la pantalla INICIO: titulo, "Nueva partida" / "Reanudar", highscore.
  function dibujarMenuInicio(ctx, state, hayGuardado) {
    texto(ctx, "ARKANOID", ANCHO / 2, rectOpcion(0, 2).y - 70, 56, "#ffffff");
    dibujarOpcion(ctx, 0, 2, "Nueva partida", state.menuIndice === 0, false);
    dibujarOpcion(ctx, 1, 2, "Reanudar", state.menuIndice === 1, !hayGuardado);
    const yUltima = rectOpcion(1, 2);
    texto(
      ctx,
      `Highscore: ${state.highscore}`,
      ANCHO / 2,
      yUltima.y + yUltima.alto + 40,
      18,
      "#8aa0ff",
    );
  }

  // Overlay simple de la pausa rapida (tecla P).
  function dibujarPausaOverlay(ctx) {
    capaOscura(ctx);
    texto(ctx, "PAUSA", ANCHO / 2, ALTO / 2 - 20, 48, "#ffffff");
    texto(
      ctx,
      "P: continuar · Esc: menú",
      ANCHO / 2,
      ALTO / 2 + 40,
      20,
      "#cccccc",
    );
  }

  // Menu de pausa (tecla Esc): "Continuar" / "Menu principal".
  function dibujarMenuPausa(ctx, state) {
    capaOscura(ctx);
    texto(ctx, "PAUSA", ANCHO / 2, rectOpcion(0, 2).y - 60, 48, "#ffffff");
    dibujarOpcion(ctx, 0, 2, "Continuar", state.menuIndice === 0, false);
    dibujarOpcion(ctx, 1, 2, "Menú principal", state.menuIndice === 1, false);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // js/hud.js — Dibujo de texto superpuesto: pantallas INICIO / FIN y HUD.
  // ═══════════════════════════════════════════════════════════════════════════════

  function textoCentrado(ctx, texto, y, tamano, color = "#ffffff") {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `${tamano}px "Courier New", Courier, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(texto, ANCHO / 2, y);
    ctx.restore();
  }

  // SPEC 08: `dibujarInicio` del modulo original se omite; el menu de INICIO lo
  // pinta `dibujarMenuInicio` (js/menu.js).

  // HUD de la partida: vidas, nivel, puntuacion y highscore.
  function dibujarHud(ctx, state) {
    ctx.save();
    ctx.font = '16px "Courier New", Courier, monospace';
    ctx.textBaseline = "top";
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 4;
    ctx.fillStyle = "#ffffff";

    ctx.textAlign = "left";
    ctx.fillText(`Vidas: ${state.vidas}`, 12, 10);

    ctx.textAlign = "center";
    ctx.fillText(`Nivel ${state.nivelIndice + 1}`, ANCHO / 2, 10);

    ctx.textAlign = "right";
    ctx.fillText(`Puntos: ${state.puntuacion}`, ANCHO - 12, 10);

    ctx.fillStyle = "#8aa0ff";
    ctx.fillText(`Highscore: ${state.highscore}`, ANCHO - 12, 30);

    ctx.restore();
  }

  function dibujarFin(ctx, state) {
    const gano = state.resultado === RESULTADOS.VICTORIA;
    textoCentrado(
      ctx,
      gano ? "HAS GANADO" : "GAME OVER",
      ALTO / 2 - 60,
      48,
      gano ? "#7dd87f" : "#ff6b6b",
    );
    textoCentrado(ctx, `Puntuacion: ${state.puntuacion}`, ALTO / 2, 22);
    textoCentrado(
      ctx,
      `Highscore: ${state.highscore}`,
      ALTO / 2 + 34,
      18,
      "#8aa0ff",
    );
    textoCentrado(ctx, "Pulsa Espacio para volver al menú", ALTO / 2 + 80, 20);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // js/main.js — Punto de entrada: bucle, maquina de estados y orquestacion.
  // `canvas` / `ctx` los provee startArkanoid (arriba); ya no se busca en el DOM.
  // ═══════════════════════════════════════════════════════════════════════════════

  // Limite de dt para evitar saltos grandes tras una pausa del navegador (1/30 s).
  const DT_MAX = 1 / 30;

  let ultimoTiempo = 0;

  // Prepara el nivel actual: paddle centrado, bola pegada, rapidez segun nivel.
  function empezarNivel() {
    limpiarExplosiones();
    construirNivel(state.nivelIndice);
    centrarPaddle();
    bola.rapidez = rapidezDeNivel(state.nivelIndice);
    state.bolaLanzada = false;
    pegarBolaAlPaddle();
    state.pantalla = PANTALLAS.JUGANDO;
  }

  // Vuelve al menu de inicio y refresca si hay una partida guardada disponible.
  function irAInicio() {
    state.pantalla = PANTALLAS.INICIO;
    state.menuIndice = 0;
    state.hayGuardado = hayPartidaGuardada();
  }

  // "Nueva partida": descarta el guardado y arranca limpio en el nivel 1.
  function nuevaPartida() {
    borrarPartida();
    reiniciarContadores();
    empezarNivel();
  }

  // "Reanudar": reconstruye la partida guardada y la consume.
  function reanudarPartida() {
    const guardado = cargarPartida();
    if (!guardado) return;

    state.nivelIndice = guardado.nivelIndice;
    state.puntuacion = guardado.puntuacion;
    state.vidas = guardado.vidas;

    construirNivel(state.nivelIndice);
    aplicarBloquesVivos(guardado.vivos);

    bola.rapidez = guardado.rapidez;
    centrarPaddle();
    state.bolaLanzada = false;
    pegarBolaAlPaddle();
    limpiarExplosiones();

    borrarPartida();
    state.hayGuardado = false;
    state.pantalla = PANTALLAS.JUGANDO;
  }

  // Escribe en localStorage la partida en curso (se llama al entrar en PAUSA).
  function guardarEstadoPartida() {
    guardarPartida({
      version: 1,
      nivelIndice: state.nivelIndice,
      puntuacion: state.puntuacion,
      vidas: state.vidas,
      rapidez: bola.rapidez,
      vivos: snapshotBloquesVivos(state.nivelIndice),
    });
  }

  // Cierra la partida: guarda el highscore y refresca el valor mostrado.
  function terminarPartida(resultado) {
    borrarPartida();
    setHighscore(state.puntuacion);
    state.highscore = getHighscore();
    state.resultado = resultado;
    state.pantalla = PANTALLAS.FIN;
    // SPEC 08: aviso de fin de partida con la puntuacion final. VICTORIA y
    // DERROTA emiten el mismo mensaje; el canvas ya pinta el texto correcto.
    window.postMessage(
      { source: "arkanoid", type: "gameover", score: state.puntuacion },
      window.location.origin,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SPEC 08 — Emision de estado al HUD React (window.postMessage al propio origen).
  // Solo emite si cambio score / lives / level / phase (chequeo sucio barato).
  // ═══════════════════════════════════════════════════════════════════════════════

  const FASE_POR_PANTALLA = {
    [PANTALLAS.INICIO]: "menu",
    [PANTALLAS.JUGANDO]: "playing",
    [PANTALLAS.PAUSA]: "paused",
    [PANTALLAS.FIN]: "gameover",
  };

  let ultimoEmitido = null;

  function emitirEstado() {
    const score = state.puntuacion;
    const lives = state.vidas;
    const level = state.nivelIndice + 1;
    const phase = FASE_POR_PANTALLA[state.pantalla];

    if (
      ultimoEmitido &&
      ultimoEmitido.score === score &&
      ultimoEmitido.lives === lives &&
      ultimoEmitido.level === level &&
      ultimoEmitido.phase === phase
    ) {
      return;
    }
    ultimoEmitido = { score, lives, level, phase };

    window.postMessage(
      { source: "arkanoid", type: "state", score, lives, level, phase },
      window.location.origin,
    );
  }

  function actualizar(dt) {
    if (state.pantalla === PANTALLAS.INICIO) {
      if (!state.hayGuardado) state.menuIndice = 0;

      if (consumirTecla("ArrowUp"))
        state.menuIndice = Math.max(0, state.menuIndice - 1);
      if (consumirTecla("ArrowDown"))
        state.menuIndice = Math.min(1, state.menuIndice + 1);

      let confirmar = consumirEspacio() || consumirTecla("Enter");

      const clic = consumirClic();
      if (clic) {
        const opcion = opcionEnPunto(clic.x, clic.y, 2);
        if (opcion === 0 || (opcion === 1 && state.hayGuardado)) {
          state.menuIndice = opcion;
          confirmar = true;
        }
      }

      if (confirmar) {
        if (state.menuIndice === 1 && state.hayGuardado) reanudarPartida();
        else nuevaPartida();
      }
      return;
    }

    if (state.pantalla === PANTALLAS.JUGANDO) {
      if (consumirTecla("KeyP")) {
        guardarEstadoPartida();
        state.pausaConMenu = false;
        state.pantalla = PANTALLAS.PAUSA;
        return;
      }
      if (consumirTecla("Escape")) {
        guardarEstadoPartida();
        state.pausaConMenu = true;
        state.menuIndice = 0;
        state.pantalla = PANTALLAS.PAUSA;
        return;
      }

      actualizarPaddle(dt);

      if (!state.bolaLanzada) {
        pegarBolaAlPaddle();
        if (consumirEspacio()) {
          lanzarBola();
          state.bolaLanzada = true;
        }
      } else {
        moverBola(dt);
        rebotarEnParedes();
        rebotarEnPaddle();
        colisionBloques();
        actualizarEfectos(dt);

        if (comprobarCaida() && state.vidas <= 0) {
          terminarPartida(RESULTADOS.DERROTA);
          return;
        }

        if (!quedanBloques()) {
          if (state.nivelIndice < NIVELES.length - 1) {
            state.nivelIndice++;
            empezarNivel();
          } else {
            terminarPartida(RESULTADOS.VICTORIA);
          }
        }
      }
      return;
    }

    if (state.pantalla === PANTALLAS.PAUSA) {
      if (!state.pausaConMenu) {
        // Overlay rapido: P reanuda, Esc pasa al menu de pausa.
        if (consumirTecla("KeyP")) state.pantalla = PANTALLAS.JUGANDO;
        else if (consumirTecla("Escape")) {
          state.pausaConMenu = true;
          state.menuIndice = 0;
        }
        return;
      }

      // Menu de pausa: P o Esc reanudan directamente.
      if (consumirTecla("KeyP") || consumirTecla("Escape")) {
        state.pantalla = PANTALLAS.JUGANDO;
        return;
      }

      if (consumirTecla("ArrowUp"))
        state.menuIndice = Math.max(0, state.menuIndice - 1);
      if (consumirTecla("ArrowDown"))
        state.menuIndice = Math.min(1, state.menuIndice + 1);

      let confirmar = consumirEspacio() || consumirTecla("Enter");

      const clic = consumirClic();
      if (clic) {
        const opcion = opcionEnPunto(clic.x, clic.y, 2);
        if (opcion !== -1) {
          state.menuIndice = opcion;
          confirmar = true;
        }
      }

      if (confirmar) {
        if (state.menuIndice === 1) irAInicio();
        else state.pantalla = PANTALLAS.JUGANDO;
      }
      return;
    }

    if (state.pantalla === PANTALLAS.FIN) {
      if (consumirEspacio()) irAInicio();
      return;
    }
  }

  function dibujar() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    switch (state.pantalla) {
      case PANTALLAS.INICIO:
        dibujarMenuInicio(ctx, state, state.hayGuardado);
        break;
      case PANTALLAS.JUGANDO:
        dibujarBloques(ctx);
        dibujarEfectos(ctx);
        dibujarPaddle(ctx);
        dibujarBola(ctx);
        dibujarHud(ctx, state);
        break;
      case PANTALLAS.PAUSA:
        dibujarBloques(ctx);
        dibujarEfectos(ctx);
        dibujarPaddle(ctx);
        dibujarBola(ctx);
        dibujarHud(ctx, state);
        if (state.pausaConMenu) dibujarMenuPausa(ctx, state);
        else dibujarPausaOverlay(ctx);
        break;
      case PANTALLAS.FIN:
        dibujarFin(ctx, state);
        break;
    }
  }

  function bucle(tiempo) {
    // tiempo viene en milisegundos; dt en segundos.
    let dt = (tiempo - ultimoTiempo) / 1000;
    ultimoTiempo = tiempo;
    if (dt > DT_MAX) dt = DT_MAX;

    actualizar(dt);
    emitirEstado();
    dibujar();

    rafId = requestAnimationFrame(bucle);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Boot re-entrante (SPEC 08). Arranca el bucle solo cuando el spritesheet esta
  // listo; `stop()` cancela el rAF, marca `detenido` y quita todos los listeners.
  // ═══════════════════════════════════════════════════════════════════════════════

  state.highscore = getHighscore();
  iniciarInput(canvas);
  irAInicio();
  loadSpritesheet(() => {
    if (detenido) return; // stop() corrio antes de que cargara el PNG
    rafId = requestAnimationFrame((tiempo) => {
      if (detenido) return;
      ultimoTiempo = tiempo;
      rafId = requestAnimationFrame(bucle);
    });
  });

  // SPEC 08 — Llamadas directas React -> juego (no son mensajes). Disponibles
  // mientras startArkanoid corre; stop() las elimina.

  // "Jugar de nuevo": nueva partida sin recrear el <canvas>. Equivale a la
  // antigua nuevaPartida() pero sin borrarPartida (no hay persistencia propia).
  function reiniciarArkanoid() {
    reiniciarContadores();
    empezarNivel();
  }

  // Botón "Pausa" del control deck: alterna JUGANDO <-> PAUSA en overlay rapido
  // (state.pausaConMenu = false), igual que la tecla P. Fuera de JUGANDO / PAUSA
  // es no-op. Las teclas P / Esc siguen funcionando igual.
  function alternarPausaArkanoid() {
    if (state.pantalla === PANTALLAS.JUGANDO) {
      state.pausaConMenu = false;
      state.pantalla = PANTALLAS.PAUSA;
    } else if (state.pantalla === PANTALLAS.PAUSA) {
      state.pantalla = PANTALLAS.JUGANDO;
    }
  }

  window.restartArkanoid = reiniciarArkanoid;
  window.toggleArkanoidPause = alternarPausaArkanoid;

  function stop() {
    detenido = true;
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    canvas.removeEventListener("mousemove", onMouseMove);
    canvas.removeEventListener("mouseleave", onMouseLeave);
    canvas.removeEventListener("click", onClick);
    if (window.restartArkanoid === reiniciarArkanoid) {
      delete window.restartArkanoid;
    }
    if (window.toggleArkanoidPause === alternarPausaArkanoid) {
      delete window.toggleArkanoidPause;
    }
  }

  return stop;
}

window.startArkanoid = startArkanoid;
