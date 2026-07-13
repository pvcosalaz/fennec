"use client";

import { useEffect, useState } from "react";
import {
  Rss,
  ArrowUpRight,
  ChevronLeft,
  Globe,
} from "lucide-react";
import type { NewsItem } from "@/app/api/news/route";
import type { Profile, Post } from "@/lib/communityTypes";
import FeedView from "./FeedView";
import CommentsView from "./CommentsView";
import UserProfilePage from "./UserProfilePage";
import { useIsDesktop } from "@/lib/useIsDesktop";

// ─── Types ────────────────────────────────────────────────────────────────────

type FennecTab = "news" | "community";
type CommunityView = "feed" | "thread" | "profile";

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
          <p className="text-[10px] font-semibold text-zinc-600">Your brand here?</p>
          <p className="text-[9px] text-zinc-700">Advertise on Fennec</p>
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

// ─── Community panel (feed — auth already handled at app level) ───────────────

function CommunityPanel({ profile, openComposerWith, onComposerConsumed }: { profile: Profile; openComposerWith?: { url: string; name: string } | null; onComposerConsumed?: () => void }) {
  const [view, setView]                   = useState<CommunityView>("feed");
  const [activePost, setActivePost]       = useState<Post | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  function openProfile(userId: string) {
    setProfileUserId(userId);
    setView("profile");
  }

  if (view === "profile" && profileUserId) {
    return (
      <UserProfilePage
        userId={profileUserId}
        currentProfile={profile}
        onBack={() => { setProfileUserId(null); setView("feed"); }}
        onOpenThread={(post) => { setActivePost(post); setView("thread"); }}
        onOpenProfile={openProfile}
      />
    );
  }

  if (view === "thread" && activePost) {
    return (
      <CommentsView
        post={activePost}
        profile={profile}
        onBack={() => { setActivePost(null); setView("feed"); }}
        onOpenProfile={openProfile}
      />
    );
  }

  return (
    <FeedView
      profile={profile}
      onOpenThread={(post) => { setActivePost(post); setView("thread"); }}
      onOpenProfile={openProfile}
      openComposerWith={openComposerWith}
      onComposerConsumed={onComposerConsumed}
    />
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function Community({ profile, openComposerWith, onComposerConsumed }: { profile: Profile; openComposerWith?: { url: string; name: string } | null; onComposerConsumed?: () => void }) {
  const isDesktop = useIsDesktop();
  const [fennecTab, setFennecTab] = useState<FennecTab>("community");
  const [selected, setSelected] = useState<NewsItem | null>(null);

  // Article reader — full screen within the module
  if (selected) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4">
        <ArticleReader item={selected} onBack={() => setSelected(null)} />
      </div>
    );
  }

  // ── Desktop: no tab switcher — feed and news live side by side, the
  // width finally earns its keep. Same panels, same data; the mobile
  // X-style header/tabs stay untouched below 1024px. ──
  if (isDesktop) {
    return (
      <div className="grid items-start gap-10" style={{ gridTemplateColumns: "minmax(0,1.5fr) minmax(300px,1fr)" }}>
        {/* feed — the main column */}
        <div>
          <div className="mb-4 flex items-center gap-2.5">
            <span className="text-[8.5px] font-bold uppercase tracking-[0.22em] text-zinc-600">Community</span>
            <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, rgba(255,255,255,.07), transparent)" }} />
          </div>
          <CommunityPanel profile={profile} openComposerWith={openComposerWith} onComposerConsumed={onComposerConsumed} />
        </div>

        {/* industry news — pinned to the viewport (sticky) with its own
            scroll region, so it and the feed scroll fully independently:
            scrolling over the feed never moves news and vice versa. The
            top offset matches DesktopShell's py-6 so it sits exactly
            where it already rests before any scrolling happens. */}
        <aside
          className="overflow-y-auto border-l border-white/[0.05] pl-8"
          style={{ position: "sticky", top: 24, maxHeight: "calc(100vh - 48px)" }}
        >
          <NewsPanel onSelect={setSelected} />
        </aside>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl">

      {/* SVG filter — thicken logo strokes */}
      <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
        <defs>
          <filter id="fennec-thicken-community" x="-10%" y="-10%" width="120%" height="120%">
            <feMorphology operator="dilate" radius="0.7" />
          </filter>
        </defs>
      </svg>

      {/* ── Header — X-style ─────────────────────────────── */}
      <div className="flex flex-col items-center pt-4 pb-0">
        <img
          src="/fennec-logo.png"
          alt="Fennec"
          style={{
            width: 72,
            height: "auto",
            filter: "url(#fennec-thicken-community) brightness(0) invert(1)",
            opacity: 0.9,
          }}
        />
      </div>

      {/* ── Tab switcher — X-style ────────────────────────── */}
      <div className="flex border-b border-white/10 mt-1">
        <button
          onClick={() => setFennecTab("community")}
          className={`flex flex-1 items-center justify-center py-3.5 text-sm font-semibold transition-all relative ${
            fennecTab === "community" ? "text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
          }`}
        >
          Feed
          {fennecTab === "community" && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[3px] rounded-full bg-accent shadow-[0_0_10px_rgba(245,166,35,0.55)]" />
          )}
        </button>

        <button
          onClick={() => setFennecTab("news")}
          className={`flex flex-1 items-center justify-center py-3.5 text-sm font-semibold transition-all relative ${
            fennecTab === "news" ? "text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
          }`}
        >
          News
          {fennecTab === "news" && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[3px] rounded-full bg-accent shadow-[0_0_10px_rgba(245,166,35,0.55)]" />
          )}
        </button>
      </div>

      {/* ── Panels ───────────────────────────────────────── */}
      <div className="px-4 pt-4">
        {fennecTab === "news"      && <NewsPanel onSelect={setSelected} />}
        {fennecTab === "community" && <CommunityPanel profile={profile} openComposerWith={openComposerWith} onComposerConsumed={onComposerConsumed} />}
      </div>

    </div>
  );
}
