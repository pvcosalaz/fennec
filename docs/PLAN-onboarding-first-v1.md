# Plan de implementación · Onboarding-first v1

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Voltear el flujo login-first de app.fennec.audio: personalización en 8 pasos,
revelación del Fennec ID ANTES del registro, y el signup como "Save your Fennec ID".
Spec: `docs/SPEC-onboarding-first-v1.md` (leerlo primero; las decisiones viven ahí).

**Arquitectura:** Un orquestador `OnboardingFlow` monta paso por paso leyendo/escribiendo
un borrador en localStorage. El registro (email en página, OAuth con round-trip) termina
en un sembrado único del perfil desde el borrador. Medición pre-auth vía beacon anónimo
a una tabla propia. El dB aprende a sumar actividad de artista.

**Stack:** Next.js 16 + React 19, Motion (ya instalado), i18next, Supabase.
**Verificación:** este repo no tiene test runner de front; el patrón de la casa es
harness en `app/dev-ui/*` + `npx tsc --noEmit` + `npx next build` + QA en el harness
con el Browser pane. Cada tarea termina en typecheck limpio y commit.

**Reglas de la casa que aplican a TODO el plan:** UI en inglés con claves i18n EN+ES;
sin guiones largos en copy; nada sensible en `profiles`; los UPDATE de `profiles` están
restringidos por columna (name/role/country/genres/color_id/account_type ya son
actualizables por el dueño — verificado; NO agregar grants nuevos sin revisar
`20260709_move_sensitive_columns.sql`); toda animación con variante
`prefers-reduced-motion`.

---

### Tarea 1 · Cimientos: el borrador y los catálogos

**Files:**
- Create: `lib/onboarding.ts`
- Modify: `lib/i18n.ts` (claves `ob*` al final, patrón de bundles existente)

- [ ] **1.1** Crear `lib/onboarding.ts` con el borrador y los catálogos de rol:

```ts
// lib/onboarding.ts — el borrador del onboarding pre-cuenta.
// Vive en localStorage hasta el registro; ahi se siembra a profiles y se borra.
// Spec: docs/SPEC-onboarding-first-v1.md
import { randomColorId } from "@/lib/fennecIdPalette";

export const ONBOARDING_DRAFT_KEY = "fennec-onboarding-draft-v1";

export type OnboardingDraft = {
  /** uuid anonimo para el funnel (beacon); NO es el user id */
  anonId: string;
  step: number;                 // 0..6, donde se quedo
  language: "en" | "es" | null;
  accountType: "artist" | "producer" | null;
  role: string | null;          // id de ROLE_OPTIONS
  genres: string[];
  displayName: string;
  colorId: string | null;       // se fija al entrar al paso 4; la tarjeta que ves es la que te quedas
};

export const ROLE_OPTIONS: Record<"producer" | "artist", { id: string; labelKey: string }[]> = {
  producer: [
    { id: "beatmaker",  labelKey: "obRoleBeatmaker" },
    { id: "mixmaster",  labelKey: "obRoleMixMaster" },
    { id: "composer",   labelKey: "obRoleComposer" },
    { id: "songwriter", labelKey: "obRoleSongwriter" },
  ],
  artist: [
    { id: "solo",       labelKey: "obRoleSolo" },
    { id: "band",       labelKey: "obRoleBand" },
    { id: "dj",         labelKey: "obRoleDj" },
    { id: "singersong", labelKey: "obRoleSingerSong" },
  ],
};

export function loadDraft(): OnboardingDraft { /* JSON.parse con defaults, patron loadArtistPricing */ }
export function saveDraft(d: OnboardingDraft): void { /* setItem en try/catch */ }
export function clearDraft(): void { /* removeItem */ }
export function newDraft(): OnboardingDraft {
  return { anonId: crypto.randomUUID(), step: 0, language: null, accountType: null,
           role: null, genres: [], displayName: "", colorId: null };
}
/** Fija el color UNA vez (al llegar al paso 4). Idempotente. */
export function ensureDraftColor(d: OnboardingDraft): OnboardingDraft {
  return d.colorId ? d : { ...d, colorId: randomColorId() };
}
```

- [ ] **1.2** Claves i18n `ob*` EN+ES (títulos de los 8 pasos del spec, roles, CTA
  "Save my Fennec ID", "Already have an account? Log in"). Copiar el patrón de bundle
  fechado del final de `lib/i18n.ts`.
- [ ] **1.3** `npx tsc --noEmit` limpio → commit `feat(onboarding): borrador y catalogos`.

### Tarea 2 · Funnel pre-auth: tabla + beacon

**Files:**
- Create: `supabase/migrations/20260830_onboarding_events.sql`
- Create: `app/api/onboarding-beacon/route.ts`
- Modify: `lib/onboarding.ts` (helper `beacon()`)

- [ ] **2.1** Migración (Paco la corre en el SQL Editor; anotarla en el mensaje final):

```sql
-- Funnel del onboarding PRE-cuenta: track() exige usuario logueado, y el punto
-- de este funnel es medir a quien NO llego al registro (spec: "52% vs 93%").
create table if not exists public.onboarding_events (
  id bigint generated always as identity primary key,
  anon_id uuid not null,
  step int not null,
  action text not null check (action in ('seen','completed','signup_done')),
  created_at timestamptz not null default now()
);
alter table public.onboarding_events enable row level security;
-- cero policies: solo service_role escribe (via el route) y lee. Patron profiles_private.
```

- [ ] **2.2** Route POST con `getSupabaseAdmin()` (patrón de `app/api/gcal/sync/route.ts`
  pero SIN auth de sesión): valida `{ anonId: uuid, step: 0-6, action }` con regex/rangos,
  inserta, responde `{ok:true}` siempre (analytics nunca rompe nada). Rate: es beta
  cerrada; suficiente con validación estricta de shape.
- [ ] **2.3** En `lib/onboarding.ts`: `beacon(d, step, action)` fire-and-forget
  (`fetch` en try/catch vacío, patrón `track()`).
- [ ] **2.4** tsc limpio → commit `feat(onboarding): funnel anonimo`.

### Tarea 3 · El orquestador montado en el shell

**Files:**
- Create: `components/onboarding/OnboardingFlow.tsx`
- Create: `app/dev-ui/onboarding/page.tsx` (harness, patrón `app/dev-ui/artist`)
- Modify: `components/pricing/PricingCalculator.tsx:791-796` (el branch `!authUser`)

- [ ] **3.1** `OnboardingFlow` con estado `draft` (load al montar, save en cada cambio),
  render por `draft.step` con placeholders de texto por ahora, transición compartida
  entre pasos (Motion `AnimatePresence`, salida/entrada con spring de la casa), y
  liga fija abajo: `t("obAlreadyAccount")` → `onLogin()`.
- [ ] **3.2** En el shell, el branch `!authUser` decide:

```tsx
if (!authUser) {
  return (
    <div className="flex flex-col bg-black" style={{ height: "var(--app-h, 100lvh)" }}>
      {quiereLogin ? <AuthGate /> : <OnboardingFlow onLogin={() => setQuiereLogin(true)} />}
    </div>
  );
}
```

  (`quiereLogin` = `useState(false)` nuevo. AuthGate NO se toca: es la puerta de los
  que ya tienen cuenta.)
- [ ] **3.3** Harness: página dev que monta `OnboardingFlow` suelto.
- [ ] **3.4** Verificar en el harness (Browser pane): navegar los 7 placeholders ida y
  vuelta, recargar a media ruta y confirmar que regresa al paso guardado. tsc + commit.

### Tarea 4 · Pasos 0 y 1: Language + What are you?

**Files:**
- Create: `components/onboarding/StepLanguage.tsx`, `components/onboarding/StepWhatAreYou.tsx`
- Reference: `docs/prototipos/selector-artista-productor.html` (el visual aprobado)

- [ ] **4.1** StepLanguage: EN/ES como dos opciones grandes; al elegir, escribir
  `localStorage["fennec-language"]` (la MISMA clave del shell, `PricingCalculator.tsx:170`)
  + `i18n.changeLanguage(lng)` + draft. Primera aparición del zorro (asset del prototipo).
- [ ] **4.2** StepWhatAreYou: portar el prototipo aprobado a React: ARTIST vs PRODUCER
  enfrentados, zorro a opacidad .032, hover/tap con spring. Al elegir → draft + siguiente.
- [ ] **4.3** QA en harness móvil y desktop (`resize_window`), reduced-motion probado
  con `emulateMedia`… no existe en el pane: verificar con la clase CSS
  `motion-reduce:` de Tailwind en los elementos animados. tsc + commit.

### Tarea 5 · Pasos 2 y 3: rol y géneros

**Files:**
- Create: `components/onboarding/StepRole.tsx`, `components/onboarding/StepGenres.tsx`

- [ ] **5.1** StepRole: título según `draft.accountType` ("What kind of producer are
  you?" / "...artist..."), chips grandes de `ROLE_OPTIONS`, single-select, stagger de
  entrada (Motion `staggerChildren`). Guardar el `id` del rol en el draft. (El label
  legible se resuelve al sembrar: guardar el label EN traducido en `profiles.role`,
  que hoy es texto libre de Settings — así Settings lo muestra tal cual.)
- [ ] **5.2** StepGenres: título "What do you produce?" / "What do you play?";
  chips multi-select de `GENRE_OPTIONS` (`lib/genres.ts`), mínimo 1 para avanzar,
  contador vivo. Interacción: el chip elegido se enciende con el accent.
- [ ] **5.3** QA harness + tsc + commit.

### Tarea 6 · Paso 4: tu nombre y la tarjeta asomándose

**Files:**
- Create: `components/onboarding/StepName.tsx`
- Reference: `components/network/FennecIdCard.tsx` (props firstName/lastName/accountType/username)

- [ ] **6.1** Al MONTAR el paso: `ensureDraftColor(draft)` — aquí nace el color, no antes
  ni después (regla: la tarjeta que ves es la que te quedas).
- [ ] **6.2** Input grande del nombre artístico. Debajo, el `FennecIdCard` REAL asomado
  (~40% visible, peek desde abajo) con `getColorScheme(draft.colorId)`, el nombre
  partido en firstName/lastName (primera palabra / resto) actualizándose tecla a
  tecla, y `accountType` del draft (el sello si es artista). Username placeholder
  derivado: `nombre.toLowerCase().replace(/[^a-z0-9_]/g,"")`.
- [ ] **6.3** Avanzar requiere nombre no vacío. QA + tsc + commit.

### Tarea 7 · Paso 5: LA REVELACIÓN

**Files:**
- Create: `components/onboarding/StepReveal.tsx`
- Reference: `lib/fennecIdMotion.ts` (la animación existente del dashboard, punto de partida)

- [ ] **7.1** Coreografía (Motion + WAAPI, el componente real de la tarjeta, NUNCA video):
  oscuro total → glow del accent creciendo → la tarjeta entra en 3D (rotateX desde
  ~35°, spring stiffness ~120 damping ~16, escala 0.9→1) → barrido de luz diagonal
  (overlay `linear-gradient` animado con WAAPI) → si artista, el sello aparece al
  final con un pop propio → título "This is you" + CTA "Save my Fennec ID".
- [ ] **7.2** `motion-reduce:`: crossfade simple sin 3D.
- [ ] **7.3** Si el momento pide partículas: evaluar Rive como acento (spec lo permite);
  NO bloquear la tarea por esto, es pulido posterior.
- [ ] **7.4** QA en harness (móvil + desktop, segunda pasada tras el delay de animación,
  truco de la sesión: screenshot doble). tsc + commit.

### Tarea 8 · Paso 6: Save your Fennec ID + el sembrado

**Files:**
- Create: `components/onboarding/StepSaveId.tsx`
- Create: `lib/onboardingSeed.ts`
- Modify: `lib/communityDb.ts` (firma de `createProfile`)
- Modify: `components/pricing/PricingCalculator.tsx:798-801` (el branch `!profile`)

- [ ] **8.1** Extender `createProfile` para aceptar los campos del draft:

```ts
export async function createProfile(userId: string, username: string, avatarUrl: string | null,
  extra?: { name?: string; role?: string; genres?: string[]; color_id?: string;
            account_type?: "artist" | "producer" }): Promise<Profile> {
  const { data, error } = await supabase.from("profiles")
    .insert({ id: userId, username, avatar_url: avatarUrl, ...(extra ?? {}) })
    .select().single();
  if (error) throw error;
  return data;
}
```

  (Llamada existente de `UsernameSetup` sigue compilando: `extra` es opcional.)
- [ ] **8.2** `lib/onboardingSeed.ts` — `seedProfileFromDraft(userId)`: lee draft,
  resuelve username (sugerido desde el nombre; si `isUsernameTaken`, sufijo numérico
  hasta 3 intentos y si no, devuelve `{needsUsername:true}`), llama `createProfile`
  con extra, `beacon(d, 6, "signup_done")`, `clearDraft()`.
- [ ] **8.3** StepSaveId: handle editable prellenado (check de disponibilidad inline al
  perder foco, patrón `UsernameSetup`), y los botones de auth REUSANDO los flujos de
  `AuthGate` (extraer `handleOAuth`/email signup a helpers compartidos o duplicar los
  ~15 renglones de supabase.auth; preferir extraer a `lib/authActions.ts`). Email:
  sesión llega en página. OAuth: round-trip con `redirectTo: origin` — el draft
  sobrevive en localStorage.
- [ ] **8.4** El branch `!profile` del shell: si hay draft con `displayName`, montar un
  `FinishSetup` mínimo que corre `seedProfileFromDraft` (spinner con la tarjeta
  chiquita) y llama `setProfile`; si `needsUsername`, muestra solo el campo de handle.
  Si NO hay draft (usuario viejo sin perfil), `UsernameSetup` de siempre.
- [ ] **8.5** Prueba de punta a punta en local (email signup con Supabase real de dev o
  harness con mock): draft completo → signup → perfil sembrado con account_type, role,
  genres, name y color_id IDÉNTICO al revelado. tsc + build + commit.

### Tarea 9 · El dB suma a los artistas

**Files:**
- Modify: `lib/fennecDb.ts` (input + peso), `components/dashboard/Dashboard.tsx`
  (alimentar el conteo), `lib/artistBusiness.ts` (nada — `getArtistEvents` ya existe)

- [ ] **9.1** `FennecDbInputs` += `artistEvents?: number | null`; en `activityDb()`
  sumarlo con peso 1.5 (mismo peso que projects: un gig registrado = un proyecto).
  El tope de actividad existente (+8) NO cambia — protege la escala.
- [ ] **9.2** En Dashboard: si `profile.account_type === "artist"`, contar
  `getArtistEvents(userId).length` y pasarlo al cómputo (mismo lugar donde hoy se
  pasan projects/clients/quotes; para producer va 0/null).
- [ ] **9.3** Verificar en harness `/dev-ui/db` (existe) o con cuenta admin en modo
  artista: el dB deja de ignorar la actividad de artista. tsc + commit.

### Tarea 10 · Funnel conectado + QA integral + ship

**Files:**
- Modify: `components/onboarding/OnboardingFlow.tsx` (beacons), varios (pulido)

- [ ] **10.1** `beacon(seen)` al montar cada paso, `beacon(completed)` al avanzar
  (`signup_done` ya salió en 8.2). Verificar filas en la tabla desde el SQL Editor.
- [ ] **10.2** QA integral en el harness + flujo real: móvil (375px) y desktop; recarga
  a media ruta; "Log in" escapa a AuthGate; usuario con sesión nunca ve el onboarding;
  usuario viejo sin draft cae a UsernameSetup.
- [ ] **10.3** `npx next build` limpio → commit → push (deploy automático).
- [ ] **10.4** Recordar a Paco: correr `20260830_onboarding_events.sql` en el SQL
  Editor. Sin eso el funnel no registra (la app no truena: el beacon traga errores).

---

## Autorevisión contra el spec (hecha al escribir el plan)

- 8 pasos del spec ↔ tareas 4-8 ✓ · borrador/siembra ↔ 1 y 8 ✓ · color fijado en
  revelación ↔ 6.1 ✓ · UsernameSetup absorbido ↔ 8.4 ✓ · medición ↔ 2 y 10 ✓ ·
  dB artista ↔ 9 ✓ · usuarios existentes intactos ↔ 3.2 y 10.2 ✓ · fuera de alcance
  respetado (sin guest mode, sin avatar, sin cambios al landing) ✓.
- Deviación consciente de TDD: el repo no tiene runner de front; se verifica con el
  patrón de la casa (harness + tsc + build + QA en Browser pane), explícito por tarea.
