# Fennec Pro: $9.99 repricing + value anchors — Design Spec

**Date:** 2026-07-09 · **Decided by:** Paco (brainstorming session with market research)
**Goal:** adoption-first. Reprice Pro to what the landing already promises, and add
features that make the price defensible against the market anchors producers
already pay for.

## Why (market evidence, July 2026)

- Producers already carry a $30-60/mo subscription stack. They add a sub only if
  it (a) makes them money, (b) gives raw materials, or (c) saves real time.
- Anchors: Splice Sounds $12.99/mo (millions of samples), BeatStars Pro
  $19.99/mo (a storefront that generates income), LANDR ~$12-17/mo bundle,
  DistroKid $22.99/yr. At $14.99, Fennec sat above Splice with a lighter
  bundle and an unknown brand. Unwinnable comparison.
- The landing page and the original product plan both say **$9.99**. The app
  charging $14.99 was undocumented price creep and a broken public promise.
- Global music-production market ~$27.4B, ~8% CAGR; bedroom-producer boom.
  The service-producer business niche (price work, quote, get paid, look pro)
  is unserved: BandLab owns social/creation, BeatStars owns beat sales.

## Decisions

1. **Price: $9.99/mo · $79.99/yr.** ($79.99/12 = $6.67/mo ⇒ the existing
   "SAVE 33%" badge stays honest: 9.99×12 = $119.88 → 33.3% off.)
2. **Build value so $9.99 is an easy yes** (not a discount race):
   - **A. Quote PDF + share link (Pro)** — ship with the reprice.
   - **B. Verified credits via Muso.AI on the Fennec ID (Pro)** — phase 2,
     investigation first; does NOT block the reprice or launch.
3. Pro bundle after this spec: exact rate reveal · quote PDFs + share links ·
   Marketing Pro tools (Inspire/Lab/Trending) · 5 track uploads/mo ·
   verified credits (phase 2).

## Part 1 — Reprice (config + copy, no logic changes)

- **Stripe (Paco, dashboard):** create two new Prices on the Pro product:
  $9.99/month and $79.99/year. Swap `NEXT_PUBLIC_STRIPE_PRICE_MONTHLY` and
  `NEXT_PUBLIC_STRIPE_PRICE_YEARLY` in Vercel env to the new price IDs.
  Existing subscribers (if any) stay grandfathered on their old price; no
  migration.
- **Code:** update upgrade-sheet copy in `components/pricing/PricingCalculator.tsx`:
  - Monthly card: "$9.99 / month"
  - Yearly card: "$79.99 / year · ≈ $6.67 / mo" (badge "SAVE 33%" unchanged)
  - CTA: "Start Pro · $9.99 / month" / "Start Pro · $79.99 / year"
- **Landing:** already says $9.99 — verify only, no change expected.
- **Checkout route** reads plan → env price ID; no code change.

## Part 2 — Quote PDF + share link (Pro)

The feature that makes Pro "make money": turn a quote into a professional,
branded deliverable the client can open from a link.

### Data

Migration `20260709_quote_share.sql` (Paco runs in SQL Editor):
- `alter table business_quotes add column if not exists share_token uuid
  not null default gen_random_uuid();`
- `alter table business_quotes add column if not exists shared boolean
  not null default false;`
- Unique index on `share_token`.
- RLS: add a SELECT policy allowing `anon` to read a quote **only when
  `shared = true`**, matched by `share_token` (never by raw id). Column-safe:
  the public page needs quote fields + owner's display fields; owner joins via
  the existing `profiles` public columns.

### Flow

1. In `QuoteGenerator`, each quote row gets a **"Share"** action (Pro-gated;
   non-Pro tap opens the upgrade sheet with a new `"quotes-pdf"` context).
2. Share toggles `shared = true` and copies
   `https://app.fennec.audio/q/<share_token>` to the clipboard (native share
   sheet on mobile via `navigator.share`).
3. **Public page `app/q/[token]/page.tsx`** (server component, like
   `/u/[username]`): renders the quote as a clean branded document —
   producer's Fennec ID header (name, role, color scheme, avatar), line
   items, totals, validity note, "Powered by Fennec · fennec.audio" footer.
   404 when token unknown or `shared = false`.
4. **PDF = print stylesheet on that page** + a "Download PDF" button that
   calls `window.print()`. No heavy PDF lib, pixel-true to the web version,
   works on desktop and iOS. (If print quality disappoints later, revisit
   with @react-pdf/renderer as a follow-up.)
5. Owner can un-share (sets `shared = false`, link dies).

### Gating

- Creating quotes stays free (per the free-Business decision).
- **Share/PDF is the Pro action.** Rationale: free users experience the
  whole flow and hit the paywall exactly when the deliverable earns money.

## Part 3 — Muso.AI verified credits (phase 2, investigation first)

- **Investigate:** Muso.AI partner API access, pricing, auth model, match
  quality for non-charting producers. Output: a one-page GO/NO-GO note.
- **If GO:** profile field(s) + sync job → show "Verified credits" count on
  the Fennec ID + public profile, and feed `verifiedCredits` into
  `computeFennecDb` (the input already exists in `lib/fennecDb.ts`).
- **If NO-GO:** fallback candidates: Spotify followers (already OAuth'd,
  store `spotify_followers` on profile) as an interim "verified" signal.
- Nothing in parts 1-2 depends on this.

## Copy / surface updates (ship with part 1)

- `PRO_FEATURES` in `PricingCalculator.tsx` gains: 📄 "Quote PDFs & share
  links — send clients a branded quote they can open anywhere".
- `UPGRADE_COPY` gains a `"quotes-pdf"` context: "Your quote, client-ready. /
  Share a branded PDF in one tap."
- Landing Pro card: keep $9.99; add the PDF bullet when part 2 ships.
- `STORE_LAUNCH_PLAN.md`: update the price references.

## Non-goals

- No A/B pricing infra, no regional pricing, no light mode, no migration of
  existing subscribers, no in-app PDF designer. Karma pack ($1.99/10) unchanged.

## Success criteria

- Upgrade sheet, checkout, and landing all say $9.99/$79.99 and Stripe charges
  exactly that (verified with a test checkout).
- A Pro user can share a quote link that opens logged-out on a phone, looks
  branded, and prints to a clean one-page PDF.
- A free user tapping Share hits the upgrade sheet with quote-specific copy.
- Anon access: unknown token → 404; unshared quote → 404; shared quote →
  only quote fields + owner's public display fields (verified via REST probe).
