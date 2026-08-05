"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Users } from "lucide-react";
import { fetchPosts, createPost } from "@/lib/communityDb";
import type { Post, Profile, PostCategory } from "@/lib/communityTypes";
import { CATEGORIES } from "@/lib/communityTypes";
import PostCard from "./PostCard";
import ComposerSheet from "./ComposerSheet";

type Props = {
  profile: Profile;
  onOpenThread: (post: Post) => void;
  onOpenProfile: (userId: string) => void;
  openComposerWith?: { url: string; name: string } | null;
  onComposerConsumed?: () => void;
};

const AVATAR_COLORS = ["#6366f1","#f59e0b","#10b981","#ef4444","#8b5cf6","#3b82f6","#ec4899"];
function avatarColor(username: string) {
  let hash = 0;
  for (const c of username) hash = (hash * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// Per-category accent for the filter chips — mirrors PostCard's palette
const CHIP_COLORS: Record<string, string> = {
  music:    "#f5a623",
  gear:     "#a78bfa",
  sync:     "#34d399",
  business: "#60a5fa",
  mindset:  "#f472b6",
  general:  "#a1a1aa",
};

export default function FeedView({ profile, onOpenThread, onOpenProfile, openComposerWith, onComposerConsumed }: Props) {
  const [category, setCategory]         = useState<PostCategory | null>(null);
  const [posts, setPosts]               = useState<Post[]>([]);
  const [page, setPage]                 = useState(0);
  const [loading, setLoading]           = useState(true);
  const [hasMore, setHasMore]           = useState(true);
  const [composerOpen, setComposerOpen] = useState(!!openComposerWith);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [pullY, setPullY]               = useState(0);
  const [refreshing, setRefreshing]     = useState(false);
  const [newCount, setNewCount]         = useState(0);
  const consumedRef  = useRef(false);
  const touchStartY  = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const newestIdRef  = useRef<string | null>(null);

  // Notify parent that we consumed the pending audio (clear it so it won't re-open)
  useEffect(() => {
    if (openComposerWith && !consumedRef.current) {
      consumedRef.current = true;
      onComposerConsumed?.();
    }
  }, [openComposerWith, onComposerConsumed]);

  const loadPosts = useCallback(async (cat: PostCategory | null, p: number, reset: boolean) => {
    setLoading(true);
    try {
      const data = await fetchPosts(cat, p, profile.id);
      if (reset && data[0]) newestIdRef.current = data[0].id;
      setPosts((prev) => reset ? data : [...prev, ...data]);
      setHasMore(data.length === 20);
    } finally {
      setLoading(false);
    }
  }, [profile.id]);

  useEffect(() => {
    setPage(0);
    setNewCount(0);
    loadPosts(category, 0, true);
  }, [category, loadPosts]);

  // ── Poll for new posts every 60s ───────────────────────────
  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await fetchPosts(category, 0, profile.id).catch(() => [] as Post[]);
      if (!data.length) return;
      const latestId = data[0].id;
      if (newestIdRef.current && latestId !== newestIdRef.current) {
        // Count how many posts are newer than what we have
        const count = data.findIndex((p) => p.id === newestIdRef.current);
        setNewCount(count === -1 ? data.length : count);
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [category]);

  // ── Pull-to-refresh ────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      touchStartY.current = e.touches[0].clientY;
    }

    function onTouchMove(e: TouchEvent) {
      const scrollTop = el?.scrollTop ?? 0;
      if (scrollTop > 0) return;
      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta > 0) setPullY(Math.min(delta * 0.4, 72));
    }

    function onTouchEnd() {
      if (pullY >= 60 && !refreshing) {
        setRefreshing(true);
        setPullY(0);
        loadPosts(category, 0, true).finally(() => setRefreshing(false));
      } else {
        setPullY(0);
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove",  onTouchMove,  { passive: true });
    el.addEventListener("touchend",   onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove",  onTouchMove);
      el.removeEventListener("touchend",   onTouchEnd);
    };
  }, [pullY, refreshing, category, loadPosts]);

  async function handleLoadNew() {
    setNewCount(0);
    await loadPosts(category, 0, true);
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleLoop(post: Post) {
    await createPost({
      userId:   profile.id,
      content:  post.content,
      category: post.category,
      repostOf: post.id,
    });
    loadPosts(category, 0, true);
  }

  function handlePostCreated(post: Post) {
    setPosts((prev) => [post, ...prev]);
    setComposerOpen(false);
  }

  return (
    <div ref={containerRef} className="mx-auto w-full max-w-4xl space-y-4 px-4 pb-24 overflow-y-auto">

      {/* Pull-to-refresh indicator */}
      {(pullY > 0 || refreshing) && (
        <div
          className="flex items-center justify-center transition-all"
          style={{ height: refreshing ? 40 : pullY, overflow: "hidden" }}
        >
          <svg
            className={`h-5 w-5 text-amber-500 ${refreshing ? "animate-spin" : ""}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          >
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-accent" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Fennec Community
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {/* My profile */}
          <button
            onClick={() => onOpenProfile(profile.id)}
            className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/10 hover:border-amber-500 transition shrink-0"
            style={{ backgroundColor: avatarColor(profile.username) }}
          >
            {profile.avatar_url
              ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
              : <span className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                  {profile.username[0]?.toUpperCase()}
                </span>}
          </button>
          {/* Compose */}
          <button
            /* Se guarda el rectangulo del boton para que el compositor pueda
               crecer DESDE aqui en escritorio, en vez de subir desde el borde
               inferior de la pantalla (Paco 2026-08-04). */
            onClick={(e) => { setAnchor(e.currentTarget.getBoundingClientRect()); setComposerOpen(true); }}
            className="w-10 h-10 rounded-2xl bg-accent flex items-center justify-center hover:bg-amber-400 active:scale-90 transition shadow-[0_0_16px_rgba(245,166,35,0.35)]"
            aria-label="New post"
          >
            <Plus className="h-5 w-5 text-black" />
          </button>
        </div>
      </div>

      {/* Category chips — colored dot per category, no emojis */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        <button
          onClick={() => setCategory(null)}
          className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition border ${
            category === null
              ? "bg-accent text-black border-accent shadow-[0_0_12px_rgba(245,166,35,0.35)]"
              : "bg-white/[0.04] text-zinc-400 border-transparent hover:text-white"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => {
          const c = CHIP_COLORS[cat.id] ?? "#a1a1aa";
          const active = category === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className="shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition border"
              style={active
                ? { color: c, borderColor: `${c}59`, background: `${c}1a`, boxShadow: `0 0 12px ${c}26` }
                : { color: "#a1a1aa", borderColor: "transparent", background: "rgba(255,255,255,0.04)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: c, boxShadow: active ? `0 0 5px ${c}` : "none", opacity: active ? 1 : 0.55 }} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* New posts banner */}
      {newCount > 0 && (
        <button
          onClick={handleLoadNew}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition animate-pulse"
        >
          {newCount} new post{newCount > 1 ? "s" : ""} — tap to load
        </button>
      )}

      {/* Posts */}
      <div className="space-y-3">
        {loading && posts.length === 0 && (
          [...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/8 bg-white/[0.03] h-40 animate-pulse" />
          ))
        )}

        {!loading && posts.length === 0 && (
          <div className="text-center py-16 text-zinc-600 text-sm">
            No posts yet — be the first to drop something.
          </div>
        )}

        {posts.map((post) => {
          // Always show the live score for the current user's own posts
          const livePost = post.user_id === profile.id
            ? { ...post, profile: { ...post.profile, fennec_db_score: profile.fennec_db_score } }
            : post;
          return (
          <PostCard
            key={post.id}
            post={livePost}
            currentProfile={profile}
            onOpenThread={onOpenThread}
            onLoop={handleLoop}
            onOpenProfile={onOpenProfile}
            onDelete={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
          />
          );
        })}

        {hasMore && posts.length > 0 && (
          <button
            onClick={() => {
              const next = page + 1;
              setPage(next);
              loadPosts(category, next, false);
            }}
            className="w-full py-3 text-xs text-zinc-600 hover:text-zinc-400 transition"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        )}
      </div>

      {/* Composer */}
      {composerOpen && (
        <ComposerSheet
          anchor={anchor}
          profile={profile}
          onClose={() => setComposerOpen(false)}
          onPostCreated={handlePostCreated}
          initialMediaUrl={openComposerWith?.url}
          initialMediaType={openComposerWith ? "audio" : undefined}
          initialMediaName={openComposerWith?.name}
        />
      )}
    </div>
  );
}
