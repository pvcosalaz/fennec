"use client";
import { useRef } from "react";
import { Upload } from "lucide-react";

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
    title: "Seals pay karma",
    body: "When the artist seals your mark — “this helped” — you earn +2 karma. Quality feedback is the only way to earn it.",
  },
  {
    title: "Upload your own",
    body: "Uploading costs 5 karma and you start with 5 — your first track is on the house.",
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
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ startY: 0, delta: 0, dragging: false });

  function dismiss() {
    const el = sheetRef.current;
    if (!el) { onClose(); return; }
    el.style.transition = "transform .25s cubic-bezier(.22,1,.36,1)";
    el.style.transform = "translateY(110%)";
    setTimeout(onClose, 220);
  }

  function onTouchStart(e: React.TouchEvent) {
    drag.current = { startY: e.touches[0].clientY, delta: 0, dragging: true };
    if (sheetRef.current) sheetRef.current.style.transition = "none";
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!drag.current.dragging) return;
    const dy = Math.max(0, e.touches[0].clientY - drag.current.startY);
    drag.current.delta = dy;
    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${dy}px)`;
  }
  function onTouchEnd() {
    if (!drag.current.dragging) return;
    drag.current.dragging = false;
    const el = sheetRef.current;
    if (!el) return;
    if (drag.current.delta > 90) {
      dismiss();
    } else {
      el.style.transition = "transform .25s cubic-bezier(.22,1,.36,1)";
      el.style.transform = "translateY(0)";
    }
  }

  return (
    <>
      <style>{`
        @keyframes tapeSheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes tapeFadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .tape-sheet, .tape-backdrop { animation: none !important; }
        }
      `}</style>
      <div
        className="tape-backdrop fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm"
        style={{ animation: "tapeFadeIn .25s ease both" }}
        onClick={dismiss}
      />
      <div
        ref={sheetRef}
        className="tape-sheet fixed inset-x-0 z-[70] mx-auto w-full max-w-md rounded-t-3xl border-t border-white/10 px-6 pt-3"
        style={{
          // Anchor to the TRUE screen bottom, not the flaky iOS layout
          // viewport: on healthy devices this resolves to 0; when iOS
          // underreports the viewport, it goes negative and reaches the edge.
          bottom: "calc(100dvh - var(--app-h, 100dvh))",
          background: "linear-gradient(180deg, #17151b, #131216)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)",
          animation: "tapeSheetUp .32s cubic-bezier(.22,1,.36,1) both",
          touchAction: "none",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
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
