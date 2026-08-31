# SPEC 02 — Página home en `/` y listado de juegos movido a `/juegos`

> **Status:** Aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-08-31
> **Objective:** Construir la home de Arcade Vault en `/` (hero, beneficios, showcase de juegos, actividad en vivo y precios) con datos mock, y trasladar el listado de juegos actual de `/` a `/juegos` reapuntando la navegación.

---

## Por qué existe esta spec

La SPEC 01 dejó el listado de juegos ("Biblioteca") en la raíz `/`. El producto necesita una portada real: una página de entrada que presente la plataforma, muestre por qué existe, adelante el catálogo y enseñe actividad reciente. Esta spec crea esa portada en `/` y empuja el listado a su URL semántica `/juegos`, sin tocar el resto de pantallas (`/acceso`, `/juegos/[slug]`, `/jugar/[slug]`, `/salon-de-la-fama`).

El mockup de referencia es `resources/home/` (`code.html` + `screen.png`). Se porta su estructura, no su tipografía: el mockup abusa de "Press Start 2P" y esta spec mantiene la decisión de la SPEC 01 de usar solo **Anybody + Courier Prime**.

**Regla de estilos (heredada de SPEC 01):** `app/globals.css` no se toca. Todo estilo adicional se resuelve con utilidades de Tailwind en el JSX, incluidos valores arbitrarios (`shadow-[...]`, `bg-[repeating-linear-gradient(...)]`). No se añaden reglas, clases ni `@layer` a `globals.css`, ni archivos CSS por pantalla.

---

## Scope

**In:**

- Ruta `/` — **Home** (mockup `resources/home`). Cinco secciones, en este orden:
  1. **Hero:** etiqueta "Inserta una moneda_", titular a tres líneas ("El arcade / clásico está / de vuelta"), subtítulo, y dos CTAs: "Explorar juegos" → `/juegos` y "Crear cuenta" → `/acceso`. Los adornos geométricos flotantes del mockup se recrean con divs y `animate-[...]` de Tailwind (o se omiten si complican; son decorativos).
  2. **¿Por qué Arcade Vault?:** grid de 4 tarjetas estáticas (juegos clásicos, 100% gratis, ranking global, siempre creciendo) con su icono, título y texto. Contenido literal del mockup, tipografía del design system.
  3. **Juegos disponibles ahora:** grid de 6 miniaturas leídas de `lib/games.ts` mediante el nuevo `components/game-thumb.tsx` (`next/image` + enlace a `/juegos/[slug]`), más un botón "Ver todos los juegos" → `/juegos`.
  4. **Actividad en vivo:** barra de 3 stats estáticas (`12+ juegos`, `miles de partidas`, `ranking global`), columna "Últimas puntuaciones" (feed de `lib/activity.ts`) y columna "Top jugadores — hoy" (lista de `lib/activity.ts`) con enlace "Ver salón" → `/salon-de-la-fama`.
  5. **Precios:** tarjeta de plan único "Jugador Vault" ($0 / siempre) con lista de ventajas y CTA "Empezar gratis" → `/acceso`, junto a un bloque de 3 preguntas frecuentes. Contenido literal del mockup.
- Ruta `/juegos` — **Listado de juegos**: el contenido íntegro del actual `app/page.tsx` (fondo shader, hero "Inserta una moneda para jugar", barra de búsqueda visual, grid de 6 `GameCard`), movido tal cual salvo el prop `active` del header.
- `components/vault-mark.tsx` — nuevo. Logo compuesto (rombo de neón cian + palabra "ARCADE VAULT" en Anybody) tomado del nav del mockup de home. Reemplaza el logo de solo texto actual en `SiteHeader` y `SiteFooter`.
- `components/game-thumb.tsx` — nuevo. Miniatura cuadrada compacta de un juego para el showcase de la home.
- `lib/activity.ts` — nuevo. Datos mock de actividad reciente.
- Cambios de navegación en `components/site-header.tsx` y `components/mobile-nav.tsx`:
  - Nuevo enlace "Inicio" → `/`.
  - "Biblioteca" pasa a apuntar a `/juegos` (antes `/`).
  - El prop/estado `active` pasa de `"biblioteca" | "salon"` a `"inicio" | "juegos" | "salon"`.
  - La variante `back` del header ("Volver al vault") pasa a enlazar `/juegos` (antes `/`).
- Ajuste de `active` en `app/salon-de-la-fama/page.tsx` si el rename del union lo exige (sigue siendo `"salon"`, no cambia el valor).

**Out of scope (para futuras specs):**

- Autenticación, registro y "jugar como invitado" funcionales.
- Persistencia de cualquier tipo. La "actividad en vivo" es mock estático, no un feed real.
- Búsqueda/filtrado funcional (la barra de `/juegos` sigue siendo visual, igual que en SPEC 01).
- Cobros o pasarela de pago reales tras la sección de precios.
- Indicador "CRÉDITOS — 03" del nav del mockup (no se añade al header).
- Botón "Iniciar Sesión" extra del nav del mockup: se conserva el enlace "Acceder" ya existente.
- Página "Acerca de" que aparece en el nav del mockup.
- Tests automatizados (no hay framework configurado).
- Modo claro e i18n adicional.
- Editar el archivo de la SPEC 01 (sus criterios superados se anotan aquí, en Decisiones).

---

## Data model

Estructura nueva, solo para alimentar la sección "Actividad en vivo" de la home. Vive en `lib/` y resuelve como `@/lib/activity`.

```ts
// lib/activity.ts
export interface RecentScore {
  player: string;   // "NEONFOX"
  game: string;     // "Caída" — nombre visible, no slug
  points: string;   // "+154.220" — ya formateado, con signo
}

export interface TopPlayerToday {
  rank: number;     // 1..n
  player: string;   // "NEONFOX"
  score: string;    // "312.840" — ya formateado
}

export const recentScores: RecentScore[];      // 5 entradas, como el mockup
export const topPlayersToday: TopPlayerToday[]; // 4 entradas, como el mockup
```

Convenciones (heredadas de SPEC 01):

- Las puntuaciones se guardan ya formateadas como string; no se calculan ni se ordenan en runtime.
- El orden del array es el orden de presentación.
- El contenido textual de las secciones estáticas (hero, beneficios, precios, FAQ) va inline en el JSX de sus componentes, no en `lib/`.

`lib/games.ts` y `lib/leaderboards.ts` no cambian.

---

## Implementation plan

1. **Datos mock de actividad.** Crear `lib/activity.ts` con `RecentScore`, `TopPlayerToday`, `recentScores` (5) y `topPlayersToday` (4), con los valores del mockup. `npm run build` sigue verde.

2. **Logo compartido.** Crear `components/vault-mark.tsx`: rombo cian (`rotate-45`, borde, `shadow-[0_0_8px_...]`) + texto "ARCADE VAULT" en `font-display` uppercase. Props mínimas para tamaño (p. ej. `size?: "sm" | "md"`). Sustituir el logo de solo texto en `components/site-header.tsx` (sigue envuelto en `<Link href="/">`) y en `components/site-footer.tsx`. Recorrer las cinco pantallas ya existentes: el header/footer siguen renderizando sin romper. `npm run build` verde.

3. **Mover el listado a `/juegos`.** Crear `app/juegos/page.tsx` con el contenido actual de `app/page.tsx` (import de `ShaderBackground`, `SiteHeader`, `SiteFooter`, `GameCard`, `games`), cambiando solo `active="biblioteca"` por `active="juegos"`. No borrar aún `app/page.tsx`. Verificar que `/juegos` renderiza igual que `/` hoy y que `/juegos/pac-man` sigue funcionando (rutas hermanas). `npm run build` verde.

4. **Reapuntar la navegación.** En `components/site-header.tsx` y `components/mobile-nav.tsx`:
   - Cambiar el union de `active` a `"inicio" | "juegos" | "salon"`.
   - Añadir el enlace "Inicio" → `/` y dejar "Biblioteca" → `/juegos`.
   - En la variante `back` del header, "Volver al vault" → `/juegos`.
   - Ajustar `app/juegos/page.tsx` (`active="juegos"`) y `app/salon-de-la-fama/page.tsx` (sigue `active="salon"`).
   Recorrer `/juegos`, `/salon-de-la-fama`, `/juegos/pac-man`, `/jugar/pac-man`: nav correcto, item activo correcto, "Volver al vault" lleva a `/juegos`. `npm run build` verde.

5. **Miniatura de juego para el showcase.** Crear `components/game-thumb.tsx`: recibe un `Game`, renderiza un cuadrado (`aspect-square`) con `next/image` (`fill`, `object-cover`), badge de `categoryLabel`, título, y todo el bloque enlazado a `/juegos/${game.slug}`. Estilo con utilidades Tailwind (borde de neón, hover glow), coherente con `GameCard`.

6. **Home — hero + beneficios (`app/page.tsx`).** Reescribir `app/page.tsx` como la nueva home. Empezar por: `SiteHeader active="inicio"`, sección hero (etiqueta, titular a 3 líneas con `drop-shadow` de neón, subtítulo, CTAs a `/juegos` y `/acceso`) y sección "¿Por qué Arcade Vault?" (grid de 4 tarjetas estáticas). Cerrar con `SiteFooter`. `/` ya no muestra el listado. `npm run build` verde.

7. **Home — showcase de juegos.** Añadir a `app/page.tsx` la sección "Juegos disponibles ahora": grid responsive de `games.map` con `GameThumb`, más el botón "Ver todos los juegos" → `/juegos`. Verificar que las 6 imágenes remotas cargan y que cada miniatura enlaza a su `/juegos/[slug]`.

8. **Home — actividad en vivo.** Añadir la sección con la barra de 3 stats estáticas, la columna "Últimas puntuaciones" (`recentScores.map`) y la columna "Top jugadores — hoy" (`topPlayersToday.map`, primer puesto resaltado con borde `tertiary`), más el enlace "Ver salón" → `/salon-de-la-fama`.

9. **Home — precios.** Añadir la sección con la tarjeta "Jugador Vault" ($0), su lista de ventajas con checks, el badge "Free Play" y el CTA "Empezar gratis" → `/acceso`, junto al bloque de 3 preguntas frecuentes. Contenido literal del mockup.

10. **Cierre.** `npm run lint` y `npm run build` verdes. Recorrer manualmente `/`, `/juegos`, `/acceso`, `/juegos/pac-man`, `/jugar/pac-man`, `/salon-de-la-fama` y un slug inexistente. Si `next dev` regeneró `AGENTS.md`, commitearlo junto con el trabajo.

---

## Acceptance criteria

- [ ] `npm run build` termina sin errores ni fallos de tipos.
- [ ] `npm run lint` pasa sin errores.
- [ ] `/` renderiza la home con las cinco secciones en orden: hero, "¿Por qué Arcade Vault?", "Juegos disponibles ahora", "Actividad en vivo", "Precios".
- [ ] `/` ya **no** muestra el listado de juegos (grid de `GameCard` + barra de búsqueda).
- [ ] `/juegos` renderiza el listado que antes estaba en `/`: fondo shader, hero "Inserta una moneda para jugar", barra de búsqueda visual y grid de 6 `GameCard`.
- [ ] `/juegos/pac-man`, `/juegos/arkanoid`, `/juegos/tetris`, `/juegos/snake`, `/juegos/space-invaders`, `/juegos/asteroids` y sus equivalentes bajo `/jugar/...` siguen renderizando sin error.
- [ ] `/juegos/foo` (slug inexistente) sigue devolviendo la 404 de Next.
- [ ] El nav (desktop y móvil) tiene un enlace "Inicio" → `/` y un enlace "Biblioteca" → `/juegos`.
- [ ] En `/` el item de nav activo es "Inicio"; en `/juegos` es "Biblioteca"; en `/salon-de-la-fama` es "Salón de la Fama".
- [ ] El logo del header y del footer es el rombo de neón + palabra "ARCADE VAULT" (`components/vault-mark.tsx`), y aparece así en las cinco pantallas con header.
- [ ] El logo del header sigue enlazando a `/`.
- [ ] En `/juegos/pac-man` el botón "Volver al vault" del header lleva a `/juegos` (no a `/`).
- [ ] En la sección "Juegos disponibles ahora", las 6 miniaturas provienen de `lib/games.ts` y cada una enlaza a `/juegos/[slug]`.
- [ ] El botón "Ver todos los juegos" de la home lleva a `/juegos`.
- [ ] Los CTAs "Explorar juegos" y "Ver todos los juegos" apuntan a `/juegos`; "Crear cuenta" y "Empezar gratis" apuntan a `/acceso`; "Ver salón" apunta a `/salon-de-la-fama`.
- [ ] La sección "Actividad en vivo" muestra 5 filas de últimas puntuaciones y 4 de top jugadores, todas leídas de `lib/activity.ts`.
- [ ] Las imágenes remotas de `lh3.googleusercontent.com` cargan vía `next/image` (sin cambios en `next.config.ts`).
- [ ] No se ha añadido la fuente "Press Start 2P" al proyecto; la home usa Anybody + Courier Prime.
- [ ] `app/globals.css` no tiene reglas nuevas respecto al estado actual; todo estilo adicional son utilidades Tailwind en el JSX.
- [ ] Todo el texto de interfaz está en español con acentos correctos y los titulares en mayúsculas.
- [ ] No existe código de autenticación, persistencia ni motor de juego en el repositorio.

---

## Decisions

- **Sí:** home en `/` y listado en `/juegos`. URL semántica para el catálogo y raíz libre para la portada.
- **No:** dejar el listado en `/` y poner la home en `/inicio`. La raíz debe ser la portada del producto.
- **Sí:** portar las cinco secciones del mockup `resources/home` completas, incluida "Precios". El usuario lo pidió explícitamente.
- **Sí:** `lib/activity.ts` nuevo con `recentScores` y `topPlayersToday` tipados, en la línea de `games.ts` y `leaderboards.ts`.
- **No:** derivar la actividad de `leaderboards.ts` ni ponerla inline. Un archivo mock dedicado es más realista y reutilizable.
- **Sí:** miniatura propia (`game-thumb.tsx`) para el showcase, con datos reales y `next/image`.
- **No:** reusar `GameCard` (demasiado alto para el showcase) ni copiar los placeholders CSS del mockup (ya hay imágenes reales).
- **Sí:** mantener Anybody + Courier Prime, ignorando "Press Start 2P" del mockup. Coherencia con SPEC 01.
- **Sí:** nuevo logo compuesto (rombo + palabra) en `components/vault-mark.tsx`, aplicado a `SiteHeader` y `SiteFooter`. El usuario prefiere el logo del mockup de home al de solo texto actual.
- **No:** aplicar el logo nuevo solo en la home. Es un componente compartido; se cambia en los dos sitios para no tener dos marcas.
- **Sí:** añadir enlace "Inicio" al nav además de "Biblioteca".
- **Sí:** "Volver al vault" (variante `back`) apunta a `/juegos`. "El vault" es el catálogo, no la portada.
- **No:** añadir el indicador "CRÉDITOS — 03" ni un botón "Iniciar Sesión" separado. Ruido; ya existe "Acceder". Se deja para otra spec si hace falta.
- **No:** añadir la página "Acerca de" del nav del mockup. Fuera de alcance.
- **Sí:** anotar aquí los criterios de la SPEC 01 que este cambio supera, sin editar aquel archivo.
- **No:** reescribir la SPEC 01. Su estado `Implementado` se respeta; esta spec lo actualiza por encima.

### Criterios de la SPEC 01 superados por esta spec

- "Renderizan sin error: `/` ..." y "En `/`, las 6 cards provienen de `lib/games.ts` ..." → ese contenido pasa a `/juegos`. `/` es ahora la home.
- `SiteHeader active="biblioteca"` → el valor pasa a `"juegos"` y la home usa `active="inicio"`.
- "En `/juegos/pac-man` el header usa la variante back (logo + botón Volver al vault)" → sigue vigente, pero el botón lleva a `/juegos` en vez de a `/`.
- El logo "de solo texto" implícito en SPEC 01 se sustituye por `components/vault-mark.tsx`.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Enlaces internos a `/` que en realidad querían el listado quedan apuntando a la home tras el movimiento. | El paso 4 recorre header, mobile-nav y variante `back`; los criterios de aceptación fijan cada destino (`/juegos` vs `/`). |
| Cambiar el union de `active` rompe el build por un valor viejo (`"biblioteca"`) sin actualizar. | El paso 4 actualiza header, mobile-nav y las páginas que pasan el prop en el mismo commit; `npm run build` valida los tipos. |
| El logo nuevo en el componente compartido descuadra el layout del header/footer en las otras cuatro pantallas. | Pasos 2 y 10 exigen recorrer las cinco pantallas; `vault-mark` respeta la altura fija `h-20` del header. |
| Las URLs de `lh3.googleusercontent.com` del showcase pueden caducar (mismo riesgo que SPEC 01). | `alt` descriptivo y contenedor con fondo sólido; migración a `/public` en otra spec si ocurre. |
| `next dev` reescribe `AGENTS.md` y deja el árbol sucio. | Commitear el `AGENTS.md` regenerado junto con el trabajo (paso 10). |

---

## Lo que **no** entra en esta spec

- Autenticación, registro y "jugar como invitado" funcionales.
- Persistencia; la "actividad en vivo" es mock estático.
- Búsqueda y filtrado funcionales en `/juegos`.
- Cobros reales tras la sección de precios.
- Indicador de créditos, botón "Iniciar Sesión" extra y página "Acerca de" del nav del mockup.
- Edición del archivo de la SPEC 01.
- Tests automatizados, modo claro e i18n adicional.

Cada uno de esos, si llega, va en su propia spec.
