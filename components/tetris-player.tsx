"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

import { guardarPuntuacionTetris } from "@/app/jugar/[slug]/actions";
import { GameOverModal } from "@/components/game-over-modal";
import type { Game } from "@/lib/games";

declare global {
  interface Window {
    // La expone el fork public/games/tetris/game.js. Arranca el juego sobre los
    // dos <canvas> recibidos (tablero y pieza siguiente) y devuelve un stop()
    // que cancela el rAF y quita el listener de teclado.
    startTetris?: (
      boardEl: HTMLCanvasElement,
      nextEl: HTMLCanvasElement,
    ) => () => void;
    // También las expone el fork mientras hay una partida activa: reinician /
    // pausan el motor sin recrear los <canvas>.
    restartTetris?: () => void;
    toggleTetrisPause?: () => void;
  }
}

type Phase = "playing" | "paused" | "gameover";

type GameState = {
  score: number;
  lines: number;
  level: number;
  phase: Phase;
};

const INITIAL_STATE: GameState = {
  score: 0,
  lines: 0,
  level: 1,
  phase: "playing",
};

// Etiqueta fija: no hay auth en esta spec.
const PLAYER_LABEL = "G4M3R_X";

const formatScore = (score: number) => String(score).padStart(7, "0");

type Props = {
  game: Game;
};

/**
 * Reproductor jugable de Tetris: sirve game.js desde /public sobre dos <canvas>
 * reales (tablero 300×600 retrato + pieza siguiente 120×120) dentro del gabinete
 * CRT y sincroniza el HUD React con el estado real del juego vía
 * window.postMessage. El modal "Fin del juego" se cablea en el paso 8.
 */
export function TetrisPlayer({ game }: Props) {
  const boardRef = useRef<HTMLCanvasElement>(null);
  const nextRef = useRef<HTMLCanvasElement>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalScore, setModalScore] = useState(() => formatScore(0));

  // onReady de next/script se dispara al cargar el script y también en cada
  // montaje posterior si ya estaba cargado (navegación SPA de vuelta a la ruta).
  function handleReady() {
    if (
      stopRef.current ||
      !boardRef.current ||
      !nextRef.current ||
      !window.startTetris
    )
      return;
    stopRef.current = window.startTetris(boardRef.current, nextRef.current);
  }

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (
        event.origin !== window.location.origin ||
        event.source !== window ||
        event.data?.source !== "tetris"
      )
        return;

      const data = event.data;
      if (data.type === "state") {
        setState({
          score: data.score,
          lines: data.lines,
          level: data.level,
          phase: data.phase,
        });
        // Reinicio vía window.restartTetris(): game.js vuelve a "playing" y el
        // modal debe cerrarse para no tapar la partida reiniciada.
        if (data.phase !== "gameover") setModalOpen(false);
      } else if (data.type === "gameover") {
        setModalScore(formatScore(data.score));
        setModalOpen(true);
      }
    }

    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      stopRef.current?.();
      stopRef.current = null;
    };
  }, []);

  return (
    <>
      <Script
        src="/games/tetris/game.js"
        strategy="afterInteractive"
        onReady={handleReady}
      />

      {/* HUD del reproductor — mismo marcado y clases que la maqueta, leyendo del
          estado real del juego. El tercer bloque muestra LÍNEAS y NIVEL (sin
          corazones de "vidas": Tetris no tiene vidas). */}
      <div className="mb-4 flex w-full max-w-5xl items-end justify-between px-4">
        <div className="flex flex-col">
          <span className="font-body text-label-sm uppercase tracking-[0.1em] text-tertiary">
            Jugador 1
          </span>
          <span className="font-display text-headline-md uppercase text-primary-fixed drop-shadow-[0_0_5px_#63f7ff]">
            {PLAYER_LABEL}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-body text-label-sm uppercase tracking-[0.1em] text-tertiary">
            Puntuación
          </span>
          <span className="font-display text-headline-lg text-tertiary-fixed drop-shadow-[0_0_8px_#e3ec00]">
            {formatScore(state.score)}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-body text-label-sm uppercase tracking-[0.1em] text-tertiary">
            Líneas / Nivel
          </span>
          <div className="flex items-center gap-4">
            <span className="font-display text-headline-md text-secondary-container">
              {state.lines} LN
            </span>
            <span className="font-display text-headline-md text-primary-fixed">
              LVL {state.level}
            </span>
          </div>
        </div>
      </div>

      {/* Pantalla-gabinete con efecto CRT. El tablero retrato (backing store
          300×600) se escala a la altura del gabinete y se centra; el canvas
          NEXT y su etiqueta van a su lado, dejando bandas laterales. */}
      <div className="relative flex aspect-video w-full max-w-5xl items-center justify-center gap-4 overflow-hidden rounded-[18px] border border-outline-variant bg-black px-6 shadow-[inset_0_0_60px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(99,247,255,0.15),0_0_40px_rgba(0,0,0,0.8)] sm:gap-10">
        <canvas
          ref={boardRef}
          id="board"
          width={300}
          height={600}
          aria-label={`Partida de ${game.title} en curso`}
          className="block aspect-[1/2] h-full w-auto"
        />
        <div className="flex flex-col items-center gap-2">
          <span className="font-body text-label-sm uppercase tracking-[0.1em] text-tertiary">
            Next
          </span>
          <canvas
            ref={nextRef}
            id="next-canvas"
            width={120}
            height={120}
            aria-hidden
            className="block h-[88px] w-[88px] sm:h-[120px] sm:w-[120px]"
          />
        </div>
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
        {/* Indicador de pausa sobre el canvas */}
        {state.phase === "paused" && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <p className="animate-pulse font-display text-display-lg uppercase text-primary-fixed drop-shadow-[0_0_15px_#63f7ff]">
              Pausa
            </p>
          </div>
        )}
      </div>

      {/* Aviso discreto: el juego es solo teclado, sin controles táctiles. */}
      <p className="mt-3 w-full max-w-5xl px-4 text-center font-body text-label-sm text-outline">
        Requiere teclado: ←→ mover, ↑/X rotar, ↓ bajar, Espacio caída, P pausa.
      </p>

      {/* Control deck (Pausa / Salir) + modal "Fin del juego" en modo controlado.
          "Salir" abre el modal con la puntuación vigente; el mensaje gameover lo
          abre con la puntuación final real. "Jugar de nuevo" cierra el modal y,
          si la partida terminó, reinicia el motor vía window.restartTetris(). */}
      <GameOverModal
        player={PLAYER_LABEL}
        finalScore={modalScore}
        open={modalOpen}
        onOpenChange={(next) => {
          if (next) {
            setModalScore(formatScore(state.score));
          } else if (state.phase === "gameover") {
            window.restartTetris?.();
          }
          setModalOpen(next);
        }}
        onPause={() => window.toggleTetrisPause?.()}
        onSave={() => guardarPuntuacionTetris({ score: state.score })}
      />
    </>
  );
}
