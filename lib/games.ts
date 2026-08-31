// Datos mock del catálogo de juegos. Solo alimentan la UI del MVP visual:
// no hay lógica de negocio, persistencia ni cálculo de puntuaciones.

export interface Game {
  slug: string; // "pac-man" — usado en /juegos/[slug] y /jugar/[slug]
  title: string; // "PAC-MAN"
  categoryLabel: string; // badge sobre la imagen: "MAZE"
  tags: string[]; // ["LABERINTO", "CLÁSICO"]
  shortDescription: string; // texto de la card en la biblioteca
  longDescription: string; // párrafo del panel de detalle
  year: number; // 1980
  bestScore: string; // "333,330" — ya formateado como en el mockup
  image: string; // URL en lh3.googleusercontent.com
  imageAlt: string; // alt descriptivo en español
}

const IMG = "https://lh3.googleusercontent.com/aida-public/";

export const games: Game[] = [
  {
    slug: "arkanoid",
    title: "ARKANOID",
    categoryLabel: "ARCADE",
    tags: ["BLOQUES", "REFLEJOS"],
    shortDescription:
      "Destruye los bloques con tu nave Vaus. Reflejos rápidos requeridos.",
    longDescription:
      "Controla la nave Vaus y rebota la bola contra un muro de bloques de neón hasta pulverizarlo. Recoge cápsulas de mejora para ampliar la nave, multiplicar bolas o disparar láseres. Un clásico de reflejos que exige precisión milimétrica en cada rebote.",
    year: 1986,
    bestScore: "099,420",
    image:
      IMG +
      "AB6AXuCc3l0edN3SmHrND-uZJDyRLuSTtFTydcM7DP9yqrQ3kn8q5HG0cant7fj41PWS28gLXSArCAcEfpityBwproa7AwDLz2oj_x4G8hyZmThfs7uyPKau6-topsrgMSOXpM6nOcgp4CJA5zkFgEDhIvY_-eVGoSWN-gxo72koGXektrR2MzxgtXBIaL9yW6LUiwjLi2frvSTlX21eM13OVvSIkObn2Ut2oc6Gpy3qQUsCIvBLN06VFN6b6Q",
    imageAlt:
      "Ilustración retrofuturista de una paleta de neón desviando una bola brillante hacia un muro de bloques de colores en un vacío oscuro con luces cian y magenta.",
  },
  {
    slug: "tetris",
    title: "TETRIS",
    categoryLabel: "PUZZLE",
    tags: ["PUZZLE", "CLÁSICO"],
    shortDescription:
      "Alinea los bloques cayendo. El clásico rompecabezas soviético.",
    longDescription:
      "Encaja las piezas que caen para completar líneas horizontales y hacerlas desaparecer antes de que la pila llegue al techo. Cuanto más rápido cae la partida, más fina debe ser tu planificación. El rompecabezas que definió un género entero.",
    year: 1984,
    bestScore: "142,800",
    image:
      IMG +
      "AB6AXuCayv6DJedUO4xHrTPS1P1uh1rrlAjKMQ5_bWLHxKyYV3vtYNRdFXdLEV3TD6wAgkLMHKSaqXDsUlEYLPaD0re6JyjjUTJkUNFBqBGtYlpJLrSylS7ut74nGjf2aGPKSZZDdjXCPC98ScifUsl9wfmC-DWrOiVbj2huq36ibzxMGltsBWwYjwfDWtWKFQDSqoaI4UooKQLu3bgjEO9Rq_DPO3Be7Rvvj1WkKV2dVuc1hPip6ULD90RpyQ",
    imageAlt:
      "Vista isométrica de bloques geométricos luminosos en colores primarios cayendo sobre un fondo negro profundo con brillo vaporwave.",
  },
  {
    slug: "snake",
    title: "SNAKE",
    categoryLabel: "CLÁSICO",
    tags: ["CLÁSICO", "SUPERVIVENCIA"],
    shortDescription: "Come para crecer. Evita morder tu propia cola.",
    longDescription:
      "Guía a la serpiente por la cuadrícula devorando cada punto que aparece. Cada bocado la hace más larga y más difícil de manejar: un solo choque contra el muro o contra tu propia cola termina la partida. Reflejos y anticipación a partes iguales.",
    year: 1976,
    bestScore: "003,150",
    image:
      IMG +
      "AB6AXuCrtg6U5ooI26y3_nUQio0yD0pU0bbJ1izGXU1IKtpQmhH4XQdjzguR3N35slxMpKqIJ2FJ99rwhMohfjv2d3Kywa-r3lHS83wRFttwV0_6DYYQE_21PfEljEOcWXF-Xt2eoB4XfSPJj6Wh1QJtrFFqKx00doC4B9_CsTb2qlvX9qCOVGld8RwjXGXoByJudINuXwXxp6L-KnvSngkx6EuREqXHnFx_7e9assVnFX_KdhTs9baoIVVvzQ",
    imageAlt:
      "Serpiente digital de neón verde recorriendo una cuadrícula rígida en busca de una manzana de píxel magenta, con estética CRT de alto contraste.",
  },
  {
    slug: "pac-man",
    title: "PAC-MAN",
    categoryLabel: "MAZE",
    tags: ["LABERINTO", "CLÁSICO"],
    shortDescription:
      "Devora los puntos. Huye de los fantasmas. Sobrevive al laberinto.",
    longDescription:
      "Navega por un laberinto de neón devorando puntos mientras evitas a los implacables fantasmas. Come las pastillas de poder para cambiar las tornas y sumar puntos extra. Un verdadero clásico de las máquinas recreativas que definió la era dorada de los videojuegos.",
    year: 1980,
    bestScore: "333,330",
    image:
      IMG +
      "AB6AXuC41uAWvQRUmq2E9ZTgwtjZG-LzgacAh9NPPtn-FGRSeWHrOwdHoiowTvjgpH8Uq-AvUkMik8zlaemE3Cz5s3egIbmkx3XEdBsT1xILKzUYgXAhYez4Ler-KhINTONmL3sMjf3eKaQ7zidRmjjoIreFSWUPgValKJcORnIWj54_FdqsWTKIZ4Kg-49RLa3SDWqBcPCWV9PKZGC7gKYb2OG3kD2divTuT8nZs-6TBOE8d7ZUwjaKWAfnnw",
    imageAlt:
      "Interpretación de neón de alto contraste de un laberinto clásico: un círculo amarillo brillante recorre pasillos azules perseguido por fantasmas cian, magenta y naranja.",
  },
  {
    slug: "space-invaders",
    title: "SPACE INVADERS",
    categoryLabel: "SHOOTER",
    tags: ["DISPAROS", "CLÁSICO"],
    shortDescription:
      "Defiende la Tierra de hordas alienígenas en descenso constante.",
    longDescription:
      "Mueve tu cañón de lado a lado y abre fuego contra las filas de invasores que descienden sin descanso. Cada alien abatido acelera al resto: cuando quedan pocos, el ataque es frenético. Protégete tras los búnkeres antes de que toquen el suelo.",
    year: 1978,
    bestScore: "045,990",
    image:
      IMG +
      "AB6AXuBVHxYl03cSCvacfb0Mki3J-WTJk-_-hoti5BHYqm_U_xKp_gHyWhHDw61rGweDp0UQ0vEMbhhpmpH2zifnXnN09G7VSHs6zVLrkEPgYOyUR3gM3c-Z6Y6WVJ_94ccVKs-v_5HFVOf3VbrzfZ13Mdb_t6VIYrBmcs0J0H3qGUY5stNPXyUQvXNeRgUVzm7M93Oz_6FRyxwvFeiq7ftQn8o7ZYdUMQmcdpa5gJFkLP8niyAubTZYyZ_6nA",
    imageAlt:
      "Armada de naves alienígenas pixeladas de neón verde descendiendo sobre un vacío estrellado mientras rayos láser magenta cruzan la oscuridad, con fuerte efecto de monitor CRT.",
  },
  {
    slug: "asteroids",
    title: "ASTEROIDS",
    categoryLabel: "SHOOTER",
    tags: ["DISPAROS", "ESPACIO"],
    shortDescription:
      "Navega el campo de asteroides. Dispara para sobrevivir al caos espacial.",
    longDescription:
      "Pilota una nave triangular por un campo de asteroides sin gravedad. Cada roca que revientas se parte en fragmentos más rápidos y erráticos, y los platillos enemigos aparecen sin aviso. Inercia pura: cada empuje del motor cuenta.",
    year: 1979,
    bestScore: "102,400",
    image:
      IMG +
      "AB6AXuDqMvMTtdgfavgA6v3IfkqCXYMrSeyoUA_l8RXjHxD8TmU0qwMZl8B6vhAZdEVg9fUmmaSpafS8hlfCwjPYXh_PCoHO6waPg7Yth0f3SwCpUccN1u7CKAyQg2yzGBTyoXMXGtjOQ1g5pq2vTQ1Pqxu-aXDX86JTSQ0-vRw6nwoORG2opYyxkZLN8ypOwaYrN2N6HieJgtdAkJrFrJsoXMSB4_cwooOt-HrcRn3d6wZgdNaDr7gK94Gi2w",
    imageAlt:
      "Ilustración vectorial minimalista de una nave triangular entre asteroides geométricos, líneas cian intensas sobre fondo negro que simulan un osciloscopio antiguo.",
  },
];

export function getGame(slug: string): Game | undefined {
  return games.find((game) => game.slug === slug);
}

export function getGameSlugs(): string[] {
  return games.map((game) => game.slug);
}
