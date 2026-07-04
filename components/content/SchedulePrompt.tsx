"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Calendar, Check } from "lucide-react";
import { useSheetDismiss, SHEET_BOTTOM, SHEET_ENTER } from "@/components/ui/useSheetDismiss";

type Props = {
  taskTitle: string;
  onConfirm: (date: string) => void;
  onSkip: () => void;
};

function toYMD(d: Date): string {
  return d.toISOString().split("T")[0];
}

export default function SchedulePrompt({
  taskTitle,
  onConfirm,
  onSkip,
}: Props) {
  const { sheetRef, dismiss } = useSheetDismiss(onSkip);
  const [date, setDate] = useState<string>(toYMD(new Date()));
  const [done, setDone] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleConfirm = () => {
    setDone(true);
    setTimeout(() => {
      onConfirm(date);
    }, 800);
  };

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        style={{ animation: "sheetFadeIn .25s ease both" }}
        onClick={dismiss}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="fixed left-0 right-0 z-[101] max-w-lg mx-auto rounded-t-3xl border-t border-white/10 bg-zinc-950 p-6 space-y-5"
        style={{ bottom: SHEET_BOTTOM, paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)", animation: SHEET_ENTER }}
      >
        {done ? (
          // Success state
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
              <Check className="h-6 w-6 text-accent" />
            </div>
            <p className="text-sm font-semibold text-white">Scheduled! 🎬</p>
            <p className="text-xs text-zinc-500 text-center">
              It&apos;ll show up on your content calendar.
            </p>
          </div>
        ) : (
          // Normal state
          <>
            {/* Header */}
            <div className="flex gap-4">
              <div className="h-10 w-10 rounded-2xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  When should we schedule this?
                </p>
                <p className="text-xs text-zinc-500 line-clamp-2">
                  {taskTitle}
                </p>
              </div>
            </div>

            {/* Date input */}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-12 rounded-2xl border border-white/15 bg-black/40 px-4 text-sm text-white"
              style={{ colorScheme: "dark" }}
            />

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onSkip}
                className="flex-1 py-3 rounded-2xl border border-white/10 text-sm text-zinc-400 hover:bg-white/5 transition-colors"
              >
                Not now
              </button>
              <button
                onClick={handleConfirm}
                disabled={!date}
                className="flex-1 py-3 rounded-2xl bg-accent text-sm font-bold text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent/90 transition-colors"
              >
                Schedule
              </button>
            </div>
          </>
        )}
      </div>
    </>,
    document.body
  );
}
