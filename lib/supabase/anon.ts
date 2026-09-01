import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

/**
 * Cliente de Supabase **sin cookies** para lecturas públicas no autenticadas
 * (catálogo de juegos y leaderboard).
 *
 * Usa `createClient` de `@supabase/supabase-js` directamente, no el wrapper de
 * `@supabase/ssr`: no toca `cookies()`, así que se puede llamar desde
 * `generateStaticParams` y desde Server Components sin forzar render dinámico.
 *
 * Para datos por usuario (cuando haya auth) se usa `@/lib/supabase/server`.
 */
export function createClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
