"use client";

import { useState } from "react";
import { ArrowLeft, Calendar, Trash2, Pencil, Check } from "lucide-react";
import type { Brief } from "@/lib/contentData";

type ContentTask = { id: string; title: string; date: string; source: string };

type Props = {
  brief: Brief;
  onClose: () => void;
  onDelete: (id: string) => void;
  onSchedule: (title: string, notes?: string) => void;
  onUpdate: (id: string, title: string, script: string, newDate?: string) => void;
  scheduledTask: ContentTask | null;
};

export default function ScriptDetailOverlay({ brief, onClose, onDelete, onSchedule, onUpdate, scheduledTask }: Props) {
  const [editing, setEditing] = useState(false);
  const [title,   setTitle]   = useState(brief.title);
  const [script,  setScript]  = useState(brief.script ?? "");
  const [date,    setDate]    = useState(scheduledTask?.date ?? "");
  const [saved,   setSaved]   = useState(false);

  function handleSave() {
    if (!title.trim()) return;
    onUpdate(brief.id, title.trim(), script.trim(), date || undefined);
    setSaved(true);
    setTimeout(() => { setSaved(false); setEditing(false); }, 800);
  }

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-white/5 shrink-0">
        <button
          onClick={editing ? () => { setEditing(false); setTitle(brief.title); setScript(brief.script ?? ""); } : onClose}
          className="h-9 w-9 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <p className="text-xs text-zinc-500 uppercase tracking-widest">
            {editing ? "Editing Script" : "Script"}
          </p>
        </div>

        {editing ? (
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="px-4 py-2 rounded-xl bg-accent text-black text-sm font-bold disabled:opacity-30 transition flex items-center gap-1.5"
          >
            {saved ? <Check size={14} /> : null}
            {saved ? "Saved" : "Save"}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing(true)}
              className="h-9 w-9 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition"
              aria-label="Edit script"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={() => { onDelete(brief.id); onClose(); }}
              className="h-9 w-9 rounded-xl bg-white/5 flex items-center justify-center text-zinc-600 hover:text-red-400 transition"
              aria-label="Delete script"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
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

        {editing ? (
          <>
            {/* Title input */}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-bold placeholder-zinc-600 focus:outline-none focus:border-accent/50"
            />

            {/* Date picker */}
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <Calendar size={15} className="text-zinc-500 shrink-0" />
              <div className="flex-1">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-0.5">Publish date</p>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-transparent text-sm text-white focus:outline-none w-full"
                />
              </div>
              {date && (
                <button onClick={() => setDate("")} className="text-zinc-600 hover:text-red-400 text-xs transition">✕</button>
              )}
            </div>

            {/* Script textarea */}
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Write your script here..."
              rows={14}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-zinc-200 placeholder-zinc-600 leading-relaxed resize-none focus:outline-none focus:border-accent/50"
              style={{ fontFamily: "Courier, 'Courier New', monospace", fontSize: "12px" }}
            />
          </>
        ) : (
          <>
            {/* Title */}
            <h1 className="text-2xl font-bold text-white leading-snug">{title}</h1>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/5" />
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Script</p>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            {/* Script body */}
            {script ? (
              <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">{script}</p>
            ) : (
              <p className="text-sm text-zinc-600 italic">No script written yet.</p>
            )}
          </>
        )}
      </div>

      {/* Bottom action */}
      {!editing && (
        <div className="px-4 pb-8 pt-3 border-t border-white/5 shrink-0">
          <button
            onClick={() => onSchedule(title, script || undefined)}
            className="w-full h-12 rounded-2xl bg-amber-400 text-black font-bold flex items-center justify-center gap-2 transition hover:brightness-105 active:scale-[0.98]"
          >
            <Calendar size={16} />
            Schedule this content
          </button>
        </div>
      )}

    </div>
  );
}
