import type { User } from "@supabase/supabase-js";

/**
 * Nombre a mostrar en el header para un usuario autenticado. Prioriza el
 * username elegido al registrarse con credenciales; para logins por
 * proveedor (Google/GitHub) cae en los metadatos que ya trae el proveedor.
 */
export function getDisplayName(user: User): string {
  const metadata = user.user_metadata as Record<string, unknown>;
  return (
    (metadata.username as string) ||
    (metadata.full_name as string) ||
    (metadata.user_name as string) ||
    (metadata.name as string) ||
    user.email?.split("@")[0] ||
    "Jugador"
  );
}
