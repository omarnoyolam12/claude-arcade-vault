-- SPEC 07 — Escritura real de puntuaciones de Tetris.
-- Añade UNA sola política INSERT a public.scores, abierta a `anon` (aún no hay
-- auth en el proyecto; postura heredada de SPEC 06 para las lecturas).
-- El `with check` acota los valores admisibles: partida "HOY" (achieved_at null),
-- score positivo y player no vacío. Sin políticas UPDATE / DELETE.
-- Las políticas SELECT de SPEC 06 (public_read_scores) no se tocan.

create policy "anon_insert_scores" on public.scores
  for insert to anon
  with check (achieved_at is null and score > 0 and player <> '');
