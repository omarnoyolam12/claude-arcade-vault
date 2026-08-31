"use client";

import { useState } from "react";

type Props = {
  player: string;
  finalScore: string;
};

/**
 * Control deck del reproductor + modal "Fin del juego".
 * El modal arranca oculto; "Salir" lo abre y "Jugar de nuevo" lo cierra.
 * Nada se persiste: "Guardar puntuación" no tiene acción en este MVP visual.
 */
export function GameOverModal({ player, finalScore }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="mt-6 flex w-full max-w-5xl items-center justify-between px-4">
        <button
          type="button"
          className="flex items-center gap-2 border-2 border-primary-fixed bg-surface-container-low px-6 py-3 font-body text-body-lg uppercase text-primary-fixed transition-all hover:shadow-[0_0_20px_#63f7ff] active:scale-95"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
            <rect x="6" y="5" width="4" height="14" />
            <rect x="14" y="5" width="4" height="14" />
          </svg>
          Pausa
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 border-2 border-secondary-container bg-surface-container-low px-6 py-3 font-body text-body-lg uppercase text-secondary-container transition-all hover:shadow-[0_0_20px_#ff4d80] active:scale-95"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 17l5-5-5-5M15 12H3M21 3v18" />
          </svg>
          Salir
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="game-over-title"
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
        >
          <div className="relative flex w-full max-w-2xl flex-col items-center overflow-hidden border border-primary-fixed-dim bg-surface-container p-12 text-center shadow-[0_0_40px_rgba(0,220,229,0.3)]">
            {/* Acentos de esquina */}
            <span aria-hidden className="absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-primary-fixed" />
            <span aria-hidden className="absolute right-0 top-0 h-8 w-8 border-r-2 border-t-2 border-primary-fixed" />
            <span aria-hidden className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-primary-fixed" />
            <span aria-hidden className="absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-primary-fixed" />

            <h2
              id="game-over-title"
              className="mb-2 font-display text-display-lg uppercase text-secondary-container drop-shadow-[0_0_15px_#ff4d80]"
            >
              Fin del juego
            </h2>
            <p className="mb-8 font-body text-body-lg uppercase text-outline">{player}</p>

            <div className="mb-12">
              <p className="mb-2 font-body text-label-lg uppercase tracking-[0.1em] text-tertiary">
                Puntuación final
              </p>
              <p className="font-display text-[64px] leading-none text-tertiary-fixed drop-shadow-[0_0_10px_#e3ec00]">
                {finalScore}
              </p>
            </div>

            <div className="flex w-full flex-col justify-center gap-6 sm:flex-row">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="max-w-xs flex-1 border-2 border-primary-fixed bg-surface-container-lowest px-8 py-4 font-body text-body-lg uppercase text-primary-fixed transition-all hover:shadow-[0_0_20px_#63f7ff] active:scale-95"
              >
                Jugar de nuevo
              </button>
              <button
                type="button"
                className="max-w-xs flex-1 border-2 border-outline-variant bg-surface-container-lowest px-8 py-4 font-body text-body-lg uppercase text-on-surface transition-all hover:border-tertiary hover:text-tertiary hover:shadow-[0_0_15px_#fdffb5] active:scale-95"
              >
                Guardar puntuación
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
