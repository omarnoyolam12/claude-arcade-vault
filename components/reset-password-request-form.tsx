"use client";

import { useActionState } from "react";

import { solicitarRestablecimiento } from "@/app/acceso/actions";
import type { AuthActionState } from "@/app/acceso/actions";

// Un módulo "use server" solo puede exportar funciones async, así que el
// estado inicial se define aquí (cliente) en vez de importarse de actions.ts.
const initialState: AuthActionState = { ok: false };

export function ResetPasswordRequestForm() {
  const [state, formAction, pending] = useActionState(
    solicitarRestablecimiento,
    initialState,
  );

  return (
    <form action={formAction} className="relative space-y-8">
      {state.info && (
        <p
          aria-live="polite"
          className="border-2 border-primary-fixed bg-[rgba(99,247,255,0.08)] px-4 py-3 font-body text-label-sm uppercase tracking-widest text-primary-fixed"
        >
          {state.info}
        </p>
      )}

      <div>
        <label
          htmlFor="reset-email"
          className="mb-2 block font-body text-label-sm uppercase tracking-[0.1em] text-primary-fixed"
        >
          Correo electrónico
        </label>
        <input
          id="reset-email"
          name="email"
          type="email"
          placeholder="player@arcade.net"
          autoComplete="email"
          required
          aria-invalid={state.fieldErrors?.email ? true : undefined}
          className="input-terminal bg-surface-container-low text-primary-fixed placeholder:text-outline"
        />
        {state.fieldErrors?.email && (
          <p className="mt-2 font-body text-label-sm text-error" role="alert">
            {state.fieldErrors.email}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn w-full py-3 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Enviar enlace de recuperación"}
      </button>
    </form>
  );
}
