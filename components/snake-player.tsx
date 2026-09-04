"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

import { guardarPuntuacionSnake } from "@/app/jugar/[slug]/actions";
import { GameOverModal } from "@/components/game-over-modal";
import { TouchControls, useIsTouchDevice } from "@/components/touch-controls";
import type { Game } from "@/lib/games";

declare global {
  interface Window {
    // La expone public/games/snake/game.js. Arranca el juego sobre el <canvas>
    // recibido y devuelve un stop() que cancela el rAF y quita el listener de
    // teclado (window).
    startSnake?: (canvas: HTMLCanvasElement) => () => void;
    // También las expone game.js mientras hay una partida activa: reinician /
    // pausan el motor sin recrear el <canvas>.
    restartSnake?: () => void;
    toggleSnakePause?: () => void;
  }
}

type Phase = "playing" | "paused" | "gameover";

type GameState = {
  score: number;
  length: number;
  level: number;
  phase: Phase;
};

const INITIAL_STATE: GameState = {
  score: 0,
  length: 3,
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
 * Reproductor jugable de Snake: sirve game.js desde /public sobre un <canvas>
 * real (backing store 800×600, cuadrícula 20×15, sprites de fruta bitmap
 * escalados a lo ancho del gabinete manteniendo 4:3) dentro del gabinete CRT y
 * sincroniza el HUD React con el estado real del juego vía window.postMessage.
 *
 * A diferencia de asteroids/tetris/arkanoid, el juego depende de un segundo
 * script (sprites.js, que expone window.SPRITE_ATLAS). El orden de ejecución
 * entre dos <Script strategy="afterInteractive"> no está garantizado, así que
 * arrancamos solo cuando AMBOS onReady dispararon y el <canvas> está montado.
 *
 * El modal "Fin del juego" se abre solo al recibir un mensaje type:"gameover" y
 * también con el botón "Salir"; "Guardar puntuación" inserta en public.scores.
 */
export function SnakePlayer({ game }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const readyRef = useRef({ sprites: false, game: false });
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalScore, setModalScore] = useState(() => formatScore(0));
  const isTouch = useIsTouchDevice();

  // onReady de next/script se dispara al cargar el script y también en cada
  // montaje posterior si ya estaba cargado (navegación SPA de vuelta a la ruta).
  function tryStart() {
    if (stopRef.current || !canvasRef.current || !window.startSnake) return;
    if (!readyRef.current.sprites || !readyRef.current.game) return;
    stopRef.current = window.startSnake(canvasRef.current);
  }

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (
        event.origin !== window.location.origin ||
        event.source !== window ||
        event.data?.source !== "snake"
      )
        return;

      const data = event.data;
      if (data.type === "state") {
        setState({
          score: data.score,
          length: data.length,
          level: data.level,
          phase: data.phase,
        });
        // Reinicio vía window.restartSnake(): game.js vuelve a "playing" y el
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
      readyRef.current = { sprites: false, game: false };
    };
  }, []);

  return (
    <>
      <Script
        src="/games/snake/sprites.js"
        strategy="afterInteractive"
        onReady={() => {
          readyRef.current.sprites = true;
          tryStart();
        }}
      />
      <Script
        src="/games/snake/game.js"
        strategy="afterInteractive"
        onReady={() => {
          readyRef.current.game = true;
          tryStart();
        }}
      />

      {/* HUD del reproductor — mismo marcado y clases que la maqueta, leyendo del
          estado real del juego. El tercer bloque muestra LONGITUD y NIVEL (sin
          corazones de "vidas": Snake no tiene vidas). */}
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
            Longitud / Nivel
          </span>
          <div className="flex items-center gap-4">
            <span className="font-display text-headline-md text-secondary-container">
              {state.length}
            </span>
            <span className="font-display text-headline-md text-primary-fixed">
              LVL {state.level}
            </span>
          </div>
        </div>
      </div>

      {/* Pantalla-gabinete con efecto CRT — el marco envuelve el canvas 4:3
          (backing store nativo 800×600, escalado por CSS con pixelado por los
          sprites de fruta bitmap). */}
      <div className="relative flex w-full max-w-5xl items-center justify-center overflow-hidden rounded-[18px] border border-outline-variant bg-black shadow-[inset_0_0_60px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(99,247,255,0.15),0_0_40px_rgba(0,0,0,0.8)]">
        <canvas
          ref={canvasRef}
          id="snake"
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

      {/* SPEC 11: en dispositivos sin teclado físico, el overlay táctil
          sustituye al aviso de teclado. Sin botón A: Space es un no-op en
          este motor. */}
      {isTouch ? (
        <TouchControls
          dpad={{
            left: { code: "ArrowLeft", label: "Girar izquierda" },
            right: { code: "ArrowRight", label: "Girar derecha" },
            up: { code: "ArrowUp", label: "Girar arriba" },
            down: { code: "ArrowDown", label: "Girar abajo" },
          }}
          actionB={{ code: "KeyP", label: "Pausa" }}
        />
      ) : (
        <p className="mt-3 w-full max-w-5xl px-4 text-center font-body text-label-sm text-outline">
          Requiere teclado: flechas para girar, P para pausar.
        </p>
      )}

      {/* Control deck (Pausa / Salir) + modal "Fin del juego" en modo controlado.
          "Salir" abre el modal con la puntuación vigente; el mensaje gameover lo
          abre con la puntuación final real. "Jugar de nuevo" cierra el modal y,
          si la partida terminó, reinicia el motor vía window.restartSnake().
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
            window.restartSnake?.();
          }
          setModalOpen(next);
        }}
        onPause={() => window.toggleSnakePause?.()}
        onSave={() => guardarPuntuacionSnake({ score: state.score })}
      />
    </>
  );
}
