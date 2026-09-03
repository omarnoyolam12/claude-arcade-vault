"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/anon";

/** Resultado de un intento de guardado de puntuación. */
type GuardarResult = { ok: boolean; error?: string };

// Etiqueta fija: no hay auth en el proyecto todavía (igual que las lecturas del
// leaderboard se identifican por un `player` de texto libre).
const PLAYER_LABEL = "G4M3R_X";

/**
 * Inserta la puntuación de una partida de Tetris en `public.scores`.
 *
 * El reproductor solo habilita "Guardar puntuación" en estado `gameover`, así
 * que esta acción asume esa precondición y no recibe más contexto que `score`:
 * los demás campos (`game_slug`, `player`, `achieved_at`) los fija aquí.
 *
 * Usa el cliente sin cookies `@/lib/supabase/anon`; la política RLS
 * `anon_insert_scores` (SPEC 07) permite el INSERT con `achieved_at is null`,
 * `score > 0` y `player <> ''`. No se usa `SUPABASE_SECRET_KEY`.
 */
export async function guardarPuntuacionTetris(input: {
  score: number;
}): Promise<GuardarResult> {
  const { score } = input;

  if (!Number.isInteger(score) || score <= 0) {
    return {
      ok: false,
      error: "La puntuación debe ser un número entero mayor que cero.",
    };
  }

  const supabase = createClient();
  const { error } = await supabase.from("scores").insert({
    game_slug: "tetris",
    player: PLAYER_LABEL,
    score,
    achieved_at: null,
  });

  if (error) {
    console.error("[tetris] No se pudo guardar la puntuación:", error);
    return {
      ok: false,
      error: "No se pudo guardar la puntuación. Inténtalo de nuevo.",
    };
  }

  revalidatePath("/salon-de-la-fama");
  revalidatePath("/juegos/tetris");
  return { ok: true };
}

/**
 * Inserta la puntuación de una partida de Arkanoid en `public.scores`.
 *
 * Gemela de `guardarPuntuacionTetris`: el reproductor solo habilita "Guardar
 * puntuación" en estado `gameover`, así que esta acción asume esa precondición y
 * solo recibe `score`; el resto de campos (`game_slug`, `player`, `achieved_at`)
 * los fija aquí.
 *
 * Usa el cliente sin cookies `@/lib/supabase/anon`; la política RLS
 * `anon_insert_scores` (SPEC 07) —no específica de slug— cubre este INSERT. No se
 * usa `SUPABASE_SECRET_KEY`.
 */
export async function guardarPuntuacionArkanoid(input: {
  score: number;
}): Promise<GuardarResult> {
  const { score } = input;

  if (!Number.isInteger(score) || score <= 0) {
    return {
      ok: false,
      error: "La puntuación debe ser un número entero mayor que cero.",
    };
  }

  const supabase = createClient();
  const { error } = await supabase.from("scores").insert({
    game_slug: "arkanoid",
    player: PLAYER_LABEL,
    score,
    achieved_at: null,
  });

  if (error) {
    console.error("[arkanoid] No se pudo guardar la puntuación:", error);
    return {
      ok: false,
      error: "No se pudo guardar la puntuación. Inténtalo de nuevo.",
    };
  }

  revalidatePath("/salon-de-la-fama");
  revalidatePath("/juegos/arkanoid");
  return { ok: true };
}

/**
 * Inserta la puntuación de una partida de Snake en `public.scores`.
 *
 * Gemela de `guardarPuntuacionTetris` / `guardarPuntuacionArkanoid`: el
 * reproductor solo habilita "Guardar puntuación" en estado `gameover`, así que
 * esta acción asume esa precondición y solo recibe `score`; el resto de campos
 * (`game_slug`, `player`, `achieved_at`) los fija aquí.
 *
 * Usa el cliente sin cookies `@/lib/supabase/anon`; la política RLS
 * `anon_insert_scores` (SPEC 07) —no específica de slug— cubre este INSERT. No se
 * usa `SUPABASE_SECRET_KEY`.
 */
export async function guardarPuntuacionSnake(input: {
  score: number;
}): Promise<GuardarResult> {
  const { score } = input;

  if (!Number.isInteger(score) || score <= 0) {
    return {
      ok: false,
      error: "La puntuación debe ser un número entero mayor que cero.",
    };
  }

  const supabase = createClient();
  const { error } = await supabase.from("scores").insert({
    game_slug: "snake",
    player: PLAYER_LABEL,
    score,
    achieved_at: null,
  });

  if (error) {
    console.error("[snake] No se pudo guardar la puntuación:", error);
    return {
      ok: false,
      error: "No se pudo guardar la puntuación. Inténtalo de nuevo.",
    };
  }

  revalidatePath("/salon-de-la-fama");
  revalidatePath("/juegos/snake");
  return { ok: true };
}
