"use client";
import { useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import type { ProjectReview, ReviewComment } from "@/lib/audioTypes";
import { CATEGORY_COLORS } from "@/lib/audioTypes";
import { fetchReviewComments, createReviewComment } from "@/lib/audioDb";
import ReviewFeedback, { renderBodyWithTimestamps } from "./ReviewFeedback";

const MAX_SKIPS = 4;
const BARS = 60; // number of amplitude bars in the waveform

// Build an SVG path from amplitude peaks (0..1 per bar)
function peaksToPath(peaks: number[]): string {
  const W = 288; const H = 48; const cx = H / 2;
  const barW = W / peaks.length;
  let d = "";
  peaks.forEach((amp, i) => {
    const h = Math.max(2, amp * (H - 4));
    const x = i * barW + barW * 0.15;
    const w = barW * 0.7;
    const y = cx - h / 2;
    d += `M${x.toFixed(1)},${y.toFixed(1)} L${x.toFixed(1)},${(y + h).toFixed(1)} `;
  });
  return d;
}

// Fallback static path (used while real peaks are loading)
const FALLBACK_PEAKS = Array.from({ length: BARS }, (_, i) =>
  0.15 + 0.5 * Math.abs(Math.sin(i * 0.45)) + 0.2 * Math.abs(Math.sin(i * 0.13))
);
const FALLBACK_PATH = peaksToPath(FALLBACK_PEAKS);

const artGradients: Record<string, string> = {
  "Demo":           "linear-gradient(135deg, #0f0c29, #302b63)",
  "Missing Mix":    "linear-gradient(135deg, #1a0533, #6b21a8)",
  "Idea":           "linear-gradient(135deg, #052e16, #166534)",
  "Missing Master": "linear-gradient(135deg, #431407, #9a3412)",
  "Final Version":  "linear-gradient(135deg, #1c1917, #78350f)",
};

type Props = {
  track: ProjectReview;
  userId: string;
  onPass: () => void;
  skipStreak: number;
  onSkipStreakChange: (n: number) => void;
};

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function ProjectReviewPlayer({
  track,
  userId,
  onPass,
  skipStreak,
  onSkipStreakChange,
}: Props) {
  const audioRef                = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [comments, setComments]       = useState<ReviewComment[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [wavePath, setWavePath]         = useState(FALLBACK_PATH);
  const karmaBlocked = skipStreak >= MAX_SKIPS;

  // Decode audio and extract real amplitude peaks via Web Audio API
  useEffect(() => {
    setWavePath(FALLBACK_PATH); // reset on track change
    let cancelled = false;
    async function extractPeaks() {
      try {
        const res = await fetch(track.audio_url);
        const arrayBuffer = await res.arrayBuffer();
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const decoded = await ctx.decodeAudioData(arrayBuffer);
        await ctx.close();
        if (cancelled) return;

        // Mix down to mono and compute RMS per segment
        const channel = decoded.getChannelData(0);
        const segSize = Math.floor(channel.length / BARS);
        const peaks: number[] = [];
        for (let i = 0; i < BARS; i++) {
          const start = i * segSize;
          let sum = 0;
          for (let j = start; j < start + segSize; j++) sum += channel[j] * channel[j];
          peaks.push(Math.sqrt(sum / segSize));
        }
        // Normalize to 0..1
        const max = Math.max(...peaks, 0.001);
        const normalized = peaks.map((p) => p / max);
        setWavePath(peaksToPath(normalized));
      } catch {
        // keep fallback path on error (CORS, decode failure, etc.)
      }
    }
    extractPeaks();
    return () => { cancelled = true; };
  }, [track.audio_url]);

  // Load audio
  useEffect(() => {
    const audio = new Audio(track.audio_url);
    audioRef.current = audio;
    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress(audio.currentTime / (audio.duration || 1));
    };
    audio.onended = () => { setPlaying(false); setProgress(1); };
    return () => { audio.pause(); audio.src = ""; };
  }, [track.audio_url]);

  // Load comments
  useEffect(() => {
    fetchReviewComments(track.id).then(setComments).catch(console.error);
  }, [track.id]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().catch(console.error); setPlaying(true); }
  }

  function seekTo(seconds: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = seconds;
    if (!playing) { audio.play().catch(console.error); setPlaying(true); }
  }

  function handleWaveformClick(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime = ratio * audio.duration;
  }

  function handlePass() {
    if (karmaBlocked) return;
    audioRef.current?.pause();
    onSkipStreakChange(skipStreak + 1);
    onPass();
  }

  async function handleFeedbackSubmit(body: string, timestampSeconds: number | null) {
    const comment = await createReviewComment({
      trackId: track.id,
      userId,
      body,
      timestampSeconds,
    });
    setComments((prev) => [...prev, comment]);
    onSkipStreakChange(0);
  }

  const clipId = `clip-${track.id}`;

  return (
    <div className="flex flex-col gap-4 px-1">
      {/* Artwork */}
      <div
        className="w-full rounded-2xl relative flex items-center justify-center overflow-hidden"
        style={{
          aspectRatio: "1",
          background: track.artwork_url
            ? undefined
            : (artGradients[track.category] ?? artGradients["Demo"]),
        }}
      >
        {track.artwork_url && (
          <img
            src={track.artwork_url}
            alt={track.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <span
          className={`absolute top-3 left-3 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest ${CATEGORY_COLORS[track.category]}`}
        >
          {track.category}
        </span>
        <button
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="relative z-10 w-14 h-14 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(255,255,255,0.12)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          {playing
            ? <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white"><rect x="5" y="4" width="4" height="16" rx="1"/><rect x="15" y="4" width="4" height="16" rx="1"/></svg>
            : <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white translate-x-0.5"><path d="M6 4.75a.75.75 0 0 1 1.14-.64l12 7.25a.75.75 0 0 1 0 1.28l-12 7.25A.75.75 0 0 1 6 19.25V4.75z"/></svg>
          }
        </button>
      </div>

      {/* Track info */}
      <div>
        <p className="text-base font-bold text-white">{track.title}</p>
        <p className="text-xs text-zinc-500">
          @{track.profile?.username ?? "unknown"} · {fmt(track.duration_seconds)}
        </p>
      </div>

      {/* Waveform */}
      <div>
        <svg
          width="100%"
          height="48"
          viewBox="0 0 288 48"
          preserveAspectRatio="none"
          className="cursor-pointer"
          onClick={handleWaveformClick}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x="0" y="0" width={`${progress * 288}`} height="48" />
            </clipPath>
          </defs>
          <path d={wavePath} fill="none" stroke="#2a2a2e" strokeWidth="2" strokeLinecap="round" />
          <path
            d={wavePath}
            fill="none"
            stroke="#f5a623"
            strokeWidth="2"
            strokeLinecap="round"
            clipPath={`url(#${clipId})`}
          />
          <line
            x1={progress * 288}
            y1="0"
            x2={progress * 288}
            y2="48"
            stroke="#f5a623"
            strokeWidth="1.5"
            opacity="0.7"
          />
        </svg>
        <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
          <span>{fmt(currentTime)}</span>
          <span>{fmt(track.duration_seconds)}</span>
        </div>
      </div>

      {/* Karma gate alert */}
      {karmaBlocked && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-400 text-center font-medium">
          Other producers need your help — leave a comment to keep listening
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handlePass}
          disabled={karmaBlocked}
          className="flex-1 h-12 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed transition hover:bg-white/10"
        >
          Pass
        </button>
        <button
          onClick={() => setShowFeedback(true)}
          className="flex-[2] h-12 rounded-xl bg-amber-500 text-black text-sm font-bold flex items-center justify-center gap-2 hover:bg-amber-400 transition"
        >
          <MessageSquare className="h-4 w-4" />
          Leave Feedback
        </button>
      </div>

      {/* Comment feed */}
      {comments.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-white/5">
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
            {comments.length} comment{comments.length !== 1 ? "s" : ""}
          </p>
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-400 shrink-0 overflow-hidden">
                {c.profile?.avatar_url
                  ? <img src={c.profile.avatar_url} className="w-full h-full object-cover" alt="" />
                  : (c.profile?.username?.[0] ?? "?").toUpperCase()
                }
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-500 mb-0.5">
                  @{c.profile?.username ?? "unknown"}
                </p>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {renderBodyWithTimestamps(c.body, seekTo)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showFeedback && (
        <ReviewFeedback
          onSubmit={handleFeedbackSubmit}
          onClose={() => setShowFeedback(false)}
        />
      )}
    </div>
  );
}
