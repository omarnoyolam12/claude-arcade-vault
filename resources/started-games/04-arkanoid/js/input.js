// Estado de entrada: teclado (flechas, A/D, Espacio) y raton sobre el canvas.

export const input = {
  izquierda: false,
  derecha: false,
  ratonX: null, // posicion X dentro del canvas (px logicos), o null si el cursor no esta encima
  ratonY: null, // posicion Y dentro del canvas (px logicos), o null si el cursor no esta encima
};

let espacioPendiente = false;

// Teclas discretas pendientes (flanco de bajada, sin repeticion). Se consumen
// una sola vez con consumirTecla(code).
const teclasDiscretas = new Set();
const CODIGOS_DISCRETOS = ['KeyP', 'Escape', 'ArrowUp', 'ArrowDown', 'Enter'];

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

export function iniciarInput(canvas) {
  window.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        input.izquierda = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        input.derecha = true;
        break;
      case 'Space':
        if (!e.repeat) espacioPendiente = true;
        e.preventDefault(); // evita el scroll de la pagina
        break;
    }
    if (!e.repeat && CODIGOS_DISCRETOS.includes(e.code)) {
      teclasDiscretas.add(e.code);
      if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        e.preventDefault(); // evita el scroll de la pagina al navegar menus
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        input.izquierda = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        input.derecha = false;
        break;
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    const p = aLogico(canvas, e);
    input.ratonX = p.x;
    input.ratonY = p.y;
  });

  canvas.addEventListener('mouseleave', () => {
    input.ratonX = null;
    input.ratonY = null;
  });

  canvas.addEventListener('click', (e) => {
    clicPendiente = aLogico(canvas, e);
  });
}

// Devuelve true una sola vez por cada pulsacion de Espacio (flanco, no repeticion).
export function consumirEspacio() {
  if (espacioPendiente) {
    espacioPendiente = false;
    return true;
  }
  return false;
}

// Devuelve true una sola vez por cada pulsacion de la tecla discreta indicada
// ('KeyP' | 'Escape' | 'ArrowUp' | 'ArrowDown' | 'Enter').
export function consumirTecla(code) {
  if (teclasDiscretas.has(code)) {
    teclasDiscretas.delete(code);
    return true;
  }
  return false;
}

// Devuelve { x, y } (px logicos) del ultimo clic sobre el canvas una sola vez,
// o null si no hay clic pendiente.
export function consumirClic() {
  if (clicPendiente) {
    const p = clicPendiente;
    clicPendiente = null;
    return p;
  }
  return null;
}
