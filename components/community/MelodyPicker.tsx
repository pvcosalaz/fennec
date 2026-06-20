"use client";
import { useEffect, useState } from "react";
import { X, Music2, Play } from "lucide-react";
import { openDB } from "idb";
import { uploadAudio } from "@/lib/communityDb";

type Recording = { id: string; title: string; blob: Blob; duration: number; createdAt: number };

type Props = {
  onSelect: (url: string, name: string) => void;
  onClose: () => void;
};

async function loadRecordings(): Promise<Recording[]> {
  try {
    const db = await openDB("fennec-ideas-db", 2);
    if (!db.objectStoreNames.contains("recordings")) return [];
    return db.getAll("recordings");
  } catch {
    return [];
  }
}

export default function MelodyPicker({ onSelect, onClose }: Props) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [uploading, setUploading]   = useState<string | null>(null);

  useEffect(() => {
    loadRecordings().then((r) => setRecordings(r.sort((a, b) => b.createdAt - a.createdAt)));
  }, []);

  async function handleSelect(rec: Recording) {
    setUploading(rec.id);
    try {
      const url = await uploadAudio(rec.blob, `${rec.title}.webm`);
      onSelect(url, rec.title);
      onClose();
    } catch (err) {
      console.error("Upload failed", err);
      alert("Error subiendo el audio. Intenta de nuevo.");
    } finally {
      setUploading(null);
    }
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose}>
      <div
        className="w-full rounded-t-3xl bg-zinc-950 border-t border-white/10 p-4 space-y-3"
        style={{ maxHeight: "70vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Melody Bank</span>
          <button onClick={onClose}><X className="h-5 w-5 text-zinc-500" /></button>
        </div>

        {recordings.length === 0 && (
          <p className="text-sm text-zinc-600 text-center py-8">
            You don't have any recordings in your Melody Bank yet.
          </p>
        )}

        <div className="space-y-2 overflow-y-auto" style={{ maxHeight: "55vh" }}>
          {recordings.map((rec) => (
            <button
              key={rec.id}
              onClick={() => handleSelect(rec)}
              disabled={!!uploading}
              className="w-full flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-left hover:bg-white/[0.06] transition disabled:opacity-50"
            >
              <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                {uploading === rec.id
                  ? <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                  : <Play className="h-4 w-4 text-amber-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">{rec.title}</p>
                <p className="text-xs text-zinc-600">{fmt(rec.duration)}</p>
              </div>
              <Music2 className="h-4 w-4 text-zinc-700 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
