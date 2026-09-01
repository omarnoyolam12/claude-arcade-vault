# SPEC 06 — Catálogo y leaderboard en Supabase (tablas `games` y `scores`, solo lectura)

> **Status:** Implementado
> **Depends on:** SPEC 04
> **Date:** 2026-09-01
> **Objective:** Crear las tablas `public.games` y `public.scores` en Supabase, sembrarlas con los datos que hoy viven en `lib/games.ts` y `lib/leaderboards.ts`, y reescribir esos módulos y las páginas que los consumen para que lean de Supabase (solo lectura, sin escritura ni auth).

---

## Por qué existe esta spec

SPEC 01 y 02 dejaron el catálogo (`lib/games.ts`) y las tablas de puntuaciones (`lib/leaderboards.ts`) como arrays mock en TypeScript. SPEC 04 cableó Supabase (clientes de navegador y servidor, `proxy.ts` de refresco de sesión, variables de entorno) **sin crear ninguna tabla**, y anotó explícitamente como "para futuras specs": _migrar `lib/games.ts` y `lib/leaderboards.ts` a Supabase_ y _generar `lib/supabase/database.types.ts` + script `gen:types`_.

Esta spec hace exactamente eso. Es la primera que crea esquema en Supabase. Sigue **sin auth**: no hay sesión de usuario, `/acceso` sigue siendo maqueta, y las puntuaciones se identifican por un `player` de texto libre (como el mock). Tampoco hay **escritura**: las dos tablas se rellenan por migración/seed SQL y toda la UI solo hace `SELECT`. "Guardar puntuación" en `/jugar/asteroids` sigue siendo un botón visual.

**Regla de estilos (heredada de SPEC 01–05):** `app/globals.css` no se toca. Todo estilo adicional se resuelve con utilidades de Tailwind en el JSX.

---

## Scope

**In:**

- **Migraciones SQL en Supabase**, aplicadas con el MCP de Supabase (`apply_migration`) **y** versionadas como archivos en `supabase/migrations/` con el mismo contenido aplicado. Split sugerido:
  1. `supabase/migrations/0001_create_games.sql` — crea `public.games`, activa RLS, política `SELECT` pública, y siembra las 6 filas actuales de `lib/games.ts`.
  2. `supabase/migrations/0002_create_scores.sql` — crea `public.scores` (con FK a `games.slug`), activa RLS, política `SELECT` pública, y siembra las filas de `lib/leaderboards.ts` (ver Data model para las conversiones).
- `lib/supabase/anon.ts` — **nuevo**. Cliente Supabase **sin cookies** (`createClient` de `@supabase/supabase-js`) con `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, tipado `createClient<Database>(...)`. Para lecturas públicas no autenticadas (catálogo y leaderboard). Es cookie-less a propósito: se puede llamar desde `generateStaticParams` y desde Server Components sin forzar render dinámico.
- `lib/supabase/database.types.ts` — **nuevo**. Tipos generados con la CLI/MCP de Supabase para el esquema `public`. Se commitea.
- `lib/supabase/client.ts` y `lib/supabase/server.ts` — **modificados**. Se tipan con el genérico: `createBrowserClient<Database>(...)` y `createServerClient<Database>(...)`. Ningún cambio de comportamiento.
- `package.json` — **modificado**. Nuevo script `"gen:types": "supabase gen types typescript --linked > lib/supabase/database.types.ts"`.
- `lib/games.ts` — **reescrito**. Se elimina el array `games`. Se conserva y exporta la interfaz `Game` (ahora reflejo de una fila de `public.games`, camelCase). Las funciones pasan a `async` y consultan `lib/supabase/anon.ts`:
  - `getGames(): Promise<Game[]>` — `select *` ordenado por `sort_order`.
  - `getGame(slug: string): Promise<Game | undefined>`.
  - `getGameSlugs(): Promise<string[]>`.
  - Si la consulta falla, la función **lanza** (no hay fallback a datos mock).
- `lib/leaderboards.ts` — **reescrito**. Se elimina el record `leaderboards`. La interfaz `ScoreEntry` cambia de forma (ver Data model): `score` pasa a `number`, se añade `achievedAt: string | null`, `rank` se calcula, `isCurrentUser?: boolean` se conserva en el tipo pero ninguna fila lo trae a `true` en esta spec. Funciones `async` contra `lib/supabase/anon.ts`:
  - `getLeaderboard(slug: string): Promise<ScoreEntry[]>` — filas del juego, `ORDER BY score DESC, achieved_at ASC NULLS LAST`, `rank` = posición 1..n.
  - `getAllLeaderboards(): Promise<Record<string, ScoreEntry[]>>` — una consulta, agrupada por `game_slug` en JS, `rank` por grupo.
- `components/leaderboard-table.tsx` — **modificado**. Se adapta a la nueva `ScoreEntry`. Se añaden dos helpers locales:
  - `formatScore(n: number): string` — separador de miles estilo `en-US` (`3333360` → `"3,333,360"`).
  - `formatDate(d: string | null): string` — `"HOY"` si `d` es `null` o igual a la fecha de hoy; si no, el string `YYYY-MM-DD`.
  - `ordinal()`, `rankColor()`, el estilo de fila `isCurrentUser` y ambas variantes (`sidebar`, `full`) se mantienen.
- `components/hall-of-fame-tabs.tsx` — **modificado**. Deja de importar `lib/games` y `lib/leaderboards`. Recibe por props `games: { slug: string; title: string }[]` y `leaderboards: Record<string, ScoreEntry[]>`. Sigue `"use client"` con `useState` para la pestaña activa.
- `app/salon-de-la-fama/page.tsx` — **modificado**. Pasa a `async`. Llama a `getAllLeaderboards()` y `getGames()` (solo `slug` + `title`), y pasa ambos a `<HallOfFameTabs>`.
- `app/juegos/page.tsx` — **modificado**. Pasa a `async`. `const games = await getGames()`.
- `app/page.tsx` (home) — **modificado**. Pasa a `async`. Sustituye `import { games }` por `const games = await getGames()`. `lib/activity.ts` (`recentScores`, `topPlayersToday`) **no se toca**: sigue mock.
- `app/juegos/[slug]/page.tsx` — **modificado**. `generateStaticParams` pasa a `async` (`await getGameSlugs()`). `getGame(slug)` y `getLeaderboard(slug)` con `await`. `<LeaderboardTable variant="sidebar">` recibe la nueva forma de entradas.
- `app/jugar/[slug]/page.tsx` — **modificado**. `generateStaticParams` pasa a `async`. `getGame(slug)` con `await`. El resto de SPEC 05 (rama `asteroids`, HUD, `GameOverModal`) no cambia.
- `app/debug/supabase/page.tsx` — **eliminado**. SPEC 04 lo marcó como temporal, a borrar por "la spec que consuma esta infraestructura". Es esta.
- `.env.template` — **modificado**. Se documenta `SUPABASE_PROJECT_REF` (solo lo usa el script `gen:types` vía `supabase link`; no lo lee la app en runtime).
- `AGENTS.md` — si `next dev` lo regenera, se commitea junto con el trabajo.

**Out of scope (para futuras specs):**

- Autenticación real: `/acceso`, sesión en el header, `scores.user_id`, FK a `auth.users`. Sigue todo diferido.
- Escritura de puntuaciones: "Guardar puntuación" funcional, Server Action de `INSERT`, políticas RLS de escritura. Esta spec solo crea políticas de `SELECT`.
- La fila resaltada "TU MEJOR MARCA" / `isCurrentUser: true`: el campo queda en el tipo y el estilo en `LeaderboardTable`, pero ninguna fila lo activa hasta que haya auth. Esa fila del mock de Pac-Man **no se siembra**.
- Ranking global agregado (todos los juegos juntos) en la home. La home sigue con `lib/activity.ts` mock.
- Migrar `lib/activity.ts` ("Actividad en vivo") a Supabase.
- Derivar `games.best_score` de `scores` (se mantiene como columna propia sembrada).
- Realtime, Storage, Edge Functions, panel de admin para editar juegos.
- Supabase CLI local (`supabase start`), `config.toml`, entorno Docker. Las migraciones se aplican contra el proyecto remoto vía MCP.
- Cliente admin con `SUPABASE_SECRET_KEY`.
- Padding con ceros a la izquierda por juego en las puntuaciones (`"009,990"`): se acepta que pasen a mostrarse como enteros con separador de miles sin más.
- Tests automatizados (no hay framework configurado).
- Editar los archivos de las SPEC 01–05 salvo lo listado arriba.

---

## Data model

### Tabla `public.games`

```sql
create table public.games (
  slug              text primary key,
  title             text not null,
  category_label    text not null,
  tags              text[] not null default '{}',
  short_description text not null,
  long_description  text not null,
  year              smallint not null,
  best_score        text not null,   -- ya formateado: "333,330". Columna propia, NO derivada de scores.
  image             text not null,
  image_alt         text not null,
  sort_order        smallint not null
);
```

- `sort_order` preserva el orden actual del array: `arkanoid` (1), `tetris` (2), `snake` (3), `pac-man` (4), `space-invaders` (5), `asteroids` (6).
- Seed: las 6 filas de `lib/games.ts` verbatim (incluidas las URLs largas de `lh3.googleusercontent.com`).

### Tabla `public.scores`

```sql
create table public.scores (
  id           uuid primary key default gen_random_uuid(),
  game_slug    text not null references public.games(slug),
  player       text not null,
  score        bigint not null,
  achieved_at  date,               -- null = "HOY" en el mock
  created_at   timestamptz not null default now()
);
```

- Seed: las filas de `lib/leaderboards.ts`, con estas conversiones:
  - `score: "3,333,360"` (string) → `3333360` (bigint, se quitan las comas).
  - `date: "1984-10-26"` → `achieved_at = '1984-10-26'`.
  - `date: "HOY"` → `achieved_at = null`.
  - `rank` **no se siembra**: es posición calculada.
  - La fila `{ rank: 42, player: "TU MEJOR MARCA", isCurrentUser: true }` de Pac-Man **se omite**.
- Sin columna `user_id` ni `is_current_user`: llegan con la spec de auth.

### RLS

Ambas tablas: `alter table ... enable row level security;` más una única política por tabla:

```sql
create policy "public_read_games" on public.games
  for select to anon, authenticated using (true);
```

Sin políticas de `insert` / `update` / `delete`: la escritura queda bloqueada para `anon` y `authenticated`. El seed corre dentro de la migración (rol de servicio), sin política.

### Tipo `Game` (en `lib/games.ts`)

```ts
export interface Game {
  slug: string;
  title: string;
  categoryLabel: string; // ← category_label
  tags: string[];
  shortDescription: string; // ← short_description
  longDescription: string; // ← long_description
  year: number;
  bestScore: string; // ← best_score
  image: string;
  imageAlt: string; // ← image_alt
}
```

Mapeo snake_case → camelCase en `lib/games.ts`; `sort_order` no se expone (solo se usa en el `ORDER BY`).

### Tipo `ScoreEntry` (en `lib/leaderboards.ts`)

```ts
export interface ScoreEntry {
  rank: number; // calculado: posición 1..n dentro del juego
  player: string;
  score: number; // entero; se formatea en LeaderboardTable
  achievedAt: string | null; // "YYYY-MM-DD" | null (null = "HOY")
  isCurrentUser?: boolean; // se conserva en el tipo; sin uso hasta auth
}
```

### Convenciones

- Orden del leaderboard: `score DESC`, desempate `achieved_at ASC NULLS LAST`. `rank` = índice + 1 tras ese orden.
- Formateo (`formatScore`, `formatDate`) vive **solo** en `components/leaderboard-table.tsx`. La BD guarda enteros y fechas.
- Todas las lecturas de catálogo y leaderboard usan `lib/supabase/anon.ts` (sin cookies). El cliente con cookies (`lib/supabase/server.ts`) se reserva para cuando haya datos por usuario.
- `lib/activity.ts` no cambia: sigue siendo mock.

---

## Implementation plan

1. **Tabla `games` + seed.** Escribir `supabase/migrations/0001_create_games.sql` (tabla, `enable row level security`, política `public_read_games`, `insert` de las 6 filas). Aplicar con el MCP de Supabase. Verificar con `select slug, sort_order from public.games order by sort_order` → 6 filas en el orden correcto. `npm run build` sigue verde (nada consulta la tabla aún).

2. **Tabla `scores` + seed.** Escribir `supabase/migrations/0002_create_scores.sql` (tabla con FK a `games.slug`, RLS, política de lectura, `insert` de las filas convertidas; sin la fila "TU MEJOR MARCA"). Aplicar con el MCP. Verificar `select game_slug, count(*) from public.scores group by game_slug` → 5 filas por juego (6 en `pac-man` menos la omitida = 5). `npm run build` verde.

3. **Tipos generados.** Ejecutar la generación de tipos del esquema `public` (CLI/MCP de Supabase) a `lib/supabase/database.types.ts`. Añadir el script `gen:types` a `package.json` y documentar `SUPABASE_PROJECT_REF` en `.env.template`. `npm run build` verde.

4. **Cliente anónimo tipado.** Crear `lib/supabase/anon.ts` (`createClient<Database>` de `@supabase/supabase-js`, sin cookies). Tipar `lib/supabase/client.ts` y `lib/supabase/server.ts` con `<Database>`. `npm run build` verde; ninguna pantalla cambia todavía.

5. **`lib/games.ts` contra Supabase.** Reescribir: quitar el array, dejar `Game`, y `getGames` / `getGame` / `getGameSlugs` `async` usando `lib/supabase/anon.ts` con mapeo a camelCase; lanzar en error. Actualizar los consumidores para que compilen: `app/page.tsx`, `app/juegos/page.tsx`, `app/juegos/[slug]/page.tsx` y `app/jugar/[slug]/page.tsx` pasan a `async` / `await` (incluidos los `generateStaticParams`). `npm run build` verde. Recorrer `/`, `/juegos`, `/juegos/asteroids`, `/jugar/asteroids`, `/jugar/pac-man`: el catálogo se ve igual que antes, ahora servido desde Supabase.

6. **`lib/leaderboards.ts` contra Supabase.** Reescribir con la nueva `ScoreEntry`, `getLeaderboard` y `getAllLeaderboards` `async` con cálculo de `rank`. `npm run build` (fallará en `hall-of-fame-tabs.tsx` y `leaderboard-table.tsx` hasta el paso 7 — se hacen juntos en el mismo commit).

7. **Componentes de tabla.** Adaptar `components/leaderboard-table.tsx` (helpers `formatScore` / `formatDate`, nueva forma de entrada, ambas variantes). Convertir `components/hall-of-fame-tabs.tsx` a componente de props (`games`, `leaderboards`). Actualizar `app/salon-de-la-fama/page.tsx` a `async` con `getAllLeaderboards()` + `getGames()`. Ajustar `app/juegos/[slug]/page.tsx` para pasar la nueva forma a `variant="sidebar"`. `npm run build` verde. Recorrer `/salon-de-la-fama` (cambiar de pestaña entre los 6 juegos) y `/juegos/tetris` (tabla lateral): los datos coinciden con los del mock anterior salvo el formateo aceptado.

8. **Borrar la ruta de debug.** Eliminar `app/debug/supabase/page.tsx` (y la carpeta `app/debug/` si queda vacía). Confirmar que `/debug/supabase` da 404.

9. **Cierre.** `npm run lint` y `npm run build` verdes. Recorrer `/`, `/juegos`, `/juegos/pac-man`, `/juegos/asteroids`, `/salon-de-la-fama`, `/jugar/asteroids` (partida completa hasta GAME OVER, el modal sigue funcionando), `/jugar/snake` (maqueta intacta). Si `next dev` regeneró `AGENTS.md`, commitearlo junto con el trabajo. Commitear los `.sql` de `supabase/migrations/`.

---

## Acceptance criteria

- [ ] `npm run build` termina sin errores ni fallos de tipos.
- [ ] `npm run lint` pasa sin errores.
- [ ] Existen `public.games` y `public.scores` en Supabase, ambas con RLS activado y una política `SELECT` para `anon` y `authenticated`, y sin políticas de `INSERT` / `UPDATE` / `DELETE`.
- [ ] `public.games` tiene 6 filas; `select slug from public.games order by sort_order` devuelve `arkanoid, tetris, snake, pac-man, space-invaders, asteroids`.
- [ ] `public.scores` tiene 5 filas por cada uno de los 6 juegos (30 en total); ninguna fila tiene `player = 'TU MEJOR MARCA'`.
- [ ] Las filas con `date: "HOY"` en el mock se sembraron con `achieved_at = null`; el resto con la fecha ISO correspondiente. Ningún `score` guarda comas: son `bigint`.
- [ ] `supabase/migrations/` contiene los archivos `.sql` aplicados (crear `games` + seed, crear `scores` + seed), versionados en el repo.
- [ ] `lib/supabase/database.types.ts` existe, está commiteado y exporta un tipo `Database` que incluye `public.games` y `public.scores`.
- [ ] `package.json` tiene el script `gen:types`.
- [ ] `lib/supabase/client.ts` y `lib/supabase/server.ts` instancian sus clientes con el genérico `<Database>`.
- [ ] Existe `lib/supabase/anon.ts` con un cliente sin cookies basado en `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; `lib/games.ts` y `lib/leaderboards.ts` importan de ahí y de ningún otro cliente.
- [ ] `lib/games.ts` no contiene ningún array de juegos literal; `getGames` / `getGame` / `getGameSlugs` son `async` y devuelven datos de Supabase.
- [ ] `lib/leaderboards.ts` no contiene ningún record de puntuaciones literal; `getLeaderboard` y `getAllLeaderboards` son `async`, y `ScoreEntry.score` es `number` con `achievedAt: string | null`.
- [ ] `/juegos` muestra las 6 cards igual que antes de la spec (título, año, categoría, mejor marca, imagen).
- [ ] `/juegos/[slug]` (detalle) muestra la descripción larga y la tabla lateral de puntuaciones del juego, con las mismas entradas que el mock anterior (salvo formateo).
- [ ] `/salon-de-la-fama` muestra las pestañas de los 6 juegos y, al cambiar de pestaña, la tabla `full` con las puntuaciones de ese juego ordenadas de mayor a menor; el `rank` mostrado es `1ST, 2ND, 3RD, 4TH, 5TH`.
- [ ] Las puntuaciones se muestran con separador de miles (`3,333,360`); una entrada con `achieved_at = null` muestra `HOY` en la columna de fecha.
- [ ] La home (`/`) renderiza igual que antes; `lib/activity.ts` no se ha modificado.
- [ ] `/jugar/asteroids` sigue siendo jugable (SPEC 05): se juega con teclado, el HUD se sincroniza, y al perder las 3 vidas el modal "Fin del juego" se abre con la puntuación real.
- [ ] `/jugar/snake` (y los otros juegos no jugables) siguen siendo maqueta, con el `GameOverModal` no controlado.
- [ ] `/debug/supabase` devuelve 404; no queda ningún archivo bajo `app/debug/`.
- [ ] Con `NEXT_PUBLIC_SUPABASE_URL` ausente o inválida, `/juegos` y `/salon-de-la-fama` fallan de forma visible (error de la ruta), no con datos mock: no hay fallback.
- [ ] `app/globals.css` no tiene reglas nuevas respecto al estado actual.
- [ ] Todo el texto visible nuevo está en español con acentos correctos.
- [ ] `SUPABASE_SECRET_KEY` sigue sin importarse en ningún archivo de la app.

---

## Decisions

- **Sí:** una sola spec para `games` y `scores`. Están acopladas (`scores.game_slug` → `games.slug`), comparten el patrón de migración/seed/RLS y los mismos consumidores. Separarlas duplicaría el andamiaje sin reducir el riesgo.
- **Sí:** solo lectura en esta spec. Las tablas se siembran por SQL y la UI solo hace `SELECT`. La escritura real necesita identidad de jugador, que necesita auth, que es su propia spec.
- **No:** meter auth aquí. Ampliaría el alcance a `/acceso`, sesión en el header y FK a `auth.users`. Cada cosa, su spec.
- **Sí:** `player` como texto libre en `scores`, sin `user_id`. Es lo que hay hoy en el mock y no bloquea nada; la columna `user_id` se añade en la migración de la spec de auth.
- **No:** fallback a los arrays mock si Supabase no responde. Se eligió propagar el error: dos fuentes de verdad divergen con el tiempo y esconden fallos de configuración. La degradación elegante ya se probó en SPEC 04 para la infraestructura; los datos de producto van directos.
- **Sí:** borrar los arrays literales de `lib/games.ts` y `lib/leaderboards.ts`. Si no hay fallback, mantenerlos es código muerto que confunde.
- **Sí:** `score bigint` + `achieved_at date`, con formateo y `rank` calculados en la capa de presentación. Es lo que permite `ORDER BY` real y una única fuente de verdad para el orden.
- **No:** guardar `score` y `date` como texto preformateado calcado del mock. Haría imposible ordenar en la BD y perpetuaría el `rank` fijo (p. ej. el 42 de Pac-Man) que solo existía para la fila "tu marca".
- **Sí:** `lib/supabase/anon.ts`, un cliente sin cookies para lecturas públicas. Catálogo y leaderboard no dependen de usuario; un cliente cookie-less se puede usar en `generateStaticParams` y no fuerza render dinámico de las páginas.
- **No:** usar `lib/supabase/server.ts` (con `cookies()`) para el catálogo. `cookies()` en `generateStaticParams` no tiene request y rompe el build; además opta a todas las páginas a dinámicas sin necesidad.
- **No:** consultar Supabase desde el navegador en `HallOfFameTabs` con el cliente `client.ts`. Añade estados de carga y manejo de error en cliente para datos que el servidor ya puede traer de una vez; se pasa por props.
- **Sí:** `getAllLeaderboards()` en una sola consulta agrupada en JS. 30 filas; un `select` y un `groupBy` en memoria es más simple que 6 consultas o una vista.
- **Sí:** `games.best_score` como columna propia sembrada del mock. Derivarla de `MAX(scores.score)` acoplaría el catálogo a la tabla de puntuaciones y forzaría un join; además hoy el mock ya tiene valores que no coinciden con el top del leaderboard y nadie lo nota.
- **Sí:** conservar `isCurrentUser?: boolean` en `ScoreEntry` y el estilo de fila resaltada en `LeaderboardTable`, aunque ninguna fila lo active. Deja el camino hecho para la spec de auth sin volver a tocar el componente.
- **No:** sembrar la fila "TU MEJOR MARCA". Sin "usuario actual" es una entrada huérfana con nombre falso y `rank` fuera de secuencia.
- **No:** padding con ceros a la izquierda por juego (`"009,990"`, `"092,310"`). Requeriría un ancho de dígitos por juego; se acepta que esas puntuaciones pasen a mostrarse como enteros con separador de miles.
- **Sí:** generar `lib/supabase/database.types.ts` y añadir `gen:types` en esta spec. SPEC 04 lo dejó explícitamente para "la spec que cree la primera tabla".
- **Sí:** versionar los `.sql` en `supabase/migrations/`. SPEC 04 evitó la carpeta mientras no había esquema; ahora que lo hay, tener el SQL en el repo es reproducibilidad básica.
- **Sí:** borrar `app/debug/supabase/page.tsx`. SPEC 04 lo marcó como temporal, a eliminar por la spec que consumiera la infraestructura. Es esta.
- **No:** ranking global agregado en la home. La home sigue con `lib/activity.ts` mock; el ranking global es otra spec si se pide.

---

## Risks

| Riesgo                                                                                                                                                              | Mitigación                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generateStaticParams` consulta Supabase en build; sin red o sin env el build entero falla.                                                                         | Es la consecuencia aceptada de "sin fallback". `getGameSlugs()` usa el cliente cookie-less; el entorno de build/deploy debe tener `NEXT_PUBLIC_SUPABASE_*`, igual que ya exige SPEC 04 para runtime. |
| Reescribir `lib/games.ts` a `async` obliga a tocar `generateStaticParams` y varias páginas a la vez; un `await` olvidado compila pero renderiza `[object Promise]`. | El plan hace el cambio y todos sus consumidores en el mismo paso/commit (paso 5), con recorrido manual de las rutas afectadas. TypeScript marca la mayoría de los `await` faltantes.                 |
| La nueva forma de `ScoreEntry` rompe `LeaderboardTable` en su variante `sidebar` (usada en `/juegos/[slug]`), que es fácil de no probar.                            | Criterio de aceptación explícito para `/juegos/[slug]` con tabla lateral; el paso 7 la nombra.                                                                                                       |
| El seed convierte mal un `score` (deja una coma, se come un dígito) y el leaderboard queda desordenado.                                                             | El seed se escribe con los enteros ya sin comas en el `.sql`; el criterio de aceptación pide orden descendente visible y `rank` 1ST..5TH.                                                            |
| RLS mal puesta: o bloquea también el `SELECT` anónimo (leaderboard vacío) o deja `INSERT` abierto a cualquiera.                                                     | Política única `for select to anon, authenticated using (true)`; sin políticas de escritura. Criterio de aceptación verifica ambas caras.                                                            |
| `lib/supabase/database.types.ts` se desincroniza del esquema tras una migración futura.                                                                             | El script `gen:types` queda documentado para regenerarlo; esta spec lo deja al día.                                                                                                                  |
| `next dev` reescribe `AGENTS.md` y deja el árbol sucio.                                                                                                             | Commitear el `AGENTS.md` regenerado junto con el trabajo (paso 9).                                                                                                                                   |

---

## Lo que **no** entra en esta spec

- Autenticación: `/acceso` real, sesión en el header, `scores.user_id`, FK a `auth.users`.
- Escritura de puntuaciones: "Guardar puntuación" funcional, Server Action de `INSERT`, políticas RLS de escritura.
- Activar `isCurrentUser` en alguna fila / la fila "TU MEJOR MARCA".
- Ranking global agregado en la home; migrar `lib/activity.ts` a Supabase.
- Derivar `games.best_score` de `scores`.
- Padding con ceros a la izquierda por juego en las puntuaciones.
- Realtime, Storage, Edge Functions, panel de administración.
- Supabase CLI local / entorno Docker; cliente admin con `SUPABASE_SECRET_KEY`.
- Tests automatizados; edición de las SPEC 01–05 fuera de lo listado en Scope.

Cada uno de esos, si llega, va en su propia spec.
