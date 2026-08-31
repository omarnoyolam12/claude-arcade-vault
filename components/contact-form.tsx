"use client";

import { useActionState, useState } from "react";
import { sendContactMessage } from "@/app/acerca-de/actions";
import type { ContactFormState } from "@/app/acerca-de/actions";

// Un módulo "use server" solo puede exportar funciones async, así que el estado
// inicial se define aquí (cliente) en vez de importarse desde actions.ts.
const initialContactState: ContactFormState = { ok: false };

const SCANLINE_SVG =
  "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGxpbmUgeDE9IjAiIHkxPSIxMCIgeDI9IjIwIiB5Mj0iMTAiIHN0cm9rZT0iIzAwZGNlNSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIiAvPjwvc3ZnPg==')";

const labelClass =
  "mb-1 block font-body text-label-sm uppercase tracking-widest text-primary-fixed";

const fieldClass =
  "w-full border-2 border-outline-variant bg-surface-container px-4 py-3 font-body text-body-md text-on-surface transition-all placeholder:text-outline-variant focus:border-primary-fixed focus:shadow-[0_0_10px_rgba(99,247,255,0.4)] focus:outline-none";

const fieldErrorClass = "mt-1 font-body text-label-sm text-error";

export function ContactForm() {
  const [state, formAction, pending] = useActionState(
    sendContactMessage,
    initialContactState,
  );

  // Campos controlados: un envío correcto los limpia; un error conserva lo escrito.
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [mensaje, setMensaje] = useState("");

  // Ajuste de estado en render (patrón React): al llegar un nuevo estado con
  // ok === true, vaciamos los campos. React vuelve a renderizar de inmediato.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.ok) {
      setNombre("");
      setEmail("");
      setMensaje("");
    }
  }

  const fieldErrors = state.fieldErrors ?? {};

  return (
    <div className="relative border-2 border-primary-fixed-dim bg-surface-container-low p-8 shadow-[0_0_20px_rgba(0,220,229,0.2)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{ backgroundImage: SCANLINE_SVG }}
      />

      <div aria-live="polite" className="relative z-10">
        {state.ok && (
          <p className="mb-6 border-2 border-primary-fixed bg-[rgba(99,247,255,0.08)] px-4 py-3 font-body text-label-lg uppercase tracking-widest text-primary-fixed">
            Mensaje enviado — te respondemos en 24-48h
          </p>
        )}
        {state.formError && (
          <p className="mb-6 border-2 border-error bg-[rgba(255,180,171,0.08)] px-4 py-3 font-body text-label-lg uppercase tracking-widest text-error">
            {state.formError}
          </p>
        )}
      </div>

      <form action={formAction} className="relative z-10 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="contacto-nombre" className={labelClass}>
            Nombre
          </label>
          <input
            id="contacto-nombre"
            name="nombre"
            type="text"
            required
            autoComplete="name"
            placeholder="px_kai"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            aria-invalid={fieldErrors.nombre ? true : undefined}
            className={fieldClass}
          />
          {fieldErrors.nombre && <p className={fieldErrorClass}>{fieldErrors.nombre}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="contacto-email" className={labelClass}>
            Correo electrónico
          </label>
          <input
            id="contacto-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="jugador@vault.gg"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={fieldErrors.email ? true : undefined}
            className={fieldClass}
          />
          {fieldErrors.email && <p className={fieldErrorClass}>{fieldErrors.email}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="contacto-mensaje" className={labelClass}>
            Mensaje
          </label>
          <textarea
            id="contacto-mensaje"
            name="mensaje"
            rows={4}
            required
            placeholder="Cuéntanos qué tienes en mente..."
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            aria-invalid={fieldErrors.mensaje ? true : undefined}
            className={fieldClass}
          />
          {fieldErrors.mensaje && <p className={fieldErrorClass}>{fieldErrors.mensaje}</p>}
        </div>

        {/* Honeypot anti-spam: invisible y fuera del orden de tabulación. */}
        <div className="sr-only" aria-hidden>
          <label htmlFor="contacto-empresa">Empresa</label>
          <input
            id="contacto-empresa"
            name="empresa"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            defaultValue=""
          />
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-3 bg-secondary-container px-10 py-4 font-body text-label-lg font-bold uppercase tracking-widest text-on-secondary-fixed transition-all duration-100 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,77,128,0.8)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 disabled:hover:shadow-none"
          >
            {pending ? "Enviando..." : "Enviar"}
          </button>
        </div>
      </form>
    </div>
  );
}
