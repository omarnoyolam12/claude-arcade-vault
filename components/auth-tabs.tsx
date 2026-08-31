"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";

type Tab = "login" | "register";

/** No se envía nada: el MVP visual no tiene backend ni sesión. */
function preventSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
}

const iconClass = "pointer-events-none absolute left-0 h-5 w-5 text-outline";

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path strokeLinecap="round" d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <rect x="4" y="10" width="16" height="11" />
      <path strokeLinecap="round" d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <rect x="3" y="5" width="18" height="14" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 6 9 7 9-7" />
    </svg>
  );
}

function IdIcon() {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <rect x="3" y="5" width="18" height="14" />
      <circle cx="8.5" cy="12" r="2" />
      <path strokeLinecap="round" d="M13 10h5M13 14h5" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <circle cx="8" cy="8" r="4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m11 11 9 9M17 17l2-2M15 15l1.5-1.5" />
    </svg>
  );
}

type FieldProps = {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  icon: ReactNode;
  autoComplete?: string;
  required?: boolean;
};

function Field({ id, label, type, placeholder, icon, autoComplete, required }: FieldProps) {
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
          name={id}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className="input-terminal bg-surface-container-low pl-10 text-primary-fixed placeholder:text-outline"
        />
      </div>
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
      className={`flex-1 border-b-[3px] pb-4 text-center font-body text-label-lg uppercase tracking-[0.1em] transition-all ${
        active
          ? "border-primary-fixed text-primary-fixed [text-shadow:0_0_10px_#63f7ff]"
          : "border-transparent text-outline hover:text-primary-fixed"
      }`}
    >
      {children}
    </button>
  );
}

export function AuthTabs() {
  const [tab, setTab] = useState<Tab>("login");

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
          <TabButton active={tab === "register"} onClick={() => setTab("register")}>
            Crear cuenta
          </TabButton>
        </div>

        {tab === "login" ? (
          <form className="relative space-y-8" onSubmit={preventSubmit}>
            <Field
              id="login-username"
              label="Usuario"
              type="text"
              placeholder="PLAYER_1"
              autoComplete="off"
              required
              icon={<UserIcon />}
            />
            <Field
              id="login-password"
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              icon={<LockIcon />}
            />
            <div className="space-y-4 pt-4">
              <button type="submit" className="btn w-full py-3">
                Iniciar sesión
              </button>
              <button type="button" className="btn btn-secondary w-full py-3">
                Jugar como invitado
              </button>
            </div>
            <div className="text-center">
              <a
                href="#"
                className="font-body text-label-sm uppercase tracking-[0.1em] text-primary-fixed underline decoration-dashed underline-offset-4 transition-colors hover:text-primary"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>
          </form>
        ) : (
          <form className="relative space-y-8" onSubmit={preventSubmit}>
            <Field
              id="reg-email"
              label="Correo electrónico"
              type="email"
              placeholder="player@arcade.net"
              autoComplete="off"
              icon={<MailIcon />}
            />
            <Field
              id="reg-username"
              label="Usuario"
              type="text"
              placeholder="NEW_CHALLENGER"
              autoComplete="off"
              icon={<IdIcon />}
            />
            <Field
              id="reg-password"
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              icon={<KeyIcon />}
            />
            <div className="pt-4">
              <button type="submit" className="btn w-full py-3">
                Registrar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
