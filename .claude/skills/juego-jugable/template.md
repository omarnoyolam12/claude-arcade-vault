# Template for a "juego jugable" spec

This file is the reference `/juego-jugable` consults when generating specs. It extends `.claude/skills/spec/template.md` — read that one first for the generic section shapes (Header, Scope, Data model, Implementation plan, Acceptance criteria, Decisions, Risks, final "what's not in this spec"). **This file only documents what is fixed and specific to the "make a game playable + writable leaderboard" shape**, based on the two specs that already did this by hand: `specs/05-asteroids-jugable.md` and `specs/06-catalogo-y-leaderboard-en-supabase.md`.

It is not text to copy verbatim — it is the shape the skill must respect, adapted to whichever game Phase 2 actually analyzed.

---

## Header

`**Depends on:** SPEC 05, SPEC 06` at minimum (both are the source of the patterns this spec reuses). Add the spec that created the target game's `public.games` row if it's a different one.

---

## Scope — fixed "In" items

Every spec this skill writes must cover these, each adapted to what Phase 2 of the skill actually found in the game's source (do not describe them as if the game were shaped like asteroids):

1. **Alta en `public.games`** — a new `supabase/migrations/000N_create_games.sql`-style migration inserting the row for this slug, **only if it doesn't already exist** (check done in Phase 1 of the skill). If it already exists, say so and skip this item.
2. **Fork del juego** to `public/games/<slug>/`, wrapped as `window.start<Slug>(canvasEl)` returning a `stop()` that cancels the animation frame and removes the listeners it registered. Describe concretely, for **this** game:
   - Whether it's a single-file fork or requires porting multiple modules / a pre-loaded script (e.g. a spritesheet) / binary assets.
   - Whether a `window.restart<Slug>()` is exposed (mirrors SPEC 05's `restartAsteroids`), and what it re-initializes.
   - Where the HUD is drawn: if the source game relies on external DOM elements for its HUD, state explicitly whether this spec ports that HUD into the React player or replicates it inside the canvas — this is a Decision, not an assumption.
3. **Emisión de estado** via `window.postMessage({ source: "<slug>", type: "state" | "gameover", ...campos reales }, window.location.origin)`, dirty-checked like asteroids'. The exact fields are whatever Phase 2 found real — do not force `score`/`lives`/`level`/`phase` onto a game that doesn't have all four; state what's omitted or fixed to a constant.
4. **`components/<slug>-player.tsx`**, `"use client"`, calcado de `components/asteroids-player.tsx`: `next/script` load, canvas ref, `postMessage` listener with the same origin/source/window filters, HUD reading from local state, `GameOverModal` in controlled mode (`open`/`onOpenChange`).
5. **Rama en `app/jugar/[slug]/page.tsx`**: `slug === "<slug>"` renders the new player component; every other slug's branch stays untouched.
6. **Escritura real de puntuación** (the one thing 05/06 explicitly left as mock):
   - A new RLS `INSERT` policy on `public.scores`, granted to `anon` (no auth in this project yet — same posture SPEC 06 already accepted for `SELECT`).
   - A Server Action that inserts `{ game_slug: "<slug>", player, score, achieved_at: null }` and revalidates whatever page(s) read the leaderboard for this slug.
   - Wired to the "Guardar puntuación" button in the already-controlled `GameOverModal`, using the fixed HUD player label (default `"G4M3R_X"`, unless Phase 3 decided otherwise).

## Scope — fixed "Out" items (unless Phase 3 explicitly overrides one)

- Real auth (`user_id`, session-based identity) — the write path stays keyed on a free-text `player`, same as reads.
- Functional pause.
- Touch / gamepad controls.
- Sound.
- The game's own `localStorage` persistence (own highscore, saved game, theme), unless Phase 3 decided to keep it — if so, say why explicitly.
- Mouse-driven menus, unless the source game has none to begin with (don't list this as "out" for a game that never had it).
- Changes to `lib/games.ts` / `lib/leaderboards.ts` beyond what SPEC 06 already made generic — they should not need edits for a new slug.
- Any other game's `/jugar/[slug]` route — those stay mock until their own spec.

---

## Data model — fixed shape

Two structures, both concrete to the actual game:

```ts
// Emitted by public/games/<slug>/game.js via window.postMessage(msg, window.location.origin)
type <Slug>Message =
  | {
      source: "<slug>";
      type: "state";
      // only the fields this game actually has — omit or fix as constants otherwise
      score: number;
      // lives?: number;   ← omit entirely if the game has no lives concept
      // level?: number;
      phase: /* the real state/phase values this game uses, not asteroids' */;
    }
  | { source: "<slug>"; type: "gameover"; score: number };
```

Plus the Server Action's input shape, e.g.:

```ts
// Server Action — inserts one row into public.scores
async function guardarPuntuacion(input: {
  gameSlug: string; // fixed to "<slug>" by the caller
  player: string; // fixed HUD label, e.g. "G4M3R_X"
  score: number;
});
```

State explicitly which fields from asteroids' `AsteroidsMessage` don't apply here and why (e.g. "este juego no tiene vidas; el campo se omite del mensaje").

---

## Decisions — items this spec type must always record

Beyond whatever else Phase 3 surfaced, these three are never silently defaulted — always write them down with a reason:

- **HUD placement.** Whether the source game's externally-drawn HUD (if any) gets ported into the React player or replicated inside the canvas, and why.
- **Own persistence.** Whether the game's `localStorage` usage (if any) is kept, dropped, or ignored, and why.
- **Write policy.** Why the new `INSERT` RLS policy on `public.scores` is open to `anon` rather than gated behind auth — same reasoning SPEC 06 already used for `SELECT` (no auth exists yet in this project; gating it would block the feature entirely).

---

## Everything else

Follow `.claude/skills/spec/template.md` as-is for section mechanics: one sentence per idea, concrete file names, no long executable code, boolean acceptance criteria, standard markdown, and the final "Lo que no entra en esta spec" reinforcement section.
