"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

import { guardarPuntuacionArkanoid } from "@/app/jugar/[slug]/actions";
import { GameOverModal } from "@/components/game-over-modal";
import { TouchControls, useIsTouchDevice } from "@/components/touch-controls";
import type { Game } from "@/lib/games";

declare global {
  interface Window {
    // La expone el fork public/games/arkanoid/game.js. Arranca el juego sobre el
    // <canvas> recibido y devuelve un stop() que cancela el rAF y quita los
    // listeners de teclado (window) y de ratón (canvas).
    startArkanoid?: (canvas: HTMLCanvasElement) => () => void;
    // También las expone el fork mientras hay una partida activa: reinician /
    // pausan el motor sin recrear el <canvas>.
    restartArkanoid?: () => void;
    toggleArkanoidPause?: () => void;
  }
}

type Phase = "menu" | "playing" | "paused" | "gameover";

type GameState = {
  score: number;
  lives: number;
  level: number;
  phase: Phase;
};

const INITIAL_STATE: GameState = {
  score: 0,
  lives: 3,
  level: 1,
  phase: "menu",
};

// Etiqueta fija: no hay auth en esta spec.
const PLAYER_LABEL = "G4M3R_X";

const formatScore = (score: number) => String(score).padStart(7, "0");

type Props = {
  game: Game;
};

/**
 * Reproductor jugable de Arkanoid: sirve game.js desde /public sobre un <canvas>
 * real (backing store 800×600, pixel-art escalado a lo ancho del gabinete
 * manteniendo 4:3) dentro del gabinete CRT y sincroniza el HUD React con el
 * estado real del juego vía window.postMessage. El modal "Fin del juego" se abre
 * solo al recibir un mensaje type:"gameover" y también con el botón "Salir".
 */
export function ArkanoidPlayer({ game }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalScore, setModalScore] = useState(() => formatScore(0));
  const isTouch = useIsTouchDevice();

  // onReady de next/script se dispara al cargar el script y también en cada
  // montaje posterior si ya estaba cargado (navegación SPA de vuelta a la ruta).
  function handleReady() {
    if (stopRef.current || !canvasRef.current || !window.startArkanoid) return;
    stopRef.current = window.startArkanoid(canvasRef.current);
  }

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (
        event.origin !== window.location.origin ||
        event.source !== window ||
        event.data?.source !== "arkanoid"
      )
        return;

      const data = event.data;
      if (data.type === "state") {
        setState({
          score: data.score,
          lives: data.lives,
          level: data.level,
          phase: data.phase,
        });
        // Reinicio vía window.restartArkanoid(): game.js vuelve a "playing" y el
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
        src="/games/arkanoid/game.js"
        strategy="afterInteractive"
        onReady={handleReady}
      />

      {/* HUD del reproductor — mismo marcado y clases que la maqueta, leyendo del
          estado real del juego. El tercer bloque es "Vidas / Nivel": Arkanoid sí
          tiene ambos, así que se reutiliza tal cual. */}
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
            Vidas / Nivel
          </span>
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.max(state.lives, 0) }).map(
              (_, index) => (
                <svg
                  key={index}
                  viewBox="0 0 24 24"
                  className="h-5 w-5 text-secondary-container"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M12 21s-7.5-4.6-10-9.3C.5 8.3 2.3 5 5.5 5 7.5 5 9 6 12 9c3-3 4.5-4 6.5-4 3.2 0 5 3.3 3.5 6.7C19.5 16.4 12 21 12 21z" />
                </svg>
              ),
            )}
            <span className="sr-only">{Math.max(state.lives, 0)} vidas</span>
            <span className="ml-2 font-display text-headline-md text-primary-fixed">
              LVL {state.level}
            </span>
          </div>
        </div>
      </div>

      {/* Pantalla-gabinete con efecto CRT — sin aspect-video: el marco envuelve
          el canvas 4:3 (backing store nativo 800×600, escalado por CSS). */}
      <div className="relative flex w-full max-w-5xl items-center justify-center overflow-hidden rounded-[18px] border border-outline-variant bg-black shadow-[inset_0_0_60px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(99,247,255,0.15),0_0_40px_rgba(0,0,0,0.8)]">
        <canvas
          ref={canvasRef}
          id="juego"
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
        {/* Arkanoid dibuja su propia pantalla de PAUSA dentro del canvas
            (dibujarPausaOverlay / dibujarMenuPausa), así que aquí NO se añade un
            overlay React: evitaría el doble "PAUSA". (Tetris sí lo necesita
            porque su canvas no pinta HUD.) */}
      </div>

      {/* SPEC 11: en dispositivos sin teclado físico, el overlay táctil
          sustituye al aviso de teclado. ↑↓ navegan los menús de inicio/pausa
          (no hay pala verticalmente); A confirma esos menús y lanza la bola. */}
      {isTouch ? (
        <TouchControls
          dpad={{
            left: { code: "ArrowLeft", label: "Mover pala izquierda" },
            right: { code: "ArrowRight", label: "Mover pala derecha" },
            up: { code: "ArrowUp", label: "Navegar menú arriba" },
            down: { code: "ArrowDown", label: "Navegar menú abajo" },
          }}
          actionA={{ code: "Space", label: "Lanzar bola / confirmar" }}
          actionB={{ code: "KeyP", label: "Pausa" }}
        />
      ) : (
        <p className="mt-3 w-full max-w-5xl px-4 text-center font-body text-label-sm text-outline">
          ←→ mueven la pala, Espacio empieza la partida y lanza la bola, P o Esc
          pausan; además, mover el cursor sobre la pantalla mueve la pala.
        </p>
      )}

      {/* Control deck (Pausa / Salir) + modal "Fin del juego" en modo controlado.
          "Salir" abre el modal con la puntuación vigente; el mensaje gameover lo
          abre con la puntuación final real. "Jugar de nuevo" cierra el modal y,
          si la partida terminó, reinicia el motor vía window.restartArkanoid().
          "Pausa" alterna la pausa nativa; "Guardar puntuación" inserta en
          public.scores vía la Server Action. */}
      <GameOverModal
        player={PLAYER_LABEL}
        finalScore={modalScore}
        open={modalOpen}
        onOpenChange={(next) => {
          if (next) {
            setModalScore(formatScore(state.score));
          } else if (state.phase === "gameover") {
            window.restartArkanoid?.();
          }
          setModalOpen(next);
        }}
        onPause={() => window.toggleArkanoidPause?.()}
        onSave={() => guardarPuntuacionArkanoid({ score: state.score })}
      />
    </>
  );
}
