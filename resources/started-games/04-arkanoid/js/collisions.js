// Colisiones de la bola: paredes, caida por abajo, paddle y bloques.

import { ANCHO, ALTO, state } from './state.js';
import { bola, paddle, bloques, pegarBolaAlPaddle } from './entities.js';
import { reproducir } from './audio.js';
import { emitirExplosion, limpiarExplosiones } from './effects.js';

const ANGULO_MAX = (60 * Math.PI) / 180; // 60 grados desde la vertical

// Rebote contra las paredes superior, izquierda y derecha (la inferior no rebota).
export function rebotarEnParedes() {
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

  if (reboto) reproducir('rebote');
}

// Rebote contra el paddle. El punto de impacto define el angulo de salida.
export function rebotarEnPaddle() {
  if (bola.vy <= 0) return; // solo cuando baja

  const dentroX = bola.x + bola.radio >= paddle.x && bola.x - bola.radio <= paddle.x + paddle.ancho;
  const tocaY = bola.y + bola.radio >= paddle.y && bola.y - bola.radio <= paddle.y + paddle.alto;
  if (!dentroX || !tocaY) return;

  const centroPaddle = paddle.x + paddle.ancho / 2;
  let offset = (bola.x - centroPaddle) / (paddle.ancho / 2);
  offset = Math.max(-1, Math.min(1, offset));

  const angulo = offset * ANGULO_MAX;
  bola.vx = bola.rapidez * Math.sin(angulo);
  bola.vy = -bola.rapidez * Math.cos(angulo);
  bola.y = paddle.y - bola.radio; // evita que quede encajada en el paddle

  reproducir('rebote');
}

// Colision de la bola contra los bloques vivos. Rompe como maximo uno por frame.
export function colisionBloques() {
  const izq = bola.x - bola.radio;
  const der = bola.x + bola.radio;
  const arr = bola.y - bola.radio;
  const aba = bola.y + bola.radio;

  for (const b of bloques) {
    if (!b.vivo) continue;
    if (der < b.x || izq > b.x + b.ancho || aba < b.y || arr > b.y + b.alto) continue;

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
    reproducir('romper');
    return true;
  }
  return false;
}

// Si la bola cae por debajo del canvas: resta vida y la devuelve al paddle.
// Devuelve true si se ha perdido la bola en este frame.
export function comprobarCaida() {
  if (bola.y - bola.radio <= ALTO) return false;

  state.vidas--;
  state.bolaLanzada = false;
  pegarBolaAlPaddle();
  limpiarExplosiones();
  return true;
}
