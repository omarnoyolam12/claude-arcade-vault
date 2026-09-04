"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

// SPEC 11: overlay táctil compartido por los cuatro reproductores jugables.
// Cada botón despacha KeyboardEvent sintéticos hacia window: touchstart dispara
// un keydown inmediato y arma un autorepeat (como el de una tecla física
// mantenida); touchend/touchcancel dispara el keyup y limpia los timers. Un
// botón cuyo juego no lo usa simplemente no se renderiza.

const INITIAL_REPEAT_DELAY_MS = 300;
const REPEAT_INTERVAL_MS = 50;

// Detecta un dispositivo sin teclado físico (móvil, tablet) para decidir si
// mostrar el overlay táctil en vez del aviso de teclado. `matchMedia` es la
// señal estándar; `ontouchstart in window` es el respaldo si no está
// disponible. `useSyncExternalStore` (en vez de useState + useEffect) evita
// el desajuste de hidratación: el servidor no tiene `matchMedia`, así que su
// snapshot es siempre `false`, y React reconcilia con el valor real del
// cliente en el primer paint sin doble render descoordinado.
function subscribeNoop() {
  return () => {};
}

function getTouchSnapshot(): boolean {
  if (typeof window.matchMedia === "function") {
    return window.matchMedia("(pointer: coarse)").matches;
  }
  return "ontouchstart" in window;
}

function getTouchServerSnapshot(): boolean {
  return false;
}

export function useIsTouchDevice(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    getTouchSnapshot,
    getTouchServerSnapshot,
  );
}

type TouchButtonConfig = {
  code: string; // KeyboardEvent.code a despachar, p.ej. "ArrowLeft"
  label: string; // texto / aria-label visible en el botón
};

type TouchControlsProps = {
  dpad: {
    up?: TouchButtonConfig;
    down?: TouchButtonConfig;
    left?: TouchButtonConfig;
    right?: TouchButtonConfig;
  };
  actionA?: TouchButtonConfig;
  actionB?: TouchButtonConfig;
};

// Despacha keydown/keyup sintéticos hacia window para un código de tecla dado,
// con autorepeat mientras el botón sigue presionado. Compartido por DpadButton
// y ActionButton: misma mecánica de input, distinto chrome visual.
//
// Los listeners se registran a mano con { passive: false }: React adjunta sus
// listeners de touch de forma pasiva por defecto, así que un onTouchStart
// sintético no puede hacer preventDefault (el navegador lanza "Unable to
// preventDefault inside passive event listener invocation" y el scroll/click
// fantasma no se evita). Un listener nativo no pasivo sí puede.
function useSyntheticKeyPress(code: string) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const pressedRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    function clearTimers() {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    function dispatchKeyDown() {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { code, bubbles: true }),
      );
    }

    function dispatchKeyUp() {
      window.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true }));
    }

    function handlePress(event: TouchEvent) {
      event.preventDefault();
      pressedRef.current = true;
      dispatchKeyDown();
      timeoutRef.current = window.setTimeout(() => {
        intervalRef.current = window.setInterval(
          dispatchKeyDown,
          REPEAT_INTERVAL_MS,
        );
      }, INITIAL_REPEAT_DELAY_MS);
    }

    function handleRelease(event: TouchEvent) {
      event.preventDefault();
      if (!pressedRef.current) return;
      pressedRef.current = false;
      clearTimers();
      dispatchKeyUp();
    }

    button.addEventListener("touchstart", handlePress, { passive: false });
    button.addEventListener("touchend", handleRelease, { passive: false });
    button.addEventListener("touchcancel", handleRelease, {
      passive: false,
    });

    // Si el componente se desmonta con el dedo aún sobre el botón (p. ej.
    // navegación fuera de la ruta), corta el autorepeat y suelta la tecla.
    return () => {
      button.removeEventListener("touchstart", handlePress);
      button.removeEventListener("touchend", handleRelease);
      button.removeEventListener("touchcancel", handleRelease);
      clearTimers();
      if (pressedRef.current) {
        pressedRef.current = false;
        dispatchKeyUp();
      }
    };
  }, [code]);

  return buttonRef;
}

const DPAD_BUTTON_CLASS =
  "flex h-14 w-14 select-none items-center justify-center rounded-md border border-outline-variant bg-surface-container text-primary-fixed shadow-[0_0_10px_rgba(99,247,255,0.25)] active:bg-surface-container-high active:shadow-[0_0_16px_rgba(99,247,255,0.5)]";

const ACTION_BUTTON_CLASS =
  "flex h-16 w-16 select-none items-center justify-center rounded-full border-2 font-display text-headline-md";

function DpadButton({
  config,
  area,
  rotate = 0,
}: {
  config: TouchButtonConfig | undefined;
  area: string;
  rotate?: number;
}) {
  const buttonRef = useSyntheticKeyPress(config?.code ?? "");
  if (!config) return <div style={{ gridArea: area }} />;
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={config.label}
      data-code={config.code}
      className={DPAD_BUTTON_CLASS}
      style={{ gridArea: area, touchAction: "none" }}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="h-6 w-6"
        style={{ transform: `rotate(${rotate}deg)` }}
      >
        <path
          d="M12 4 L19 12 L14.5 12 L14.5 20 L9.5 20 L9.5 12 L5 12 Z"
          fill="currentColor"
        />
      </svg>
    </button>
  );
}

function ActionButton({
  config,
  variant,
}: {
  config: TouchButtonConfig;
  variant: "a" | "b";
}) {
  const buttonRef = useSyntheticKeyPress(config.code);
  const variantClass =
    variant === "a"
      ? "border-primary-fixed text-primary-fixed drop-shadow-[0_0_8px_#63f7ff] active:bg-primary-fixed/20"
      : "border-secondary-container text-secondary-container drop-shadow-[0_0_8px_#ff4d80] active:bg-secondary-container/20";

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={config.label}
      data-code={config.code}
      className={`${ACTION_BUTTON_CLASS} ${variantClass}`}
      style={{ touchAction: "none" }}
    >
      {variant.toUpperCase()}
    </button>
  );
}

export function TouchControls({ dpad, actionA, actionB }: TouchControlsProps) {
  return (
    <div
      className="mt-4 flex w-full max-w-5xl select-none items-center justify-between gap-6 px-4"
      aria-label="Controles táctiles"
    >
      <div
        className="grid grid-cols-3 grid-rows-3 gap-1"
        style={{
          gridTemplateAreas: '"tl up tr" "left mid right" "bl down br"',
        }}
      >
        <div style={{ gridArea: "tl" }} />
        <DpadButton config={dpad.up} area="up" />
        <div style={{ gridArea: "tr" }} />
        <DpadButton config={dpad.left} area="left" rotate={-90} />
        <div style={{ gridArea: "mid" }} />
        <DpadButton config={dpad.right} area="right" rotate={90} />
        <div style={{ gridArea: "bl" }} />
        <DpadButton config={dpad.down} area="down" rotate={180} />
        <div style={{ gridArea: "br" }} />
      </div>

      <div className="flex items-end gap-4">
        {actionB && <ActionButton config={actionB} variant="b" />}
        {actionA && <ActionButton config={actionA} variant="a" />}
      </div>
    </div>
  );
}
