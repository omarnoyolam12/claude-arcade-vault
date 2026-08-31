"use client";

import Link from "next/link";
import { useState } from "react";

const LINKS = [
  { href: "/", label: "Inicio", key: "inicio" },
  { href: "/juegos", label: "Biblioteca", key: "juegos" },
  { href: "/salon-de-la-fama", label: "Salón de la Fama", key: "salon" },
  { href: "/acerca-de", label: "Acerca de", key: "acerca" },
  { href: "/acceso", label: "Acceder", key: "acceso" },
] as const;

type Props = {
  active?: "inicio" | "juegos" | "salon" | "acerca";
};

/** Menú móvil: el botón hamburguesa abre y cierra la lista de enlaces. */
export function MobileNav({ active }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 w-10 items-center justify-center text-primary-fixed transition-transform active:scale-95"
      >
        {open ? (
          <svg
            viewBox="0 0 24 24"
            className="h-8 w-8"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="h-8 w-8"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        )}
      </button>

      {open && (
        <nav className="fixed inset-x-0 top-20 flex flex-col gap-4 border-b-2 border-primary-fixed-dim bg-background px-margin py-6 shadow-[0_0_20px_rgba(0,220,229,0.4)]">
          {LINKS.map((link) => {
            const isActive = active === link.key;
            return (
              <Link
                key={link.key}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`font-body text-body-lg uppercase transition-colors ${
                  isActive
                    ? "text-primary-fixed"
                    : "text-outline hover:text-primary-fixed"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
