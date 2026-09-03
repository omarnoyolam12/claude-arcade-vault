# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Qué es este proyecto

**Arcade Vault**: plataforma para jugar online y competir por la mayor cantidad de puntos.

El scaffold de `create-next-app` ya está reemplazado por producto real. Lo que existe hoy (SPEC 01–09):

- **Home** (`app/page.tsx`): hero, stats, feed de "Actividad en vivo" (mock, `lib/activity.ts`), grid de juegos y CTA de acceso.
- **Biblioteca de juegos** (`app/juegos/page.tsx`) y **detalle** (`app/juegos/[slug]/page.tsx`): catálogo leído de Supabase.
- **Salón de la Fama** (`app/salon-de-la-fama/page.tsx`): leaderboards por juego leídos de Supabase.
- **Acceso** (`app/acceso/page.tsx`): maqueta de login/registro (`components/auth-tabs.tsx`). Sin autenticación real todavía.
- **Acerca de + Contacto** (`app/acerca-de/`): formulario con Server Action que envía correo vía **Resend** (`app/acerca-de/actions.ts`).
- **Reproductor** (`app/jugar/[slug]/page.tsx`): `asteroids`, `tetris`, `arkanoid` y `snake` son **jugables de verdad** con guardado real de puntuación; el resto de slugs sigue siendo maqueta CRT.

## Comandos

```bash
npm run dev        # servidor de desarrollo (next dev)
npm run build      # build de producción (next build)
npm run start      # sirve el build (next start)
npm run lint       # ESLint (flat config; se invoca como `eslint` sin args)
npm run gen:types  # regenera lib/supabase/database.types.ts (supabase gen types --linked)
```

No hay framework de tests configurado. La validación es `npm run build` + revisión visual (Playwright MCP, screenshots en `playwrite-screenshots/`).

Un hook `PostToolUse` (`.claude/settings.json`) corre `prettier --write` y `eslint --fix` sobre cada archivo que Claude escribe o edita. No hace falta formatear a mano.

## Stack y convenciones

- **Next.js 16.3.3** (App Router) + **React 19.2.8** + **TypeScript strict**. `next dev` reescribe el bloque `nextjs-agent-rules` de este archivo con la advertencia de breaking changes: antes de escribir código de Next, lee la guía relevante en `node_modules/next/dist/docs/` (secciones `01-app/01-getting-started`, `02-guides`, `03-api-reference`). Commitea el archivo regenerado junto con tu trabajo para no dejar el árbol sucio.
- **Rutas tipadas de Next 16**: `app/layout.tsx` usa el tipo global `LayoutProps<"/">` (no se importa). Las páginas/layouts nuevos deben usar los tipos generados `PageProps<...>` / `LayoutProps<...>` (p. ej. `PageProps<"/jugar/[slug]">`).
- **Middleware renombrado a `proxy.ts`**: en Next 16 el convenio `middleware.ts` está deprecado. La raíz tiene `proxy.ts` (función `proxy`), que delega en `updateSession` (`lib/supabase/middleware.ts`) para refrescar la sesión de Supabase en cada navegación. Hoy no redirige ni protege rutas.
- **Tailwind CSS v4**: configuración CSS-first en `app/globals.css` vía `@import "tailwindcss"` y un bloque `@theme inline` con el set de tokens tipo Material (`--color-*`, `--font-*`, `--text-*`, `--max-w-arcade`, etc.). No hay `tailwind.config`; el plugin de PostCSS está en `postcss.config.mjs`. **El sitio opera solo en modo oscuro** (Neon-Brutalist / 80s retro-future). Fuente de verdad del diseño: `resources/arcade_vault/DESIGN.md`.
- **Fuentes** (`next/font/google`, expuestas como CSS variables desde el layout raíz): `Anybody` (`--font-anybody`, titulares), `Courier Prime` (`--font-courier-prime`, cuerpo/datos), `Press Start 2P` (`--font-press-start`, acento arcade: hero y rótulos `// NN`).
- **Alias de imports**: `@/*` resuelve a la raíz del repo (`tsconfig.json`).
- **Imágenes remotas**: `next.config.ts` solo permite `lh3.googleusercontent.com` en `images.remotePatterns`.

## Supabase (SPEC 04 / 06)

Backend de catálogo y puntuaciones. **Aún no hay auth**: todo se hace con la clave publicable y RLS.

- **Clientes** en `lib/supabase/`:
  - `anon.ts` — cliente **sin cookies** (`@supabase/supabase-js` directo). Para lecturas públicas y para poder llamarse desde `generateStaticParams` sin forzar render dinámico. Es el que usan `lib/games.ts` y `lib/leaderboards.ts`, y también las Server Actions de guardado.
  - `server.ts` — cliente con cookies (`@supabase/ssr`) para Server Components / Actions / Route Handlers. Reservado para cuando haya auth por usuario.
  - `client.ts` — cliente de navegador (`@supabase/ssr`).
  - `middleware.ts` — `updateSession`, invocado desde `proxy.ts`.
  - `database.types.ts` — generado por `npm run gen:types`. No editar a mano.
- **Capa de datos** (solo lectura, sin fallback mock — si la consulta falla, lanza):
  - `lib/games.ts` — `getGames()`, `getGame(slug)`, `getGameSlugs()` contra `public.games`. Mapea snake_case → camelCase.
  - `lib/leaderboards.ts` — `getLeaderboard(slug)`, `getAllLeaderboards()` contra `public.scores`. El `rank` y el orden (`score DESC`, desempate `achieved_at ASC` nulls last) se calculan aquí, no se guardan.
- **Migraciones** (`supabase/migrations/`):
  - `0001_create_games.sql` — `public.games`, RLS con lectura pública, seed de juegos.
  - `0002_create_scores.sql` — `public.scores` (FK a `games.slug`), RLS con lectura pública, seed de leaderboards históricos.
  - `0003_scores_allow_anon_insert.sql` — política `anon_insert_scores`: `INSERT` para `anon` con `with check (achieved_at is null and score > 0 and player <> '')`. Sin UPDATE/DELETE.
- **Variables de entorno**: ver `.env.template`. Las `NEXT_PUBLIC_SUPABASE_*` se exponen al navegador (respetan RLS); `SUPABASE_SECRET_KEY` se documenta pero ningún archivo de runtime la lee todavía.
- **MCP**: `.mcp.json` registra el servidor `supabase` (HTTP), habilitado en `.claude/settings.local.json`.

## Juegos jugables (SPEC 05 / 07 / 08 / 09)

Patrón para portar un starter game (`resources/started-games/`) a `/jugar/[slug]`:

1. El fork del juego vive en `public/games/<slug>/` (JS vanilla + assets binarios). Expone un contrato `window.start<Slug>(canvasEl)` / `stop()` / `restart<Slug>()`.
2. Un componente cliente `components/<slug>-player.tsx` monta el canvas, carga el script, arranca el juego y escucha su estado vía `postMessage` para pintar el HUD en React.
3. `app/jugar/[slug]/page.tsx` renderiza el `<XPlayer game={game}>` correspondiente cuando el slug es jugable.
4. Al hacer game over, "Guardar puntuación" llama a la Server Action `guardarPuntuacion<Slug>({ score })` de `app/jugar/[slug]/actions.ts`, que inserta `{ game_slug, player: "G4M3R_X", score, achieved_at: null }` en `public.scores` usando el cliente `anon` y la política `anon_insert_scores`. Revalida `/salon-de-la-fama` y `/juegos/<slug>`.

Componentes de juego: `asteroids-player`, `tetris-player`, `arkanoid-player`, `snake-player`, más `game-over-modal.tsx`. **No asumas que un juego nuevo tiene la forma de otro** (Tetris no tiene "vidas", Arkanoid es multi-módulo con spritesheet asíncrono, etc.).

## Skills

- **`/frontend-design`** — úsala siempre para diseñar la interfaz de usuario.
- **`/spec`** y **`/spec-impl`** — flujo Spec Driven Design con los skills de `Klerith/fernando-skills` (`npx skills@latest add Klerith/fernando-skills`). `/spec` redacta la especificación en `specs/NN-*.md`; `/spec-impl` crea la rama `spec-NN-slug` (config en `specs/.spec-config.yml`) y la implementa por pasos.
- **`/juego-jugable`** (skill local, `.claude/skills/juego-jugable/`) — hermana especializada de `/spec` para el caso "hacer jugable un juego + leaderboard escribible en Supabase". Redacta el spec siguiendo el patrón SPEC 05 + SPEC 06; no escribe código.

Skills instaladas: `skills-lock.json`. Specs existentes: `specs/` (01 pantallas → 09 snake).

## Agentes

- **`game-planner`** (`.claude/agents/game-planner.md`) — subagente que analiza el catálogo, la estética y el patrón de portado, y **decide qué juego añadir a continuación** con su justificación y alternativas. No escribe código ni specs; su cierre es sugerir `/juego-jugable`. Mantiene memoria de todo lo sugerido en `.claude/game-planner/registro-sugerencias.md` (versionado) y no repite propuestas previas. Se invoca de forma explícita ("usa el agente game-planner…").

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
