"use client";

import { notFound } from "next/navigation";
import ProjectReviewPlayer from "@/components/audio/ProjectReviewPlayer";
import type { ProjectReview } from "@/lib/audioTypes";

const tracks: ProjectReview[] = [
  {
    id: "mock-1",
    user_id: "u1",
    title: "Midnight Drive (Demo)",
    category: "Demo",
    duration_seconds: 147,
    audio_url: "/api/dev-audio",
    artwork_url: null,
    created_at: new Date().toISOString(),
    comment_count: 3,
    profile: { id: "u1", username: "luna.synth", avatar_url: null },
  },
  {
    id: "mock-2",
    user_id: "u2",
    title: "Untitled Ambient Loop",
    category: "Idea",
    duration_seconds: 92,
    audio_url: "/api/dev-audio",
    artwork_url: null,
    created_at: new Date().toISOString(),
    comment_count: 0,
    profile: { id: "u2", username: "nils.berg", avatar_url: null },
  },
  {
    id: "mock-3",
    user_id: "u3",
    title: "Brass Hit v3",
    category: "Missing Mix",
    duration_seconds: 214,
    audio_url: "/api/dev-audio",
    artwork_url: null,
    created_at: new Date().toISOString(),
    comment_count: 7,
    profile: { id: "u3", username: "aria.wav", avatar_url: null },
  },
];

export default function DevAudioPreview() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className="min-h-screen bg-[#111114] px-4 py-8 mx-auto w-full max-w-sm">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5">
          <p className="text-[10px] font-bold tracking-[0.18em] text-[#f5a623]/70 uppercase flex-shrink-0">
            Track Reviews
          </p>
          <div className="h-px flex-1 bg-gradient-to-r from-[#f5a623]/20 to-transparent" />
        </div>
        <p className="mt-1 text-[10px] text-zinc-600 tracking-wide">
          Give feedback · earn karma · get heard
        </p>
      </div>

      {/* Player — first mock track */}
      <ProjectReviewPlayer
        track={tracks[0]}
        userId="mock-user"
        onPass={() => {}}
        skipStreak={0}
        onSkipStreakChange={() => {}}
      />

      {/* Queue preview */}
      <div className="mt-8 space-y-2">
        <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-[0.2em]">Up next</p>
        {tracks.slice(1).map((t) => (
          <div key={t.id}
            className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
            <div className="w-8 h-8 rounded-lg flex-shrink-0"
              style={{
                background: t.category === "Idea"
                  ? "linear-gradient(135deg,#052e16,#166534)"
                  : "linear-gradient(135deg,#1a0533,#6b21a8)"
              }} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{t.title}</p>
              <p className="text-[10px] text-zinc-600">@{t.profile?.username}</p>
            </div>
            <p className="text-[10px] text-zinc-600 flex-shrink-0">
              {Math.floor(t.duration_seconds / 60)}:{String(t.duration_seconds % 60).padStart(2, "0")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
