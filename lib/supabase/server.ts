import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 *
 * Lee y escribe la sesión en las cookies de la request. En Next 16 `cookies()`
 * es asíncrono, por eso la función es `async`.
 *
 * `setAll` va envuelto en `try/catch`: cuando el cliente se instancia desde un
 * Server Component no se pueden escribir cookies y la llamada lanzaría. Se
 * ignora sin ruido porque el refresco real del token lo hace el middleware
 * (`@/lib/supabase/middleware`).
 *
 * El código de navegador no debe importar este módulo; usa
 * `@/lib/supabase/client`.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Llamado desde un Server Component: no se pueden escribir cookies.
            // El middleware se encarga de refrescar la sesión.
          }
        },
      },
    },
  );
}
