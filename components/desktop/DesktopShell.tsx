"use client";
import { useEffect, useState } from "react";
import { Home, Briefcase, Camera, Users, Settings, AudioWaveform, UserPlus, ChevronRight } from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import { getColorScheme } from "@/lib/fennecIdPalette";
import { useSidebarCompact, useSidebarCollapsed } from "@/lib/useIsDesktop";
import {
  CANVAS_BG, RAIL_BG, RAIL_SHADOW, Grain, Atmosphere,
} from "@/components/desktop/surfaces";
import type { Profile } from "@/lib/communityTypes";

/* ═══════════════════════════════════════════════════════════════
   DESKTOP SHELL — the approved prototype language, on real data.
   Chrome only: the left rail (nav + live tape pulse + mini ID), a
   three-button account cluster at the top of the content column, and
   the scrolling main area. The module tree renders as children — ONE
   source of truth in PricingCalculator.

   The 292px right social rail was removed 2026-08-02: it spent a fifth
   of the screen on chrome read once a session, and its only real
   content (Your Network) duplicated a left-nav destination.
   Prototype reference: public/desktop-mockup.html · spec:
   docs/superpowers/specs/2026-07-09-desktop-foundation-design.md
   ═══════════════════════════════════════════════════════════════ */

export type DesktopTab = "dashboard" | "pricing" | "ideas" | "contenido" | "noticias";

const NAV: { id: DesktopTab | "network"; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "pricing",   label: "Business",  icon: Briefcase },
  { id: "ideas",     label: "The Tape",  icon: AudioWaveform },
  { id: "contenido", label: "Marketing", icon: Camera },
  { id: "noticias",  label: "Community", icon: Users },
  { id: "network",   label: "Network",   icon: UserPlus },
];

/** Sidebar: full with labels, or icon-only once the window gets narrow so a
 *  squeezed desktop window keeps the desktop shell instead of flipping to the
 *  phone UI (Paco 2026-07-30). */
const SIDEBAR_FULL = 232;
const SIDEBAR_MINI = 62;
const HAIR = "rgba(255,255,255,.06)";

/* The tape's heartbeat in the sidebar: 24 amber bars breathing. Heights are
   fixed (not random) so SSR/CSR match; the stagger makes them feel alive. */
const PULSE_BARS = [8, 14, 7, 18, 11, 22, 9, 15, 7, 12, 17, 8, 13, 20, 10, 6, 16, 9, 14, 7, 19, 11, 8, 15];

export default function DesktopShell({
  profile,
  userId,
  activeTab,
  networkActive = false,
  settingsOpen = false,
  onNavigate,
  onOpenNetwork,
  onOpenSettings,
  children,
}: {
  profile: Profile;
  userId: string;
  activeTab: DesktopTab;
  networkActive?: boolean;
  settingsOpen?: boolean;
  onNavigate: (tab: DesktopTab) => void;
  onOpenNetwork: () => void;
  onOpenSettings: () => void;
  children: React.ReactNode;
}) {
  const scheme = getColorScheme(profile.color_id ?? null);
  const name = profile.display_name || profile.username || "";
  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "F";

  // Narrow window → icon-only sidebar. Keeps the desktop shell usable when the
  // window is dragged small, instead of falling back to the phone UI.
  /* Two different reasons to be narrow, and they don't rank the same.
     `tooNarrow` is physics: below 900px there's no room for labels, so the
     toggle can't override it. `collapsed` is the producer's choice, which is
     why the chevron only shows when there IS room to expand into. */
  const tooNarrow = useSidebarCompact();
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const compact = tooNarrow || collapsed;
  const SIDEBAR_W = compact ? SIDEBAR_MINI : SIDEBAR_FULL;


  const slide = "transform .32s cubic-bezier(.22,1,.36,1)";

  // Immersive: The Tape is the flagship, so entering it clears the chrome —
  // both side rails slide away and the reel takes the whole viewport.
  const immersive = activeTab === "ideas" && !networkActive && !settingsOpen;

  return (
    <div className="min-h-screen" style={{ background: CANVAS_BG }}>
      {/* Film grain over the whole shell: large gradients band on wide
          displays, and the noise also makes rail and canvas read as one
          material instead of two flat fills. */}
      <Grain />

      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside
        className="fixed left-0 top-0 bottom-0 z-40 flex flex-col"
        style={{
          width: SIDEBAR_W,
          /* The old gradient faded INTO the canvas value, so the rail
             dissolved at the bottom. It's a panel now: lighter and cooler at
             every height, with edge lighting instead of a border. */
          background: RAIL_BG,
          boxShadow: RAIL_SHADOW,
          padding: compact ? "22px 8px 18px" : "22px 14px 18px",
          transform: immersive ? "translateX(-100%)" : "translateX(0)",
          // Width joins the transition so expanding travels with the content
          // margin instead of snapping ahead of it. It's the one layout
          // property worth animating here: the rail is `fixed`, so widening
          // it doesn't reflow anything downstream.
          transition: `${slide}, width .32s cubic-bezier(.22,1,.36,1), padding .32s cubic-bezier(.22,1,.36,1)`,
        }}
      >
        <div className={`flex items-baseline gap-0.5 pb-6 ${compact ? "justify-center px-0" : "px-2.5"}`}>
          {!compact && <span className="text-[19px] font-bold tracking-tight text-white">fennec</span>}
          <span className="inline-block h-[5px] w-[5px] rounded-full bg-accent" style={{ boxShadow: "0 0 8px rgba(245,166,35,.8)" }} />
        </div>

        <nav className="flex flex-col gap-0.5">
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = id === "network"
              ? networkActive
              : !networkActive && !settingsOpen && activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => (id === "network" ? onOpenNetwork() : onNavigate(id))}
                aria-current={active ? "page" : undefined}
                title={compact ? label : undefined}
                className={`relative flex items-center rounded-[10px] py-[9px] text-[13.5px] font-medium transition ${compact ? "justify-center px-0" : "gap-3 px-2.5 text-left"} ${active ? "" : "hover:bg-white/[0.04] hover:text-zinc-200"}`}
                style={active ? { background: "rgba(245,166,35,.09)", color: "#ffc861" } : { color: "#8b8b93" }}
              >
                {/* active marker — the platform-standard left bar */}
                {active && (
                  <span className="absolute left-0 top-1/2 h-4 w-[2.5px] -translate-y-1/2 rounded-full" style={{ background: "#f5a623" }} />
                )}
                <Icon className="h-4 w-4 shrink-0" />
                {!compact && label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-2.5">
          {/* The Tape · live pulse — the reel's heartbeat, always present */}
          <button
            type="button"
            onClick={() => onNavigate("ideas")}
            aria-label="Open The Tape"
            title={compact ? "The Tape · live" : undefined}
            className={`rounded-[14px] transition hover:border-accent/40 ${compact ? "grid place-items-center py-2.5" : "px-3 pb-2.5 pt-3 text-left"}`}
            style={{
              background: "linear-gradient(150deg,rgba(245,166,35,.07),rgba(245,166,35,.02))",
              border: "1px solid rgba(245,166,35,.14)",
            }}
          >
            <div className="flex h-[26px] items-center gap-[2px]">
              {(compact ? PULSE_BARS.slice(0, 6) : PULSE_BARS).map((h, i) => (
                <i
                  key={i}
                  className="fennec-pulse-bar w-[3px] rounded-[2px]"
                  style={{
                    height: h,
                    background: "linear-gradient(180deg,#ffc861,rgba(245,166,35,.35))",
                    animationDelay: `${(i * 97) % 900}ms`,
                  }}
                />
              ))}
            </div>
            {!compact && (
              <div className="mt-[7px] flex items-baseline justify-between">
                <b className="text-[9px] font-bold uppercase tracking-[0.2em] text-accent">The Tape · live</b>
              </div>
            )}
          </button>

          {/* mini profile — on-brand chrome; the producer's color belongs to
              the FennecIdCard only (avatar initials keep it: it's their photo) */}
          <div
            className={compact ? "grid place-items-center py-1" : "rounded-[14px] p-3"}
            style={compact ? undefined : { border: `1px solid ${HAIR}`, background: "linear-gradient(150deg,#17151c,#100f13)" }}
            title={compact ? name : undefined}
          >
            <div className="flex items-center gap-2.5">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" className="h-[30px] w-[30px] rounded-full object-cover" />
              ) : (
                <div className="grid h-[30px] w-[30px] place-items-center rounded-full text-[11px] font-bold" style={{ background: scheme.accent, color: scheme.textOnAvatar }}>
                  {initials}
                </div>
              )}
              {!compact && (
                <div className="min-w-0">
                  <div className="truncate text-[12.5px] font-semibold text-white">{name}</div>
                  <div className="text-[9.5px] uppercase tracking-[0.12em] text-zinc-500">{profile.role ?? "Producer"}</div>
                </div>
              )}
            </div>
            {!compact && (
              <div className="mt-2 flex items-baseline gap-1.5 border-t pt-2" style={{ borderColor: "rgba(255,255,255,.06)" }}>
                <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-zinc-600">Fennec dB</span>
                <b className="text-[16px] text-accent">{profile.fennec_db_score}</b>
              </div>
            )}
          </div>

          {/* Expand / collapse. Only when the window can actually hold labels:
              offering it below 900px would be a button that does nothing.
              Same chevron language as the right rail's toggle, so both edges
              of the shell behave the same way. */}
          {!tooNarrow && (
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={`mt-1 flex items-center rounded-[10px] py-2 text-[12px] font-medium text-zinc-600 transition hover:bg-white/[0.04] hover:text-zinc-300 ${
                compact ? "justify-center px-0" : "gap-2 px-2.5"
              }`}
            >
              <ChevronRight
                className="h-[15px] w-[15px] shrink-0"
                style={{ transform: collapsed ? "none" : "rotate(180deg)", transition: slide }}
              />
              {!compact && "Collapse"}
            </button>
          )}
        </div>
      </aside>

      {/* ── Main area (margins slide with the rails) ─────────────
          h-screen + overflow-y-auto: this is the ONE scroll container on
          desktop. PricingCalculator's early-return to DesktopShell skips
          the mobile #scroll-root entirely, and html/body are globally
          overflow:hidden (the PWA scroll lock) — without this, nothing
          taller than one viewport (a long Community feed, a full month
          calendar, a tall business table) could ever be reached. Sidebar
          and rail are `fixed`, so they're unaffected by this scrolling. */}
      <div
        className="relative flex h-screen flex-col overflow-y-auto"
        style={{ marginLeft: immersive ? 0 : SIDEBAR_W, transition: "margin .32s cubic-bezier(.22,1,.36,1)" }}
      >
        {/* Giant fox, deep background layer — the brand present at all times,
            like the landing's first screen. Barely-there so content wins.
            Hidden in immersive: the reel owns the whole surface. */}
        {!immersive && (
          <Atmosphere inset={{ left: SIDEBAR_W }} />
        )}
        {immersive ? (
          <div className="relative z-10 w-full flex-1">{children}</div>
        ) : (
          /* One canonical content frame for every module: 1100px column,
             40px gutters, generous bottom padding so scroll always lands
             with breathing room. Modules must NOT add their own mx-auto/
             max-w/px — this is the single source of page margins.
             flex-col + min-h-0 so a module can claim h-full and distribute
             its own vertical space (Business fills the screen instead of
             leaving a 340px dead zone) while still scrolling when it
             outgrows one viewport. */
          <div className="relative z-10 mx-auto flex w-full min-h-0 max-w-[1100px] flex-1 flex-col px-10 pb-8 pt-5">
            {/* ── Account cluster ──
                What used to be a 292px rail is three buttons. The rail spent a
                fifth of the screen on chrome that gets read once a session, and
                its one piece of real content — Your Network — was a shortcut to
                a destination already sitting in the left nav (Paco 2026-08-02).

                Its own row above the module rather than floating over it: every
                module puts its actions in its own header ("+ New quote",
                "Share my ID"), and a fixed cluster would collide with them. */}
            <div className="mb-4 flex flex-shrink-0 items-center justify-end gap-2">
              <NotificationBell userId={userId} align="right" />
              <button
                type="button"
                onClick={onOpenSettings}
                aria-label="Settings"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-400 transition hover:border-accent/30 hover:text-accent"
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onOpenNetwork}
                aria-label={`${name} — your Fennec ID and network`}
                title={name}
                className="rounded-full transition hover:brightness-110"
              >
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover"
                    style={{ border: "1px solid rgba(255,255,255,.16)" }}
                  />
                ) : (
                  <div
                    className="grid h-9 w-9 place-items-center rounded-full text-[12px] font-extrabold"
                    style={{ background: scheme.accent, color: scheme.textOnAvatar, border: "1px solid rgba(255,255,255,.16)" }}
                  >
                    {initials}
                  </div>
                )}
              </button>
            </div>
            {children}
          </div>
        )}
      </div>

      {/* Immersive exit — quiet home affordance top-left, the only chrome
          left while the reel is playing. Returns to the dashboard. */}
      {immersive && (
        <button
          type="button"
          onClick={() => onNavigate("dashboard")}
          aria-label="Leave The Tape"
          className="fixed left-5 top-5 z-[80] flex items-center gap-2 rounded-full border px-3.5 py-2 text-[12px] font-semibold transition hover:brightness-110"
          style={{ borderColor: "rgba(245,166,35,.35)", background: "rgba(17,16,20,.7)", color: "#f5a623", backdropFilter: "blur(8px)" }}
        >
          <ChevronRight className="h-3.5 w-3.5" style={{ transform: "rotate(180deg)" }} />
          fennec
        </button>
      )}

      <style>{`
        @keyframes fennecPulse { from { transform: scaleY(.45); } to { transform: scaleY(1); } }
        .fennec-pulse-bar { animation: fennecPulse 1.6s ease-in-out infinite alternate; }
        @media (prefers-reduced-motion: reduce) { .fennec-pulse-bar { animation: none; } }
      `}</style>
    </div>
  );
}
