import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/supabase/database.types";

/**
 * Cliente de Supabase para componentes de navegador (`"use client"`).
 *
 * Lee las variables `NEXT_PUBLIC_*`, que Next inyecta en el bundle del cliente
 * en tiempo de build. La clave publicable es segura en el navegador: respeta
 * las políticas RLS del proyecto.
 *
 * El código de servidor no debe importar este módulo; para Server Components,
 * Server Actions y Route Handlers usa `@/lib/supabase/server`.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
