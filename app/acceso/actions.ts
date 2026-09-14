"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Estado de las Server Actions de autenticación. Un único tipo cubre las
 * variantes de credenciales, OAuth y recuperación de contraseña.
 */
export interface AuthActionState {
  ok: boolean;
  formError?: string;
  fieldErrors?: {
    email?: string;
    password?: string;
    username?: string;
  };
  /** Mensaje informativo, p.ej. "Revisa tu correo para confirmar tu cuenta". */
  info?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX = 120;
// Mínimo de Supabase Auth por defecto (contraseñas más cortas no se aceptan).
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 72;
const USERNAME_MIN = 3;
const USERNAME_MAX = 24;

export async function registrarConCredenciales(
  prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  void prevState;

  const email = String(formData.get("email") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const fieldErrors: NonNullable<AuthActionState["fieldErrors"]> = {};

  if (email.length > EMAIL_MAX || !EMAIL_RE.test(email)) {
    fieldErrors.email = "Introduce un correo electrónico válido.";
  }
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    fieldErrors.username = `El usuario debe tener entre ${USERNAME_MIN} y ${USERNAME_MAX} caracteres.`;
  }
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    fieldErrors.password = `La contraseña debe tener entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres.`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });

  if (error) {
    console.error("[acceso] signUp devolvió un error:", error);
    return {
      ok: false,
      formError:
        error.code === "user_already_exists"
          ? "Ese correo ya tiene una cuenta registrada."
          : "No se pudo crear la cuenta. Inténtalo de nuevo.",
    };
  }

  return { ok: true, info: "Revisa tu correo para confirmar tu cuenta." };
}

export async function iniciarSesionConCredenciales(
  prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  void prevState;

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const fieldErrors: NonNullable<AuthActionState["fieldErrors"]> = {};

  if (!EMAIL_RE.test(email)) {
    fieldErrors.email = "Introduce un correo electrónico válido.";
  }
  if (password.length === 0) {
    fieldErrors.password = "Introduce tu contraseña.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("[acceso] signInWithPassword devolvió un error:", error);
    return { ok: false, formError: "Correo o contraseña incorrectos." };
  }

  redirect("/");
}

/**
 * `provider` va bindeado desde el `<form action={...}>` del botón
 * correspondiente (`iniciarSesionOAuth.bind(null, "google" | "github")`).
 */
export async function iniciarSesionOAuth(provider: "google" | "github") {
  const headersList = await headers();
  const origin = headersList.get("origin");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${origin}/auth/callback` },
  });

  if (error) {
    console.error(
      `[acceso] signInWithOAuth(${provider}) devolvió un error:`,
      error,
    );
    redirect("/acceso?error=oauth");
  }

  if (data.url) {
    redirect(data.url);
  }
}

/** Usado como `<form action={cerrarSesion}>` desde el header (desktop y mobile nav). */
export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function solicitarRestablecimiento(
  prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  void prevState;

  const email = String(formData.get("email") ?? "").trim();

  if (!EMAIL_RE.test(email)) {
    return {
      ok: false,
      fieldErrors: { email: "Introduce un correo electrónico válido." },
    };
  }

  const headersList = await headers();
  const origin = headersList.get("origin");

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/acceso/nueva-contrasena`,
  });

  if (error) {
    console.error("[acceso] resetPasswordForEmail devolvió un error:", error);
  }

  // Mismo mensaje exista o no la cuenta: no revela si el correo está registrado.
  return {
    ok: true,
    info: "Si ese correo tiene una cuenta, te enviamos un enlace para restablecer tu contraseña.",
  };
}

/**
 * Requiere la sesión de recuperación que Supabase deja activa al seguir el
 * enlace del correo (intercambiada en `app/auth/callback/route.ts`).
 */
export async function actualizarContrasena(
  prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  void prevState;

  const password = String(formData.get("password") ?? "");

  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return {
      ok: false,
      fieldErrors: {
        password: `La contraseña debe tener entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres.`,
      },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error("[acceso] updateUser devolvió un error:", error);
    return {
      ok: false,
      formError:
        "No se pudo actualizar la contraseña. El enlace pudo haber caducado; solicita uno nuevo.",
    };
  }

  redirect("/");
}
