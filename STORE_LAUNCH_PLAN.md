# Fennec — App Store & Google Play Launch Plan
**Date:** 2026-07-03 · Researched against Apple & Google 2026 guidelines

## Reality check
Fennec is a **PWA with heavy user-generated content** (Community feed,
Track Reviews/comments, Melody Bank) **and digital-goods sales** (karma
packs + Pro via Stripe). Both stores have hard requirements that Fennec
does **not** meet yet. Submitting today = near-certain rejection. Below is
what's missing, ranked by how surely it gets you rejected.

---

## 🔴 BLOCKERS — rejection is guaranteed without these

### 1. In-app account deletion
**Rule:** Apple *and* Google require an app that lets you create an account
to let you **delete it from inside the app** — not "email us."
**Fennec today:** privacy + data-deletion pages say "contact hello@fennec.audio."
That is explicitly not enough.
**Do:** a Settings → "Delete account" button that (a) confirms, (b) calls a
server route that deletes the auth user + their rows (profiles, posts,
comments, reviews, karma_ledger, subscriptions) via service role, (c) signs
out. ~Half a day. Google also wants a **public web URL** for deletion
requests (we can point to a page that explains the in-app flow).

### 2. UGC moderation (report + block + terms)
**Rule:** Any app with user content must (Apple 1.2 / Google UGC policy):
- make users **accept terms/EULA before posting**,
- **report** objectionable content,
- **block** users,
- **act on reports within 24h** (Apple), and publish content standards.
**Fennec today:** none of report/block/terms exists. Fennec has four UGC
surfaces (Community posts, Community comments, track review comments, Melody
Bank) — all need it.
**Do (in priority):**
- Report button on every post/comment/track/melody → writes to a `reports`
  table; a simple admin queue (you already have `/api/admin/*`) to action them.
- Block user (hide their content + stop DMs when those ship).
- A short EULA / community guidelines, accepted at signup (checkbox +
  stored flag) and linked in Settings.
- "No tolerance for objectionable content" line in the guidelines (Apple
  greps for this).
~2–3 days. **This is the single biggest work item.**

### 3. Payments — the expensive decision
**Rule:** Apple 3.1.1 requires **in-app purchase (IAP, ~30% cut)** for
digital content. Selling karma/Pro through Stripe inside a normal app =
rejection. The 2026 external-link entitlement (redirect to Stripe) is
**US-only** and needs an approved entitlement. Google is parallel: Play
Billing required for digital goods, with a similar US linking carve-out.
**Fennec today:** karma packs + Pro are Stripe-only.
**Options (decide before building the wrapper):**
- **A — IAP/Play Billing** for karma + Pro (keep Stripe for web). Cleanest
  approval, but 30% cut and double the billing plumbing.
- **B — US external-link entitlement** → keep Stripe, apply for the
  entitlement, US storefront only. Lower cut, more paperwork, US-only.
- **C — Launch the store app without in-app purchases** (Pro/karma
  purchasable only on the web app), stores just get the free experience.
  Fastest path to approval; monetize on web. **Recommended for v1.**

### 4. How you even package a PWA for the stores
**Rule:** you can't upload a raw PWA. And Apple rejects "simple web-view
wrappers."
**Do:** wrap with **Capacitor** (keeps the Next.js app, adds native push,
offline, share, biometric — enough "native value" to clear Apple's wrapper
bar). Google also accepts a **TWA/Bubblewrap** for Play. Fennec already has
PWA push + offline, which helps the native-value argument.

---

## 🟠 REQUIRED — needed, less likely to block on their own
- **Privacy policy completeness:** current `/privacy` is 26 lines. Must
  cover, per 2026 rules: every data category collected (email, socials,
  audio uploads, Stripe billing, analytics), why, sharing, **retention +
  deletion policy**, and contact. Google's Data Safety form must match it
  exactly (mismatches get flagged).
- **Google Data Safety form:** declare all 14 categories honestly; if any
  analytics SDK reads `ANDROID_ID`, it must be disclosed.
- **Sign in with Apple:** if you offer any third-party login (Google, etc.)
  on iOS, Apple requires Sign in with Apple as an option too.
- **Age rating / content rating** questionnaires on both.
- **Permissions:** only request what you use; each needs a purpose string
  (mic for Melody Bank, etc.).

## 🟡 NICE-TO-HAVE pre-submission
- Rate-limit the two unauthenticated cache routes (from the security review).
- Rotate the GitHub PAT before the repo is shared with any build service.
- App Store screenshots, preview, description that doesn't over-promise.

---

## Suggested sequence
1. **Account deletion** (½ day) — small, unblocks a hard requirement.
2. **UGC moderation** (2–3 days) — report/block/EULA; the big one.
3. **Decide payments** (option C recommended for v1 → no IAP work now).
4. **Privacy policy rewrite + Data Safety** (½ day).
5. **Capacitor wrap + native push** (1–2 days), then TestFlight / internal
   testing track.
6. Submit to **Google first** (faster, more forgiving), fix feedback, then
   Apple.

**Rough estimate to store-ready (option C):** ~1 week of focused work.
Payments via IAP (option A) adds ~1 week on top.
