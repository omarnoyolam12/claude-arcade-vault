import { GameCard } from "@/components/game-card";
import { ShaderBackground } from "@/components/shader-background";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getGames } from "@/lib/games";

export default async function JuegosPage() {
  const games = await getGames();

  return (
    <>
      <ShaderBackground />
      <SiteHeader active="juegos" />

      <main className="mx-auto w-full max-w-arcade px-margin pb-margin pt-32">
        {/* Hero */}
        <section className="relative mb-16 text-center">
          <h1 className="mb-4 font-display text-display-lg uppercase text-primary-fixed">
            Inserta una moneda para jugar
          </h1>
          <p className="font-body text-body-lg text-secondary-fixed">
            <span className="block-cursor">
              Sistema en línea. Cargando juegos...
            </span>
          </p>
        </section>

        {/* Barra de búsqueda — solo visual, sin handler */}
        <section className="mb-12">
          <div className="mx-auto flex max-w-2xl flex-col gap-2">
            <label htmlFor="search" className="input-label">
              Búsqueda de directorio
            </label>
            <input
              id="search"
              type="text"
              placeholder="BUSCAR JUEGO..."
              className="input-terminal uppercase placeholder:text-outline"
            />
          </div>
        </section>

        {/* Grid de juegos */}
        <section className="grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <GameCard key={game.slug} game={game} />
          ))}
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
