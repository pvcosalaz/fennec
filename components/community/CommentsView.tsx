"use client";
import { useEffect, useState, useRef } from "react";
import { ArrowLeft, SmilePlus, Send } from "lucide-react";
import { fetchComments, createComment, toggleVibe } from "@/lib/communityDb";
import type { Post, Comment, Profile } from "@/lib/communityTypes";
import PostCard from "./PostCard";
import GifPicker from "./GifPicker";

type Props = {
  post: Post;
  profile: Profile;
  onBack: () => void;
  onOpenProfile: (userId: string) => void;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60)  return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24)     return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const AVATAR_COLORS = ["#6366f1","#f59e0b","#10b981","#ef4444","#8b5cf6","#3b82f6","#ec4899"];
function avatarColor(username: string) {
  let hash = 0;
  for (const c of username) hash = (hash * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function CommentsView({ post, profile, onBack, onOpenProfile }: Props) {
  const [comments, setComments]     = useState<Comment[]>([]);
  const [loading, setLoading]       = useState(true);
  const [text, setText]             = useState("");
  const [gifUrl, setGifUrl]         = useState<string | null>(null);
  const [showGif, setShowGif]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchComments(post.id, profile.id)
      .then(setComments)
      .finally(() => setLoading(false));
  }, [post.id, profile.id]);

  async function handleSend() {
    if (!text.trim() && !gifUrl) return;
    setSubmitting(true);
    try {
      const comment = await createComment(post.id, profile.id, text.trim(), gifUrl ?? undefined);
      setComments((prev) => [...prev, comment]);
      setText("");
      setGifUrl(null);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVibeComment(comment: Comment) {
    await toggleVibe(comment.id, profile.id, comment.user_vibed);
    setComments((prev) =>
      prev.map((c) =>
        c.id === comment.id
          ? { ...c, user_vibed: !c.user_vibed, vibe_count: c.vibe_count + (c.user_vibed ? -1 : 1) }
          : c
      )
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-white/8">
        <button onClick={onBack} className="text-zinc-400 hover:text-white transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-white">Thread</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        <PostCard post={post} currentProfile={profile} onOpenThread={() => {}} onLoop={() => {}} onOpenProfile={onOpenProfile} />

        {!loading && (
          <p className="text-xs text-zinc-600 px-1">
            {comments.length === 0
              ? "Sin comentarios todavía"
              : `${comments.length} comentario${comments.length !== 1 ? "s" : ""}`}
          </p>
        )}

        {loading && [...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 rounded bg-white/10" />
              <div className="h-3 w-full rounded bg-white/5" />
            </div>
          </div>
        ))}

        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ backgroundColor: avatarColor(comment.profile.username) }}
            >
              {comment.profile.avatar_url
                ? <img src={comment.profile.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
                : comment.profile.username[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-zinc-300">@{comment.profile.username}</span>
                <span className="text-[10px] text-zinc-600">{timeAgo(comment.created_at)}</span>
              </div>
              {comment.content && (
                <p className="text-sm text-zinc-400 leading-relaxed">{comment.content}</p>
              )}
              {comment.gif_url && (
                <img src={comment.gif_url} alt="" className="mt-1.5 max-h-32 rounded-xl" />
              )}
              <button
                onClick={() => handleVibeComment(comment)}
                className={`mt-1.5 flex items-center gap-1 text-[11px] transition ${
                  comment.user_vibed ? "text-amber-500" : "text-zinc-600 hover:text-zinc-400"
                }`}
              >
                <span>🎵</span>
                {comment.vibe_count > 0 && <span>{comment.vibe_count}</span>}
              </button>
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      <div className="border-t border-white/8 px-3 py-3 space-y-2">
        {gifUrl && (
          <div className="relative inline-block">
            <img src={gifUrl} alt="" className="h-16 rounded-xl" />
            <button
              onClick={() => setGifUrl(null)}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black border border-white/20 flex items-center justify-center text-[10px] text-white"
            >✕</button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ backgroundColor: avatarColor(profile.username) }}
          >
            {profile.username[0]?.toUpperCase()}
          </div>
          <div className="flex-1 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Escribe un comentario..."
              className="flex-1 text-sm text-white placeholder:text-zinc-600 bg-transparent outline-none"
            />
            <button onClick={() => setShowGif(true)}>
              <SmilePlus className="h-4 w-4 text-zinc-500 hover:text-zinc-300 transition" />
            </button>
          </div>
          <button
            onClick={handleSend}
            disabled={(!text.trim() && !gifUrl) || submitting}
            className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center disabled:opacity-40 hover:bg-amber-400 transition"
          >
            <Send className="h-4 w-4 text-black" />
          </button>
        </div>
      </div>

      {showGif && (
        <GifPicker
          onSelect={(url) => setGifUrl(url)}
          onClose={() => setShowGif(false)}
        />
      )}
    </div>
  );
}
