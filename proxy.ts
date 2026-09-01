import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * En Next 16 el convenio `middleware.ts` está deprecado y renombrado a
 * `proxy.ts` (misma funcionalidad, cambia el nombre del archivo y de la
 * función). Aquí solo delega en `updateSession`, que refresca la sesión de
 * Supabase en cada navegación. No redirige ni protege rutas.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Aplica a todas las rutas salvo:
     * - _next/static  (archivos estáticos)
     * - _next/image   (optimización de imágenes)
     * - favicon.ico
     * - archivos de imagen por extensión
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
