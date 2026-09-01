-- SPEC 06 — Tabla del catálogo de juegos.
-- Crea public.games, activa RLS con una única política de lectura pública
-- (anon + authenticated) y siembra las 6 filas que hoy viven en lib/games.ts.
-- Sin políticas de escritura: el seed corre con el rol de servicio de la migración.

create table public.games (
  slug              text primary key,
  title             text not null,
  category_label    text not null,
  tags              text[] not null default '{}',
  short_description text not null,
  long_description  text not null,
  year              smallint not null,
  best_score        text not null,   -- ya formateado ("333,330"). Columna propia, NO derivada de scores.
  image             text not null,
  image_alt         text not null,
  sort_order        smallint not null
);

alter table public.games enable row level security;

create policy "public_read_games" on public.games
  for select to anon, authenticated using (true);

insert into public.games
  (slug, title, category_label, tags, short_description, long_description, year, best_score, image, image_alt, sort_order)
values
  (
    'arkanoid',
    'ARKANOID',
    'ARCADE',
    array['BLOQUES', 'REFLEJOS'],
    'Destruye los bloques con tu nave Vaus. Reflejos rápidos requeridos.',
    'Controla la nave Vaus y rebota la bola contra un muro de bloques de neón hasta pulverizarlo. Recoge cápsulas de mejora para ampliar la nave, multiplicar bolas o disparar láseres. Un clásico de reflejos que exige precisión milimétrica en cada rebote.',
    1986,
    '099,420',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCc3l0edN3SmHrND-uZJDyRLuSTtFTydcM7DP9yqrQ3kn8q5HG0cant7fj41PWS28gLXSArCAcEfpityBwproa7AwDLz2oj_x4G8hyZmThfs7uyPKau6-topsrgMSOXpM6nOcgp4CJA5zkFgEDhIvY_-eVGoSWN-gxo72koGXektrR2MzxgtXBIaL9yW6LUiwjLi2frvSTlX21eM13OVvSIkObn2Ut2oc6Gpy3qQUsCIvBLN06VFN6b6Q',
    'Ilustración retrofuturista de una paleta de neón desviando una bola brillante hacia un muro de bloques de colores en un vacío oscuro con luces cian y magenta.',
    1
  ),
  (
    'tetris',
    'TETRIS',
    'PUZZLE',
    array['PUZZLE', 'CLÁSICO'],
    'Alinea los bloques cayendo. El clásico rompecabezas soviético.',
    'Encaja las piezas que caen para completar líneas horizontales y hacerlas desaparecer antes de que la pila llegue al techo. Cuanto más rápido cae la partida, más fina debe ser tu planificación. El rompecabezas que definió un género entero.',
    1984,
    '142,800',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCayv6DJedUO4xHrTPS1P1uh1rrlAjKMQ5_bWLHxKyYV3vtYNRdFXdLEV3TD6wAgkLMHKSaqXDsUlEYLPaD0re6JyjjUTJkUNFBqBGtYlpJLrSylS7ut74nGjf2aGPKSZZDdjXCPC98ScifUsl9wfmC-DWrOiVbj2huq36ibzxMGltsBWwYjwfDWtWKFQDSqoaI4UooKQLu3bgjEO9Rq_DPO3Be7Rvvj1WkKV2dVuc1hPip6ULD90RpyQ',
    'Vista isométrica de bloques geométricos luminosos en colores primarios cayendo sobre un fondo negro profundo con brillo vaporwave.',
    2
  ),
  (
    'snake',
    'SNAKE',
    'CLÁSICO',
    array['CLÁSICO', 'SUPERVIVENCIA'],
    'Come para crecer. Evita morder tu propia cola.',
    'Guía a la serpiente por la cuadrícula devorando cada punto que aparece. Cada bocado la hace más larga y más difícil de manejar: un solo choque contra el muro o contra tu propia cola termina la partida. Reflejos y anticipación a partes iguales.',
    1976,
    '003,150',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCrtg6U5ooI26y3_nUQio0yD0pU0bbJ1izGXU1IKtpQmhH4XQdjzguR3N35slxMpKqIJ2FJ99rwhMohfjv2d3Kywa-r3lHS83wRFttwV0_6DYYQE_21PfEljEOcWXF-Xt2eoB4XfSPJj6Wh1QJtrFFqKx00doC4B9_CsTb2qlvX9qCOVGld8RwjXGXoByJudINuXwXxp6L-KnvSngkx6EuREqXHnFx_7e9assVnFX_KdhTs9baoIVVvzQ',
    'Serpiente digital de neón verde recorriendo una cuadrícula rígida en busca de una manzana de píxel magenta, con estética CRT de alto contraste.',
    3
  ),
  (
    'pac-man',
    'PAC-MAN',
    'MAZE',
    array['LABERINTO', 'CLÁSICO'],
    'Devora los puntos. Huye de los fantasmas. Sobrevive al laberinto.',
    'Navega por un laberinto de neón devorando puntos mientras evitas a los implacables fantasmas. Come las pastillas de poder para cambiar las tornas y sumar puntos extra. Un verdadero clásico de las máquinas recreativas que definió la era dorada de los videojuegos.',
    1980,
    '333,330',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuC41uAWvQRUmq2E9ZTgwtjZG-LzgacAh9NPPtn-FGRSeWHrOwdHoiowTvjgpH8Uq-AvUkMik8zlaemE3Cz5s3egIbmkx3XEdBsT1xILKzUYgXAhYez4Ler-KhINTONmL3sMjf3eKaQ7zidRmjjoIreFSWUPgValKJcORnIWj54_FdqsWTKIZ4Kg-49RLa3SDWqBcPCWV9PKZGC7gKYb2OG3kD2divTuT8nZs-6TBOE8d7ZUwjaKWAfnnw',
    'Interpretación de neón de alto contraste de un laberinto clásico: un círculo amarillo brillante recorre pasillos azules perseguido por fantasmas cian, magenta y naranja.',
    4
  ),
  (
    'space-invaders',
    'SPACE INVADERS',
    'SHOOTER',
    array['DISPAROS', 'CLÁSICO'],
    'Defiende la Tierra de hordas alienígenas en descenso constante.',
    'Mueve tu cañón de lado a lado y abre fuego contra las filas de invasores que descienden sin descanso. Cada alien abatido acelera al resto: cuando quedan pocos, el ataque es frenético. Protégete tras los búnkeres antes de que toquen el suelo.',
    1978,
    '045,990',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBVHxYl03cSCvacfb0Mki3J-WTJk-_-hoti5BHYqm_U_xKp_gHyWhHDw61rGweDp0UQ0vEMbhhpmpH2zifnXnN09G7VSHs6zVLrkEPgYOyUR3gM3c-Z6Y6WVJ_94ccVKs-v_5HFVOf3VbrzfZ13Mdb_t6VIYrBmcs0J0H3qGUY5stNPXyUQvXNeRgUVzm7M93Oz_6FRyxwvFeiq7ftQn8o7ZYdUMQmcdpa5gJFkLP8niyAubTZYyZ_6nA',
    'Armada de naves alienígenas pixeladas de neón verde descendiendo sobre un vacío estrellado mientras rayos láser magenta cruzan la oscuridad, con fuerte efecto de monitor CRT.',
    5
  ),
  (
    'asteroids',
    'ASTEROIDS',
    'SHOOTER',
    array['DISPAROS', 'ESPACIO'],
    'Navega el campo de asteroides. Dispara para sobrevivir al caos espacial.',
    'Pilota una nave triangular por un campo de asteroides sin gravedad. Cada roca que revientas se parte en fragmentos más rápidos y erráticos, y los platillos enemigos aparecen sin aviso. Inercia pura: cada empuje del motor cuenta.',
    1979,
    '102,400',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDqMvMTtdgfavgA6v3IfkqCXYMrSeyoUA_l8RXjHxD8TmU0qwMZl8B6vhAZdEVg9fUmmaSpafS8hlfCwjPYXh_PCoHO6waPg7Yth0f3SwCpUccN1u7CKAyQg2yzGBTyoXMXGtjOQ1g5pq2vTQ1Pqxu-aXDX86JTSQ0-vRw6nwoORG2opYyxkZLN8ypOwaYrN2N6HieJgtdAkJrFrJsoXMSB4_cwooOt-HrcRn3d6wZgdNaDr7gK94Gi2w',
    'Ilustración vectorial minimalista de una nave triangular entre asteroides geométricos, líneas cian intensas sobre fondo negro que simulan un osciloscopio antiguo.',
    6
  );
