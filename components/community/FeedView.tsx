"use client";
import { useState, useEffect, useCallback } from "react";
import { Pencil } from "lucide-react";
import { fetchPosts, createPost } from "@/lib/communityDb";
import type { Post, Profile, PostCategory } from "@/lib/communityTypes";
import { CATEGORIES } from "@/lib/communityTypes";
import PostCard from "./PostCard";
import ComposerSheet from "./ComposerSheet";

type Props = {
  profile: Profile;
  onOpenThread: (post: Post) => void;
  onOpenProfile: (userId: string) => void;
};

export default function FeedView({ profile, onOpenThread, onOpenProfile }: Props) {
  const [category, setCategory]         = useState<PostCategory | null>(null);
  const [posts, setPosts]               = useState<Post[]>([]);
  const [page, setPage]                 = useState(0);
  const [loading, setLoading]           = useState(true);
  const [hasMore, setHasMore]           = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);

  const loadPosts = useCallback(async (cat: PostCategory | null, p: number, reset: boolean) => {
    setLoading(true);
    try {
      const data = await fetchPosts(cat, p, profile.id);
      setPosts((prev) => reset ? data : [...prev, ...data]);
      setHasMore(data.length === 20);
    } finally {
      setLoading(false);
    }
  }, [profile.id]);

  useEffect(() => {
    setPage(0);
    loadPosts(category, 0, true);
  }, [category, loadPosts]);

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
    <div className="mx-auto w-full max-w-4xl space-y-4 px-2 pb-24">

      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <p className="text-xs font-semibold tracking-[0.35em] text-amber-500 uppercase">Community</p>
          <h1 className="text-2xl font-bold text-white">Feed</h1>
        </div>
        <button
          onClick={() => setComposerOpen(true)}
          className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center hover:bg-amber-400 transition"
        >
          <Pencil className="h-4 w-4 text-black" />
        </button>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        <button
          onClick={() => setCategory(null)}
          className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition ${
            category === null ? "bg-amber-500 text-black" : "bg-white/5 text-zinc-400 hover:text-white"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition ${
              category === cat.id ? "bg-amber-500 text-black" : "bg-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            <span>{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Posts */}
      <div className="space-y-3">
        {loading && posts.length === 0 && (
          [...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/8 bg-white/[0.03] h-40 animate-pulse" />
          ))
        )}

        {!loading && posts.length === 0 && (
          <div className="text-center py-16 text-zinc-600 text-sm">
            No hay posts todavía. ¡Sé el primero! ✍️
          </div>
        )}

        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentProfile={profile}
            onOpenThread={onOpenThread}
            onLoop={handleLoop}
            onOpenProfile={onOpenProfile}
          />
        ))}

        {hasMore && posts.length > 0 && (
          <button
            onClick={() => {
              const next = page + 1;
              setPage(next);
              loadPosts(category, next, false);
            }}
            className="w-full py-3 text-xs text-zinc-600 hover:text-zinc-400 transition"
          >
            {loading ? "Cargando..." : "Ver más"}
          </button>
        )}
      </div>

      {/* Composer */}
      {composerOpen && (
        <ComposerSheet
          profile={profile}
          onClose={() => setComposerOpen(false)}
          onPostCreated={handlePostCreated}
        />
      )}
    </div>
  );
}
