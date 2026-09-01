-- SPEC 06 — Tabla de puntuaciones.
-- Crea public.scores (FK a games.slug), activa RLS con una única política de
-- lectura pública (anon + authenticated) y siembra las filas de
-- lib/leaderboards.ts con estas conversiones:
--   score "3,333,360" -> 3333360 (bigint, sin comas)
--   date  "1984-10-26" -> achieved_at = '1984-10-26'
--   date  "HOY"        -> achieved_at = null
-- La fila { player: 'TU MEJOR MARCA', isCurrentUser: true } de pac-man se omite.
-- rank NO se siembra: es posición calculada en la capa de presentación.

create table public.scores (
  id           uuid primary key default gen_random_uuid(),
  game_slug    text not null references public.games(slug),
  player       text not null,
  score        bigint not null,
  achieved_at  date,               -- null = "HOY" en el mock
  created_at   timestamptz not null default now()
);

alter table public.scores enable row level security;

create policy "public_read_scores" on public.scores
  for select to anon, authenticated using (true);

insert into public.scores (game_slug, player, score, achieved_at)
values
  -- pac-man (sin la fila "TU MEJOR MARCA")
  ('pac-man', 'NEON_KNIGHT', 3333360, '1984-10-26'),
  ('pac-man', 'CYBER_GHOST', 3124500, '1985-03-12'),
  ('pac-man', 'RETRO_KING',  2890120, '1988-11-05'),
  ('pac-man', 'PLAYER_ONE',  2500000, '1990-01-14'),
  ('pac-man', 'WINKY',       1980450, '1991-07-22'),
  -- arkanoid
  ('arkanoid', 'VAUS_PRIME', 1204880, '1987-02-09'),
  ('arkanoid', 'DOH_SLAYER',  998540, '1988-06-30'),
  ('arkanoid', 'BRICK_LORD',  874220, '1989-04-18'),
  ('arkanoid', 'PADDLE_X',    612000, '1991-09-03'),
  ('arkanoid', 'RICOCHET',    540150, '1993-12-25'),
  -- tetris
  ('tetris', 'BLOCK_TSAR', 8540200, '1985-03-12'),
  ('tetris', 'LINE_CLEAR', 7120550, '1986-08-01'),
  ('tetris', 'TETRA_NEO',  6800100, '1988-11-05'),
  ('tetris', 'SOFT_DROP',  5410900, '1990-01-14'),
  ('tetris', 'T_SPIN',     4900300, '1992-07-19'),
  -- snake
  ('snake', 'LONG_TAIL',   9990, '1998-05-21'),
  ('snake', 'PIXEL_BITE',  8420, '1999-01-07'),
  ('snake', 'GRID_RUNNER', 7150, '2000-10-02'),
  ('snake', 'APPLE_HUNT',  5600, '2001-03-30'),
  ('snake', 'COIL',        4010, '2002-12-11'),
  -- space-invaders
  ('space-invaders', 'EARTH_GUARD', 92310, '1979-06-14'),
  ('space-invaders', 'BUNKER_ACE',  81760, '1980-02-28'),
  ('space-invaders', 'LASER_MK2',   74900, '1981-11-19'),
  ('space-invaders', 'SHIELD_9',    60050, '1983-05-06'),
  ('space-invaders', 'UFO_BONUS',   51400, '1985-08-22'),
  -- asteroids
  ('asteroids', 'THRUST_VEC', 412880, '1980-04-11'),
  ('asteroids', 'HYPERSPACE', 356540, '1981-07-03'),
  ('asteroids', 'ROCK_SPLIT', 298120, '1982-09-27'),
  ('asteroids', 'SAUCER_DWN', 204000, '1984-01-15'),
  ('asteroids', 'DRIFT',      163750, '1986-06-08');
