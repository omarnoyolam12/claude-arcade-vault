# SPEC 03 — Página "Acerca de" en `/acerca-de` con formulario de contacto que envía email vía Resend

> **Status:** Implementado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-08-31
> **Objective:** Construir la página `/acerca-de` (mockup `resources/about`) con su hero, fila de features y sección de contacto, y hacer que el formulario de contacto envíe un email de notificación al equipo mediante Resend a través de una Server Action.

---

## Por qué existe esta spec

La SPEC 02 dejó fuera explícitamente la página "Acerca de" del nav del mockup ("**No:** añadir la página 'Acerca de' del nav del mockup. Fuera de alcance."). Esta spec la construye y añade la primera pieza de backend real del proyecto: el envío de correo.

Hasta ahora ningún formulario enviaba nada (SPEC 01: "los formularios no envían nada"). El formulario de contacto de `/acerca-de` sí envía: una Server Action recibe los datos, los valida en el servidor y llama a la API de Resend para mandar un email al buzón del equipo. Es la excepción acotada a la regla de "sin backend"; sigue sin haber base de datos, sesión ni persistencia.

**Regla de estilos (heredada de SPEC 01 y 02):** `app/globals.css` no se toca. Todo estilo adicional se resuelve con utilidades de Tailwind en el JSX, incluidos valores arbitrarios (`shadow-[...]`, `bg-[repeating-linear-gradient(...)]`, `[transform:perspective(500px)_rotateX(60deg)_scale(2)]`). No se añaden reglas, clases ni `@layer` a `globals.css`, ni archivos CSS por pantalla.

**Fuente "Press Start 2P" (heredada de SPEC 02):** ya está cargada en `app/layout.tsx` con `next/font/google` y expuesta como `--font-press-start`. Se aplica por `style` inline (`style={{ fontFamily: "var(--font-press-start), var(--font-anybody), monospace" }}`) porque las reglas de elemento sin capa de `globals.css` (`h1{}`, `span{}`) ganan a una utilidad de Tailwind. En esta página se usa **solo** en el `<h1>` del hero y en los rótulos `• ACERCA DE` / `• CONTACTO`.

---

## Scope

**In:**

- Ruta `/acerca-de` — **Acerca de** (mockup `resources/about/code.html` + `screen.png`). Estructura, de arriba abajo:
  1. `SiteHeader active="acerca"` (variante `nav`).
  2. **Fondo decorativo:** rejilla cian en perspectiva (`components/perspective-grid.tsx`, nuevo), posicionada en absoluto detrás del contenido (`-z-10`), `pointer-events-none`, con máscara de desvanecido. Recreada con utilidades Tailwind a partir del `<div>` con `background-image` de líneas y `transform: perspective(...) rotateX(60deg) scale(2)` del mockup.
  3. **Hero:** rótulo `• ACERCA DE` (en "Press Start 2P"), `<h1>` a tres líneas ("ACERCA DE" / "ARCADE" / "VAULT") en "Press Start 2P" con los tres tratamientos de color del mockup (blanco, contorno cian, magenta con glow), y párrafo de misión. Texto literal del mockup.
  4. **Fila de features:** grid de 3 tarjetas estáticas ("Hecho con ♥ para jugadores", "Juegos en HTML — corren en cualquier navegador", "Proyecto en constante crecimiento"), cada una con su icono SVG y su título. Texto literal del mockup. El estilo `cabinet-box` del mockup se recrea con utilidades Tailwind (borde `primary-fixed-dim`, `bg-surface-container`, `shadow-[inset_0_0_10px_rgba(0,220,229,0.2)]`).
  5. **Divisor:** la tira de segmentos de colores del mockup.
  6. **Sección de contacto:** dos columnas. Izquierda: rótulo `• CONTACTO` (en "Press Start 2P"), título "CONTÁCTANOS", párrafo y lista de 3 viñetas ("Respuesta en 24-48h", "Sugerencias bienvenidas", "Sin spam, jamás"). Derecha: `components/contact-form.tsx` (nuevo, `"use client"`).
  7. `SiteFooter`.
- `components/contact-form.tsx` — nuevo, `"use client"`. Formulario con campos `nombre` (texto), `email` (email) y `mensaje` (textarea), un campo honeypot oculto (`empresa`), y botón "ENVIAR". Usa `useActionState(sendContactMessage, initialState)` de React. Muestra:
  - estado `pending`: botón deshabilitado con texto "ENVIANDO...".
  - estado de error de la acción: banner rojo (`border-error`, `text-error`) **encima** del formulario con el mensaje devuelto; los campos conservan su valor.
  - estado de éxito: banner cian ("MENSAJE ENVIADO — TE RESPONDEMOS EN 24-48H") **encima** del formulario, que permanece visible; los campos se limpian.
  - errores de validación por campo (texto corto bajo cada input) devueltos por la acción.
- `app/acerca-de/actions.ts` — nuevo. Server Action `sendContactMessage(prevState, formData)`:
  - Extrae `nombre`, `email`, `mensaje`, `empresa` (honeypot) de `formData`.
  - Si el honeypot `empresa` trae valor no vacío: devuelve `{ ok: true }` sin enviar nada (descarte silencioso).
  - Valida en el servidor: `nombre` 2–80 caracteres; `email` con formato válido y ≤ 120 caracteres; `mensaje` 10–2000 caracteres. Si algo falla, devuelve `{ ok: false, fieldErrors }` sin llamar a Resend.
  - Si falta `RESEND_API_KEY` en el entorno: devuelve `{ ok: false, formError: "El envío de correo no está configurado." }` y registra un `console.error`. No lanza.
  - Llama a la API de Resend (paquete `resend`) con `from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"`, `to = process.env.CONTACT_TO_EMAIL`, `replyTo = email` del visitante, `subject = "Nuevo mensaje de contacto — Arcade Vault"` y cuerpo (texto + HTML simple) con nombre, email y mensaje.
  - Si Resend responde con error o la llamada lanza: devuelve `{ ok: false, formError: "No se pudo enviar el mensaje. Inténtalo de nuevo." }` y `console.error` con el detalle.
  - En éxito: devuelve `{ ok: true }`.
  - No hay `revalidatePath` ni `redirect` (no se muta cache ni se navega).
- `components/perspective-grid.tsx` — nuevo. Fondo decorativo de rejilla en perspectiva. Sin animación, sin `<style>`, sin `@keyframes`. Solo utilidades Tailwind con valores arbitrarios.
- `components/site-header.tsx` y `components/mobile-nav.tsx` — el union `active` pasa de `"inicio" | "juegos" | "salon"` a `"inicio" | "juegos" | "salon" | "acerca"`. Se añade el enlace "Acerca de" → `/acerca-de` en el nav desktop (después de "Salón de la Fama") y en la lista `LINKS` del menú móvil (después de "Salón de la Fama", antes de "Acceder").
- `package.json` — nueva dependencia `resend`.
- `.env.template` — nuevo. Documenta `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (opcional, por defecto `onboarding@resend.dev`) y `CONTACT_TO_EMAIL`.

**Out of scope (para futuras specs):**

- El API key real de Resend y la verificación de un dominio propio. La spec deja el código listo y las variables documentadas en `.env.template`; el usuario aporta `RESEND_API_KEY` y define `CONTACT_TO_EMAIL` en `.env.local` (ya ignorado por `.gitignore`) después.
- Autorespuesta / email de confirmación al visitante. Solo se envía la notificación al equipo.
- Persistir los mensajes de contacto (base de datos, hoja, archivo).
- Plantillas de email con `@react-email/*` o `react-dom/server`. El cuerpo es un string HTML/texto simple montado a mano.
- Rate-limiting, CAPTCHA / reCAPTCHA / Turnstile. La única defensa anti-spam es el honeypot.
- Adjuntos en el formulario.
- Tests automatizados (no hay framework configurado).
- Enlaces del footer ("Soporte", "Privacidad", "Términos") siguen sin destino real.
- Añadir "Acerca de" al footer (el mockup no lo lleva ahí).
- Modo claro e i18n adicional.
- Editar los archivos de las SPEC 01 y 02.

---

## Data model

Esta feature **no introduce estructuras de datos persistidas**. No hay `lib/` nuevo de catálogo. Los únicos tipos nuevos describen el estado de la Server Action y viven en `app/acerca-de/actions.ts`:

```ts
// app/acerca-de/actions.ts
export interface ContactFormState {
  ok: boolean;                       // true tras un envío correcto (o descarte por honeypot)
  formError?: string;                // error global (config ausente, fallo de Resend)
  fieldErrors?: {                    // errores de validación por campo
    nombre?: string;
    email?: string;
    mensaje?: string;
  };
}

export const initialContactState: ContactFormState = { ok: false };

export async function sendContactMessage(
  prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState>;
```

Variables de entorno (no versionadas; documentadas en `.env.template`):

```bash
RESEND_API_KEY=            # obligatoria para enviar; sin ella la acción devuelve formError
RESEND_FROM_EMAIL=         # opcional; por defecto "onboarding@resend.dev"
CONTACT_TO_EMAIL=          # buzón del equipo que recibe las notificaciones
```

Convenciones:

- La validación vive **solo en el servidor** (la acción). El cliente se apoya en `required` / `type="email"` nativos y en renderizar los errores que devuelve la acción; no duplica reglas.
- Límites: `nombre` 2–80, `email` ≤ 120 y con `@`/dominio, `mensaje` 10–2000. Se recortan (`trim`) antes de validar.
- El honeypot es el campo `empresa`; oculto con clases Tailwind (`sr-only` + `aria-hidden` + `tabIndex={-1}` + `autoComplete="off"`), nunca con `type="hidden"`.

---

## Implementation plan

1. **Dependencia y variables de entorno.** `npm install resend`. Crear `.env.template` con `RESEND_API_KEY`, `RESEND_FROM_EMAIL` y `CONTACT_TO_EMAIL` comentadas. Verificar que `.env*` sigue en `.gitignore` (ya lo está). `npm run build` sigue verde (la dependencia no se importa aún).

2. **Server Action.** Leer antes `node_modules/next/dist/docs/01-app/02-guides/forms.md` y `.../02-guides/server-actions.md`. Crear `app/acerca-de/actions.ts` con `"use server"`, el tipo `ContactFormState`, `initialContactState` y `sendContactMessage(prevState, formData)`: extracción de campos, descarte por honeypot, validación con los límites del data model, guardas de `RESEND_API_KEY` y `CONTACT_TO_EMAIL`, llamada a `new Resend(apiKey).emails.send({...})` con `replyTo`, y manejo de error (nunca lanza; siempre devuelve `ContactFormState`). `npm run build` verde.

3. **Formulario cliente.** Crear `components/contact-form.tsx` (`"use client"`): `const [state, formAction, pending] = useActionState(sendContactMessage, initialContactState)`. `<form action={formAction}>` con los tres campos del mockup (label en `text-primary-fixed` uppercase, input/textarea con borde `outline-variant` y `focus:border-primary-fixed focus:shadow-[0_0_10px_rgba(99,247,255,0.4)]`), el honeypot `empresa` (`sr-only`), el banner de éxito/error encima del form y los `fieldErrors` bajo cada campo. Botón "ENVIAR" (`bg-secondary-container`) con `disabled={pending}` y texto "ENVIANDO..." mientras `pending`. Estilo portado del mockup con utilidades Tailwind. No se monta en ninguna página todavía; `npm run build` verde.

4. **Fondo de rejilla.** Crear `components/perspective-grid.tsx`: un `<div aria-hidden>` absoluto (`absolute inset-0 -z-10 pointer-events-none opacity-20`) con `background-image` de dos gradientes de líneas cian (`--color-primary-fixed-dim`), `background-size: 50px 50px`, `[transform:perspective(500px)_rotateX(60deg)_scale(2)]`, `origin-top` y `[mask-image:linear-gradient(to_bottom,transparent,black)]`. Todo en `className` / `style` inline; sin CSS nuevo.

5. **Página `/acerca-de` — estructura estática.** Crear `app/acerca-de/page.tsx` (Server Component). Componer `SiteHeader active="acerca"`, un `<main class="relative">` con `PerspectiveGrid` como primer hijo, la sección hero (rótulo `• ACERCA DE` + `<h1>` de 3 líneas en Press Start 2P por `style` inline + párrafo), la fila de 3 features, el divisor de segmentos, la sección de contacto con su columna izquierda y `<ContactForm />` a la derecha, y `SiteFooter`. Texto literal del mockup, en español con acentos. `npm run build` verde; `/acerca-de` se recorre entera (el formulario aún no envía si faltan envs, pero renderiza).

6. **Navegación.** En `components/site-header.tsx` y `components/mobile-nav.tsx`: ampliar el union `active` con `"acerca"`, añadir el enlace "Acerca de" → `/acerca-de` en el nav desktop (tras "Salón de la Fama") y en `LINKS` del móvil (tras "Salón de la Fama"). Recorrer `/`, `/juegos`, `/salon-de-la-fama`, `/acerca-de` y `/juegos/pac-man` (variante `back`, sin nav): el enlace aparece donde toca, el item activo es "Acerca de" solo en `/acerca-de`, nada más se rompe. `npm run build` verde.

7. **Prueba de envío end-to-end.** Con un `RESEND_API_KEY` de prueba y `CONTACT_TO_EMAIL` en `.env.local`: enviar el formulario con datos válidos → llega el email al buzón, el banner de éxito aparece y los campos se limpian. Enviar con `mensaje` corto → error de campo, sin llamada a Resend. Renombrar temporalmente `RESEND_API_KEY` → banner `formError` "El envío de correo no está configurado.", sin crash. Rellenar el honeypot vía devtools → respuesta `ok` sin email. (Si el usuario aún no tiene API key, este paso queda pendiente y se anota; el resto de la spec no se bloquea.)

8. **Cierre.** `npm run lint` y `npm run build` verdes. Recorrer manualmente `/`, `/juegos`, `/acerca-de`, `/acceso`, `/salon-de-la-fama`, `/juegos/pac-man`, `/jugar/pac-man`. Si `next dev` regeneró `AGENTS.md`, commitearlo junto con el trabajo.

---

## Acceptance criteria

- [ ] `npm run build` termina sin errores ni fallos de tipos.
- [ ] `npm run lint` pasa sin errores.
- [ ] `/acerca-de` renderiza, en orden: hero (rótulo `• ACERCA DE`, `<h1>` "ACERCA DE / ARCADE / VAULT", párrafo de misión), fila de 3 features, divisor de segmentos, sección de contacto (columna izquierda + formulario), footer.
- [ ] El `<h1>` del hero y los rótulos `• ACERCA DE` / `• CONTACTO` usan "Press Start 2P" (vía `style` inline con `--font-press-start`); ningún otro texto de la página la usa.
- [ ] El `<h1>` se lee correctamente con acentos ("ACERCA DE") en Press Start 2P o su fallback declarado.
- [ ] El nav desktop y el menú móvil tienen un enlace "Acerca de" → `/acerca-de`.
- [ ] En `/acerca-de` el item de nav activo es "Acerca de"; en `/`, `/juegos` y `/salon-de-la-fama` el item activo sigue siendo el de antes y "Acerca de" no aparece marcado.
- [ ] `/juegos/pac-man` sigue usando la variante `back` del header (sin nav) y "Volver al vault" lleva a `/juegos`.
- [ ] El fondo de `/acerca-de` es la rejilla en perspectiva (`components/perspective-grid.tsx`), está detrás del contenido y no captura clics.
- [ ] El formulario tiene los campos Nombre, Correo electrónico y Mensaje, más un campo honeypot `empresa` no visible para el usuario y fuera del orden de tabulación.
- [ ] Enviar el formulario con Nombre, Correo y Mensaje válidos y con `RESEND_API_KEY` + `CONTACT_TO_EMAIL` configurados envía **un** email a `CONTACT_TO_EMAIL` cuyo `reply-to` es el correo escrito por el visitante y cuyo cuerpo incluye nombre, correo y mensaje.
- [ ] Tras un envío correcto se muestra un banner de éxito encima del formulario y los campos quedan vacíos.
- [ ] Enviar con `mensaje` de menos de 10 caracteres (o `nombre` vacío, o `email` inválido) muestra el error bajo el campo correspondiente y **no** llama a Resend.
- [ ] Con `RESEND_API_KEY` ausente, enviar datos válidos muestra un banner de error global y no lanza una excepción sin capturar (la página no se rompe).
- [ ] Si el honeypot `empresa` llega con valor, la acción responde como éxito y **no** se envía ningún email.
- [ ] Mientras el envío está en curso, el botón está deshabilitado y muestra "ENVIANDO...".
- [ ] Un banner de error conserva lo escrito en los tres campos; un banner de éxito los limpia.
- [ ] `.env.template` existe y documenta `RESEND_API_KEY`, `RESEND_FROM_EMAIL` y `CONTACT_TO_EMAIL`; ningún valor real de esas variables está versionado.
- [ ] `resend` figura en `dependencies` de `package.json`.
- [ ] `app/globals.css` no tiene reglas nuevas respecto al estado actual; todo estilo adicional son utilidades Tailwind en el JSX y no hay archivos `.css` por pantalla ni bloques `<style>` nuevos.
- [ ] Todo el texto de interfaz está en español con acentos correctos y los titulares en mayúsculas.
- [ ] No existe base de datos, sesión, ni persistencia de los mensajes de contacto en el repositorio.

---

## Decisions

- **Sí:** ruta `/acerca-de` (`app/acerca-de/page.tsx`) y enlace en el nav desktop y móvil, con `active` ampliado a `"acerca"`. Es lo que muestra el nav del mockup y lo que la SPEC 02 aplazó.
- **No:** slug `/acerca` o `/about`. `/acerca-de` casa con el rótulo "ACERCA DE" y con el español del resto del sitio.
- **Sí:** Server Action (`app/acerca-de/actions.ts`) invocada desde un componente cliente con `useActionState`. Encaja con App Router, no expone un endpoint HTTP y da estados de `pending`/error/éxito sin fetch manual.
- **No:** Route Handler `app/api/contacto/route.ts`. Un endpoint público sin consumidor externo es ceremonia de más.
- **Sí:** Resend vía el paquete oficial `resend`, con `from`, `to` y (opcional) `from` override por variables de entorno. `RESEND_FROM_EMAIL` cae por defecto a `onboarding@resend.dev` para poder probar sin dominio verificado.
- **No:** fijar un dominio remitente en el código. El usuario aportará el API key y decidirá el remitente/destino en `.env.local` más adelante; la spec no se bloquea por eso.
- **Sí:** la acción degrada con gracia si falta `RESEND_API_KEY` (devuelve `formError`, hace `console.error`, no lanza). Permite mergear la feature antes de tener credenciales.
- **Sí:** solo email de notificación al equipo, con `reply-to` al correo del visitante. Un solo envío, una sola plantilla.
- **No:** autorespuesta de confirmación al visitante. Duplica plantilla y llamadas para poco valor ahora; otra spec si se pide.
- **Sí:** validación exclusivamente en el servidor, con límites concretos (nombre 2–80, email ≤ 120, mensaje 10–2000). El cliente solo pinta errores y usa `required`/`type=email` nativos.
- **No:** añadir `zod` u otra librería de validación. Tres campos con reglas triviales se validan a mano sin dependencia nueva.
- **Sí:** honeypot (`empresa`, `sr-only`, fuera de tabulación) como única defensa anti-spam. Cero dependencias, cero servicios externos.
- **No:** rate-limiting en memoria ni CAPTCHA. El primero no protege sin persistencia; el segundo es una spec propia.
- **Sí:** cuerpo del email como string HTML/texto simple montado en la acción.
- **No:** `@react-email/*` ni `react-dom/server` para plantillas. Sobra para un email de tres líneas.
- **Sí:** estados de envío como banner **encima** del formulario, que permanece visible; éxito limpia campos, error los conserva.
- **No:** sustituir el formulario por un panel de éxito. Mantenerlo visible permite reenviar sin recargar.
- **Sí:** fondo de rejilla en perspectiva del mockup en `components/perspective-grid.tsx`, solo con utilidades Tailwind.
- **No:** reusar `ShaderBackground` (WebGL) aquí. El mockup trae la rejilla y es más barata.
- **Sí:** recrear `cabinet-box`, `glow-text-*` y el resto de clases del `<style>` del mockup con utilidades Tailwind en el JSX (regla heredada de SPEC 01/02).
- **No:** portar el `<style>` del `code.html` a `globals.css` ni a un CSS por pantalla.
- **No:** añadir "Acerca de" al footer ni dar destino a "Soporte"/"Privacidad"/"Términos". El mockup no lo pide.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Sin `RESEND_API_KEY` el formulario no puede enviar y el paso 7 queda a medias. | La acción degrada con gracia (`formError`, sin crash); el criterio de aceptación cubre ese camino. El envío real se valida cuando el usuario aporte la clave. |
| `onboarding@resend.dev` solo permite enviar al email de la cuenta de Resend; con otro `CONTACT_TO_EMAIL` Resend rechaza el envío. | Documentado en `.env.template`; para destinos arbitrarios hace falta dominio verificado (fuera de alcance). El error de Resend se captura y se muestra como `formError`. |
| Rutas tipadas de Next 16: el enlace nuevo a `/acerca-de` debe existir como ruta o el tipado de `Link` falla el build. | El paso 5 crea `app/acerca-de/page.tsx` antes del paso 6 (navegación); `npm run build` valida las rutas tipadas. |
| Ampliar el union `active` sin actualizar todos los `SiteHeader`/`MobileNav` rompe el build. | El paso 6 toca header, mobile-nav y revisa las páginas que pasan el prop en el mismo commit; `npm run build` valida los tipos. |
| El honeypot `sr-only` podría ser rellenado por gestores de contraseñas y bloquear envíos legítimos. | Campo con nombre neutro `empresa`, `autoComplete="off"`, `tabIndex={-1}` y `aria-hidden`; no es un campo de credenciales. |
| Una Server Action que lance deja al usuario con un error sin capturar. | `sendContactMessage` envuelve la llamada a Resend en `try/catch` y siempre devuelve `ContactFormState`. |
| El secreto `RESEND_API_KEY` podría filtrarse a un bundle de cliente. | Solo se lee dentro de `app/acerca-de/actions.ts` (`"use server"`); nunca se pasa como prop ni se usa en un componente cliente. |
| `next dev` reescribe `AGENTS.md` y deja el árbol sucio. | Commitear el `AGENTS.md` regenerado junto con el trabajo (paso 8). |

---

## Lo que **no** entra en esta spec

- El API key real de Resend y la verificación de un dominio remitente propio.
- Autorespuesta / email de confirmación al visitante.
- Persistir los mensajes de contacto en cualquier almacén.
- Plantillas de email con `@react-email/*`; rate-limiting; CAPTCHA; adjuntos.
- Destino real para los enlaces "Soporte", "Privacidad" y "Términos" del footer.
- Añadir "Acerca de" al footer.
- Tests automatizados, modo claro e i18n adicional.
- Edición de los archivos de las SPEC 01 y 02.

Cada uno de esos, si llega, va en su propia spec.
