"use client";

// GitHub-style contributions heatmap for the dashboard (v4 layout, Paco
// 2026-07-22): lives right below the dB hero, above the stat chips. Compact
// strip on the home (last ~4 months); "View year" opens a full 52-week sheet.
// Amber ramp only — same accent language as the rest of the panel.

import { useState } from "react";
import { X } from "lucide-react";
import { buildHeatmapGrid, type ContributionDays } from "@/lib/contributions";

const LEVEL_BG = [
  "rgba(255,255,255,0.06)", // 0 — empty day
  "#5c3f12",
  "#97661a",
  "#d18f1f",
  "#f5a623",
];

function Heatmap({ byDay, weeks, cellRadius = 2 }: {
  byDay: ContributionDays["byDay"]; weeks: number; cellRadius?: number;
}) {
  const grid = buildHeatmapGrid(byDay, weeks);
  return (
    <div className="flex gap-[3px] w-full">
      {grid.map((col, i) => (
        <div key={i} className="flex flex-1 flex-col gap-[3px] min-w-0">
          {col.map((cell) => (
            <div
              key={cell.key}
              title={`${cell.key} · ${cell.count}`}
              className="w-full aspect-square"
              style={{ background: LEVEL_BG[cell.level], borderRadius: cellRadius }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function ContributionsCard({ data, accent }: {
  data: ContributionDays | null;
  accent: string;
}) {
  const [showYear, setShowYear] = useState(false);
  const byDay = data?.byDay ?? new Map<string, number>();

  return (
    <>
      <div
        className="rounded-2xl border px-4 pt-3 pb-2.5"
        style={{ borderColor: `${accent}26`, background: `${accent}0a` }}
      >
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: `${accent}80` }}>
            Contributions
          </p>
          {(data?.streak ?? 0) > 1 && (
            <p className="text-[11px] font-extrabold" style={{ color: accent }}>
              🔥 {data!.streak}
            </p>
          )}
        </div>

        <Heatmap byDay={byDay} weeks={17} />

        <div className="flex items-center justify-between mt-2.5">
          <p className="text-[10px] text-zinc-500">
            <span className="font-extrabold text-zinc-200 tabular-nums">{data?.totalYear ?? 0}</span> this year
          </p>
          <button
            type="button"
            onClick={() => setShowYear(true)}
            className="text-[10px] font-bold transition hover:brightness-110"
            style={{ color: accent }}
          >
            View year →
          </button>
        </div>
      </div>

      {/* Full-year sheet */}
      {showYear && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
          onClick={() => setShowYear(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-white/10 bg-zinc-950 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-extrabold text-white">Your year</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {data?.totalYear ?? 0} contributions · projects, quotes, clients, posts &amp; feedback
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowYear(false)}
                className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition"
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>

            {/* 52 weeks — scrolls horizontally, newest at the right */}
            <div className="overflow-x-auto pb-1" style={{ direction: "rtl" }}>
              <div style={{ direction: "ltr", minWidth: 640 }}>
                <Heatmap byDay={byDay} weeks={52} cellRadius={2} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-1.5 mt-3">
              <span className="text-[9px] text-zinc-600">Less</span>
              {LEVEL_BG.map((bg, i) => (
                <span key={i} className="inline-block h-[9px] w-[9px] rounded-[2px]" style={{ background: bg }} />
              ))}
              <span className="text-[9px] text-zinc-600">More</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
