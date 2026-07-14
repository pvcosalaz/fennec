"use client";
import { Upload } from "lucide-react";
import { useSheetDismiss, SHEET_BOTTOM, SHEET_ENTER } from "@/components/ui/useSheetDismiss";

/* First-visit intro for La Cinta Marcada (see DESIGN.md).
   A bottom sheet styled like the module itself: a miniature spine with
   grease-pencil ticks walks through the four ideas, serif for the notes.
   Slides up on open, swipe-down (or backdrop tap) to close. While open,
   the shell hides the bottom nav (see AudioModule.onSheetChange).
   Reopenable anytime from the ⋯ flyout ("How it works"). */

const AMBER = "#f5a623";
const SERIF_FONT = 'var(--font-tape-serif, "Newsreader", Georgia, serif)';
const MONO_FONT  = 'var(--font-tape-mono, "Space Mono", monospace)';

const STEPS: { title: string; body: string }[] = [
  {
    title: "Every track is a tape",
    body: "Time runs down the reel. The amber marks are notes other producers left at exact moments.",
  },
  {
    title: "Hold to mark",
    body: "Press and hold anywhere on the tape to write a note at that second. Drag to scrub through time.",
  },
  {
    title: "Upload your own",
    body: "Share a track of yours and other producers will leave notes on it, exactly like you do here.",
  },
];

export default function TapeIntro({
  onClose,
  onUpload,
}: {
  onClose: () => void;
  /** CTA: jump straight into My Tracks to upload the first track. */
  onUpload: () => void;
}) {
  const { sheetRef, dismiss } = useSheetDismiss(onClose);

  return (
    <>
      {/* z-[90]/[100]: must sit ABOVE the desktop immersive-exit "‹ fennec"
          pill (z-[80] in DesktopShell). Otherwise that pill stays clickable
          over this overlay, and leaving through it skips the "seen" flag —
          the intro then reappears on every visit. The backdrop now covers
          the pill; clicking there dismisses the intro properly instead. */}
      <div
        className="fixed inset-0 z-[90] bg-black/75 backdrop-blur-sm"
        style={{ animation: "sheetFadeIn .25s ease both" }}
        onClick={dismiss}
      />
      <div
        ref={sheetRef}
        className="fixed inset-x-0 z-[100] mx-auto w-full max-w-md rounded-t-3xl border-t border-white/10 px-6 pt-3"
        style={{
          bottom: SHEET_BOTTOM,
          background: "linear-gradient(180deg, #17151b, #131216)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)",
          animation: SHEET_ENTER,
        }}
      >
        {/* drag handle */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <p className="text-[9px] font-bold uppercase text-center mb-1"
          style={{ fontFamily: MONO_FONT, letterSpacing: "0.3em", color: AMBER }}>
          Track Reviews
        </p>
        <h2 className="text-xl font-bold text-white text-center mb-5">How the tape works</h2>

        {/* steps docked to a miniature spine */}
        <div className="relative pl-7 mb-6">
          <div className="absolute left-2 top-1 bottom-1 w-[2px] rounded bg-white/15" />
          <div className="space-y-4">
            {STEPS.map((s) => (
              <div key={s.title} className="relative">
                <span className="absolute -left-5 top-[7px] h-[2px] w-4 rounded"
                  style={{ background: AMBER, opacity: 0.85 }} />
                <p className="text-[13px] font-semibold text-white">{s.title}</p>
                <p className="text-[13.5px] leading-relaxed mt-0.5"
                  style={{ fontFamily: SERIF_FONT, color: "rgba(255,255,255,.62)" }}>
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[10.5px] leading-relaxed mb-5 text-center"
          style={{ fontFamily: MONO_FONT, color: "rgba(255,255,255,.35)" }}>
          Bailing early on 4 tracks in a row pauses the queue —
          a real listen or a mark keeps it rolling.
        </p>

        <div className="flex gap-2">
          <button
            onClick={dismiss}
            className="flex-1 h-12 rounded-2xl border border-white/10 text-sm font-semibold text-zinc-400 transition hover:text-white active:scale-[0.98]"
          >
            Start listening
          </button>
          <button
            onClick={onUpload}
            className="flex-[1.4] h-12 rounded-2xl text-sm font-bold text-black transition hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-2"
            style={{ background: AMBER }}
          >
            <Upload className="h-4 w-4" />
            Upload your first track
          </button>
        </div>
      </div>
    </>
  );
}
