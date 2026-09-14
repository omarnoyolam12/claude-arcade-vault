"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { ReactNode } from "react";

import {
  iniciarSesionConCredenciales,
  iniciarSesionOAuth,
  registrarConCredenciales,
} from "@/app/acceso/actions";
import type { AuthActionState } from "@/app/acceso/actions";

type Tab = "login" | "register";

// Un módulo "use server" solo puede exportar funciones async, así que el
// estado inicial se define aquí (cliente) en vez de importarse de actions.ts.
const initialAuthState: AuthActionState = { ok: false };

const iconClass = "pointer-events-none absolute left-0 h-5 w-5 text-outline";

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className={iconClass}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <rect x="4" y="10" width="16" height="11" />
      <path strokeLinecap="round" d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className={iconClass}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="14" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 6 9 7 9-7" />
    </svg>
  );
}

function IdIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className={iconClass}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="14" />
      <circle cx="8.5" cy="12" r="2" />
      <path strokeLinecap="round" d="M13 10h5M13 14h5" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className={iconClass}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <circle cx="8" cy="8" r="4" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m11 11 9 9M17 17l2-2M15 15l1.5-1.5"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
      />
      <path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

const oauthButtonClass =
  "flex w-full cursor-pointer items-center justify-center gap-3 border-2 border-outline-variant bg-surface-container-low py-3 font-body text-label-lg uppercase tracking-[0.1em] text-on-surface transition-colors hover:border-primary-fixed hover:text-primary-fixed";

/**
 * Botones de continuar con Google/GitHub, debajo del botón primario de cada
 * tab. Deben ir DENTRO del `<form>` de login/registro (no en uno propio: los
 * forms anidados son inválidos en HTML y React 19 lo reporta como "A React
 * form was unexpectedly submitted"), usando `formAction` para apuntar a una
 * Server Action distinta a la del submit primario.
 */
function OAuthButtons() {
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center gap-3">
        <span aria-hidden className="h-px flex-1 bg-outline-variant" />
        <span className="font-body text-label-sm uppercase tracking-[0.1em] text-outline">
          O continúa con
        </span>
        <span aria-hidden className="h-px flex-1 bg-outline-variant" />
      </div>
      <button
        type="submit"
        formNoValidate
        formAction={iniciarSesionOAuth.bind(null, "google")}
        className={oauthButtonClass}
      >
        <GoogleIcon />
        Continuar con Google
      </button>
      <button
        type="submit"
        formNoValidate
        formAction={iniciarSesionOAuth.bind(null, "github")}
        className={oauthButtonClass}
      >
        <GithubIcon />
        Continuar con GitHub
      </button>
    </div>
  );
}

type FieldProps = {
  id: string;
  name: string;
  label: string;
  type: string;
  placeholder: string;
  icon: ReactNode;
  autoComplete?: string;
  required?: boolean;
  error?: string;
};

function Field({
  id,
  name,
  label,
  type,
  placeholder,
  icon,
  autoComplete,
  required,
  error,
}: FieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block font-body text-label-sm uppercase tracking-[0.1em] text-primary-fixed"
      >
        {label}
      </label>
      <div className="relative flex items-center">
        {icon}
        <input
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={error ? true : undefined}
          className="input-terminal bg-surface-container-low pl-10 text-primary-fixed placeholder:text-outline"
        />
      </div>
      {error && (
        <p className="mt-2 font-body text-label-sm text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 cursor-pointer border-b-[3px] pb-4 text-center font-body text-label-lg uppercase tracking-[0.1em] transition-all ${
        active
          ? "border-primary-fixed text-primary-fixed [text-shadow:0_0_10px_#63f7ff]"
          : "border-transparent text-outline hover:text-primary-fixed"
      }`}
    >
      {children}
    </button>
  );
}

/** Banner de error/info general del formulario, sobre el borde neon existente. */
function FormBanner({ state }: { state: AuthActionState }) {
  if (state.formError) {
    return (
      <p
        role="alert"
        className="border-2 border-error bg-[rgba(255,180,171,0.08)] px-4 py-3 font-body text-label-sm uppercase tracking-widest text-error"
      >
        {state.formError}
      </p>
    );
  }
  if (state.info) {
    return (
      <p
        aria-live="polite"
        className="border-2 border-primary-fixed bg-[rgba(99,247,255,0.08)] px-4 py-3 font-body text-label-sm uppercase tracking-widest text-primary-fixed"
      >
        {state.info}
      </p>
    );
  }
  return null;
}

export function AuthTabs() {
  const [tab, setTab] = useState<Tab>("login");

  const [loginState, loginAction, loginPending] = useActionState(
    iniciarSesionConCredenciales,
    initialAuthState,
  );
  const [registerState, registerAction, registerPending] = useActionState(
    registrarConCredenciales,
    initialAuthState,
  );

  return (
    <div className="relative">
      {/* Bezel arcade */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-4 -z-10 border-[16px] border-[#080808] shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_2px_10px_rgba(255,255,255,0.05),inset_0_0_30px_rgba(0,0,0,1)]"
      />

      <div className="relative z-10 border border-primary-fixed-dim bg-[rgba(5,5,8,0.85)] p-10 shadow-[0_0_40px_rgba(0,220,229,0.2)] backdrop-blur-md sm:p-12">
        {/* Scanlines de la tarjeta */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(99,247,255,0.03)_2px,rgba(99,247,255,0.03)_4px)]"
        />

        <div className="relative mb-10 flex border-b border-outline-variant">
          <TabButton active={tab === "login"} onClick={() => setTab("login")}>
            Iniciar sesión
          </TabButton>
          <TabButton
            active={tab === "register"}
            onClick={() => setTab("register")}
          >
            Crear cuenta
          </TabButton>
        </div>

        {tab === "login" ? (
          <form className="relative space-y-8" action={loginAction}>
            <FormBanner state={loginState} />
            <Field
              id="login-email"
              name="email"
              label="Correo electrónico"
              type="email"
              placeholder="player@arcade.net"
              autoComplete="email"
              required
              icon={<MailIcon />}
              error={loginState.fieldErrors?.email}
            />
            <Field
              id="login-password"
              name="password"
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              icon={<LockIcon />}
              error={loginState.fieldErrors?.password}
            />
            <div className="space-y-4 pt-4">
              <button
                type="submit"
                disabled={loginPending}
                className="btn w-full py-3 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loginPending ? "Iniciando sesión..." : "Iniciar sesión"}
              </button>
              <button type="button" className="btn btn-secondary w-full py-3">
                Jugar como invitado
              </button>
            </div>
            <OAuthButtons />
            <div className="text-center">
              <Link
                href="/acceso/restablecer"
                className="font-body text-label-sm uppercase tracking-[0.1em] text-primary-fixed underline decoration-dashed underline-offset-4 transition-colors hover:text-primary"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </form>
        ) : (
          <form className="relative space-y-8" action={registerAction}>
            <FormBanner state={registerState} />
            <Field
              id="reg-email"
              name="email"
              label="Correo electrónico"
              type="email"
              placeholder="player@arcade.net"
              autoComplete="email"
              required
              icon={<MailIcon />}
              error={registerState.fieldErrors?.email}
            />
            <Field
              id="reg-username"
              name="username"
              label="Usuario"
              type="text"
              placeholder="NEW_CHALLENGER"
              autoComplete="off"
              required
              icon={<IdIcon />}
              error={registerState.fieldErrors?.username}
            />
            <Field
              id="reg-password"
              name="password"
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              required
              icon={<KeyIcon />}
              error={registerState.fieldErrors?.password}
            />
            <div className="pt-4">
              <button
                type="submit"
                disabled={registerPending}
                className="btn w-full py-3 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {registerPending ? "Registrando..." : "Registrar"}
              </button>
            </div>
            <OAuthButtons />
          </form>
        )}
      </div>
    </div>
  );
}
