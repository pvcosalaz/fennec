"use client";
import { Home, Briefcase, Camera, Users, Settings, AudioWaveform, UserPlus } from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import { getColorScheme } from "@/lib/fennecIdPalette";
import type { Profile } from "@/lib/communityTypes";

/* ═══════════════════════════════════════════════════════════════
   DESKTOP SHELL — foundation, provisional skin.
   Chrome only: fixed sidebar + scrolling main area. The module tree
   (what renders per tab) is passed in as children so mobile and
   desktop share ONE source of truth in PricingCalculator.
   Visual grammar follows public/desktop-mockup.html (canvas #0b0a08,
   hairlines, amber = active/human) but every detail is expected to
   change in the UI iteration with Paco.
   See docs/superpowers/specs/2026-07-09-desktop-foundation-design.md
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
  /** Business → Network view is active (Network gets the highlight, not Business) */
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

  return (
    <div className="min-h-screen" style={{ background: "#0b0a08" }}>
      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside
        className="fixed left-0 top-0 bottom-0 z-40 flex flex-col"
        style={{ width: 232, borderRight: "1px solid rgba(255,255,255,.07)", padding: "22px 14px 18px" }}
      >
        {/* brand */}
        <div className="flex items-baseline gap-0.5 px-2.5 pb-6">
          <span className="text-[19px] font-bold tracking-tight text-white">fennec</span>
          <span className="inline-block h-[5px] w-[5px] rounded-full bg-accent" style={{ boxShadow: "0 0 8px rgba(245,166,35,.8)" }} />
        </div>

        {/* nav */}
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
                className="flex items-center gap-3 rounded-[10px] px-2.5 py-[9px] text-left text-[13.5px] font-medium transition"
                style={active
                  ? { background: "rgba(245,166,35,.09)", color: "#ffc861" }
                  : { color: "#8b8b93" }}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </nav>

        {/* footer: mini Fennec ID */}
        <div className="mt-auto flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Settings"
            className="flex items-center gap-3 rounded-[10px] px-2.5 py-[9px] text-left text-[13.5px] font-medium transition"
            style={settingsOpen ? { background: "rgba(245,166,35,.09)", color: "#ffc861" } : { color: "#8b8b93" }}
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
          <div
            className="rounded-[14px] p-3"
            style={{
              border: `1px solid ${scheme.accent}40`,
              background: `linear-gradient(150deg, ${scheme.dark1}, ${scheme.dark2})`,
            }}
          >
            <div className="flex items-center gap-2.5">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" className="h-[30px] w-[30px] rounded-full object-cover" />
              ) : (
                <div
                  className="grid h-[30px] w-[30px] place-items-center rounded-full text-[11px] font-bold"
                  style={{ background: scheme.accent, color: scheme.textOnAvatar }}
                >
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate text-[12.5px] font-semibold text-white">{name}</div>
                <div className="text-[9.5px] uppercase tracking-[0.12em] text-zinc-500">{profile.role ?? "Producer"}</div>
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5 border-t pt-2" style={{ borderColor: "rgba(255,255,255,.06)" }}>
              <span className="text-[8px] font-bold uppercase tracking-[0.16em]" style={{ color: `${scheme.accent}99` }}>
                Fennec dB
              </span>
              <b className="text-[16px]" style={{ color: scheme.accent }}>{profile.fennec_db_score}</b>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main area ──────────────────────────────────────────── */}
      <div style={{ marginLeft: 232 }} className="flex min-h-screen flex-col">
        {/* topbar */}
        <div
          className="sticky top-0 z-30 flex items-center justify-end gap-2 px-6 py-3"
          style={{ background: "rgba(11,10,8,.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,.05)" }}
        >
          <NotificationBell userId={userId} />
        </div>
        {/* module content — relative so full-bleed modules (the tape uses
            absolute inset-0) get a positioning box that fills the viewport */}
        <div className="relative mx-auto w-full max-w-5xl flex-1 px-6 py-6" style={{ minHeight: "calc(100vh - 56px)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
