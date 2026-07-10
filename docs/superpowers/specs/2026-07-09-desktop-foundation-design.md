# Fennec Desktop — Foundation Spec (architecture, not final skin)

**Date:** 2026-07-09 · **Decided by:** Paco (brainstorming session)
**Goal:** full desktop parity, shipped in phases so it never blocks the mobile
launch. Tonight's scope: the architecture + the real functional gap (file
uploads live on computers, not phones). The visual skin iterates with Paco
against `public/desktop-mockup.html` (visual exploration, not committed as UI).

## Decisions (from the brainstorm)

- **One Next.js app, adaptive shell** (approach A). No fork, no second repo.
  All logic stays in `lib/*.ts`, shared 100% between shells.
- **Mobile is untouchable**: below the desktop breakpoint the app renders the
  existing shell pixel-for-pixel. The launch candidate must not change.
- **Phases by desktop value:** (1) shell + tape/upload, (2) business tools,
  (3) dashboard/marketing/community polish. Tonight ships phase 1's
  foundation with a provisional skin.
- The tape-live idea (synced listening) is parked for later debate — noted in
  long-term memory (`idea_fennec_tape_live`), out of scope here.

## Architecture

### Branch point
- `lib/useIsDesktop.ts` — `useIsDesktop()` hook: `matchMedia("(min-width: 1024px)")`,
  SSR-safe (false until mounted), live-updates on resize. 1024px chosen so
  tablets-portrait keep the touch UI.
- `PricingCalculator` (the app shell owner) branches AFTER auth/profile
  resolve: `isDesktop ? <DesktopShell …/> : <existing mobile JSX>`.
  Splash/AuthGate/UsernameSetup stay shared (they center fine on any screen).
- Mobile-only side effects (body scroll locks, `--app-h` fixed shell) are
  gated with `!isDesktop` so desktop scrolls like a website.

### DesktopShell (`components/desktop/DesktopShell.tsx`)
- Left sidebar: brand, nav (Dashboard, Business, The Tape, Marketing,
  Community, Network), mini Fennec ID + dB at the bottom. Amber = active.
- Main area: max-width container, normal document scroll, renders the SAME
  module components the mobile shell renders (Dashboard, BusinessHub + its
  views, ContentModule, AudioModule, Community, NetworkSection,
  SettingsModule) with the same props/state lifted from PricingCalculator.
- The upgrade sheet stays a global overlay owned by PricingCalculator,
  rendered for both shells.
- Provisional skin follows the mockup's grammar (canvas #0b0a08, hairlines,
  amber-for-human) but every visual detail is expected to change in the
  UI iteration with Paco.

### Desktop file upload (phase-1 functional gap)
- `MyTracksView` gains a drag-and-drop target wrapping the existing picker:
  dropping an audio file behaves exactly like choosing it (same validation,
  same `uploadReviewAudio` + `createReview` + karma enforcement in
  `lib/audioDb.ts`). Pointer/desktop enhancement; touch flow unchanged.
- No new endpoints, no storage changes — the entire upload path already
  exists server-side.

## Non-goals (tonight)
- Final desktop skin (iterated later against the mockup with Paco).
- Desktop-specific tape redesign (horizontal reel) — phase 1.5, needs Paco's
  visual sign-off first.
- ⌘K palette, keyboard transport, multi-pane Gmail-style layouts (later phases).
- Any mobile behavior change.

## Success criteria
- `main` untouched; work lands on `feat/desktop-shell`.
- At <1024px nothing changes (visual + behavior).
- At ≥1024px: sidebar shell renders every module with real data; navigation
  works; Settings reachable; upgrade sheet opens.
- Dropping a .wav on My Tracks (desktop) uploads it through the existing
  karma-gated path.
- tsc + production build clean.
