"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

import { guardarPuntuacionFrogger } from "@/app/jugar/[slug]/actions";
import { GameOverModal } from "@/components/game-over-modal";
import type { Game } from "@/lib/games";

declare global {
  interface Window {
    // La expone public/games/frogger/game.js. Arranca el juego sobre el
    // <canvas> recibido y devuelve un stop() que cancela el rAF y quita el
    // listener de teclado (window).
    startFrogger?: (canvas: HTMLCanvasElement) => () => void;
    // También las expone game.js mientras hay una partida activa: reinician /
    // pausan el motor sin recrear el <canvas>.
    restartFrogger?: () => void;
    toggleFroggerPause?: () => void;
  }
}

type Phase = "playing" | "paused" | "gameover";

type GameState = {
  score: number;
  lives: number;
  level: number;
  homes: number;
  phase: Phase;
};

const INITIAL_STATE: GameState = {
  score: 0,
  lives: 3,
  level: 1,
  homes: 0,
  phase: "playing",
};

// Etiqueta de invitado: se usa cuando no hay sesión iniciada.
const PLAYER_LABEL = "G4M3R_X";

const formatScore = (score: number) => String(score).padStart(7, "0");

type Props = {
  game: Game;
  isAuthenticated: boolean;
  displayName?: string;
};

/**
 * Reproductor jugable de Frogger: sirve game.js desde /public sobre un
 * <canvas> real (backing store 800×600, escalado a lo ancho del gabinete
 * manteniendo 4:3) dentro del gabinete CRT y sincroniza el HUD React con el
 * estado real del juego vía window.postMessage.
 *
 * A diferencia de snake, no hay spritesheet asíncrono: un único
 * <Script strategy="afterInteractive"> basta, así que se arranca en cuanto
 * onReady dispara y el <canvas> ya está montado.
 *
 * Modal de fin de juego y guardado de puntuación llegan en el paso siguiente.
 */
export function FroggerPlayer({ game, isAuthenticated, displayName }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalScore, setModalScore] = useState(() => formatScore(0));
  const player = isAuthenticated && displayName ? displayName : PLAYER_LABEL;

  // onReady de next/script se dispara al cargar el script y también en cada
  // montaje posterior si ya estaba cargado (navegación SPA de vuelta a la ruta).
  function tryStart() {
    if (stopRef.current || !canvasRef.current || !window.startFrogger) return;
    stopRef.current = window.startFrogger(canvasRef.current);
  }

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (
        event.origin !== window.location.origin ||
        event.source !== window ||
        event.data?.source !== "frogger"
      )
        return;

      const data = event.data;
      if (data.type === "state") {
        setState({
          score: data.score,
          lives: data.lives,
          level: data.level,
          homes: data.homes,
          phase: data.phase,
        });
        // Reinicio vía window.restartFrogger(): game.js vuelve a "playing" y
        // el modal debe cerrarse para no tapar la partida reiniciada.
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
        src="/games/frogger/game.js"
        strategy="afterInteractive"
        onReady={() => {
          tryStart();
        }}
      />

      {/* HUD del reproductor — VIDAS (corazones, como Pac-Man) + NIVEL a la
          derecha; CASAS x/5 bajo el marcador de puntuación al centro. */}
      <div className="mb-4 flex w-full max-w-5xl items-end justify-between px-4">
        <div className="flex flex-col">
          <span className="font-body text-label-sm uppercase tracking-[0.1em] text-tertiary">
            Jugador 1
          </span>
          <span className="font-display text-headline-md uppercase text-primary-fixed drop-shadow-[0_0_5px_#63f7ff]">
            {player}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-body text-label-sm uppercase tracking-[0.1em] text-tertiary">
            Puntuación
          </span>
          <span className="font-display text-headline-lg text-tertiary-fixed drop-shadow-[0_0_8px_#e3ec00]">
            {formatScore(state.score)}
          </span>
          <span className="mt-1 font-body text-label-sm uppercase tracking-[0.1em] text-tertiary">
            Casas {state.homes}/5
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-body text-label-sm uppercase tracking-[0.1em] text-tertiary">
            Vidas / Nivel
          </span>
          <div className="flex items-center gap-2">
            {Array.from({ length: state.lives }).map((_, index) => (
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
            <span className="sr-only">{state.lives} vidas</span>
            <span className="ml-2 font-display text-headline-md text-primary-fixed">
              LVL {state.level}
            </span>
          </div>
        </div>
      </div>

      {/* Pantalla-gabinete con efecto CRT — el marco envuelve el canvas 4:3
          (backing store nativo 800×600, escalado por CSS). */}
      <div className="relative flex w-full max-w-5xl items-center justify-center overflow-hidden rounded-[18px] border border-outline-variant bg-black shadow-[inset_0_0_60px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(99,247,255,0.15),0_0_40px_rgba(0,0,0,0.8)]">
        <canvas
          ref={canvasRef}
          id="frogger"
          width={800}
          height={600}
          aria-label={`Partida de ${game.title} en curso`}
          className="block aspect-[4/3] h-auto w-full [image-rendering:pixelated]"
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
        {/* Indicador de pausa sobre el canvas (game.js no pinta overlay). */}
        {state.phase === "paused" && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <p className="animate-pulse font-display text-display-lg uppercase text-primary-fixed drop-shadow-[0_0_15px_#63f7ff]">
              Pausa
            </p>
          </div>
        )}
      </div>

      <p className="mt-3 w-full max-w-5xl px-4 text-center font-body text-label-sm text-outline">
        Flechas para saltar, P para pausar.
      </p>

      {/* Control deck (Pausa / Salir) + modal "Fin del juego" en modo controlado.
          "Salir" abre el modal con la puntuación vigente; el mensaje gameover lo
          abre con la puntuación final real. "Jugar de nuevo" cierra el modal y,
          si la partida terminó, reinicia el motor vía window.restartFrogger().
          "Pausa" alterna la pausa nativa; "Guardar puntuación" inserta en
          public.scores vía la Server Action. */}
      <GameOverModal
        player={player}
        finalScore={modalScore}
        open={modalOpen}
        onOpenChange={(next) => {
          if (next) {
            setModalScore(formatScore(state.score));
          } else if (state.phase === "gameover") {
            window.restartFrogger?.();
          }
          setModalOpen(next);
        }}
        onPause={() => window.toggleFroggerPause?.()}
        onSave={() => guardarPuntuacionFrogger({ score: state.score })}
        canSave={isAuthenticated}
      />
    </>
  );
}
