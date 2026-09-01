// Dibujo de texto superpuesto: pantallas INICIO / FIN y HUD durante el juego.

import { ANCHO, ALTO, RESULTADOS } from './state.js';

function textoCentrado(ctx, texto, y, tamano, color = '#ffffff') {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `${tamano}px "Courier New", Courier, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, ANCHO / 2, y);
  ctx.restore();
}

export function dibujarInicio(ctx, state) {
  textoCentrado(ctx, 'ARKANOID', ALTO / 2 - 60, 56);
  textoCentrado(ctx, 'Pulsa Espacio para jugar', ALTO / 2 + 10, 24);
  textoCentrado(ctx, `Highscore: ${state.highscore}`, ALTO / 2 + 60, 18, '#8aa0ff');
}

// HUD de la partida: vidas, nivel, puntuacion y highscore.
export function dibujarHud(ctx, state) {
  ctx.save();
  ctx.font = '16px "Courier New", Courier, monospace';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 4;
  ctx.fillStyle = '#ffffff';

  ctx.textAlign = 'left';
  ctx.fillText(`Vidas: ${state.vidas}`, 12, 10);

  ctx.textAlign = 'center';
  ctx.fillText(`Nivel ${state.nivelIndice + 1}`, ANCHO / 2, 10);

  ctx.textAlign = 'right';
  ctx.fillText(`Puntos: ${state.puntuacion}`, ANCHO - 12, 10);

  ctx.fillStyle = '#8aa0ff';
  ctx.fillText(`Highscore: ${state.highscore}`, ANCHO - 12, 30);

  ctx.restore();
}

// Se completa en el Paso 13.
export function dibujarFin(ctx, state) {
  const gano = state.resultado === RESULTADOS.VICTORIA;
  textoCentrado(
    ctx,
    gano ? 'HAS GANADO' : 'GAME OVER',
    ALTO / 2 - 60,
    48,
    gano ? '#7dd87f' : '#ff6b6b',
  );
  textoCentrado(ctx, `Puntuacion: ${state.puntuacion}`, ALTO / 2, 22);
  textoCentrado(ctx, `Highscore: ${state.highscore}`, ALTO / 2 + 34, 18, '#8aa0ff');
  textoCentrado(ctx, 'Pulsa Espacio para volver al menú', ALTO / 2 + 80, 20);
}
