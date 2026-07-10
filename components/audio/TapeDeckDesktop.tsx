"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, SkipForward, Plus, Upload } from "lucide-react";
import type { ProjectReview, ReviewComment } from "@/lib/audioTypes";
import { fetchReviewComments, createReviewComment, fetchKarma } from "@/lib/audioDb";

/* ═══════════════════════════════════════════════════════════════
   THE TAPE — desktop. The flagship, built horizontal: a reel-to-reel
   whose waveform crosses the whole screen, the now-line sweeping
   left → right, other producers' marks as amber pins on the tape,
   their notes in grease-pencil serif below. Reuses the real data
   layer (fetchReviewComments / createReviewComment / fetchKarma) and
   real audio playback — this is a new UI, not the mobile player.
   ═══════════════════════════════════════════════════════════════ */

const AMBER = "#f5a623";
const AMBER_HOT = "#ffc861";
const BAR_COUNT = 180;

const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

/** Deterministic bar heights from the track id, so the waveform is stable
 *  across renders (no hydration flicker, no random reshuffle on tick). */
function waveHeights(seed: string): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  const rnd = () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  // Round to 2 decimals: transcendental fns (Math.sin) aren't guaranteed
  // bit-identical across engines, and the raw float caused SSR/CSR
  // hydration mismatches on the bar heights.
  return Array.from({ length: BAR_COUNT }, (_, i) =>
    Math.round((0.18 + Math.abs(Math.sin(i * 0.34)) * 0.55 + rnd() * 0.32) * 100) / 100
  );
}

export default function TapeDeckDesktop({
  track, userId, onPass, onOpenMyTracks, onOpenIntro,
}: {
  track: ProjectReview;
  userId: string;
  onPass: () => void;
  onOpenMyTracks: () => void;
  onOpenIntro: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const reelRef  = useRef<HTMLDivElement>(null);
  const [playing, setPlaying]   = useState(false);
  const [t, setT]               = useState(0);          // currentTime
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [karma, setKarma]       = useState<number | null>(null);
  const [marking, setMarking]   = useState(false);       // note composer open
  const [markAt, setMarkAt]     = useState(0);
  const [body, setBody]         = useState("");
  const [posting, setPosting]   = useState(false);

  const duration = track.duration_seconds || audioRef.current?.duration || 1;
  // Bars are computed client-only (after mount): Math.sin isn't guaranteed
  // bit-identical across engines, so rendering them during SSR risked a
  // hydration mismatch. The reel is interactive-only anyway.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const bars = useMemo(() => (mounted ? waveHeights(track.id) : []), [mounted, track.id]);

  // load comments + karma per track
  useEffect(() => {
    setComments([]); setT(0); setPlaying(false); setMarking(false);
    fetchReviewComments(track.id).then(setComments).catch(() => {});
    fetchKarma(userId).then(setKarma).catch(() => {});
  }, [track.id, userId]);

  // playback clock
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setT(a.currentTime);
    const onEnd  = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    return () => { a.removeEventListener("timeupdate", onTime); a.removeEventListener("ended", onEnd); };
  }, [track.id]);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) { void a.play(); setPlaying(true); } else { a.pause(); setPlaying(false); }
  }

  function seekFromClient(clientX: number) {
    const el = reelRef.current;
    const a = audioRef.current;
    if (!el || !a) return 0;
    const r = el.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    const time = pct * duration;
    a.currentTime = time;
    setT(time);
    return time;
  }

  async function submitMark() {
    if (!body.trim()) return;
    setPosting(true);
    try {
      const c = await createReviewComment({ trackId: track.id, userId, body: body.trim(), timestampSeconds: Math.round(markAt) });
      setComments((prev) => [...prev, c].sort((a, b) => (a.timestamp_seconds ?? 0) - (b.timestamp_seconds ?? 0)));
      try {
        localStorage.setItem("fennec_has_left_note_v1", "1");
      } catch { /* ignore */ }
      setBody(""); setMarking(false);
    } catch { /* keep composer open on failure */ }
    setPosting(false);
  }

  const pct = Math.min(100, (t / duration) * 100);
  // the note "speaking" right now — nearest mark within a 3s window of the playhead
  const speaking = comments
    .filter((c) => c.timestamp_seconds != null && Math.abs((c.timestamp_seconds ?? 0) - t) < 3)
    .sort((a, b) => Math.abs((a.timestamp_seconds ?? 0) - t) - Math.abs((b.timestamp_seconds ?? 0) - t))[0];

  return (
    <div className="flex h-[calc(100vh-88px)] flex-col overflow-hidden rounded-2xl border border-white/10" style={{ background: "#131216" }}>
      <audio ref={audioRef} src={track.audio_url} preload="metadata" />

      {/* header */}
      <div className="flex items-start justify-between px-8 pt-6">
        <div className="flex items-center gap-3.5">
          {track.artwork_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={track.artwork_url} alt="" className="h-12 w-12 rounded-[10px] object-cover" />
          ) : (
            <div className="h-12 w-12 rounded-[10px] border border-white/10" style={{ background: "linear-gradient(140deg,#2a2030,#191319)" }} />
          )}
          <div>
            <div className="text-[16.5px] font-bold text-white">{track.title}</div>
            <div className="font-mono text-[11px] text-zinc-600">@{track.profile?.username ?? "producer"} · {fmt(duration)}</div>
          </div>
          <button onClick={onOpenIntro} className="ml-3 rounded-md border px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.18em] transition hover:brightness-125" style={{ borderColor: `${AMBER}4d`, color: AMBER }}>
            How it works
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-full border border-white/10 px-3.5 py-1.5 font-mono text-[12px] text-zinc-400">{fmt(t)} / {fmt(duration)}</div>
          <div className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-bold" style={{ borderColor: `${AMBER}4d`, color: AMBER }}>◈ {karma ?? "—"} karma</div>
        </div>
      </div>

      {/* the reel — waveform crossing the whole width */}
      <div className="relative flex flex-1 items-center px-8">
        {/* spools */}
        <div className="absolute left-8 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full border border-white/10" style={{ background: "radial-gradient(circle,#232028 0 26%,#141216 27% 62%,#1c1a20 63%)", boxShadow: "inset 0 2px 12px rgba(0,0,0,.7)" }} />
        <div className="absolute right-8 top-1/2 h-24 w-24 -translate-y-1/2 scale-90 rounded-full border border-white/10" style={{ background: "radial-gradient(circle,#232028 0 26%,#141216 27% 62%,#1c1a20 63%)", boxShadow: "inset 0 2px 12px rgba(0,0,0,.7)" }} />

        {/* waveform track (click to seek) */}
        <div
          ref={reelRef}
          onClick={(e) => { if (!marking) seekFromClient(e.clientX); }}
          className="relative mx-28 flex h-40 flex-1 cursor-pointer items-center gap-[2px]"
        >
          {/* tape spine line */}
          <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-px -translate-y-1/2" style={{ background: "rgba(255,255,255,.10)" }} />
          {bars.map((hh, i) => {
            const barPct = (i / BAR_COUNT) * 100;
            const played = barPct <= pct;
            return (
              <span key={i} className="flex-1 rounded-[1.5px]" style={{
                height: `${hh * 100}%`,
                background: played ? `linear-gradient(180deg,${AMBER_HOT},${AMBER})` : "rgba(255,255,255,.12)",
                boxShadow: played ? `0 0 8px ${AMBER}30` : "none",
              }} />
            );
          })}

          {/* marks — amber pins on the tape, positioned by timestamp */}
          {comments.filter((c) => c.timestamp_seconds != null).map((c) => (
            <button
              key={c.id}
              onClick={(e) => { e.stopPropagation(); const a = audioRef.current; if (a) { a.currentTime = c.timestamp_seconds ?? 0; setT(c.timestamp_seconds ?? 0); } }}
              title={`@${c.profile?.username ?? ""} · ${fmt(c.timestamp_seconds ?? 0)}`}
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ left: `${((c.timestamp_seconds ?? 0) / duration) * 100}%`, background: AMBER, boxShadow: `0 0 10px ${AMBER}90` }}
            />
          ))}

          {/* now-line playhead */}
          <div className="pointer-events-none absolute top-0 bottom-0 w-[1.5px]" style={{ left: `${pct}%`, background: AMBER, boxShadow: `0 0 14px ${AMBER}b3` }}>
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 font-mono text-[10px] font-bold" style={{ color: AMBER }}>{fmt(t)}</span>
          </div>
        </div>
      </div>

      {/* the note speaking now — grease-pencil serif */}
      <div className="h-16 px-8">
        {speaking ? (
          <div className="mx-auto max-w-2xl text-center">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: AMBER }}>@{speaking.profile?.username ?? "producer"} · {fmt(speaking.timestamp_seconds ?? 0)}</div>
            <p className="mt-1 text-[16px] leading-snug text-zinc-200" style={{ fontFamily: "var(--font-tape-serif, Georgia, serif)" }}>{speaking.body}</p>
          </div>
        ) : (
          <p className="text-center font-mono text-[11px] text-zinc-700">{comments.length} mark{comments.length !== 1 ? "s" : ""} on this tape · click the reel to scrub, hit ＋ to leave a note</p>
        )}
      </div>

      {/* note composer */}
      {marking && (
        <div className="mx-8 mb-3 flex items-center gap-3 rounded-2xl border p-3" style={{ borderColor: `${AMBER}40`, background: "rgba(245,166,35,.05)" }}>
          <span className="font-mono text-[11px]" style={{ color: AMBER }}>@ {fmt(markAt)}</span>
          <input
            autoFocus value={body} onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || !e.shiftKey)) { e.preventDefault(); void submitMark(); } if (e.key === "Escape") setMarking(false); }}
            placeholder="Leave a precise note at this moment…"
            className="flex-1 bg-transparent text-[14px] text-white placeholder:text-zinc-600 outline-none"
          />
          <button onClick={() => setMarking(false)} className="text-[12px] text-zinc-500 hover:text-white">Cancel</button>
          <button onClick={submitMark} disabled={posting || !body.trim()} className="rounded-xl px-4 py-2 text-[12px] font-bold text-black transition disabled:opacity-40" style={{ background: `linear-gradient(180deg,${AMBER_HOT},${AMBER})` }}>
            {posting ? "…" : "Send note"}
          </button>
        </div>
      )}

      {/* transport */}
      <div className="flex items-center gap-4 border-t border-white/10 px-8 py-4">
        <button onClick={onPass} className="rounded-full border border-white/10 px-5 py-2.5 text-[13px] font-semibold text-zinc-400 transition hover:text-white">Pass</button>
        <button onClick={toggle} className="grid h-13 w-13 place-items-center rounded-full text-black transition active:scale-95" style={{ height: 52, width: 52, background: `linear-gradient(180deg,${AMBER_HOT},${AMBER})`, boxShadow: `0 6px 22px ${AMBER}59` }}>
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-[1px]" />}
        </button>
        <button onClick={() => { setMarkAt(t); setMarking(true); }} className="flex items-center gap-2 rounded-full border px-4 py-2.5 text-[13px] font-semibold transition hover:brightness-110" style={{ borderColor: `${AMBER}40`, color: AMBER }}>
          <Plus className="h-4 w-4" /> Leave a note
        </button>
        <button onClick={onPass} className="flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2.5 text-[13px] text-zinc-400 transition hover:text-white">
          Next <SkipForward className="h-4 w-4" />
        </button>
        <span className="ml-2 font-mono text-[10.5px] tracking-[0.06em] text-zinc-700">SPACE play · CLICK reel to scrub · ＋ note</span>
        <button onClick={onOpenMyTracks} className="ml-auto flex items-center gap-2 rounded-full border px-4 py-2.5 text-[13px] font-bold text-black transition hover:brightness-110" style={{ borderColor: "transparent", background: `linear-gradient(180deg,${AMBER_HOT},${AMBER})` }}>
          <Upload className="h-4 w-4" /> My Tracks
        </button>
      </div>
    </div>
  );
}
