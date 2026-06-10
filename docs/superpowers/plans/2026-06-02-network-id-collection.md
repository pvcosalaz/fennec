# Network ID Card & Collection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Fennec ID card (redesigned visual identity) and a Network collection section in the Business tab, where each producer has a permanent random accent color and can view their own card plus connected producers in a collapsible deck.

**Architecture:** Three new components (`FennecIdCard`, `NetworkCollection`, `NetworkSection`) backed by a new `lib/networkDb.ts` and a `lib/fennecIdPalette.ts` constants file. The `profiles` table gets a `color_id` column. A new `network_connections` table stores peer connections. `BusinessHub` is updated to render `NetworkSection` below the existing content.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Supabase (existing client at `@/lib/supabase`), CSS transitions (no Framer Motion — not in project).

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `lib/fennecIdPalette.ts` | Create | 12-color palette + `getColorScheme(colorId)` helper |
| `lib/networkDb.ts` | Create | `ensureColorAssigned`, `getNetworkContacts` Supabase calls |
| `lib/communityTypes.ts` | Modify | Add `color_id` to `Profile` type |
| `lib/communityDb.ts` | Modify | Add `color_id` to `updateProfile` signature |
| `components/network/FennecIdCard.tsx` | Create | Pure presentational card component |
| `components/network/NetworkCollection.tsx` | Create | Collapsed deck → expanded Apple-Wallet stack |
| `components/network/NetworkSection.tsx` | Create | Own card + collection, loads data, calls `ensureColorAssigned` |
| `components/business/BusinessHub.tsx` | Modify | Import + render `NetworkSection` below revenue chart |
| `supabase/migrations/20260602_network.sql` | Create | `color_id` column + `network_connections` table with RLS |

---

## Task 1: Palette constants + types

**Files:**
- Create: `lib/fennecIdPalette.ts`
- Modify: `lib/communityTypes.ts`

- [ ] **Step 1: Create `lib/fennecIdPalette.ts`**

```ts
// lib/fennecIdPalette.ts

export type FennecIdColor = {
  id: string;
  accent: string;       // e.g. "#4d96ff"
  dark1: string;        // gradient start
  dark2: string;        // gradient end
  glowRgb: string;      // "77,150,255" for rgba()
  textOnAvatar: "white" | "black";
};

export const FENNEC_ID_PALETTE: FennecIdColor[] = [
  { id: "blue",   accent: "#4d96ff", dark1: "#1a1a2e", dark2: "#0f0f1a", glowRgb: "77,150,255",   textOnAvatar: "white" },
  { id: "green",  accent: "#6bcb77", dark1: "#1a2e1a", dark2: "#0f1a0f", glowRgb: "107,203,119",  textOnAvatar: "black" },
  { id: "purple", accent: "#c77dff", dark1: "#2e1a2e", dark2: "#1a0f1a", glowRgb: "199,125,255",  textOnAvatar: "black" },
  { id: "red",    accent: "#ff6b6b", dark1: "#2e1a1a", dark2: "#1a0f0f", glowRgb: "255,107,107",  textOnAvatar: "black" },
  { id: "amber",  accent: "#f5a623", dark1: "#2e2214", dark2: "#1a1209", glowRgb: "245,166,35",   textOnAvatar: "black" },
  { id: "cyan",   accent: "#00d4ff", dark1: "#0f2030", dark2: "#081520", glowRgb: "0,212,255",    textOnAvatar: "black" },
  { id: "pink",   accent: "#ff6eb4", dark1: "#2e1a26", dark2: "#1a0f17", glowRgb: "255,110,180",  textOnAvatar: "black" },
  { id: "lime",   accent: "#b5ff6b", dark1: "#1e2e0f", dark2: "#111a09", glowRgb: "181,255,107",  textOnAvatar: "black" },
  { id: "indigo", accent: "#818cf8", dark1: "#1a1a35", dark2: "#0f0f22", glowRgb: "129,140,248",  textOnAvatar: "white" },
  { id: "orange", accent: "#ff9f43", dark1: "#2e1f0f", dark2: "#1a120a", glowRgb: "255,159,67",   textOnAvatar: "black" },
  { id: "teal",   accent: "#2ed573", dark1: "#0f2e20", dark2: "#091a13", glowRgb: "46,213,115",   textOnAvatar: "black" },
  { id: "rose",   accent: "#ff4757", dark1: "#2e0f14", dark2: "#1a090c", glowRgb: "255,71,87",    textOnAvatar: "white" },
];

/** Returns color scheme for a given colorId. Falls back to "blue" if not found. */
export function getColorScheme(colorId: string | null | undefined): FennecIdColor {
  return FENNEC_ID_PALETTE.find((c) => c.id === colorId) ?? FENNEC_ID_PALETTE[0];
}

/** Picks a random color from the palette. Used once at first load. */
export function randomColorId(): string {
  return FENNEC_ID_PALETTE[Math.floor(Math.random() * FENNEC_ID_PALETTE.length)].id;
}
```

- [ ] **Step 2: Add `color_id` to `Profile` type in `lib/communityTypes.ts`**

Open `lib/communityTypes.ts`. Find the `Profile` type (line ~4). Add `color_id` after `tiktok`:

```ts
export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  is_pro: boolean;
  is_bot: boolean;
  fennec_db_score: number;
  created_at: string;
  bio: string | null;
  genres: string[];
  worked_with: string | null;
  worked_in: string | null;
  banner_url: string | null;
  display_name: string | null;
  role: string | null;
  country: string | null;
  instagram: string | null;
  spotify: string | null;
  youtube_url: string | null;
  tiktok: string | null;
  color_id: string | null;   // ← add this line
};
```

- [ ] **Step 3: Add `color_id` to `updateProfile` in `lib/communityDb.ts`**

Find the `updateProfile` function signature (~line 49). Add `color_id` to the updates parameter:

```ts
export async function updateProfile(userId: string, updates: {
  bio?: string | null;
  genres?: string[];
  worked_with?: string | null;
  worked_in?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  display_name?: string | null;
  role?: string | null;
  country?: string | null;
  instagram?: string | null;
  spotify?: string | null;
  youtube_url?: string | null;
  tiktok?: string | null;
  color_id?: string | null;   // ← add this line
}): Promise<Profile> {
```

- [ ] **Step 4: Commit**

```bash
git add lib/fennecIdPalette.ts lib/communityTypes.ts lib/communityDb.ts
git commit -m "feat: add Fennec ID color palette + color_id to Profile type"
```

---

## Task 2: Database migration

**Files:**
- Create: `supabase/migrations/20260602_network.sql`

- [ ] **Step 1: Create migration file**

```bash
mkdir -p "/Users/pacosalazar/Documents/Fennec App/fennec/supabase/migrations"
```

Create `supabase/migrations/20260602_network.sql`:

```sql
-- Add color_id column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS color_id text DEFAULT NULL;

-- Network connections table
CREATE TABLE IF NOT EXISTS network_connections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_id  uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL,
  UNIQUE(owner_id, contact_id)
);

ALTER TABLE network_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_connections" ON network_connections
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "users_insert_own_connections" ON network_connections
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "users_delete_own_connections" ON network_connections
  FOR DELETE USING (auth.uid() = owner_id);
```

- [ ] **Step 2: Apply migration in Supabase dashboard**

Go to Supabase → SQL Editor → paste the file contents → Run.

Verify: `profiles` table now has a `color_id` column. `network_connections` table exists with RLS enabled.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260602_network.sql
git commit -m "feat: add network_connections table + color_id column migration"
```

---

## Task 3: Network DB functions

**Files:**
- Create: `lib/networkDb.ts`

- [ ] **Step 1: Create `lib/networkDb.ts`**

```ts
// lib/networkDb.ts
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/communityTypes";
import { randomColorId } from "@/lib/fennecIdPalette";

/**
 * If the user's profile has no color_id yet, assign one randomly and persist it.
 * Returns the final color_id (existing or newly assigned).
 */
export async function ensureColorAssigned(userId: string, currentColorId: string | null): Promise<string> {
  if (currentColorId) return currentColorId;

  const newColorId = randomColorId();

  const { error } = await supabase
    .from("profiles")
    .update({ color_id: newColorId })
    .eq("id", userId);

  if (error) {
    console.error("ensureColorAssigned:", error);
    // Fall back gracefully — use the random one in memory even if DB write fails
  }

  return newColorId;
}

/**
 * Fetch profiles of all producers in the user's network collection.
 */
export async function getNetworkContacts(userId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("network_connections")
    .select("contact_id, profiles!network_connections_contact_id_fkey(*)")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getNetworkContacts:", error);
    return [];
  }

  return (data ?? [])
    .map((row: { profiles: Profile | null }) => row.profiles)
    .filter((p): p is Profile => p !== null);
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/networkDb.ts
git commit -m "feat: add networkDb with ensureColorAssigned + getNetworkContacts"
```

---

## Task 4: FennecIdCard component

**Files:**
- Create: `components/network/FennecIdCard.tsx`

- [ ] **Step 1: Create `components/network/` directory and `FennecIdCard.tsx`**

```bash
mkdir -p "/Users/pacosalazar/Documents/Fennec App/fennec/components/network"
```

Create `components/network/FennecIdCard.tsx`:

```tsx
// components/network/FennecIdCard.tsx
"use client";

import { useState } from "react";
import { SiInstagram, SiTiktok, SiSpotify, SiYoutube } from "react-icons/si";
import type { FennecIdColor } from "@/lib/fennecIdPalette";

export type FennecIdCardProps = {
  /** First name only — displayed on first line */
  firstName: string;
  /** Last name — displayed indented on second line */
  lastName: string;
  /** e.g. "Producer", "Composer", "Beat Maker" */
  role: string;
  /** e.g. "Mexico" */
  country: string;
  /** e.g. ["Trap", "R&B"] — only first shown as pill */
  genres: string[];
  /** Fennec dB score number */
  fennecDb: number;
  /** The permanent accent color scheme for this producer */
  colorScheme: FennecIdColor;
  /** Collection number shown at bottom right, e.g. 1 → "#0001". Omit for own card. */
  collectionNumber?: number;
  /** Two-letter initials for the avatar circle */
  initials: string;
  /** Optional social handles — show icons if present */
  instagram?: string | null;
  tiktok?: string | null;
  spotify?: string | null;
  youtube?: string | null;
};

function pad4(n: number): string {
  return `#${String(n).padStart(4, "0")}`;
}

// Simple QR-like grid — purely decorative placeholder
// In Phase 2 this will be replaced with a real QR code library
function QrPlaceholder({ accent }: { accent: string }) {
  return (
    <div
      style={{
        width: 50,
        height: 50,
        background: "#fff",
        borderRadius: 6,
        padding: 4,
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gridTemplateRows: "repeat(7, 1fr)",
        gap: 1,
        flexShrink: 0,
      }}
    >
      {/* Corner squares */}
      <div style={{ gridColumn: "1/4", gridRow: "1/4", background: "#111", borderRadius: 2 }} />
      <div style={{ gridColumn: "2/3", gridRow: "2/3", background: "#fff" }} />
      <div style={{ gridColumn: "5/8", gridRow: "1/4", background: "#111", borderRadius: 2 }} />
      <div style={{ gridColumn: "6/7", gridRow: "2/3", background: "#fff" }} />
      <div style={{ gridColumn: "1/4", gridRow: "5/8", background: "#111", borderRadius: 2 }} />
      <div style={{ gridColumn: "2/3", gridRow: "6/7", background: "#fff" }} />
      {/* Data dots */}
      <div style={{ gridColumn: "5/6", gridRow: "5/6", background: "#111" }} />
      <div style={{ gridColumn: "7/8", gridRow: "5/6", background: "#111" }} />
      <div style={{ gridColumn: "6/7", gridRow: "6/7", background: "#111" }} />
      <div style={{ gridColumn: "5/7", gridRow: "7/8", background: "#111" }} />
      <div style={{ gridColumn: "4/5", gridRow: "1/2", background: "#111" }} />
      <div style={{ gridColumn: "4/5", gridRow: "3/5", background: "#111" }} />
      <div style={{ gridColumn: "4/5", gridRow: "6/8", background: "#111" }} />
    </div>
  );
}

// EQ soundwave bars — same pattern as Dashboard but accent-colored for dark card
const EQ_HEIGHTS = [10, 16, 8, 14, 10, 18, 7, 13, 16, 9];

function EqBars({ accent }: { accent: string }) {
  return (
    <>
      <style>{`
        @keyframes fennecEqBar {
          from { transform: scaleY(0.2); }
          to   { transform: scaleY(1); }
        }
        .fennec-eq-bar {
          display: inline-block;
          width: 2.5px;
          border-radius: 2px;
          margin: 0 1px;
          transform-origin: bottom;
          animation: fennecEqBar 1.1s ease-in-out infinite alternate;
          opacity: 0.55;
        }
      `}</style>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 0, height: 18, marginTop: 4 }}>
        {EQ_HEIGHTS.map((h, i) => (
          <span
            key={i}
            className="fennec-eq-bar"
            style={{ height: h, background: accent, animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </>
  );
}

export default function FennecIdCard({
  firstName,
  lastName,
  role,
  country,
  genres,
  fennecDb,
  colorScheme,
  collectionNumber,
  initials,
  instagram,
  tiktok,
  spotify,
  youtube,
}: FennecIdCardProps) {
  const { accent, dark1, dark2, glowRgb, textOnAvatar } = colorScheme;
  const primaryGenre = genres[0] ?? "";
  const [showDbInfo, setShowDbInfo] = useState(false);

  return (
    <div
      style={{
        borderRadius: 18,
        padding: "20px 20px 18px",
        background: `linear-gradient(135deg, ${dark1}, ${dark2})`,
        border: `1px solid ${accent}35`,
        boxShadow: `0 12px 40px rgba(${glowRgb},0.15)`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Glow overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 85% 10%, rgba(${glowRgb},0.12), transparent 55%)`,
          pointerEvents: "none",
        }}
      />

      {/* Fennec logo watermark */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.06,
          pointerEvents: "none",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/fennec-icon-transparent.png"
          alt=""
          style={{ width: 260, height: 260, objectFit: "contain", filter: "brightness(0) invert(1)" }}
        />
      </div>

      {/* TOP ROW: role (left) · fennec ID + QR (right) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, position: "relative" }}>
        <p style={{ fontSize: 8, color: `${accent}55`, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", paddingTop: 3 }}>
          {role}
        </p>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
            <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, fontWeight: 900, color: "#fff", letterSpacing: "-0.06em" }}>
              fennec
            </span>
            <span style={{ fontSize: 9, fontWeight: 700, color: accent, letterSpacing: "0.06em", textTransform: "uppercase", marginLeft: 3 }}>
              ID
            </span>
          </div>
          <QrPlaceholder accent={accent} />
        </div>
      </div>

      {/* NAME — staggered */}
      <div style={{ marginBottom: 16, lineHeight: 1.0, position: "relative" }}>
        <p style={{ fontSize: 28, fontWeight: 900, color: "#fff", textTransform: "uppercase", letterSpacing: "-0.02em", margin: 0 }}>
          {firstName.toUpperCase()}
        </p>
        <p style={{ fontSize: 28, fontWeight: 900, color: "#fff", textTransform: "uppercase", letterSpacing: "-0.02em", margin: 0, paddingLeft: 20 }}>
          {lastName.toUpperCase()}
        </p>
      </div>

      {/* MIDDLE ROW: avatar + dB score + EQ bars + (i) */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", position: "relative", marginBottom: 12 }}>
        {/* Left: avatar + score */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 800,
              color: textOnAvatar === "white" ? "#fff" : "#000",
              boxShadow: `0 3px 12px rgba(${glowRgb},0.45)`,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div>
            {/* dB label + (i) button */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
              <p style={{ fontSize: 7, color: `${accent}60`, fontWeight: 700, letterSpacing: "0.14em", margin: 0 }}>FENNEC dB</p>
              <button
                onClick={() => setShowDbInfo((v) => !v)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: `${accent}60`, lineHeight: 1 }}
                aria-label="What is Fennec dB?"
              >
                <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="8" cy="8" r="7.5" stroke="currentColor" strokeWidth="1" fill="none"/>
                  <text x="8" y="12" textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor">i</text>
                </svg>
              </button>
            </div>
            <p style={{ fontSize: 24, fontWeight: 900, color: accent, lineHeight: 1, margin: 0 }}>{fennecDb}</p>
            {/* EQ soundwave animation */}
            <EqBars accent={accent} />
          </div>
        </div>

        {/* Right: genre + country/#num */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
          {primaryGenre && (
            <span
              style={{
                fontSize: 7,
                background: `${accent}12`,
                color: accent,
                padding: "2px 8px",
                borderRadius: 20,
                border: `1px solid ${accent}25`,
                letterSpacing: "0.04em",
              }}
            >
              {primaryGenre}
            </span>
          )}
          <span style={{ fontSize: 7, color: "#333", letterSpacing: "0.1em", fontWeight: 600 }}>
            {country.toUpperCase()}{collectionNumber !== undefined ? ` · ${pad4(collectionNumber)}` : ""}
          </span>
          {/* Social icons */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            {instagram && <SiInstagram size={10} style={{ color: "#E1306C", opacity: 0.7 }} />}
            {spotify   && <SiSpotify   size={10} style={{ color: "#1DB954", opacity: 0.7 }} />}
            {youtube   && <SiYoutube   size={10} style={{ color: "#FF0000", opacity: 0.7 }} />}
            {tiktok    && <SiTiktok    size={10} style={{ color: "#fff",    opacity: 0.6 }} />}
          </div>
        </div>
      </div>

      {/* dB info panel — toggles with (i) */}
      {showDbInfo && (
        <div
          style={{
            borderRadius: 10,
            border: `1px solid ${accent}20`,
            background: `${accent}08`,
            padding: "8px 10px",
            position: "relative",
          }}
        >
          <p style={{ fontSize: 9, color: `${accent}99`, lineHeight: 1.6, margin: 0 }}>
            A growing number that measures how active your music business is — like signal strength, but for your career.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", marginTop: 6 }}>
            {[
              { label: "Active project", value: "×150" },
              { label: "Closed project", value: "×50"  },
              { label: "Client",         value: "×75"  },
              { label: "Quote sent",     value: "×25"  },
            ].map((r) => (
              <span key={r.label} style={{ fontSize: 8, color: `${accent}70` }}>
                {r.label} <strong style={{ color: accent }}>{r.value}</strong>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it renders — quick visual check**

In the browser at `localhost:3000`, navigate to Business tab. The component is not wired in yet — that comes in Task 6. For now just confirm there are no TypeScript errors:

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec" && npx tsc --noEmit 2>&1 | grep "FennecIdCard\|fennecIdPalette\|networkDb" | head -20
```

Expected: no errors for these files.

- [ ] **Step 3: Commit**

```bash
git add components/network/FennecIdCard.tsx
git commit -m "feat: add FennecIdCard presentational component"
```

---

## Task 5: NetworkCollection component

**Files:**
- Create: `components/network/NetworkCollection.tsx`

- [ ] **Step 1: Create `components/network/NetworkCollection.tsx`**

```tsx
// components/network/NetworkCollection.tsx
"use client";

import { useState } from "react";
import FennecIdCard from "./FennecIdCard";
import { getColorScheme } from "@/lib/fennecIdPalette";
import type { Profile } from "@/lib/communityTypes";

type Props = {
  contacts: Profile[];
};

function getInitials(profile: Profile): string {
  const name = profile.display_name || profile.username || "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getFirstLast(profile: Profile): { firstName: string; lastName: string } {
  const name = profile.display_name || profile.username || "Unknown";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
  }
  return { firstName: name, lastName: "" };
}

export default function NetworkCollection({ contacts }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (contacts.length === 0) {
    return (
      <div
        style={{
          borderRadius: 16,
          padding: "20px 16px",
          background: "#0d0d0f",
          border: "1.5px dashed #1f1f1f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 6,
          minHeight: 80,
        }}
      >
        <span style={{ fontSize: 9, color: "#333", letterSpacing: "0.12em", fontWeight: 600 }}>
          SCAN QR TO ADD PRODUCERS — COMING SOON
        </span>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p style={{ fontSize: 10, color: "#555", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>
          Tu red · {contacts.length} productor{contacts.length !== 1 ? "es" : ""}
        </p>
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            fontSize: 10,
            color: "#f5a623",
            fontWeight: 700,
            letterSpacing: "0.1em",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          {expanded ? "CERRAR" : "VER TODOS"}
        </button>
      </div>

      {/* Collapsed: deck preview */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <div style={{ position: "relative", height: 130 }}>
            {/* Show up to 3 cards peeking behind, in reverse order */}
            {contacts.slice(1, 4).reverse().map((contact, i) => {
              const scheme = getColorScheme(contact.color_id);
              const rotations = [2.5, -1.5, 1];
              const tops = [18, 12, 6];
              const idx = contacts.slice(1, 4).length - 1 - i;
              return (
                <div
                  key={contact.id}
                  style={{
                    position: "absolute",
                    top: tops[idx] ?? 18,
                    left: 0,
                    right: 0,
                    height: 110,
                    borderRadius: 16,
                    background: `linear-gradient(135deg, ${scheme.dark1}, ${scheme.dark2})`,
                    border: `1px solid ${scheme.accent}25`,
                    transform: `rotate(${rotations[idx] ?? 0}deg)`,
                    transformOrigin: "bottom center",
                  }}
                />
              );
            })}
            {/* Top card — fully visible but compact */}
            {(() => {
              const top = contacts[0];
              const scheme = getColorScheme(top.color_id);
              const { firstName, lastName } = getFirstLast(top);
              return (
                <div style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
                  <FennecIdCard
                    firstName={firstName}
                    lastName={lastName}
                    role={top.role ?? "Producer"}
                    country={top.country ?? ""}
                    genres={top.genres ?? []}
                    fennecDb={top.fennec_db_score}
                    colorScheme={scheme}
                    collectionNumber={1}
                    initials={getInitials(top)}
                    instagram={top.instagram}
                    tiktok={top.tiktok}
                    spotify={top.spotify}
                    youtube={top.youtube_url}
                  />
                </div>
              );
            })()}
          </div>
        </button>
      )}

      {/* Expanded: Apple Wallet stack */}
      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {contacts.map((contact, i) => {
            const scheme = getColorScheme(contact.color_id);
            const { firstName, lastName } = getFirstLast(contact);
            const isLast = i === contacts.length - 1;
            return (
              <div
                key={contact.id}
                style={{
                  position: "relative",
                  zIndex: contacts.length - i,
                  marginBottom: isLast ? 0 : -44,
                  // Stagger animation via CSS transition
                  animation: `slideInCard 0.3s ease both`,
                  animationDelay: `${i * 60}ms`,
                }}
              >
                <FennecIdCard
                  firstName={firstName}
                  lastName={lastName}
                  role={contact.role ?? "Producer"}
                  country={contact.country ?? ""}
                  genres={contact.genres ?? []}
                  fennecDb={contact.fennec_db_score}
                  colorScheme={scheme}
                  collectionNumber={i + 1}
                  initials={getInitials(contact)}
                  instagram={contact.instagram}
                  tiktok={contact.tiktok}
                  spotify={contact.spotify}
                  youtube={contact.youtube_url}
                />
              </div>
            );
          })}

          {/* Add slot */}
          <div
            style={{
              marginTop: 8,
              borderRadius: 16,
              padding: "14px 16px",
              background: "#0d0d0f",
              border: "1.5px dashed #1f1f1f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "#1a1a1a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                color: "#333",
              }}
            >
              +
            </div>
            <span style={{ fontSize: 9, color: "#333", letterSpacing: "0.12em", fontWeight: 600 }}>
              SCAN QR TO ADD PRODUCER
            </span>
          </div>
        </div>
      )}

      {/* Keyframe for card slide-in animation */}
      <style>{`
        @keyframes slideInCard {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec" && npx tsc --noEmit 2>&1 | grep "NetworkCollection" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/network/NetworkCollection.tsx
git commit -m "feat: add NetworkCollection collapsed/expanded deck component"
```

---

## Task 6: NetworkSection — data loader + own card

**Files:**
- Create: `components/network/NetworkSection.tsx`

- [ ] **Step 1: Create `components/network/NetworkSection.tsx`**

```tsx
// components/network/NetworkSection.tsx
"use client";

import { useEffect, useState } from "react";
import FennecIdCard from "./FennecIdCard";
import NetworkCollection from "./NetworkCollection";
import { ensureColorAssigned, getNetworkContacts } from "@/lib/networkDb";
import { getColorScheme } from "@/lib/fennecIdPalette";
import type { Profile } from "@/lib/communityTypes";

type Props = {
  profile: Profile;
  /** Callback to update the profile in parent state after color is assigned */
  onColorAssigned: (colorId: string) => void;
  userId: string;
};

function getInitials(profile: Profile): string {
  const name = profile.display_name || profile.username || "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getFirstLast(profile: Profile): { firstName: string; lastName: string } {
  const name = profile.display_name || profile.username || "Unknown";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
  return { firstName: name, lastName: "" };
}

export default function NetworkSection({ profile, onColorAssigned, userId }: Props) {
  const [resolvedColorId, setResolvedColorId] = useState<string | null>(profile.color_id);
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);

  // Assign color on first load if not set
  useEffect(() => {
    ensureColorAssigned(userId, profile.color_id).then((colorId) => {
      if (colorId !== profile.color_id) {
        setResolvedColorId(colorId);
        onColorAssigned(colorId);
      }
    });
  }, [userId, profile.color_id, onColorAssigned]);

  // Load network contacts
  useEffect(() => {
    setLoadingContacts(true);
    getNetworkContacts(userId)
      .then(setContacts)
      .finally(() => setLoadingContacts(false));
  }, [userId]);

  const colorScheme = getColorScheme(resolvedColorId);
  const { firstName, lastName } = getFirstLast(profile);

  return (
    <div className="flex flex-col gap-5">
      {/* Section header */}
      <div>
        <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">Network</p>
        <h2 className="mt-1 text-xl font-bold text-white">Tu Fennec ID</h2>
        <p className="mt-1 text-xs text-zinc-500">Comparte tu ID en persona para conectar con otros productores.</p>
      </div>

      {/* Own card */}
      <FennecIdCard
        firstName={firstName}
        lastName={lastName}
        role={profile.role ?? "Producer"}
        country={profile.country ?? ""}
        genres={profile.genres ?? []}
        fennecDb={profile.fennec_db_score}
        colorScheme={colorScheme}
        initials={getInitials(profile)}
        instagram={profile.instagram}
        tiktok={profile.tiktok}
        spotify={profile.spotify}
        youtube={profile.youtube_url}
        // No collectionNumber for own card
      />

      {/* Divider */}
      <div className="border-t border-white/5 pt-1">
        {loadingContacts ? (
          <p className="text-xs text-zinc-600">Cargando red...</p>
        ) : (
          <NetworkCollection contacts={contacts} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec" && npx tsc --noEmit 2>&1 | grep "NetworkSection\|networkDb\|fennecIdPalette" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/network/NetworkSection.tsx
git commit -m "feat: add NetworkSection with own card + contacts collection"
```

---

## Task 7: Wire NetworkSection into BusinessHub

**Files:**
- Modify: `components/business/BusinessHub.tsx`
- Modify: `components/pricing/PricingCalculator.tsx` (pass profile prop to BusinessHub)

- [ ] **Step 1: Update `BusinessHub` props and render `NetworkSection`**

Open `components/business/BusinessHub.tsx`.

**1a. Update the import at the top — add NetworkSection:**

```tsx
import NetworkSection from "@/components/network/NetworkSection";
import type { Profile } from "@/lib/communityTypes";
```

**1b. Update the `Props` type to include `profile` and `onColorAssigned`:**

```tsx
type Props = {
  onOpenView: (view: BusinessView) => void;
  isPro?: boolean;
  userId: string;
  profile: Profile;
  onColorAssigned: (colorId: string) => void;
};
```

**1c. Update the function signature:**

```tsx
export default function BusinessHub({ onOpenView, isPro = false, userId, profile, onColorAssigned }: Props) {
```

**1d. Add `NetworkSection` at the very bottom of the returned JSX, after the revenue section's closing `</div>` and before the outer closing `</div>`:**

```tsx
      {/* ── Network section ── */}
      <div className="border-t border-white/5 pt-4">
        <NetworkSection
          profile={profile}
          userId={userId}
          onColorAssigned={onColorAssigned}
        />
      </div>

    </div>  {/* closes mx-auto wrapper */}
  );
}
```

- [ ] **Step 2: Update `PricingCalculator.tsx` to pass the new props to BusinessHub**

Open `components/pricing/PricingCalculator.tsx`. Find the line that renders `<BusinessHub ...>` (around line 599):

```tsx
<BusinessHub key={hubRefreshKey} onOpenView={setBusinessView} isPro={profile?.is_pro ?? true} userId={authUser.id} />
```

Replace with:

```tsx
<BusinessHub
  key={hubRefreshKey}
  onOpenView={setBusinessView}
  isPro={profile?.is_pro ?? true}
  userId={authUser.id}
  profile={profile}
  onColorAssigned={(colorId) =>
    setProfile((prev) => prev ? { ...prev, color_id: colorId } : prev)
  }
/>
```

- [ ] **Step 3: TypeScript check — full project**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec" && npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors. If there are errors, they will point to exact lines — fix them before committing.

- [ ] **Step 4: Visual check in browser**

Open `http://localhost:3000`. Log in → go to Business tab → scroll down. You should see:
1. Your Fennec ID card with a random accent color at the bottom of the Business tab
2. "Tu red · 0 productores" (empty collection with the "+ SCAN QR" slot)
3. The card should have your name staggered, the fennec watermark, and the QR placeholder

- [ ] **Step 5: Commit**

```bash
git add components/business/BusinessHub.tsx components/pricing/PricingCalculator.tsx
git commit -m "feat: wire NetworkSection into BusinessHub"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ Redesigned FennecIdCard component → Task 4
- ✅ Random color assignment (permanent, palette, textOnAvatar contrast) → Tasks 1 + 3
- ✅ color_id persisted to DB → Task 2 (migration) + Task 3 (ensureColorAssigned)
- ✅ Network section in Business tab → Tasks 5, 6, 7
- ✅ Deck collapsed → tap to expand → Task 5 (NetworkCollection)
- ✅ Apple Wallet stagger animation → Task 5 (slideInCard keyframe + staggered delay)
- ✅ "+ SCAN QR" slot disabled (Phase 2) → Task 5
- ✅ RLS policies on network_connections → Task 2

**2. Placeholder scan:** None found.

**3. Type consistency:**
- `FennecIdColor` defined in Task 1, used in Tasks 4, 5, 6 ✅
- `ensureColorAssigned(userId, currentColorId): Promise<string>` defined in Task 3, called in Task 6 ✅
- `getNetworkContacts(userId): Promise<Profile[]>` defined in Task 3, called in Task 6 ✅
- `getColorScheme(colorId)` defined in Task 1, called in Tasks 5 and 6 ✅
- `Profile.color_id` added in Task 1, read throughout ✅
