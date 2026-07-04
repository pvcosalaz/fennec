# Security Review — Fennec (app + landing)
**Date:** 2026-07-03 · General review (whole codebase, not just recent changes)

## TL;DR
The app is in good shape: no hardcoded secrets, admin routes gated, crons
behind a shared secret, OAuth uses anti-CSRF `state`, security headers
(CSP/HSTS/X-Frame) present, landing page clean. **Two real holes in the
Supabase `profiles` table** — both fixed by one migration, pending run.

---

## 🔴 H1 — Privilege escalation via unrestricted profile UPDATE (critical)
**Where:** `profiles` RLS policy `users update own profile`.
The policy checks the row (`auth.uid() = id`) but **not the columns**. Any
authenticated user could run from the browser console:
```js
supabase.from("profiles").update({ is_admin: true, karma: 999999, is_pro: true }).eq("id", MY_ID)
```
**Impact:**
- `is_admin: true` → full access to `/api/admin/*` (they trust `is_admin`).
- `karma: 999999` → mints infinite karma; the entire economy shipped today
  (upload cost, anti-farm locks, Stripe karma packs) becomes pointless.
- `is_pro: true` → Pro features for free, bypassing Stripe.

**Fix:** column-level UPDATE grant — users may only write their own profile
fields, never economy/authorization columns. See
`supabase/migrations/20260703_security_rls.sql`. Karma triggers and
`stamp_comment` are SECURITY DEFINER, so they keep working.

**Real-world risk right now:** low — the DB has only 4 accounts, all
Paco's own test/staging users. No hostile users yet. But this MUST be
closed before any public launch / store submission.

## 🟠 H2 — Sensitive columns exposed to the anon key (medium)
**Where:** `profiles` SELECT policy `profiles are public (using true)`.
The anon key ships in the client bundle (public by design), and the public
SELECT exposed **every** column, including:
- `stripe_customer_id` (e.g. `cus_UovEh2UTE3vc7W`) — billing id enumeration.
- `is_admin` — lets an attacker enumerate exactly who to target.

**Fix:** column-level SELECT grant that omits those two. `select("*")` from
the client keeps working (PostgREST expands `*` to granted columns) and the
client never reads either field. Same migration.

---

## 🟡 Minor / accepted
- `/api/trending-ideas` and `/api/news` have no auth, but only read/refresh
  a public cache (`cached_content`) and don't spend Claude tokens per
  request. Low risk; a light rate-limit would be nice-to-have pre-launch.
- App repo's git remote has a GitHub PAT in plaintext in `.git/config`
  (known, noted in memory). Rotate + move to SSH/credential-helper.

## ✅ Verified good
- **API auth:** `/api/admin/*` → `requireAdmin` (token → `is_admin`);
  crons + `/api/push/send` → `CRON_SECRET`; `/api/lab-idea` (the only
  Claude-spending user route) → Supabase `getUser` + input validation.
- **Stripe webhook:** signature-verified; karma credit idempotent via
  ledger `ref_id = session.id`.
- **Karma RPCs:** all SECURITY DEFINER with server-side validation; the
  anti-collusion locks live in Postgres (client can't bypass).
- **img-proxy:** HTTPS-only, blocks localhost/private/metadata IPs,
  domain whitelist (SSRF-safe).
- **OAuth (Spotify/YouTube):** `state = base64(nonce:userId)` anti-CSRF.
- **Secrets:** none hardcoded; no anon/service-key fallbacks in code.
- **Headers:** CSP, HSTS (1yr + subdomains), X-Frame-Options SAMEORIGIN.
- **Landing:** static HTML, no embedded keys/tokens.
- **karma_ledger:** RLS read-own-only; anon can't read it or write karma.

---

## Action required
1. **Run `supabase/migrations/20260703_security_rls.sql`** in the Supabase
   SQL editor (closes H1 + H2). Then verify: profile settings still save,
   and karma still moves on comment-stamp. *Do this together — a bad
   column list would break settings saving.*
2. Pre-launch: rotate the GitHub PAT; consider a rate-limit on the two
   unauthenticated cache routes.
