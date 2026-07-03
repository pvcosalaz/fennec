"use client";

// Dev-only preview of the "La Cinta Marcada" Feedback player (see DESIGN.md).
// Renders ProjectReviewPlayer with mock data so the UI can be verified without
// auth or Supabase. Returns 404 in production.

import { notFound } from "next/navigation";
import ProjectReviewPlayer from "@/components/audio/ProjectReviewPlayer";
import type { ProjectReview, ReviewComment } from "@/lib/audioTypes";

const mockTrack: ProjectReview = {
  id: "demo-track",
  user_id: "demo-owner",
  title: "Midnight Reel",
  category: "Missing Mix",
  audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  artwork_url: null,
  duration_seconds: 192,
  created_at: new Date().toISOString(),
  profile: { id: "demo-owner", username: "torohumo", avatar_url: null },
  comment_count: 5,
};

const mk = (id: string, username: string, t: number | null, body: string): ReviewComment => ({
  id, track_id: "demo-track", user_id: username, body, timestamp_seconds: t,
  created_at: new Date().toISOString(),
  profile: { id: username, username, avatar_url: null },
});

const mockComments: ReviewComment[] = [
  mk("c1", "kavernamx", 16, "Ese filtro abriendo en la intro — déjalo respirar dos compases más antes de que entre el kick."),
  mk("c2", "lunaproduce", 49, "El pad está peleando con la voz en 400Hz. Un shelf suave ahí y la mezcla se abre sola."),
  // cluster: three marks piled on the same moment (the fill everyone loves)
  mk("c3", "rodadrums", 28, "Ahí. Ese fill. No lo toques — es lo mejor del track."),
  mk("c3b", "lunaproduce", 32, "Sí — ese fill es LA firma. Constrúyele un eco en el outro."),
  mk("c3c", "beatpadre", 36, "El fill brilla pero el crash que le sigue está muy adelante. Bájalo 2dB."),
  mk("c4", "somamusic", 117, "El drop se siente 1dB tímido comparado con la sección anterior. Súbele presencia al bus de drums."),
  mk("c5", "kavernamx", 151, "Este outro merece una cola más larga — córtalo en frío y pierdes toda la tensión que construiste."),
  mk("c6", "beatpadre", null, "En general muy sólido. El groove tiene identidad."),
];

export default function FeedbackDemoPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="relative overflow-hidden" style={{ background: "#111114", height: "100dvh" }}>
      <ProjectReviewPlayer
        track={mockTrack}
        userId="demo-viewer"
        onPass={() => {}}
        skipStreak={0}
        onSkipStreakChange={() => {}}
        previewComments={mockComments}
        onOpenMelody={() => alert("Melody Bank (demo)")}
        onOpenMyTracks={() => alert("My Tracks (demo)")}
      />
    </main>
  );
}
