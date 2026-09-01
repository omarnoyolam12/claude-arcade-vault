// Efectos de sonido. Se clona el nodo en cada disparo para permitir solapes.

const FUENTES = {
  rebote: 'assets/sounds/ball-bounce.mp3',
  romper: 'assets/sounds/break-sound.mp3',
};

const base = {};
for (const [nombre, ruta] of Object.entries(FUENTES)) {
  const a = new Audio(ruta);
  a.preload = 'auto';
  base[nombre] = a;
}

export function reproducir(nombre) {
  const original = base[nombre];
  if (!original) return;
  try {
    const s = original.cloneNode();
    s.volume = 0.5;
    const p = s.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch (_) {
    // Audio bloqueado hasta la primera interaccion: se ignora.
  }
}
