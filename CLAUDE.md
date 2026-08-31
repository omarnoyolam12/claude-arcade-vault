# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Qué es este proyecto

**Arcade Vault**: plataforma para jugar online y competir por la mayor cantidad de puntos.

Estado actual: solo existe el scaffold de `create-next-app`. `app/page.tsx` sigue siendo la plantilla por defecto. Toda la funcionalidad de producto está por construir.

## Comandos

```bash
npm run dev     # servidor de desarrollo (next dev)
npm run build   # build de producción (next build)
npm run start   # sirve el build (next start)
npm run lint    # ESLint (flat config; se invoca como `eslint` sin args)
```

No hay framework de tests configurado todavía.

## Stack y convenciones

- **Next.js 16.3.3** (App Router) + **React 19.2.8** + **TypeScript strict**. `next dev` reescribe `AGENTS.md` con la advertencia de breaking changes: antes de escribir código de Next, lee la guía relevante en `node_modules/next/dist/docs/` (secciones `01-app/01-getting-started`, `02-guides`, `03-api-reference`). Commitea el `AGENTS.md` regenerado junto con tu trabajo para no dejar el árbol sucio.
- **Rutas tipadas de Next 16**: `app/layout.tsx` usa el tipo global `LayoutProps<"/">` (no se importa). Las páginas/layouts nuevos deben usar los tipos generados `PageProps<...>` / `LayoutProps<...>`.
- **Tailwind CSS v4**: configuración CSS-first en `app/globals.css` vía `@import "tailwindcss"` y el bloque `@theme inline` (no hay `tailwind.config`). El plugin de PostCSS está en `postcss.config.mjs`. Los tokens de tema (`--color-background`, `--font-sans`, etc.) se definen ahí y el modo oscuro usa `prefers-color-scheme`.
- **Alias de imports**: `@/*` resuelve a la raíz del repo (`tsconfig.json`).
- **Fuentes**: `next/font/google` (Geist / Geist Mono) expuestas como CSS variables desde el layout raíz.

## Skill
Usa siempre /frontend-design para diseñar la interfaz de usuario.

## Flujo de trabajo: Spec Driven Design

El proyecto sigue diseño guiado por especificación con los skills de `Klerith/fernando-skills` (instalados vía `npx skills@latest add Klerith/fernando-skills`). Usa `/spec` para redactar la especificación de una funcionalidad y `/spec-impl` para implementarla a partir de esa spec.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
