# SPEC 13 — Checklist de seguridad básica

> **Status:** Implementado
> **Depends on:** SPEC 04, SPEC 06, SPEC 12
> **Date:** 2026-09-21
> **Objective:** Cerrar el checklist de seguridad básica (`resources/check-list/check-list-security.md`): revocar el EXECUTE del SECURITY DEFINER `rls_auto_enable`, añadir headers HTTP de seguridad en `next.config.ts`, y documentar como precondición manual los ajustes de Supabase Auth que no se pueden aplicar desde este repo.

---

## Por qué existe esta spec

El checklist de `resources/check-list/check-list-security.md` mezcla cosas de naturaleza distinta:

- **RLS en `games` y `scores`**: ya está habilitado desde SPEC 06 (`alter table ... enable row level security` en `0001_create_games.sql` y `0002_create_scores.sql`). Verificado en vivo con `mcp__supabase__get_advisors(type: "security")`: ningún WARN de RLS deshabilitado aparece hoy. No requiere ninguna acción de esta spec.
- **`public.rls_auto_enable()`**: los advisors sí reportan dos WARN reales (`anon_security_definer_function_executable`, `authenticated_security_definer_function_executable`) sobre esta función `SECURITY DEFINER`. No fue creada por ninguna migración de este repo — es un event trigger instalado por la plataforma Supabase para auto-habilitar RLS en tablas nuevas — pero sí es invocable directamente vía RPC por `anon` y `authenticated`, que es exactamente lo que el checklist pide revisar en el panel de warnings.
- **Mínimo de contraseña, leaked password protection, límite de signups por IP**: son ajustes de Supabase Auth que solo existen en el dashboard (Authentication → Policies / Rate Limits) o vía la Management API. Este repo no tiene `supabase/config.toml` ni ningún tool de MCP para leerlos o escribirlos — el servidor MCP registrado en `.mcp.json` no expone esa superficie. Se documentan como precondición manual, igual que SPEC 12 documentó el registro de las apps OAuth en Google/GitHub como paso externo al repo.
- **Headers de seguridad en Next.js**: esto sí es código de este repo y hoy `next.config.ts` no define ningún header.

---

## Scope

**In:**

- `supabase/migrations/0005_revoke_rls_auto_enable_execute.sql` — nueva migración: `revoke execute on function public.rls_auto_enable() from anon, authenticated;`. Sigue la remediación oficial que reporta el propio advisor de Supabase para los WARN `anon_security_definer_function_executable` y `authenticated_security_definer_function_executable`.
- `next.config.ts` — añade un array `securityHeaders` con los 3 headers del checklist (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) y una función `headers()` que los aplica a `/(.*)`, tal cual el ejemplo de `resources/check-list/check-list-security.md`.
- `CLAUDE.md` — nueva nota en la sección de Supabase documentando la migración 0005, y un bloque explícito con los 3 ajustes de Auth pendientes de configurar a mano en el dashboard (mínimo de contraseña: 8 caracteres, leaked password protection: activar, límite de signups por IP: activar/configurar), marcados como precondición manual no ejecutada por esta spec.
- Verificación (sin cambio de código) de que RLS sigue habilitado en `games` y `scores` tras esta spec, vía `mcp__supabase__get_advisors`.

**Out of scope (para futuras specs o pasos manuales fuera del repo):**

- Configurar el mínimo de longitud de contraseña, activar leaked password protection o el límite de signups por IP en el dashboard de Supabase Auth. Decisión explícita del usuario: se documentan como precondición manual, no se ejecutan desde este repo.
- CAPTCHA/Turnstile u otro mecanismo anti-bot a nivel de aplicación para el registro. No lo pide el checklist.
- Headers adicionales no listados en el checklist (HSTS, `Permissions-Policy`, CSP). Decisión explícita del usuario: solo los 3 headers del ejemplo.
- Cualquier cambio a las políticas RLS existentes de `games` o `scores` (`public_read_games`, `public_read_scores`, `anon_insert_scores`): ya cumplen el checklist, no se tocan.
- Eliminar o reescribir la definición de `rls_auto_enable()`: es propiedad de la plataforma Supabase; solo se le revoca el permiso de ejecución directa por rol.
- Otros hallazgos de `mcp__supabase__get_advisors` no mencionados en el checklist (de performance o de seguridad fuera de los 5 ítems listados).

---

## Data model

Esta spec no introduce estructuras de datos nuevas. Modifica permisos de una función existente (propiedad de la plataforma) y configuración HTTP de Next.js:

```sql
-- supabase/migrations/0005_revoke_rls_auto_enable_execute.sql
revoke execute on function public.rls_auto_enable() from anon, authenticated;
```

```ts
// next.config.ts
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];
```

---

## Implementation plan

1. **Verificar estado inicial.** Correr `mcp__supabase__get_advisors(type: "security")` y confirmar que los únicos WARN activos son los dos de `rls_auto_enable` y `auth_leaked_password_protection`; que no hay ningún WARN de RLS deshabilitado en `games` ni `scores`. Sin cambios de código en este paso.
2. **Migración `rls_auto_enable`.** Crear `supabase/migrations/0005_revoke_rls_auto_enable_execute.sql` con el `REVOKE EXECUTE` del snippet anterior. Aplicarla con `mcp__supabase__apply_migration`. Volver a correr `get_advisors(type: "security")` y confirmar que `anon_security_definer_function_executable` y `authenticated_security_definer_function_executable` ya no aparecen.
3. **Headers de seguridad.** Editar `next.config.ts`: añadir `securityHeaders` y una función `headers()` async que retorne `[{ source: "/(.*)", headers: securityHeaders }]`. Verificar con `npm run build` que compila, y en `next dev` con `curl -I http://localhost:3000/` que los 3 headers aparecen en la respuesta.
4. **Documentar en `CLAUDE.md`.** Añadir a la sección de Supabase una línea sobre la migración `0005` (mismo patrón que las notas de `0001`–`0004`), y un bloque nuevo (p. ej. bajo esa misma sección) listando los 3 ajustes de Auth pendientes de activar a mano en el dashboard, con los valores exactos del checklist, dejando claro que ninguno se ejecutó desde el repo.
5. **Cierre.** `npm run lint` y `npm run build` verdes. Correr `mcp__supabase__get_advisors(type: "security")` una última vez: solo debe quedar el WARN `auth_leaked_password_protection` (esperado, es el único de los tres ajustes de dashboard que sigue reportándose como advisor y que esta spec documenta pero no ejecuta). Si `next dev` regeneró `AGENTS.md`, commitearlo.

---

## Acceptance criteria

- [ ] `npm run build` termina sin errores ni fallos de tipos.
- [ ] `npm run lint` pasa sin errores.
- [ ] `supabase/migrations/0005_revoke_rls_auto_enable_execute.sql` existe, contiene únicamente el `REVOKE EXECUTE` de `rls_auto_enable`, y está aplicada en el proyecto de Supabase.
- [ ] `mcp__supabase__get_advisors(type: "security")` ya no incluye `anon_security_definer_function_executable` ni `authenticated_security_definer_function_executable`.
- [ ] `mcp__supabase__get_advisors(type: "security")` confirma que `games` y `scores` siguen con RLS habilitado (sin cambios respecto a SPEC 06).
- [ ] Una petición HTTP a cualquier ruta del sitio (ej. `curl -I http://localhost:3000/`) devuelve `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` y `Referrer-Policy: strict-origin-when-cross-origin`.
- [ ] `CLAUDE.md` documenta la migración `0005` y lista, sin marcarlos como resueltos, los 3 ajustes de Auth pendientes de activar a mano en el dashboard de Supabase (mínimo de contraseña 8 caracteres, leaked password protection, límite de signups por IP).
- [ ] Ninguna política RLS existente de `games` ni `scores` (`public_read_games`, `public_read_scores`, `anon_insert_scores`) cambia de línea.
- [ ] Ningún flujo de autenticación de SPEC 12 (login, registro, OAuth, recuperación de contraseña) cambia de comportamiento.

---

## Decisions

- **Sí:** tratar el RLS de `games`/`scores` como ya resuelto desde SPEC 06, verificado en vivo con `get_advisors`, sin volver a emitir `enable row level security` ni tocar las políticas existentes.
- **Sí:** revocar `EXECUTE` de `rls_auto_enable()` para `anon` y `authenticated` mediante una migración nueva. Decisión explícita del usuario: sigue la remediación que el propio advisor de Supabase recomienda.
- **No:** eliminar o reescribir `rls_auto_enable()`. Es una función de la plataforma Supabase (event trigger de auto-RLS), no del código de este repo; solo se le retira el permiso de invocación directa por rol.
- **Sí:** usar exactamente los 3 headers del ejemplo del checklist (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`), sin añadir HSTS, `Permissions-Policy` ni CSP. Decisión explícita del usuario: no ampliar el alcance más allá de lo pedido.
- **No:** configurar mínimo de contraseña, leaked password protection ni límite de signups por IP desde este repo. Decisión explícita del usuario: son ajustes del dashboard de Supabase Auth (o de su Management API), sin tool de MCP ni `config.toml` en este repo que los exponga; se documentan como precondición manual en `CLAUDE.md`, siguiendo el mismo patrón que SPEC 12 usó para la config de OAuth.
- **No:** añadir CAPTCHA/Turnstile a nivel de aplicación para mitigar signups automatizados. No lo pide el checklist; candidato a spec futura si el rate limit de Supabase resulta insuficiente.

---

## Risks

| Riesgo                                                                                                                    | Mitigación                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Revocar `EXECUTE` de `rls_auto_enable()` podría interferir con el auto-RLS de la plataforma en tablas nuevas.             | El event trigger dispara la función con los privilegios de su dueño (`SECURITY DEFINER`), no a través de un chequeo de `EXECUTE` por rol invocador; el revoke solo bloquea la llamada directa vía RPC/API. |
| `X-Frame-Options: DENY` global podría romper alguna integración futura que necesite embeber el sitio en un iframe.        | Hoy no existe ninguna integración conocida que lo requiera; si aparece, se ajusta el header en una spec futura.                                                                                            |
| Los 3 ajustes de dashboard quedan sin ejecutar al cerrar esta spec, dejando el checklist original parcialmente pendiente. | Documentados de forma explícita y con valores exactos en `CLAUDE.md`, para que no se pierdan y alguien con acceso al dashboard los aplique.                                                                |

---

## Lo que **no** entra en esta spec

- Configurar mínimo de contraseña, leaked password protection ni límite de signups por IP en el dashboard de Supabase Auth.
- CAPTCHA/Turnstile u otro anti-bot a nivel de aplicación.
- Headers adicionales (HSTS, `Permissions-Policy`, CSP).
- Cambios a las políticas RLS existentes de `games` y `scores`.
- Eliminar o modificar la definición de `rls_auto_enable()` más allá de revocar `EXECUTE`.

Cada uno de esos, si llega, va en su propia spec o se ejecuta directamente en el dashboard de Supabase.
