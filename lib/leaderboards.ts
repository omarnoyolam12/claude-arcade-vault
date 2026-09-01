// Tablas de puntuaciones. Los datos viven en `public.scores` (Supabase) y se
// leen con el cliente sin cookies `@/lib/supabase/anon`. Solo lectura: si la
// consulta falla, se lanza (sin fallback a datos mock).
//
// El orden y el `rank` se calculan aquí, no se guardan en la BD:
//   score DESC, desempate achieved_at ASC (NULLS LAST). rank = índice + 1.
// El formateo de `score` y `achievedAt` vive en `components/leaderboard-table`.

import { createClient } from "@/lib/supabase/anon";
import type { Database } from "@/lib/supabase/database.types";

type ScoreRow = Database["public"]["Tables"]["scores"]["Row"];

export interface ScoreEntry {
  rank: number; // calculado: posición 1..n dentro del juego
  player: string;
  score: number; // entero; se formatea en LeaderboardTable
  achievedAt: string | null; // "YYYY-MM-DD" | null (null = "HOY")
  isCurrentUser?: boolean; // se conserva en el tipo; sin uso hasta que haya auth
}

// Asigna `rank` 1..n a filas ya ordenadas de una tabla de un solo juego.
function withRanks(
  rows: Pick<ScoreRow, "player" | "score" | "achieved_at">[],
): ScoreEntry[] {
  return rows.map((row, index) => ({
    rank: index + 1,
    player: row.player,
    score: row.score,
    achievedAt: row.achieved_at,
  }));
}

export async function getLeaderboard(slug: string): Promise<ScoreEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("player, score, achieved_at")
    .eq("game_slug", slug)
    .order("score", { ascending: false })
    .order("achieved_at", { ascending: true, nullsFirst: false });

  if (error) throw error;

  return withRanks(data);
}

export async function getAllLeaderboards(): Promise<
  Record<string, ScoreEntry[]>
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("game_slug, player, score, achieved_at")
    .order("game_slug", { ascending: true })
    .order("score", { ascending: false })
    .order("achieved_at", { ascending: true, nullsFirst: false });

  if (error) throw error;

  // Agrupa por juego preservando el orden ya aplicado por la consulta y
  // calcula el `rank` dentro de cada grupo.
  const grouped: Record<
    string,
    Pick<ScoreRow, "player" | "score" | "achieved_at">[]
  > = {};
  for (const row of data) {
    (grouped[row.game_slug] ??= []).push(row);
  }

  const result: Record<string, ScoreEntry[]> = {};
  for (const [gameSlug, rows] of Object.entries(grouped)) {
    result[gameSlug] = withRanks(rows);
  }
  return result;
}
