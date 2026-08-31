"use server";

import { Resend } from "resend";

/**
 * Estado de la Server Action del formulario de contacto de `/acerca-de`.
 * No hay persistencia: este tipo solo describe el resultado de un envío.
 */
export interface ContactFormState {
  /** true tras un envío correcto (o descarte silencioso por honeypot). */
  ok: boolean;
  /** Error global: configuración ausente o fallo de Resend. */
  formError?: string;
  /** Errores de validación por campo. */
  fieldErrors?: {
    nombre?: string;
    email?: string;
    mensaje?: string;
  };
}

/** Límites de validación (solo servidor). */
const NOMBRE_MIN = 2;
const NOMBRE_MAX = 80;
const EMAIL_MAX = 120;
const MENSAJE_MIN = 10;
const MENSAJE_MAX = 2000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SUBJECT = "Nuevo mensaje de contacto — Arcade Vault";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendContactMessage(
  prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  void prevState;

  const nombre = String(formData.get("nombre") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const mensaje = String(formData.get("mensaje") ?? "").trim();
  const empresa = String(formData.get("empresa") ?? "").trim();

  // Honeypot: si un bot rellena `empresa`, descartamos en silencio.
  if (empresa !== "") {
    return { ok: true };
  }

  // Validación exclusivamente en el servidor.
  const fieldErrors: NonNullable<ContactFormState["fieldErrors"]> = {};

  if (nombre.length < NOMBRE_MIN || nombre.length > NOMBRE_MAX) {
    fieldErrors.nombre = `El nombre debe tener entre ${NOMBRE_MIN} y ${NOMBRE_MAX} caracteres.`;
  }
  if (email.length > EMAIL_MAX || !EMAIL_RE.test(email)) {
    fieldErrors.email = "Introduce un correo electrónico válido.";
  }
  if (mensaje.length < MENSAJE_MIN || mensaje.length > MENSAJE_MAX) {
    fieldErrors.mensaje = `El mensaje debe tener entre ${MENSAJE_MIN} y ${MENSAJE_MAX} caracteres.`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_TO_EMAIL;

  if (!apiKey || !toEmail) {
    console.error(
      "[contacto] Envío de correo no configurado: falta " +
        (!apiKey ? "RESEND_API_KEY" : "CONTACT_TO_EMAIL"),
    );
    return { ok: false, formError: "El envío de correo no está configurado." };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

  const text = [
    "Nuevo mensaje de contacto — Arcade Vault",
    "",
    `Nombre: ${nombre}`,
    `Correo: ${email}`,
    "",
    "Mensaje:",
    mensaje,
  ].join("\n");

  const html = [
    "<h2>Nuevo mensaje de contacto — Arcade Vault</h2>",
    `<p><strong>Nombre:</strong> ${escapeHtml(nombre)}</p>`,
    `<p><strong>Correo:</strong> ${escapeHtml(email)}</p>`,
    `<p><strong>Mensaje:</strong></p>`,
    `<p>${escapeHtml(mensaje).replace(/\n/g, "<br>")}</p>`,
  ].join("");

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from: fromEmail,
      to: toEmail,
      replyTo: email,
      subject: SUBJECT,
      text,
      html,
    });

    if (error) {
      console.error("[contacto] Resend devolvió un error:", error);
      return {
        ok: false,
        formError: "No se pudo enviar el mensaje. Inténtalo de nuevo.",
      };
    }
  } catch (err) {
    console.error("[contacto] La llamada a Resend lanzó una excepción:", err);
    return {
      ok: false,
      formError: "No se pudo enviar el mensaje. Inténtalo de nuevo.",
    };
  }

  return { ok: true };
}
