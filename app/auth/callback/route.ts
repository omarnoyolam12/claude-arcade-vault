import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Supabase redirige aquí con un `code` en dos casos: tras el consentimiento
 * OAuth (Google/GitHub) y al seguir el enlace de confirmación de correo o de
 * recuperación de contraseña. Intercambia el `code` por una sesión (cookies
 * vía el cliente de servidor) y redirige al destino final.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  // Solo se usa para el flujo de recuperación de contraseña (valor fijo que
  // nosotros mismos ponemos en el `redirectTo` de `resetPasswordForEmail`,
  // nunca un valor arbitrario del request).
  const next =
    searchParams.get("next") === "/acceso/nueva-contrasena"
      ? "/acceso/nueva-contrasena"
      : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/acceso?error=callback`);
}
