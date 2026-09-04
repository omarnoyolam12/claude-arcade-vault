# Registro de jams — game-jam

Memoria persistente del agente `game-jam`. **Se lee entero antes de cada jam y se anexa al
final de cada una.** No repetir un juego ya listado sin justificarlo.

## Índice

| Fecha      | Tema                                                              | Juegos                   | Estado             |
| ---------- | ----------------------------------------------------------------- | ------------------------ | ------------------ |
| 2026-09-04 | Frogger — cruzar la carretera y el río sin convertirse en papilla | frogger, atasco, rapidos | Borrador redactado |

## Formato de entrada

## AAAA-MM-DD — Jam: <Tema>

- **Juegos:** <game-id> (pitch), <game-id> (pitch), …
- **Carpetas:** `specs/game-jam/<game-id>/`, …
- **Specs por juego:** <game-id> → NN archivos; …
- **Estado:** Borrador redactado | En revisión | Promovido a `specs/` | Implementado | Rechazado
- **Notas:** <opcional>

---

## Entradas

<!-- el agente anexa aquí, más reciente al final -->

## 2026-09-04 — Jam: Frogger — cruzar la carretera y el río sin convertirse en papilla

- **Juegos:**
  - `frogger` (implementación fiel del Frogger clásico de 1981: cruzar una carretera de
    tráfico y un río de troncos/tortugas hasta cinco casas, con vidas y temporizador por
    vida). Pedido explícito del usuario para esta jam.
  - `atasco` (variante propia del Vault: cruce de carretera **infinito**, sin río, con una
    pared de atasco que sube desde abajo y obliga a avanzar sin parar; score chase puro,
    sin vidas).
  - `rapidos` (variante propia del Vault que cubre solo la mitad "río" del tema: balsa con
    movimiento continuo descendiendo rápidos sin fin, esquivando rocas/remolinos/lagartos y
    cruzando checkpoints; vidas + nivel, como Frogger).
- **Carpetas:** `specs/game-jam/frogger/`, `specs/game-jam/atasco/`, `specs/game-jam/rapidos/`.
- **Specs por juego:**
  - `frogger` → 2 archivos (`01-frogger-jugable.md`, `02-frogger-progresion.md`).
  - `atasco` → 2 archivos (`01-atasco-jugable.md`, `02-atasco-pausa-y-racha.md`).
  - `rapidos` → 2 archivos (`01-rapidos-jugable.md`, `02-rapidos-remolinos-y-dificultad.md`).
- **Estado:** Borrador redactado.
- **Notas:** `frogger` ya figuraba en `.claude/game-planner/registro-sugerencias.md`
  (entrada del 2026-09-03, veredicto "Recomendado con reservas", estado `Propuesto`) — no es
  `Spec redactada`, `Promovido a specs/`, `Implementado` ni `Rechazado por el usuario`, así
  que no está bloqueado; se retoma aquí porque el usuario lo pidió explícitamente para esta
  jam y las reservas de diseño que dejó pendientes ese registro (nombre con marca, formato
  apaisado, regla de solape en el tronco, migración de catálogo) quedan resueltas en las
  Decisions de `specs/game-jam/frogger/01-frogger-jugable.md`. Ninguno de los tres juegos
  ni sus `<game-id>` (`frogger`, `atasco`, `rapidos`) coincide con un `slug` existente en
  `supabase/migrations/0001_create_games.sql` ni con una carpeta previa de esta jam.
  `atasco` y `rapidos` requieren migraciones de catálogo nuevas (`0005_*` y `0006_*`
  respectivamente, sobre `0004_add_frogger_game.sql` de esta misma jam); ninguno de los
  tres necesita una migración nueva sobre `public.scores` porque `anon_insert_scores`
  (SPEC 07) no es específica de slug.
