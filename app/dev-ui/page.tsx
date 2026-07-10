"use client";

// Dev-only component gallery — lets us verify module UI pieces without auth.
// Returns 404 in production builds.

import { notFound } from "next/navigation";
import {
  PricingCalculatorCard, ClientsCard, QuotesCard, ProjectsCard,
} from "@/components/remotion/BusinessToolCards";
import {
  QuickIdeasCard, ContentLabCard, MyScriptsCard,
} from "@/components/remotion/ContentToolCards";
import NetworkHero from "@/components/remotion/NetworkHero";
import PostCard from "@/components/community/PostCard";
import BusinessHub from "@/components/business/BusinessHub";
import CalendarHub from "@/components/content/CalendarHub";
import ProjectReviewPlayer from "@/components/audio/ProjectReviewPlayer";
import type { Post, Profile } from "@/lib/communityTypes";
import type { ProjectReview } from "@/lib/audioTypes";

const mockProfile: Profile = {
  id: "mock-1", username: "aria.wav", avatar_url: null, is_pro: true, is_bot: false,
  fennec_db_score: 1284, created_at: new Date().toISOString(), bio: null, genres: [],
  worked_with: null, worked_in: null, banner_url: null, display_name: "Aria Montes",
  role: "Composer", country: "Argentina", instagram: null, spotify: null,
  youtube_url: null, tiktok: null, color_id: null,
};

const mockPost: Post = {
  id: "post-1", user_id: "mock-1",
  content: "Just closed my first sync placement for a series — the brief asked for 'tension without percussion'. Strings + granular pads did the trick. Ask me anything.",
  category: "sync", media_url: null, media_type: null, media_name: null,
  link_url: null, link_title: null, repost_of: null,
  created_at: new Date(Date.now() - 41 * 60_000).toISOString(),
  profile: mockProfile, vibe_count: 23, comment_count: 7,
  user_vibed: true, user_bookmarked: false,
};

const mockPost2: Post = {
  ...mockPost, id: "post-2", category: "gear", user_vibed: false, vibe_count: 9, comment_count: 2,
  content: "Hot take: stock plugins get you 90% there. The last 10% is taste, not tools.",
  profile: { ...mockProfile, id: "mock-2", username: "nils.berg", is_pro: false, display_name: "Nils Berg", fennec_db_score: 640 },
  user_id: "mock-2",
};

const mockTrack: ProjectReview = {
  id: "track-1",
  user_id: "review-1",
  title: "Midnight Drive (Demo)",
  category: "Demo",
  duration_seconds: 45,
  audio_url: "/api/dev-audio",
  artwork_url: null,
  created_at: new Date().toISOString(),
  comment_count: 2,
  profile: {
    id: "review-1",
    username: "luna.synth",
    avatar_url: null,
  },
};

export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className="min-h-screen bg-[#111114] px-4 py-8 mx-auto w-full max-w-md space-y-6 overflow-y-auto" id="scroll-root">
      <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">Business tool cards</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="relative rounded-2xl overflow-hidden" style={{ height: 90 }}><PricingCalculatorCard /></div>
        <div className="relative rounded-2xl overflow-hidden" style={{ height: 90 }}><ClientsCard /></div>
        <div className="relative rounded-2xl overflow-hidden" style={{ height: 90 }}><QuotesCard /></div>
        <div className="relative rounded-2xl overflow-hidden" style={{ height: 90 }}><ProjectsCard /></div>
      </div>

      <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">Network hero</p>
      <div className="relative rounded-2xl overflow-hidden" style={{ height: 130 }}><NetworkHero /></div>

      <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">Content tool cards</p>
      <div className="grid grid-cols-3 gap-2" style={{ height: 120 }}>
        <div className="relative rounded-2xl overflow-hidden h-full"><QuickIdeasCard /></div>
        <div className="relative rounded-2xl overflow-hidden h-full"><ContentLabCard /></div>
        <div className="relative rounded-2xl overflow-hidden h-full"><MyScriptsCard /></div>
      </div>

      <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">Community post cards</p>
      <div className="space-y-3">
        <PostCard post={mockPost} currentProfile={mockProfile}
          onOpenThread={() => {}} onLoop={() => {}} onOpenProfile={() => {}} />
        <PostCard post={mockPost2} currentProfile={mockProfile}
          onOpenThread={() => {}} onLoop={() => {}} onOpenProfile={() => {}} />
      </div>

      <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">Business Hub (full module)</p>
      <div className="border border-white/5 rounded-2xl py-4">
        <BusinessHub onOpenView={() => {}} userId="00000000-0000-0000-0000-000000000000" />
      </div>

      <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">Content Hub (full module)</p>
      <div className="border border-white/5 rounded-2xl py-4" style={{ minHeight: 620 }}>
        <CalendarHub tasks={[]} isPro={false} onOpenSheet={() => {}}
          onToggleDone={() => {}} onDeleteTask={() => {}} onEditScript={() => {}} />
      </div>

      <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">Audio Module — Track Review Player</p>
      <div className="border border-white/5 rounded-2xl p-4">
        <ProjectReviewPlayer
          track={mockTrack}
          userId="mock-user"
          onPass={() => {}}
          skipStreak={0}
          onSkipStreakChange={() => {}}
        />
      </div>
    </div>
  );
}
