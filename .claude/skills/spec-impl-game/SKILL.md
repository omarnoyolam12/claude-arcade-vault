---
name: spec-impl-game
description: Implementa una spec de juego jugable aprobada delegando en /spec-impl, y al terminar la implementación lanza los agentes skin-designer y mobile-porter en secuencia (nunca en paralelo) para auditar el juego recién portado.
disable-model-invocation: true
argument-hint: <NN-spec-name-jugable>
allowed-tools: Read, Glob, Grep, Edit, Write, AskUserQuestion, Skill, Agent, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git diff:*), Bash(git stash:*), Bash(cat:*), Bash(ls:*)
---

# /spec-impl-game — Implementador de specs de juego + auditoría post-implementación

## Session context

Current repository state:
!`git status --short`

Current branch:
!`git branch --show-current`

Specs available in this folder:
!`ls specs/ 2>/dev/null || echo "The specs/ folder does not exist"`

Games already forked to public/ (jugables hoy):
!`ls public/games/ 2>/dev/null || echo "public/games/ does not exist yet"`

---

## Qué es este comando

Este comando **no reimplementa** el flujo de `/spec-impl`: lo **delega** en la skill real para
que ambos comandos nunca diverjan. Su único aporte propio es la **Fase 5**: al terminar la
implementación, dispara automáticamente los agentes `skin-designer` (Modo B — verificación de
código) y `mobile-porter`, **uno después del otro, nunca en el mismo bloque de tool calls**, para
auditar el juego recién portado antes de darlo por cerrado.

Está pensado para specs con la forma SPEC 05/07/08/09 (producidas por `/juego-jugable` o por
`game-jam` como `01-<game-id>-jugable.md`): specs que hacen jugable un juego y le dan leaderboard
escribible en Supabase. Nada te impide correrlo sobre otra spec, pero la Fase 5 solo tiene sentido
para un juego jugable con `components/<slug>-player.tsx`.

---

## Fases 1–4 — delegadas en `/spec-impl`

Invoca el tool `Skill` con `skill: "spec-impl"` y `args` igual al argumento recibido por este
comando (`$ARGUMENTS`). No resumas de memoria lo que hace `/spec-impl`: déjalo cargar sus
instrucciones reales en este turno y síguelas tal cual, incluyendo:

- La validación del estado "Aprobado" (y su bloqueo si no lo está).
- El chequeo de working tree sucio antes de crear/cambiar de rama.
- La creación/cambio de rama `spec-NN-slug` según `AutoCreateBranch`.
- El resumen de objetivo/alcance/plan/criterios antes de empezar a implementar.
- El ritmo de implementación paso a paso con pausa y confirmación explícita después de cada paso.
- La regla de nunca commitear automáticamente.

**Si `/spec-impl` se detiene en cualquier punto** (spec no aprobada, rama sucia sin resolver, el
usuario no confirma un paso, ambigüedad sin resolver, etc.): este comando también se detiene ahí.
**No continúes a la Fase 5** — esa fase solo aplica cuando la implementación realmente terminó.

Mientras sigues las instrucciones delegadas, quédate con dos datos que vas a necesitar en la Fase
5:

- El **slug del juego** que se está haciendo jugable (normalmente se deduce del nombre de la spec,
  p. ej. `NN-pacman-jugable.md` → slug `pacman`, o está explícito en el objetivo/alcance de la
  spec).
- El **nombre de la spec y de la rama** (`spec-NN-slug`), para referenciarlos en los prompts de
  los agentes.

---

## Fase 5 — Auditoría post-implementación (exclusiva de este comando)

Se ejecuta **solo si** la Fase 4 delegada terminó con todos los pasos del plan implementados (el
punto en el que `/spec-impl` te recuerda verificar los criterios de aceptación y actualizar el
estado de la spec). No la ejecutes si el flujo se abortó antes.

Anuncia al usuario:

```
✅ Implementación completa. Antes de cerrar, voy a auditar el juego recién portado con dos
agentes, uno después del otro:
  1. skin-designer (Modo B — verifica en el código que existan las 3 skins seleccionables)
  2. mobile-porter (audita la experiencia mobile-web del nuevo player component)
```

**Paso 1 — skin-designer.** Lanza el `Agent` tool con `subagent_type: "skin-designer"`. El prompt
debe indicar explícitamente:

- El slug del juego y que acaba de pasar por `/juego-jugable` + `/spec-impl` (para que el agente
  entre en **Modo B — Verificación**, no en Modo A de diseño).
- Que revise el código real: el motor en `public/games/<slug>/` y
  `components/<slug>-player.tsx`.
- Que su único output es el informe/veredicto más la entrada en
  `.claude/skin-designer/registro-skins.md` — no debe escribir código de producto.

Espera su resultado y muéstraselo al usuario íntegro (o resumido si es muy largo, pero sin omitir
el veredicto pasa/no pasa).

**Paso 2 — mobile-porter.** Solo después de recibir la respuesta del Paso 1, en una llamada de
tool **separada** (nunca junto con la del Paso 1 en el mismo mensaje), lanza el `Agent` tool con
`subagent_type: "mobile-porter"`. El prompt debe indicar:

- El slug del juego y que audite `components/<slug>-player.tsx` (además de cualquier página
  relacionada, como `app/jugar/[slug]/page.tsx` si aplica).
- Que confirme si el juego recién portado respeta el patrón de controles táctiles de SPEC 11
  (`components/touch-controls.tsx`, `useIsTouchDevice()`) y el resto del checklist de
  responsive/táctil.
- Que su único output es el informe más la entrada en
  `.claude/mobile-porter/registro-auditorias.md` — no debe escribir código de producto.

Espera su resultado y muéstraselo al usuario.

**Regla dura:** estos dos agentes se invocan **secuencialmente, nunca en paralelo**. No los
lances en el mismo bloque de tool calls ni asumas el resultado de uno mientras el otro corre —
espera la respuesta completa del Paso 1 antes de emitir la llamada del Paso 2.

Cierra la Fase 5 con un resumen para el usuario:

```
📋 Auditoría post-implementación completa.

skin-designer → [veredicto o hallazgo principal]
mobile-porter → [veredicto o hallazgo principal]

Ninguno de los dos agentes modificó código. Si encontraron brechas, el siguiente paso es
levantar una spec con /spec que las resuelva.
```

---

## Resumen de comportamiento esperado

```
/spec-impl-game 12-pacman-jugable

  Fases 1–4 → delegadas en Skill("spec-impl", args: "12-pacman-jugable")
              Sigue el flujo real de /spec-impl: valida "Aprobado", crea/usa
              spec-12-pacman-jugable, implementa paso a paso con pausas.
  Fase 5    → Solo si terminó el plan completo:
              1. Agent(skin-designer) sobre el slug "pacman" → espera resultado
              2. (después) Agent(mobile-porter) sobre "pacman" → espera resultado
              Muestra ambos informes y cierra recordando verificar criterios de
              aceptación y actualizar el estado de la spec.

/spec-impl-game 12-pacman-jugable  (spec en estado Draft/Borrador)

  Fases 1–4 → Skill("spec-impl", ...) se detiene con el mensaje estándar de
              "no puedo implementar esta spec".
  Fase 5    → No se ejecuta.
```
