import Image from "next/image";
import Link from "next/link";

import type { Game } from "@/lib/games";

/**
 * Miniatura cuadrada compacta de un juego para el showcase de la home.
 * Todo el bloque enlaza a /juegos/[slug]. Comparte lenguaje visual con GameCard.
 */
export function GameThumb({ game }: { game: Game }) {
  return (
    <Link
      href={`/juegos/${game.slug}`}
      className="group relative block aspect-square overflow-hidden border border-primary-fixed-dim bg-black transition-all duration-300 hover:border-primary-fixed hover:shadow-[0_0_25px_rgba(99,247,255,0.35)]"
    >
      {/* Scanlines propias de la miniatura */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-[repeating-linear-gradient(0deg,transparent_0px,transparent_3px,rgba(0,0,0,0.12)_3px,rgba(0,0,0,0.12)_4px)]" />

      <Image
        src={game.image}
        alt={game.imageAlt}
        fill
        sizes="(min-width: 768px) 16vw, 50vw"
        className="object-cover opacity-70 transition-opacity duration-300 group-hover:opacity-100"
      />

      <span className="absolute left-2 top-2 z-20 bg-primary-fixed px-2 py-1 font-body text-label-sm uppercase tracking-[0.1em] text-background">
        {game.categoryLabel}
      </span>

      <div className="absolute inset-x-0 bottom-0 z-20 border-t border-primary-fixed-dim bg-black/80 p-2">
        <p className="font-display text-label-lg uppercase text-white transition-colors group-hover:text-primary-fixed">
          {game.title}
        </p>
      </div>
    </Link>
  );
}
