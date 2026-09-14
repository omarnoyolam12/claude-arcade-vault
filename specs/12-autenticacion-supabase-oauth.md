# SPEC 12 — Autenticación real con Supabase (email/contraseña + Google + GitHub)

> **Status:** Implementado
> **Depends on:** SPEC 01, SPEC 04
> **Date:** 2026-09-14
> **Objective:** Reemplazar la maqueta visual de `/acceso` por autenticación real de Supabase Auth (email/contraseña con confirmación por correo, más OAuth con Google y GitHub), reflejando el estado de sesión en el header global, sin tocar el guardado de puntuaciones.

---

## Por qué existe esta spec

`lib/supabase/server.ts`, `client.ts` y `middleware.ts` (SPEC 04) ya están cableados para sesión por cookies vía `@supabase/ssr`, pero nadie los usa todavía: `components/auth-tabs.tsx` es una maqueta cuyo único `onSubmit` es `event.preventDefault()`.

El diseño de referencia es la pantalla **"Acceso Rediseñado"** del proyecto Stitch "Arcade Vault Retro Portal". Revisado su HTML: reproduce el mismo layout que ya existe en `auth-tabs.tsx` (pestañas Iniciar sesión / Crear cuenta, campo "Usuario" + contraseña en login, correo + usuario + contraseña en registro, botón "Jugar como invitado") y **no incluye botones de Google/GitHub** ni usa la fuente Material Symbols (que este repo no carga en ningún otro lado). Por eso los botones OAuth se añaden como una extensión del diseño existente, con iconos SVG inline en el mismo patrón que ya usa `auth-tabs.tsx` (`UserIcon`, `LockIcon`, etc.), y el campo "Usuario" del login se cambia a "Correo electrónico" para poder usar `signInWithPassword` nativo de Supabase sin tablas intermedias.

---

## Scope

**In:**

- `components/auth-tabs.tsx` — reescrito para autenticación real:
  - Login: campo "Correo electrónico" (ya no "Usuario") + contraseña, contra `signInWithPassword`.
  - Registro: correo + usuario + contraseña (sin cambios de campos), el usuario se guarda en `user_metadata.username` al hacer `signUp`.
  - Debajo del botón primario de **cada** formulario (login y registro), dos botones "Continuar con Google" / "Continuar con GitHub" con icono SVG inline, que disparan `signInWithOAuth`. Si el usuario se registra por un proveedor, el nombre a mostrar se toma de los metadatos que ya trae el proveedor (`full_name` / `user_name` / `name`), sin pedir username aparte.
  - Errores de servidor (credenciales inválidas, correo ya registrado, fallo de OAuth) se muestran inline con el estilo neon existente.
  - Tras un registro con email/contraseña exitoso, se muestra un aviso "Revisa tu correo para confirmar tu cuenta" en vez de iniciar sesión de inmediato (confirmación de correo obligatoria, ver Decisions).
- `app/acceso/actions.ts` — **nuevo**. Server Actions sobre `createClient()` de `lib/supabase/server.ts`:
  - `registrarConCredenciales(prevState, formData)` — valida en servidor y llama `auth.signUp({ email, password, options: { data: { username } } })`.
  - `iniciarSesionConCredenciales(prevState, formData)` — `auth.signInWithPassword({ email, password })`.
  - `iniciarSesionOAuth(provider: "google" | "github")` — `auth.signInWithOAuth({ provider, options: { redirectTo } })` y `redirect(data.url)`.
  - `cerrarSesion()` — `auth.signOut()` y `redirect("/")`.
  - `solicitarRestablecimiento(prevState, formData)` — `auth.resetPasswordForEmail(email, { redirectTo })`.
  - `actualizarContrasena(prevState, formData)` — `auth.updateUser({ password })`.
- `app/auth/callback/route.ts` — **nuevo**. Route Handler que recibe `code` desde Supabase (tanto para el `redirectTo` de OAuth como para el enlace de confirmación de correo), llama `auth.exchangeCodeForSession(code)` y redirige a `/` en éxito o a `/acceso?error=...` en fallo.
- `app/acceso/restablecer/page.tsx` — **nuevo**. Formulario de un campo (correo) contra `solicitarRestablecimiento`, mismo gabinete CRT/bezel que `/acceso`.
- `app/acceso/nueva-contrasena/page.tsx` — **nuevo**. Formulario de contraseña nueva contra `actualizarContrasena`, accesible tras seguir el enlace del correo de recuperación.
- `app/acceso/page.tsx` — lee `searchParams` (Next 16, asíncrono) para mostrar el aviso de "revisa tu correo" y errores redirigidos desde `app/auth/callback/route.ts`. El enlace "¿Olvidaste tu contraseña?" de `auth-tabs.tsx` apunta a `/acceso/restablecer`.
- `components/site-header.tsx` — pasa a ser `async`: obtiene `data: { user }` de `createClient().auth.getUser()` (server). Con sesión: muestra el nombre (helper `getDisplayName`, ver Data model) y un `<form action={cerrarSesion}>` con botón "Cerrar sesión" en vez del enlace "Acceder". Sin sesión: comportamiento actual, sin cambios.
- `components/mobile-nav.tsx` — recibe `isAuthenticated` y `displayName` como props desde `SiteHeader`; el último ítem del menú pasa de "Acceder" a "Cerrar sesión" (mismo `<form action={cerrarSesion}>`) cuando hay sesión.
- `lib/auth.ts` — **nuevo**. Helper `getDisplayName(user)` que resuelve el nombre a mostrar: `user_metadata.username` → `full_name` → `user_name` → `name` → prefijo del correo → `"Jugador"`.
- `CLAUDE.md` — actualizar el bullet de **Acceso** (hoy dice "maqueta de login/registro... sin autenticación real todavía") para reflejar que ya hay autenticación real.
- `AGENTS.md` — si `next dev` lo regenera durante el trabajo, se commitea junto con el resto.

**Out of scope (para futuras specs):**

- Vincular las puntuaciones guardadas (`public.scores`, Salón de la Fama) al usuario autenticado, reemplazando el nombre fijo `"G4M3R_X"` de las Server Actions `guardarPuntuacion*`. Decisión explícita del usuario: queda fuera.
- Proteger cualquier ruta detrás de sesión iniciada (`/jugar/*` u otras). Decisión explícita: nada se protege en esta spec; el login solo mejora el header y `/acceso`. Rutas protegidas y scope por cuenta quedan para una spec futura.
- Perfil de usuario, edición de cuenta, avatar, cambio de correo.
- Tabla `public.profiles` u otra relación en Supabase para el username (se usa `user_metadata`, ver Decisions).
- Configurar las apps OAuth en Google Cloud Console y en GitHub (Settings → Developer settings → OAuth Apps), y registrar sus Client ID/Secret en el dashboard de Supabase Auth (Authentication → Providers), así como activar "Confirm email" si no lo está por defecto. Son pasos manuales en consolas externas, fuera de este repo — se documentan como precondición, no se ejecutan en esta spec.
- Rediseño visual de `/acceso` más allá de añadir los botones OAuth y las dos páginas nuevas de recuperación de contraseña (se mantiene el diseño "Acceso Rediseñado" de Stitch).
- Tests automatizados (no hay framework configurado).

---

## Data model

Esta feature no crea tablas nuevas en Supabase — usa `auth.users` (gestionada por Supabase Auth) y su `user_metadata`.

```ts
// lib/auth.ts
import type { User } from "@supabase/supabase-js";

function getDisplayName(user: User): string {
  const metadata = user.user_metadata as Record<string, unknown>;
  return (
    (metadata.username as string) ||
    (metadata.full_name as string) ||
    (metadata.user_name as string) ||
    (metadata.name as string) ||
    user.email?.split("@")[0] ||
    "Jugador"
  );
}
```

```ts
// app/acceso/actions.ts
export interface AuthActionState {
  ok: boolean;
  formError?: string;
  fieldErrors?: { email?: string; password?: string; username?: string };
  info?: string; // p.ej. "Revisa tu correo para confirmar tu cuenta"
}
```

`signUp` recibe `options: { data: { username } }`, que Supabase guarda en `raw_user_meta_data` de `auth.users`. Para registros vía Google/GitHub, Supabase puebla `user_metadata` automáticamente con lo que exponga cada proveedor (`full_name`, `user_name`, `name`, `avatar_url`); no se pide username en ese flujo.

---

## Implementation plan

1. **Route Handler de callback.** Crear `app/auth/callback/route.ts`: recibe `code` por query string, usa `createClient()` (server) para `auth.exchangeCodeForSession(code)`, redirige a `/` en éxito o a `/acceso?error=callback` en fallo. Verificar que `npm run build` compila la ruta nueva aunque nada la invoque todavía.
2. **Server Actions de credenciales.** Crear `app/acceso/actions.ts` con `registrarConCredenciales` y `iniciarSesionConCredenciales` (validación de email/password en servidor + llamada a Supabase), devolviendo `AuthActionState`. Probar con un formulario temporal o `curl` que un registro válido crea el usuario (verificar con `mcp__supabase__execute_sql` sobre `auth.users` o el dashboard).
3. **Cablear login/registro real.** Reescribir `components/auth-tabs.tsx`: cambiar el campo de login a "Correo electrónico", usar `useActionState` (mismo patrón que `sendContactMessage` en `app/acerca-de/actions.ts`) contra las dos Server Actions del paso 2, mostrar `fieldErrors`/`formError`/`info` inline. Quitar `preventSubmit`. Verificar en el navegador: registrar con datos de prueba y ver el aviso de "revisa tu correo".
4. **Botones OAuth.** Añadir a `auth-tabs.tsx`, debajo del botón primario de cada formulario, "Continuar con Google" y "Continuar con GitHub" (iconos SVG inline, mismo patrón que los íconos ya existentes en el archivo). Implementar `iniciarSesionOAuth` en `app/acceso/actions.ts` (`signInWithOAuth` + `redirect(data.url)`, con `redirectTo` construido a partir del origin de la request, nunca de un input del usuario). Verificar que el botón redirige a la pantalla de consentimiento del proveedor (aunque falle por credenciales no configuradas todavía en el dashboard).
5. **Cierre de sesión.** Añadir `cerrarSesion` a `app/acceso/actions.ts` (`auth.signOut()` + `redirect("/")`).
6. **Header con estado de sesión.** Convertir `components/site-header.tsx` en `async`: leer `auth.getUser()`, calcular el nombre con `getDisplayName`. Con sesión: nombre + `<form action={cerrarSesion}>` con botón "Cerrar sesión" en vez de "Acceder". Sin sesión: sin cambios. Pasar `isAuthenticated`/`displayName` a `MobileNav`.
7. **Menú móvil con sesión.** Actualizar `components/mobile-nav.tsx` para aceptar esas props y sustituir el último ítem por "Cerrar sesión" (mismo `<form action={cerrarSesion}>`) cuando hay sesión, manteniendo "Acceder" cuando no la hay.
8. **Recuperar contraseña — solicitud.** Crear `app/acceso/restablecer/page.tsx` (mismo gabinete visual que `/acceso`) con un formulario de correo contra `solicitarRestablecimiento`. Cablear el enlace "¿Olvidaste tu contraseña?" de `auth-tabs.tsx` a esta ruta. Verificar que siempre muestra el mismo mensaje de confirmación, exista o no el correo.
9. **Recuperar contraseña — nueva contraseña.** Crear `app/acceso/nueva-contrasena/page.tsx` con un formulario de contraseña nueva contra `actualizarContrasena`. Verificar el flujo completo: solicitar reset, seguir el enlace del correo, fijar contraseña nueva, iniciar sesión con ella.
10. **Mensajes de estado en `/acceso`.** Leer `searchParams` (async en Next 16) en `app/acceso/page.tsx` para mostrar el aviso de confirmación pendiente y los errores redirigidos desde `app/auth/callback/route.ts`.
11. **Cierre.** `npm run lint` y `npm run build` verdes. Recorrer manualmente: registro + confirmación de correo, login con credenciales, login con Google, login con GitHub, cierre de sesión desde desktop y mobile nav, recuperación de contraseña completa. Actualizar el bullet de "Acceso" en `CLAUDE.md`. Si `next dev` regeneró `AGENTS.md`, commitearlo.

---

## Acceptance criteria

- [ ] `npm run build` termina sin errores ni fallos de tipos.
- [ ] `npm run lint` pasa sin errores.
- [ ] En `/acceso`, el formulario de login pide "Correo electrónico" (no "Usuario") y contraseña.
- [ ] Registrarse con correo/usuario/contraseña válidos crea un usuario real en Supabase Auth (verificable en `auth.users`) y muestra el aviso "Revisa tu correo para confirmar tu cuenta", sin iniciar sesión de inmediato.
- [ ] Intentar iniciar sesión antes de confirmar el correo muestra un error controlado, no una excepción sin manejar.
- [ ] Tras confirmar el correo (seguir el enlace) e iniciar sesión con esas credenciales, el header muestra el username elegido en el registro y ya no el enlace "Acceder".
- [ ] Cada formulario (login y registro) muestra, debajo de su botón primario, los botones "Continuar con Google" y "Continuar con GitHub".
- [ ] Pulsar "Continuar con Google" o "Continuar con GitHub" redirige al flujo de consentimiento del proveedor correspondiente.
- [ ] Completar el login con Google o GitHub redirige de vuelta a `/` con sesión iniciada, y el header muestra el nombre que trae el proveedor (sin haberlo pedido en un formulario).
- [ ] Con sesión iniciada, el header (desktop y menú móvil) muestra un botón "Cerrar sesión" que, al pulsarlo, termina la sesión y vuelve a mostrar "Acceder".
- [ ] `/acceso/restablecer` permite pedir un correo de recuperación y siempre muestra el mismo mensaje de confirmación, exista o no esa cuenta.
- [ ] Seguir el enlace del correo de recuperación lleva a `/acceso/nueva-contrasena`, donde fijar una contraseña nueva permite iniciar sesión con ella a continuación.
- [ ] Ninguna ruta del sitio (`/jugar/*`, `/juegos`, `/salon-de-la-fama`, etc.) cambia su comportamiento por no tener sesión iniciada: todo sigue accesible igual que antes de esta spec.
- [ ] Las Server Actions `guardarPuntuacion*` de los juegos jugables no cambian de línea (esta spec no toca el guardado de puntuaciones).
- [ ] `public.scores` y sus políticas RLS no cambian (esta spec no crea ni modifica tablas de Supabase).
- [ ] Todo el texto visible nuevo está en español con acentos correctos donde aplique.

---

## Decisions

- **Sí:** botones "Continuar con Google/GitHub" debajo del botón primario de cada formulario, no arriba de las pestañas. Decisión explícita del usuario: mantiene el diseño de Stitch como base y añade OAuth como alternativa secundaria dentro de cada tab, en vez de rediseñar el encabezado de la tarjeta.
- **No:** volver a Stitch a diseñar los botones antes de escribir código. El patrón de iconos SVG inline ya existe en `auth-tabs.tsx`; no hace falta un diseño nuevo para dos botones adicionales con ese mismo lenguaje visual.
- **Sí:** cambiar el campo de login de "Usuario" a "Correo electrónico" y usar `signInWithPassword` nativo de Supabase. Decisión explícita del usuario. Evita una tabla intermedia usuario→email solo para el login.
- **Sí:** en el registro por email/contraseña se sigue pidiendo username (campo ya existente en el diseño); en OAuth se toma el nombre que ya trae el proveedor, sin pedirlo aparte. Decisión explícita del usuario.
- **Sí:** guardar el username en `user_metadata` de Supabase Auth (`signUp({ options: { data: { username } } })`), sin tabla `profiles`. Decisión explícita del usuario: no hace falta relación en Supabase porque nada más en esta spec consulta el username por SQL; el helper `getDisplayName` lo lee directo de `user.user_metadata`.
- **No:** vincular las puntuaciones del Salón de la Fama al usuario autenticado en esta spec. Decisión explícita del usuario: se deja fuera para no ampliar el alcance a `public.scores`, sus políticas RLS y las cinco Server Actions `guardarPuntuacion*`. Candidato a spec futura.
- **No:** proteger ninguna ruta detrás de sesión iniciada. Decisión explícita del usuario: el catálogo, el reproductor y el guardado de puntuaciones (anónimo, como hoy) siguen funcionando igual sin cuenta; el scope asociado a cuenta se diseñará en una próxima implementación.
- **Sí:** mostrar usuario + botón "Cerrar sesión" en el header global (desktop y mobile), no solo dentro de `/acceso`. Decisión explícita del usuario: sin esto no habría forma visible de confirmar que la sesión quedó activa ni de cerrarla desde fuera de `/acceso`.
- **Sí:** redirección post-login/registro siempre a `/` (Home), tanto para credenciales como para OAuth. Decisión explícita del usuario: evita manejar y validar un parámetro `redirectTo` de origen (riesgo de redirección abierta) para una mejora que no se pidió.
- **Sí:** exigir confirmación de correo antes de poder iniciar sesión con email/contraseña (comportamiento por defecto de Supabase Auth). Decisión explícita del usuario. Los logins con Google/GitHub no la necesitan: el proveedor ya verificó el correo.
- **Sí:** implementar el flujo real de "¿Olvidaste tu contraseña?" (`resetPasswordForEmail` + página de nueva contraseña) en esta spec. Decisión explícita del usuario, revirtiendo la recomendación inicial de dejarlo fuera.
- **Sí:** las Server Actions de auth (`app/acceso/actions.ts`) usan `createClient()` de `lib/supabase/server.ts` (cookies SSR), igual que el resto del proyecto ya prepara en `middleware.ts`. Ningún flujo de esta spec usa el cliente `anon.ts` (reservado para catálogo/leaderboard) ni instancia Supabase directamente desde componentes cliente para escribir sesión.
- **No:** crear un componente cliente aparte para el botón de cerrar sesión. Next 16 permite `<form action={cerrarSesion}>` directo en un Server Component; no hace falta `"use client"` solo para despachar una Server Action sin estado local.
- **Sí:** documentar la configuración de las apps OAuth (Google Cloud Console, GitHub OAuth App) y su registro en el dashboard de Supabase Auth como precondición manual fuera de este repo, no como parte del plan de implementación. Decisión explícita del usuario: son consolas externas a las que el código no tiene acceso.

---

## Risks

| Riesgo                                                                                                                                                                                                                                                                                                                                                       | Mitigación                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Los proveedores Google/GitHub no están configurados todavía en el dashboard de Supabase Auth cuando se implemente esta spec.                                                                                                                                                                                                                                 | Paso 4 del plan verifica solo que el botón redirige al flujo de consentimiento; el login completo con esos proveedores requiere la precondición manual documentada en Scope/Decisions.                                                                                                                                                                                      |
| `redirectTo` de `signInWithOAuth` / `resetPasswordForEmail` construido con un valor no confiable abriría una redirección abierta.                                                                                                                                                                                                                            | Se construye siempre a partir del origin de la request en el servidor (`request.headers.get("origin")` o `process.env` equivalente), nunca de un input o query param del usuario.                                                                                                                                                                                           |
| Probar la confirmación de correo y la recuperación de contraseña requiere acceso real a una bandeja de entrada.                                                                                                                                                                                                                                              | Paso 11 del plan lo recorre manualmente con una cuenta de correo de prueba real; alternativamente se puede confirmar el usuario a mano desde el dashboard de Supabase para probar el resto del flujo.                                                                                                                                                                       |
| `site-header.tsx` pasa de síncrono a `async`; algún caller podría no esperar la promesa.                                                                                                                                                                                                                                                                     | Los seis usos de `<SiteHeader>` están en Server Components (páginas de `app/`), que ya soportan `await` de componentes async de forma nativa en Next 16.                                                                                                                                                                                                                    |
| Un usuario que se registra por email y luego inicia sesión con Google usando el mismo correo podría generar dos identidades separadas si Supabase no las enlaza automáticamente.                                                                                                                                                                             | Aceptado para esta spec: no se implementa enlace de identidades (`linkIdentity`); queda como comportamiento por defecto de Supabase Auth, documentable en una spec futura si se vuelve un problema real.                                                                                                                                                                    |
| `site-header.tsx` lee `cookies()` (vía `auth.getUser()`) para mostrar el estado de sesión, lo que fuerza a Next a renderizar dinámicamente (`ƒ`) toda página que lo use — `/`, `/juegos`, `/juegos/[slug]`, `/jugar/[slug]`, `/salon-de-la-fama`, `/acerca-de` dejan de ser estáticas/SSG. Confirmado en `npm run build` durante la implementación (Paso 6). | Aceptado para esta spec (decisión explícita del usuario durante la implementación): recuperar el prerenderizado exigiría activar `cacheComponents` (experimental, repo-wide) y migrar con `'use cache'` las demás páginas estáticas — cambio de arquitectura de renderizado que excede el alcance de SPEC 12. Candidato a spec futura si el impacto de performance importa. |

---

## Lo que **no** entra en esta spec

- Vincular las puntuaciones del Salón de la Fama al usuario autenticado.
- Proteger rutas detrás de sesión iniciada.
- Perfil de usuario, edición de cuenta, avatar, cambio de correo.
- Tabla `public.profiles` u otra relación en Supabase para el username.
- Configurar las apps OAuth en Google Cloud Console/GitHub ni sus credenciales en el dashboard de Supabase (paso manual precondición).
- Rediseño visual de `/acceso` más allá de los botones OAuth y las páginas de recuperación de contraseña.
- Tests automatizados.

Cada uno de esos, si llega, va en su propia spec.
