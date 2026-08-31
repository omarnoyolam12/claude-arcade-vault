type Props = {
  /** "md" (por defecto): header. "sm": footer y usos compactos. */
  size?: "sm" | "md";
  className?: string;
};

const SIZES = {
  sm: { box: "h-3.5 w-3.5 border", text: "text-label-lg tracking-[0.1em]" },
  md: { box: "h-6 w-6 border-2", text: "text-headline-md" },
} as const;

/**
 * Marca compartida de Arcade Vault: rombo de neón cian + palabra "ARCADE VAULT".
 * Tomada del nav del mockup de la home. No incluye enlace: quien la use decide
 * si la envuelve en un <Link>.
 */
export function VaultMark({ size = "md", className }: Props) {
  const s = SIZES[size];

  return (
    <span className={`flex items-center gap-2 ${className ?? ""}`}>
      <span
        aria-hidden
        className={`${s.box} rotate-45 border-background bg-white shadow-[0_0_8px_rgba(0,220,229,0.55)]`}
      />
      <span
        className={`font-display uppercase text-white drop-shadow-[0_0_8px_rgba(0,220,229,0.3)] ${s.text}`}
      >
        Arcade Vault
      </span>
    </span>
  );
}
