// Catálogo de juegos. Los datos viven en `public.games` (Supabase) y se leen
// con el cliente sin cookies `@/lib/supabase/anon`. Solo lectura: no hay
// escritura ni fallback a datos mock — si la consulta falla, se lanza.

import { createClient } from "@/lib/supabase/anon";
import type { Database } from "@/lib/supabase/database.types";

type GameRow = Database["public"]["Tables"]["games"]["Row"];

export interface Game {
  slug: string;
  title: string;
  categoryLabel: string; // ← category_label
  tags: string[];
  shortDescription: string; // ← short_description
  longDescription: string; // ← long_description
  year: number;
  bestScore: string; // ← best_score
  image: string;
  imageAlt: string; // ← image_alt
}

// Mapea una fila snake_case de `public.games` a la interfaz `Game` en camelCase.
// `sort_order` no se expone: solo se usa en el `ORDER BY` de las consultas.
function toGame(row: GameRow): Game {
  return {
    slug: row.slug,
    title: row.title,
    categoryLabel: row.category_label,
    tags: row.tags,
    shortDescription: row.short_description,
    longDescription: row.long_description,
    year: row.year,
    bestScore: row.best_score,
    image: row.image,
    imageAlt: row.image_alt,
  };
}

export async function getGames(): Promise<Game[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return data.map(toGame);
}

export async function getGame(slug: string): Promise<Game | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;

  return data ? toGame(data) : undefined;
}

export async function getGameSlugs(): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("games")
    .select("slug")
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return data.map((row) => row.slug);
}
