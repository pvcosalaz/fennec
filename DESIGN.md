# Design System — Fennec

## Product Context
- **What this is:** Music business & community hub for producers and composers — pricing, clients, content, feedback, community.
- **Who it's for:** Independent music producers and composers building a career.
- **Space/industry:** Music-tech / creator tools. Peers: SoundCloud, BandLab, Highnote.
- **Project type:** Mobile-first web app (Next.js + Tailwind), PWA.

## App-wide Aesthetic (existing, unchanged)
- **Direction:** Minimal Apple-like, dark.
- **Base background:** `#111114`
- **Accent:** amber `#f5a623` (Tailwind `accent`)
- **Surfaces:** `bg-white/5` cards, `border-white/10`, radius 12–24px
- **Motion:** springs at stiffness ~380; subtle, never decorative
- **Typography:** system sans (General Sans piloting in Feedback module — see below)

---

## Feedback Module — "La Cinta Marcada" (approved 2026-07-02)

**Visual thesis:** a track under review is a reel of studio tape, and every comment is a
grease-pencil mark a peer left on it. The UI is the tape; playback replays the session.
The comments are the star — the player is the stage.

**Approved layout: Variant A · Margen** (see `~/.gstack/projects/pvcosalaz-fennec/designs/design-system-20260702/`)

### Aesthetic Direction
- **Direction:** Quiet analog studio object — not a streaming player.
- **Decoration level:** intentional (tape surface, grease-pencil ticks, rubber-stamp chips)
- **Mood:** "me dejaron notas" — someone was here before me, listening carefully.

### Typography (module pilot — rest of app keeps system sans)
- **UI/Structure:** General Sans (Fontshare) — titles, buttons, labels. Neutral-warm grotesque.
- **Comments:** Newsreader (Google Fonts) — **the load-bearing decision.** Serif with real
  italics turns peer feedback into writing: margin notes, not chat bubbles.
- **Timecodes/Data:** Space Mono — tape-counter feel for ticks, timecodes, metadata.
- **Loading:** CSS `@import` in globals.css (Fontshare + Google Fonts CDN).

### Color
- **Approach:** restrained monochrome + rationed amber.
- **Tape surface:** `#131216` (one step warmer than app base)
- **Ink:** white at 92% / 60% / 30% opacity — full hierarchy in monochrome.
- **THE AMBER RULE:** amber `#f5a623` means "a human was here." It appears ONLY on:
  comment ticks, the playhead dot, a speaking comment's flare (`#ffc861` hot), and the
  karma stamp. Never on progress fills, never on generic UI. Color density = conversation density.
- **Supporting:** amber wash `rgba(245,166,35,.08)` (active card bg), deep amber `#3a2a12` (filled states).

### Layout
- **The tape IS the screen (full-bleed).** No card, no rounded box — the tape surface
  fills everything except the bottom nav. Gradient depth: `#17151b → #131216 → #0f0e12`.
- **Everything else floats as liquid glass** (Apple-style): track-info panel top-left,
  timecode chip top-right, transport pill bottom-center. Glass recipe:
  `rgba(19,18,22,.55)` + `blur(24px) saturate(160%)` + hairline `white/12` border +
  `inset 0 1px 0 white/8` top highlight.
- **Time runs vertically** down a 2px tape spine offset left (~48–56px) like a margin rule.
- Faint Space Mono tick labels every 15s on the spine.
- Comment cards dock to the spine at their timestamp, right of the spine. Untimed
  "general notes" dock at the end of the tape, past the last second.
- **Fixed now-line** at 38% viewport height (full width) with the amber playhead dot.
- On play, the feed auto-scrolls past the now-line at constant px/sec (the session flows
  through the present). ~9 px per second of audio.
- **No horizontal waveform.** The only audio visualization is the spine breathing with the
  live Web Audio analyser (2px→8px swell + glow, synthetic pulse fallback on iOS).
- **Secondary actions hide behind a ⋯ toggle** in the transport pill: Melody Bank and
  My Tracks fly out as glass pills only when asked for. The screen belongs to the tape.

### Motion
- **Approach:** intentional. Springs at the app's stiffness-380 tuning.
- **Play ritual (600ms):** header recedes (scale .97, opacity .6), amber charge travels
  down the spine to the now-line like tape threading, then audio starts.
- **A comment speaks:** when its timestamp crosses the now-line it locks ~4s — scale 1.03,
  text 60%→100% white, tick flares hot amber, one soft haptic — then releases and cools.
- **Reduced motion:** all of the above collapses to opacity crossfades.

### Interactions
- **Comment = a gesture on time:** long-press the spine/feed at any moment — a grease-pencil
  tick draws on (200ms SVG stroke), audio ducks −6dB, an inline writing slot opens at that
  position in the timeline. Typing is Newsreader italic. Post → mark stays, audio unducks.
  The old bottom-sheet modal is retired in this module.
- **Scrub = drag the feed itself.** Ghost timecode follows the finger; release seeks.
- **Close marks cluster.** Comments chained ≤10s apart collapse into a glass chip
  (stacked avatars + "N marks" in amber + time range). The cluster fans open on tap,
  or on its own when the playhead enters its range, and folds back when it leaves.
  Every member keeps its honest amber tick on the spine — tick density shows
  conversation density even when collapsed.
- **No likes, hearts, or reaction counts.** The only reaction is the track owner's
  **"✓ this helped" stamp** (amber, grease-pencil style, rotated −2.5°) which feeds the
  commenter's karma. Feedback answers to the artist, not the crowd. The artist stamps
  from My Tracks (expand a track → its marks → stamp button).
- **Karma economy (live since 2026-07-03, enforced in Postgres — see
  `supabase/migrations/20260703_karma.sql` + `_v2.sql` + `_v3.sql`):** everyone starts
  with 5 · the ONLY earned karma is the artist's stamp (+2) — commenting alone earns
  nothing, by design: anything per-comment gets farmed with junk comments · uploading
  costs 5 · Pro gets 5 free uploads per calendar month, then pays karma like everyone ·
  karma can be bought (Stripe one-time checkout, $1.99 → 10 karma, constants in
  `lib/karma.ts`). Balance shows as a glass chip under the timecode and as the
  wallet in My Tracks. Skip streak still caps at 4.
- **Anti-collusion locks (v3):** the seal always lands socially, but the +2 payout is
  gated server-side: pays at most once per commenter per track (gifting a friend +2
  again requires a new −5 upload → farming is net-negative), and at most 3 times per
  7 days from the same artist to the same commenter (closes the Pro-free-uploads
  loophole; ceiling = 6 karma/week per pair). A payout-capped seal sends no
  "+2 karma" notification.
- **Skip streak measures EARLY BAILS, not listens (v2, 2026-07-03):** pass before 50%
  of the track → streak +1 · pass at 50–80% → neutral · listen ≥80% or to the end →
  streak resets (a real listen is already value for the artist). The wall only ever
  stops serial zapping; genuine listeners get infinite sessions. The end-of-track
  recap has a "Next track" button that never counts as a skip.
- **First-visit intro (TapeIntro):** bottom sheet styled like the module (mini spine,
  amber ticks, serif) walking through: the tape metaphor → hold to mark → seals pay
  karma → upload your first track (CTA into My Tracks). Shows once (localStorage),
  reopenable anytime from the ⋯ flyout ("How it works").
- **Track end:** session recap — "N productores marcaron M momentos" on a miniature spine.
  Future: Remotion renders it as a shareable vertical video (IG stories growth loop).
- **Empty state:** bare spine + one Newsreader italic line:
  "Nobody's marked this tape yet. Hold the line where you hear something."

## Spacing
- **Base unit:** 4px; comfortable density; module inherits app paddings (16–20px gutters).

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-02 | Cinta Marcada system created, Variant A (Margen) approved | /design-consultation — research (SoundCloud/Highnote) + dual design voices converged on inverting the hierarchy: comments are the terrain, audio organizes them |
| 2026-07-02 | Amber = human presence only | Makes color measure the north star: "la conversación sobre el track" |
| 2026-07-02 | Comments in Newsreader serif | Reframes feedback as writing; nobody in the category does it |
| 2026-07-03 | Full-bleed tape + liquid glass chrome | Paco: the tape should own the whole screen; header/transport float as Apple-style glass; Melody Bank & My Tracks hidden behind ⋯ toggle |
| 2026-07-03 | Karma economy: +2 stamp only, −5 upload, start 5; uploads open to everyone; Pro = 5 free/month | Paco: karma for all with Pro perk capped monthly — the daily loop (listen → mark → get stamped → upload) is the retention engine |
| 2026-07-03 | v2: comments alone earn NOTHING — only the artist's stamp pays (+2). Karma purchasable via Stripe ($1.99 → 10) | Paco: per-comment karma gets perma-farmed with junk comments; quality is judged by the artist. Purchase = relief valve; $1.99 floor because Stripe's fixed fee eats ~33% of a $1 charge |
| 2026-07-03 | v3: stamp payouts gated — once per commenter per track + max 3/week per artist→commenter pair; seal itself stays unlimited | Paco: two friends would stamp-farm each other. Locks make collusion net-negative (−5 upload per +2 gift) and cap the Pro-free-upload loophole at 6 karma/week per pair |
| 2026-07-03 | Skip streak counts early bails only (<50%); real listens (≥80%/end) reset it; "Next track" on recap | Paco: the old wall capped every session at ~4 tracks even for genuine listeners — engagement killer. Now the wall only stops zapping |
| 2026-07-03 | TapeIntro: first-visit sheet + "How it works" in the ⋯ flyout, with "upload your first track" CTA | Paco: new users need the metaphor explained once and a path to their first upload; reopenable, never nags |
