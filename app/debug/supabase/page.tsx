import { createClient } from "@/lib/supabase/server";

// Ruta temporal de verificación de la integración de Supabase (SPEC 04).
// No está enlazada desde ninguna navegación. La borra la spec que consuma
// esta infraestructura. Render dinámico: las comprobaciones se hacen en cada
// visita, sin cachear.
export const dynamic = "force-dynamic";

type Check = {
  label: string;
  ok: boolean;
  detail: string;
};

async function runChecks(): Promise<{ checks: Check[]; allOk: boolean }> {
  const checks: Check[] = [];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  checks.push({
    label: "NEXT_PUBLIC_SUPABASE_URL",
    ok: Boolean(url),
    detail: url ? "definida" : "ausente",
  });
  checks.push({
    label: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ok: Boolean(publishableKey),
    detail: publishableKey ? "definida" : "ausente",
  });

  // Sin configuración no tiene sentido seguir: se degrada aquí sin lanzar.
  if (!url || !publishableKey) {
    return { checks, allOk: false };
  }

  // Health del servicio de Auth.
  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: publishableKey },
      cache: "no-store",
    });
    checks.push({
      label: "GET /auth/v1/health",
      ok: res.status === 200,
      detail: `HTTP ${res.status}`,
    });
  } catch (error) {
    checks.push({
      label: "GET /auth/v1/health",
      ok: false,
      detail: error instanceof Error ? error.message : "fallo de red",
    });
  }

  // Cliente de servidor + sesión. Sin login, `user` debe ser null sin lanzar.
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      checks.push({
        label: "supabase.auth.getUser()",
        // "Auth session missing!" es lo esperado cuando no hay sesión.
        ok: error.message.toLowerCase().includes("session missing"),
        detail: error.message,
      });
    } else {
      checks.push({
        label: "supabase.auth.getUser()",
        ok: true,
        detail: data.user
          ? `usuario ${data.user.id}`
          : "usuario null (sin sesión)",
      });
    }
  } catch (error) {
    checks.push({
      label: "supabase.auth.getUser()",
      ok: false,
      detail: error instanceof Error ? error.message : "excepción inesperada",
    });
  }

  return { checks, allOk: checks.every((c) => c.ok) };
}

export default async function DebugSupabasePage() {
  const { checks, allOk } = await runChecks();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 font-mono text-sm">
      <h1 className="text-lg font-bold">Verificación de Supabase</h1>
      <p className="mt-2 text-neutral-500">
        Ruta temporal (SPEC 04). Comprueba que las variables de entorno, el
        health de Auth y el cliente de servidor funcionan.
      </p>

      <div
        className={`mt-6 rounded-md border px-4 py-3 font-bold ${
          allOk
            ? "border-green-600 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300"
            : "border-red-600 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300"
        }`}
      >
        {allOk
          ? "OK — Supabase responde correctamente."
          : "FALLO — revisa el detalle abajo."}
      </div>

      <ul className="mt-6 space-y-2">
        {checks.map((check) => (
          <li key={check.label} className="flex items-start gap-3">
            <span
              aria-hidden
              className={check.ok ? "text-green-600" : "text-red-600"}
            >
              {check.ok ? "OK" : "X"}
            </span>
            <span className="flex-1">
              <span className="font-semibold">{check.label}</span>
              <span className="text-neutral-500"> — {check.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
