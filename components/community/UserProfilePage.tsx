"use client";
import { useEffect, useState } from "react";
import { ChevronLeft, Pencil } from "lucide-react";
import { getProfile, fetchUserPosts } from "@/lib/communityDb";
import type { Profile, Post } from "@/lib/communityTypes";
import ProBadge from "./ProBadge";
import PostCard from "./PostCard";
import EditProfileSheet from "./EditProfileSheet";

const AVATAR_COLORS = ["#6366f1","#f59e0b","#10b981","#ef4444","#8b5cf6","#3b82f6","#ec4899"];
function avatarColor(username: string) {
  let hash = 0;
  for (const c of username) hash = (hash * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

type Props = {
  userId: string;
  currentProfile: Profile;
  onBack: () => void;
  onOpenThread: (post: Post) => void;
  onOpenProfile: (userId: string) => void;
};

export default function UserProfilePage({ userId, currentProfile, onBack, onOpenThread, onOpenProfile }: Props) {
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [posts, setPosts]       = useState<Post[]>([]);
  const [loading, setLoading]   = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const isOwnProfile = userId === currentProfile.id;

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [p, userPosts] = await Promise.all([
        getProfile(userId),
        fetchUserPosts(userId, currentProfile.id),
      ]);
      setProfile(p);
      setPosts(userPosts);
      setLoading(false);
    }
    load();
  }, [userId, currentProfile.id]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-2 pt-6 space-y-4">
        <div className="h-6 w-24 rounded-full bg-white/5 animate-pulse" />
        <div className="flex flex-col items-center gap-3 pt-6">
          <div className="w-20 h-20 rounded-full bg-white/5 animate-pulse" />
          <div className="h-4 w-32 rounded-full bg-white/5 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-4xl px-2 pt-6 text-center text-zinc-500 text-sm">
        Usuario no encontrado.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-2 pb-24 space-y-4 overflow-x-hidden">

      {/* Banner + avatar */}
      <div className="relative -mx-2 -mt-2">
        {/* Back button — overlay on banner */}
        <button
          onClick={onBack}
          className="absolute top-3 left-4 z-10 flex items-center gap-1 text-xs text-white/80 hover:text-white transition bg-black/30 backdrop-blur-sm px-2.5 py-1.5 rounded-full"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back
        </button>

        {/* Banner — full bleed, no side rounding */}
        <div className="w-full h-44 overflow-hidden bg-zinc-900 rounded-xl">
          {profile.banner_url
            ? <img src={profile.banner_url} className="w-full h-full object-cover" alt="" />
            : <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-800" />}
        </div>

        {/* Avatar — overlapping bottom edge of banner */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
          <div className="relative">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold shrink-0 overflow-hidden ring-4 ring-zinc-950"
              style={{ backgroundColor: avatarColor(profile.username) }}
            >
              {profile.avatar_url
                ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
                : profile.username[0]?.toUpperCase()}
            </div>
            {isOwnProfile && (
              <button
                onClick={() => setEditOpen(true)}
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-zinc-800 border border-white/20 flex items-center justify-center hover:bg-zinc-700 transition"
              >
                <Pencil className="h-3 w-3 text-white" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Profile info — pushed down to clear the avatar overlap */}
      <div className="flex flex-col items-center gap-1.5 pt-10">
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${profile.is_pro ? "text-amber-400" : "text-white"}`}>@{profile.username}</span>
          {profile.is_pro && <ProBadge />}
          <span className="text-sm font-bold text-amber-500">{profile.fennec_db_score} <span className="text-xs font-normal text-zinc-500">dB</span></span>
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="text-sm text-zinc-300 leading-relaxed text-center px-4">{profile.bio}</p>
      )}

      {/* Genres */}
      {profile.genres && profile.genres.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {profile.genres.map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Credits */}
      {(profile.worked_with || profile.worked_in) && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
          {profile.worked_with && (
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Worked with</p>
              <p className="text-sm text-zinc-300">{profile.worked_with}</p>
            </div>
          )}
          {profile.worked_in && (
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Worked in</p>
              <p className="text-sm text-zinc-300">{profile.worked_in}</p>
            </div>
          )}
        </div>
      )}

      <div className="h-px bg-white/10" />

      {/* Posts */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Posts</p>
        {posts.length === 0 && (
          <p className="text-center text-sm text-zinc-600 py-8">Sin posts todavía.</p>
        )}
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentProfile={currentProfile}
            onOpenThread={onOpenThread}
            onLoop={() => {}}
            onOpenProfile={onOpenProfile}
            onDelete={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
          />
        ))}
      </div>

      {editOpen && (
        <EditProfileSheet
          profile={profile}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => setProfile(updated)}
        />
      )}
    </div>
  );
}
