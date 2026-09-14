"use client";

import { useActionState } from "react";

import { actualizarContrasena } from "@/app/acceso/actions";
import type { AuthActionState } from "@/app/acceso/actions";

// Un módulo "use server" solo puede exportar funciones async, así que el
// estado inicial se define aquí (cliente) en vez de importarse de actions.ts.
const initialState: AuthActionState = { ok: false };

export function NewPasswordForm() {
  const [state, formAction, pending] = useActionState(
    actualizarContrasena,
    initialState,
  );

  return (
    <form action={formAction} className="relative space-y-8">
      {state.formError && (
        <p
          role="alert"
          className="border-2 border-error bg-[rgba(255,180,171,0.08)] px-4 py-3 font-body text-label-sm uppercase tracking-widest text-error"
        >
          {state.formError}
        </p>
      )}

      <div>
        <label
          htmlFor="new-password"
          className="mb-2 block font-body text-label-sm uppercase tracking-[0.1em] text-primary-fixed"
        >
          Nueva contraseña
        </label>
        <input
          id="new-password"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          required
          aria-invalid={state.fieldErrors?.password ? true : undefined}
          className="input-terminal bg-surface-container-low text-primary-fixed placeholder:text-outline"
        />
        {state.fieldErrors?.password && (
          <p className="mt-2 font-body text-label-sm text-error" role="alert">
            {state.fieldErrors.password}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn w-full py-3 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Guardar contraseña"}
      </button>
    </form>
  );
}
