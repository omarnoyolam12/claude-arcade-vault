import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LeaderboardTable } from "@/components/leaderboard-table";
import { ShaderBackground } from "@/components/shader-background";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getGame, getGameSlugs } from "@/lib/games";
import { getLeaderboard } from "@/lib/leaderboards";

export async function generateStaticParams() {
  const slugs = await getGameSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function DetalleJuegoPage({
  params,
}: PageProps<"/juegos/[slug]">) {
  const { slug } = await params;
  const game = await getGame(slug);
  if (!game) notFound();

  const leaderboard = await getLeaderboard(slug);

  return (
    <>
      <ShaderBackground />
      <SiteHeader variant="back" />

      <main className="relative z-10 mx-auto flex w-full max-w-arcade flex-col gap-gutter px-margin pb-margin pt-32 md:flex-row">
        <section className="flex flex-1 flex-col gap-gutter">
          {/* Imagen hero */}
          <div className="group relative aspect-video w-full overflow-hidden border-2 border-primary-fixed bg-surface-container shadow-[0_0_15px_rgba(99,247,255,0.4)]">
            <Image
              src={game.image}
              alt={game.imageAlt}
              fill
              priority
              sizes="(min-width: 768px) 60vw, 100vw"
              className="object-cover opacity-80 transition-transform duration-700 group-hover:scale-105"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10 bg-[repeating-linear-gradient(0deg,transparent,transparent_1px,rgba(0,0,0,0.1)_1px,rgba(0,0,0,0.1)_2px)]"
            />
            <div className="absolute left-4 top-4 z-20 flex gap-2">
              <span className="bg-primary-fixed px-2 py-1 font-body text-label-sm uppercase tracking-[0.1em] text-background">
                {game.categoryLabel}
              </span>
              <span className="bg-primary-fixed px-2 py-1 font-body text-label-sm uppercase tracking-[0.1em] text-background">
                {game.year}
              </span>
            </div>
          </div>

          {/* Panel de info */}
          <div className="relative overflow-hidden border border-primary-fixed-dim bg-surface-container p-8">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-20 bg-[repeating-linear-gradient(0deg,transparent,transparent_1px,rgba(0,0,0,0.1)_1px,rgba(0,0,0,0.1)_2px)]"
            />
            <h1 className="relative mb-4 font-display text-display-lg uppercase tracking-wider text-primary-fixed">
              {game.title}
              <span className="block-cursor" />
            </h1>
            <div className="relative mb-6 flex flex-wrap gap-3">
              {game.tags.map((tag) => (
                <span
                  key={tag}
                  className="border border-primary-fixed bg-primary-fixed px-3 py-1 font-body text-label-sm uppercase tracking-[0.1em] text-background"
                >
                  {tag}
                </span>
              ))}
            </div>
            <p className="relative max-w-2xl font-body text-body-lg leading-relaxed text-on-surface-variant">
              {game.longDescription}
            </p>
            <div className="relative mt-8">
              <Link
                href={`/jugar/${game.slug}`}
                className="btn px-12 py-4 text-headline-md"
              >
                Jugar ahora
              </Link>
            </div>
          </div>
        </section>

        <aside className="w-full flex-shrink-0 md:w-[400px]">
          <LeaderboardTable entries={leaderboard} variant="sidebar" />
        </aside>
      </main>

      <SiteFooter />
    </>
  );
}
