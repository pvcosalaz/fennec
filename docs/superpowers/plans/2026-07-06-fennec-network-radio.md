# Fennec Network (voice-radio + Wallet deck) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Network module into a deck of face-to-face-collected Fennec ID cards that communicate through a radio of voice notes.

**Architecture:** Extends the existing `network_connections` table and reuses Melody Bank's `uploadAudio`. Three shippable phases: (1) Wallet-deck shelf + immutable global `fennec_number`, (2) dynamic-QR mutual handshake + public `/u/[username]` page, (3) voice-note radio on the card back with 48h "on air" + "print to tape" archive. All connection/DM security lives in Postgres RLS + SECURITY DEFINER RPCs — the client can't bypass it.

**Tech Stack:** Next.js (app router) + React, Supabase (Postgres + Storage + RLS), TypeScript. Spring animations via CSS/anime patterns already in the repo. QR: `qrcode` (generate) + `@yudiel/react-qr-scanner` (scan) — added in Phase 2.

## Verification model (this repo has NO test runner)
There is no vitest/jest/playwright. Verify each task with the tools this codebase already uses:
- **Types:** `"/Users/pacosalazar/Documents/Fennec App/fennec/node_modules/.bin/tsc" --noEmit -p tsconfig.json` → expect `TSC_DONE` with no errors.
- **DB / RLS / RPC behavior:** probe Supabase REST with the anon key (unauthorized path must fail) and the service-role key (data check), exactly as done for the karma/security work. Keys are in `.env.local` (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`).
- **UI:** `preview_start` (launch config `fennec-dev`, port 3100) → navigate → `preview_screenshot` / `preview_snapshot`. A dev harness page is added per UI task where auth is needed.
- **Migrations are run by Paco** in the Supabase SQL editor (same as the karma series). Each migration task ends by telling Paco to run it; do NOT block on it — code must tolerate the pre-migration state (feature-detect columns/tables, return empty/null on error).

---

# PHASE 1 — Shelf + global number

### Task 1: Migration — `fennec_number` column, backfill, assign-on-create

**Files:**
- Create: `supabase/migrations/20260706_fennec_number.sql`

- [ ] **Step 1: Write the migration**

```sql
-- ═══ Fennec Network · global #number (immutable, order of joining) ═══
-- One number per producer, engraved on their card forever.

-- 1) Column
alter table public.profiles
  add column if not exists fennec_number integer;

-- 2) Backfill existing users by join order (created_at, then id as tiebreak)
with ordered as (
  select id, row_number() over (order by created_at asc, id asc) as n
  from public.profiles
)
update public.profiles p
set fennec_number = ordered.n
from ordered
where p.id = ordered.id and p.fennec_number is null;

-- 3) Uniqueness + fast lookup
create unique index if not exists profiles_fennec_number_key
  on public.profiles(fennec_number);

-- 4) Assign the next number on new-profile insert (immutable thereafter)
create or replace function public.fn_assign_fennec_number()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.fennec_number is null then
    select coalesce(max(fennec_number), 0) + 1 into new.fennec_number from profiles;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assign_fennec_number on public.profiles;
create trigger trg_assign_fennec_number
  before insert on public.profiles
  for each row execute function public.fn_assign_fennec_number();

-- 5) Lock it: users may not change their own number (defense in depth on top
--    of the column-grant work from 20260703_security_rls.sql — fennec_number
--    is simply never granted to authenticated for UPDATE, so this is belt +
--    suspenders via a guard trigger).
create or replace function public.fn_protect_fennec_number()
returns trigger
language plpgsql
as $$
begin
  if new.fennec_number is distinct from old.fennec_number then
    new.fennec_number := old.fennec_number; -- silently ignore attempts
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_fennec_number on public.profiles;
create trigger trg_protect_fennec_number
  before update on public.profiles
  for each row execute function public.fn_protect_fennec_number();
```

- [ ] **Step 2: Verify the SQL parses**

There is no local Postgres. Sanity-check by eye that every `create`/`alter` is idempotent (`if not exists` / `or replace` / `drop ... if exists`). Confirm no statement references a column that doesn't exist yet.

- [ ] **Step 3: Commit**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
git add supabase/migrations/20260706_fennec_number.sql
git commit -m "feat(network): fennec_number migration — immutable global join number"
```

- [ ] **Step 4: Hand off to Paco**

Tell Paco: "Run `supabase/migrations/20260706_fennec_number.sql` in the Supabase SQL editor when ready — it backfills every existing profile with a join-order number and assigns one to each new signup." Do not block; Phase 1 UI tolerates a null number (renders nothing).

---

### Task 2: Type + fetch — expose `fennec_number` on Profile

**Files:**
- Modify: `lib/communityTypes.ts` (the `Profile` type)

- [ ] **Step 1: Add the field to the Profile type**

In `lib/communityTypes.ts`, inside `export type Profile = { ... }`, add after `fennec_db_score`:

```ts
  fennec_number?: number | null;
```

`getNetworkContacts` already does `select("*")`, so the value arrives automatically once the column exists. No fetch change needed.

- [ ] **Step 2: Verify types**

Run: `"/Users/pacosalazar/Documents/Fennec App/fennec/node_modules/.bin/tsc" --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/communityTypes.ts
git commit -m "feat(network): add fennec_number to Profile type"
```

---

### Task 3: FennecIdCard — engrave the #number

**Files:**
- Modify: `components/network/FennecIdCard.tsx`

- [ ] **Step 1: Read the card's props + render**

Open `components/network/FennecIdCard.tsx`. It takes `FennecIdCardProps` (line ~30) and renders the card body (~line 134+). Find where the FENNEC dB band renders (`grep -n "FENNEC dB"` → two hits, the score band).

- [ ] **Step 2: Add a number prop and render it**

Add to `FennecIdCardProps`:
```ts
  fennecNumber?: number | null;
```
Destructure it in the component signature (`fennecNumber,`). In the score/footer band, render it as a mono, low-emphasis tag (matching the card's typography). Place it near the QR or footer:
```tsx
{fennecNumber != null && (
  <span
    style={{
      fontFamily: "var(--font-tape-mono, monospace)",
      fontSize: 10, letterSpacing: "0.14em",
      color: "rgba(255,255,255,0.5)",
    }}
  >
    #{String(fennecNumber).padStart(4, "0")}
  </span>
)}
```

- [ ] **Step 3: Pass it from the dashboard's own card**

In `components/dashboard/Dashboard.tsx`, find where `FennecIdCard` (or the inline card) reads `networkProfile`, and pass `fennecNumber={networkProfile?.fennec_number}`. (If the dashboard uses an inline card rather than the component, add the same `#NNNN` tag there using `networkProfile?.fennec_number`.)

- [ ] **Step 4: Verify types + preview**

Run tsc (expect clean). Then `preview_start` `fennec-dev`, open the app, and screenshot the dashboard card — the `#NNNN` tag should show once the migration has run (before that it's absent, which is fine).

- [ ] **Step 5: Commit**

```bash
git add components/network/FennecIdCard.tsx components/dashboard/Dashboard.tsx
git commit -m "feat(network): engrave #fennec_number on the ID card"
```

---

### Task 4: NetworkShelf — the Apple Wallet deck

**Files:**
- Create: `components/network/NetworkShelf.tsx`
- Modify: `components/network/NetworkSection.tsx` (render NetworkShelf instead of NetworkCollection)

- [ ] **Step 1: Build the stacked deck**

Create `components/network/NetworkShelf.tsx`. It receives `contacts: Profile[]` and renders them as a Wallet-style stack: each card is `position: absolute` offset by `index * 62px` from the top, only its header (avatar + name + identity color strip + `#NNNN`) peeking; tapping a card raises it to the front and expands to the full `FennecIdCard`. Use the identity color via `getColorScheme(contact.color_id)` (already imported pattern in Dashboard). Entrance: a spring stagger — reuse the CSS `@keyframes` approach (`translateY` + fade, `animation-delay: index * 60ms`), respecting `prefers-reduced-motion`.

```tsx
"use client";
import { useState } from "react";
import type { Profile } from "@/lib/communityTypes";
import FennecIdCard from "./FennecIdCard";
import { getColorScheme } from "@/lib/fennecIdPalette";

const PEEK = 62; // px each stacked card's header shows

export default function NetworkShelf({ contacts }: { contacts: Profile[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (contacts.length === 0) {
    return (
      <p className="text-[13px] italic text-zinc-500 py-8 text-center"
         style={{ fontFamily: "var(--font-tape-serif, Georgia, serif)" }}>
        No cards yet. Scan a producer in person to start your deck.
      </p>
    );
  }

  return (
    <div className="relative" style={{ height: contacts.length * PEEK + 220 }}>
      {contacts.map((c, i) => {
        const open = openId === c.id;
        const scheme = getColorScheme(c.color_id);
        return (
          <div
            key={c.id}
            onClick={() => setOpenId(open ? null : c.id)}
            className="absolute left-0 right-0 cursor-pointer transition-transform duration-300"
            style={{
              top: open ? 0 : i * PEEK,
              zIndex: open ? 100 : i,
              transform: open ? "scale(1)" : "scale(0.98)",
              animation: `shelfRise .5s cubic-bezier(.16,1,.3,1) both`,
              animationDelay: `${i * 60}ms`,
            }}
          >
            <FennecIdCard
              /* Prop names: open components/dashboard/Dashboard.tsx, find where it
                 renders the ID card, and copy that exact prop list — map each from
                 `c` (the peer's Profile) instead of the logged-in networkProfile.
                 The card already accepts these; you're just feeding a different
                 profile. Add only the two NEW props below. */
              collapsed={!open}
              fennecNumber={c.fennec_number}
              accent={scheme.accent}
              /* …remaining card props mirrored from Dashboard, sourced from `c`… */
            />
          </div>
        );
      })}
      <style>{`
        @keyframes shelfRise { from { opacity:0; transform: translateY(16px) scale(.96); } to { opacity:1; } }
        @media (prefers-reduced-motion: reduce) { [style*="shelfRise"] { animation: none !important; } }
      `}</style>
    </div>
  );
}
```

Note: `FennecIdCard` needs a `collapsed?: boolean` prop that, when true, renders only the header row. Add it in this task (small conditional in the card's JSX — wrap the body below the header in `{!collapsed && (...)}`).

- [ ] **Step 2: Swap it into NetworkSection**

In `components/network/NetworkSection.tsx`, replace `import NetworkCollection` + `<NetworkCollection contacts={contacts} />` with `NetworkShelf`:
```tsx
import NetworkShelf from "./NetworkShelf";
// …
<NetworkShelf contacts={contacts} />
```

- [ ] **Step 3: Verify types + preview**

Run tsc (clean). `preview_start`, navigate to the Network view (Business Hub → network), screenshot: the deck should stack with peeking headers and expand one card on tap. With zero contacts, the empty-state line shows.

- [ ] **Step 4: Commit**

```bash
git add components/network/NetworkShelf.tsx components/network/NetworkSection.tsx components/network/FennecIdCard.tsx
git commit -m "feat(network): Wallet-deck shelf view (stacked, tap to expand)"
```

**PHASE 1 SHIPS HERE** — deck view + numbers, using existing connections. No new connect mechanic yet.

---

# PHASE 2 — The handshake (dynamic QR mutual exchange)

### Task 5: Migration — `connection_tokens` + mint/redeem RPCs

**Files:**
- Create: `supabase/migrations/20260706_connection_handshake.sql`

- [ ] **Step 1: Write the migration**

```sql
-- ═══ Fennec Network · dynamic handshake ═══
-- A ~60s token turns "scan me" into a mutual, un-fakeable exchange.

create table if not exists public.connection_tokens (
  token       uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '60 seconds',
  redeemed    boolean not null default false
);
alter table public.connection_tokens enable row level security;
-- No direct client access; everything goes through the definer RPCs below.

-- Mint: caller creates a short-lived token for themselves.
create or replace function public.mint_connection_token()
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_token uuid;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  insert into connection_tokens (user_id) values (auth.uid())
  returning token into v_token;
  return v_token;
end;
$$;
grant execute on function public.mint_connection_token() to authenticated;

-- Redeem: the scanner burns the token and both cards enter both decks.
create or replace function public.redeem_connection_token(p_token uuid)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_owner  uuid;
  v_tok    record;
  v_profile json;
begin
  if v_caller is null then raise exception 'UNAUTHENTICATED'; end if;

  select * into v_tok from connection_tokens where token = p_token for update;
  if not found then raise exception 'TOKEN_NOT_FOUND'; end if;
  if v_tok.redeemed then raise exception 'TOKEN_USED'; end if;
  if v_tok.expires_at < now() then raise exception 'TOKEN_EXPIRED'; end if;

  v_owner := v_tok.user_id;
  if v_owner = v_caller then raise exception 'CANNOT_CONNECT_SELF'; end if;

  update connection_tokens set redeemed = true where token = p_token;

  -- both directions, idempotent
  insert into network_connections (owner_id, contact_id)
    values (v_caller, v_owner) on conflict (owner_id, contact_id) do nothing;
  insert into network_connections (owner_id, contact_id)
    values (v_owner, v_caller) on conflict (owner_id, contact_id) do nothing;

  select json_build_object(
    'id', id, 'username', username, 'display_name', display_name,
    'avatar_url', avatar_url, 'role', role, 'color_id', color_id,
    'fennec_number', fennec_number, 'fennec_db_score', fennec_db_score
  ) into v_profile from profiles where id = v_owner;

  return json_build_object('ok', true, 'peer', v_profile);
end;
$$;
grant execute on function public.redeem_connection_token(uuid) to authenticated;

-- Housekeeping: expired/unredeemed tokens are dead weight.
-- (Reuses the notifications cron pattern; a periodic delete is enough.)
```

- [ ] **Step 2: Sanity-check idempotency + commit**

Confirm `if not exists` / `or replace`. Then:
```bash
git add supabase/migrations/20260706_connection_handshake.sql
git commit -m "feat(network): connection handshake — dynamic token + mutual-exchange RPC"
```

- [ ] **Step 3: Hand off + probe after Paco runs it**

Tell Paco to run it. Once run, probe with the service-role key that the RPC exists and rejects self/expired:
```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
SRK=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env.local | cut -d= -f2-)
URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2-)
curl -s -X POST "$URL/rest/v1/rpc/mint_connection_token" -H "apikey: $SRK" -H "Authorization: Bearer $SRK" | head -c 120
# Expect: an error about auth.uid() being null (service role has no uid) OR a uuid —
# either proves the function is installed. Real behavior is validated in-app in Task 7.
```

---

### Task 6: networkDb — mint/redeem client helpers

**Files:**
- Modify: `lib/networkDb.ts`

- [ ] **Step 1: Add the helpers**

Append to `lib/networkDb.ts`:
```ts
/** Mint a ~60s QR token representing "connect with me". */
export async function mintConnectionToken(): Promise<string | null> {
  const { data, error } = await supabase.rpc("mint_connection_token");
  if (error) { console.error("[mintConnectionToken]", error.message); return null; }
  return data as string;
}

export type RedeemResult =
  | { ok: true; peer: Profile }
  | { ok: false; reason: string };

/** Redeem a scanned token → mutual connection. Returns the peer for the flip. */
export async function redeemConnectionToken(token: string): Promise<RedeemResult> {
  const { data, error } = await supabase.rpc("redeem_connection_token", { p_token: token });
  if (error) return { ok: false, reason: error.message };
  const d = data as { ok?: boolean; peer?: Profile };
  return d?.ok ? { ok: true, peer: d.peer as Profile } : { ok: false, reason: "unknown" };
}
```

- [ ] **Step 2: Verify types + commit**

Run tsc (clean).
```bash
git add lib/networkDb.ts
git commit -m "feat(network): mint/redeem connection-token client helpers"
```

---

### Task 7: ScanSheet — camera + dynamic QR + flip ceremony

**Files:**
- Create: `components/network/ScanSheet.tsx`
- Modify: `package.json` (add `qrcode` + `@yudiel/react-qr-scanner`)
- Modify: `components/network/NetworkSection.tsx` (add a "Scan" button that opens ScanSheet)

- [ ] **Step 1: Install QR deps**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
npm install qrcode @yudiel/react-qr-scanner
npm install -D @types/qrcode
```

- [ ] **Step 2: Build ScanSheet**

Create `components/network/ScanSheet.tsx`. It is a bottom sheet (reuse `useSheetDismiss` + `SHEET_BOTTOM` + `SHEET_ENTER` from `components/ui/useSheetDismiss.ts`). On open it calls `mintConnectionToken()`, renders that token as a QR (`qrcode.toDataURL`), and mounts the scanner (`@yudiel/react-qr-scanner`) below it. When the scanner reads a value, call `redeemConnectionToken(value)`; on `ok`, play the flip ceremony (a CSS flip on a card showing `peer`, + `navigator.vibrate?.(10)`) and call `onConnected(peer)`. Re-mint the token every 55s while open.

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Scanner } from "@yudiel/react-qr-scanner";
import { mintConnectionToken, redeemConnectionToken } from "@/lib/networkDb";
import { useSheetDismiss, SHEET_BOTTOM, SHEET_ENTER } from "@/components/ui/useSheetDismiss";
import type { Profile } from "@/lib/communityTypes";

export default function ScanSheet({
  onClose, onConnected,
}: { onClose: () => void; onConnected: (peer: Profile) => void }) {
  const { sheetRef, dismiss } = useSheetDismiss(onClose);
  const [qr, setQr] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    let alive = true;
    const mint = async () => {
      const t = await mintConnectionToken();
      if (alive && t) setQr(await QRCode.toDataURL(t, { margin: 1, width: 220 }));
    };
    mint();
    const id = setInterval(mint, 55_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  async function onScan(codes: { rawValue: string }[]) {
    if (busy.current || !codes[0]) return;
    busy.current = true;
    setStatus("Connecting…");
    const res = await redeemConnectionToken(codes[0].rawValue.trim());
    if (res.ok) {
      navigator.vibrate?.(10);
      onConnected(res.peer);
      dismiss();
    } else {
      setStatus(prettyReason(res.reason));
      setTimeout(() => { busy.current = false; setStatus(null); }, 1600);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm"
           style={{ animation: "sheetFadeIn .25s ease both" }} onClick={dismiss} />
      <div ref={sheetRef}
           className="fixed inset-x-0 z-[70] mx-auto w-full max-w-md rounded-t-3xl border-t border-white/10 px-6 pt-3 pb-8"
           style={{ bottom: SHEET_BOTTOM, background: "#131216", animation: SHEET_ENTER }}>
        <div className="flex justify-center mb-4"><div className="w-10 h-1 rounded-full bg-white/20" /></div>
        <p className="text-center text-sm font-bold text-white mb-1">Trade cards</p>
        <p className="text-center text-[11px] text-zinc-500 mb-4">Scan each other in person to connect.</p>
        {qr && <img src={qr} alt="Your connect code" className="mx-auto rounded-xl mb-4" width={180} height={180} />}
        <div className="rounded-2xl overflow-hidden aspect-square max-w-[240px] mx-auto">
          <Scanner onScan={onScan} components={{ audio: false, finder: false }} />
        </div>
        {status && <p className="text-center text-[12px] text-amber-400 mt-3">{status}</p>}
      </div>
    </>
  );
}

function prettyReason(r: string): string {
  if (r.includes("TOKEN_EXPIRED")) return "That code expired — ask them to reopen Scan.";
  if (r.includes("TOKEN_USED")) return "Already connected.";
  if (r.includes("CANNOT_CONNECT_SELF")) return "That's your own code.";
  return "Couldn't connect — try again.";
}
```

- [ ] **Step 3: Wire a Scan button + refresh on connect**

In `components/network/NetworkSection.tsx`: add a `showScan` state and a "Scan" button in the header; render `<ScanSheet onClose={...} onConnected={() => { setShowScan(false); reload(); }} />` when open, where `reload()` re-runs `getNetworkContacts`. Camera needs HTTPS — note it works on the deployed Vercel URL and `localhost`, not on a LAN IP.

- [ ] **Step 4: Verify types + preview**

Run tsc (clean). Camera can't be exercised headless; verify the sheet opens, shows a QR image, and mounts the scanner viewport via `preview_snapshot`. Full scan is validated on-device by Paco.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json components/network/ScanSheet.tsx components/network/NetworkSection.tsx
git commit -m "feat(network): ScanSheet — dynamic QR + camera + mutual-exchange flip"
```

---

### Task 8: Public profile page `/u/[username]`

**Files:**
- Create: `app/u/[username]/page.tsx`
- Modify: `lib/networkDb.ts` (add `fetchPublicProfile`, `requestConnection`)
- Create: `supabase/migrations/20260706_connection_requests.sql`

- [ ] **Step 1: Migration for connection requests**

```sql
-- ═══ Fennec Network · connect requests (from the public /u page + v2 card) ═══
create table if not exists public.connection_requests (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  target_id    uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  status       text not null default 'pending' check (status in ('pending','accepted','ignored')),
  unique(requester_id, target_id)
);
alter table public.connection_requests enable row level security;

drop policy if exists "see requests i sent or received" on public.connection_requests;
create policy "see requests i sent or received" on public.connection_requests
  for select using (auth.uid() = requester_id or auth.uid() = target_id);

drop policy if exists "create my own request" on public.connection_requests;
create policy "create my own request" on public.connection_requests
  for insert with check (auth.uid() = requester_id);

drop policy if exists "target updates status" on public.connection_requests;
create policy "target updates status" on public.connection_requests
  for update using (auth.uid() = target_id);
```
Commit + hand to Paco.

- [ ] **Step 2: Public profile fetch (read-only, safe columns only)**

Add to `lib/networkDb.ts`:
```ts
export async function fetchPublicProfile(username: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, banner_url, role, country, genres, color_id, fennec_number, fennec_db_score, instagram, spotify, youtube_url, tiktok")
    .eq("username", username)
    .maybeSingle();
  if (error) { console.error("[fetchPublicProfile]", error.message); return null; }
  return (data as Profile) ?? null;
}

export async function requestConnection(targetId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase.from("connection_requests")
    .insert({ requester_id: user.id, target_id: targetId });
  if (error && !error.message.includes("duplicate")) {
    console.error("[requestConnection]", error.message); return false;
  }
  return true;
}
```

- [ ] **Step 3: The page (route `/u/[username]`, NOT `/@` — that's a Next parallel-route)**

Create `app/u/[username]/page.tsx`: a server-friendly client page that fetches `fetchPublicProfile(params.username)`, renders the read-only Fennec ID card (reuse `FennecIdCard` in `collapsed={false}`), and shows a "Request to connect" button that calls `requestConnection(profile.id)` when signed in (or routes to auth if not). If no profile, render a minimal "Producer not found."

- [ ] **Step 4: Verify types + preview**

Run tsc (clean). `preview_start`, open `http://localhost:3100/u/<an-existing-username>` (use a real username from the profiles table via a service-role probe), screenshot the public card + request button.

- [ ] **Step 5: Commit**

```bash
git add app/u/ lib/networkDb.ts supabase/migrations/20260706_connection_requests.sql
git commit -m "feat(network): public /u/[username] profile + request-to-connect (v2 NFC hook)"
```

**PHASE 2 SHIPS HERE** — in-person QR handshake works end to end; public profile page is live and is exactly what a v2 physical card will point at.

---

# PHASE 3 — The radio (voice notes)

### Task 9: Migration — `voice_notes` + connection-gated RLS + cleanup

**Files:**
- Create: `supabase/migrations/20260706_voice_notes.sql`

- [ ] **Step 1: Write the migration**

```sql
-- ═══ Fennec Network · the radio ═══
-- Voice notes between connected producers. "On air" 48h unless printed to tape.

create table if not exists public.voice_notes (
  id               uuid primary key default gen_random_uuid(),
  sender_id        uuid not null references public.profiles(id) on delete cascade,
  recipient_id     uuid not null references public.profiles(id) on delete cascade,
  audio_url        text not null,
  duration_seconds integer,
  created_at       timestamptz not null default now(),
  expires_at       timestamptz not null default now() + interval '48 hours',
  archived         boolean not null default false,  -- "printed to tape"
  played_at        timestamptz
);
alter table public.voice_notes enable row level security;

-- Helper: are these two producers connected (either direction)?
create or replace function public.are_connected(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from network_connections
    where (owner_id = a and contact_id = b) or (owner_id = b and contact_id = a)
  );
$$;

-- Read a note only if you're a party AND the two are connected.
drop policy if exists "read notes in my frequencies" on public.voice_notes;
create policy "read notes in my frequencies" on public.voice_notes
  for select using (
    (auth.uid() = sender_id or auth.uid() = recipient_id)
    and are_connected(sender_id, recipient_id)
  );

-- Send only as yourself, only to someone you're connected with.
drop policy if exists "send notes to connections" on public.voice_notes;
create policy "send notes to connections" on public.voice_notes
  for insert with check (
    auth.uid() = sender_id and are_connected(sender_id, recipient_id)
  );

-- Either party may archive ("print to tape") or mark played.
drop policy if exists "party updates note" on public.voice_notes;
create policy "party updates note" on public.voice_notes
  for update using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- Cleanup: hard-delete expired, un-archived notes. Called by the cron route.
create or replace function public.purge_expired_voice_notes()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with del as (
    delete from voice_notes
    where archived = false and expires_at < now()
    returning 1
  ) select count(*) into n from del;
  return n;
end;
$$;
```

Note on storage: audio objects go to the existing `community-audio` bucket via `uploadAudio`. Orphaned storage objects from purged notes are acceptable for v1 (bucket is public-read, cheap); a storage sweep can be added later. Commit + hand to Paco.

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260706_voice_notes.sql
git commit -m "feat(network): voice_notes table — connection-gated RLS + 48h purge"
```

---

### Task 10: networkDb — voice-note helpers (reuse uploadAudio)

**Files:**
- Modify: `lib/networkDb.ts`

- [ ] **Step 1: Add the types + helpers**

```ts
import { uploadAudio } from "@/lib/communityDb";

export type VoiceNote = {
  id: string;
  sender_id: string;
  recipient_id: string;
  audio_url: string;
  duration_seconds: number | null;
  created_at: string;
  expires_at: string;
  archived: boolean;
  played_at: string | null;
};

/** All notes in the frequency with one peer, oldest first. */
export async function fetchFrequency(userId: string, peerId: string): Promise<VoiceNote[]> {
  const { data, error } = await supabase
    .from("voice_notes")
    .select("*")
    .or(`and(sender_id.eq.${userId},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${userId})`)
    .order("created_at", { ascending: true });
  if (error) { console.error("[fetchFrequency]", error.message); return []; }
  return (data ?? []) as VoiceNote[];
}

/** Record → upload → insert. Returns the new note or null. */
export async function sendVoiceNote(
  senderId: string, recipientId: string, blob: Blob, durationSeconds: number
): Promise<VoiceNote | null> {
  const audio_url = await uploadAudio(blob, `vn-${senderId}-${Date.now()}.webm`);
  const { data, error } = await supabase.from("voice_notes")
    .insert({ sender_id: senderId, recipient_id: recipientId, audio_url, duration_seconds: durationSeconds })
    .select("*").single();
  if (error) { console.error("[sendVoiceNote]", error.message); return null; }
  return data as VoiceNote;
}

/** "Print to tape" — keep a note past 48h. */
export async function archiveNote(noteId: string): Promise<boolean> {
  const { error } = await supabase.from("voice_notes").update({ archived: true }).eq("id", noteId);
  if (error) { console.error("[archiveNote]", error.message); return false; }
  return true;
}
```

- [ ] **Step 2: Verify types + commit**

Run tsc (clean).
```bash
git add lib/networkDb.ts
git commit -m "feat(network): voice-note helpers (fetch/send/archive) reusing uploadAudio"
```

---

### Task 11: RadioFrequency — the card back (press-and-hold record + playback)

**Files:**
- Create: `components/network/RadioFrequency.tsx`

- [ ] **Step 1: Build the component**

Create `components/network/RadioFrequency.tsx`. Props: `{ userId: string; peer: Profile }`. On mount, `fetchFrequency(userId, peer.id)`. Render notes as a vertical list of playable bubbles (sender's on one side, peer's on the other), each with duration, a play button (`new Audio(note.audio_url)`), an amber "tape" stamp if `archived`, and a "print to tape" action if not. A **press-and-hold transmit button** (same gesture language as La Cinta's long-press) records via `MediaRecorder` (mirror the MelodyPicker recording pattern: `getUserMedia({audio:true})`, collect chunks, on release build a `Blob`, measure duration, call `sendVoiceNote`, then append the returned note). A rising waveform (simple CSS bars driven by the analyser, reuse the spine-amplitude idea from `ProjectReviewPlayer`) plays while holding. Respect `prefers-reduced-motion` (static bars). Cap recording at 60s (auto-stop).

Include:
- Pointer handlers `onPointerDown` (start recording) / `onPointerUp` + `onPointerLeave` (stop + send).
- A ref-based recorder so re-renders don't drop the stream.
- Optimistic append of the new note; on failure, remove it and show a small error line.

- [ ] **Step 2: Verify types + preview**

Run tsc (clean). Recording needs a mic + HTTPS (won't run headless). Verify the list renders and the transmit button mounts via `preview_snapshot`; real record/playback is validated on-device by Paco.

- [ ] **Step 3: Commit**

```bash
git add components/network/RadioFrequency.tsx
git commit -m "feat(network): RadioFrequency — press-and-hold voice notes on the card back"
```

---

### Task 12: Flip wiring + new-note notification + cleanup cron

**Files:**
- Modify: `components/network/FennecIdCard.tsx` (a back-face flip that mounts RadioFrequency)
- Modify: `components/network/NetworkShelf.tsx` (pass `userId` so the open card can render its back)
- Create: `app/api/cron/purge-voice-notes/route.ts`
- Modify: `vercel.json` (schedule the purge daily)
- Modify: `lib/networkDb.ts` (fire a notification on send — reuse notification infra)

- [ ] **Step 1: Card flip → RadioFrequency**

In `FennecIdCard.tsx`, add a `userId?: string` prop and a flip state. A small "radio" icon on the front flips the card (CSS `rotateY(180deg)` on a container with `transform-style: preserve-3d`); the back face renders `<RadioFrequency userId={userId} peer={/* this card's profile */} />`. Only mount the back when `userId` is present and the card is `!collapsed`.

- [ ] **Step 2: Pass userId through the shelf**

`NetworkShelf` already knows the viewer? It doesn't — add a `userId: string` prop to `NetworkShelf`, thread it from `NetworkSection` (which has it), and pass `userId={userId}` into the open `FennecIdCard`.

- [ ] **Step 3: Notification on new note**

In `sendVoiceNote` (success path), fire-and-forget a notification to `recipientId` reusing the existing notification pattern (see `lib/audioDb.ts` `createReviewComment` → `/api/notifications/...` with the Bearer token). Add a matching endpoint `app/api/notifications/voice-note/route.ts` that validates the token, confirms the two are connected (`are_connected` via admin), and creates a notification "🎙️ @sender sent you a voice note". Reuse `createNotification` + push.

- [ ] **Step 4: Purge cron**

Create `app/api/cron/purge-voice-notes/route.ts` (mirror `app/api/cron/social-stats/route.ts`: check `CRON_SECRET`, call `getSupabaseAdmin().rpc("purge_expired_voice_notes")`, return the count). Add to `vercel.json` crons:
```json
{ "path": "/api/cron/purge-voice-notes", "schedule": "0 6 * * *" }
```

- [ ] **Step 5: Verify types + preview + commit**

Run tsc (clean). Screenshot the flip (front → radio back) in preview.
```bash
git add components/network/FennecIdCard.tsx components/network/NetworkShelf.tsx components/network/NetworkSection.tsx app/api/cron/purge-voice-notes/route.ts app/api/notifications/voice-note/route.ts vercel.json lib/networkDb.ts
git commit -m "feat(network): card-back flip to radio + note notifications + purge cron"
```

**PHASE 3 SHIPS HERE** — the full radio: press-and-hold voice notes, 48h on-air with print-to-tape, notifications, and daily purge.

---

## Migration run order (for Paco, in the Supabase SQL editor)
1. `20260706_fennec_number.sql` (Phase 1)
2. `20260706_connection_handshake.sql` (Phase 2)
3. `20260706_connection_requests.sql` (Phase 2)
4. `20260706_voice_notes.sql` (Phase 3)

All are idempotent; re-running is safe. Each ships with its phase — don't run a phase's migration until its code is deployed (the code tolerates the pre-migration state).

## Post-implementation checks
- **Security:** after Phase 3, probe with the anon key that `voice_notes` returns 0 rows and that inserting a note between non-connected users is rejected (the RLS is the whole "no cold DMs" guarantee).
- **The 20260703_security_rls.sql column grants:** confirm `fennec_number` is not in the `authenticated` UPDATE grant list (it isn't — the guard trigger is belt + suspenders).
