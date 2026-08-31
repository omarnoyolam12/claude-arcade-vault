/**
 * Fondo decorativo del Hero de la home: figuras que aluden a juegos retro
 * (fantasma, invasor, tetromino, bola + ladrillo, asteroide, moneda) flotando
 * en bucle. Puramente ornamental: no captura clics y va detrás del contenido
 * (el contenido del Hero se monta con `relative z-10`).
 *
 * Las @keyframes viven aquí, en el propio componente, no en globals.css ni en
 * un CSS por pantalla (ver spec 02). El @media (prefers-reduced-motion) global
 * ya neutraliza la animación.
 */
export function HeroBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <style>{`
        @keyframes hb-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-30px); }
        }
        @keyframes hb-float-rot {
          0% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-24px) rotate(180deg); }
          100% { transform: translateY(0) rotate(360deg); }
        }
      `}</style>

      {/* Fantasma */}
      <span className="absolute left-[6%] top-[14%] hidden h-16 w-16 text-primary-fixed opacity-70 drop-shadow-[0_0_22px_rgba(0,245,255,0.9)] [animation:hb-float_15s_ease-in-out_infinite] sm:block">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-full w-full">
          <path d="M10 1a8 8 0 00-8 8v10l2-1.6 2 1.6 2-1.6 2 1.6 2-1.6 2 1.6V9a8 8 0 00-8-8z" />
          <circle cx="7.5" cy="9" r="1.6" fill="#0a0a0f" />
          <circle cx="12.5" cy="9" r="1.6" fill="#0a0a0f" />
        </svg>
      </span>

      {/* Invasor */}
      <span className="absolute right-[8%] top-[18%] h-14 w-20 text-secondary-container opacity-70 drop-shadow-[0_0_22px_rgba(255,77,128,0.9)] [animation:hb-float_18s_ease-in-out_infinite] [animation-delay:-4s]">
        <svg viewBox="0 0 11 8" fill="currentColor" className="h-full w-full">
          <path d="M2 0h1v1H2zM8 0h1v1H8zM3 1h5v1H3zM1 2h9v1H1zM0 3h11v1H0zM0 4h11v1H0zM0 5h1v1H0zM3 5h5v1H3zM10 5h1v1h-1zM1 6h2v1H1zM8 6h2v1H8zM0 7h2v1H0zM9 7h2v1H9z" />
        </svg>
      </span>

      {/* Tetromino */}
      <span className="absolute bottom-[16%] left-[12%] h-14 w-20 text-tertiary-fixed opacity-60 drop-shadow-[0_0_22px_rgba(222,231,0,0.85)] [animation:hb-float-rot_30s_linear_infinite]">
        <svg viewBox="0 0 3 2" fill="currentColor" className="h-full w-full">
          <rect x="1.06" y="0.06" width="0.88" height="0.88" />
          <rect x="2.06" y="0.06" width="0.88" height="0.88" />
          <rect x="0.06" y="1.06" width="0.88" height="0.88" />
          <rect x="1.06" y="1.06" width="0.88" height="0.88" />
        </svg>
      </span>

      {/* Bola + ladrillo */}
      <span className="absolute bottom-[20%] right-[12%] hidden h-12 w-24 text-primary-fixed opacity-70 drop-shadow-[0_0_20px_rgba(0,245,255,0.85)] [animation:hb-float_13s_ease-in-out_infinite] [animation-delay:-2s] md:block">
        <svg viewBox="0 0 20 12" fill="currentColor" className="h-full w-full">
          <rect x="0" y="0" width="12" height="4" />
          <circle cx="16" cy="9" r="2.6" />
        </svg>
      </span>

      {/* Asteroide */}
      <span className="absolute left-[44%] top-[6%] hidden h-14 w-14 text-secondary-fixed-dim opacity-55 drop-shadow-[0_0_18px_rgba(255,178,191,0.7)] [animation:hb-float-rot_38s_linear_infinite] lg:block">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-full w-full">
          <polygon points="4,2 12,1 18,6 17,13 11,18 4,16 1,9" />
        </svg>
      </span>

      {/* Moneda */}
      <span className="absolute right-[7%] top-[46%] h-12 w-12 text-tertiary-fixed opacity-70 drop-shadow-[0_0_22px_rgba(222,231,0,0.9)] [animation:hb-float-rot_24s_linear_infinite] [animation-delay:-6s]">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-full w-full">
          <path d="M10 10L20 4A10 10 0 1 0 20 16Z" />
        </svg>
      </span>
    </div>
  );
}
