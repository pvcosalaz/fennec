# Dashboard Identity-First Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the Fennec dashboard from a minimal card+KPIs view into a full Identity-First layout: FennecIdCard → KPIs → Revenue chart → Active projects → Compact social strip, with a new empty state that gives Diego clear next actions.

**Architecture:** All changes are in `components/dashboard/Dashboard.tsx` (one file). Two components already exist in that file but are not rendered (EqualizerBars, ProjectTrack) — we activate them. The VUMeter section is replaced by compact inline JSX. A new `onNavigate` prop threads tab navigation into the empty state CTAs via PricingCalculator.tsx.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, react-icons/si

**Design doc:** `~/.gstack/projects/Agentes/pacosalazar-main-design-20260603-113645.md`

---

## File Map

| File | Change |
|------|--------|
| `components/dashboard/Dashboard.tsx` | Remove TikTok + VUMeter, activate EqualizerBars + ProjectTrack, replace Social Reach, update empty state, add `onNavigate` prop |
| `components/pricing/PricingCalculator.tsx` | Pass `onNavigate` prop to `<Dashboard>` |

---

### Task 1: Remove TikTok and VUMeter dead weight

**Files:**
- Modify: `components/dashboard/Dashboard.tsx:1-35` (imports + PLATFORMS constant)
- Modify: `components/dashboard/Dashboard.tsx:174-205` (VUMeter component)

- [ ] **Step 1: Remove SiTiktok import and tiktok from PLATFORMS**

In `components/dashboard/Dashboard.tsx`, replace lines 4–33:

```tsx
// Line 4 — remove SiTiktok from import:
import { SiSpotify, SiInstagram, SiYoutube } from "react-icons/si";

// Lines 28-33 — replace PLATFORMS constant:
const PLATFORMS = [
  { key: "instagram", name: "IG",      Icon: SiInstagram, color: "#E1306C" },
  { key: "spotify",   name: "Spotify", Icon: SiSpotify,   color: "#1DB954" },
  { key: "youtube",   name: "YT",      Icon: SiYoutube,   color: "#FF0000" },
];
```

- [ ] **Step 2: Delete the VUMeter component**

In `components/dashboard/Dashboard.tsx`, delete the entire `VUMeter` function
(from `// ─── VU Meter ─────` through the closing `}` at ~line 205).
The component is only used in the Social Reach section we are replacing in Task 4.

- [ ] **Step 3: Verify the file compiles**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors referencing `SiTiktok` or `VUMeter`.

- [ ] **Step 4: Commit**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
git add components/dashboard/Dashboard.tsx
git commit -m "refactor: remove TikTok and VUMeter from dashboard"
```

---

### Task 2: Activate Revenue chart (EqualizerBars)

**Files:**
- Modify: `components/dashboard/Dashboard.tsx` — JSX return, after the KPI grid

The `EqualizerBars` component is already defined in this file (~line 100) and
`months`/`revenues` are already computed (~lines 335–336). We just need to render it.

- [ ] **Step 1: Add Revenue section after the KPI grid**

In the JSX return of `Dashboard`, find the closing `</div>` of the KPI grid section
(the `<div className="grid grid-cols-4 gap-1 px-2 border-t border-white/5 pt-3">`
block). Insert this immediately after its closing `</div>`:

```tsx
{/* ── Revenue ──────────────────────────────────────────────── */}
<div className="border-t border-white/5 pt-3 px-2 space-y-2">
  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
    Revenue
  </p>
  <EqualizerBars months={months} revenues={revenues} />
</div>
```

- [ ] **Step 2: Verify visually**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec" && npm run dev
```

Open the app, go to Dashboard. You should see 6 animated bars below the KPIs,
labelled with month abbreviations. Current month bar is amber, others are white/15.

- [ ] **Step 3: Commit**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
git add components/dashboard/Dashboard.tsx
git commit -m "feat: add revenue chart (6 months) to dashboard"
```

---

### Task 3: Activate Active Projects list (ProjectTrack)

**Files:**
- Modify: `components/dashboard/Dashboard.tsx` — JSX return, after Revenue section

`ProjectTrack` is already defined in this file (~line 138) and `projects` +
`TRACK_COLORS` are already available.

- [ ] **Step 1: Add Active Projects section after Revenue**

Immediately after the Revenue `</div>` added in Task 2, insert:

```tsx
{/* ── Active Projects ──────────────────────────────────────── */}
{projects.filter((p) => p.status !== "paid").length > 0 && (
  <div className="border-t border-white/5 pt-3 px-2 space-y-3">
    <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
      Active Projects
    </p>
    {projects
      .filter((p) => p.status !== "paid")
      .slice(0, 3)
      .map((p, i) => (
        <ProjectTrack
          key={p.id}
          project={p}
          color={TRACK_COLORS[i % TRACK_COLORS.length]}
        />
      ))}
  </div>
)}
```

Note: the section is hidden when there are no active projects (the empty state in
Task 5 handles that case).

- [ ] **Step 2: Verify visually**

With at least one non-paid project in the app, the dashboard should show project
tracks with colored left bars and animated progress bars below the revenue chart.
With zero active projects, the section should not appear at all.

- [ ] **Step 3: Commit**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
git add components/dashboard/Dashboard.tsx
git commit -m "feat: add active projects list to dashboard"
```

---

### Task 4: Replace Social Reach with compact strip

**Files:**
- Modify: `components/dashboard/Dashboard.tsx` — replace the entire Social Reach section

The current section (starting at `{/* ── Social Reach */}`) renders VU meters,
connect links, and follower counts in a tall vertical layout. Replace the whole
block with a flat three-platform strip.

- [ ] **Step 1: Replace the Social Reach section**

Find and delete the entire `{/* ── Social Reach ─────... */}` block (from its
opening comment through its closing `</div>`). Replace with:

```tsx
{/* ── Social Reach ────────────────────────────────────────── */}
<div className="border-t border-white/5 pt-3 px-2 space-y-2">
  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
    Social Reach
  </p>
  <div className="flex items-center gap-5">

    {/* Instagram — handle display only, no OAuth */}
    <div className="flex items-center gap-1.5">
      <SiInstagram className="h-3 w-3" style={{ color: "#E1306C", opacity: 0.75 }} />
      {networkProfile?.instagram ? (
        <span className="text-[10px] text-zinc-400">
          @{networkProfile.instagram}
        </span>
      ) : (
        <span className="text-[10px] text-zinc-600">—</span>
      )}
    </div>

    {/* Spotify */}
    <div className="flex items-center gap-1.5">
      <SiSpotify className="h-3 w-3" style={{ color: "#1DB954", opacity: 0.75 }} />
      {spotifyData?.connected ? (
        <span className="text-[10px] text-zinc-400">
          {spotifyFollowers.toLocaleString()}
        </span>
      ) : userId ? (
        <a
          href={`/api/spotify/connect?userId=${userId}`}
          className="text-[10px] text-[#1DB954]/70 hover:text-[#1DB954] transition"
        >
          Connect ↗
        </a>
      ) : (
        <span className="text-[10px] text-zinc-600">—</span>
      )}
    </div>

    {/* YouTube */}
    <div className="flex items-center gap-1.5">
      <SiYoutube className="h-3 w-3" style={{ color: "#FF0000", opacity: 0.75 }} />
      {youtubeData?.connected ? (
        <span className="text-[10px] text-zinc-400">
          {youtubeSubscribers.toLocaleString()}
        </span>
      ) : userId ? (
        <a
          href={`/api/youtube/connect?userId=${userId}`}
          className="text-[10px] text-[#FF0000]/70 hover:text-[#FF0000] transition"
        >
          Connect ↗
        </a>
      ) : (
        <span className="text-[10px] text-zinc-600">—</span>
      )}
    </div>

  </div>
</div>
```

- [ ] **Step 2: Verify the TypeScript compiles**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Verify visually**

The Social Reach section should now be a single horizontal row of three platform
icons with either a count, a handle, or a "Connect ↗" link. No bars, no animations.
Compact.

- [ ] **Step 4: Commit**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
git add components/dashboard/Dashboard.tsx
git commit -m "feat: replace Social Reach VU meters with compact icon strip"
```

---

### Task 5: Update empty state + add onNavigate prop

**Files:**
- Modify: `components/dashboard/Dashboard.tsx` — props interface + empty state JSX
- Modify: `components/pricing/PricingCalculator.tsx` — pass `onNavigate` to `<Dashboard>`

- [ ] **Step 1: Add onNavigate to Dashboard props**

In the Dashboard function signature, add `onNavigate` to the props destructure and
the props type:

```tsx
// Props type (add after onColorAssigned):
onNavigate?: (tab: "pricing" | "contenido" | "dashboard" | "ideas" | "noticias") => void;

// Destructure (add after onColorAssigned):
onNavigate,
```

- [ ] **Step 2: Replace the empty state**

Find and replace the existing empty hint block:

```tsx
{/* ── Empty hint ────────────────────────────────────────────── */}
{projects.length === 0 && quotes.length === 0 && (
  <p className="text-center text-[10px] text-zinc-700 pb-1">
    Add projects &amp; quotes to bring the dashboard to life
  </p>
)}
```

Replace with:

```tsx
{/* ── Empty state ───────────────────────────────────────────── */}
{projects.length === 0 && quotes.length === 0 && (
  <div className="border-t border-white/5 pt-4 px-2 flex flex-col items-center gap-3 pb-2">
    <p className="text-[11px] font-semibold text-zinc-400 text-center">
      Tu negocio empieza aquí.
    </p>
    <div className="flex gap-3">
      <button
        onClick={() => onNavigate?.("pricing")}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-white/10 transition"
      >
        + Crear proyecto
      </button>
      <button
        onClick={() => onNavigate?.("pricing")}
        className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-[10px] font-semibold text-accent hover:bg-accent/20 transition"
      >
        + Enviar cotización
      </button>
    </div>
  </div>
)}
```

Note: both buttons navigate to "pricing" because projects and quotes both live
in the Pricing / Business Hub tab. The user selects which sub-view once there.

- [ ] **Step 3: Wire onNavigate in PricingCalculator.tsx**

In `components/pricing/PricingCalculator.tsx`, find the `<Dashboard ... />` render
block (~line 1050) and add the `onNavigate` prop:

```tsx
<Dashboard
  className="mt-3"
  avatarUrl={profile.avatar_url}
  username={profile.username}
  isPro={profile.is_pro}
  userId={authUser?.id}
  onOpenSettings={() => { setSettingsSection("main"); setShowSettings(true); }}
  onOpenProfileSettings={() => { setSettingsSection("profile"); setShowSettings(true); }}
  networkProfile={profile}
  onColorAssigned={(colorId) =>
    setProfile((prev) => prev ? { ...prev, color_id: colorId } : prev)
  }
  onNavigate={(tab) => { setActiveTab(tab); setBusinessView("hub"); }}
/>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5: Verify visually — empty state**

Log out or clear localStorage so the dashboard shows with 0 projects and 0 quotes.
You should see "Tu negocio empieza aquí." with two buttons. Tapping "+ Crear
proyecto" or "+ Enviar cotización" should navigate to the Pricing tab.

- [ ] **Step 6: Commit**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
git add components/dashboard/Dashboard.tsx components/pricing/PricingCalculator.tsx
git commit -m "feat: dashboard empty state with CTAs and onNavigate prop"
```

---

## Self-Review

**Spec coverage check:**
- [x] FennecIdCard as hero — unchanged, already at top ✓
- [x] KPIs (4 columns) — unchanged ✓
- [x] Revenue 6-month chart — Task 2 ✓
- [x] Active Projects top 3 — Task 3 ✓
- [x] Compact Social strip (no VU meters) — Task 4 ✓
- [x] TikTok removed — Task 1 ✓
- [x] VUMeter removed — Task 1 ✓
- [x] Empty state with two CTAs — Task 5 ✓
- [x] Language rule (Spanish emotional copy, English labels) — Task 5 ✓
- [x] dB=0 state: existing card renders fine at dB=0 (no code change needed) ✓
- [x] Known limitation (revenueForMonth bug) — documented, out of scope ✓

**No placeholders found.** Every step has complete code.

**Type consistency:** `onNavigate` prop type uses `ModuleTab` values
(`"pricing" | "contenido" | "dashboard" | "ideas" | "noticias"`) which matches
the `ModuleTab` type defined at line 153 of PricingCalculator.tsx.
