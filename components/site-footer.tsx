import { VaultMark } from "./vault-mark";

const FOOTER_LINKS = ["Soporte", "Privacidad", "Términos"] as const;

/** Pie de página estático compartido por biblioteca, detalle, reproductor y salón. */
export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-12 flex flex-col items-center justify-between gap-gutter border-t border-outline-variant bg-surface-container-lowest px-margin py-8 md:flex-row">
      <VaultMark size="sm" className="opacity-70" />
      <p className="font-body text-label-sm uppercase tracking-[0.1em] text-outline">
        © 1984 Arcade Vault — Insert Coin
      </p>
      <nav className="flex gap-6">
        {FOOTER_LINKS.map((label) => (
          <a
            key={label}
            href="#"
            className="font-body text-label-sm uppercase tracking-[0.1em] text-outline transition-colors hover:text-tertiary-fixed-dim"
          >
            {label}
          </a>
        ))}
      </nav>
    </footer>
  );
}
