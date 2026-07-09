"use client";
import { useEffect, useRef, useState } from "react";
import { Upload, Trash2, ChevronDown, Zap } from "lucide-react";
import {
  fetchUserReviews,
  createReview,
  deleteReview,
  countUserReviews,
  uploadReviewAudio,
  uploadReviewArtwork,
  fetchReviewComments,
  fetchKarma,
  stampComment,
} from "@/lib/audioDb";
import type { ProjectReview, ReviewComment, TrackCategory } from "@/lib/audioTypes";
import { TRACK_CATEGORIES, CATEGORY_COLORS } from "@/lib/audioTypes";
import { UPLOAD_COST, STAMP_REWARD, PRO_FREE_PER_MONTH, KARMA_PACK } from "@/lib/karma";
import { supabase } from "@/lib/supabase";

const MAX_TRACKS = 10;
const MAX_FILE_MB = 100;

const AMBER = "#f5a623";
const SERIF_FONT = 'var(--font-tape-serif, "Newsreader", Georgia, serif)';
const MONO_FONT  = 'var(--font-tape-mono, "Space Mono", monospace)';

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
  const [karma, setKarma]         = useState<number | null>(null);
  const audioInputRef             = useRef<HTMLInputElement>(null);
  const artInputRef               = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle]         = useState("");
  const [category, setCategory]   = useState<TrackCategory>("Demo");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [artFile, setArtFile]     = useState<File | null>(null);
  const [showForm, setShowForm]   = useState(false);

  // Expanded track → its comments (the artist's reading room, where stamps happen)
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [comments, setComments]       = useState<Record<string, ReviewComment[]>>({});
  const [loadingComments, setLoadingComments] = useState(false);
  const [stamping, setStamping]       = useState<string | null>(null);
  const [buying, setBuying]           = useState(false);
  // per-comment note when a seal landed but didn't pay karma (anti-farm caps)
  const [stampNotes, setStampNotes]   = useState<Record<string, string>>({});

  useEffect(() => {
    fetchUserReviews(userId)
      .then(setTracks)
      .catch(console.error)
      .finally(() => setLoading(false));
    fetchKarma(userId).then(setKarma).catch(() => {});
  }, [userId]);

  /* ── karma math ─────────────────────────────────────────────── */
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthlyUploads = tracks.filter((t) => new Date(t.created_at) >= monthStart).length;
  const proFreeLeft = isPro ? Math.max(0, PRO_FREE_PER_MONTH - monthlyUploads) : 0;
  const uploadIsFree = isPro && proFreeLeft > 0;
  // karma === null → economy not live yet (migration pending): don't block client-side
  const canAfford = uploadIsFree || karma === null || karma >= UPLOAD_COST;

  async function toggleExpand(trackId: string) {
    if (expandedId === trackId) { setExpandedId(null); return; }
    setExpandedId(trackId);
    if (!comments[trackId]) {
      setLoadingComments(true);
      try {
        const list = await fetchReviewComments(trackId);
        setComments((prev) => ({ ...prev, [trackId]: list }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingComments(false);
      }
    }
  }

  async function buyKarma() {
    setBuying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch("/api/karma/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url; // → Stripe Checkout
        return; // keep the spinner while the browser navigates away
      }
      setBuying(false);
    } catch (err) {
      console.error("[buyKarma]", err);
      setBuying(false);
    }
  }

  async function handleStamp(trackId: string, commentId: string) {
    setStamping(commentId);
    const result = await stampComment(commentId);
    if (result.ok) {
      setComments((prev) => ({
        ...prev,
        [trackId]: (prev[trackId] ?? []).map((c) =>
          c.id === commentId ? { ...c, stamped: true } : c
        ),
      }));
      if (!result.karmaPaid) {
        const note =
          result.reason === "track_already_paid"
            ? "Sealed. Karma was already paid to this producer on this tape (1 payout per producer per track)."
            : result.reason === "weekly_cap"
            ? "Sealed. Weekly karma cap with this producer reached (max 3 payouts per week). The seal still shows."
            : "Sealed. No karma paid this time.";
        setStampNotes((prev) => ({ ...prev, [commentId]: note }));
      }
    }
    setStamping(null);
  }

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
      fetchKarma(userId).then(setKarma).catch(() => {}); // reflect the −5
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      if (msg.includes("NOT_ENOUGH_KARMA")) {
        setError(`You need ${UPLOAD_COST} karma to upload. Earn it when artists seal your marks, or grab a karma pack.`);
      } else {
        setError(`Upload failed: ${msg}`);
      }
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

  return (
    <div className="space-y-4">
      {/* ── karma header — the wallet ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {karma !== null && (
          <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold"
            style={{ fontFamily: MONO_FONT, color: AMBER, border: "1px solid rgba(245,166,35,.35)", background: "rgba(245,166,35,.08)" }}>
            <Zap className="h-3 w-3" /> {karma} karma
          </span>
        )}
        {karma !== null && (
          <button
            onClick={buyKarma}
            disabled={buying}
            className="rounded-full px-3 py-1.5 text-[10px] font-bold transition active:scale-95 disabled:opacity-50 hover:border-amber-500/60"
            style={{ fontFamily: MONO_FONT, color: "rgba(255,255,255,.6)", border: "1px solid rgba(255,255,255,.15)" }}
          >
            {buying ? "…" : `+${KARMA_PACK.karma} karma · ${KARMA_PACK.label}`}
          </button>
        )}
        {isPro && (
          <span className="rounded-full px-3 py-1.5 text-[10px]"
            style={{ fontFamily: MONO_FONT, color: "rgba(255,255,255,.55)", border: "1px solid rgba(255,255,255,.12)" }}>
            Pro · {proFreeLeft}/{PRO_FREE_PER_MONTH} free uploads this month
          </span>
        )}
      </div>

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
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">New Track</p>
            <span className="text-[10px]" style={{ fontFamily: MONO_FONT, color: uploadIsFree ? "rgba(255,255,255,.5)" : AMBER }}>
              {uploadIsFree ? `free · Pro (${proFreeLeft} left this month)` : `costs ${UPLOAD_COST} karma`}
            </span>
          </div>

          <input
            type="text"
            placeholder="Track title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
            className="w-full h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-amber-500"
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

          {!canAfford && (
            <div className="space-y-2">
              <p className="text-[11px]" style={{ fontFamily: MONO_FONT, color: "rgba(255,255,255,.45)" }}>
                You have {karma} karma — you need {UPLOAD_COST}. Earn +{STAMP_REWARD} each time an artist seals one of your marks, or grab a pack:
              </p>
              <button
                onClick={buyKarma}
                disabled={buying}
                className="rounded-xl px-3 py-2 text-[11px] font-bold transition active:scale-95 disabled:opacity-50"
                style={{ fontFamily: MONO_FONT, color: AMBER, border: "1px solid rgba(245,166,35,.4)", background: "rgba(245,166,35,.08)" }}
              >
                {buying ? "Opening checkout…" : `Get ${KARMA_PACK.karma} karma · ${KARMA_PACK.label}`}
              </button>
            </div>
          )}
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
              disabled={!audioFile || !title.trim() || uploading || !canAfford}
              className="flex-[2] h-10 rounded-xl bg-amber-500 text-black text-sm font-bold disabled:opacity-40 transition hover:bg-amber-400"
            >
              {uploading ? "Uploading..." : uploadIsFree ? "Submit (free)" : `Submit · −${UPLOAD_COST} karma`}
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
      {tracks.map((track) => {
        const expanded = expandedId === track.id;
        const list = comments[track.id] ?? [];
        return (
          <div key={track.id} className="rounded-2xl border border-white/10 bg-white/[0.03]">
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer"
              onClick={() => toggleExpand(track.id)}
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
                  <span className="text-[10px] text-zinc-600">· {track.comment_count ?? 0} marks</span>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(track.id); }}
                className="p-2 rounded-lg text-zinc-700 hover:text-red-400 transition"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <ChevronDown
                className="h-4 w-4 text-zinc-600 transition-transform"
                style={{ transform: expanded ? "rotate(180deg)" : "none" }}
              />
            </div>

            {/* ── the artist's reading room: marks on this tape, sealable ── */}
            {expanded && (
              <div className="px-4 pb-4 pt-1 space-y-3 border-t border-white/5">
                {loadingComments && !comments[track.id] && (
                  <p className="text-[11px] text-zinc-600 py-3" style={{ fontFamily: MONO_FONT }}>Loading marks…</p>
                )}
                {!loadingComments && list.length === 0 && (
                  <p className="text-[13px] italic py-3" style={{ fontFamily: SERIF_FONT, color: "rgba(255,255,255,.35)" }}>
                    Nobody&rsquo;s marked this tape yet.
                  </p>
                )}
                {list.map((c) => (
                  <div key={c.id} className="pt-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-[18px] h-[18px] rounded-full overflow-hidden flex items-center justify-center text-[8px] font-semibold shrink-0"
                        style={{ background: "linear-gradient(135deg,#3a3a42,#22222a)", color: "rgba(255,255,255,.6)" }}>
                        {c.profile?.avatar_url
                          ? <img src={c.profile.avatar_url} className="w-full h-full object-cover" alt="" />
                          : (c.profile?.username?.[0] ?? "?").toUpperCase()}
                      </span>
                      <span className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,.6)" }}>
                        @{c.profile?.username ?? "unknown"}
                      </span>
                      {c.timestamp_seconds !== null && (
                        <span className="ml-auto text-[9px]" style={{ fontFamily: MONO_FONT, color: "rgba(255,255,255,.3)" }}>
                          {fmt(c.timestamp_seconds)}
                        </span>
                      )}
                    </div>
                    <p className="text-[13.5px] leading-relaxed" style={{ fontFamily: SERIF_FONT, color: "rgba(255,255,255,.75)" }}>
                      {c.body}
                    </p>
                    {c.stamped ? (
                      <div>
                        <span
                          className="inline-block mt-2 text-[8px] font-bold uppercase px-2 py-0.5 rounded"
                          style={{
                            fontFamily: MONO_FONT, letterSpacing: "0.14em",
                            color: AMBER, border: `1.5px solid ${AMBER}`,
                            transform: "rotate(-2.5deg)", opacity: 0.9,
                          }}
                        >
                          ✓ this helped
                        </span>
                        {stampNotes[c.id] && (
                          <p className="mt-1.5 text-[9.5px] leading-relaxed" style={{ fontFamily: MONO_FONT, color: "rgba(255,255,255,.4)" }}>
                            {stampNotes[c.id]}
                          </p>
                        )}
                      </div>
                    ) : c.user_id !== userId ? (
                      <button
                        onClick={() => handleStamp(track.id, c.id)}
                        disabled={stamping === c.id}
                        className="mt-2 text-[9px] font-bold uppercase px-2.5 py-1 rounded transition active:scale-95 disabled:opacity-40"
                        style={{
                          fontFamily: MONO_FONT, letterSpacing: "0.12em",
                          color: "rgba(255,255,255,.45)", border: "1px solid rgba(255,255,255,.18)",
                        }}
                      >
                        {stamping === c.id ? "…" : "✓ this helped (+2 karma)"}
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
