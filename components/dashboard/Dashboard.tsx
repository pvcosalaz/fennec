"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { ChevronRight, Info } from "lucide-react";
import { SiSpotify, SiInstagram, SiYoutube, SiTiktok } from "react-icons/si";
import {
  type Project,
  type Quote,
  type Client,
  formatCOP,
  computePricing,
} from "@/lib/pricingData";
import { getProjects, getQuotes, getClients } from "@/lib/businessDb";
import { PROFILE_KEY, type UserProfile } from "@/components/settings/SettingsModule";
import FennecFox from "./FennecFox";

// ─── Constants ────────────────────────────────────────────────────────────────

const TRACK_COLORS = ["#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff", "#c77dff", "#ff9f43", "#48dbfb"];
const STATUS_PROGRESS: Record<string, number> = {
  in_progress: 28, review: 55, delivered: 80, paid: 100,
};
const PLATFORMS = [
  { key: "instagram", name: "IG",      Icon: SiInstagram, color: "#E1306C" },
  { key: "spotify",   name: "Spotify", Icon: SiSpotify,   color: "#1DB954" },
  { key: "youtube",   name: "YT",      Icon: SiYoutube,   color: "#FF0000" },
  { key: "tiktok",    name: "TikTok",  Icon: SiTiktok,    color: "#ffffff" },
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

// ─── Waveform ─────────────────────────────────────────────────────────────────

function WaveformHero({ activeCount }: { activeCount: number }) {
  const fillRef   = useRef<SVGPathElement>(null);
  const strokeRef = useRef<SVGPathElement>(null);
  const rafRef    = useRef<number>(0);
  const W = 400; const H = 80;

  // Escala suave: 0 proyectos = casi nada, 5+ = máximo
  const energy = Math.min(activeCount / 5, 1);
  const ampA   = 0.02 + energy * 0.10; // amplitud onda principal
  const ampB   = 0.01 + energy * 0.04; // amplitud onda secundaria
  const speed  = 0.003 + energy * 0.004; // velocidad

  // Usamos refs para evitar re-crear el effect cada render
  const energyRef = useRef({ ampA, ampB, speed });
  useEffect(() => { energyRef.current = { ampA, ampB, speed }; }, [ampA, ampB, speed]);

  useEffect(() => {
    let phase = 0;
    const tick = () => {
      const { ampA, ampB, speed } = energyRef.current;
      phase += speed;

      const pts = Array.from({ length: 80 }, (_, i) => ({
        x: (i / 79) * W,
        y: H * 0.72
          + Math.sin(i * 0.18 - phase) * H * ampA
          + Math.sin(i * 0.09 - phase * 0.6) * H * ampB,
      }));

      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) {
        const cw = (pts[i].x - pts[i - 1].x) / 2;
        d += ` C ${pts[i-1].x + cw} ${pts[i-1].y} ${pts[i].x - cw} ${pts[i].y} ${pts[i].x} ${pts[i].y}`;
      }

      fillRef.current?.setAttribute("d", d + ` L ${W} ${H} L 0 ${H} Z`);
      strokeRef.current?.setAttribute("d", d);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className="absolute inset-x-0 bottom-0 h-20 z-0 pointer-events-none">
      <style>{`
        @keyframes waveBreath {
          0%, 100% { opacity: 0.55; filter: drop-shadow(0 0 3px rgba(245,166,35,0.12)); }
          50%       { opacity: 1;    filter: drop-shadow(0 0 10px rgba(245,166,35,0.40)); }
        }
      `}</style>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-full"
        preserveAspectRatio="none"
        style={{ animation: "waveBreath 4.5s ease-in-out infinite" }}
      >
        <defs>
          <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#f5a623" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#f5a623" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        <path ref={fillRef}   fill="url(#wg)" />
        <path ref={strokeRef} fill="none" stroke="#f5a623" strokeWidth="1.5" strokeOpacity="0.65" />
      </svg>
    </div>
  );
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

// ─── VU Meter ─────────────────────────────────────────────────────────────────

function VUMeter({ platform, value = 0 }: { platform: typeof PLATFORMS[0]; value?: number }) {
  const [up, setUp] = useState(false);
  useEffect(() => { const t = setTimeout(() => setUp(true), 400); return () => clearTimeout(t); }, []);
  const segments = 14;
  const filled = up ? Math.max(Math.round(value * segments), value > 0 ? 3 : 0) : 0;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-col-reverse gap-[3px]" style={{ height: 88 }}>
        {Array.from({ length: segments }, (_, i) => {
          const lit = i < filled;
          const segColor = i >= segments * 0.8 ? "#ef4444" : i >= segments * 0.6 ? "#fbbf24" : platform.color;
          return (
            <div
              key={i}
              className="rounded-sm transition-all"
              style={{
                width: 18,
                height: 4,
                backgroundColor: lit ? segColor : "rgba(255,255,255,0.05)",
                boxShadow: lit ? `0 0 5px ${segColor}70` : "none",
                transitionDelay: `${(segments - i) * 25}ms`,
              }}
            />
          );
        })}
      </div>
      <platform.Icon className="h-4 w-4" style={{ color: platform.color, opacity: 0.6 }} />
      <span className="text-[9px] text-zinc-700 font-medium">{platform.name}</span>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

type SpotifyData = { connected: boolean; followers: number; displayName?: string; imageUrl?: string | null } | null;
type YouTubeData = { connected: boolean; verified: boolean; subscriberCount: number; viewCount: number; videoCount: number; channelTitle: string; thumbnail?: string } | null;

export default function Dashboard({ avatarUrl, username, isPro, userId }: { avatarUrl?: string | null; username?: string | null; isPro?: boolean; userId?: string | null }) {
  const [projects,    setProjects]    = useState<Project[]>([]);
  const [quotes,      setQuotes]      = useState<Quote[]>([]);
  const [clients,     setClients]     = useState<Client[]>([]);
  const [profile,     setProfile]     = useState<UserProfile | null>(null);
  const [mounted,     setMounted]     = useState(false);
  const [showDbInfo,  setShowDbInfo]  = useState(false);
  const [spotifyData,  setSpotifyData]  = useState<SpotifyData>(null);
  const [youtubeData,  setYoutubeData]  = useState<YouTubeData>(null);
  const [spotifyToast,  setSpotifyToast]  = useState(false);
  const [youtubeToast,  setYoutubeToast]  = useState(false);

  useEffect(() => {
    try {
      const pr = localStorage.getItem(PROFILE_KEY);
      if (pr) setProfile(JSON.parse(pr));
    } catch {}
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!userId) return;
    Promise.all([getProjects(userId), getQuotes(userId), getClients(userId)]).then(
      ([p, q, c]) => { setProjects(p); setQuotes(q); setClients(c); }
    );
  }, [userId]);

  // Fetch Spotify + YouTube stats on mount
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/spotify/stats?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => setSpotifyData(data))
      .catch(() => {});
    fetch(`/api/youtube/stats?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => { if (!data.error) setYoutubeData(data); })
      .catch(() => {});
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

  const months   = useMemo(() => getLastNMonths(6), []);
  const revenues = useMemo(() => months.map((m) => revenueForMonth(projects, m.month, m.year)), [projects, months]);

  const firstName    = profile?.name?.trim().split(" ")[0] || null;
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
    return items.sort((a, b) => b.ts - a.ts).slice(0, 5);
  }, [projects, quotes]);

  if (!mounted) return null;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 pb-8 pt-2 px-4">

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

      {/* ── Fennec dB ────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden px-2 pt-4 pb-6">
        <div className="relative z-10 space-y-4">

          {/* Row 1: Greeting + inline Fennec logo + username */}
          <div className="flex items-center gap-2">
            <img
              src="/fennec-logo.png"
              alt=""
              style={{ width: 22, height: "auto", filter: "brightness(0) invert(1)", opacity: 0.5 }}
            />
            <p className="text-xs text-white font-medium uppercase tracking-widest">
              {greeting()}{firstName ? `, ${firstName}` : ""}
            </p>
          </div>

          {/* Row 2: photo + dB + metrics side by side */}
          <div className="flex items-start gap-4">

            {/* Avatar */}
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-20 h-20 rounded-full object-cover ring-2 ring-white/10 shrink-0 mt-1" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-amber-500/20 border border-amber-500/20 flex items-center justify-center shrink-0 mt-1">
                <span className="text-xl font-bold text-amber-400">{firstName ? firstName[0].toUpperCase() : "?"}</span>
              </div>
            )}

            {/* dB number */}
            <div className="space-y-1 shrink-0 w-24">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-semibold tracking-widest text-accent/70 uppercase">Fennec dB</p>
                <button onClick={() => setShowDbInfo((v) => !v)} className="text-zinc-600 hover:text-accent transition">
                  <Info className="h-3 w-3" />
                </button>
              </div>
              <p className="text-6xl font-black text-white leading-none tracking-tighter tabular-nums">
                <AnimatedNumber value={fennecDb} />
              </p>
              <p className="text-xs text-zinc-300">business signal</p>
            </div>

            {/* Signal components — fill the space to the right */}
            <div className="flex flex-col gap-1.5 pt-0.5 flex-1">
              {[
                { label: "Active projects", value: activeCount,       color: "#4d96ff", weight: 150,  connected: true  },
                { label: "Clients",         value: clients.length,    color: "#c77dff", weight: 75,   connected: true  },
                { label: "Closed",          value: closedCount,       color: "#6bcb77", weight: 50,   connected: true  },
                { label: "Spotify",         value: spotifyData?.connected ? spotifyFollowers : null, color: "#1DB954", weight: 1, connected: spotifyData?.connected ?? false },
                { label: "YouTube",         value: youtubeData ? youtubeSubscribers : null,           color: "#FF0000", weight: 1, connected: !!youtubeData },
                { label: "Reach",           value: null,              color: "#E1306C", weight: null, connected: false },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-2">
                  <div
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: row.value !== null && row.value > 0 ? row.color : "rgba(255,255,255,0.08)",
                      boxShadow: row.value !== null && row.value > 0 ? `0 0 5px ${row.color}` : "none",
                    }}
                  />
                  <span className="text-xs text-zinc-300 w-20">{row.label}</span>
                  {row.value !== null ? (
                    <span className={`text-[10px] font-medium ${row.value > 0 ? "text-white" : "text-zinc-700"}`}>
                      {row.value > 0 ? `${row.value} × ${row.weight}` : "—"}
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-500 italic">connect soon</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Inline info — toggle with ⓘ */}
          {showDbInfo && (
            <div className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5 space-y-1.5">
              <p className="text-[10px] text-zinc-400 leading-relaxed">
                A growing number that measures how active your music business is — like signal strength, but for your career.
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
                {[
                  { label: "Active project", value: "×150" },
                  { label: "Closed project", value: "×50"  },
                  { label: "Client",         value: "×75"  },
                  { label: "Quote sent",     value: "×25"  },
                ].map((r) => (
                  <span key={r.label} className="text-[10px] text-zinc-400">
                    <span className="text-white font-medium">{r.value}</span> {r.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2 px-2 border-t border-white/5 pt-4">
        {[
          { label: "Active",  value: projects.filter((p) => p.status !== "paid").length, color: "#4d96ff"  },
          { label: "Closed",  value: projects.filter((p) => p.status === "paid").length,  color: "#6bcb77"  },
          { label: "Clients", value: clients.length,                                       color: "#c77dff"  },
          { label: "Quotes",  value: quotes.filter((q) => q.status === "sent").length,     color: "#f5a623"  },
        ].map((k) => (
          <div key={k.label} className="p-3 text-center space-y-1">
            <p className="text-2xl font-black" style={{ color: k.color }}>
              <AnimatedNumber value={k.value} />
            </p>
            <p className="text-xs text-zinc-300 font-medium uppercase tracking-wide">{k.label}</p>
          </div>
        ))}
      </div>


      {/* ── Social VU meters ─────────────────────────────────────────────── */}
      <div className="px-2 pt-4 pb-2 space-y-4 border-t border-white/5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-300">Social Reach</p>
          <div className="flex items-center gap-3">
            {userId && !spotifyData?.connected && (
              <a href={`/api/spotify/connect?userId=${userId}`} className="flex items-center gap-1 text-[10px] text-[#1DB954]/80 hover:text-[#1DB954] transition">
                <SiSpotify className="h-3 w-3" /> Connect Spotify
              </a>
            )}
            {spotifyData?.connected && (
              <span className="flex items-center gap-1 text-[10px] text-[#1DB954]/70">
                <SiSpotify className="h-3 w-3" /> {spotifyData.displayName ?? "✓"}
              </span>
            )}
            {userId && !youtubeData?.connected && (
              <a href={`/api/youtube/connect?userId=${userId}`} className="flex items-center gap-1 text-[10px] text-[#FF0000]/80 hover:text-[#FF0000] transition">
                <SiYoutube className="h-3 w-3" /> Connect YouTube
              </a>
            )}
            {youtubeData?.connected && (
              <span className="flex items-center gap-1 text-[10px] text-[#FF0000]/70">
                <SiYoutube className="h-3 w-3" /> {youtubeData.channelTitle ?? "✓"} ✓
              </span>
            )}
          </div>
        </div>
        <div className="flex items-end justify-around px-2">
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
        {(spotifyData?.connected || youtubeData) ? (
          <p className="text-center text-[10px] text-zinc-500">
            {spotifyData?.connected && <><span className="text-[#1DB954]">Spotify {spotifyFollowers.toLocaleString()}</span>{" "}</>}
            {youtubeData && <><span className="text-[#FF0000]">· YT {youtubeSubscribers.toLocaleString()} subs</span></>}
          </p>
        ) : (
          <p className="text-center text-[10px] text-zinc-500">
            Connect Instagram &amp; Spotify to see live stats
          </p>
        )}
      </div>

      {/* ── Activity ─────────────────────────────────────────────────────── */}
      {activity.length > 0 && (
        <div className="px-2 pt-4 pb-2 space-y-3 border-t border-white/5">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-300">Activity</p>
          <div className="space-y-3">
            {activity.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: item.dot }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white leading-snug">{item.label}</p>
                  {item.sub && <p className="text-xs text-zinc-300 truncate">{item.sub}</p>}
                </div>
                <span className="text-xs text-zinc-400 shrink-0">{timeAgo(item.ts)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty hint ────────────────────────────────────────────────────── */}
      {projects.length === 0 && quotes.length === 0 && (
        <p className="text-center text-xs text-zinc-700 pb-2">
          Add projects & quotes to bring the dashboard to life
        </p>
      )}

    </div>
  );
}
