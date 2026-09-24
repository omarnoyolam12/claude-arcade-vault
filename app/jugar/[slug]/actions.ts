"use server";

import { revalidatePath } from "next/cache";

import { getDisplayName } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Resultado de un intento de guardado de puntuación. */
type GuardarResult = { ok: boolean; error?: string };

/**
 * Inserta la puntuación de una partida de Asteroids en `public.scores`.
 *
 * El reproductor solo habilita "Guardar puntuación" en estado `gameover`, así
 * que esta acción asume esa precondición y no recibe más contexto que
 * `score`: el resto de campos (`game_slug`, `player`, `achieved_at`,
 * `user_id`) los fija aquí.
 *
 * Usa el cliente con cookies `@/lib/supabase/server`, único que autentica el
 * insert ante RLS con el rol `authenticated`. Requiere sesión iniciada: sin
 * ella devuelve un error controlado antes de intentar el insert. La política
 * `authenticated_insert_scores` (SPEC 14) exige `achieved_at is null`,
 * `score > 0`, `player <> ''` y `user_id = auth.uid()`. No se usa
 * `SUPABASE_SECRET_KEY`.
 */
export async function guardarPuntuacionAsteroids(input: {
  score: number;
}): Promise<GuardarResult> {
  const { score } = input;

  if (!Number.isInteger(score) || score <= 0) {
    return {
      ok: false,
      error: "La puntuación debe ser un número entero mayor que cero.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "Debes iniciar sesión para guardar tu puntuación.",
    };
  }

  const { error } = await supabase.from("scores").insert({
    game_slug: "asteroids",
    player: getDisplayName(user),
    score,
    achieved_at: null,
    user_id: user.id,
  });

  if (error) {
    console.error("[asteroids] No se pudo guardar la puntuación:", error);
    return {
      ok: false,
      error: "No se pudo guardar la puntuación. Inténtalo de nuevo.",
    };
  }

  revalidatePath("/salon-de-la-fama");
  revalidatePath("/juegos/asteroids");
  return { ok: true };
}

/**
 * Inserta la puntuación de una partida de Tetris en `public.scores`.
 *
 * Gemela de `guardarPuntuacionAsteroids`: el reproductor solo habilita
 * "Guardar puntuación" en estado `gameover`, así que esta acción asume esa
 * precondición y solo recibe `score`; el resto de campos (`game_slug`,
 * `player`, `achieved_at`, `user_id`) los fija aquí.
 *
 * Usa el cliente con cookies `@/lib/supabase/server`, único que autentica el
 * insert ante RLS con el rol `authenticated`. Requiere sesión iniciada: sin
 * ella devuelve un error controlado antes de intentar el insert. La política
 * `authenticated_insert_scores` (SPEC 14) exige `achieved_at is null`,
 * `score > 0`, `player <> ''` y `user_id = auth.uid()`. No se usa
 * `SUPABASE_SECRET_KEY`.
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "Debes iniciar sesión para guardar tu puntuación.",
    };
  }

  const { error } = await supabase.from("scores").insert({
    game_slug: "tetris",
    player: getDisplayName(user),
    score,
    achieved_at: null,
    user_id: user.id,
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
 * puntuación" en estado `gameover`, así que esta acción asume esa
 * precondición y solo recibe `score`; el resto de campos (`game_slug`,
 * `player`, `achieved_at`, `user_id`) los fija aquí.
 *
 * Usa el cliente con cookies `@/lib/supabase/server`, único que autentica el
 * insert ante RLS con el rol `authenticated`. Requiere sesión iniciada: sin
 * ella devuelve un error controlado antes de intentar el insert. La política
 * `authenticated_insert_scores` (SPEC 14) —no específica de slug— cubre este
 * INSERT. No se usa `SUPABASE_SECRET_KEY`.
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "Debes iniciar sesión para guardar tu puntuación.",
    };
  }

  const { error } = await supabase.from("scores").insert({
    game_slug: "arkanoid",
    player: getDisplayName(user),
    score,
    achieved_at: null,
    user_id: user.id,
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
 * reproductor solo habilita "Guardar puntuación" en estado `gameover`, así
 * que esta acción asume esa precondición y solo recibe `score`; el resto de
 * campos (`game_slug`, `player`, `achieved_at`, `user_id`) los fija aquí.
 *
 * Usa el cliente con cookies `@/lib/supabase/server`, único que autentica el
 * insert ante RLS con el rol `authenticated`. Requiere sesión iniciada: sin
 * ella devuelve un error controlado antes de intentar el insert. La política
 * `authenticated_insert_scores` (SPEC 14) —no específica de slug— cubre este
 * INSERT. No se usa `SUPABASE_SECRET_KEY`.
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "Debes iniciar sesión para guardar tu puntuación.",
    };
  }

  const { error } = await supabase.from("scores").insert({
    game_slug: "snake",
    player: getDisplayName(user),
    score,
    achieved_at: null,
    user_id: user.id,
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

/**
 * Inserta la puntuación de una partida de Frogger en `public.scores`.
 *
 * Gemela de `guardarPuntuacionSnake`: el reproductor solo habilita "Guardar
 * puntuación" en estado `gameover`, así que esta acción asume esa
 * precondición y solo recibe `score`; el resto de campos (`game_slug`,
 * `player`, `achieved_at`, `user_id`) los fija aquí.
 *
 * Usa el cliente con cookies `@/lib/supabase/server`, único que autentica el
 * insert ante RLS con el rol `authenticated`. Requiere sesión iniciada: sin
 * ella devuelve un error controlado antes de intentar el insert. La política
 * `authenticated_insert_scores` (SPEC 14) —no específica de slug— cubre este
 * INSERT. No se usa `SUPABASE_SECRET_KEY`.
 */
export async function guardarPuntuacionFrogger(input: {
  score: number;
}): Promise<GuardarResult> {
  const { score } = input;

  if (!Number.isInteger(score) || score <= 0) {
    return {
      ok: false,
      error: "La puntuación debe ser un número entero mayor que cero.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "Debes iniciar sesión para guardar tu puntuación.",
    };
  }

  const { error } = await supabase.from("scores").insert({
    game_slug: "frogger",
    player: getDisplayName(user),
    score,
    achieved_at: null,
    user_id: user.id,
  });

  if (error) {
    console.error("[frogger] No se pudo guardar la puntuación:", error);
    return {
      ok: false,
      error: "No se pudo guardar la puntuación. Inténtalo de nuevo.",
    };
  }

  revalidatePath("/salon-de-la-fama");
  revalidatePath("/juegos/frogger");
  return { ok: true };
}
