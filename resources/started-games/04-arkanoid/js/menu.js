// Layout, hit-test y dibujo de los menus superpuestos (SPEC 03).
//
// Solo geometria y dibujo: no importa nada de collisions.js ni de effects.js.
// El layout de botones es unico (rectOpcion) y lo comparten dibujo y hit-test.

import { ANCHO, ALTO } from './state.js';

const OPCION_ANCHO = 320;
const OPCION_ALTO = 48;
const OPCION_ESPACIADO = 16;

// Rectangulo de una opcion en px logicos (800x600). Columna centrada, ancho y
// alto fijos, opciones apiladas verticalmente y centradas respecto a ALTO.
export function rectOpcion(indice, cantidad) {
  const alturaTotal = cantidad * OPCION_ALTO + (cantidad - 1) * OPCION_ESPACIADO;
  const yPrimera = (ALTO - alturaTotal) / 2;
  return {
    x: (ANCHO - OPCION_ANCHO) / 2,
    y: yPrimera + indice * (OPCION_ALTO + OPCION_ESPACIADO),
    ancho: OPCION_ANCHO,
    alto: OPCION_ALTO,
  };
}

// Indice de la opcion cuyo rect contiene (x, y), o -1.
export function opcionEnPunto(x, y, cantidad) {
  for (let i = 0; i < cantidad; i++) {
    const r = rectOpcion(i, cantidad);
    if (x >= r.x && x <= r.x + r.ancho && y >= r.y && y <= r.y + r.alto) {
      return i;
    }
  }
  return -1;
}

function texto(ctx, cadena, x, y, tamano, color, alineacion = 'center') {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `${tamano}px "Courier New", Courier, monospace`;
  ctx.textAlign = alineacion;
  ctx.textBaseline = 'middle';
  ctx.fillText(cadena, x, y);
  ctx.restore();
}

function capaOscura(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, ANCHO, ALTO);
  ctx.restore();
}

// Dibuja una opcion: recuadro + etiqueta. resaltada la marca; atenuada la apaga.
function dibujarOpcion(ctx, indice, cantidad, etiqueta, resaltada, atenuada) {
  const r = rectOpcion(indice, cantidad);
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = atenuada ? '#555555' : resaltada ? '#8aa0ff' : '#aaaaaa';
  if (resaltada && !atenuada) {
    ctx.fillStyle = 'rgba(138, 160, 255, 0.20)';
    ctx.fillRect(r.x, r.y, r.ancho, r.alto);
  }
  ctx.strokeRect(r.x, r.y, r.ancho, r.alto);
  ctx.restore();

  const color = atenuada ? '#666666' : resaltada ? '#ffffff' : '#cccccc';
  texto(ctx, etiqueta, r.x + r.ancho / 2, r.y + r.alto / 2, 22, color);
}

// Menu de la pantalla INICIO: titulo, "Nueva partida" / "Reanudar", highscore.
export function dibujarMenuInicio(ctx, state, hayGuardado) {
  texto(ctx, 'ARKANOID', ANCHO / 2, rectOpcion(0, 2).y - 70, 56, '#ffffff');
  dibujarOpcion(ctx, 0, 2, 'Nueva partida', state.menuIndice === 0, false);
  dibujarOpcion(ctx, 1, 2, 'Reanudar', state.menuIndice === 1, !hayGuardado);
  const yUltima = rectOpcion(1, 2);
  texto(
    ctx,
    `Highscore: ${state.highscore}`,
    ANCHO / 2,
    yUltima.y + yUltima.alto + 40,
    18,
    '#8aa0ff',
  );
}

// Overlay simple de la pausa rapida (tecla P).
export function dibujarPausaOverlay(ctx) {
  capaOscura(ctx);
  texto(ctx, 'PAUSA', ANCHO / 2, ALTO / 2 - 20, 48, '#ffffff');
  texto(ctx, 'P: continuar · Esc: menú', ANCHO / 2, ALTO / 2 + 40, 20, '#cccccc');
}

// Menu de pausa (tecla Esc): "Continuar" / "Menu principal".
export function dibujarMenuPausa(ctx, state) {
  capaOscura(ctx);
  texto(ctx, 'PAUSA', ANCHO / 2, rectOpcion(0, 2).y - 60, 48, '#ffffff');
  dibujarOpcion(ctx, 0, 2, 'Continuar', state.menuIndice === 0, false);
  dibujarOpcion(ctx, 1, 2, 'Menú principal', state.menuIndice === 1, false);
}
