"use client";
import { useState } from "react";
import type { ReactNode } from "react";
import { X, Send } from "lucide-react";

type Props = {
  onSubmit: (body: string, timestampSeconds: number | null) => Promise<void>;
  onClose: () => void;
};

// Detects first MM:SS or H:MM:SS pattern in text
export function extractFirstTimestamp(text: string): number | null {
  const match = text.match(/\b(\d{1,2}):([0-5]\d)(?::([0-5]\d))?\b/);
  if (!match) return null;
  const hours   = match[3] !== undefined ? parseInt(match[1], 10) : 0;
  const minutes = match[3] !== undefined ? parseInt(match[2], 10) : parseInt(match[1], 10);
  const seconds = match[3] !== undefined ? parseInt(match[3], 10) : parseInt(match[2], 10);
  return hours * 3600 + minutes * 60 + seconds;
}

// Renders comment body with amber hyperlink timestamps
export function renderBodyWithTimestamps(
  body: string,
  onSeek: (seconds: number) => void
): ReactNode {
  const parts = body.split(/(\b\d{1,2}:[0-5]\d(?::[0-5]\d)?\b)/g);
  return parts.map((part, i) => {
    if (/^\d{1,2}:[0-5]\d(?::[0-5]\d)?$/.test(part)) {
      const ts = extractFirstTimestamp(part);
      if (ts !== null) {
        return (
          <button
            key={i}
            onClick={() => onSeek(ts)}
            className="text-amber-400 font-semibold underline underline-offset-2"
          >
            {part}
          </button>
        );
      }
    }
    return <span key={i}>{part}</span>;
  });
}

export default function ReviewFeedback({ onSubmit, onClose }: Props) {
  const [body, setBody]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleSubmit() {
    const trimmed = body.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const ts = extractFirstTimestamp(trimmed);
      await onSubmit(trimmed, ts);
      onClose();
    } catch {
      setError("Failed to post. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-3xl bg-zinc-950 border-t border-white/10 p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — close + post always visible above keyboard */}
        <div className="flex items-center justify-between">
          <button onClick={onClose}>
            <X className="h-5 w-5 text-zinc-500" />
          </button>
          <p className="text-sm font-semibold text-white">Leave Feedback</p>
          <button
            onClick={handleSubmit}
            disabled={!body.trim() || loading}
            className="text-sm font-semibold text-amber-400 disabled:opacity-30 transition"
          >
            {loading ? "Posting…" : "Post"}
          </button>
        </div>
        <p className="text-xs text-zinc-600">
          Mention a timestamp like <span className="text-amber-400">2:32</span> and it becomes a clickable link.
        </p>
        <textarea
          autoFocus
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="The drop at 1:20 could use more bass..."
          rows={4}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-amber-500 resize-none"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </div>
  );
}
