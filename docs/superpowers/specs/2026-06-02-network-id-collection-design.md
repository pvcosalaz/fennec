# Fennec Network — ID Card & Collection (Phase 1)

## Goal

Redesign the Fennec ID card with the new visual identity and add a Network section inside the Business tab, where producers can view their own ID card and their collection of connected producers. Each producer gets a permanent random accent color assigned at profile creation.

---

## Scope (Phase 1)

**In:**
- Redesigned `FennecIdCard` component
- Random color assignment (permanent, per user, from curated palette)
- Network section in Business tab: own card + collection (deck collapsed → tap to expand)
- `NetworkSection` component wired into `BusinessHub`

**Out (Phase 2):**
- QR code scanning / sharing animation
- Async messaging with voice notes
- Push notifications for messages
- Card color customizer (user-controlled)

---

## Card Design

### Layout

```
┌─────────────────────────────────────────┐
│ PRODUCER                    fennec ID   │
│                             ┌─────────┐ │
│ MARCO                       │  QR     │ │
│   REYES                     │  code   │ │
│                             └─────────┘ │
│  ◉ MR   340          Trap / R&B        │
│         FENNEC dB    MEXICO · #0001    │
└─────────────────────────────────────────┘
```

### Elements

| Element | Position | Details |
|---|---|---|
| Role label | Top left | 8px, uppercase, accent color 55% opacity, tracking 0.18em |
| "fennec ID" | Top right | "fennec" 13px 900 weight tracking -0.06em lowercase + "ID" 9px accent color |
| QR code | Top right, below label | 50×50px white bg, user's unique QR |
| First name | Center left | 28px 900 weight uppercase tracking -0.02em |
| Last name | Center left + 20px indent | Same size, staggered right |
| Avatar circle | Bottom left | 36px circle, initials, accent color bg |
| Fennec dB score | Bottom left, next to avatar | 24px 900 weight accent color |
| Genre tag | Bottom right | Pill badge, accent color |
| Country · #ID | Bottom right below tag | 7px, muted |
| Fennec logo watermark | Center background | fennec-icon-transparent.png, 260px, 6% opacity |
| Glow | Background | radial-gradient accent at 85% 10%, 12% opacity |
| Background gradient | Card bg | `linear-gradient(135deg, dark1, dark2)` per accent |

### Color Palette (12 colors, permanently assigned)

Each color defines: `accent` (the highlight color), `dark1` / `dark2` (card background gradient), `textOnAvatar` (black or white).

```ts
const FENNEC_ID_PALETTE = [
  { id: "blue",    accent: "#4d96ff", dark1: "#1a1a2e", dark2: "#0f0f1a", textOnAvatar: "white"  },
  { id: "green",   accent: "#6bcb77", dark1: "#1a2e1a", dark2: "#0f1a0f", textOnAvatar: "black"  },
  { id: "purple",  accent: "#c77dff", dark1: "#2e1a2e", dark2: "#1a0f1a", textOnAvatar: "black"  },
  { id: "red",     accent: "#ff6b6b", dark1: "#2e1a1a", dark2: "#1a0f0f", textOnAvatar: "black"  },
  { id: "amber",   accent: "#f5a623", dark1: "#2e2214", dark2: "#1a1209", textOnAvatar: "black"  },
  { id: "cyan",    accent: "#00d4ff", dark1: "#0f2030", dark2: "#081520", textOnAvatar: "black"  },
  { id: "pink",    accent: "#ff6eb4", dark1: "#2e1a26", dark2: "#1a0f17", textOnAvatar: "black"  },
  { id: "lime",    accent: "#b5ff6b", dark1: "#1e2e0f", dark2: "#111a09", textOnAvatar: "black"  },
  { id: "indigo",  accent: "#818cf8", dark1: "#1a1a35", dark2: "#0f0f22", textOnAvatar: "white"  },
  { id: "orange",  accent: "#ff9f43", dark1: "#2e1f0f", dark2: "#1a120a", textOnAvatar: "black"  },
  { id: "teal",    accent: "#2ed573", dark1: "#0f2e20", dark2: "#091a13", textOnAvatar: "black"  },
  { id: "rose",    accent: "#ff4757", dark1: "#2e0f14", dark2: "#1a090c", textOnAvatar: "white"  },
];
```

**Assignment:** On first profile load, if `color_id` is null, pick `FENNEC_ID_PALETTE[Math.floor(Math.random() * 12)]` and persist to `user_profiles.color_id` via Supabase. Never re-assign.

**Text on card:** Always white (dark backgrounds). Avatar initials text: `textOnAvatar` field.

---

## Network Section in Business Tab

### States

**Collapsed (default):**
- Shows own Fennec ID card fully visible at top
- Below it: producer collection as a stacked deck (top card visible + 2-3 cards peeking behind with slight rotation/offset)
- Shows count: "4 productores en tu red"
- Tap on deck → expands

**Expanded (after tap on deck):**
- Own card stays at top
- Collection cards cascade down, stacked with `margin-bottom: -44px` overlap (Apple Wallet style)
- Each card fully readable (name, score, role, country)
- "+ SCAN QR" slot at the bottom (disabled in Phase 1, shows "Próximamente")
- Tap deck again → collapses

### Animation

Use Framer Motion `staggerChildren` on expand:
- Each card animates from `y: -20, opacity: 0` → `y: 0, opacity: 1`
- Stagger delay: 60ms per card
- Spring: `type: "spring", stiffness: 400, damping: 30`

---

## Data Model

### `user_profiles` table (existing — add column)
```sql
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS color_id text DEFAULT NULL;
```

### `network_connections` table (new)
```sql
CREATE TABLE network_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users NOT NULL,   -- whose collection
  contact_id uuid REFERENCES auth.users NOT NULL, -- the connected producer
  created_at timestamptz DEFAULT now(),
  UNIQUE(owner_id, contact_id)
);

ALTER TABLE network_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own connections" ON network_connections
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "users insert own connections" ON network_connections
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
```

---

## Files

| File | Action | Responsibility |
|---|---|---|
| `components/network/FennecIdCard.tsx` | Create | Reusable ID card component, accepts profile + colorScheme |
| `components/network/NetworkCollection.tsx` | Create | Collapsed/expanded deck of producer cards |
| `components/network/NetworkSection.tsx` | Create | Own card + collection, wired together |
| `lib/fennecIdPalette.ts` | Create | FENNEC_ID_PALETTE constant + color assignment logic |
| `components/business/BusinessHub.tsx` | Modify | Add NetworkSection tab/section |
| `supabase/migrations/YYYYMMDD_network.sql` | Create | color_id column + network_connections table |

---

## Component API

```tsx
// FennecIdCard
type FennecIdCardProps = {
  name: string;           // "Francisco Salazar"
  role: string;           // "Producer"
  country: string;        // "Mexico"
  genres: string[];       // ["Trap", "R&B"]
  fennecDb: number;       // 340
  colorScheme: FennecIdColor;
  collectionNumber?: number; // #0001 — undefined = own card (no number)
  size?: "full" | "compact";
};

// NetworkCollection
type NetworkCollectionProps = {
  contacts: ContactProfile[];
  onScanQR?: () => void; // Phase 2
};
```

---

## Self-Review

- ✅ No TBDs — all design decisions locked from brainstorming sessions
- ✅ Color palette defined with contrast rules (textOnAvatar)
- ✅ RLS policies defined for new table
- ✅ Animation spec complete (Framer Motion stagger)
- ✅ Phase 2 items clearly scoped out
- ✅ Component API matches the layout spec
