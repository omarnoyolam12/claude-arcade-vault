import Image from "next/image";
import Link from "next/link";

import type { Game } from "@/lib/games";

/** Tarjeta de juego para el grid de la biblioteca. */
export function GameCard({ game }: { game: Game }) {
  return (
    <article className="group relative overflow-hidden border border-primary-fixed-dim bg-black transition-transform duration-300 hover:-rotate-1 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(99,247,255,0.3)]">
      {/* Scanlines propias de la card */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-[repeating-linear-gradient(0deg,transparent_0px,transparent_3px,rgba(0,0,0,0.12)_3px,rgba(0,0,0,0.12)_4px)]" />

      <Link
        href={`/juegos/${game.slug}`}
        aria-label={`Ver ${game.title}`}
        className="relative block h-48 w-full border-b border-primary-fixed-dim bg-surface-container"
      >
        <Image
          src={game.image}
          alt={game.imageAlt}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover opacity-80 transition-opacity duration-300 group-hover:opacity-100"
        />
        <span className="absolute right-2 top-2 z-20 bg-primary-fixed px-2 py-1 font-body text-label-sm uppercase tracking-[0.1em] text-background">
          {game.categoryLabel}
        </span>
      </Link>

      <div className="relative z-20 p-4">
        <h2 className="mb-2 font-display text-headline-md uppercase text-primary-fixed">
          <Link
            href={`/juegos/${game.slug}`}
            className="text-primary-fixed transition-all hover:drop-shadow-[0_0_8px_#63f7ff]"
          >
            {game.title}
          </Link>
        </h2>
        <p className="mb-4 h-16 overflow-hidden font-body text-body-md text-on-surface-variant">
          {game.shortDescription}
        </p>
        <div className="flex items-center justify-between gap-4">
          <Link
            href={`/jugar/${game.slug}`}
            className="border-2 border-primary-fixed px-4 py-2 font-body text-label-lg uppercase tracking-[0.1em] text-primary-fixed shadow-[0_0_10px_rgba(99,247,255,0.4),inset_0_0_10px_rgba(99,247,255,0.2)] transition-all hover:bg-primary-fixed/10 hover:shadow-[0_0_20px_rgba(99,247,255,0.8),inset_0_0_20px_rgba(99,247,255,0.4)]"
          >
            Jugar
          </Link>
          <div className="text-right">
            <p className="font-body text-label-sm uppercase tracking-[0.1em] text-tertiary-fixed">
              Mejor puntuación
            </p>
            <p className="font-body text-body-md text-white">
              {game.bestScore}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
