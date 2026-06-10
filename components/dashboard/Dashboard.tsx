"use client";

import { useEffect, useState, useRef } from "react";
import { SiInstagram, SiTiktok, SiYoutube } from "react-icons/si";
import { type Project, type Quote, type Client } from "@/lib/pricingData";
import { getProjects, getQuotes, getClients } from "@/lib/businessDb";
import { PROFILE_KEY, type UserProfile } from "@/components/settings/SettingsModule";
import { fetchProfile } from "@/lib/communityDb";
import { supabase } from "@/lib/supabase";
import FennecIdCard from "@/components/network/FennecIdCard";
import { getColorScheme } from "@/lib/fennecIdPalette";
import { ensureColorAssigned } from "@/lib/networkDb";
import { WelcomeModal, ChecklistCard, type ChecklistItem } from "@/components/dashboard/WelcomeChecklist";
import type { Profile } from "@/lib/communityTypes";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Mix a hex color toward white (t 0→1). Used to build the dB number gradient. */
function tint(hex: string, t: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mix = (c: number) => Math.round(c + (255 - c) * t);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60)   return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)    return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days}d`;
}

// ─── EQ bars ─────────────────────────────────────────────────────────────────

const EQ_HEIGHTS = [10, 18, 8, 15, 10, 22, 7, 13, 18, 9];

function EqBars({ accent }: { accent: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-end", height: 22, gap: 2,
      filter: `drop-shadow(0 0 5px ${accent}50)`,
    }}>
      {EQ_HEIGHTS.map((h, i) => (
        <span key={i} className="fennec-eq-bar"
          style={{
            height: h,
            background: `linear-gradient(180deg, ${tint(accent, 0.35)}, ${accent})`,
            animationDelay: `${i * 0.15}s`,
          }} />
      ))}
    </div>
  );
}

// ─── AnimatedNumber ──────────────────────────────────────────────────────────

function AnimatedNumber({ value }: { value: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (value === 0) { setN(0); return; }
    let start: number | null = null;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1000, 1);
      setN(Math.floor((1 - Math.pow(1 - p, 3)) * value));
      if (p < 1) requestAnimationFrame(tick); else setN(value);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [value]);
  return <>{n}</>;
}

// ─── Stat chip (Streams / Créditos / Proyectos) ──────────────────────────────

function StatChip({
  value, label, pending, onConnect,
}: {
  value?: number | null;
  label: string;
  pending?: boolean;
  onConnect?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-4">
      {pending || value == null ? (
        <span className="text-2xl font-black text-zinc-700">—</span>
      ) : (
        <p className="text-2xl font-black text-white tabular-nums tracking-tight"><AnimatedNumber value={value} /></p>
      )}
      <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{label}</p>
      {pending && onConnect && (
        <button type="button" onClick={onConnect}
          className="mt-0.5 text-[9px] font-semibold transition"
          style={{ color: "rgba(245,166,35,0.55)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(245,166,35,0.9)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(245,166,35,0.55)")}>
          connect →
        </button>
      )}
    </div>
  );
}

// ─── Social chip ─────────────────────────────────────────────────────────────

function SocialChip({
  icon, count, label, color, hasHandle, onConnect,
}: {
  icon: React.ReactNode;
  count?: number | null;
  label: string;
  color: string;
  hasHandle: boolean;
  onConnect?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-3">
      <div style={{ color, opacity: 0.8, filter: `drop-shadow(0 0 6px ${color}40)` }}>{icon}</div>
      <p className={`text-xl font-black mt-0.5 tabular-nums tracking-tight ${hasHandle && count != null ? "text-white" : "text-zinc-700"}`}>
        {hasHandle ? (count != null ? fmtCount(count) : "—") : "—"}
      </p>
      <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{label}</p>
      {!hasHandle && onConnect && (
        <button type="button" onClick={onConnect}
          className="mt-0.5 text-[9px] font-semibold transition"
          style={{ color: "rgba(245,166,35,0.55)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(245,166,35,0.9)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(245,166,35,0.55)")}>
          connect →
        </button>
      )}
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export default function Dashboard({
  avatarUrl, username, isPro, userId,
  onOpenSettings, onOpenProfileSettings,
  networkProfile, onColorAssigned, onNavigate, className,
}: {
  avatarUrl?: string | null;
  username?: string | null;
  isPro?: boolean;
  userId?: string | null;
  onOpenSettings?: () => void;
  onOpenProfileSettings?: () => void;
  networkProfile?: Profile | null;
  onColorAssigned?: (colorId: string) => void;
  onNavigate?: (tab: "pricing" | "contenido" | "dashboard" | "ideas" | "noticias") => void;
  className?: string;
}) {
  const [projects,   setProjects]   = useState<Project[]>([]);
  const [quotes,     setQuotes]     = useState<Quote[]>([]);
  const [clients,    setClients]    = useState<Client[]>([]);
  const [businessLoaded, setBusinessLoaded] = useState(false);
  const [profile,    setProfile]    = useState<UserProfile | null>(null);
  const [mounted,    setMounted]    = useState(false);
  const [showDbInfo, setShowDbInfo] = useState(false);
  const [showSocialInfo, setShowSocialInfo] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [marketingVisited, setMarketingVisited] = useState(false);

  // First-visit welcome + marketing-visited flag
  useEffect(() => {
    try {
      setMarketingVisited(localStorage.getItem("fennec_visited_marketing_v1") === "1");
      if (localStorage.getItem("fennec_onboarding_seen_v1") !== "1") setShowWelcome(true);
    } catch { /* ignore */ }
  }, []);

  function closeWelcome() {
    setShowWelcome(false);
    try { localStorage.setItem("fennec_onboarding_seen_v1", "1"); } catch { /* ignore */ }
  }

  // Social stats
  const [igFollowers,  setIgFollowers]  = useState<number | null>(null);
  const [ttFollowers,  setTtFollowers]  = useState<number | null>(null);
  const [ytSubs,       setYtSubs]       = useState<number | null>(null);
  const [syncedAt,     setSyncedAt]     = useState<string | null>(null);
  const [syncing,      setSyncing]      = useState(false);

  // Seed counts from the already-fetched networkProfile for instant paint
  // (own fetchProfile below refreshes them right after).
  useEffect(() => {
    const p = networkProfile;
    if (!p) return;
    if (p.ig_followers     != null) setIgFollowers((v) => v ?? p.ig_followers ?? null);
    if (p.tiktok_followers != null) setTtFollowers((v) => v ?? p.tiktok_followers ?? null);
    if (p.yt_subscribers   != null) setYtSubs((v) => v ?? p.yt_subscribers ?? null);
    if (p.social_synced_at != null) setSyncedAt((v) => v ?? p.social_synced_at ?? null);
  }, [networkProfile]);

  useEffect(() => {
    try {
      const pr = localStorage.getItem(PROFILE_KEY);
      if (pr) setProfile(JSON.parse(pr));
    } catch {}
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetchProfile(userId).then((p) => {
      if (!p) return;
      const loaded: UserProfile = {
        name: p.display_name ?? "", role: p.role ?? "",
        country: p.country ?? "", genres: p.genres ?? [],
        instagram: p.instagram ?? "", spotify: p.spotify ?? "",
        youtube: p.youtube_url ?? "", tiktok: p.tiktok ?? "",
      };
      setProfile(loaded);
      try { localStorage.setItem(PROFILE_KEY, JSON.stringify(loaded)); } catch {}
      // Load cached social stats
      if (p.ig_followers   != null) setIgFollowers(p.ig_followers);
      if (p.tiktok_followers != null) setTtFollowers(p.tiktok_followers);
      if (p.yt_subscribers != null) setYtSubs(p.yt_subscribers);
      if (p.social_synced_at) setSyncedAt(p.social_synced_at);

      // Auto first-sync: has handles but no counts yet (never synced, or a
      // previous sync failed and wrote nulls). Weekly cron handles the rest.
      const hasHandles = !!(p.instagram || p.tiktok || p.youtube_url);
      const noCounts = p.ig_followers == null && p.tiktok_followers == null && p.yt_subscribers == null;
      if (hasHandles && noCounts) refreshSocial();
    }).catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    Promise.all([getProjects(userId), getQuotes(userId), getClients(userId)])
      .then(([p, q, c]) => { setProjects(p); setQuotes(q); setClients(c); })
      .catch(() => {})
      .finally(() => setBusinessLoaded(true));
  }, [userId]);

  // Color for FennecIdCard
  const [resolvedColorId, setResolvedColorId] = useState<string | null>(networkProfile?.color_id ?? null);
  const onColorAssignedRef = useRef(onColorAssigned);
  useEffect(() => { onColorAssignedRef.current = onColorAssigned; });
  useEffect(() => {
    if (!userId || !networkProfile) return;
    ensureColorAssigned(userId, networkProfile.color_id).then((colorId) => {
      setResolvedColorId(colorId);
      if (colorId !== networkProfile.color_id) onColorAssignedRef.current?.(colorId);
    });
  }, [userId, networkProfile?.color_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // FENNEC dB
  const activeCount     = projects.filter((p) => p.status !== "paid").length;
  const closedCount     = projects.filter((p) => p.status === "paid").length;
  const quotesSent      = quotes.filter((q) => q.status === "sent").length;
  const totalFollowers  = (igFollowers ?? 0) + (ttFollowers ?? 0) + (ytSubs ?? 0);
  const socialPoints    = Math.floor(totalFollowers / 100);

  const fennecDb = Math.round(
    activeCount    * 150 +
    closedCount    * 50  +
    clients.length * 75  +
    quotesSent     * 25  +
    socialPoints
  );
  useEffect(() => {
    if (mounted) localStorage.setItem("fennec-db-score", String(fennecDb));
  }, [fennecDb, mounted]);

  // Refresh social stats via Apify
  async function refreshSocial() {
    if (!userId || syncing) return;
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";
      const res = await fetch(`/api/social-stats?userId=${userId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        if (data.ig_followers    != null) setIgFollowers(data.ig_followers);
        if (data.tiktok_followers != null) setTtFollowers(data.tiktok_followers);
        if (data.yt_subscribers  != null) setYtSubs(data.yt_subscribers);
        setSyncedAt(data.synced_at);
      }
    } catch {
      /* silent — keep last known values */
    }
    setSyncing(false);
  }

  // Card data
  const cardColorScheme = getColorScheme(resolvedColorId);
  const cardName    = networkProfile?.display_name || username || "";
  const cardParts   = cardName.trim().split(/\s+/);
  const cardFirst   = cardParts[0] ?? "";
  const cardLast    = cardParts.slice(1).join(" ");
  const cardInitials = cardParts.length >= 2
    ? (cardParts[0][0] + cardParts[1][0]).toUpperCase()
    : cardName.slice(0, 2).toUpperCase();

  const hasIg = !!(networkProfile?.instagram || profile?.instagram);
  const hasTt = !!(networkProfile?.tiktok     || profile?.tiktok);
  const hasYt = !!(networkProfile?.youtube_url || profile?.youtube);

  // ── Onboarding checklist ──
  const profileDone = !!((networkProfile?.display_name || profile?.name) && (networkProfile?.role || profile?.role));
  const socialDone  = hasIg || hasTt || hasYt;
  const projectDone = projects.length >= 1;
  const checklistItems: ChecklistItem[] = [
    { id: "profile",  label: "Complete your profile",     desc: "Name, role & country",           done: profileDone,     onClick: () => { closeWelcome(); onOpenProfileSettings?.(); } },
    { id: "social",   label: "Connect your socials",      desc: "Instagram, TikTok, YouTube",      done: socialDone,      onClick: () => { closeWelcome(); onOpenProfileSettings?.(); } },
    { id: "project",  label: "Create your first project", desc: "Use the calculator & save it",    done: projectDone,     onClick: () => { closeWelcome(); onNavigate?.("pricing"); } },
    { id: "marketing",label: "Explore the Marketing Hub", desc: "Calendar, ideas & scripts",       done: marketingVisited, onClick: () => { closeWelcome(); onNavigate?.("contenido"); } },
  ];
  const onboardingComplete = checklistItems.every((i) => i.done);

  const accent = cardColorScheme.accent;
  const glowRgb = cardColorScheme.glowRgb;

  return (
    <div className={`relative mx-auto w-full max-w-4xl flex flex-col overflow-y-auto min-h-0 pb-2 pt-1 px-4 ${className ?? ""}`}>
      <style>{`
        @keyframes dashRise {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .dash-rise { animation: dashRise 0.55s cubic-bezier(.16,1,.3,1) both; }
        @media (prefers-reduced-motion: reduce) { .dash-rise { animation: none; } }
      `}</style>

      {/* Atmosphere — faint identity-color aura behind the meter */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-4 h-[460px]"
        style={{ background: `radial-gradient(ellipse 70% 55% at 50% 38%, rgba(${glowRgb},0.07), transparent 70%)` }} />

      {/* Content — my-auto centers it when short, scrolls when tall (no clipping) */}
      <div className="my-auto w-full flex flex-col gap-2">

      {/* Username */}
      {username && (
        <p className="dash-rise -mt-2 text-center text-xl font-bold tracking-tight"
           style={{ color: accent, textShadow: `0 0 24px rgba(${glowRgb},0.35)` }}>
          @{username}
        </p>
      )}

      {/* Fennec ID card */}
      {networkProfile && (
        <div className="dash-rise" style={{ animationDelay: "0.05s" }}>
          <FennecIdCard
            firstName={cardFirst} lastName={cardLast}
            role={networkProfile.role ?? "Producer"}
            country={networkProfile.country ?? ""}
            genres={networkProfile.genres ?? []}
            fennecDb={fennecDb} colorScheme={cardColorScheme}
            initials={cardInitials} avatarUrl={avatarUrl}
            instagram={networkProfile.instagram}
            spotify={networkProfile.spotify}
            youtube={networkProfile.youtube_url}
            smallDb
          />
        </div>
      )}

      {/* FENNEC dB hero — the signal meter */}
      <div className="dash-rise relative flex flex-col items-center gap-1.5 py-1" style={{ animationDelay: "0.12s" }}>
        <div className="flex w-full items-center gap-3 px-6">
          <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${accent}25)` }} />
          <div className="flex items-center gap-1.5">
            <p className="text-[9px] font-bold tracking-[0.35em] uppercase"
               style={{ color: `${accent}60` }}>FENNEC dB</p>
            <button type="button" onClick={() => setShowDbInfo((v) => !v)}
              style={{ color: `${accent}55`, lineHeight: 1 }}
              aria-label="¿Qué es FENNEC dB?">
              <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="8" cy="8" r="7.5" stroke="currentColor" strokeWidth="1" fill="none" />
                <text x="8" y="12" textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor">i</text>
              </svg>
            </button>
          </div>
          <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${accent}25, transparent)` }} />
        </div>
        <p className="text-[72px] font-black leading-none tabular-nums tracking-[-0.04em]"
           style={{
             background: `linear-gradient(180deg, ${tint(accent, 0.45)} 0%, ${accent} 60%, ${accent} 100%)`,
             WebkitBackgroundClip: "text",
             backgroundClip: "text",
             color: "transparent",
             filter: `drop-shadow(0 2px 18px rgba(${glowRgb},0.30))`,
           }}>
          <AnimatedNumber value={fennecDb} />
        </p>
        <EqBars accent={accent} />
        {showDbInfo && (
          <div className="w-full rounded-xl border px-4 py-3 mt-1 text-[10px] leading-relaxed space-y-3"
               style={{ borderColor: `${cardColorScheme.accent}15`, background: `${cardColorScheme.accent}08`, color: `${cardColorScheme.accent}70` }}>
            <p>Tu señal como artista y productor — crece con cada proyecto, cliente y escucha.</p>
            {/* Negocio */}
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest mb-1.5"
                 style={{ color: `${cardColorScheme.accent}45` }}>Negocio</p>
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                {[
                  ["Proyecto activo",    "×150"],
                  ["Proyecto cerrado",   "×50"],
                  ["Cliente",            "×75"],
                  ["Cotización enviada", "×25"],
                ].map(([l, p]) => (
                  <span key={l}>{l} <strong style={{ color: cardColorScheme.accent }}>{p}</strong></span>
                ))}
              </div>
            </div>

            {/* Redes sociales */}
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest mb-1.5"
                 style={{ color: `${cardColorScheme.accent}45` }}>Redes sociales</p>
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                <span>
                  Seguidores totales{" "}
                  <strong style={{ color: cardColorScheme.accent }}>÷100 pts</strong>
                </span>
              </div>
              {totalFollowers > 0 && (
                <p className="mt-1 text-[9px]" style={{ color: `${cardColorScheme.accent}55` }}>
                  {totalFollowers.toLocaleString()} seguidores → <strong style={{ color: cardColorScheme.accent }}>+{socialPoints} pts</strong>
                </p>
              )}
            </div>

            {/* Alcance musical (próximamente) */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-[8px] font-bold uppercase tracking-widest"
                   style={{ color: `${cardColorScheme.accent}45` }}>Alcance musical</p>
                <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: `${cardColorScheme.accent}15`, color: `${cardColorScheme.accent}70` }}>
                  vía Muso.AI · próximamente
                </span>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1" style={{ opacity: 0.5 }}>
                {[["Streams totales", "por definir"], ["Créditos verificados", "por definir"]].map(([l, p]) => (
                  <span key={l}>{l} <strong style={{ color: cardColorScheme.accent }}>{p}</strong></span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stat chips: Streams · Créditos · Proyectos */}
      <div className="dash-rise" style={{ animationDelay: "0.2s" }}>
        <div className="flex items-center gap-2 mb-1.5 px-1">
          <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-600 flex-shrink-0">
            Música &amp; Negocio
          </p>
          <div className="h-px flex-1 bg-gradient-to-r from-white/[0.07] to-transparent" />
        </div>
        <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
          <StatChip label="Streams"   pending onConnect={onOpenSettings} />
          <StatChip label="Créditos"  pending onConnect={onOpenSettings} />
          <StatChip label="Proyectos" value={activeCount} />
        </div>
      </div>

      {/* Social chips: Instagram · TikTok · YouTube */}
      <div className="dash-rise" style={{ animationDelay: "0.28s" }}>
        <div className="flex items-center gap-2 mb-1.5 px-1">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-600">Alcance social</p>
            <button type="button" onClick={() => setShowSocialInfo((v) => !v)}
              className="text-zinc-600 hover:text-zinc-400 transition leading-none"
              aria-label="¿Cómo se actualiza?">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="8" cy="8" r="7.5" stroke="currentColor" strokeWidth="1" fill="none" />
                <text x="8" y="12" textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor">i</text>
              </svg>
            </button>
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-white/[0.07] to-transparent" />
          {syncing && <span className="text-[9px] text-zinc-600 animate-spin inline-block flex-shrink-0">↻</span>}
        </div>
        {showSocialInfo && (
          <p className="text-[9px] text-zinc-500 mb-1.5 px-1 leading-relaxed">
            Updates automatically every week.
            {syncedAt && <span className="text-zinc-600"> · Last: {timeAgo(syncedAt)}</span>}
          </p>
        )}
        <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
          <SocialChip icon={<SiInstagram size={13} />} count={igFollowers}
            label="Instagram" color="#E1306C" hasHandle={hasIg} onConnect={onOpenProfileSettings} />
          <SocialChip icon={<SiTiktok size={13} />}   count={ttFollowers}
            label="TikTok"    color="#ffffff" hasHandle={hasTt} onConnect={onOpenProfileSettings} />
          <SocialChip icon={<SiYoutube size={13} />}  count={ytSubs}
            label="YouTube"   color="#FF0000" hasHandle={hasYt} onConnect={onOpenProfileSettings} />
        </div>
      </div>

      {/* Onboarding checklist — replaces the old empty state, until all steps done */}
      {businessLoaded && !onboardingComplete && (
        <div className="dash-rise border-t border-white/5 pt-4 pb-2" style={{ animationDelay: "0.36s" }}>
          <ChecklistCard items={checklistItems} onOpen={() => setShowWelcome(true)} />
        </div>
      )}

      </div>
      {/* end centered content wrapper */}

      {/* Welcome modal — first visit */}
      {showWelcome && (
        <WelcomeModal
          userName={(networkProfile?.display_name || username || "").split(" ")[0]}
          items={checklistItems}
          onClose={closeWelcome}
        />
      )}

    </div>
  );
}
