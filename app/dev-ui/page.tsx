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
import { PipelineStepper, PIPELINE, pipelineIndex } from "@/components/business/PipelineStepper";
import PostCard from "@/components/community/PostCard";
import BusinessHub from "@/components/business/BusinessHub";
import CalendarHub from "@/components/content/CalendarHub";
import ProjectReviewPlayer from "@/components/audio/ProjectReviewPlayer";
import type { Post, Profile } from "@/lib/communityTypes";
import type { ProjectReview } from "@/lib/audioTypes";
import Dashboard from "@/components/dashboard/Dashboard";
import ContributionsCard from "@/components/dashboard/ContributionsCard";
import { dayKey, type ContributionDays } from "@/lib/contributions";

// Seeded contribution history: ~5 months of uneven work + a live 6-day streak,
// so the heatmap shows all intensity levels without real data.
const mockContributions: ContributionDays = (() => {
  const byDay = new Map<string, number>();
  let total = 0;
  for (let back = 0; back < 150; back++) {
    const wave = Math.abs(Math.sin(back * 0.7) * Math.cos(back * 0.23)) * 5;
    const count = back < 6 ? 1 + (back % 3) : Math.max(0, Math.round(wave) - 1);
    if (count > 0) {
      const d = new Date();
      d.setDate(d.getDate() - back);
      byDay.set(dayKey(d), count);
      total += count;
    }
  }
  return { byDay, detail: new Map(), totalYear: total, streak: 6 };
})();

const mockProfile: Profile = {
  id: "mock-1", username: "aria.wav", avatar_url: null, is_pro: true, is_bot: false,
  fennec_db_score: 1284, created_at: new Date().toISOString(), bio: null, genres: [],
  worked_with: null, worked_in: null, banner_url: null, studio_photo_url: null, studio_photo_luma: null, display_name: "Aria Montes",
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
      <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">Contributions card (seeded)</p>
      <ContributionsCard data={mockContributions} accent="#f5a623" />

      <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">Dashboard · v4 layout (phone frame)</p>
      <div className="rounded-[28px] border border-white/10 overflow-hidden bg-[#0b0a08]" style={{ height: 720 }}>
        <Dashboard username="aria.wav" networkProfile={mockProfile} className="h-full" />
      </div>

      <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">Pipeline stepper · every stage</p>
      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        {PIPELINE.map((s) => (
          <div key={s.key} className="space-y-1">
            <p className="text-[10px] text-zinc-600">current: {s.key} ({s.owner})</p>
            <PipelineStepper
              current={s.key}
              canSelect={(k) => {
                const idx = pipelineIndex(k), cur = pipelineIndex(s.key);
                return idx !== cur && idx <= cur + 1;
              }}
              onSelect={() => {}}
            />
          </div>
        ))}
      </div>

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
      {/* relative + fixed height: the player positions absolute inset-0, and
          without a positioned ancestor it escapes and covers the whole page. */}
      <div className="relative border border-white/5 rounded-2xl p-4 overflow-hidden" style={{ height: 620 }}>
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
