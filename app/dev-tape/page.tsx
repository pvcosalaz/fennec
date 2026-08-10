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
  /* 45, que es lo que dura el WAV de /api/dev-audio. Decia 192 y el harness
     mentia: la regla del tiempo pintaba 3:12 mientras el audio se topaba a los
     45s, asi que los topes de navegacion no coincidian y parecia un bug del
     componente (2026-08-10). Un harness que miente cuesta diagnosticos. */
  duration_seconds: 45,
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
