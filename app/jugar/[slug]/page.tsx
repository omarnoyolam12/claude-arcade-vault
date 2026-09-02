import Image from "next/image";
import { notFound } from "next/navigation";

import { ArkanoidPlayer } from "@/components/arkanoid-player";
import { AsteroidsPlayer } from "@/components/asteroids-player";
import { GameOverModal } from "@/components/game-over-modal";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TetrisPlayer } from "@/components/tetris-player";
import { getGame, getGameSlugs } from "@/lib/games";

export async function generateStaticParams() {
  const slugs = await getGameSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function ReproductorPage({
  params,
}: PageProps<"/jugar/[slug]">) {
  const { slug } = await params;
  const game = await getGame(slug);
  if (!game) notFound();

  // SPEC 05 / 07 / 08 — asteroids, tetris y arkanoid son jugables de verdad; el
  // resto sigue siendo maqueta.
  if (slug === "asteroids" || slug === "tetris" || slug === "arkanoid") {
    return (
      <div className="flex min-h-[100dvh] flex-col overflow-hidden">
        <SiteHeader variant="nav" />
        <main className="relative z-10 mx-auto flex w-full max-w-arcade flex-grow flex-col items-center justify-center px-4 pb-8 pt-28">
          {slug === "asteroids" ? (
            <AsteroidsPlayer game={game} />
          ) : slug === "tetris" ? (
            <TetrisPlayer game={game} />
          ) : (
            <ArkanoidPlayer game={game} />
          )}
        </main>
        <SiteFooter />
      </div>
    );
  }

  // Estado de "sesión de juego" — mock inline, no vive en lib/.
  const hud = { player: "G4M3R_X", score: "0149250", lives: 2, level: 4 };

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-hidden">
      <SiteHeader variant="nav" />

      <main className="relative z-10 mx-auto flex w-full max-w-arcade flex-grow flex-col items-center justify-center px-4 pb-8 pt-28">
        {/* HUD */}
        <div className="mb-4 flex w-full max-w-5xl items-end justify-between px-4">
          <div className="flex flex-col">
            <span className="font-body text-label-sm uppercase tracking-[0.1em] text-tertiary">
              Jugador 1
            </span>
            <span className="font-display text-headline-md uppercase text-primary-fixed drop-shadow-[0_0_5px_#63f7ff]">
              {hud.player}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-body text-label-sm uppercase tracking-[0.1em] text-tertiary">
              Puntuación
            </span>
            <span className="font-display text-headline-lg text-tertiary-fixed drop-shadow-[0_0_8px_#e3ec00]">
              {hud.score}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-body text-label-sm uppercase tracking-[0.1em] text-tertiary">
              Vidas / Nivel
            </span>
            <div className="flex items-center gap-2">
              {Array.from({ length: hud.lives }).map((_, index) => (
                <svg
                  key={index}
                  viewBox="0 0 24 24"
                  className="h-5 w-5 text-secondary-container"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M12 21s-7.5-4.6-10-9.3C.5 8.3 2.3 5 5.5 5 7.5 5 9 6 12 9c3-3 4.5-4 6.5-4 3.2 0 5 3.3 3.5 6.7C19.5 16.4 12 21 12 21z" />
                </svg>
              ))}
              <span className="sr-only">{hud.lives} vidas</span>
              <span className="ml-2 font-display text-headline-md text-primary-fixed">
                LVL {hud.level}
              </span>
            </div>
          </div>
        </div>

        {/* Pantalla-gabinete con efecto CRT */}
        <div className="relative flex aspect-video w-full max-w-5xl items-center justify-center overflow-hidden rounded-[18px] border border-outline-variant bg-black shadow-[inset_0_0_60px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(99,247,255,0.15),0_0_40px_rgba(0,0,0,0.8)]">
          <Image
            src={game.image}
            alt={`Partida de ${game.title} en curso`}
            fill
            priority
            sizes="(min-width: 768px) 60vw, 100vw"
            className="object-cover opacity-80"
          />
          {/* Scanlines */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.28)_2px,rgba(0,0,0,0.28)_3px)]"
          />
          {/* Cristal / curvatura */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55)_100%)]"
          />
          {/* Texto de estado */}
          <div className="relative z-20 animate-pulse text-center">
            <p className="font-display text-display-lg uppercase text-primary-fixed drop-shadow-[0_0_15px_#63f7ff]">
              Insert coin
            </p>
          </div>
        </div>

        {/* Control deck (Pausa / Salir) + modal "Fin del juego" */}
        <GameOverModal player={hud.player} finalScore={hud.score} />
      </main>

      <SiteFooter />
    </div>
  );
}
