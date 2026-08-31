import Link from "next/link";

import { MobileNav } from "./mobile-nav";
import { VaultMark } from "./vault-mark";

type Props = {
  /** Marca el enlace de nav activo (solo en la variante "nav"). */
  active?: "inicio" | "juegos" | "salon";
  /** "nav" (por defecto): logo + navegación. "back": logo + "Volver al vault". */
  variant?: "nav" | "back";
};

function navLinkClass(isActive: boolean) {
  return [
    "font-body text-body-lg uppercase pb-1 transition-colors",
    isActive
      ? "text-primary-fixed border-b-2 border-primary-fixed"
      : "text-outline hover:text-primary-fixed",
  ].join(" ");
}

/** Cabecera fija compartida. La variante "back" se usa en el detalle del juego. */
export function SiteHeader({ active, variant = "nav" }: Props) {
  return (
    <header className="fixed left-0 top-0 z-50 flex h-20 w-full items-center justify-between border-b-2 border-primary-fixed-dim bg-background px-margin shadow-[0_0_20px_rgba(0,220,229,0.4)]">
      <Link href="/" className="transition-all hover:drop-shadow-[0_0_10px_#63f7ff]">
        <VaultMark size="md" />
      </Link>

      {variant === "back" ? (
        <Link
          href="/juegos"
          className="flex items-center gap-2 border-2 border-secondary-container px-6 py-2 font-body text-body-lg uppercase text-secondary-container shadow-[0_0_15px_rgba(255,77,128,0.4)] transition-colors hover:bg-secondary-container hover:text-background"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11 5l-7 7 7 7M4 12h16"
            />
          </svg>
          Volver al vault
        </Link>
      ) : (
        <>
          <nav className="hidden gap-gutter md:flex">
            <Link href="/" className={navLinkClass(active === "inicio")}>
              Inicio
            </Link>
            <Link href="/juegos" className={navLinkClass(active === "juegos")}>
              Biblioteca
            </Link>
            <Link
              href="/salon-de-la-fama"
              className={navLinkClass(active === "salon")}
            >
              Salón de la Fama
            </Link>
          </nav>

          <Link
            href="/acceso"
            className="hidden font-body text-body-lg uppercase text-primary-fixed transition-all hover:drop-shadow-[0_0_8px_#63f7ff] md:block"
          >
            Acceder
          </Link>

          <MobileNav active={active} />
        </>
      )}
    </header>
  );
}
