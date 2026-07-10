"use client";
// Dev-only full-width preview of the horizontal desktop tape. 404 in prod.
import { notFound } from "next/navigation";
import TapeDeckDesktop from "@/components/audio/TapeDeckDesktop";
import type { ProjectReview } from "@/lib/audioTypes";

const MOCK: ProjectReview = {
  id: "dev-mock-track",
  user_id: "dev",
  title: "Midnight Reel",
  category: "Missing Mix",
  audio_url: "/api/dev-audio?tone=1",
  artwork_url: null,
  duration_seconds: 192,
  comment_count: 0,
  created_at: new Date().toISOString(),
  profile: { id: "dev", username: "torohumo", avatar_url: null },
};

export default function DevTapePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className="h-screen w-screen overflow-hidden" style={{ background: "#0b0a08" }}>
      <TapeDeckDesktop track={MOCK} userId="dev" onPass={() => {}} onOpenMyTracks={() => {}} onOpenIntro={() => {}} />
    </div>
  );
}
