// Punto de entrada del juego. Se carga como modulo ES desde index.html.
// Orquesta el bucle, la maquina de estados y las llamadas a cada modulo.

import { PANTALLAS, RESULTADOS, state, rapidezDeNivel, reiniciarContadores } from './state.js';
import { NIVELES } from './levels.js';
import { dibujarHud, dibujarFin } from './hud.js';
import { iniciarInput, consumirEspacio, consumirTecla, consumirClic } from './input.js';
import {
  bola,
  actualizarPaddle,
  dibujarPaddle,
  dibujarBola,
  centrarPaddle,
  pegarBolaAlPaddle,
  lanzarBola,
  moverBola,
  construirNivel,
  dibujarBloques,
  quedanBloques,
  aplicarBloquesVivos,
  snapshotBloquesVivos,
} from './entities.js';
import {
  rebotarEnParedes,
  rebotarEnPaddle,
  colisionBloques,
  comprobarCaida,
} from './collisions.js';
import {
  getHighscore,
  setHighscore,
  hayPartidaGuardada,
  cargarPartida,
  borrarPartida,
  guardarPartida,
} from './storage.js';
import {
  dibujarMenuInicio,
  dibujarPausaOverlay,
  dibujarMenuPausa,
  opcionEnPunto,
} from './menu.js';
import { actualizarEfectos, dibujarEfectos, limpiarExplosiones } from './effects.js';

const canvas = document.getElementById('juego');
const ctx = canvas.getContext('2d');

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
}

function actualizar(dt) {
  if (state.pantalla === PANTALLAS.INICIO) {
    if (!state.hayGuardado) state.menuIndice = 0;

    if (consumirTecla('ArrowUp')) state.menuIndice = Math.max(0, state.menuIndice - 1);
    if (consumirTecla('ArrowDown')) state.menuIndice = Math.min(1, state.menuIndice + 1);

    let confirmar = consumirEspacio() || consumirTecla('Enter');

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
    if (consumirTecla('KeyP')) {
      guardarEstadoPartida();
      state.pausaConMenu = false;
      state.pantalla = PANTALLAS.PAUSA;
      return;
    }
    if (consumirTecla('Escape')) {
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
      if (consumirTecla('KeyP')) state.pantalla = PANTALLAS.JUGANDO;
      else if (consumirTecla('Escape')) {
        state.pausaConMenu = true;
        state.menuIndice = 0;
      }
      return;
    }

    // Menu de pausa: P o Esc reanudan directamente.
    if (consumirTecla('KeyP') || consumirTecla('Escape')) {
      state.pantalla = PANTALLAS.JUGANDO;
      return;
    }

    if (consumirTecla('ArrowUp')) state.menuIndice = Math.max(0, state.menuIndice - 1);
    if (consumirTecla('ArrowDown')) state.menuIndice = Math.min(1, state.menuIndice + 1);

    let confirmar = consumirEspacio() || consumirTecla('Enter');

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
  ctx.fillStyle = '#000';
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
  dibujar();

  requestAnimationFrame(bucle);
}

// Arranca el bucle solo cuando el spritesheet esta listo.
state.highscore = getHighscore();
iniciarInput(canvas);
irAInicio();
window.loadSpritesheet(() => {
  requestAnimationFrame((tiempo) => {
    ultimoTiempo = tiempo;
    requestAnimationFrame(bucle);
  });
});
