"use client";
import { useState } from "react";
import { MessageCircle, Repeat2, Bookmark, BookmarkCheck } from "lucide-react";
import { toggleVibe, toggleBookmark } from "@/lib/communityDb";
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

export default function PostCard({ post, currentProfile, onOpenThread, onLoop, onOpenProfile }: Props) {
  const [vibed, setVibed]           = useState(post.user_vibed);
  const [vibeCount, setVibeCount]   = useState(post.vibe_count);
  const [bookmarked, setBookmarked] = useState(post.user_bookmarked);

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

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">

      {/* Category + time */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="text-[10px] text-zinc-500 bg-white/5 px-2.5 py-1 rounded-full">
          {post.category === "music"    && "🎵 Music"}
          {post.category === "gear"     && "🎛️ Gear & Tools"}
          {post.category === "sync"     && "🎬 Sync & Scoring"}
          {post.category === "business" && "💼 Business"}
          {post.category === "mindset"  && "🧠 Mindset"}
          {post.category === "general"  && "💬 General"}
        </span>
        <span className="text-[10px] text-zinc-600">{timeAgo(post.created_at)}</span>
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

      {/* User info — centered, tappable */}
      <button
        onClick={() => onOpenProfile(post.user_id)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 hover:bg-white/5 transition"
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 overflow-hidden"
          style={{ backgroundColor: avatarColor(p.username) }}
        >
          {p.avatar_url
            ? <img src={p.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
            : avatarInitial(p)}
        </div>
        <span className="text-sm font-semibold text-zinc-200">@{p.username}</span>
        {p.is_pro && <ProBadge />}
        <span className="text-xs text-zinc-600">{p.fennec_db_score} dB</span>
      </button>

      {/* Action bar */}
      <div className="border-t border-white/5 flex items-center justify-around px-4 py-2.5">
        <button
          onClick={handleVibe}
          className={`flex items-center gap-1.5 text-xs transition ${vibed ? "text-amber-500" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          <span>🎵</span>
          <span>{vibeCount > 0 ? vibeCount : ""}</span>
        </button>

        <button
          onClick={() => onOpenThread(post)}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition"
        >
          <MessageCircle className="h-4 w-4" />
          <span>{post.comment_count > 0 ? post.comment_count : ""}</span>
        </button>

        <button
          onClick={() => onLoop(post)}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition"
        >
          <Repeat2 className="h-4 w-4" />
        </button>

        <button
          onClick={handleBookmark}
          className={`transition ${bookmarked ? "text-amber-500" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          {bookmarked
            ? <BookmarkCheck className="h-4 w-4" />
            : <Bookmark className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
