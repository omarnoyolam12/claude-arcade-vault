// Capa de efectos visuales: animacion de explosion al romper un bloque.
// No depende de la logica del juego; solo dibuja frames del spritesheet.

// Duracion de cada frame en milisegundos. 4 frames * 150 = 600 ms totales.
const MS_POR_FRAME = 150;
const FRAMES_EXPLOSION = 4;

// Array de explosiones vivas. Modulo-privado: se manipula solo con la API.
// Cada explosion: { x, y, ancho, alto, color, transcurrido }.
const explosiones = [];

// Registra una explosion nueva en la posicion y tamano del bloque roto.
export function emitirExplosion(x, y, ancho, alto, color) {
  explosiones.push({ x, y, ancho, alto, color, transcurrido: 0 });
}

// Avanza el tiempo de cada explosion y descarta las que ya terminaron.
export function actualizarEfectos(dt) {
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
export function dibujarEfectos(ctx) {
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
export function limpiarExplosiones() {
  explosiones.length = 0;
}
