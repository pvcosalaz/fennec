"use client";

import { useEffect, useState, useRef } from "react";
import { SiInstagram, SiTiktok, SiYoutube } from "react-icons/si";
import { type Project, type Quote, type Client } from "@/lib/pricingData";
import { getProjects, getQuotes, getClients } from "@/lib/businessDb";
import { PROFILE_KEY, type UserProfile } from "@/components/settings/SettingsModule";
import { fetchProfile, updateDbScore } from "@/lib/communityDb";
import { supabase } from "@/lib/supabase";
import FennecIdCard from "@/components/network/FennecIdCard";
import { getColorScheme } from "@/lib/fennecIdPalette";
import { ensureColorAssigned } from "@/lib/networkDb";
import { WelcomeModal, ProgressChip, type ChecklistItem } from "@/components/dashboard/WelcomeChecklist";
import { computeFennecDb, reachDb as reachDbOf, totalReachAudience, FENNEC_DB_MODEL } from "@/lib/fennecDb";
import { fetchContributionDays, type ContributionDays } from "@/lib/contributions";
import ContributionsCard from "@/components/dashboard/ContributionsCard";
import { fetchKarma } from "@/lib/audioDb";
import { fetchNotifications } from "@/lib/notificationDb";
import { useIsDesktop } from "@/lib/useIsDesktop";
import DashboardDesktop from "@/components/desktop/DashboardDesktop";
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
      {/* px/py + negative margins grow the tap target toward 44pt without shifting layout */}
      {pending && onConnect && (
        <button type="button" onClick={onConnect}
          className="mt-0.5 text-[9px] font-semibold transition px-3 py-2 -mx-3 -my-1.5"
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
      {/* Same tap-target expansion as StatChip's connect button */}
      {!hasHandle && onConnect && (
        <button type="button" onClick={onConnect}
          className="mt-0.5 text-[9px] font-semibold transition px-3 py-2 -mx-3 -my-1.5"
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
  networkProfile, onColorAssigned, onNavigate, onOpenCalculator, className,
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
  /** Jumps straight into the pricing calculator (not just the Business hub) —
   *  the checklist's "Set your rate" step needs to land there directly. */
  onOpenCalculator?: () => void;
  className?: string;
}) {
  const isDesktop = useIsDesktop();
  const [projects,   setProjects]   = useState<Project[]>([]);
  const [quotes,     setQuotes]     = useState<Quote[]>([]);
  const [clients,    setClients]    = useState<Client[]>([]);
  const [businessLoaded, setBusinessLoaded] = useState(false);
  const [contributions, setContributions] = useState<ContributionDays | null>(null);
  const [profile,    setProfile]    = useState<UserProfile | null>(null);
  const [karma,      setKarma]      = useState<number | null>(null);
  const [latestNote, setLatestNote] = useState<string | null>(null); // latest feedback on my tracks (desktop band)
  const [mounted,    setMounted]    = useState(false);
  const [showDbInfo, setShowDbInfo] = useState(false);
  const [showSocialInfo, setShowSocialInfo] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [marketingVisited, setMarketingVisited] = useState(false);
  const [cardExpanded, setCardExpanded] = useState(false);
  const [cardAnimating, setCardAnimating] = useState(false);
  const [cardClosing, setCardClosing] = useState(false);
  const [cardRect, setCardRect] = useState<DOMRect | null>(null);
  const cardButtonRef = useRef<HTMLButtonElement>(null);

  // Close the expanded Fennec ID. Flipping cardClosing lets the small source
  // card fade back in WHILE the overlay scales+fades out (crossfade) — without
  // it, the overlay vanishes first and the source card snaps back in after,
  // leaving a blank flash. Unmount only after both finish (~340ms).
  function closeCard() {
    setCardClosing(true);
    setCardAnimating(false);
    setTimeout(() => {
      setCardExpanded(false);
      setCardClosing(false);
      setCardRect(null);
    }, 340);
  }

  // First-visit welcome + marketing-visited flag.
  // Re-sync the flag whenever the dashboard regains focus or another tab writes it,
  // so returning from the Content tab reliably marks the step done (no stale state).
  useEffect(() => {
    const syncMarketing = () => {
      try {
        if (
          localStorage.getItem("fennec_visited_marketing_v1") === "1" ||
          localStorage.getItem("fennec_onboarding_complete_v1") === "1"
        ) {
          setMarketingVisited(true);
        }
      } catch { /* ignore */ }
    };

    try {
      syncMarketing();
      if (localStorage.getItem("fennec_onboarding_seen_v1") !== "1") setShowWelcome(true);
    } catch { /* ignore */ }

    window.addEventListener("focus", syncMarketing);
    window.addEventListener("storage", syncMarketing);
    document.addEventListener("visibilitychange", syncMarketing);
    return () => {
      window.removeEventListener("focus", syncMarketing);
      window.removeEventListener("storage", syncMarketing);
      document.removeEventListener("visibilitychange", syncMarketing);
    };
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

      // Auto first-sync: trigger if any handle exists but its count is missing.
      const missingCount =
        (p.instagram   && p.ig_followers     == null) ||
        (p.tiktok      && p.tiktok_followers == null) ||
        (p.youtube_url && p.yt_subscribers   == null);
      if (missingCount) refreshSocial();
    }).catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    Promise.all([getProjects(userId), getQuotes(userId), getClients(userId)])
      .then(([p, q, c]) => {
        setProjects(p); setQuotes(q); setClients(c);
        // Contributions graph feeds off the same business rows + community/audio
        // activity (queried inside). Best-effort: a failure just leaves the
        // graph empty, never blocks the dashboard.
        fetchContributionDays(userId, p, q, c)
          .then(setContributions)
          .catch(() => {});
      })
      .catch(() => {})
      .finally(() => setBusinessLoaded(true));
  }, [userId]);

  // Desktop-only band ("Music & Business") shows the karma balance —
  // mobile doesn't need it here since it lives in the tape's transport.
  useEffect(() => {
    if (!userId || !isDesktop) return;
    fetchKarma(userId).then(setKarma).catch(() => {});
    // Latest feedback note for the "Today on Fennec" band
    fetchNotifications(userId)
      .then((ns) => {
        const note = ns.find((n) => n.type === "audio_feedback");
        setLatestNote(note ? (note.body || note.title) : null);
      })
      .catch(() => {});
  }, [userId, isDesktop]);

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

  // FENNEC dB — reach-driven, logarithmic (see lib/fennecDb.ts). Reach is the
  // engine (every 10x of audience ≈ +12 dB); activity is a small capped booster.
  const activeCount     = projects.filter((p) => p.status !== "paid").length;
  const closedCount     = projects.filter((p) => p.status === "paid").length;
  const quotesSent      = quotes.filter((q) => q.status === "sent").length;
  const quotesOutTotal  = quotes.filter((q) => q.status === "sent").reduce((sum, q) => sum + q.finalPrice, 0);
  const totalFollowers  = (igFollowers ?? 0) + (ttFollowers ?? 0) + (ytSubs ?? 0);

  const dbInputs = {
    instagramFollowers: igFollowers,
    tiktokFollowers:    ttFollowers,
    youtubeSubscribers: ytSubs,
    activeProjects:     activeCount,
    closedProjects:     closedCount,
    clients:            clients.length,
    quotesSent,
  };
  const fennecDb  = computeFennecDb(dbInputs);
  const reachOnly = Math.round(reachDbOf(dbInputs));
  const activityBoost = fennecDb - reachOnly;
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("fennec-db-score", String(fennecDb));
    if (userId) updateDbScore(userId, fennecDb);
  }, [fennecDb, mounted, userId]);

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
  // "Set your rate" completes when the calculator setup is finished. It used
  // to require creating a project — but new users can't create one without
  // rates from the calculator first, so the tutorial was un-finishable.
  // Dashboard remounts on every tab switch, so this re-reads on return.
  const calcDone = (() => {
    try {
      const saved = localStorage.getItem("fennec-pricing-v1");
      return !!(saved && (JSON.parse(saved) as { setupCompleted?: boolean }).setupCompleted);
    } catch { return false; }
  })();
  // "Leave your first note" completes once they've marked a track on the tape.
  // Set in ProjectReviewPlayer.submitMark; re-read here since Dashboard remounts
  // on every tab switch.
  const noteDone = (() => {
    try { return localStorage.getItem("fennec_has_left_note_v1") === "1"; } catch { return false; }
  })();
  const checklistItems: ChecklistItem[] = [
    { id: "profile",  label: "Complete your profile",     desc: "Name, role & country",             done: profileDone,     onClick: () => { closeWelcome(); onOpenProfileSettings?.(); } },
    { id: "social",   label: "Connect your socials",      desc: "Instagram, TikTok, YouTube",        done: socialDone,      onClick: () => { closeWelcome(); onOpenProfileSettings?.(); } },
    { id: "project",  label: "Set your rate",             desc: "Complete the pricing calculator",   done: calcDone || projectDone, onClick: () => { closeWelcome(); onOpenCalculator ? onOpenCalculator() : onNavigate?.("pricing"); } },
    { id: "note",     label: "Review your first track",    desc: "Listen to a fellow producer, then leave your note", done: noteDone, onClick: () => { closeWelcome(); onNavigate?.("ideas"); } },
    { id: "marketing",label: "Explore the Marketing Hub", desc: "Calendar, ideas & scripts",         done: marketingVisited, onClick: () => { closeWelcome(); onNavigate?.("contenido"); } },
  ];
  const onboardingComplete = checklistItems.every((i) => i.done);

  // Once every step is done, remember it permanently so the checklist never nags again.
  useEffect(() => {
    if (onboardingComplete) {
      try { localStorage.setItem("fennec_onboarding_complete_v1", "1"); } catch { /* ignore */ }
    }
  }, [onboardingComplete]);

  const accent = cardColorScheme.accent;
  const glowRgb = cardColorScheme.glowRgb;

  // ── Desktop: the approved band-based content (public/desktop-mockup.html),
  // same data computed above — only the render forks, never the logic.
  if (isDesktop) {
    return (
      <DashboardDesktop
        card={{
          firstName: cardFirst,
          lastName: cardLast,
          role: networkProfile?.role ?? profile?.role ?? "Producer",
          country: networkProfile?.country ?? "",
          genres: networkProfile?.genres ?? [],
          initials: cardInitials,
          avatarUrl: avatarUrl,
          instagram: networkProfile?.instagram,
          spotify: networkProfile?.spotify,
          youtube: networkProfile?.youtube_url,
          collectionNumber: networkProfile?.fennec_number ?? undefined,
        }}
        networkProfile={networkProfile}
        fennecDb={fennecDb}
        cardColorScheme={cardColorScheme}
        igFollowers={igFollowers}
        ttFollowers={ttFollowers}
        ytSubs={ytSubs}
        activeProjects={activeCount}
        totalProjects={projects.length}
        contributions={contributions}
        quotesSentCount={quotesSent}
        quotesOutTotal={quotesOutTotal}
        karma={karma}
        sentQuotes={quotes.filter((q) => q.status === "sent")}
        latestNote={latestNote}
        onNavigate={onNavigate}
        onOpenProfileSettings={onOpenProfileSettings}
      />
    );
  }

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

      {/* Content — fills top-to-bottom (justify-between) so there's never a black
          gap; scrolls instead of clipping when content is taller than the frame. */}
      <div className="flex-1 w-full flex flex-col justify-between gap-2">

      {/* Username */}
      {username && (
        <p className="dash-rise -mt-2 text-center text-xl font-bold tracking-tight"
           style={{ color: accent, textShadow: `0 0 24px rgba(${glowRgb},0.35)` }}>
          @{username}
        </p>
      )}

      {/* Fennec ID card — FLIP animation tap to expand */}
      {networkProfile && (
        <div className="dash-rise" style={{ animationDelay: "0.05s" }}>
          <button
            ref={cardButtonRef}
            type="button"
            onClick={() => {
              const rect = cardButtonRef.current?.getBoundingClientRect();
              if (!rect) return;
              setCardRect(rect);
              setCardClosing(false);
              setCardExpanded(true);
              setCardAnimating(false);
              // Double rAF: let browser paint the overlay at card position first
              requestAnimationFrame(() => requestAnimationFrame(() => setCardAnimating(true)));
            }}
            className="w-full text-left"
            style={{
              display: "block",
              // Hide the source card while the overlay copy is flying (Apple Wallet
              // behavior). On close (cardClosing) it fades back in over 0.32s so it
              // crossfades with the shrinking overlay — no blank flash, no snap.
              transition: cardClosing
                ? "opacity 0.32s ease"
                : "transform 0.15s cubic-bezier(.16,1,.3,1), opacity 0.1s ease",
              opacity: cardExpanded && !cardClosing ? 0 : 1,
              pointerEvents: cardExpanded ? "none" : "auto",
            }}
            onMouseDown={(e)  => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)"; }}
            onMouseUp={(e)    => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
            onTouchStart={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)"; }}
            onTouchEnd={(e)   => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
          >
            <FennecIdCard
              firstName={cardFirst} lastName={cardLast}
              role={networkProfile.role ?? "Producer"}
              country={networkProfile.country ?? ""}
              genres={networkProfile.genres ?? []}
              fennecDb={fennecDb} colorScheme={cardColorScheme}
              collectionNumber={networkProfile.fennec_number ?? undefined}
              initials={cardInitials} avatarUrl={avatarUrl}
              instagram={networkProfile.instagram}
              spotify={networkProfile.spotify}
              youtube={networkProfile.youtube_url}
              smallDb
            />
          </button>
        </div>
      )}

      {/* FLIP-animated Wallet overlay — starts at card rect, springs to center */}
      {cardExpanded && networkProfile && cardRect && (() => {
        const PAD = 20;
        const targetW = Math.min(380, window.innerWidth - PAD * 2);
        const targetH = 260; // approx full card height (no smallDb)
        const targetX = (window.innerWidth  - targetW) / 2;
        const targetY = (window.innerHeight - targetH) / 2 - 40;

        // Clean uniform scale-in from center (NOT a FLIP rect-morph). The
        // collapsed card is wide-and-short (smallDb) while the expanded one is
        // taller — morphing between those two aspect ratios scaled x and y
        // independently and visibly squished the card. A single uniform scale
        // + fade never distorts: the card just grows into place.
        // Spring: ζ=0.74 damped oscillator (~3% overshoot) → rises, pops just
        // past full size, settles. linear() on iOS 17.2+/Chrome 113+; older
        // browsers fall back to default ease and still animate.
        const OPEN_SPRING = "linear(0, 0.0371, 0.1278, 0.2469, 0.3762, 0.5032, 0.6199, 0.7218, 0.8071, 0.8757, 0.9288, 0.9681, 0.9958, 1.014, 1.0249, 1.0302, 1.0315, 1.0302, 1.0273, 1.0235, 1.0194, 1.0154, 1.0118, 1.0086, 1.0059, 1.0038, 1.0022, 1.0009, 1.0001, 1)";
        const SPRING = cardAnimating
          ? `0.5s ${OPEN_SPRING}`
          : "0.26s cubic-bezier(.3,0,.66,1)";

        return (
          <>
            {/* Backdrop */}
            <div
              onClick={closeCard}
              style={{
                position: "fixed", inset: 0, zIndex: 99,
                background: "rgba(0,0,0,0.72)",
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
                opacity: cardAnimating ? 1 : 0,
                transition: `opacity 0.3s ease`,
              }}
            />

            {/* Card — clean uniform scale + fade into center */}
            <div
              style={{
                position: "fixed",
                top: targetY,
                left: targetX,
                width: targetW,
                zIndex: 100,
                opacity: cardAnimating ? 1 : 0,
                transform: cardAnimating
                  ? "translateY(0) scale(1)"
                  : "translateY(14px) scale(0.92)",
                transformOrigin: "center center",
                transition: `transform ${SPRING}, opacity ${cardAnimating ? "0.28s ease-out" : "0.2s ease-in"}`,
                willChange: "transform, opacity",
              }}
            >
              <FennecIdCard
                firstName={cardFirst} lastName={cardLast}
                role={networkProfile.role ?? "Producer"}
                country={networkProfile.country ?? ""}
                genres={networkProfile.genres ?? []}
                fennecDb={fennecDb} colorScheme={cardColorScheme}
                collectionNumber={networkProfile.fennec_number ?? undefined}
                initials={cardInitials} avatarUrl={avatarUrl}
                instagram={networkProfile.instagram}
                spotify={networkProfile.spotify}
                youtube={networkProfile.youtube_url}
              />

              {/* Action buttons — fade in after card lands */}
              <div style={{
                display: "flex", gap: 10, marginTop: 12,
                opacity: cardAnimating ? 1 : 0,
                transform: cardAnimating ? "translateY(0)" : "translateY(8px)",
                transition: `opacity 0.3s ease ${cardAnimating ? "0.28s" : "0s"}, transform 0.3s cubic-bezier(.16,1,.3,1) ${cardAnimating ? "0.28s" : "0s"}`,
              }}>
                <button
                  onClick={() => {
                    // Share the PUBLIC card link — the /u/username page shows
                    // the real Fennec ID and its OG image unfurls the card in
                    // WhatsApp/iMessage instead of a bare text line.
                    const url = `https://app.fennec.audio/u/${username}`;
                    const text = `@${username} — ${fennecDb} dB on Fennec`;
                    if (navigator.share) void navigator.share({ title: "My Fennec ID", text, url });
                    else void navigator.clipboard?.writeText(url);
                  }}
                  style={{
                    flex: 1, padding: "13px 0", borderRadius: 14,
                    background: `${cardColorScheme.accent}18`,
                    border: `1px solid ${cardColorScheme.accent}30`,
                    color: cardColorScheme.accent,
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                    transition: "transform 0.12s cubic-bezier(.16,1,.3,1)",
                  }}
                  onMouseDown={(e)  => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.96)"; }}
                  onMouseUp={(e)    => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
                  onTouchStart={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.96)"; }}
                  onTouchEnd={(e)   => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
                >
                  Share
                </button>
                <button
                  onClick={closeCard}
                  style={{
                    flex: 1, padding: "13px 0", borderRadius: 14,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                    transition: "transform 0.12s cubic-bezier(.16,1,.3,1)",
                  }}
                  onMouseDown={(e)  => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.96)"; }}
                  onMouseUp={(e)    => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
                  onTouchStart={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.96)"; }}
                  onTouchEnd={(e)   => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Reduced motion fallback */}
            <style>{`@media(prefers-reduced-motion:reduce){.fennec-wallet-card{transition:none!important}}`}</style>
          </>
        );
      })()}

      {/* FENNEC dB hero — the signal meter */}
      <div className="dash-rise relative flex flex-col items-center gap-1.5 py-1" style={{ animationDelay: "0.12s" }}>
        <div className="flex w-full items-center gap-3 px-6">
          <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${accent}25)` }} />
          <div className="flex items-center gap-1.5">
            <p className="text-[9px] font-bold tracking-[0.35em] uppercase"
               style={{ color: `${accent}60` }}>FENNEC dB</p>
            <button type="button" onClick={() => setShowDbInfo((v) => !v)}
              style={{ color: `${accent}55`, lineHeight: 1 }}
              aria-label="What is FENNEC dB?">
              <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="8" cy="8" r="7.5" stroke="currentColor" strokeWidth="1" fill="none" />
                <text x="8" y="12" textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor">i</text>
              </svg>
            </button>
          </div>
          <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${accent}25, transparent)` }} />
        </div>
        <p className="text-[72px] font-black leading-none tabular-nums tracking-[-0.04em] pr-1"
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
            <p>Your signal strength as a producer, measured like decibels. A logarithmic read on your real reach: every 10× of audience adds about +{FENNEC_DB_MODEL.reachPerDecade} dB.</p>

            {/* Reach — the engine */}
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest mb-1.5"
                 style={{ color: `${cardColorScheme.accent}45` }}>Reach · the engine</p>
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                <span>Instagram + TikTok + YouTube followers</span>
              </div>
              {totalFollowers > 0 ? (
                <p className="mt-1 text-[9px]" style={{ color: `${cardColorScheme.accent}55` }}>
                  {totalReachAudience(dbInputs).toLocaleString()} in audience → <strong style={{ color: cardColorScheme.accent }}>{reachOnly} dB</strong>
                </p>
              ) : (
                <p className="mt-1 text-[9px]" style={{ color: `${cardColorScheme.accent}55` }}>
                  Connect your socials to build your signal.
                </p>
              )}
            </div>

            {/* Activity — the booster */}
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest mb-1.5"
                 style={{ color: `${cardColorScheme.accent}45` }}>Activity · a boost (max +{FENNEC_DB_MODEL.activityCap})</p>
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                <span>Projects, clients &amp; quotes. Closing work only adds. It never lowers your dB.</span>
              </div>
              {activityBoost > 0 && (
                <p className="mt-1 text-[9px]" style={{ color: `${cardColorScheme.accent}55` }}>
                  Your activity → <strong style={{ color: cardColorScheme.accent }}>+{activityBoost} dB</strong>
                </p>
              )}
            </div>

            {/* Verified reach (coming soon) */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-[8px] font-bold uppercase tracking-widest"
                   style={{ color: `${cardColorScheme.accent}45` }}>Verified reach</p>
                <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: `${cardColorScheme.accent}15`, color: `${cardColorScheme.accent}70` }}>
                  streams &amp; credits · coming soon
                </span>
              </div>
              <p className="text-[9px]" style={{ opacity: 0.6 }}>
                Verified streams and credits will fold into your reach.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Contributions — the dB's visual evidence: real work logged, GitHub-style
          (v4 layout, Paco 2026-07-22: dB stays solitary above; this lives where
          the stats zone starts). */}
      <div className="dash-rise" style={{ animationDelay: "0.18s" }}>
        <ContributionsCard data={contributions} accent={accent} />
      </div>

      {/* Your numbers — Music & Business + Social Reach merged under one header
          to pay for the Contributions card's height (still a no-scroll panel). */}
      <div className="dash-rise" style={{ animationDelay: "0.26s" }}>
        <div className="flex items-center gap-2 mb-1.5 px-1">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-600">Your Numbers</p>
            <button type="button" onClick={() => setShowSocialInfo((v) => !v)}
              className="text-zinc-600 hover:text-zinc-400 transition leading-none"
              aria-label="How is it updated?">
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
            Socials update automatically every week.
            {syncedAt && <span className="text-zinc-600"> · Last: {timeAgo(syncedAt)}</span>}
          </p>
        )}
        <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
          <StatChip label="Streams"  pending onConnect={onOpenSettings} />
          <StatChip label="Credits"  pending onConnect={onOpenSettings} />
          <StatChip label="Projects" value={activeCount} />
        </div>
        <div className="grid grid-cols-3 divide-x divide-white/[0.06] border-t border-white/[0.05]">
          <SocialChip icon={<SiInstagram size={13} />} count={igFollowers}
            label="Instagram" color="#E1306C" hasHandle={hasIg} onConnect={onOpenProfileSettings} />
          <SocialChip icon={<SiTiktok size={13} />}   count={ttFollowers}
            label="TikTok"    color="#ffffff" hasHandle={hasTt} onConnect={onOpenProfileSettings} />
          <SocialChip icon={<SiYoutube size={13} />}  count={ytSubs}
            label="YouTube"   color="#FF0000" hasHandle={hasYt} onConnect={onOpenProfileSettings} />
        </div>
      </div>

      </div>
      {/* end centered content wrapper */}

      {/* Onboarding progress — floating chip, zero vertical footprint. The
          dashboard stays a fixed instrument panel: no scrolling checklist.
          Tap → the steps sheet; hidden forever once everything's done. */}
      {businessLoaded && !onboardingComplete && (
        <div className="dash-rise absolute right-4 top-1 z-20" style={{ animationDelay: "0.3s" }}>
          <ProgressChip items={checklistItems} onOpen={() => setShowWelcome(true)} />
        </div>
      )}

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
