"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { ProjectReview } from "@/lib/audioTypes";
import { fetchRandomReviews } from "@/lib/audioDb";
import ProjectReviewPlayer from "./ProjectReviewPlayer";
import MyTracksView from "./MyTracksView";
import IdeasModule from "@/components/ideas/IdeasModule";

type Overlay = "melody" | "mine" | null;

type Props = {
  userId: string;
  isPro: boolean;
};

export default function AudioModule({ userId, isPro }: Props) {
  const [overlay, setOverlay]       = useState<Overlay>(null);
  const [queue, setQueue]           = useState<ProjectReview[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [skipStreak, setSkipStreak] = useState(0);

  useEffect(() => {
    fetchRandomReviews(userId, 10)
      .then((tracks) => { setQueue(tracks); setQueueIndex(0); })
      .catch(console.error)
      .finally(() => setLoadingQueue(false));
  }, [userId]);

  function handlePass() {
    if (queueIndex + 1 >= queue.length) {
      setLoadingQueue(true);
      fetchRandomReviews(userId, 10)
        .then((tracks) => { setQueue(tracks); setQueueIndex(0); })
        .catch(console.error)
        .finally(() => setLoadingQueue(false));
    } else {
      setQueueIndex((i) => i + 1);
    }
  }

  const currentTrack = queue[queueIndex] ?? null;

  return (
    <div className="absolute inset-0">

      {/* ── Main player — the tape is the screen ──────────────── */}
      {loadingQueue && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#131216" }}>
          <p className="text-xs text-zinc-600">Loading tracks...</p>
        </div>
      )}
      {!loadingQueue && !currentTrack && (
        <div className="absolute inset-0 flex items-center justify-center px-10 text-center" style={{ background: "#131216" }}>
          <p className="text-xs text-zinc-600">No tracks available right now. Check back later!</p>
        </div>
      )}
      {!loadingQueue && currentTrack && (
        <ProjectReviewPlayer
          key={currentTrack.id}
          track={currentTrack}
          userId={userId}
          onPass={handlePass}
          skipStreak={skipStreak}
          onSkipStreakChange={setSkipStreak}
          onOpenMelody={() => setOverlay("melody")}
          onOpenMyTracks={() => setOverlay("mine")}
        />
      )}

      {/* ── Melody Bank overlay ────────────────────────────────── */}
      {overlay === "melody" && (
        <div className="fixed inset-0 z-30 bg-[#111114] overflow-y-auto pb-32">
          <div className="flex justify-end px-4 pt-14 pb-2">
            <button onClick={() => setOverlay(null)} className="text-zinc-500 hover:text-white transition">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="px-4">
            <IdeasModule onBack={() => setOverlay(null)} />
          </div>
        </div>
      )}

      {/* ── My Tracks bottom sheet ─────────────────────────────── */}
      {overlay === "mine" && (
        <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-[#1a1a1e] border-t border-white/8 overflow-y-auto"
          style={{
            // Anchored to the shell's corrected height, not the flaky layout
            // viewport; bottom padding clears the bottom nav so the form's
            // Submit/Cancel are always reachable.
            maxHeight: "calc(var(--app-h, 100dvh) - 4rem)",
            paddingBottom: "calc(env(safe-area-inset-bottom) + 7rem)",
          }}
        >
          <div className="flex items-center justify-between px-4 pt-5 pb-4">
            <span className="text-sm font-bold text-white">My Tracks</span>
            <button onClick={() => setOverlay(null)} className="text-zinc-500 hover:text-white transition">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="px-4">
            <MyTracksView userId={userId} isPro={isPro} />
          </div>
        </div>
      )}
    </div>
  );
}
