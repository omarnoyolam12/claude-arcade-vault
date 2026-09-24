# SPEC 14 — Guardado de puntuaciones solo para usuarios registrados

> **Status:** Implementado
> **Depends on:** SPEC 06, SPEC 07, SPEC 08, SPEC 09, SPEC 12
> **Date:** 2026-09-24
> **Objective:** Vincular cada puntuación guardada al usuario autenticado que la jugó (`scores.user_id`), de modo que solo quien tiene sesión iniciada pueda usar "Guardar puntuación"; quien no la tiene sigue pudiendo jugar los 5 juegos reales pero ve el botón deshabilitado con una invitación a iniciar sesión.

---

## Por qué existe esta spec

SPEC 12 dejó explícitamente fuera de su alcance "vincular las puntuaciones guardadas (`public.scores`, Salón de la Fama) al usuario autenticado, reemplazando el nombre fijo `G4M3R_X`". Hoy las 5 Server Actions `guardarPuntuacion*` (`app/jugar/[slug]/actions.ts`) insertan en `public.scores` usando el cliente sin cookies `lib/supabase/anon.ts` y la política RLS `anon_insert_scores` (SPEC 07), sin mirar si hay sesión. Esta spec cierra ese hueco: solo un usuario con sesión iniciada puede guardar su puntuación, y el nombre que queda en el Salón de la Fama es el mismo `getDisplayName` (SPEC 12) que ya se usa en el header.

De paso, esta spec detecta y corrige que `components/asteroids-player.tsx` es el único de los 5 reproductores reales que **no** tiene ninguna Server Action de guardado cableada (su `GameOverModal` no recibe `onSave`): se le añade `guardarPuntuacionAsteroids`, a la par de los otros 4.

---

## Scope

**In:**

- **Migración nueva** (`supabase/migrations/0006_scores_user_id_authenticated_insert.sql`):
  - `alter table public.scores add column user_id uuid references auth.users(id) on delete set null;` — nullable (las filas sembradas por SPEC 06 y cualquier fila histórica no tienen usuario).
  - `drop policy "anon_insert_scores" on public.scores;` — ya no hay ningún camino desde la UI que inserte como `anon`.
  - `create policy "authenticated_insert_scores" on public.scores for insert to authenticated with check (achieved_at is null and score > 0 and player <> '' and user_id = auth.uid());` — mismas cotas que la política que reemplaza, más la exigencia de que el `user_id` insertado coincida con el usuario autenticado real (evita que alguien inserte puntuaciones a nombre de otro `user_id`).
  - Las políticas de lectura (`public_read_games`, `public_read_scores`) no cambian.
- `lib/supabase/database.types.ts` — regenerado con `npm run gen:types` tras aplicar la migración.
- `app/jugar/[slug]/actions.ts` — las 5 Server Actions (`guardarPuntuacionTetris`, `guardarPuntuacionArkanoid`, `guardarPuntuacionSnake`, `guardarPuntuacionFrogger` y la nueva `guardarPuntuacionAsteroids`):
  - Pasan del cliente `lib/supabase/anon.ts` al cliente con cookies `lib/supabase/server.ts` (único que autentica el insert como `authenticated` ante RLS).
  - Leen `auth.getUser()`; si no hay usuario, devuelven `{ ok: false, error: "Debes iniciar sesión para guardar tu puntuación." }` sin llegar a intentar el insert (defensa en profundidad: la UI ya deshabilita el botón sin sesión, ver más abajo).
  - Calculan `player` con `getDisplayName(user)` (`lib/auth.ts`, SPEC 12) en vez del `PLAYER_LABEL` fijo ("G4M3R_X") que hoy tiene cada función.
  - Insertan `user_id: user.id` además de los campos existentes (`game_slug`, `player`, `score`, `achieved_at: null`).
- `components/game-over-modal.tsx` — nueva prop `canSave?: boolean`. Cuando `onSave` está presente y `canSave === false`, el botón "Guardar puntuación" aparece deshabilitado y debajo se muestra "Inicia sesión para guardar tu puntuación" con un enlace "Iniciar sesión" a `/acceso`. Cuando `onSave` está presente y `canSave` es `true` (o se omite), el comportamiento es el actual. Cuando `onSave` no está presente (las 5 rutas mock), `canSave` no tiene efecto — comportamiento actual sin cambios.
- `app/jugar/[slug]/page.tsx` — lee la sesión con `createClient()` de `lib/supabase/server.ts` (mismo patrón que `site-header.tsx`), calcula `isAuthenticated` y `displayName` (vía `getDisplayName`, solo si hay usuario), y los pasa como props a los 5 `*Player`.
- Los 5 componentes `*-player.tsx` (`asteroids-player.tsx`, `tetris-player.tsx`, `arkanoid-player.tsx`, `snake-player.tsx`, `frogger-player.tsx`):
  - Reciben `isAuthenticated: boolean` y `displayName?: string` como props nuevas.
  - Pasan `canSave={isAuthenticated}` a `GameOverModal`.
  - El `player` mostrado en el modal (hoy el `PLAYER_LABEL` fijo de cada archivo) pasa a ser `displayName` cuando `isAuthenticated` es `true`; si no, se mantiene el `PLAYER_LABEL` actual de placeholder para invitados.
  - `asteroids-player.tsx` además importa y cablea `guardarPuntuacionAsteroids` en `onSave`, replicando el patrón de los otros 4 (hoy no tiene `onSave` en absoluto).
- `lib/leaderboards.ts` — `getLeaderboard(slug, currentUserId?: string | null)` y `getAllLeaderboards(currentUserId?: string | null)`: seleccionan también `user_id` y marcan `isCurrentUser: true` en la fila cuyo `user_id` coincide con `currentUserId` (el campo ya existe en `ScoreEntry` desde SPEC 06, sin uso hasta ahora).
- `app/salon-de-la-fama/page.tsx` y `app/juegos/[slug]/page.tsx` — leen `auth.getUser()` (mismo patrón que `site-header.tsx`) y pasan `user?.id ?? null` a `getAllLeaderboards` / `getLeaderboard`.
- `CLAUDE.md` — actualizar el bullet de **Reproductor** para reflejar que el guardado ahora requiere sesión y queda vinculado al usuario.
- `AGENTS.md` — si `next dev` lo regenera durante el trabajo, se commitea junto con el resto.

**Out of scope (para futuras specs):**

- Proteger `/jugar/[slug]` detrás de sesión iniciada: sigue siendo jugable sin cuenta para los 5 juegos reales (decisión explícita del usuario, enunciado de esta spec: "las personas que no estén registradas pueden jugar pero no se guardan sus puntos").
- Migrar filas históricas/sembradas de `public.scores` para asignarles un `user_id` retroactivo: quedan con `user_id null` para siempre, indistinguibles de cualquier fila futura sin usuario.
- Vincular identidades (un mismo jugador con cuenta de email y cuenta de Google separadas): sigue siendo el comportamiento por defecto de Supabase Auth, ya documentado como fuera de alcance en SPEC 12.
- Editar el nombre de jugador en el momento de guardar: se usa siempre `getDisplayName(user)` tal cual, sin campo editable.
- Cualquier cambio a `public.games` o a las políticas de lectura de ambas tablas.
- Tests automatizados (no hay framework configurado).

---

## Data model

### `public.scores` — columna nueva

```sql
alter table public.scores
  add column user_id uuid references auth.users(id) on delete set null;
```

### RLS — reemplazo de la política de inserción

```sql
drop policy "anon_insert_scores" on public.scores;

create policy "authenticated_insert_scores" on public.scores
  for insert to authenticated
  with check (
    achieved_at is null
    and score > 0
    and player <> ''
    and user_id = auth.uid()
  );
```

### `lib/leaderboards.ts` — firmas nuevas

```ts
export async function getLeaderboard(
  slug: string,
  currentUserId?: string | null,
): Promise<ScoreEntry[]>;

export async function getAllLeaderboards(
  currentUserId?: string | null,
): Promise<Record<string, ScoreEntry[]>>;
```

`withRanks` selecciona también `user_id` (sin exponerlo en `ScoreEntry`) y marca `isCurrentUser: row.user_id !== null && row.user_id === currentUserId`.

### `app/jugar/[slug]/actions.ts` — forma nueva de cada `guardarPuntuacion*`

```ts
export async function guardarPuntuacionTetris(input: {
  score: number;
}): Promise<GuardarResult> {
  const { score } = input;

  if (!Number.isInteger(score) || score <= 0) {
    return {
      ok: false,
      error: "La puntuación debe ser un número entero mayor que cero.",
    };
  }

  const supabase = await createClient(); // lib/supabase/server.ts
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "Debes iniciar sesión para guardar tu puntuación.",
    };
  }

  const { error } = await supabase.from("scores").insert({
    game_slug: "tetris",
    player: getDisplayName(user),
    score,
    achieved_at: null,
    user_id: user.id,
  });

  if (error) {
    console.error("[tetris] No se pudo guardar la puntuación:", error);
    return {
      ok: false,
      error: "No se pudo guardar la puntuación. Inténtalo de nuevo.",
    };
  }

  revalidatePath("/salon-de-la-fama");
  revalidatePath("/juegos/tetris");
  return { ok: true };
}
```

Las otras 4 funciones (`guardarPuntuacionArkanoid`, `guardarPuntuacionSnake`, `guardarPuntuacionFrogger`, `guardarPuntuacionAsteroids`) son gemelas con su propio `game_slug`.

---

## Implementation plan

1. **Migración.** Crear y aplicar `0006_scores_user_id_authenticated_insert.sql` (columna `user_id`, drop de `anon_insert_scores`, create de `authenticated_insert_scores`) vía `mcp__supabase__apply_migration`. Verificar con `mcp__supabase__list_migrations` y `mcp__supabase__get_advisors(type: "security")` que no aparecen warnings nuevos. Regenerar `lib/supabase/database.types.ts` con `npm run gen:types`.
2. **Capa de lectura.** Actualizar `lib/leaderboards.ts`: `getLeaderboard` y `getAllLeaderboards` aceptan `currentUserId`, seleccionan `user_id`, calculan `isCurrentUser`. Verificar tipos con `npm run build`.
3. **Páginas de lectura.** `app/salon-de-la-fama/page.tsx` y `app/juegos/[slug]/page.tsx` leen `auth.getUser()` y pasan `user?.id ?? null` a las funciones del paso 2.
4. **Modal.** Añadir `canSave` a `components/game-over-modal.tsx`: estado deshabilitado + mensaje "Inicia sesión para guardar tu puntuación" + enlace "Iniciar sesión" a `/acceso`, solo cuando `onSave` está presente y `canSave === false`.
5. **Server Actions.** Reescribir las 4 funciones existentes de `app/jugar/[slug]/actions.ts` para usar `lib/supabase/server.ts`, exigir `user`, usar `getDisplayName` y guardar `user_id`. Añadir la quinta, `guardarPuntuacionAsteroids`, gemela de las otras.
6. **Página del reproductor.** `app/jugar/[slug]/page.tsx` lee la sesión (mismo patrón que `site-header.tsx`) y pasa `isAuthenticated` / `displayName` a cada `*Player`.
7. **Los 5 reproductores.** Cada `*-player.tsx` recibe las props nuevas, pasa `canSave={isAuthenticated}` al modal, usa `displayName` cuando hay sesión para el `player` mostrado, y `asteroids-player.tsx` cablea `guardarPuntuacionAsteroids` en `onSave` (antes no tenía ninguna).
8. **Cierre.** `npm run lint` y `npm run build` verdes. Verificación manual: (a) sin sesión, jugar cada uno de los 5 juegos y confirmar que "Guardar puntuación" aparece deshabilitado con el mensaje y el enlace a `/acceso`; (b) con sesión iniciada, guardar una puntuación en cada uno de los 5 juegos y confirmar que aparece en `/salon-de-la-fama` y en `/juegos/<slug>` con el nombre de la cuenta y la fila resaltada como "TU MEJOR MARCA"; (c) confirmar en el dashboard/SQL que la fila insertada tiene `user_id` correcto. Actualizar el bullet de "Reproductor" en `CLAUDE.md`. Si `next dev` regeneró `AGENTS.md`, commitearlo.

---

## Acceptance criteria

- [ ] `npm run build` termina sin errores ni fallos de tipos.
- [ ] `npm run lint` pasa sin errores.
- [ ] `public.scores` tiene la columna `user_id` (uuid, nullable, FK a `auth.users`).
- [ ] La política `anon_insert_scores` ya no existe; existe `authenticated_insert_scores` con el `with check` descrito.
- [ ] Sin sesión iniciada, jugar cualquiera de los 5 juegos reales (`asteroids`, `tetris`, `arkanoid`, `snake`, `frogger`) permite completar la partida normalmente, pero el botón "Guardar puntuación" del modal de fin de juego aparece deshabilitado con el mensaje "Inicia sesión para guardar tu puntuación" y un enlace a `/acceso`.
- [ ] Con sesión iniciada, "Guardar puntuación" funciona en los 5 juegos y la fila insertada en `public.scores` tiene `user_id` igual al del usuario autenticado y `player` igual al `getDisplayName` de ese usuario.
- [ ] Intentar guardar sin sesión (llamando directamente a la Server Action, sin pasar por la UI) devuelve `{ ok: false, error: "Debes iniciar sesión para guardar tu puntuación." }` sin lanzar una excepción sin manejar.
- [ ] `/salon-de-la-fama` y `/juegos/<slug>` resaltan como "TU MEJOR MARCA" (`isCurrentUser: true`) la fila cuyo `user_id` coincide con el usuario con sesión iniciada, si tiene alguna puntuación guardada en ese juego.
- [ ] Sin sesión iniciada, ninguna fila del Salón de la Fama ni del detalle de juego se marca como "TU MEJOR MARCA".
- [ ] `asteroids-player.tsx` guarda puntuaciones igual que los otros 4 reproductores (antes no tenía ninguna Server Action cableada).
- [ ] Las políticas `public_read_games` y `public_read_scores` (SPEC 06) no cambian.
- [ ] `/jugar/[slug]` sigue siendo accesible y jugable sin sesión iniciada para los 5 juegos reales; esta spec no agrega ningún redirect ni protección de ruta.
- [ ] Todo el texto visible nuevo está en español con acentos correctos donde aplique.

---

## Decisions

- **Sí:** incluir `asteroids` en esta spec y darle su propia `guardarPuntuacionAsteroids`, aunque el hueco (nunca tuvo Server Action de guardado) sea anterior a esta spec. Decisión explícita del usuario: como la spec ya toca justo este flujo, dejarlo fuera habría significado un quinto juego jugable sin guardado incluso después de esta implementación.
- **Sí:** botón "Guardar puntuación" deshabilitado + mensaje + enlace a `/acceso` cuando no hay sesión, en vez de ocultar el botón o redirigir directamente al pulsarlo. Decisión explícita del usuario: mantiene visible la existencia de la función (incentiva registrarse) sin sorprender con una navegación no solicitada.
- **Sí:** el nombre guardado en `player` es siempre `getDisplayName(user)` (SPEC 12), sin campo editable en el modal. Decisión explícita del usuario: reutiliza el mismo nombre que ya se muestra en el header, sin abrir una superficie nueva de input libre.
- **Sí:** eliminar `anon_insert_scores` y reemplazarla por `authenticated_insert_scores`, en vez de dejar ambas convivir. Decisión explícita del usuario: tras esta spec ningún camino de la UI inserta como `anon`, así que dejar la política abierta sería una superficie de escritura sin dueño.
- **Sí:** añadir `scores.user_id` (nullable, FK a `auth.users`, `on delete set null`) en vez de identificar al usuario solo por `player` (texto libre). Decisión explícita del usuario: es la única forma de resaltar "TU MEJOR MARCA" de forma confiable (dos cuentas pueden compartir display name) y de permitir consultas futuras por usuario. Nullable porque las filas sembradas por SPEC 06 no tienen usuario y no se migran retroactivamente (ver Scope).
- **Sí:** cambiar las 5 Server Actions de `lib/supabase/anon.ts` a `lib/supabase/server.ts`. Decisión explícita del usuario, forzada por la mecánica de RLS: la política `authenticated_insert_scores` solo deja pasar filas cuyo rol JWT sea `authenticated`, y eso solo lo produce el cliente con cookies (`@supabase/ssr`) leyendo la sesión real; `anon.ts` siempre autentica como `anon` sin importar si hay sesión de navegador.
- **Sí:** implementar ya la fila "TU MEJOR MARCA" (`isCurrentUser`) en el Salón de la Fama y en el detalle de juego, aprovechando que `user_id` ya está disponible. Decisión explícita del usuario, revirtiendo la recomendación inicial de dejarlo para una spec futura.
- **No:** proteger `/jugar/[slug]` detrás de sesión iniciada. Decisión explícita del usuario (enunciado original de la spec): jugar sigue sin requerir cuenta; solo el guardado la requiere.
- **No:** migrar retroactivamente las filas sembradas de `public.scores` para asignarles `user_id`. No hay forma de mapear esos nombres ficticios ("NEON_KNIGHT", etc.) a cuentas reales; quedan con `user_id null` de forma permanente.

---

## Risks

| Riesgo                                                                                                                                                                                                   | Mitigación                                                                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Las páginas `app/salon-de-la-fama/page.tsx` y `app/juegos/[slug]/page.tsx` empiezan a leer `cookies()` (vía `auth.getUser()`), lo que podría forzar renderizado dinámico donde antes eran estáticas/SSG. | Ambas ya renderizan `<SiteHeader>`, que desde SPEC 12 es `async` y ya lee `auth.getUser()` — ya son dinámicas hoy. Esta spec no cambia esa característica, solo reutiliza la sesión que la página ya obtiene indirectamente (aquí se lee explícitamente para pasar el `user_id` a la capa de datos). |
| Cambiar las 5 Server Actions de `anon.ts` a `server.ts` añade una llamada a `auth.getUser()` por cada intento de guardado.                                                                               | Volumen bajo (una llamada por partida guardada, no por frame de juego); mismo patrón ya usado en `cerrarSesion` y el resto de `app/acceso/actions.ts`.                                                                                                                                               |
| Alguien podría invocar `guardarPuntuacion*` directamente (sin pasar por la UI) sin sesión, antes de que RLS rechace el insert.                                                                           | La Server Action valida `user` explícitamente y devuelve un error controlado antes de intentar el insert; aunque no validara, RLS (`authenticated_insert_scores`) igual rechazaría el insert por venir con rol `anon`. Doble capa.                                                                   |
| El cambio de `PLAYER_LABEL` fijo a `getDisplayName(user)` puede producir nombres de jugador muy largos o con caracteres no vistos antes en el layout del modal/leaderboard.                              | Mismo helper y los mismos límites de layout que ya usa `site-header.tsx` desde SPEC 12; no es un riesgo nuevo introducido por esta spec.                                                                                                                                                             |

---

## Lo que **no** entra en esta spec

- Proteger `/jugar/[slug]` detrás de sesión iniciada.
- Migrar retroactivamente las filas sembradas de `public.scores`.
- Vincular identidades de distintos proveedores para un mismo jugador.
- Campo editable de nombre de jugador al guardar.
- Cambios a `public.games` o a las políticas de lectura de ambas tablas.
- Tests automatizados.

Cada uno de esos, si llega, va en su propia spec.
