# Fennec Network — Design Spec
**Date:** 2026-07-06 · Epic: "NFC Fennec IDs" (v1)

> **Soul:** Your network isn't a contact list or a text chat — it's a **deck
> of cards collected face to face**, and each card is a **radio frequency**
> you send voice notes to. In Fennec, you don't type. You sound.

---

## Locked decisions (from brainstorm)

1. **v1 = QR, not NFC.** Web NFC does not exist on iOS/Safari/PWAs, so the
   in-app connection ceremony is camera + QR (identical on iPhone and
   Android). The physical "NFC" card is a **v2 product** (merch) that writes
   a static URL — the same `/u/username` page v1 already builds, so v2 plugs
   in with zero refactor.
2. **Dynamic handshake.** In-app QR carries a ~60s token; scanning is a
   mutual, instant exchange (both cards land in both decks). Impossible to
   fake at a distance. The static `/u/username` URL only lets someone *request*
   to connect (owner approves) — protects "in person only" at the DB level.
3. **Communication = a radio of voice notes, not text.** Press-and-hold to
   talk (the same gesture as marking a moment on La Cinta). **Hybrid
   retention:** notes are "on air" for 48h by default; either party can
   **"print to tape"** (archive) a valuable note to keep it forever.
4. **One system.** You can only talk to producers in your deck. No
   connection → no frequency → no thread. Cold DMs are impossible *by
   architecture* (RLS requires a connection row). This also resolves the
   pending Community "private messages" question — it's answered by design.
5. **Global number.** Each producer gets one `fennec_number` (#0042) — order
   of joining Fennec, immutable, engraved on their card forever. Real
   scarcity; collectible for life. Backfilled by `created_at` for existing
   users.

## Non-goals (v1)
- No physical NFC cards (that's v2 — this spec only ensures the `/u/username`
  hook exists).
- No text chat, ever, in this module. Voice only.
- No group frequencies (1:1 only in v1).
- No Web NFC API usage anywhere.

---

## Experience

### The Shelf (main view — Apple Wallet deck)
Entering *My Network* shows collected cards **stacked like Apple Wallet** —
only each card's header peeks (avatar + name + their identity color). The
deck falls in with a spring stagger (same physics as La Cinta). Tap a card →
it **rises to front / fans open** (Wallet animation): full card shows their
*live* Fennec dB, genres, socials, and their global number (#0042). Cards are
**alive** — when the owner's dB or genres change, your copy of their card
updates. You collect living people, not screenshots.

### The Handshake (a new card enters)
A **Scan** button opens the camera and shows your own dynamic QR (a ~60s
token) at the same time. When two producers scan each other, **both cards
enter both decks instantly**, with a micro-ceremony: the two cards flip and
land on the shelf with a haptic. It's an exchange, not an "add" — it feels
like tapping physical cards together.

### The Card Back (the radio)
No "messages" tab. Flip a card (tap a back icon) and the **voice frequency
with that person lives there**. Your deck literally *is* your inbox: no card,
no conversation possible. Press-and-hold the transmit button to record; a
waveform rises as you speak; release to send. Notes play inline. Each note is
"on air" (fades at 48h) unless someone **prints it to tape** (archive → kept,
marked with an amber tape stamp).

### The number's aura
A #0087 sitting next to a #14203 tells a story without a word. Low numbers
become coveted ("first hundred"). Engraved on every card.

---

## Architecture

### Data (Postgres / Supabase)

**`profiles`** — one new column:
- `fennec_number` integer, unique. Assigned once when the Fennec ID is
  created; immutable. Backfill existing users ordered by `created_at`.

**`network_connections`** (exists) — the bidirectional relation. A successful
scan inserts **two rows** (A→B and B→A) in one transaction so the card lands
in both decks. RLS already present.

**`connection_tokens`** (new) — the dynamic handshake:
- `token` uuid, `user_id`, `expires_at` (~60s). Minted when Scan opens,
  burned on redeem. This is what makes remote scanning impossible.

**`voice_notes`** (new) — the radio:
- `id`, `sender_id`, `recipient_id`, `audio_url`, `duration_seconds`,
  `created_at`, `expires_at` (default now()+48h), `archived` boolean
  (default false; when true, `expires_at` is ignored), `played_at`.
- **RLS with teeth:** a row can be inserted or read only if a
  `network_connections` row exists between sender and recipient. "No cold
  DMs" becomes a database policy — unbreakable even via direct API calls.
- A scheduled cleanup (cron) hard-deletes rows where
  `archived = false AND expires_at < now()` (and removes their storage
  objects).

### The handshake, step by step
1. Open Scan → client calls RPC `mint_connection_token` → renders the QR and
   starts the camera.
2. Scan the other's QR → client calls `redeem_connection_token(token)`.
3. That RPC (SECURITY DEFINER) validates the token is live, not the caller's
   own, and unburned → inserts the two connection rows + burns the token,
   atomically. Returns the other's profile for the flip animation.

### v2 hook (physical card), built now
The static profile URL is `app.fennec.audio/u/username` (route
`app/u/[username]/page.tsx`). **Route note:** we deliberately do NOT use an
`@`-prefixed folder — in the Next.js app router `@folder` is the *parallel
routes* convention and would break, so the path is `/u/[username]` and the
"@handle" is only cosmetic in the UI. The page shows a **read-only public
profile** with a "Request to connect" button (the request the owner
approves). It lives on the app (Next + Supabase) because it needs live
profile data, not on the static landing. v1 builds this page — it doubles as
a shareable profile link today, and v2's physical NFC card just writes this
URL. Zero refactor when merch ships. (A vanity `fennec.audio/u/...` redirect
to the app can be added later; not required for v1.)

### Audio reuse
Recording + upload already exist for Melody Bank (`uploadAudio`, in-browser
recording). The radio reuses them: `voice_notes.audio_url` points at a
Supabase Storage object. No new audio infrastructure.

### Platform honesty
Nothing here uses Web NFC (absent on iOS). Everything runs on camera + QR,
identical across iPhone and Android. The "NFC" in the epic name arrives in v2
as the physical object pointing at `/u/username`.

---

## Code units (each one clear purpose)
- `lib/networkDb.ts` (extend) — `mintConnectionToken`, `redeemToken`,
  `fetchFrequency(peerId)`, `sendVoiceNote`, `archiveNote`.
- `components/network/NetworkShelf.tsx` — the Wallet deck (stack + spring).
- `components/network/FennecIdCard.tsx` (extend) — show `fennec_number`; flip.
- `components/network/ScanSheet.tsx` — camera + dynamic QR + flip ceremony.
- `components/network/RadioFrequency.tsx` — the card-back voice thread
  (press-and-hold record, inline playback, print-to-tape).
- `app/u/[username]/page.tsx` — public read-only profile (v2 hook + shareable;
  `/u/` not `/@` to avoid the Next.js parallel-routes collision).
- Migration SQL: `fennec_number`, `connection_tokens`, `voice_notes` + RLS +
  cleanup cron.

## Delivery in phases (each shippable alone)
1. **Shelf + number** — Wallet deck view, `fennec_number` migration + backfill,
   live cards. (No new connection mechanic yet; uses existing connections.)
2. **Handshake** — dynamic QR scan + mutual exchange + `/u/username` page.
3. **The radio** — voice notes on the card back, 48h air + print-to-tape,
   cleanup cron.

Phase order lets each land independently; the plan will detail tasks.

## Open questions for the plan (not blockers)
- Max voice-note length (propose 60s, matching a "quick radio call").
- Push notification on a new voice note (reuse existing notification infra).
- Camera permission UX / fallback when denied (manual code entry?).
