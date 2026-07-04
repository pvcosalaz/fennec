"use client";

import { Check } from "lucide-react";
import FennecFox from "@/components/dashboard/FennecFox";
import { useSheetDismiss, SHEET_BOTTOM, SHEET_ENTER } from "@/components/ui/useSheetDismiss";

export type ChecklistItem = {
  id: string;
  label: string;
  desc?: string;
  done: boolean;
  onClick: () => void;
};

// ─── Welcome modal — shown once on first visit ───────────────────────────────
export function WelcomeModal({
  userName,
  items,
  onClose,
}: {
  userName: string;
  items: ChecklistItem[];
  onClose: () => void;
}) {
  const doneCount = items.filter((i) => i.done).length;
  const allDone = doneCount === items.length;
  const { sheetRef, dismiss } = useSheetDismiss(onClose);

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm"
        style={{ animation: "sheetFadeIn .25s ease both" }} onClick={dismiss} />
      <div
        ref={sheetRef}
        className="fixed inset-x-0 z-[70] mx-auto w-full max-w-md rounded-t-3xl border-t border-white/10 bg-zinc-950 px-6 pt-3"
        style={{
          bottom: SHEET_BOTTOM,
          paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)",
          animation: SHEET_ENTER,
        }}
      >
        {/* drag handle */}
        <div className="flex justify-center mb-3">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Logo + welcome */}
        <div className="flex flex-col items-center text-center gap-1 mb-5">
          <FennecFox isActive={false} glow size={64} />
          <h2 className="text-xl font-bold text-white mt-1">
            Welcome to Fennec{userName ? `, ${userName}` : ""}!
          </h2>
          <p className="text-sm text-zinc-400 max-w-xs">
            Your music business, in order. Complete these steps to get started:
          </p>
        </div>

        {/* Checklist */}
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={item.onClick}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:bg-white/10 active:scale-[0.99]"
            >
              <span
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition ${
                  item.done ? "bg-accent border-accent" : "border-zinc-600"
                }`}
              >
                {item.done && <Check size={13} className="text-black" strokeWidth={3} />}
              </span>
              <span className="flex-1 min-w-0">
                <span
                  className={`block text-sm font-semibold ${
                    item.done ? "text-zinc-500 line-through" : "text-white"
                  }`}
                >
                  {item.label}
                </span>
                {item.desc && <span className="block text-xs text-zinc-500">{item.desc}</span>}
              </span>
              {!item.done && <span className="text-accent text-sm flex-shrink-0">→</span>}
            </button>
          ))}
        </div>

        {/* Progress + CTA */}
        <p className="text-center text-xs text-zinc-500 mt-4">
          {doneCount} of {items.length} completed
        </p>
        <button
          onClick={dismiss}
          className="mt-3 w-full rounded-2xl bg-accent py-3.5 text-sm font-bold text-black transition hover:brightness-110 active:scale-[0.98]"
        >
          {allDone ? "Done! 🎉" : "Get started"}
        </button>
      </div>
    </>
  );
}

// ─── Floating progress chip — zero vertical footprint ────────────────────────
// Replaces the in-flow ChecklistCard: an amber progress ring pinned to the
// dashboard's top-right corner. Tap → the steps sheet. Gone when complete.
export function ProgressChip({
  items,
  onOpen,
}: {
  items: ChecklistItem[];
  onOpen: () => void;
}) {
  const doneCount = items.filter((i) => i.done).length;
  const pct = doneCount / items.length;
  const R = 8;
  const C = 2 * Math.PI * R;

  return (
    <button
      onClick={onOpen}
      aria-label={`Setup: ${doneCount} of ${items.length} steps done — view remaining`}
      className="flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 pl-1.5 pr-2.5 py-1 transition hover:bg-accent/[0.16] active:scale-95"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" className="-rotate-90" aria-hidden>
        <circle cx="10" cy="10" r={R} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="2.5" />
        <circle
          cx="10" cy="10" r={R} fill="none"
          stroke="#f5a623" strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
          style={{ transition: "stroke-dashoffset .5s cubic-bezier(.16,1,.3,1)" }}
        />
      </svg>
      <span className="text-[11px] font-bold text-accent tabular-nums">
        {doneCount}/{items.length}
      </span>
    </button>
  );
}

// ─── Persistent dashboard card — until all steps are done ────────────────────
export function ChecklistCard({
  items,
  onOpen,
}: {
  items: ChecklistItem[];
  onOpen: () => void;
}) {
  const doneCount = items.filter((i) => i.done).length;
  const pct = Math.round((doneCount / items.length) * 100);

  return (
    <button
      onClick={onOpen}
      className="w-full rounded-2xl border border-accent/20 bg-accent/[0.06] p-4 flex items-center gap-4 text-left transition hover:bg-accent/[0.1] active:scale-[0.99]"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">Getting started</p>
        <p className="text-[11px] text-zinc-500 mt-0.5">Finish setting up your Fennec</p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className="text-sm font-black text-accent flex-shrink-0">
        {doneCount}/{items.length}
      </span>
    </button>
  );
}
