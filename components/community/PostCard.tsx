"use client";
import { useState } from "react";
import { MessageCircle, Repeat2, Bookmark, BookmarkCheck, Trash2, MoreHorizontal } from "lucide-react";
import { toggleVibe, toggleBookmark, deletePost } from "@/lib/communityDb";
import type { Post, Profile } from "@/lib/communityTypes";
import ProBadge from "./ProBadge";
import WaveformDivider from "./WaveformDivider";
import AudioPlayerInline from "./AudioPlayerInline";
import VideoEmbed from "./VideoEmbed";

type Props = {
  post: Post;
  currentProfile: Profile | null;
  onOpenThread: (post: Post) => void;
  onLoop: (post: Post) => void;
  onOpenProfile: (userId: string) => void;
  onDelete?: (postId: string) => void;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60)   return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24)  return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function avatarInitial(p: Profile) {
  return (p.username[0] ?? "?").toUpperCase();
}

const AVATAR_COLORS = ["#6366f1","#f59e0b","#10b981","#ef4444","#8b5cf6","#3b82f6","#ec4899"];
function avatarColor(username: string) {
  let hash = 0;
  for (const c of username) hash = (hash * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// Per-category accent — colored dot + label, no emojis
const CATEGORY_META: Record<string, { label: string; color: string }> = {
  music:    { label: "Music",          color: "#f5a623" },
  gear:     { label: "Gear & Tools",   color: "#a78bfa" },
  sync:     { label: "Sync & Scoring", color: "#34d399" },
  business: { label: "Business",       color: "#60a5fa" },
  mindset:  { label: "Mindset",        color: "#f472b6" },
  general:  { label: "General",        color: "#a1a1aa" },
};

// Animated EQ icon — the "vibe" action, audio-native instead of a heart
function VibeIcon({ active }: { active: boolean }) {
  return (
    <span className="flex items-end gap-[2px] h-[14px]" aria-hidden>
      <style>{`
        @keyframes vibeBar1 { from { height: 5px; } to { height: 13px; } }
        @keyframes vibeBar2 { from { height: 12px; } to { height: 6px; } }
        @keyframes vibeBar3 { from { height: 7px; } to { height: 11px; } }
      `}</style>
      {[
        { h: 8,  anim: "vibeBar1", dur: "0.55s" },
        { h: 13, anim: "vibeBar2", dur: "0.7s"  },
        { h: 6,  anim: "vibeBar3", dur: "0.6s"  },
      ].map((b, i) => (
        <span key={i} className="w-[3px] rounded-full"
          style={{
            height: b.h,
            background: active ? "#f5a623" : "currentColor",
            boxShadow: active ? "0 0 6px rgba(245,166,35,0.6)" : "none",
            animation: active ? `${b.anim} ${b.dur} ease-in-out infinite alternate` : "none",
          }} />
      ))}
    </span>
  );
}

export default function PostCard({ post, currentProfile, onOpenThread, onLoop, onOpenProfile, onDelete }: Props) {
  const [vibed, setVibed]           = useState(post.user_vibed);
  const [vibeCount, setVibeCount]   = useState(post.vibe_count);
  const [bookmarked, setBookmarked] = useState(post.user_bookmarked);
  const [menuOpen, setMenuOpen]     = useState(false);

  const isOwner = currentProfile?.id === post.user_id;

  async function handleDelete() {
    if (!confirm("Delete this post?")) return;
    try {
      await deletePost(post.id);
      onDelete?.(post.id);
    } catch (err) {
      console.error(err);
      alert("Error al borrar. Intenta de nuevo.");
    }
  }

  const hasAudio = post.media_type === "audio";
  const hasImage = post.media_type === "image";
  const hasGif   = post.media_type === "gif";
  const hasVideo = post.media_type === "video-embed";

  async function handleVibe() {
    if (!currentProfile) return;
    const next = !vibed;
    setVibed(next);
    setVibeCount((c) => c + (next ? 1 : -1));
    await toggleVibe(post.id, currentProfile.id, vibed);
  }

  async function handleBookmark() {
    if (!currentProfile) return;
    const next = !bookmarked;
    setBookmarked(next);
    await toggleBookmark(post.id, currentProfile.id, bookmarked);
  }

  const p = post.profile;

  const cat = CATEGORY_META[post.category] ?? CATEGORY_META.general;

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] overflow-hidden transition-colors hover:border-white/[0.13]">

      {/* Top row: category · user info · time + menu */}
      <div className="flex items-center px-4 pt-3 pb-2">
        {/* Left: category chip — flex-1 so center stays truly centered */}
        <div className="flex-1">
          <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] px-2.5 py-1 rounded-full border"
            style={{ color: `${cat.color}cc`, borderColor: `${cat.color}26`, background: `${cat.color}0d` }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: cat.color, boxShadow: `0 0 5px ${cat.color}99` }} />
            {cat.label}
          </span>
        </div>

        {/* Center: user info */}
        <button
          onClick={() => onOpenProfile(post.user_id)}
          className="flex items-center gap-1.5 hover:opacity-80 transition"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 overflow-hidden"
            style={{
              backgroundColor: p.is_bot ? "#000000" : avatarColor(p.username),
              boxShadow: p.is_pro && !p.is_bot ? "0 0 0 1.5px rgba(245,166,35,0.55), 0 0 8px rgba(245,166,35,0.25)" : "none",
            }}
          >
            {p.username === "fennec"
              ? <img src="/fennec-icon-transparent.png" className="w-full h-full rounded-full object-cover" alt="Fennec" />
              : p.avatar_url
                ? <img src={p.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
                : avatarInitial(p)}
          </div>
          <span className={`text-xs font-semibold ${p.is_pro ? "text-amber-400" : "text-zinc-300"}`}>@{p.username}</span>
          {p.is_pro && !p.is_bot && p.username !== currentProfile?.username && <ProBadge />}
          <span className="text-[10px] tabular-nums text-zinc-600 shrink-0">{p.fennec_db_score} dB</span>
        </button>

        {/* Right: time + owner menu — flex-1 so it mirrors the left */}
        <div className="flex-1 flex items-center justify-end gap-2">
          <span className="text-[10px] text-zinc-600">{timeAgo(post.created_at)}</span>
          {isOwner && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="text-zinc-600 hover:text-zinc-400 transition"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-6 z-20 rounded-xl border border-white/10 bg-zinc-900 shadow-xl overflow-hidden">
                    <button
                      onClick={() => { setMenuOpen(false); handleDelete(); }}
                      className="flex items-center gap-2 px-4 py-2.5 text-xs text-red-400 hover:bg-white/5 transition w-full"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete post
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3 space-y-2.5">
        {post.content && (
          <p className="text-sm text-zinc-300 leading-relaxed">{post.content}</p>
        )}

        {/* Media */}
        {hasAudio && post.media_url && (
          <AudioPlayerInline url={post.media_url} name={post.media_name ?? "Audio"} />
        )}
        {(hasImage || hasGif) && post.media_url && (
          <img
            src={post.media_url}
            alt=""
            className="w-full rounded-xl object-cover max-h-72"
          />
        )}
        {hasVideo && post.link_url && (
          <VideoEmbed url={post.link_url} title={post.link_title} />
        )}
        {post.media_type === "link" && post.link_url && (
          <a
            href={post.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-zinc-400 hover:text-white transition"
          >
            <span className="truncate">{post.link_title ?? post.link_url}</span>
          </a>
        )}
      </div>

      {/* Waveform divider */}
      <div className="px-4">
        <WaveformDivider hasAudio={hasAudio || hasVideo} />
      </div>

      {/* Action bar */}
      <div className="border-t border-white/5 flex items-center justify-around px-4 py-3.5">
        <button
          onClick={handleVibe}
          aria-label="Vibe"
          className={`flex items-center gap-2 text-sm transition active:scale-90 duration-150 ${vibed ? "text-amber-500" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          <VibeIcon active={vibed} />
          <span className="tabular-nums">{vibeCount > 0 ? vibeCount : ""}</span>
        </button>

        <button
          onClick={() => onOpenThread(post)}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition"
        >
          <MessageCircle className="h-5 w-5" />
          <span>{post.comment_count > 0 ? post.comment_count : ""}</span>
        </button>

        <button
          onClick={() => onLoop(post)}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition"
        >
          <Repeat2 className="h-5 w-5" />
        </button>

        <button
          onClick={handleBookmark}
          className={`transition ${bookmarked ? "text-amber-500" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          {bookmarked
            ? <BookmarkCheck className="h-5 w-5" />
            : <Bookmark className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
