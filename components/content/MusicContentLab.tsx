"use client";

import { useState } from "react";
import { Plus, Trash2, X, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  CONTENT_LINES_KEY, CONTENT_FORMATS_KEY,
  DEFAULT_LINES, DEFAULT_FORMATS,
  type ContentLine, type ContentFormat,
} from "@/lib/contentData";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

type VideoRef = {
  title: string;
  channel: string;
  angle: string;
  why: string;
  url: string;
  thumbnail: string;
};

type Props = {
  onClose: () => void;
  onGenerateScript: (ref: VideoRef) => void;
};

type View = "matrix" | "add-format" | "add-line";

export default function MusicContentLab({ onClose, onGenerateScript }: Props) {
  const [formats, setFormats] = useState<ContentFormat[]>(() =>
    loadFromStorage(CONTENT_FORMATS_KEY, DEFAULT_FORMATS)
  );
  const [lines, setLines] = useState<ContentLine[]>(() =>
    loadFromStorage(CONTENT_LINES_KEY, DEFAULT_LINES)
  );

  const [selectedFormat, setSelectedFormat] = useState<ContentFormat | null>(null);
  const [selectedLine, setSelectedLine]     = useState<ContentLine   | null>(null);
  const [view, setView]       = useState<View>("matrix");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError]     = useState<string | null>(null);

  async function handleGenerate() {
    if (!selectedFormat || !selectedLine) return;
    setGenerating(true);
    setGenError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/lab-idea", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ format: selectedFormat.name, line: selectedLine.name }),
      });
      const data = await res.json() as { angle?: string; why?: string; error?: string };
      if (data.error || !data.angle) throw new Error(data.error ?? "No response");
      onGenerateScript({
        title: `${selectedFormat.name} — ${selectedLine.name}`,
        channel: selectedFormat.name,
        angle: data.angle,
        why: data.why ?? "",
        url: "",
        thumbnail: "",
      });
    } catch {
      setGenError("Couldn't generate idea. Try again.");
    } finally {
      setGenerating(false);
    }
  }

  // Add form state
  const [newName, setNewName] = useState("");

  function addFormat() {
    const name = newName.trim();
    if (!name) return;
    const color = `hsl(${Math.floor(Math.random() * 360)}, 65%, 55%)`;
    const updated = [...formats, { id: uid(), name, color }];
    setFormats(updated);
    saveToStorage(CONTENT_FORMATS_KEY, updated);
    setNewName("");
    setView("matrix");
  }

  function addLine() {
    const name = newName.trim();
    if (!name) return;
    const updated = [...lines, { id: uid(), name }];
    setLines(updated);
    saveToStorage(CONTENT_LINES_KEY, updated);
    setNewName("");
    setView("matrix");
  }

  function deleteFormat(id: string) {
    const updated = formats.filter((f) => f.id !== id);
    setFormats(updated);
    saveToStorage(CONTENT_FORMATS_KEY, updated);
    if (selectedFormat?.id === id) setSelectedFormat(null);
  }

  function deleteLine(id: string) {
    const updated = lines.filter((l) => l.id !== id);
    setLines(updated);
    saveToStorage(CONTENT_LINES_KEY, updated);
    if (selectedLine?.id === id) setSelectedLine(null);
  }

  const combination = selectedFormat && selectedLine
    ? `${selectedFormat.name} — ${selectedLine.name}`
    : null;

  // ── Add views ────────────────────────────────────────────────────────────────
  if (view === "add-format" || view === "add-line") {
    const isFormat = view === "add-format";
    return (
      <div className="flex flex-col bg-zinc-950 text-white">
        <div className="flex items-center gap-3 px-4 pt-5 pb-4 border-b border-white/5 shrink-0">
          <button
            onClick={() => { setView("matrix"); setNewName(""); }}
            className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition"
          >
            <X size={15} />
          </button>
          <p className="text-sm font-semibold text-white">
            {isFormat ? "New Format" : "New Content Line"}
          </p>
        </div>
        <div className="px-4 py-6 space-y-4">
          <p className="text-xs text-zinc-500">
            {isFormat
              ? "How you present the content, e.g. B-roll, Reel, Podcast clip"
              : "The topic or template. Use X as a variable, e.g. \"How X would sound like X\""}
          </p>
          <input
            type="text"
            value={newName}
            autoFocus
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (isFormat ? addFormat() : addLine())}
            placeholder={isFormat ? "e.g. YouTube Short" : "e.g. How X would sound like X"}
            className="w-full h-11 rounded-2xl border border-white/10 bg-zinc-900 px-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-amber-400/50 transition"
          />
          <button
            onClick={isFormat ? addFormat : addLine}
            disabled={!newName.trim()}
            className="w-full h-11 rounded-2xl bg-amber-400 text-black text-sm font-bold disabled:opacity-30 transition"
          >
            Add
          </button>
        </div>
      </div>
    );
  }

  // ── Main matrix view ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-zinc-950 text-white">

      {/* Header */}
      <div className="px-4 pt-3 pb-3 shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Music Content Lab</p>
        <p className="text-xs text-zinc-500 mt-0.5">Pick a format + a content line to combine.</p>
      </div>

      {/* Combination result */}
      {combination ? (
        <div className="mx-4 mb-3 rounded-2xl bg-amber-400/10 border border-amber-400/30 px-4 py-3 flex items-center gap-3">
          <div
            className="h-8 w-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: selectedFormat!.color }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-0.5">Your idea</p>
            <p className="text-sm text-white leading-snug">{combination}</p>
          </div>
          <button
            onClick={() => { setSelectedFormat(null); setSelectedLine(null); }}
            className="text-zinc-600 hover:text-zinc-400 transition flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="mx-4 mb-3 rounded-2xl border border-white/5 bg-zinc-900/50 px-4 py-3 flex items-center gap-2">
          <div className="flex items-center gap-2 text-zinc-600 text-xs">
            <span className={`px-2 py-0.5 rounded-full border ${selectedFormat ? "border-amber-400/50 text-amber-400" : "border-white/10"}`}>
              {selectedFormat ? selectedFormat.name : "Format"}
            </span>
            <ArrowRight size={12} />
            <span className={`px-2 py-0.5 rounded-full border ${selectedLine ? "border-amber-400/50 text-amber-400" : "border-white/10"}`}>
              {selectedLine ? selectedLine.name : "Content line"}
            </span>
          </div>
        </div>
      )}

      {/* Generate button */}
      {selectedFormat && selectedLine && (
        <div className="mx-4 mb-1 space-y-2">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full h-11 rounded-2xl bg-amber-400 text-black text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition"
          >
            {generating ? (
              <><Loader2 size={16} className="animate-spin" /> Generating...</>
            ) : (
              "Generate & Write Script"
            )}
          </button>
          {genError && <p className="text-xs text-red-400 text-center">{genError}</p>}
        </div>
      )}

      {/* Two-column matrix */}
      <div className="flex gap-0" style={{ minHeight: 0 }}>

        {/* LEFT — Formats */}
        <div className="flex flex-col w-1/2 border-r border-white/5">
          <div className="flex items-center justify-between px-3 py-2 sticky top-0 bg-zinc-950 z-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Formats</p>
            <button
              onClick={() => { setView("add-format"); setNewName(""); }}
              className="h-5 w-5 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition"
            >
              <Plus size={11} />
            </button>
          </div>
          <div className="flex flex-col gap-1 px-2 pb-4">
            {formats.map((fmt) => {
              const isSelected = selectedFormat?.id === fmt.id;
              return (
                <button
                  key={fmt.id}
                  onClick={() => setSelectedFormat(isSelected ? null : fmt)}
                  className={`group flex items-center gap-2 rounded-xl px-2.5 py-2.5 text-left transition ${
                    isSelected ? "bg-zinc-800" : "hover:bg-zinc-900"
                  }`}
                >
                  <div
                    className="h-full w-1 rounded-full flex-shrink-0 self-stretch min-h-[2rem]"
                    style={{ backgroundColor: fmt.color }}
                  />
                  <span className={`text-xs leading-snug flex-1 ${isSelected ? "text-white font-medium" : "text-zinc-400"}`}>
                    {fmt.name}
                  </span>
                  {!fmt.isDefault && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteFormat(fmt.id); }}
                      className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition flex-shrink-0"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT — Content Lines */}
        <div className="flex flex-col w-1/2">
          <div className="flex items-center justify-between px-3 py-2 sticky top-0 bg-zinc-950 z-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Content Lines</p>
            <button
              onClick={() => { setView("add-line"); setNewName(""); }}
              className="h-5 w-5 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition"
            >
              <Plus size={11} />
            </button>
          </div>
          <div className="flex flex-col gap-1 px-2 pb-4">
            {lines.map((line) => {
              const isSelected = selectedLine?.id === line.id;
              return (
                <button
                  key={line.id}
                  onClick={() => setSelectedLine(isSelected ? null : line)}
                  className={`group flex items-start gap-2 rounded-xl px-2.5 py-2.5 text-left transition ${
                    isSelected ? "bg-zinc-800" : "hover:bg-zinc-900"
                  }`}
                >
                  <span className={`text-xs leading-snug flex-1 ${isSelected ? "text-white font-medium" : "text-zinc-400"}`}>
                    {line.name}
                  </span>
                  {!line.isDefault && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteLine(line.id); }}
                      className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition flex-shrink-0 mt-0.5"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
