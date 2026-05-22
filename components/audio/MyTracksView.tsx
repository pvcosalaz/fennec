"use client";
import { useEffect, useRef, useState } from "react";
import { Upload, Trash2, Lock } from "lucide-react";
import {
  fetchUserReviews,
  createReview,
  deleteReview,
  countUserReviews,
  uploadReviewAudio,
  uploadReviewArtwork,
} from "@/lib/audioDb";
import type { ProjectReview, TrackCategory } from "@/lib/audioTypes";
import { TRACK_CATEGORIES, CATEGORY_COLORS } from "@/lib/audioTypes";

const MAX_TRACKS = 10;
const MAX_FILE_MB = 100;

type Props = {
  userId: string;
  isPro: boolean;
};

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    const cleanup = () => URL.revokeObjectURL(url);
    const timeout = setTimeout(() => { cleanup(); resolve(0); }, 10_000);
    audio.onloadedmetadata = () => {
      clearTimeout(timeout);
      resolve(Math.round(audio.duration));
      cleanup();
    };
    audio.onerror = () => { clearTimeout(timeout); resolve(0); cleanup(); };
  });
}

export default function MyTracksView({ userId, isPro }: Props) {
  const [tracks, setTracks]       = useState<ProjectReview[]>([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const audioInputRef             = useRef<HTMLInputElement>(null);
  const artInputRef               = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle]         = useState("");
  const [category, setCategory]   = useState<TrackCategory>("Demo");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [artFile, setArtFile]     = useState<File | null>(null);
  const [showForm, setShowForm]   = useState(false);

  useEffect(() => {
    if (!isPro) { setLoading(false); return; }
    fetchUserReviews(userId)
      .then(setTracks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId, isPro]);

  async function handleUpload() {
    if (!audioFile || !title.trim()) return;

    const fileMB = audioFile.size / 1024 / 1024;
    if (fileMB > MAX_FILE_MB) {
      setError(`File too large. Max ${MAX_FILE_MB} MB.`);
      return;
    }

    const count = await countUserReviews(userId);
    if (count >= MAX_TRACKS) {
      setError(`You've reached the limit of ${MAX_TRACKS} active tracks.`);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const [audioUrl, artworkUrl, durationSeconds] = await Promise.all([
        uploadReviewAudio(userId, audioFile),
        artFile ? uploadReviewArtwork(userId, artFile) : Promise.resolve(null),
        getAudioDuration(audioFile),
      ]);

      const review = await createReview({
        userId,
        title: title.trim(),
        category,
        audioUrl,
        artworkUrl,
        durationSeconds,
      });

      setTracks((prev) => [review, ...prev]);
      setTitle("");
      setCategory("Demo");
      setAudioFile(null);
      setArtFile(null);
      setShowForm(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      setError(`Upload failed: ${msg}`);
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this track? This cannot be undone.")) return;
    try {
      await deleteReview(id);
      setTracks((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setError("Could not delete track. Please try again.");
    }
  }

  if (!isPro) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-4">
        <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center">
          <Lock className="h-6 w-6 text-amber-500" />
        </div>
        <p className="text-sm font-semibold text-white">Pro Feature</p>
        <p className="text-xs text-zinc-500 max-w-xs">
          Upgrade to Pro to submit tracks for community review. Free users can still listen and leave feedback.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          disabled={tracks.length >= MAX_TRACKS}
          className="w-full h-12 rounded-xl border border-dashed border-white/20 flex items-center justify-center gap-2 text-sm text-zinc-400 hover:border-amber-500/50 hover:text-amber-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Upload className="h-4 w-4" />
          Share your music with the community for feedback
          {tracks.length >= MAX_TRACKS && ` (${MAX_TRACKS}/${MAX_TRACKS})`}
        </button>
      )}

      {/* Upload form */}
      {showForm && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <p className="text-sm font-semibold text-white">New Track</p>

          <input
            type="text"
            placeholder="Track title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
            className="w-full h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-amber-500"
          />

          {/* Category select */}
          <div className="flex flex-wrap gap-2">
            {TRACK_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${
                  category === cat
                    ? "border-amber-500 bg-amber-500/20 text-amber-400"
                    : "border-white/10 bg-white/5 text-zinc-500"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Audio file */}
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
          />
          <button
            onClick={() => audioInputRef.current?.click()}
            className="w-full h-10 rounded-xl border border-white/10 bg-white/5 text-sm text-zinc-400 hover:text-white transition flex items-center justify-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {audioFile ? audioFile.name : "Select audio file (WAV, MP3, AIFF...)"}
          </button>

          {/* Artwork file */}
          <input
            ref={artInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setArtFile(e.target.files?.[0] ?? null)}
          />
          <button
            onClick={() => artInputRef.current?.click()}
            className="w-full h-10 rounded-xl border border-white/10 bg-white/5 text-sm text-zinc-400 hover:text-white transition flex items-center justify-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {artFile ? artFile.name : "Artwork (optional)"}
          </button>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={() => { setShowForm(false); setError(null); }}
              className="flex-1 h-10 rounded-xl border border-white/10 text-sm text-zinc-500 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!audioFile || !title.trim() || uploading}
              className="flex-[2] h-10 rounded-xl bg-amber-500 text-black text-sm font-bold disabled:opacity-40 transition hover:bg-amber-400"
            >
              {uploading ? "Uploading..." : "Submit"}
            </button>
          </div>
        </div>
      )}

      {/* Track list */}
      {loading && (
        <p className="text-xs text-zinc-600 text-center py-8">Loading your tracks...</p>
      )}
      {!loading && tracks.length === 0 && !showForm && (
        <p className="text-xs text-zinc-600 text-center py-8">
          No tracks submitted yet. Hit the button above to get feedback from the community.
        </p>
      )}
      {tracks.map((track) => (
        <div
          key={track.id}
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
        >
          <div
            className="w-11 h-11 rounded-xl shrink-0 overflow-hidden flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #1e1e2e, #2d1b69)" }}
          >
            {track.artwork_url
              ? <img src={track.artwork_url} className="w-full h-full object-cover" alt="" />
              : <span className="text-lg">🎵</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{track.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${CATEGORY_COLORS[track.category]}`}>
                {track.category}
              </span>
              <span className="text-[10px] text-zinc-600">{fmt(track.duration_seconds)}</span>
              <span className="text-[10px] text-zinc-600">· {track.comment_count ?? 0} comments</span>
            </div>
          </div>
          <button
            onClick={() => handleDelete(track.id)}
            className="p-2 rounded-lg text-zinc-700 hover:text-red-400 transition"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
