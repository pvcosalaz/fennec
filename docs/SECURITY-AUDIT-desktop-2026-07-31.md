# Auditoría de seguridad — Fennec (desktop app) · 2026-07-31

Hecha de noche por Claude contra el código y la **base de producción en vivo**.
No es sustituto de la auditoría de Alex (fase 1 con dos cuentas reales atacándose),
pero cubre lo verificable desde aquí. Ordenado por severidad.

## Resumen

**Lo importante está bien.** El aislamiento entre usuarios (el riesgo más caro)
lo probé de verdad, con dos cuentas reales, y aguanta. No hay secretos de la app
en el código ni expuestos al navegador. Los endpoints validan al que llama.

**Un hallazgo serio y accionable por ti:** hay un token de GitHub en texto plano
en `.git/config`. Hay que rotarlo.

---

## 🔴 ALTO

### 1. GitHub Personal Access Token en texto plano
**Dónde:** `.git/config` de la app — el remote es
`https://ghp_****@github.com/...`.
**Riesgo:** cualquiera con acceso al filesystem (o a un backup, o si la laptop se
compromete) obtiene un token que puede leer/escribir tu repo de GitHub. Además ya
apareció en salidas de terminal durante el trabajo, así que trátalo como
**comprometido**.
**Qué hacer (tú):**
1. GitHub → Settings → Developer settings → Personal access tokens → **revoca** el
   token que empieza en `ghp_C783…`.
2. Cambia el remote a SSH: `git remote set-url origin git@github.com:pvcosalaz/fennec.git`
   (o usa el credential helper de macOS con un token nuevo, nunca embebido en la URL).

Nota: esto ya venía anotado como deuda en el CLAUDE.md del workspace; ahora está
confirmado con el valor real, por eso sube a alto.

---

## 🟡 BAJO / configuración

### 2. `bot_posted_urls` legible por anónimos
La llave anónima puede leer esta tabla. **No es data de usuarios** (solo URLs que
el bot ya publicó en público), así que el impacto es mínimo, pero no hay razón
para dejarla abierta. SQL para cerrarla:
```sql
alter table public.bot_posted_urls enable row level security;
-- sin policies públicas → solo service_role (las rutas de bot) accede
```

### 3. Pantalla de Google OAuth muestra el dominio de Supabase (pendiente #31)
Al hacer login con Google, la pantalla de consentimiento dice el dominio
`xxxx.supabase.co` en vez de `app.fennec.audio`. El `redirectTo` en el código ya
usa tu dominio (`AuthGate.tsx:46`), así que **no es código**: es configuración de
Supabase (Auth → custom domain). Se arregla en el dashboard de Supabase; puede
requerir plan pago. Es cosmético/confianza, no una fuga.

### 4. Formulario de waitlist sin rate limit
`/api/waitlist/signup` es público a propósito (la campaña). Es insert-only y no
filtra nada, pero alguien podría spamear inserciones. Bajo riesgo hoy; si crece la
campaña, vale poner un rate limit por IP.

### 5. Patrón OAuth confía en el `userId` del query param
`connect` (Spotify, YouTube y ahora gcal) recibe `userId` por query sin validar la
sesión del que inicia. Un atacante podría vincular **su propia** cuenta de Google
al `userId` de una víctima (no al revés: no roba datos ajenos). Impacto bajo, y es
el patrón heredado de Spotify/YouTube, no una regresión nueva. Si se endurece,
hacerlo en los tres a la vez.

---

## ✅ Verificado sano (con evidencia)

- **Aislamiento entre usuarios:** creé 2 cuentas reales; A guarda un dato, B con
  sesión **no lo ve, no lo edita, no lo borra**, y el dato de A queda intacto.
  Control positivo incluido (A sí ve lo suyo). RLS `auth.uid() = user_id` correcto.
- **Tablas de negocio** (`business_clients/quotes/projects`), `user_state`,
  notificaciones, karma, red, voice_notes, push: **0 filas** a un anónimo.
- **`profiles`** expone solo datos públicos de perfil (username, socials, follower
  counts). **Cero PII** — email/teléfono viven en `profiles_private`, que está
  bloqueada por completo. Split de columnas sensibles bien hecho.
- **Sin secretos hardcodeados** en el código. Ningún `SECRET`/`SERVICE_ROLE`/
  `CLIENT_SECRET` marcado como `NEXT_PUBLIC_`. La única llave pública en cliente es
  Giphy, que es pública por diseño.
- **Service role** solo se usa server-side (`getSupabaseAdmin`); nunca aparece en
  `components/`, así que no se filtra al navegador.
- **Endpoints:** admin gateado con `requireAdmin`; crons con `CRON_SECRET`; Stripe
  webhook **verifica firma**; `img-proxy` es un proxy anti-SSRF sólido (solo HTTPS,
  bloquea IPs privadas y metadata de AWS `169.254`, whitelist con límites de
  dominio reales, valida content-type de imagen, timeout 5s).
- **Google Calendar (nuevo):** OAuth read-only, tokens server-side en
  `user_integrations`, CSRF por nonce en cookie HttpOnly, `events`/`disconnect`
  validan `auth.getUser` + dueño. Gateado tras `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

## Contexto (no es hallazgo)

Los callbacks de Spotify/YouTube redirigen a un alias viejo
(`fennec-pi.vercel.app`) en vez de `app.fennec.audio`. Es un bug de UX post-conexión,
no de seguridad. Vale actualizarlo cuando toques esa zona.
