import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Refresca la sesión de Supabase en cada navegación, siguiendo el patrón
 * oficial de `@supabase/ssr` para el App Router.
 *
 * Crea una response mutable, instancia un `createServerClient` que mantiene
 * sincronizadas las cookies de la request y de la response, y llama a
 * `auth.getUser()` para forzar el refresco del token de acceso cuando toca.
 *
 * Hoy no hay autenticación: `getUser()` es un no-op inofensivo y esta función
 * **no** redirige ni protege rutas. Deja el refresco de sesión cableado para
 * cuando llegue la auth real.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Sin configuración, no se toca la sesión: el proxy corre en cada request y
  // lanzar aquí tumbaría todas las rutas. Se degrada dejando pasar la request
  // tal cual. `/debug/supabase` es quien reporta la config ausente.
  if (!url || !publishableKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  // Fuerza la inicialización/refresco perezoso de la sesión antes de renderizar.
  await supabase.auth.getUser();

  return supabaseResponse;
}
