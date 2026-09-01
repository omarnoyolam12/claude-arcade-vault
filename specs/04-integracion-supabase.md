# SPEC 04 — Integración de Supabase (infraestructura: clientes, sesión SSR y variables de entorno)

> **Status:** Implementado
> **Depends on:** Ninguna
> **Date:** 2026-09-01
> **Objective:** Dejar Supabase cableado en la app de Next (cliente de navegador, cliente de servidor con cookies vía `@supabase/ssr`, middleware de refresco de sesión y variables de entorno documentadas), sin tocar ninguna pantalla de producto ni crear tablas.

---

## Por qué existe esta spec

Hasta ahora el proyecto no tiene backend con estado: SPEC 01 y 02 dejaron datos mock en `lib/*.ts`; SPEC 03 añadió un único envío de correo vía Resend, sin base de datos ni sesión. La plataforma necesita cuentas de usuario y puntuaciones persistidas, y Supabase será ese backend.

Esta spec **no** construye ninguna de esas features. Solo instala y configura Supabase para que las siguientes specs (auth real en `/acceso`, persistir puntuaciones, migrar el catálogo) partan de una base común y probada. Se aísla el riesgo de la integración —paquetes, patrón SSR de App Router, cookies asíncronas de Next 16, middleware— en un cambio pequeño y reversible.

**Regla de estilos (heredada de SPEC 01–03):** `app/globals.css` no se toca. Esta spec apenas tiene UI (solo una ruta de verificación temporal), y lo poco que renderiza usa utilidades Tailwind en el JSX.

---

## Scope

**In:**

- `package.json` — nuevas dependencias `@supabase/supabase-js` y `@supabase/ssr`.
- `.env.template` — se añaden y documentan tres variables:
  - `NEXT_PUBLIC_SUPABASE_URL` — URL del proyecto Supabase.
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — clave publicable (nueva nomenclatura de claves API de Supabase; segura para el navegador, respeta RLS).
  - `SUPABASE_SECRET_KEY` — clave secreta (service role, se salta RLS). **Solo se documenta**; ningún archivo de esta spec la lee. Queda lista para una spec futura que necesite operaciones administrativas.
- `lib/supabase/client.ts` — nuevo. Cliente para **componentes de navegador** (`"use client"`). Usa `createBrowserClient` de `@supabase/ssr` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Exporta una función `createClient()` que devuelve el cliente. Sin genéricos de tipos de base de datos (no hay tablas todavía).
- `lib/supabase/server.ts` — nuevo. Cliente para **Server Components, Server Actions y Route Handlers**. Usa `createServerClient` de `@supabase/ssr`, leyendo y escribiendo cookies con `cookies()` de `next/headers` (`await`, porque en Next 16 es asíncrono). Exporta una función `async createClient()`. El `set` de cookies va envuelto en `try/catch` (puede llamarse desde un Server Component donde no se pueden escribir cookies; el middleware se encarga del refresco real).
- `lib/supabase/middleware.ts` — nuevo. Exporta `updateSession(request: NextRequest): Promise<NextResponse>` siguiendo el patrón oficial de `@supabase/ssr` para App Router: crea un `NextResponse.next({ request })`, instancia un `createServerClient` que sincroniza las cookies de la request y la response, y llama a `supabase.auth.getUser()` (o `getClaims()`) para forzar el refresco del token. Devuelve la response con las cookies actualizadas. **No** redirige ni protege rutas (no hay auth aún).
- `middleware.ts` (raíz del repo) — nuevo. Exporta `middleware(request)` que delega en `updateSession`, y un `config.matcher` que excluye assets estáticos (`_next/static`, `_next/image`, `favicon.ico`, archivos de imagen).
- `app/debug/supabase/page.tsx` — nuevo. Ruta **temporal** de verificación, no enlazada desde ninguna navegación. Server Component que:
  - comprueba que `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` están definidas;
  - hace `fetch` a `${NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health` con el header `apikey` y muestra el status HTTP;
  - instancia el cliente de `lib/supabase/server.ts` y ejecuta `await supabase.auth.getUser()`, mostrando si hay usuario (`null` es lo esperado sin sesión) o un error;
  - pinta un bloque `OK` (verde) si el health responde 200 y `getUser()` no lanza, o el detalle del fallo en caso contrario.
    Su borrado se hace en la spec que consuma esta infraestructura.
- `AGENTS.md` — si `next dev` lo regenera, se commitea junto con el trabajo.

**Out of scope (para futuras specs):**

- Supabase Auth: conectar `/acceso` (registro/login), estado de sesión en el header, cerrar sesión, protección de rutas. `app/acceso/page.tsx` y `components/auth-tabs.tsx` **no se tocan**.
- Cualquier tabla, migración SQL, `supabase/migrations/`, RLS policies o seed. Esta spec no crea esquema.
- Generar `lib/supabase/database.types.ts` ni un script `gen:types`. Llega con la spec que cree la primera tabla; los clientes de esta spec van sin tipar.
- Cliente admin con `SUPABASE_SECRET_KEY` (`lib/supabase/admin.ts`). Solo se documenta la variable.
- Migrar `lib/games.ts`, `lib/leaderboards.ts` o `lib/activity.ts` a Supabase.
- Persistir los mensajes de contacto de SPEC 03 en Supabase.
- Realtime, Storage, Edge Functions.
- Supabase CLI local (`supabase start`), `config.toml`, entorno de desarrollo local con Docker.
- Tests automatizados (no hay framework configurado).
- Editar los archivos de las SPEC 01–03.

---

## Data model

Esta feature **no introduce estructuras de datos persistidas ni tablas**. No hay esquema SQL en esta spec.

Los únicos artefactos nuevos son los clientes de Supabase y las variables de entorno.

Variables de entorno (no versionadas; documentadas en `.env.template`):

```bash
NEXT_PUBLIC_SUPABASE_URL=                 # https://<ref>.supabase.co — expuesta al navegador
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=     # clave publicable (sb_publishable_...) — segura en cliente, respeta RLS
SUPABASE_SECRET_KEY=                      # clave secreta (sb_secret_...) — service role; SOLO documentada, sin uso en esta spec
```

Forma de los módulos nuevos (firmas, no implementación):

```ts
// lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";
export function createClient(): ReturnType<typeof createBrowserClient>;

// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
export function createClient(): Promise<ReturnType<typeof createServerClient>>;

// lib/supabase/middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
export function updateSession(request: NextRequest): Promise<NextResponse>;
```

Convenciones:

- Los tres módulos exportan una función `createClient` (no una instancia singleton). El de servidor es `async` por `await cookies()`.
- El código de navegador importa **solo** de `@/lib/supabase/client`; el de servidor, **solo** de `@/lib/supabase/server`. Nunca al revés.
- `SUPABASE_SECRET_KEY` no aparece en ningún import de esta spec; si se usara, sería exclusivamente en código de servidor.

---

## Implementation plan

1. **Dependencias.** `npm install @supabase/supabase-js @supabase/ssr`. `npm run build` sigue verde (nada las importa aún).

2. **Variables de entorno.** Añadir a `.env.template` las tres variables con sus comentarios (ver Data model). Crear/editar `.env.local` (ya ignorado por `.gitignore`) con la URL y la clave publicable reales del proyecto Supabase existente. `SUPABASE_SECRET_KEY` puede quedar vacía. Confirmar que `.env*` sigue ignorado salvo `.env.template`.

3. **Cliente de navegador.** Leer antes la guía oficial de `@supabase/ssr` para Next.js App Router y `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`. Crear `lib/supabase/client.ts` con `createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!)`. `npm run build` verde.

4. **Cliente de servidor.** Crear `lib/supabase/server.ts`: función `async createClient()` que hace `const cookieStore = await cookies()` y llama a `createServerClient(url, publishableKey, { cookies: { getAll, setAll } })`, con `setAll` envuelto en `try/catch`. Leer `node_modules/next/dist/docs/01-app/02-guides/authentication.md` para el patrón de cookies asíncronas en Next 16. `npm run build` verde.

5. **Helper de middleware.** Crear `lib/supabase/middleware.ts` con `updateSession` según el patrón de `@supabase/ssr`: response mutable, `createServerClient` que copia cookies request↔response, `await supabase.auth.getUser()`, `return response`. Sin redirecciones. `npm run build` verde.

6. **Middleware raíz.** Crear `middleware.ts` en la raíz: `export async function middleware(request) { return updateSession(request); }` y `export const config = { matcher: [...] }` excluyendo `_next/static`, `_next/image`, `favicon.ico` y extensiones de imagen. Consultar el convenio de archivo `middleware` en `node_modules/next/dist/docs` (sección `03-api-reference`). `npm run build` verde. Recorrer `/`, `/juegos`, `/acerca-de`, `/acceso`, `/salon-de-la-fama`, `/juegos/pac-man`, `/jugar/pac-man`: todas cargan igual que antes, sin errores en consola de servidor.

7. **Ruta de verificación temporal.** Crear `app/debug/supabase/page.tsx` (Server Component) que: valida presencia de las dos `NEXT_PUBLIC_*`; hace `fetch` a `/auth/v1/health` con header `apikey`; instancia el cliente de `@/lib/supabase/server` y ejecuta `await supabase.auth.getUser()`; renderiza `OK` o el detalle del error. Abrir `/debug/supabase` en el navegador: se ve `OK`, health `200`, usuario `null`.

8. **Prueba de degradación.** Renombrar temporalmente `NEXT_PUBLIC_SUPABASE_URL` en `.env.local`, reiniciar no aplica (lo hace el usuario en su terminal): la app sigue compilando; `/debug/supabase` muestra el fallo de configuración en vez de romper toda la app; el resto de rutas siguen navegables. Restaurar la variable.

9. **Cierre.** `npm run lint` y `npm run build` verdes. Recorrer manualmente `/`, `/juegos`, `/acceso`, `/acerca-de`, `/salon-de-la-fama`, `/juegos/pac-man`, `/jugar/pac-man` y `/debug/supabase`. Si `next dev` regeneró `AGENTS.md`, commitearlo junto con el trabajo.

---

## Acceptance criteria

- [ ] `npm run build` termina sin errores ni fallos de tipos.
- [ ] `npm run lint` pasa sin errores.
- [ ] `@supabase/supabase-js` y `@supabase/ssr` figuran en `dependencies` de `package.json`.
- [ ] `.env.template` documenta `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SECRET_KEY`; ningún valor real de esas variables está versionado.
- [ ] Existe `lib/supabase/client.ts` que exporta `createClient()` basado en `createBrowserClient` de `@supabase/ssr`.
- [ ] Existe `lib/supabase/server.ts` que exporta una función `async createClient()` basada en `createServerClient`, que hace `await cookies()` y protege la escritura de cookies con `try/catch`.
- [ ] Existe `lib/supabase/middleware.ts` que exporta `updateSession(request)` y llama a `supabase.auth.getUser()` para refrescar la sesión; no contiene ninguna redirección.
- [ ] Existe `middleware.ts` en la raíz que delega en `updateSession` y define un `config.matcher` que excluye `_next/static`, `_next/image` y `favicon.ico`.
- [ ] Con el middleware activo, `/`, `/juegos`, `/acerca-de`, `/acceso`, `/salon-de-la-fama`, `/juegos/pac-man` y `/jugar/pac-man` renderizan igual que antes de esta spec, sin errores nuevos en la consola del servidor.
- [ ] `SUPABASE_SECRET_KEY` no se importa ni se lee en ningún archivo de la app; solo aparece en `.env.template`.
- [ ] Con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` bien configuradas, `/debug/supabase` muestra `OK`: el health de `/auth/v1/health` responde `200` y `supabase.auth.getUser()` devuelve usuario `null` sin lanzar.
- [ ] Con `NEXT_PUBLIC_SUPABASE_URL` ausente o inválida, `/debug/supabase` muestra el fallo de configuración y **no** deja la app sin compilar ni tumba el resto de rutas.
- [ ] No existe ningún archivo `.sql`, carpeta `supabase/migrations/`, ni `lib/supabase/database.types.ts` en el repositorio tras esta spec.
- [ ] `app/acceso/page.tsx`, `components/auth-tabs.tsx` y los `lib/*.ts` de datos mock no se han modificado.
- [ ] `app/globals.css` no tiene reglas nuevas respecto al estado actual.
- [ ] Todo el texto visible de `/debug/supabase` está en español.

---

## Decisions

- **Sí:** alcance limitado a infraestructura (clientes, middleware, env), sin tocar pantallas ni crear tablas. Aísla el riesgo de la integración y da base común a las specs de auth y puntuaciones.
- **No:** meter en esta spec la autenticación real de `/acceso` o la migración del catálogo. Cada una es su propia spec; mezclarlas haría el cambio grande y difícil de revisar.
- **Sí:** `@supabase/ssr` con cliente de navegador y cliente de servidor separados más `middleware.ts` de refresco de sesión. Es el patrón oficial para App Router y es lo que necesitará la auth.
- **No:** un único `@supabase/supabase-js` de navegador. Sin sesión en Server Components ni middleware; habría que rehacerlo al añadir auth.
- **Sí:** nomenclatura nueva de claves API — `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SECRET_KEY`. Coincide con lo que expone el proyecto/MCP actual de Supabase.
- **No:** `NEXT_PUBLIC_SUPABASE_ANON_KEY` / service_role legacy. Nomenclatura en retirada.
- **Sí:** documentar `SUPABASE_SECRET_KEY` en `.env.template` pero sin crear cliente admin. La variable queda anotada; el `lib/supabase/admin.ts` llega cuando una spec lo necesite de verdad.
- **No:** añadir ya `lib/supabase/admin.ts`. Código muerto y una clave peligrosa cargada sin uso.
- **Sí:** ruta temporal `app/debug/supabase/page.tsx` como criterio de "terminado", con nota de borrado en una spec futura. Verificable de un vistazo en el navegador.
- **No:** un script `scripts/check-supabase.ts`. Sale del flujo normal (`next dev`) y añade dependencia de runner (`tsx`/`node --loader`).
- **No:** conformarse con "compila y lint pasa". Eso no prueba que las claves y la URL lleguen a Supabase.
- **Sí:** clientes sin tipar (`createClient()` sin genérico). No hay tablas; el archivo de tipos y el script `gen:types` van con la spec que cree la primera tabla.
- **Sí:** los tres módulos en `lib/supabase/` (`client.ts`, `server.ts`, `middleware.ts`) y `middleware.ts` en la raíz. Import vía `@/lib/supabase/*`. Es el patrón oficial documentado.
- **Sí:** `updateSession` llama a `auth.getUser()` aunque no haya auth. Es un no-op inofensivo hoy y deja el refresco de token cableado para cuando la haya.
- **No:** middleware que además proteja rutas o redirija. No hay nada que proteger todavía.
- **Desviación durante la implementación (2026-09-01):** Next 16 deprecó el convenio de archivo `middleware.ts` y lo renombró a `proxy.ts` (misma funcionalidad; cambian el nombre del archivo y el de la función exportada `middleware` → `proxy`). Ver `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/middleware.md`. El archivo raíz se crea como `proxy.ts` con `export async function proxy(request)` en lugar de `middleware.ts`. El helper interno sigue siendo `lib/supabase/middleware.ts` (nombre del patrón de `@supabase/ssr`, no afectado por la deprecación). Los criterios de aceptación que nombran `middleware.ts` en la raíz se leen como `proxy.ts`.

---

## Risks

| Riesgo                                                                                                                                       | Mitigación                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El middleware mal configurado (matcher demasiado amplio, response sin devolver cookies) rompe todas las rutas a la vez.                      | Seguir el patrón oficial de `@supabase/ssr` al pie; `config.matcher` excluye assets; el paso 6 recorre todas las pantallas antes de cerrar.                      |
| En Next 16 `cookies()` es asíncrono; un `cookies()` sin `await` falla el build o da tipos rotos.                                             | `lib/supabase/server.ts` hace `await cookies()` y la función es `async`; `npm run build` valida los tipos. Se lee `authentication.md` de los docs de Next antes. |
| Escribir cookies desde un Server Component lanza; sin `try/catch` en `setAll`, cualquier página que instancie el cliente de servidor se cae. | `setAll` va envuelto en `try/catch`; el refresco real de cookies lo hace el middleware, no el Server Component.                                                  |
| Faltan `NEXT_PUBLIC_*` en el entorno de despliegue y la app peta en producción en vez de degradar.                                           | `/debug/supabase` distingue "config ausente" de "fallo de red"; el criterio de aceptación cubre el camino de variable ausente sin tumbar el resto.               |
| `SUPABASE_SECRET_KEY` acaba en un bundle de cliente por un import descuidado.                                                                | Ningún archivo de esta spec la importa; criterio de aceptación explícito de que solo vive en `.env.template`.                                                    |
| La ruta `/debug/supabase` se queda olvidada y expuesta en producción.                                                                        | Marcada como temporal en la spec; la spec que consuma esta infraestructura la borra. No está enlazada desde ninguna navegación.                                  |
| `next dev` reescribe `AGENTS.md` y deja el árbol sucio.                                                                                      | Commitear el `AGENTS.md` regenerado junto con el trabajo (paso 9).                                                                                               |

---

## Lo que **no** entra en esta spec

- Supabase Auth: login/registro en `/acceso`, sesión en el header, logout, protección de rutas.
- Tablas, migraciones SQL, `supabase/migrations/`, RLS, seed.
- `lib/supabase/database.types.ts` y script `gen:types`.
- Cliente admin con `SUPABASE_SECRET_KEY`.
- Migrar `games`, `leaderboards` o `activity` a Supabase; persistir los mensajes de contacto.
- Realtime, Storage, Edge Functions, Supabase CLI local.
- Tests automatizados; edición de las SPEC 01–03.

Cada uno de esos, si llega, va en su propia spec.
