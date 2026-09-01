// Estado global de la partida y constantes de configuracion.

export const PANTALLAS = { INICIO: 'INICIO', JUGANDO: 'JUGANDO', PAUSA: 'PAUSA', FIN: 'FIN' };

export const RESULTADOS = { VICTORIA: 'VICTORIA', DERROTA: 'DERROTA' };

// Dimensiones logicas del canvas.
export const ANCHO = 800;
export const ALTO = 600;

// Vidas iniciales.
export const VIDAS_INICIALES = 3;

// Rapidez de la bola por nivel (px/s).
export const RAPIDEZ_BASE = 260;
export const INCREMENTO_RAPIDEZ = 40;

// rapidez del nivel n (1-indexado) = RAPIDEZ_BASE + (n - 1) * INCREMENTO_RAPIDEZ
export function rapidezDeNivel(nivelIndice) {
  return RAPIDEZ_BASE + nivelIndice * INCREMENTO_RAPIDEZ;
}

export const state = {
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
export function reiniciarContadores() {
  state.nivelIndice = 0;
  state.puntuacion = 0;
  state.vidas = VIDAS_INICIALES;
  state.resultado = null;
}
