"use client";

import { useEffect, useState } from "react";
import {
  Rss,
  MessageCircle,
  ArrowUpRight,
  ChevronLeft,
  Globe,
} from "lucide-react";
import type { NewsItem } from "@/app/api/news/route";
import { supabase } from "@/lib/supabase";
import { getProfile, updateDbScore } from "@/lib/communityDb";
import type { Profile, Post } from "@/lib/communityTypes";
import AuthGate from "./AuthGate";
import UsernameSetup from "./UsernameSetup";
import FeedView from "./FeedView";
import CommentsView from "./CommentsView";

// ─── Types ────────────────────────────────────────────────────────────────────

type FennecTab = "news" | "community";
type CommunityView = "feed" | "thread";

// ─── Category gradient fallback ───────────────────────────────────────────────

function categoryGradient(category: string): string {
  switch (category) {
    case "AI":      return "from-amber-950 via-amber-900/40 to-zinc-900";
    case "Plugins": return "from-purple-950 via-purple-900/40 to-zinc-900";
    case "Sync":    return "from-emerald-950 via-emerald-900/40 to-zinc-900";
    default:        return "from-blue-950 via-blue-900/40 to-zinc-900";
  }
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="h-4 w-14 rounded-full bg-white/10" />
        <div className="h-3 w-32 rounded-full bg-white/5" />
      </div>
      <div className="h-4 w-full rounded-lg bg-white/10" />
      <div className="h-3 w-3/4 rounded-lg bg-white/5" />
    </div>
  );
}

// ─── Article reader ───────────────────────────────────────────────────────────

function ArticleReader({ item, onBack }: { item: NewsItem; onBack: () => void }) {
  const [imgError, setImgError] = useState(false);
  const showImage = item.image && !imgError;

  return (
    <div className="space-y-0 pb-6">
      {/* Hero */}
      <div className={`relative h-52 rounded-2xl overflow-hidden mb-5 bg-gradient-to-br ${categoryGradient(item.category)}`}>
        {showImage && (
          <img
            src={item.image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <button
          onClick={onBack}
          className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-black/70"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <div className="absolute bottom-3 left-3">
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm ${item.categoryStyle}`}>
            {item.category}
          </span>
        </div>
      </div>

      <p className="text-xs text-zinc-500 mb-2">{item.source} · {item.time}</p>
      <h2 className="text-xl font-bold leading-snug text-white mb-4">{item.headline}</h2>
      <div className="h-px bg-white/10 mb-4" />
      <p className="text-sm leading-7 text-zinc-300 whitespace-pre-line">
        {item.content}{item.content.length >= 1200 ? "…" : ""}
      </p>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
      >
        <Globe className="h-4 w-4" />
        Read full article on {item.source}
        <ArrowUpRight className="h-3.5 w-3.5 text-zinc-500" />
      </a>
    </div>
  );
}

// ─── Sponsors data (replace with real sponsors when available) ────────────────

const SPONSORS = [
  { name: "Splice",       tagline: "Samples & Plugins",    color: "from-blue-500/20 to-blue-600/10",    border: "border-blue-500/20" },
  { name: "Native Instr.", tagline: "Synths & FX",          color: "from-red-500/20 to-red-600/10",      border: "border-red-500/20" },
  { name: "Plugin Bout.", tagline: "Plugin Deals",          color: "from-green-500/20 to-green-600/10",  border: "border-green-500/20" },
  { name: "Bandlab",      tagline: "Music Creation",        color: "from-purple-500/20 to-purple-600/10", border: "border-purple-500/20" },
];

function SponsorsRow() {
  return (
    <div className="space-y-2">
      {/* Label */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
          Sponsors
        </span>
        <span className="text-[10px] text-zinc-700">Your brand here →</span>
      </div>

      {/* Horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" style={{ scrollbarWidth: "none" }}>
        {SPONSORS.map((s) => (
          <div
            key={s.name}
            className={`shrink-0 flex flex-col justify-between rounded-2xl border bg-gradient-to-br p-3 ${s.color} ${s.border}`}
            style={{ width: 110, height: 72 }}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              Ad
            </span>
            <div>
              <p className="text-xs font-bold text-white leading-tight">{s.name}</p>
              <p className="text-[10px] text-zinc-500 leading-tight">{s.tagline}</p>
            </div>
          </div>
        ))}

        {/* "Advertise here" slot */}
        <div
          className="shrink-0 flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] text-center"
          style={{ width: 110, height: 72 }}
        >
          <p className="text-[10px] font-semibold text-zinc-600">¿Tu marca aquí?</p>
          <p className="text-[9px] text-zinc-700">Anúnciate en Fennec</p>
        </div>
      </div>
    </div>
  );
}

// ─── News panel ───────────────────────────────────────────────────────────────

function NewsPanel({ onSelect }: { onSelect: (item: NewsItem) => void }) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/news", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: NewsItem[]) => { setNews(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  return (
    <div className="space-y-4">

      {/* Sponsors — hidden until real sponsors are onboarded */}
      {/* <SponsorsRow /> */}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rss className="h-4 w-4 text-accent" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Industry News
          </h2>
        </div>
        {!loading && !error && (
          <span className="text-xs text-zinc-600">Updated hourly</span>
        )}
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-6 text-center">
          <p className="text-sm text-zinc-500">Couldn&apos;t load news right now. Try again later.</p>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-2">
          {news.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className="group w-full text-left flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20 hover:bg-white/[0.08]"
            >
              {item.image && (
                <div className="shrink-0 h-14 w-14 rounded-xl overflow-hidden bg-white/5">
                  <img
                    src={item.image}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.categoryStyle}`}>
                    {item.category}
                  </span>
                  <span className="text-xs text-zinc-600">{item.source} · {item.time}</span>
                </div>
                <p className="text-sm font-semibold leading-snug text-white">{item.headline}</p>
                {item.summary && (
                  <p className="line-clamp-2 text-xs leading-relaxed text-zinc-500">{item.summary}</p>
                )}
              </div>
              <ChevronLeft className="mt-0.5 h-4 w-4 shrink-0 rotate-180 text-zinc-700 transition group-hover:text-accent" />
            </button>
          ))}
        </div>
      )}

      <p className="pt-2 text-center text-xs text-zinc-700">
        Music Business Worldwide · MusicTech · Hypebot · Sound On Sound
      </p>
    </div>
  );
}

// ─── Community panel (authenticated feed) ─────────────────────────────────────

function CommunityPanel() {
  const [authUser, setAuthUser]       = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile]         = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView]               = useState<CommunityView>("feed");
  const [activePost, setActivePost]   = useState<Post | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      setAuthUser(user ? { id: user.id, email: user.email } : null);
      if (user) loadProfile(user.id);
      else setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setAuthUser(user ? { id: user.id, email: user.email } : null);
      if (user) loadProfile(user.id);
      else { setProfile(null); setAuthLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    const p = await getProfile(userId);
    setProfile(p);
    setAuthLoading(false);
    if (p) {
      const localScore = Number(localStorage.getItem("fennec-db-score") ?? 0);
      if (localScore !== p.fennec_db_score) updateDbScore(userId, localScore);
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="h-6 w-6 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!authUser) return <AuthGate />;
  if (!profile)  return <UsernameSetup userId={authUser.id} avatarUrl={null} onComplete={setProfile} />;

  if (view === "thread" && activePost) {
    return (
      <CommentsView
        post={activePost}
        profile={profile}
        onBack={() => { setActivePost(null); setView("feed"); }}
      />
    );
  }

  return (
    <FeedView
      profile={profile}
      onOpenThread={(post) => { setActivePost(post); setView("thread"); }}
    />
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function Community() {
  const [fennecTab, setFennecTab] = useState<FennecTab>("community");
  const [selected, setSelected] = useState<NewsItem | null>(null);

  // Article reader — full screen within the module
  if (selected) {
    return (
      <div className="mx-auto w-full max-w-4xl px-2">
        <ArticleReader item={selected} onBack={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-2">

      {/* Header */}
      <div className="flex items-center gap-4">
        <img
          src="/fennec-logo.png"
          alt="Fennec"
          style={{ width: 80, height: "auto", filter: "invert(1)", opacity: 0.9 }}
          className="shrink-0"
        />
        <div className="space-y-0.5">
          <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">
            Fennec
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Stay in the loop.
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Industry news and community for music producers.
          </p>
        </div>
      </div>

      {/* ── Tab switcher ──────────────────────────────────── */}
      <div className="flex rounded-2xl bg-white/5 border border-white/10 p-1 gap-1">
        {/* Fennec Community — left */}
        <button
          onClick={() => setFennecTab("community")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
            fennecTab === "community"
              ? "bg-white/10 text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          <span>
            <span className={fennecTab === "community" ? "text-accent" : ""}>Fennec</span>
            {" Community"}
          </span>
        </button>

        {/* News — right */}
        <button
          onClick={() => setFennecTab("news")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
            fennecTab === "news"
              ? "bg-white/10 text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Rss className="h-3.5 w-3.5" />
          News
        </button>
      </div>

      {/* ── Panels ───────────────────────────────────────── */}
      {fennecTab === "news"      && <NewsPanel onSelect={setSelected} />}
      {fennecTab === "community" && <CommunityPanel />}

    </div>
  );
}
