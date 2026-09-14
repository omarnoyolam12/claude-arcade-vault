-- SPEC game-jam/frogger/01 — Alta de Frogger en el catálogo.
-- Inserta la fila 'frogger' en public.games (creada en 0001_create_games.sql).
-- Sin migración nueva sobre public.scores: la política anon_insert_scores
-- (0003_scores_allow_anon_insert.sql) no es específica de slug.
-- Descrita para esta spec; no se aplica automáticamente por el agente.

insert into public.games
  (slug, title, category_label, tags, short_description, long_description, year, best_score, image, image_alt, sort_order)
values
  (
    'frogger',
    'FROGGER',
    'ARCADE',
    array['REFLEJOS', 'CLÁSICO'],
    'Cruza la carretera y el río sin convertirte en papilla.',
    'Guía a la rana a través de una carretera cargada de tráfico y un río de troncos y tortugas hasta llegar a una de las cinco casas vacías. Un coche o el agua libre bajo tus patas cuestan una vida: solo los reflejos y la anticipación llevan a las cinco casas ocupadas. El clásico de cruces imposibles que definió un género entero.',
    1981,
    '000,000',
    '/games/frogger/cover.svg',
    'Ilustración retrofuturista de una rana de neón verde saltando entre coches magenta en una carretera y troncos cian flotando en un río oscuro, con fuerte estética CRT.',
    7
  );
