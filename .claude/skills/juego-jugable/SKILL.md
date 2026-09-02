---
name: juego-jugable
description: Redacta un spec para hacer jugable un juego (de resources/started-games/ o aportado por el usuario) e integrar su leaderboard escribible en Supabase, siguiendo el patrón de SPEC 05 (motor jugable) + SPEC 06 (catálogo/leaderboard) ya usado en este repo. Úsalo antes de portar un nuevo juego a /jugar/[slug].
disable-model-invocation: true
argument-hint: "<slug-del-juego o ruta a resources/started-games/NN-nombre>"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(find:*)
---

# /juego-jugable — Spec designer para juegos jugables con leaderboard escribible

## Session context

Today's date (use this for the spec header, never guess it):
!`date +%F`

Specs that already exist:
!`ls specs/ 2>/dev/null || echo "The specs/ folder does not exist yet"`

Starter games available under resources/started-games/:
!`ls resources/started-games/ 2>/dev/null || echo "resources/started-games/ does not exist"`

Games already forked to public/:
!`ls public/games/ 2>/dev/null || echo "public/games/ does not exist yet"`

Existing Supabase migrations:
!`ls supabase/migrations/ 2>/dev/null || echo "supabase/migrations/ does not exist yet"`

---

This skill is a specialized sibling of `/spec`, scoped to one recurring feature shape: **take a starter game and make it playable at `/jugar/[slug]`, with its score writable to the Supabase leaderboard.** **You don't write code here.** Your job is to analyze the real game source, clarify what is in/out with the user, and produce a spec at `specs/NN-<slug>-jugable.md` ready for `/spec-impl`.

## Philosophy

Two specs already did this by hand: **SPEC 05** (`specs/05-asteroids-jugable.md`) forked `asteroids`' vanilla `game.js` into a `window.start<Slug>(canvas)` / `stop()` / `restart<Slug>()` contract wired to a React HUD via `postMessage`. **SPEC 06** (`specs/06-catalogo-y-leaderboard-en-supabase.md`) created `public.games` / `public.scores` in Supabase, read-only. Read both in full before drafting anything — they are the reference shape and the two dependencies every spec this skill writes must declare (`Depends on: SPEC 05, SPEC 06`).

The one thing this skill's specs must do that 05/06 did **not**: make "Guardar puntuación" actually insert into `public.scores` (RLS `INSERT` policy for `anon` + a Server Action), since there is still no auth in this project.

**Never assume the new game has the same shape as asteroids.** Tetris has no wrapper function and no "lives". Arkanoid is multi-module ES with binary assets and an async spritesheet load, and its state uses Spanish variable names (`puntuacion`, `vidas`, `nivelIndice`). Read the actual source before writing anything about it.

## Command flow

Follow the five phases in order. **Never skip Phase 2 (source analysis) or Phase 3 (clarifying questions)** — a spec that assumes the wrong game shape is worse than no spec. Reply in the same language as the initial prompt (this repo's specs are written in Spanish; match that unless the user writes in another language).

### Phase 1 — Locate the source game

Resolve `$ARGUMENTS` to a game:

- If it names a folder under `resources/started-games/` (by full name, number prefix, or slug fragment — e.g. `03-claude-tetris`, `03`, `tetris`), use that.
- If it is a path the user pasted directly (game not under `resources/started-games/`), use that path instead.
- If `$ARGUMENTS` is empty or does not resolve, list the folders from the session context above and ask the user to pick one, or to paste a path.

Check whether the target slug already has a row in `public.games`:

- Read `supabase/migrations/0001_create_games.sql` (or later migrations that touch `games`) and look for the slug.
- If the Supabase MCP is available in this session, prefer `list_tables` / `execute_sql` against `public.games` for a live answer.
- Record the result — it determines whether the spec needs a **new** `games` migration or only references an existing row.

### Phase 2 — Analyze the real source code

Read the actual game file(s) (not `resources/started-games/02-claude-asteroids/` — that one is done). Determine, and write down concretely for use in later phases:

- **Single file vs. multi-module.** Does it use `import`/`export`? Does it load a separate script first (e.g. a spritesheet) before the game can run? Are there binary assets (images, audio) that would need copying to `public/games/<slug>/`?
- **Boot shape.** Does the script auto-run at load time (top-level `init()` call), or does it wait on something async? Is there already any wrapper function, or does everything live in module/global scope?
- **Real state variable names.** The literal names for score, lives, level, and game-state/phase as they appear in the source — do not translate or rename them in your notes. Note explicitly if a concept does not exist (e.g. no "lives" in Tetris).
- **HUD location.** Does the game draw its HUD inside the canvas (`ctx.fillText`, like asteroids), or does it depend on external DOM elements (`#score`, `#next-canvas`, an overlay div)? If external DOM, this is a decision to raise in Phase 3: port that HUD into the React player, or replicate it inside the canvas.
- **Input handling.** Which events (`keydown`/`keyup`, `mousemove`/`click`) and on which target (`window` vs `document` vs the canvas element)? Any menu/mouse interaction beyond keyboard?
- **Own persistence.** Does the game read/write `localStorage` (highscore, saved game, theme)? Note the key(s) used.

Do not move to Phase 3 until you can describe, in concrete terms, what the wrapper function (`window.start<Slug>(canvasEl)`), the `stop()` cleanup, and the `postMessage` payload would look like for **this specific game** — not a copy of asteroids'.

### Phase 3 — Clarify through questions

Ask in blocks of 3 to 5, same discipline as `/spec`: wait for an answer before continuing, use `AskUserQuestion` when available, mark your recommendation.

**Categories to always cover here:**

- **Message contract.** Which fields does `postMessage` actually carry for this game? If a concept from the `AsteroidsMessage` shape doesn't exist (no lives, no level), decide: omit the field, or fix it to a constant — state which and why.
- **Score-saving scope.** Confirm "Guardar puntuación" inserts `{ game_slug, player, score, achieved_at: null }` into `public.scores` via a Server Action, gated by a new `INSERT` RLS policy open to `anon` (no auth yet — same posture SPEC 06 already accepted for reads). Confirm the player label (default: reuse the fixed `"G4M3R_X"` HUD label already used by asteroids, unless the user wants something else). Ask if any validation is needed (e.g. reject a non-positive score).
- **What's deliberately out.** Functional pause, touch/gamepad controls, sound, the game's own `localStorage` persistence, mouse-driven menus — same posture as SPEC 05's "don't touch the fork's gameplay beyond the bounded changes". Ask about each one the Phase 2 analysis actually found in this game (don't ask about mouse support if the game has none).
- **Game-specific risks** surfaced in Phase 2 (e.g. Arkanoid's async spritesheet load gating `requestAnimationFrame`, Tetris having no wrapper or cleanup today).

**Stop asking once you can answer, without assuming anything:** which files change, what the first and last executable steps are, and how to verify the feature is done — same bar as `/spec`.

### Phase 4 — Write the spec

Read `.claude/skills/juego-jugable/template.md` (in the same directory as this skill) for the exact section shape and the fixed Scope In/Out items this spec type always carries. Also skim `specs/05-asteroids-jugable.md` and `specs/06-catalogo-y-leaderboard-en-supabase.md` one more time immediately before writing, to match tone, section wording, and the Spanish used there.

Same fast-path rule as `/spec`: if Phase 3 left nothing to assume, write the whole spec at once and move to Phase 5 — do not ask for section-by-section confirmation. Only go section by section if information is genuinely still missing.

Section order (same as `/spec`'s template, content specialized per `template.md` of this skill):

1. Header — `**Depends on:** SPEC 05, SPEC 06` (plus any spec that created the target game's `public.games` row, if different).
2. Por qué existe esta spec (only if something here is non-obvious or breaks a prior pattern).
3. Scope (In / Out — both mandatory; see fixed items in `template.md`).
4. Data model (the real `postMessage` shape for this game + the Server Action's input shape).
5. Implementation plan (numbered, each step leaves the system runnable).
6. Acceptance criteria (boolean checklist).
7. Decisions (Sí/No with reason — must include the HUD-placement and write-policy decisions from `template.md`).
8. Risks (only the ones found in Phase 2/3 that are non-obvious).

### Phase 5 — Save the spec

Same mechanics as `/spec`'s Phase 4:

1. Next sequential number from the `specs/` listing in the session context above (highest existing + 1, zero-padded to two digits).
2. Slug: `<juego-slug>-jugable` (e.g. `tetris-jugable`, `arkanoid-jugable`).
3. Date from the session context above — never guess it.
4. Write directly to `specs/NN-<slug>-jugable.md`. Do not ask permission for the filename; only ask if the target file already exists.
5. State starts as `Draft`. Never mark it `Approved` automatically.
6. Verify every spec named in `Depends on` actually exists in `specs/`.
7. Leave `specs/.spec-config.yml` untouched if it exists; this skill never creates it (that responsibility belongs to `/spec`, which already ran once in this repo).
8. Confirm to the user: file path, `Draft` state reminder, and that `/spec-impl NN-<slug>-jugable` is the next step once reviewed and approved. **Stop there** — do not propose implementing anything yourself.

## Hard rules

- **Never write product code.** Only the spec's `.md` file, at the very end.
- **Never propose implementing the spec after saving it.** That is `/spec-impl`'s job.
- **Never assume the new game has asteroids' shape.** Phase 2's source analysis is not optional, even for a game that looks similar at a glance.
- **Never assume decisions the user did not confirm**, especially the score-saving scope (player label, validation) and what stays out.
- **Do not re-ask in Phase 4 what Phase 3 already answered.**

## Arguments

`$ARGUMENTS` is the game to target — a folder name/number under `resources/started-games/`, a slug, or a path. It is not the spec's slug (that is derived in Phase 5 as `<juego-slug>-jugable`). If invoked with no arguments, list the available starter games from the session context and ask the user to pick one.
