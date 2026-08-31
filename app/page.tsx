import type { CSSProperties } from "react";

import Link from "next/link";

import { GameThumb } from "@/components/game-thumb";
import { HeroBackdrop } from "@/components/hero-backdrop";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { recentScores, topPlayersToday } from "@/lib/activity";
import { games } from "@/lib/games";

// "Press Start 2P" (cargada en layout.tsx) solo para el titular del Hero y los
// rótulos "// NN". Se aplica por `style` inline porque las reglas de elemento
// sin capa de globals.css (h1{}, span{}) ganan a las utilidades de Tailwind.
// Fallback a Anybody y monoespaciada para glifos ausentes.
const PIXEL_FONT: CSSProperties = {
  fontFamily: "var(--font-press-start), var(--font-anybody), monospace",
};

function SectionTag({ n, className }: { n: string; className: string }) {
  return (
    <span
      style={PIXEL_FONT}
      className={`text-label-lg ${className}`}
    >{`// ${n}`}</span>
  );
}

const STATS = [
  { value: "12+", label: "Juegos" },
  { value: "Miles", label: "De partidas" },
  { value: "Global", label: "Ranking" },
] as const;

const PERKS = [
  "Acceso a todos los juegos",
  "Ranking global y salón de la fama",
  "Sin anuncios entre partidas",
  "Guarda tus puntuaciones",
  "Nuevos juegos cada mes",
  "Funciona en cualquier navegador",
] as const;

const FAQS = [
  {
    question: "¿Realmente es gratis?",
    answer:
      "Sí. Arcade Vault es un proyecto sin fines de lucro hecho por amor a los clásicos. No hay versión «premium» escondida.",
    border: "border-primary-fixed",
  },
  {
    question: "¿Necesito crear cuenta?",
    answer:
      "No. Puedes jugar como invitado. Si quieres guardar tu puntuación y aparecer en el ranking, regístrate en 10 segundos.",
    border: "border-secondary-container",
  },
  {
    question: "¿Cómo sobreviven sin cobrar?",
    answer:
      "Es un proyecto comunitario. Si te gusta, compártelo. Esa es toda la moneda que aceptamos.",
    border: "border-tertiary-fixed",
  },
] as const;

const BENEFITS = [
  {
    icon: "🕹️",
    title: "Juegos clásicos",
    body: "Arkanoid, Tetris, Snake y muchos más. Los mejores arcades de todos los tiempos en un solo lugar.",
    accent: "text-primary-fixed",
    border: "hover:border-primary-fixed-dim",
  },
  {
    icon: "🪙",
    title: "100% gratis",
    body: "Sin suscripciones, sin pagos ocultos. Todos los juegos disponibles de forma gratuita.",
    accent: "text-tertiary-fixed",
    border: "hover:border-tertiary-fixed-dim",
  },
  {
    icon: "🏆",
    title: "Ranking global",
    body: "Compite con jugadores de todo el mundo. Escala el ranking y demuestra quién es el mejor.",
    accent: "text-secondary-container",
    border: "hover:border-secondary-container",
  },
  {
    icon: "🚀",
    title: "Siempre creciendo",
    body: "Agregamos nuevos juegos constantemente. Vuelve seguido, siempre habrá algo nuevo que jugar.",
    accent: "text-primary-fixed",
    border: "hover:border-primary-fixed-dim",
  },
] as const;

export default function HomePage() {
  return (
    <>
      <SiteHeader active="inicio" />

      <main className="mx-auto w-full max-w-arcade px-margin pb-margin pt-32">
        {/* 1. Hero */}
        <section className="relative flex min-h-[60vh] flex-col items-center justify-center overflow-hidden text-center">
          <HeroBackdrop />

          <div className="relative z-10 flex flex-col items-center">
            <p className="mb-8 font-body text-label-lg uppercase tracking-[0.1em] text-tertiary-fixed">
              <span className="block-cursor">Inserta una moneda</span>
            </p>

            <h1
              style={PIXEL_FONT}
              className="mb-8 text-[clamp(1.15rem,4.2vw,2.75rem)] uppercase leading-[1.6]"
            >
              <span style={PIXEL_FONT} className="block text-white">
                El arcade
              </span>
              <span
                style={PIXEL_FONT}
                className="block text-primary-fixed drop-shadow-[0_0_18px_rgba(0,245,255,0.7)]"
              >
                clásico está
              </span>
              <span
                style={PIXEL_FONT}
                className="block text-secondary-container drop-shadow-[0_0_18px_rgba(255,77,128,0.7)]"
              >
                de vuelta
              </span>
            </h1>

            <p className="mx-auto mb-10 max-w-xl font-body text-body-lg text-on-surface-variant">
              Juega los mejores clásicos directamente en tu navegador. Sin
              descargas. Sin costo. Solo diversión.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link href="/juegos" className="btn">
                ▶ Explorar juegos
              </Link>
              <Link href="/acceso" className="btn btn-secondary">
                Crear cuenta
              </Link>
            </div>
          </div>
        </section>

        {/* 2. ¿Por qué Arcade Vault? */}
        <section className="mt-24">
          <h2 className="mb-10 flex items-center gap-4 font-display text-headline-lg uppercase text-white">
            <SectionTag n="01" className="text-secondary-container" />
            ¿Por qué Arcade Vault?
          </h2>

          <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((benefit) => (
              <article
                key={benefit.title}
                className={`border border-outline-variant bg-surface-container-low p-6 transition-colors ${benefit.border}`}
              >
                <span aria-hidden className="mb-4 block text-3xl">
                  {benefit.icon}
                </span>
                <h3
                  className={`mb-3 font-display text-headline-md uppercase ${benefit.accent}`}
                >
                  {benefit.title}
                </h3>
                <p className="font-body text-body-md text-on-surface-variant">
                  {benefit.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* 3. Juegos disponibles ahora */}
        <section className="mt-24">
          <h2 className="mb-10 flex items-center gap-4 font-display text-headline-lg uppercase text-white">
            <SectionTag n="02" className="text-primary-fixed" />
            Juegos disponibles ahora
          </h2>

          <div className="mb-8 grid grid-cols-2 gap-gutter sm:grid-cols-3 lg:grid-cols-6">
            {games.map((game) => (
              <GameThumb key={game.slug} game={game} />
            ))}
          </div>

          <div className="flex justify-center">
            <Link href="/juegos" className="btn">
              Ver todos los juegos →
            </Link>
          </div>
        </section>

        {/* 4. Actividad en vivo */}
        <section className="mt-24">
          <div className="mb-16 flex flex-wrap justify-center gap-12 border-y border-outline-variant py-8 sm:gap-16">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="mb-2 font-display text-headline-lg uppercase text-tertiary-fixed drop-shadow-[0_0_12px_rgba(222,231,0,0.6)]">
                  {stat.value}
                </p>
                <p className="font-body text-label-sm uppercase tracking-[0.2em] text-on-surface-variant">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <h2 className="mb-10 flex items-center gap-4 font-display text-headline-lg uppercase text-white">
            <SectionTag n="03" className="text-tertiary-fixed" />
            Actividad en vivo
          </h2>

          <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
            {/* Últimas puntuaciones */}
            <div>
              <h3 className="mb-6 font-display text-headline-md uppercase text-primary-fixed">
                Últimas puntuaciones
              </h3>
              <ul className="flex flex-col gap-4 font-body text-body-md">
                {recentScores.map((entry, index) => (
                  <li
                    key={`${entry.player}-${entry.game}`}
                    className="flex items-center justify-between border-b border-outline-variant pb-2"
                  >
                    <span
                      className={
                        index === 0
                          ? "text-secondary-container"
                          : "text-primary-fixed"
                      }
                    >
                      {entry.player}
                    </span>
                    <span className="text-on-surface-variant">
                      {entry.game}{" "}
                      <span className="text-tertiary-fixed">{entry.points}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Top jugadores — hoy */}
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h3 className="font-display text-headline-md uppercase text-primary-fixed">
                  Top jugadores — hoy
                </h3>
                <Link
                  href="/salon-de-la-fama"
                  className="font-body text-label-sm uppercase tracking-[0.1em] text-outline transition-colors hover:text-primary-fixed"
                >
                  Ver salón →
                </Link>
              </div>
              <ul className="flex flex-col gap-2 font-body text-body-md">
                {topPlayersToday.map((entry) => {
                  const isFirst = entry.rank === 1;
                  return (
                    <li
                      key={entry.rank}
                      className={`flex items-center justify-between p-3 ${
                        isFirst
                          ? "border-l-2 border-tertiary-fixed bg-surface-container-low"
                          : ""
                      }`}
                    >
                      <span>
                        <span
                          className={`mr-4 ${
                            isFirst ? "text-tertiary-fixed" : "text-outline"
                          }`}
                        >
                          #{String(entry.rank).padStart(2, "0")}
                        </span>
                        <span className="text-white">{entry.player}</span>
                      </span>
                      <span
                        className={
                          isFirst ? "text-tertiary-fixed" : "text-primary-fixed"
                        }
                      >
                        {entry.score}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>

        {/* 5. Precios */}
        <section className="mt-24">
          <h2 className="mb-10 flex items-center gap-4 font-display text-headline-lg uppercase text-white">
            <SectionTag n="04" className="text-primary-fixed" />
            Precios
          </h2>

          <div className="flex flex-col gap-12 lg:flex-row">
            {/* Tarjeta de plan */}
            <div className="relative flex-1 border border-primary-fixed bg-surface-container-low p-8 shadow-[0_0_25px_rgba(0,245,255,0.15)]">
              <span className="absolute -right-3 -top-3 rotate-12 border border-background bg-secondary-container px-2 py-1 font-body text-label-sm uppercase tracking-[0.1em] text-background">
                Free play
              </span>

              <p className="mb-2 font-body text-label-sm uppercase tracking-[0.1em] text-on-surface-variant">
                Plan único
              </p>
              <h3 className="mb-6 font-display text-headline-md uppercase text-primary-fixed">
                Jugador Vault
              </h3>

              <div className="mb-6 flex items-end gap-3">
                <span className="font-display text-display-lg uppercase text-primary-fixed drop-shadow-[0_0_15px_rgba(0,245,255,0.6)]">
                  $0
                </span>
                <span className="pb-2 font-body text-label-lg uppercase tracking-[0.1em] text-on-surface-variant">
                  / siempre
                </span>
              </div>

              <p className="mb-6 font-body text-label-lg uppercase tracking-[0.1em] text-tertiary-fixed">
                Sin trucos · Sin letra pequeña
              </p>

              <ul className="mb-8 flex flex-col gap-3 font-body text-body-md text-on-surface-variant">
                {PERKS.map((perk) => (
                  <li key={perk}>
                    <span className="mr-2 text-primary-fixed">✓</span>
                    {perk}
                  </li>
                ))}
              </ul>

              <Link href="/acceso" className="btn w-full">
                Empezar gratis →
              </Link>
            </div>

            {/* Preguntas frecuentes */}
            <div className="flex flex-1 flex-col gap-6">
              {FAQS.map((faq) => (
                <div
                  key={faq.question}
                  className={`border-l-2 ${faq.border} bg-surface-container/40 py-2 pl-4`}
                >
                  <h3 className="mb-2 font-display text-headline-md uppercase text-white">
                    {faq.question}
                  </h3>
                  <p className="font-body text-body-md text-on-surface-variant">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
