// Definicion de los tres niveles y tabla de puntuacion por color.
//
// Cada nivel es un array de filas. Cada caracter es un color o '.' (vacio):
//   R=red  C=cyan  Y=yellow  M=magenta  H=hotpink  G=green  X=gray
//
// Rejilla: 12 columnas. Bloque 64x24, sin separacion.
// Margen superior 60 px, margen lateral 16 px.  (16 + 12*64 + 16 = 800)

export const COLUMNAS = 12;
export const BLOQUE_ANCHO = 64;
export const BLOQUE_ALTO = 24;
export const MARGEN_SUPERIOR = 60;
export const MARGEN_LATERAL = 16;

export const LETRA_A_COLOR = {
  R: 'red',
  C: 'cyan',
  Y: 'yellow',
  M: 'magenta',
  H: 'hotpink',
  G: 'green',
  X: 'gray',
};

export const PUNTOS_POR_COLOR = {
  red: 90,
  hotpink: 80,
  magenta: 70,
  yellow: 60,
  cyan: 50,
  green: 40,
  gray: 30,
};

// Tres niveles. Cada fila mide exactamente 12 caracteres.
export const NIVELES = [
  // Nivel 1: cuatro filas solidas, calentamiento.
  [
    'RRRRRRRRRRRR',
    'YYYYYYYYYYYY',
    'GGGGGGGGGGGG',
    'CCCCCCCCCCCC',
  ],
  // Nivel 2: seis filas con huecos alternos entre filas solidas.
  [
    'M.M.M.M.M.M.',
    'HHHHHHHHHHHH',
    'Y.YY.YY.YY.Y',
    'CCCCCCCCCCCC',
    'G..G..G..G..',
    'RRRRRRRRRRRR',
  ],
  // Nivel 3: diamante hueco de ocho filas.
  [
    '.....RR.....',
    '....RYYR....',
    '...RYMMYR...',
    '..RYMGGMYR..',
    '..RYMGGMYR..',
    '...RYMMYR...',
    '....RYYR....',
    '.....RR.....',
  ],
];
