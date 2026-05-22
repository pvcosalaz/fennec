"use client";
import { useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import type { ProjectReview, ReviewComment } from "@/lib/audioTypes";
import { CATEGORY_COLORS } from "@/lib/audioTypes";
import { fetchReviewComments, createReviewComment } from "@/lib/audioDb";
import ReviewFeedback, { renderBodyWithTimestamps } from "./ReviewFeedback";

const MAX_SKIPS = 4;

// Pre-computed organic waveform path (static visual)
const WAVE_PATH = "M0,24 C4,24 5,10 8,10 C11,10 12,38 15,38 C18,38 19,18 22,18 C25,18 26,30 29,30 C32,30 33,8 36,8 C39,8 40,40 43,40 C46,40 47,20 50,20 C53,20 54,14 57,14 C60,14 61,34 64,34 C67,34 68,22 71,22 C74,22 75,6 78,6 C81,6 82,42 85,42 C88,42 89,16 92,16 C95,16 96,28 99,28 C102,28 103,12 106,12 C109,12 110,36 113,36 C116,36 117,24 120,24 C123,24 124,10 127,10 C130,10 131,38 134,38 C137,38 138,20 141,20 C144,20 145,30 148,30 C151,30 152,8 155,8 C158,8 159,40 162,40 C165,40 166,18 169,18 C172,18 173,26 176,26 C179,26 180,14 183,14 C186,14 187,34 190,34 C193,34 194,22 197,22 C200,22 201,6 204,6 C207,6 208,42 211,42 C214,42 215,16 218,16 C221,16 222,28 225,28 C228,28 229,24 232,24 C235,24 236,36 239,36 C242,36 243,18 246,18 C249,18 250,10 253,10 C256,10 257,32 260,32 C263,32 264,24 267,24 C270,24 271,14 274,14 C277,14 278,28 281,28 C284,28 285,24 288,24";

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
  const karmaBlocked = skipStreak >= MAX_SKIPS;

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
    else { audio.play(); setPlaying(true); }
  }

  function seekTo(seconds: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = seconds;
    if (!playing) { audio.play(); setPlaying(true); }
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

  const artGradients: Record<string, string> = {
    "Demo":           "linear-gradient(135deg, #0f0c29, #302b63)",
    "Missing Mix":    "linear-gradient(135deg, #1a0533, #6b21a8)",
    "Idea":           "linear-gradient(135deg, #052e16, #166534)",
    "Missing Master": "linear-gradient(135deg, #431407, #9a3412)",
    "Final Version":  "linear-gradient(135deg, #1c1917, #78350f)",
  };

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
          <path d={WAVE_PATH} fill="none" stroke="#2a2a2e" strokeWidth="2" />
          <defs>
            <clipPath id={clipId}>
              <rect x="0" y="0" width={`${progress * 288}`} height="48" />
            </clipPath>
          </defs>
          <path
            d={WAVE_PATH}
            fill="none"
            stroke="#f5a623"
            strokeWidth="2"
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
