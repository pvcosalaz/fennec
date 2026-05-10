"use client";

import { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";

type VideoRef = {
  title: string;
  channel: string;
  angle: string;
  why: string;
  url: string;
  thumbnail: string;
};

type Props = {
  videoRef: VideoRef;
  onSave: (title: string, script: string) => void;
  onClose: () => void;
};

export default function ScriptWriterOverlay({ videoRef, onSave, onClose }: Props) {
  const [title,  setTitle]  = useState("");
  const [script, setScript] = useState("");
  const [saved,  setSaved]  = useState(false);

  function handleSave() {
    if (!title.trim()) return;
    setSaved(true);
    setTimeout(() => {
      onSave(title.trim(), script.trim());
    }, 600);
  }

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-white/5 shrink-0">
        <button
          onClick={onClose}
          className="h-9 w-9 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <p className="text-xs text-zinc-500 uppercase tracking-widest">Write Script</p>
        </div>
        {saved ? (
          <div className="h-9 w-9 rounded-xl bg-accent/20 flex items-center justify-center">
            <Check size={16} className="text-accent" />
          </div>
        ) : (
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="px-4 py-2 rounded-xl bg-accent text-black text-sm font-bold disabled:opacity-30 transition"
          >
            Save
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">

        {/* ── Reference card ── */}
        <div className="rounded-2xl overflow-hidden border border-white/10">
          {/* Thumbnail strip — video reference */}
          {videoRef.thumbnail ? (
            <div className="relative h-28 w-full">
              <img
                src={videoRef.thumbnail}
                alt={videoRef.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-2 left-3 right-3">
                <p className="text-white text-xs font-semibold line-clamp-2 leading-snug">{videoRef.title}</p>
                <p className="text-zinc-400 text-[10px] mt-0.5">{videoRef.channel}</p>
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 bg-zinc-900">
              <p className="text-white text-sm font-semibold leading-snug">{videoRef.title}</p>
            </div>
          )}

          {/* Angle */}
          <div className="bg-amber-400/8 px-4 py-3 space-y-2 border-t border-amber-400/15">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
              Your angle
            </p>
            <p className="text-sm text-white leading-relaxed">{videoRef.angle}</p>
          </div>

        </div>

        {/* ── Divider ── */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/5" />
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Your script</p>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        {/* ── Title field ── */}
        <div className="space-y-1.5">
          <p className="text-xs text-zinc-500">Title / Hook</p>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's your content idea?"
            className="w-full h-12 rounded-2xl border border-white/10 bg-zinc-900 px-4 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-purple-400/50 transition"
            autoFocus
          />
        </div>

        {/* ── Script textarea ── */}
        <div className="space-y-1.5">
          <p className="text-xs text-zinc-500">Script / Notes</p>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder={`Use the angle above as your starting point.\n\nWrite your hook, structure, and key points here...`}
            rows={10}
            className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-purple-400/50 transition resize-none leading-relaxed"
          />
        </div>

        {/* Watch source — only if URL exists */}
        {videoRef.url && (
          <a
            href={videoRef.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 transition"
          >
            Watch original on YouTube →
          </a>
        )}

      </div>
    </div>
  );
}
