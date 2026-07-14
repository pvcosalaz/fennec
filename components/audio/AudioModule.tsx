"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { ProjectReview } from "@/lib/audioTypes";
import { fetchRandomReviews } from "@/lib/audioDb";
import ProjectReviewPlayer from "./ProjectReviewPlayer";
import MyTracksView from "./MyTracksView";
import IdeasModule from "@/components/ideas/IdeasModule";
import TapeIntro from "./TapeIntro";
import { useSheetDismiss, SHEET_BOTTOM, SHEET_ENTER } from "@/components/ui/useSheetDismiss";

type Overlay = "melody" | "mine" | "intro" | null;

const INTRO_SEEN_KEY = "fennec_tape_intro_seen_v1";

type Props = {
  userId: string;
  isPro: boolean;
  /** Fired with true while a bottom sheet (intro / My Tracks) is open, so
   *  the shell can slide the nav away and give the sheet the full bottom. */
  onSheetChange?: (open: boolean) => void;
};

export default function AudioModule({ userId, isPro, onSheetChange }: Props) {
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

  // First visit → the tape intro (reopenable from the ⋯ flyout).
  // Mark it seen the moment it's SHOWN, not only when properly dismissed —
  // on desktop, the immersive-exit "‹ fennec" pill sits above this overlay
  // and stays clickable while it's open; leaving that way skipped
  // closeIntro()'s write entirely, so the flag never got set and the intro
  // kept reappearing on every visit to the tab.
  useEffect(() => {
    try {
      if (!localStorage.getItem(INTRO_SEEN_KEY)) {
        setOverlay("intro");
        localStorage.setItem(INTRO_SEEN_KEY, "1");
      }
    } catch { /* private mode */ }
  }, []);

  // Bottom sheets own the whole bottom edge: nav slides away while open
  useEffect(() => {
    const sheetOpen = overlay === "intro" || overlay === "mine";
    onSheetChange?.(sheetOpen);
    return () => onSheetChange?.(false); // leaving the tab restores the nav
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay]);

  function closeIntro(next: Overlay = null) {
    try { localStorage.setItem(INTRO_SEEN_KEY, "1"); } catch { /* ignore */ }
    setOverlay(next);
  }

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
          onOpenIntro={() => setOverlay("intro")}
        />
      )}

      {/* ── Tape intro — first visit + on demand ───────────────── */}
      {overlay === "intro" && (
        <TapeIntro
          onClose={() => closeIntro(null)}
          onUpload={() => closeIntro("mine")}
        />
      )}

      {/* ── Melody Bank overlay ────────────────────────────────── */}
      {/* z-50: must sit ABOVE the ideas-tab floating bell+settings row
          (z-40 in PricingCalculator) so the Settings gear doesn't overlap
          the Melody Bank collection. */}
      {overlay === "melody" && (
        <div className="fixed inset-0 z-50 bg-[#111114] overflow-y-auto pb-32">
          <div className="flex justify-end px-4 pt-14 pb-2">
            <button onClick={() => setOverlay(null)} aria-label="Close" className="text-zinc-500 hover:text-white transition">
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
        <MyTracksSheet userId={userId} isPro={isPro} onClose={() => setOverlay(null)} />
      )}
    </div>
  );
}

/* ── My Tracks as a proper sheet: swipe-down to close, true-bottom anchor,
   dim backdrop. Own component so useSheetDismiss binds on mount. ── */
function MyTracksSheet({
  userId,
  isPro,
  onClose,
}: {
  userId: string;
  isPro: boolean;
  onClose: () => void;
}) {
  const { sheetRef, dismiss } = useSheetDismiss(onClose);
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        style={{ animation: "sheetFadeIn .25s ease both" }}
        onClick={dismiss}
      />
      <div
        ref={sheetRef}
        className="fixed inset-x-0 z-50 rounded-t-3xl bg-[#1a1a1e] border-t border-white/8 overflow-y-auto"
        style={{
          bottom: SHEET_BOTTOM,
          maxHeight: "calc(var(--app-h, 100dvh) - 4rem)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)",
          animation: SHEET_ENTER,
        }}
      >
        {/* drag handle */}
        <div className="flex justify-center pt-3">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        <div className="flex items-center justify-between px-4 pt-2 pb-4">
          <span className="text-sm font-bold text-white">My Tracks</span>
          <button onClick={dismiss} aria-label="Close" className="text-zinc-500 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-4">
          <MyTracksView userId={userId} isPro={isPro} />
        </div>
      </div>
    </>
  );
}
