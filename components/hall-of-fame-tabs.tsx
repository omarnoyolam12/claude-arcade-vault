"use client";

import { useState } from "react";

import type { ScoreEntry } from "@/lib/leaderboards";

import { LeaderboardTable } from "./leaderboard-table";

interface HallOfFameTabsProps {
  games: { slug: string; title: string }[];
  leaderboards: Record<string, ScoreEntry[]>;
}

/** Pestañas de juego que cambian la tabla de puntuaciones. Por defecto: Pac-Man. */
export function HallOfFameTabs({ games, leaderboards }: HallOfFameTabsProps) {
  const [activeSlug, setActiveSlug] = useState<string>("pac-man");
  const entries = leaderboards[activeSlug] ?? [];

  return (
    <div>
      <div className="mb-12 flex flex-wrap justify-center gap-4">
        {games.map((game) => {
          const isActive = game.slug === activeSlug;
          return (
            <button
              key={game.slug}
              type="button"
              onClick={() => setActiveSlug(game.slug)}
              aria-pressed={isActive}
              className={`border px-6 py-3 font-body text-label-lg uppercase tracking-[0.1em] transition-colors ${
                isActive
                  ? "border-primary-fixed text-primary-fixed shadow-[0_0_15px_rgba(99,247,255,0.4)]"
                  : "border-outline-variant text-white hover:border-primary-fixed hover:text-primary-fixed"
              }`}
            >
              {game.title}
            </button>
          );
        })}
      </div>

      <LeaderboardTable entries={entries} variant="full" />
    </div>
  );
}
