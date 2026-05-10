"use client";

import { ArrowLeft, Calendar, Trash2 } from "lucide-react";
import type { Brief } from "@/lib/contentData";

type Props = {
  brief: Brief;
  onClose: () => void;
  onDelete: (id: string) => void;
  onSchedule: (title: string, notes?: string) => void;
};

export default function ScriptDetailOverlay({ brief, onClose, onDelete, onSchedule }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-white/5 shrink-0">
        <button
          onClick={onClose}
          className="h-9 w-9 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <p className="text-xs text-zinc-500 uppercase tracking-widest">Script</p>
        </div>
        <button
          onClick={() => { onDelete(brief.id); onClose(); }}
          className="h-9 w-9 rounded-xl bg-white/5 flex items-center justify-center text-zinc-600 hover:text-red-400 transition"
          aria-label="Delete script"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">

        {/* Format + Line tags */}
        <div className="flex flex-wrap gap-2">
          {brief.formatName && (
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold text-black"
              style={{ backgroundColor: brief.formatColor || "#f5a623" }}
            >
              {brief.formatName}
            </span>
          )}
          {brief.lineName && (
            <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-400">
              {brief.lineName}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white leading-snug">{brief.title}</h1>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/5" />
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Script</p>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        {/* Script body */}
        {brief.script ? (
          <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">{brief.script}</p>
        ) : (
          <p className="text-sm text-zinc-600 italic">No script written yet.</p>
        )}

      </div>

      {/* Bottom action */}
      <div className="px-4 pb-8 pt-3 border-t border-white/5 shrink-0">
        <button
          onClick={() => onSchedule(brief.title, brief.script || undefined)}
          className="w-full h-12 rounded-2xl bg-amber-400 text-black font-bold flex items-center justify-center gap-2 transition hover:brightness-105 active:scale-[0.98]"
        >
          <Calendar size={16} />
          Schedule this content
        </button>
      </div>

    </div>
  );
}
