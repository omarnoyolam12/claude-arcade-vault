# SPEC 01 — MVP visual: cinco pantallas de Arcade Vault

> **Status:** Implementado
> **Depends on:** —
> **Date:** 2026-08-31
> **Objective:** Construir la parte visual de las cinco pantallas de `resources/` (acceso, biblioteca, detalle de juego, reproductor y salón de la fama) con App Router, datos mock y navegación real, sin autenticación, sin persistencia y sin motor de juego.

---

## Por qué existe esta spec

El proyecto solo tiene el scaffold de `create-next-app` con el tema global ya aplicado en `app/globals.css` y las fuentes en `app/layout.tsx`. Falta toda la interfaz. Esta spec traslada los cinco mockups de `resources/` a rutas de Next reales, apoyándose en la capa de componentes que ya vive en `globals.css` (`.btn`, `.card`, `.chip`, `.input-terminal`, `.progress`) y en los tokens del design system. No se implementa lógica de negocio: el objetivo es que las cinco pantallas se puedan recorrer y revisar visualmente.

**Regla de estilos:** los estilos globales ya están en `app/globals.css` y no se tocan. Todo lo que haga falta más allá de lo que ese archivo ya cubre (efectos, layout, estados de un mockup concreto) se implementa con utilidades de Tailwind en el JSX, incluidos valores arbitrarios (`shadow-[...]`, `bg-[...]`, `clip-path-[...]`). No se añaden reglas, clases ni `@layer` nuevos a `globals.css` ni se crean archivos CSS por pantalla.

---

## Scope

**In:**

- Ruta `/` — Biblioteca de juegos (mockup `biblioteca_de_juegos_arcade_vault`): fondo shader, header con nav, hero, barra de búsqueda visual, grid de 6 cards leídas de `lib/games.ts`, footer.
- Ruta `/acceso` — Acceso rediseñado (mockup `acceso_redise_ado_arcade_vault`): sin header ni footer, fondo cyber-grid con glows, tabs Iniciar sesión / Crear cuenta que alternan el formulario visible, botón "Jugar como invitado", enlace "¿Olvidaste tu contraseña?".
- Ruta `/juegos/[slug]` — Detalle del juego (mockup `detalle_del_juego_pac_man`): header en variante "volver al vault", imagen hero con `next/image`, panel de info (tags, descripción larga, botón "Jugar ahora" → `/jugar/[slug]`), sidebar de mejores puntuaciones desde `lib/leaderboards.ts`, footer.
- Ruta `/jugar/[slug]` — Reproductor de juego (mockup `reproductor_de_juego_arcade_vault`): header con nav, HUD (jugador, puntuación, vidas, nivel), pantalla-gabinete con efecto CRT y texto "Insert coin", control deck (Pausa / Salir), modal "Fin del juego" oculto por defecto.
- Ruta `/salon-de-la-fama` — Salón de la Fama (mockup `sal_n_de_la_fama_modo_oscuro_arcade_vault`): header con nav, título, pestañas de juego que cambian la tabla de puntuaciones, tabla con RANGO / JUGADOR / PUNTUACIÓN / FECHA, top-3 destacado y fila "Tu mejor marca" resaltada, footer.
- Componentes compartidos: `SiteHeader` (variantes de nav + item activo), `SiteFooter`, `ShaderBackground` (client, WebGL portado tal cual), `MobileNav` (client, dropdown funcional), `GameCard`, `LeaderboardTable`, `AuthTabs` (client), `GameOverModal` (client), `HallOfFameTabs` (client).
- Datos mock tipados en `lib/games.ts` (6 juegos) y `lib/leaderboards.ts` (tabla por juego).
- `next.config.ts`: `images.remotePatterns` para `lh3.googleusercontent.com`.
- Los efectos que no cubre `globals.css` (bezel CRT, glitch en hover, stagger reveal, glow-box) se recrean con utilidades Tailwind en el JSX de cada componente, sin CSS nuevo.
- Navegación real entre pantallas con `next/link`.

**Out of scope (para futuras specs):**

- Autenticación real, registro, sesión, "jugar como invitado" funcional.
- Persistencia de cualquier tipo (localStorage, API, base de datos).
- Motor de juego, canvas jugable, lógica de puntuación real.
- Backend, rutas de API, envío de formularios.
- Búsqueda / filtrado funcional en la biblioteca (la barra es solo visual).
- Guardar puntuación real desde el modal "Fin del juego".
- Tests automatizados (no hay framework configurado).
- Modo claro (el design system opera solo en oscuro).
- Internacionalización más allá del español ya presente.

---

## Data model

Estructuras nuevas, solo para alimentar la UI. Viven en `lib/` y la raíz del repo resuelve como `@/lib/...`.

```ts
// lib/games.ts
export interface Game {
  slug: string;            // "pac-man"  — usado en /juegos/[slug] y /jugar/[slug]
  title: string;           // "PAC-MAN"
  categoryLabel: string;   // badge sobre la imagen: "MAZE"
  tags: string[];          // ["LABERINTO", "CLÁSICO"]
  shortDescription: string; // texto de la card en la biblioteca
  longDescription: string;  // párrafo del panel de detalle
  year: number;            // 1980
  bestScore: string;       // "333,330"  — ya formateado como en el mockup
  image: string;           // URL en lh3.googleusercontent.com
  imageAlt: string;        // alt descriptivo en español
}

export const games: Game[]; // 6: arkanoid, tetris, snake, pac-man, space-invaders, asteroids
export function getGame(slug: string): Game | undefined;
export function getGameSlugs(): string[];
```

```ts
// lib/leaderboards.ts
export interface ScoreEntry {
  rank: number;            // 1..n
  player: string;          // "NEON_KNIGHT"
  score: string;           // "3,333,360"  — ya formateado
  date: string;            // "1984-10-26" | "HOY"
  isCurrentUser?: boolean; // true → fila resaltada "Tu mejor marca"
}

export const leaderboards: Record<string, ScoreEntry[]>; // clave = game.slug
export function getLeaderboard(slug: string): ScoreEntry[];
```

Mock inline (no va a `lib/`): el HUD del reproductor usa un objeto local en `app/jugar/[slug]/page.tsx` con `{ player: "G4M3R_X", score: "0149250", lives: 2, level: 4 }`.

Convenciones:

- Los slugs son kebab-case en minúsculas; los títulos van en mayúsculas.
- Las puntuaciones se guardan ya formateadas como string; no se calculan.
- Las imágenes se referencian por URL remota; el contenedor siempre tiene fondo sólido por si la URL cae.

---

## Implementation plan

1. **Infra de datos y config.** Crear `lib/games.ts` (6 juegos con los textos e imágenes de los mockups) y `lib/leaderboards.ts` (tabla por slug; incluir una entrada `isCurrentUser` para Pac-Man). Añadir `images.remotePatterns` para `lh3.googleusercontent.com` en `next.config.ts`. No se toca `app/globals.css`. `npm run build` sigue verde.

2. **Componentes compartidos de layout.** Crear `components/site-header.tsx` con props `active?: "biblioteca" | "salon"` y `variant?: "nav" | "back"` (la variante `back` muestra solo logo + botón "Volver al vault" en magenta). Crear `components/site-footer.tsx` (estático). Crear `components/mobile-nav.tsx` (`"use client"`, el botón hamburguesa abre/cierra la lista de enlaces). Crear `components/shader-background.tsx` (`"use client"`, portar el `<canvas>` + WebGL de `resources/shader/code.html`, con el `if (!gl) return;` intacto). Todo el estilismo con clases Tailwind en el JSX.

3. **Biblioteca (`app/page.tsx`).** Reescribir la plantilla por defecto. Componer: `ShaderBackground` + `SiteHeader active="biblioteca"` + hero ("Inserta una moneda para jugar") + barra de búsqueda (label + input visual, sin handler) + `<section>` grid con `games.map` renderizando `components/game-card.tsx` (nuevo). Cada `GameCard` enlaza el título a `/juegos/[slug]` y el botón "Jugar" a `/jugar/[slug]`, y muestra `categoryLabel` y `bestScore`. Cerrar con `SiteFooter`.

4. **Acceso (`app/acceso/page.tsx`).** Sin header ni footer. Fondo: cyber-grid + dos glows ambientales. Logo "ARCADE VAULT" + "Insert coin to continue". Tarjeta con bezel arcade y `components/auth-tabs.tsx` (`"use client"`): estado `tab` que alterna entre formulario de login (usuario, contraseña, botones "Iniciar sesión" y "Jugar como invitado", enlace de contraseña) y formulario de registro (correo, usuario, contraseña, botón "Registrar"). Los formularios no envían nada (`onSubmit` con `preventDefault`).

5. **Detalle (`app/juegos/[slug]/page.tsx`).** `generateStaticParams` devuelve `getGameSlugs()`. `params` es `Promise`; resolver con `await` y llamar `notFound()` si `getGame(slug)` es `undefined`. Usar el tipo generado `PageProps<"/juegos/[slug]">`. Layout: `SiteHeader variant="back"` + columna izquierda (imagen hero con `next/image` + overlay de scanlines + badges de `categoryLabel` y `year`, panel de info con `tags`, `longDescription` y botón "Jugar ahora" → `/jugar/[slug]`) + `<aside>` con `components/leaderboard-table.tsx` en `variant="sidebar"` alimentada por `getLeaderboard(slug)` + `SiteFooter`.

6. **Reproductor (`app/jugar/[slug]/page.tsx`).** `generateStaticParams` + `notFound()` + `PageProps<"/jugar/[slug]">` igual que el paso 5. Envolver el contenido en un wrapper con `overflow-hidden` (no tocar `body`). Componer: `SiteHeader variant="nav"` + HUD (objeto mock inline: jugador, puntuación, vidas como iconos, nivel) + pantalla-gabinete (bezel CRT recreado con utilidades Tailwind: `rounded-[...]`, `shadow-[inset_...]`, imagen del juego de fondo, capa de scanlines y glass como divs con `bg-[repeating-linear-gradient(...)]`, texto "Insert coin") + control deck con "Pausa" (sin acción) y "Salir". Crear `components/game-over-modal.tsx` (`"use client"`): estado `open` inicial `false`; "Salir" lo pone en `true`; el modal muestra puntuación final mock y los botones "Jugar de nuevo" (cierra el modal) y "Guardar puntuación" (sin acción). El modal usa una clase `z-[...]` por encima del overlay CRT global (`9999`).

7. **Salón de la Fama (`app/salon-de-la-fama/page.tsx`).** `SiteHeader active="salon"` + título "Salón de la Fama" + `components/hall-of-fame-tabs.tsx` (`"use client"`): pestañas con los 6 juegos de `games`, seleccionada por defecto `pac-man`, que renderiza `LeaderboardTable` en `variant="full"` con columnas RANGO / JUGADOR / PUNTUACIÓN / FECHA (la de fecha se oculta en móvil con `hidden sm:table-cell`). El color oro/plata/bronce del top-3 y el resaltado de la fila `isCurrentUser` ("Tu mejor marca") se resuelven con clases Tailwind condicionales según `rank` (p. ej. `text-tertiary-fixed drop-shadow-[...]`). Cerrar con `SiteFooter`.

8. **Cierre.** Ejecutar `npm run lint` y `npm run build` hasta dejarlos verdes. Recorrer manualmente `/`, `/acceso`, `/juegos/pac-man`, `/jugar/pac-man`, `/salon-de-la-fama` y un slug inexistente. Si `next dev` regeneró `AGENTS.md`, commitearlo junto con el trabajo para no dejar el árbol sucio.

---

## Acceptance criteria

- [ ] `npm run build` termina sin errores ni fallos de tipos.
- [ ] `npm run lint` pasa sin errores.
- [ ] Renderizan sin error: `/`, `/acceso`, `/juegos/pac-man`, `/jugar/pac-man`, `/salon-de-la-fama`.
- [ ] Renderizan `/juegos/arkanoid`, `/juegos/tetris`, `/juegos/snake`, `/juegos/space-invaders`, `/juegos/asteroids` y sus equivalentes bajo `/jugar/...`.
- [ ] `/juegos/foo` (slug inexistente) devuelve la página 404 de Next.
- [ ] En `/`, las 6 cards provienen de `lib/games.ts`; cada card enlaza a `/juegos/[slug]` y su botón "Jugar" a `/jugar/[slug]`.
- [ ] El `SiteHeader` aparece en biblioteca, detalle, reproductor y salón de la fama, y NO aparece en `/acceso`.
- [ ] El `SiteFooter` aparece en esas mismas cuatro pantallas y no en `/acceso`.
- [ ] En `/juegos/pac-man` el header usa la variante "back" (logo + botón "Volver al vault"), sin nav.
- [ ] En `/acceso`, pulsar los tabs "Iniciar sesión" / "Crear cuenta" alterna qué formulario se ve.
- [ ] Enviar cualquier formulario de `/acceso` no recarga ni navega.
- [ ] En `/jugar/pac-man`, el modal "Fin del juego" está oculto al cargar; "Salir" lo muestra y "Jugar de nuevo" lo oculta.
- [ ] El modal "Fin del juego" se ve por encima del overlay CRT global (no queda tapado por los scanlines).
- [ ] En `/salon-de-la-fama`, cambiar de pestaña de juego cambia las filas de la tabla, con datos de `lib/leaderboards.ts`.
- [ ] En la tabla del salón de la fama, los puestos 1-3 llevan estilo oro/plata/bronce y la fila `isCurrentUser` se resalta como "Tu mejor marca".
- [ ] En viewport móvil, el botón hamburguesa del header abre y cierra la lista de enlaces.
- [ ] El fondo shader WebGL se renderiza en `/` y en `/juegos/[slug]` sin romper el build (es client component).
- [ ] Las imágenes remotas de `lh3.googleusercontent.com` cargan mediante `next/image` con `remotePatterns` configurado.
- [ ] Todos los `page.tsx` de rutas dinámicas usan el tipo generado `PageProps<...>` y resuelven `params` con `await`.
- [ ] `app/globals.css` no tiene reglas nuevas respecto al estado actual; todo estilo adicional son utilidades Tailwind en el JSX y no hay archivos `.css` por pantalla.
- [ ] Todo el texto de interfaz está en español con acentos correctos y los titulares en mayúsculas.
- [ ] No existe código de autenticación, persistencia ni motor de juego en el repositorio.

---

## Decisions

- **Sí:** rutas semánticas con `[slug]` dinámico (`/`, `/acceso`, `/juegos/[slug]`, `/jugar/[slug]`, `/salon-de-la-fama`). Cada card enlaza a algún sitio y las 6 páginas de detalle/reproductor salen de datos mock.
- **No:** una única página estática de Pac-Man. Dejaría 5 cards sin destino real.
- **No:** route groups `(marketing)` / `(app)`. No hay layouts suficientemente distintos para justificar la ceremonia; el header/footer se resuelve con componentes por página.
- **Sí:** mantener las URLs remotas de las imágenes con `next/image` + `remotePatterns`. Es lo que traen los mockups y evita meter binarios al repo.
- **No:** placeholders CSS ni descargar imágenes a `/public`. Se puede migrar más adelante si las URLs caducan.
- **Sí:** navegación real + toggles mínimos en client components (tabs de `/acceso`, modal del reproductor, pestañas del salón de la fama, menú móvil). Es la interactividad mínima para que las pantallas se revisen como en los mockups.
- **No:** 100% estático. Sin los toggles no se puede evaluar el diseño de los estados alternos.
- **Sí:** extraer `SiteHeader`, `SiteFooter`, `ShaderBackground` y portar el shader WebGL tal cual.
- **No:** repetir el markup de header/footer en cada página, y **no** sustituir el shader por un gradiente estático.
- **Sí:** usar `globals.css` tal como está (tokens, base y capa de componentes) y no añadir nada a ese archivo. Cualquier estilo extra se hace con utilidades Tailwind en el JSX, incluidos valores arbitrarios.
- **No:** añadir clases, `@layer` o `@utility` nuevos a `globals.css`.
- **No:** portar los bloques `<style>` de cada `code.html` a CSS por pantalla o a CSS Modules. Divergiría del design system.
- **Sí:** menú móvil funcional (dropdown con estado).
- **Sí:** datos mock centralizados en `lib/games.ts` y `lib/leaderboards.ts` para que biblioteca, detalle, reproductor y salón de la fama sean consistentes.
- **Sí:** conservar las fuentes ya configuradas en `layout.tsx` (Anybody + Courier Prime). Se ignora "Press Start 2P" que aparece en algún mockup.
- **Sí:** el HUD del reproductor usa un objeto mock inline en su `page.tsx`, no en `lib/`. Es estado de "sesión de juego", no catálogo.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Las URLs de `lh3.googleusercontent.com` pueden caducar y dejar imágenes rotas. | `alt` descriptivo y contenedor con fondo sólido; migración a `/public` en otra spec si ocurre. |
| El shader WebGL no está soportado o es costoso en GPU. | El componente ya hace `if (!gl) return;`. Es `"use client"` sobre un `<canvas>`, no bloquea SSR. |
| `next dev` reescribe `AGENTS.md` y deja el árbol sucio. | Commitear el `AGENTS.md` regenerado junto con el trabajo (indicado en el paso 8). |
| Rutas tipadas de Next 16: `params` es una `Promise`; olvidarlo rompe el build. | Los pasos 5 y 6 exigen `await params` y el tipo generado `PageProps<...>`. |
| El overlay CRT global (`body::before/::after`, `z-index: 9999`) puede tapar el modal "Fin del juego". | El overlay ya es `pointer-events: none`; el modal se monta con `z-index` superior y se verifica el apilado. |

---

## Lo que **no** entra en esta spec

- Autenticación, registro y sesión reales; "jugar como invitado" funcional.
- Persistencia (localStorage, API, base de datos).
- Motor de juego, canvas jugable, puntuación real, guardar puntuación.
- Backend, rutas de API, envío real de formularios.
- Búsqueda y filtrado funcionales en la biblioteca.
- Tests automatizados.
- Modo claro e i18n adicional.

Cada uno de esos, si llega, va en su propia spec.
