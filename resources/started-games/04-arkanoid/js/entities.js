// Entidades del juego: paddle y bola. Movimiento y dibujo.

import { ANCHO, ALTO } from './state.js';
import { input } from './input.js';
import {
  NIVELES,
  LETRA_A_COLOR,
  PUNTOS_POR_COLOR,
  BLOQUE_ANCHO,
  BLOQUE_ALTO,
  MARGEN_SUPERIOR,
  MARGEN_LATERAL,
} from './levels.js';

export const paddle = {
  x: 360,
  y: 560,
  ancho: 80,
  alto: 16,
  velocidad: 480, // px/s con teclado
};

export const bola = {
  x: 400,
  y: 544,
  radio: 8,
  vx: 0,
  vy: 0,
  rapidez: 260, // modulo de la velocidad en el nivel actual
};

// Bloques del nivel actual. Se rellena con construirNivel().
export const bloques = [];

// Construye la rejilla del nivel a partir de su layout de letras de color.
export function construirNivel(nivelIndice) {
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

export function quedanBloques() {
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
export function snapshotBloquesVivos(nivelIndice) {
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
export function aplicarBloquesVivos(vivos) {
  for (const b of bloques) {
    const f = filaDeBloque(b);
    const c = colDeBloque(b);
    if (vivos[f] && c >= 0 && c < vivos[f].length) {
      b.vivo = vivos[f][c];
    }
  }
}

export function dibujarBloques(ctx) {
  for (const b of bloques) {
    if (!b.vivo) continue;
    window.drawSprite(ctx, `block_${b.color}`, b.x, b.y, b.ancho, b.alto);
  }
}

function limitar(valor, min, max) {
  return Math.max(min, Math.min(max, valor));
}

// Coloca el paddle centrado horizontalmente y la bola pegada encima de el.
export function centrarPaddle() {
  paddle.x = (ANCHO - paddle.ancho) / 2;
}

// Deja la bola pegada al centro del paddle, sin velocidad.
export function pegarBolaAlPaddle() {
  bola.x = paddle.x + paddle.ancho / 2;
  bola.y = paddle.y - bola.radio;
  bola.vx = 0;
  bola.vy = 0;
}

// Lanza la bola recta hacia arriba con la rapidez del nivel actual.
export function lanzarBola() {
  bola.vx = 0;
  bola.vy = -bola.rapidez;
}

// Integra la posicion de la bola. Las colisiones llegan en el Paso 7.
export function moverBola(dt) {
  bola.x += bola.vx * dt;
  bola.y += bola.vy * dt;
}

export function actualizarPaddle(dt) {
  // Teclado: siempre activo.
  if (input.izquierda) paddle.x -= paddle.velocidad * dt;
  if (input.derecha) paddle.x += paddle.velocidad * dt;

  // Raton: solo cuando el cursor esta sobre el canvas; su posicion manda.
  if (input.ratonX !== null) {
    paddle.x = input.ratonX - paddle.ancho / 2;
  }

  paddle.x = limitar(paddle.x, 0, ANCHO - paddle.ancho);
}

export function dibujarPaddle(ctx) {
  window.drawSprite(ctx, 'paddle', paddle.x, paddle.y, paddle.ancho, paddle.alto);
}

export function dibujarBola(ctx) {
  window.drawSprite(
    ctx,
    'ball',
    bola.x - bola.radio,
    bola.y - bola.radio,
    bola.radio * 2,
    bola.radio * 2,
  );
}
