"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { SiSpotify, SiInstagram, SiYoutube } from "react-icons/si";
import {
  type Project,
  type Quote,
  type Client,
  formatCOP,
  computePricing,
} from "@/lib/pricingData";
import { getProjects, getQuotes, getClients } from "@/lib/businessDb";
import { PROFILE_KEY, type UserProfile } from "@/components/settings/SettingsModule";
import { fetchProfile } from "@/lib/communityDb";
import { supabase } from "@/lib/supabase";
import FennecFox from "./FennecFox";
import FennecIdCard from "@/components/network/FennecIdCard";
import { getColorScheme } from "@/lib/fennecIdPalette";
import { ensureColorAssigned } from "@/lib/networkDb";
import type { Profile } from "@/lib/communityTypes";

// ─── Constants ────────────────────────────────────────────────────────────────

const TRACK_COLORS = ["#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff", "#c77dff", "#ff9f43", "#48dbfb"];
const STATUS_PROGRESS: Record<string, number> = {
  in_progress: 28, review: 55, delivered: 80, paid: 100,
};
const PLATFORMS = [
  { key: "instagram", name: "IG",      Icon: SiInstagram, color: "#E1306C" },
  { key: "spotify",   name: "Spotify", Icon: SiSpotify,   color: "#1DB954" },
  { key: "youtube",   name: "YT",      Icon: SiYoutube,   color: "#FF0000" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLastNMonths(n: number) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return {
      month: d.getMonth(),
      year: d.getFullYear(),
      label: d.toLocaleString("en-US", { month: "short" }),
      isCurrent: i === n - 1,
    };
  });
}

function isInMonth(ts: number, month: number, year: number) {
  const d = new Date(ts);
  return d.getMonth() === month && d.getFullYear() === year;
}

function revenueForMonth(projects: Project[], month: number, year: number) {
  return projects
    .filter((p) => p.status === "paid" && isInMonth(p.createdAt, month, year))
    .reduce((s, p) => s + p.price, 0);
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5)  return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 19) return "Good afternoon";
  return "Good evening";
}

function timeAgo(ts: number) {
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 60) return "now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

// ─── AnimatedNumber ───────────────────────────────────────────────────────────

function AnimatedNumber({ value }: { value: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (value === 0) { setN(0); return; }
    let start: number | null = null;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1000, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.floor(eased * value));
      if (p < 1) requestAnimationFrame(tick);
      else setN(value);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [value]);
  return <>{n}</>;
}

// ─── Equalizer bars ───────────────────────────────────────────────────────────

function EqualizerBars({
  months, revenues,
}: { months: ReturnType<typeof getLastNMonths>; revenues: number[] }) {
  const [up, setUp] = useState(false);
  useEffect(() => { const t = setTimeout(() => setUp(true), 150); return () => clearTimeout(t); }, []);
  const max = Math.max(...revenues, 1);

  return (
    <div className="flex items-end gap-1.5" style={{ height: 120 }}>
      {months.map((m, i) => {
        const hasRev = revenues[i] > 0;
        const pct = hasRev ? Math.max((revenues[i] / max) * 100, 10) : 3;
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <div className="relative w-full flex items-end rounded-lg overflow-hidden bg-white/[0.04]" style={{ height: 96 }}>
              <div
                className={`w-full rounded-lg transition-all duration-700 ease-out ${m.isCurrent ? "bg-accent" : "bg-white/15"}`}
                style={{
                  height: up ? `${pct}%` : "0%",
                  transitionDelay: `${i * 55}ms`,
                  boxShadow: m.isCurrent && hasRev ? "0 0 16px rgba(245,166,35,0.45)" : "none",
                }}
              >
                {m.isCurrent && <div className="absolute top-0 inset-x-0 h-px bg-white/40 rounded-full" />}
              </div>
            </div>
            <span className={`text-[10px] font-medium ${m.isCurrent ? "text-accent" : "text-zinc-700"}`}>
              {m.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Project track (DAW) ──────────────────────────────────────────────────────

function ProjectTrack({ project, color }: { project: Project; color: string }) {
  const [up, setUp] = useState(false);
  useEffect(() => { const t = setTimeout(() => setUp(true), 300); return () => clearTimeout(t); }, []);
  const progress = STATUS_PROGRESS[project.status] ?? 25;
  const isPaid = project.status === "paid";

  return (
    <div className="flex items-center gap-3">
      <div className="h-9 w-1 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-white truncate">{project.name}</p>
          <span className={`text-[10px] shrink-0 font-medium ${isPaid ? "text-emerald-400" : "text-zinc-600"}`}>
            {isPaid ? "✓ Paid" : project.status.replace("_", " ")}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: up ? `${progress}%` : "0%",
              backgroundColor: color,
              boxShadow: `0 0 8px ${color}50`,
            }}
          />
        </div>
        {project.clientName && (
          <p className="text-[10px] text-zinc-700 truncate">{project.clientName}</p>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

type SpotifyData = { connected: boolean; followers: number; displayName?: string; imageUrl?: string | null } | null;
type YouTubeData = { connected: boolean; verified: boolean; subscriberCount: number; viewCount: number; videoCount: number; channelTitle: string; thumbnail?: string } | null;

export default function Dashboard({
  avatarUrl,
  username,
  isPro,
  userId,
  onOpenSettings,
  onOpenProfileSettings,
  networkProfile,
  onColorAssigned,
  className,
}: {
  avatarUrl?: string | null;
  username?: string | null;
  isPro?: boolean;
  userId?: string | null;
  onOpenSettings?: () => void;
  onOpenProfileSettings?: () => void;
  networkProfile?: Profile | null;
  onColorAssigned?: (colorId: string) => void;
  className?: string;
}) {
  const [projects,    setProjects]    = useState<Project[]>([]);
  const [quotes,      setQuotes]      = useState<Quote[]>([]);
  const [clients,     setClients]     = useState<Client[]>([]);
  const [profile,     setProfile]     = useState<UserProfile | null>(null);
  const [mounted,     setMounted]     = useState(false);
  const [spotifyData,  setSpotifyData]  = useState<SpotifyData>(null);
  const [youtubeData,  setYoutubeData]  = useState<YouTubeData>(null);
  const [spotifyToast,  setSpotifyToast]  = useState(false);
  const [youtubeToast,  setYoutubeToast]  = useState(false);

  useEffect(() => {
    // Show cached profile instantly while Supabase loads
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
        name:      p.display_name ?? "",
        role:      p.role ?? "",
        country:   p.country ?? "",
        genres:    p.genres ?? [],
        instagram: p.instagram ?? "",
        spotify:   p.spotify ?? "",
        youtube:   p.youtube_url ?? "",
        tiktok:    p.tiktok ?? "",
      };
      setProfile(loaded);
      // Keep cache fresh for next load
      try { localStorage.setItem(PROFILE_KEY, JSON.stringify(loaded)); } catch {}
    }).catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    Promise.all([getProjects(userId), getQuotes(userId), getClients(userId)]).then(
      ([p, q, c]) => { setProjects(p); setQuotes(q); setClients(c); }
    );
  }, [userId]);

  // Fetch Spotify + YouTube stats on mount — pass auth token so API can verify ownership
  useEffect(() => {
    if (!userId) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      const headers: HeadersInit = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};
      fetch(`/api/spotify/stats?userId=${userId}`, { headers })
        .then((r) => r.json())
        .then((data) => setSpotifyData(data))
        .catch(() => {});
      fetch(`/api/youtube/stats?userId=${userId}`, { headers })
        .then((r) => r.json())
        .then((data) => { if (!data.error) setYoutubeData(data); })
        .catch(() => {});
    });
  }, [userId]);

  // Show success toasts if redirected back with ?spotify=connected or ?youtube=connected
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const url = new URL(window.location.href);
    if (params.get("spotify") === "connected") {
      setSpotifyToast(true);
      url.searchParams.delete("spotify");
      window.history.replaceState({}, "", url.toString());
      const t = setTimeout(() => setSpotifyToast(false), 4000);
      return () => clearTimeout(t);
    }
    if (params.get("youtube") === "connected") {
      setYoutubeToast(true);
      url.searchParams.delete("youtube");
      window.history.replaceState({}, "", url.toString());
      const t = setTimeout(() => setYoutubeToast(false), 4000);
      return () => clearTimeout(t);
    }
  }, []);

  // Resolve color for the Fennec ID card
  const [resolvedColorId, setResolvedColorId] = useState<string | null>(networkProfile?.color_id ?? null);
  const onColorAssignedRef = useRef(onColorAssigned);
  useEffect(() => { onColorAssignedRef.current = onColorAssigned; });

  useEffect(() => {
    if (!userId || !networkProfile) return;
    ensureColorAssigned(userId, networkProfile.color_id).then((colorId) => {
      if (colorId !== networkProfile.color_id) {
        setResolvedColorId(colorId);
        onColorAssignedRef.current?.(colorId);
      } else {
        setResolvedColorId(colorId);
      }
    });
  }, [userId, networkProfile?.color_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const months   = useMemo(() => getLastNMonths(6), []);
  const revenues = useMemo(() => months.map((m) => revenueForMonth(projects, m.month, m.year)), [projects, months]);

  const activeCount  = projects.filter((p) => p.status !== "paid").length;
  const closedCount  = projects.filter((p) => p.status === "paid").length;
  const quotesSent   = quotes.filter((q) => q.status === "sent").length;
  const isFoxActive  = activeCount > 0;

  const spotifyFollowers  = spotifyData?.connected ? (spotifyData.followers ?? 0) : 0;
  const spotifyDbPoints   = Math.min(spotifyFollowers / 100, 50);
  const youtubeSubscribers = youtubeData?.subscriberCount ?? 0;
  const youtubeDbPoints   = Math.min(youtubeSubscribers / 50, 100);

  const fennecDb = Math.round(
    activeCount  * 150 +
    closedCount  * 50  +
    clients.length * 75 +
    quotesSent   * 25  +
    spotifyDbPoints +
    youtubeDbPoints
  );

  // Persist score so the community feed can read it
  useEffect(() => {
    if (mounted) localStorage.setItem("fennec-db-score", String(fennecDb));
  }, [fennecDb, mounted]);

  // Fennec ID card data
  const cardColorScheme = getColorScheme(resolvedColorId);
  const cardName   = networkProfile?.display_name || username || "";
  const cardParts  = cardName.trim().split(/\s+/);
  const cardFirst  = cardParts[0] ?? "";
  const cardLast   = cardParts.slice(1).join(" ");
  const cardInitials = cardParts.length >= 2
    ? (cardParts[0][0] + cardParts[1][0]).toUpperCase()
    : cardName.slice(0, 2).toUpperCase();

  type Act = { id: string; label: string; sub: string; ts: number; dot: string };
  const activity: Act[] = useMemo(() => {
    const items: Act[] = [
      ...projects.map((p) => ({
        id: p.id,
        label: p.status === "paid" ? `Cobrado · ${formatCOP(p.price)}` : `${p.name} → ${p.status.replace("_", " ")}`,
        sub: p.clientName || p.projectTypeName,
        ts: p.createdAt,
        dot: p.status === "paid" ? "#6bcb77" : "#4d96ff",
      })),
      ...quotes.map((q) => ({
        id: q.id,
        label: q.status === "sent" ? "Quote enviado" : "Quote creado",
        sub: `${q.projectName}${q.clientName ? ` · ${q.clientName}` : ""}`,
        ts: q.createdAt,
        dot: "#f5a623",
      })),
    ];
    return items.sort((a, b) => b.ts - a.ts).slice(0, 2);
  }, [projects, quotes]);

  return (
    <div className={`mx-auto w-full max-w-4xl space-y-3 pb-2 pt-1 px-4 ${className ?? ""}`}>

      {/* ── Toasts ────────────────────────────────────────────────────────── */}
      {spotifyToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border border-[#1DB954]/30 bg-zinc-900 px-4 py-2.5 shadow-lg">
          <SiSpotify className="h-4 w-4 text-[#1DB954]" />
          <span className="text-sm text-white font-medium">Spotify connected!</span>
        </div>
      )}
      {youtubeToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border border-[#FF0000]/30 bg-zinc-900 px-4 py-2.5 shadow-lg">
          <SiYoutube className="h-4 w-4 text-[#FF0000]" />
          <span className="text-sm text-white font-medium">YouTube connected!</span>
        </div>
      )}

      {/* ── Username ── */}
      {username && (
        <p className="-mt-2 text-center text-xl font-bold text-amber-400">@{username}</p>
      )}

      {/* ── Fennec ID card ── */}
      {networkProfile && (
        <FennecIdCard
          firstName={cardFirst}
          lastName={cardLast}
          role={networkProfile.role ?? "Producer"}
          country={networkProfile.country ?? ""}
          genres={networkProfile.genres ?? []}
          fennecDb={fennecDb}
          colorScheme={cardColorScheme}
          initials={cardInitials}
          avatarUrl={avatarUrl}
          instagram={networkProfile.instagram}
          tiktok={networkProfile.tiktok}
          spotify={networkProfile.spotify}
          youtube={networkProfile.youtube_url}
        />
      )}

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-1 px-2 border-t border-white/5 pt-3">
        {[
          { label: "Active",  value: projects.filter((p) => p.status !== "paid").length, color: "#4d96ff"  },
          { label: "Closed",  value: projects.filter((p) => p.status === "paid").length,  color: "#6bcb77"  },
          { label: "Clients", value: clients.length,                                       color: "#c77dff"  },
          { label: "Quotes",  value: quotes.filter((q) => q.status === "sent").length,     color: "#f5a623"  },
        ].map((k) => (
          <div key={k.label} className="py-2 text-center space-y-0.5">
            <p className="text-2xl font-black" style={{ color: k.color }}>
              <AnimatedNumber value={k.value} />
            </p>
            <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wide">{k.label}</p>
          </div>
        ))}
      </div>

      {/* ── Revenue ──────────────────────────────────────────────────────── */}
      <div className="border-t border-white/5 pt-3 px-2 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
          Revenue
        </p>
        <EqualizerBars months={months} revenues={revenues} />
      </div>

      {/* ── Social Reach ─────────────────────────────────────────────────── */}
      <div className="border-t border-white/5 pt-3 px-2 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Social Reach</p>
        <div className="flex items-end justify-around">
          {PLATFORMS.map((p) => {
            let value = 0;
            if (p.key === "spotify" && spotifyData?.connected) {
              value = Math.min(spotifyFollowers / 10000, 1);
            }
            if (p.key === "youtube" && youtubeData) {
              value = Math.min(youtubeSubscribers / 5000, 1);
            }
            return <VUMeter key={p.key} platform={p} value={value} />;
          })}
        </div>
        <div className="space-y-1">
          {userId && !spotifyData?.connected && (
            <a href={`/api/spotify/connect?userId=${userId}`} className="flex items-center gap-1 text-[9px] text-[#1DB954]/80 hover:text-[#1DB954] transition">
              <SiSpotify className="h-2.5 w-2.5" /> Connect Spotify
            </a>
          )}
          {spotifyData?.connected && (
            <p className="text-[9px] text-[#1DB954]/70">
              ♫ {spotifyFollowers.toLocaleString()} followers
            </p>
          )}
          {userId && !youtubeData?.connected && (
            <a href={`/api/youtube/connect?userId=${userId}`} className="flex items-center gap-1 text-[9px] text-[#FF0000]/80 hover:text-[#FF0000] transition">
              <SiYoutube className="h-2.5 w-2.5" /> Connect YouTube
            </a>
          )}
          {youtubeData?.connected && (
            <p className="text-[9px] text-[#FF0000]/70">
              ▶ {youtubeSubscribers.toLocaleString()} subs
            </p>
          )}
          {!spotifyData?.connected && !youtubeData?.connected && !userId && (
            <p className="text-[9px] text-zinc-600">Connect to see stats</p>
          )}
        </div>
      </div>

      {/* ── Empty hint ────────────────────────────────────────────────────── */}
      {projects.length === 0 && quotes.length === 0 && (
        <p className="text-center text-[10px] text-zinc-700 pb-1">
          Add projects &amp; quotes to bring the dashboard to life
        </p>
      )}

    </div>
  );
}
