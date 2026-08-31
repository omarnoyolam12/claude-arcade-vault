import type { CSSProperties, ReactNode } from "react";

import { ContactForm } from "@/components/contact-form";
import { PerspectiveGrid } from "@/components/perspective-grid";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

// "Press Start 2P" (cargada en layout.tsx) solo para el <h1> del hero y los
// rótulos "• ACERCA DE" / "• CONTACTO". Se aplica por `style` inline porque las
// reglas de elemento sin capa de globals.css (h1{}, span{}) ganan a las
// utilidades de Tailwind. Fallback a Anybody y monoespaciada.
const PIXEL_FONT: CSSProperties = {
  fontFamily: "var(--font-press-start), var(--font-anybody), monospace",
};

const GLOW_CYAN = "[text-shadow:0_0_10px_rgba(99,247,255,0.8),0_0_20px_rgba(99,247,255,0.4)]";
const GLOW_MAGENTA = "[text-shadow:0_0_10px_rgba(255,77,128,0.8),0_0_20px_rgba(255,77,128,0.4)]";

const SCANLINE_SVG =
  "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGxpbmUgeDE9IjAiIHkxPSIxMCIgeDI9IjIwIiB5Mj0iMTAiIHN0cm9rZT0iIzAwZGNlNSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIiAvPjwvc3ZnPg==')";

function SectionLabel({
  children,
  bulletClass,
  textClass,
}: {
  children: ReactNode;
  bulletClass: string;
  textClass: string;
}) {
  return (
    <div
      style={PIXEL_FONT}
      className={`inline-flex items-center gap-3 text-label-sm uppercase tracking-widest ${textClass}`}
    >
      <span aria-hidden className={`h-1 w-1 ${bulletClass}`} />
      {children}
    </div>
  );
}

type Feature = {
  title: ReactNode;
  icon: ReactNode;
  iconClass: string;
  hoverClass: string;
};

const FEATURES: Feature[] = [
  {
    title: (
      <>
        Hecho con <span className="text-secondary-container">♥</span> para jugadores
      </>
    ),
    iconClass: "text-secondary-container",
    hoverClass: "hover:border-secondary-container hover:shadow-[0_0_25px_rgba(255,77,128,0.3)]",
    icon: (
      <path d="M12 21s-6.7-4.3-9.3-8.7C1.1 9 2.5 5 6 5c2.1 0 3.5 1.4 4 2 .5-.6 1.9-2 4-2 3.5 0 4.9 4 3.3 7.3C18.7 16.7 12 21 12 21z" />
    ),
  },
  {
    title: <>Juegos en HTML — corren en cualquier navegador</>,
    iconClass: "text-primary-fixed",
    hoverClass: "hover:border-primary-fixed hover:shadow-[0_0_25px_rgba(99,247,255,0.3)]",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="16" />
        <path d="m7 9 3 3-3 3M13 15h4" />
      </>
    ),
  },
  {
    title: <>Proyecto en constante crecimiento</>,
    iconClass: "text-tertiary-container",
    hoverClass: "hover:border-tertiary-container hover:shadow-[0_0_25px_rgba(222,231,0,0.3)]",
    icon: (
      <>
        <path d="M4 20h16M4 20V9M4 20l6-6 4 4 8-9" />
        <path d="M17 9h4v4" />
      </>
    ),
  },
];

const DIVIDER_SEGMENTS = [
  "bg-primary-fixed",
  "bg-secondary-container",
  "bg-tertiary-container",
  "bg-outline-variant",
  "bg-outline-variant",
  "bg-outline-variant",
  "bg-tertiary-container",
  "bg-secondary-container",
  "bg-primary-fixed",
];

const CONTACT_POINTS = [
  { text: "Respuesta en 24-48h", dotClass: "bg-primary-fixed shadow-[0_0_8px_rgba(99,247,255,0.8)]" },
  { text: "Sugerencias bienvenidas", dotClass: "bg-tertiary-container shadow-[0_0_8px_rgba(222,231,0,0.8)]" },
  { text: "Sin spam, jamás", dotClass: "bg-secondary-container shadow-[0_0_8px_rgba(255,77,128,0.8)]" },
];

export default function AcercaDePage() {
  return (
    <>
      <SiteHeader active="acerca" />

      <main className="relative z-10 mx-auto flex w-full max-w-arcade flex-col gap-24 px-margin pb-24 pt-32">
        <PerspectiveGrid />

        {/* Hero */}
        <section className="flex flex-col items-center gap-8 pt-12 text-center">
          <SectionLabel bulletClass="bg-tertiary" textClass="text-tertiary">
            Acerca de
          </SectionLabel>

          <h1
            style={{ ...PIXEL_FONT, fontSize: "clamp(1.5rem,6vw,3rem)", lineHeight: 1.4 }}
            className={`uppercase leading-none text-primary-fixed ${GLOW_CYAN}`}
          >
            <span style={PIXEL_FONT} className="text-on-surface">
              Acerca de
            </span>
            <br />
            <span
              style={PIXEL_FONT}
              className="text-transparent [-webkit-text-stroke:1px_rgb(99,247,255)] [text-shadow:0_0_8px_rgba(99,247,255,0.4)]"
            >
              Arcade
            </span>
            <br />
            <span style={PIXEL_FONT} className={`text-secondary-container ${GLOW_MAGENTA}`}>
              Vault
            </span>
          </h1>

          <p className="mx-auto max-w-2xl font-body text-body-md leading-relaxed text-on-surface-variant">
            ARCADE VAULT nació del amor por los videojuegos clásicos. Nuestra
            misión es preservar y celebrar los arcades que definieron una
            generación, haciéndolos accesibles para todos, en cualquier lugar y
            sin costo.
          </p>
        </section>

        {/* Fila de features */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <div
              key={index}
              className={`relative overflow-hidden border border-primary-fixed-dim bg-surface-container p-6 shadow-[inset_0_0_10px_rgba(0,220,229,0.2)] transition-all duration-300 ${feature.hoverClass}`}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-30"
                style={{ backgroundImage: SCANLINE_SVG }}
              />
              <div className="relative z-10 flex items-center gap-3">
                <svg
                  viewBox="0 0 24 24"
                  className={`h-6 w-6 shrink-0 ${feature.iconClass}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  {feature.icon}
                </svg>
                {/* Todo por `style` inline: la regla sin capa `h3 {}` de
                    globals.css (familia display, 24px, peso 700, glow) pisa
                    cualquier utilidad de Tailwind con la misma especificidad.
                    El mockup usa Courier Prime plano a tamaño label-sm. */}
                <h3
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "0.75rem",
                    fontWeight: 400,
                    lineHeight: 1.35,
                    letterSpacing: "0.08em",
                    textShadow: "none",
                  }}
                  className="uppercase text-on-surface"
                >
                  {feature.title}
                </h3>
              </div>
            </div>
          ))}
        </section>

        {/* Divisor de segmentos */}
        <div className="flex items-center justify-center py-12">
          <div className="flex h-1 gap-1">
            {DIVIDER_SEGMENTS.map((color, index) => (
              <div key={index} className={`h-1 w-4 ${color}`} />
            ))}
          </div>
        </div>

        {/* Sección de contacto */}
        <section className="grid grid-cols-1 gap-16 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <SectionLabel bulletClass="bg-primary-fixed" textClass="text-primary-fixed">
              Contacto
            </SectionLabel>

            <h2
              className={`font-display text-headline-lg uppercase text-primary-fixed ${GLOW_CYAN}`}
            >
              Contáctanos
            </h2>

            <p className="max-w-md font-body text-body-md text-on-surface-variant">
              ¿Tienes alguna sugerencia, quieres proponer un juego, o simplemente
              quieres saludar? Escríbenos.
            </p>

            <ul className="mt-4 flex flex-col gap-4 font-body text-label-sm uppercase tracking-widest text-on-surface">
              {CONTACT_POINTS.map((point) => (
                <li key={point.text} className="flex items-center gap-3">
                  <span aria-hidden className={`h-2 w-2 ${point.dotClass}`} />
                  {point.text}
                </li>
              ))}
            </ul>
          </div>

          <ContactForm />
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
