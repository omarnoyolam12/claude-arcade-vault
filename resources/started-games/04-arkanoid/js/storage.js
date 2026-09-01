// Persistencia del highscore en localStorage. Clave versionada para poder migrar.

import { NIVELES } from './levels.js';

const CLAVE_HIGHSCORE = 'arkanoid:highscore:v1';
const CLAVE_PARTIDA = 'arkanoid:savegame:v1';

export function getHighscore() {
  try {
    return Number(localStorage.getItem(CLAVE_HIGHSCORE)) || 0;
  } catch (_) {
    return 0; // localStorage deshabilitado (modo privado): highscore solo en memoria
  }
}

// Guarda n solo si supera el highscore actual.
export function setHighscore(n) {
  try {
    if (n > getHighscore()) localStorage.setItem(CLAVE_HIGHSCORE, String(n));
  } catch (_) {
    // Sin persistencia disponible: se ignora.
  }
}

// --- Partida guardada (SPEC 03) ---------------------------------------------
//
// Forma del objeto: { version:1, nivelIndice, puntuacion, vidas, rapidez,
// vivos: [[bool, ...], ...] } donde vivos es paralela a NIVELES[nivelIndice].

export function guardarPartida(datos) {
  try {
    localStorage.setItem(CLAVE_PARTIDA, JSON.stringify(datos));
  } catch (_) {
    // localStorage deshabilitado (modo privado): no se persiste.
  }
}

// Devuelve el objeto guardado, o null si falta, no parsea o no valida.
export function cargarPartida() {
  try {
    const crudo = localStorage.getItem(CLAVE_PARTIDA);
    if (crudo === null) return null;

    const datos = JSON.parse(crudo);
    if (!datos || datos.version !== 1) return null;

    const { nivelIndice, vivos } = datos;
    if (!Number.isInteger(nivelIndice) || nivelIndice < 0 || nivelIndice > NIVELES.length - 1) {
      return null;
    }

    const layout = NIVELES[nivelIndice];
    if (!Array.isArray(vivos) || vivos.length !== layout.length) return null;
    for (let fila = 0; fila < layout.length; fila++) {
      if (!Array.isArray(vivos[fila]) || vivos[fila].length !== layout[fila].length) {
        return null;
      }
    }

    return datos;
  } catch (_) {
    return null; // localStorage deshabilitado o JSON corrupto
  }
}

export function hayPartidaGuardada() {
  return cargarPartida() !== null;
}

export function borrarPartida() {
  try {
    localStorage.removeItem(CLAVE_PARTIDA);
  } catch (_) {
    // Sin persistencia disponible: se ignora.
  }
}
