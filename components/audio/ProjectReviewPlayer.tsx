"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { ProjectReview, ReviewComment } from "@/lib/audioTypes";
import { fetchReviewComments, createReviewComment } from "@/lib/audioDb";
import { extractFirstTimestamp, renderBodyWithTimestamps } from "./ReviewFeedback";

/* ═══════════════════════════════════════════════════════════════
   LA CINTA MARCADA — Variant A · Margen (see DESIGN.md)
   Time runs vertically down a tape spine. Comments are grease-pencil
   marks docked to it. Amber appears only where a human was.
   ═══════════════════════════════════════════════════════════════ */

const MAX_SKIPS = 4;
const PX_PER_SEC = 9;           // vertical px per second of audio
const NOWLINE_FRAC = 0.38;      // now-line position in the viewport
const SPEAK_WINDOW = 2.5;       // seconds around a comment where it "speaks"
const SPINE_X = 48;             // spine offset from the left, px
const LONG_PRESS_MS = 480;

const TAPE = "#131216";
const AMBER = "#f5a623";
const AMBER_HOT = "#ffc861";

const UI_FONT    = 'var(--font-tape-ui, "General Sans", sans-serif)';
const SERIF_FONT = 'var(--font-tape-serif, "Newsreader", Georgia, serif)';
const MONO_FONT  = 'var(--font-tape-mono, "Space Mono", monospace)';

type Props = {
  track: ProjectReview;
  userId: string;
  onPass: () => void;
  skipStreak: number;
  onSkipStreakChange: (n: number) => void;
  /** Dev/demo only: seed comments instead of fetching from Supabase. */
  previewComments?: ReviewComment[];
};

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(Math.max(0, s) % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function ProjectReviewPlayer({
  track,
  userId,
  onPass,
  skipStreak,
  onSkipStreakChange,
  previewComments,
}: Props) {
  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<{ ctx: AudioContext; analyser: AnalyserNode; data: Uint8Array<ArrayBuffer> } | null>(null);
  const rafRef      = useRef<number>(0);

  const viewportRef = useRef<HTMLDivElement>(null);
  const feedRef     = useRef<HTMLDivElement>(null);
  const spineRef    = useRef<HTMLDivElement>(null);
  const tcRef       = useRef<HTMLSpanElement>(null);
  const ghostRef    = useRef<HTMLDivElement>(null);

  const [playing, setPlaying]         = useState(false);
  const [comments, setComments]       = useState<ReviewComment[]>([]);
  const [speakingId, setSpeakingId]   = useState<string | null>(null);
  const [pastIds, setPastIds]         = useState<Set<string>>(new Set());
  const [ended, setEnded]             = useState(false);
  const [threading, setThreading]     = useState(false); // the 600ms play ritual

  // Inline composer — opened by long-press on the tape
  const [markAt, setMarkAt]           = useState<number | null>(null);
  const [markBody, setMarkBody]       = useState("");
  const [posting, setPosting]         = useState(false);

  // Drag-to-scrub state (refs — no re-render per move)
  const drag = useRef<{ active: boolean; startY: number; startTime: number; moved: boolean; ghostTime: number; pressTimer: ReturnType<typeof setTimeout> | null }>({
    active: false, startY: 0, startTime: 0, moved: false, ghostTime: 0, pressTimer: null,
  });

  const karmaBlocked = skipStreak >= MAX_SKIPS;
  const duration = track.duration_seconds || 1;
  const feedHeight = duration * PX_PER_SEC;

  /* ── audio + analyser ─────────────────────────────────────── */
  useEffect(() => {
    const audio = new Audio(track.audio_url);
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;
    audio.onended = () => { setPlaying(false); setEnded(true); };

    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.82;
      const source = ctx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      analyserRef.current = { ctx, analyser, data: new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer> };
    } catch {
      analyserRef.current = null;
    }

    setEnded(false);
    setPlaying(false);
    setSpeakingId(null);
    setPastIds(new Set());

    return () => {
      audio.pause();
      audio.src = "";
      cancelAnimationFrame(rafRef.current);
      analyserRef.current?.ctx.close();
      analyserRef.current = null;
    };
  }, [track.audio_url]);

  useEffect(() => {
    if (previewComments) { setComments(previewComments); return; }
    fetchReviewComments(track.id).then(setComments).catch(console.error);
  }, [track.id, previewComments]);

  /* ── the session loop: transform, timecode, speaking, breathing ── */
  const syncFrame = useCallback(() => {
    const audio = audioRef.current;
    const viewport = viewportRef.current;
    const feed = feedRef.current;
    if (!audio || !viewport || !feed) return;

    const nowY = viewport.clientHeight * NOWLINE_FRAC;
    const t = drag.current.active ? drag.current.ghostTime : audio.currentTime;

    feed.style.transform = `translateY(${nowY - t * PX_PER_SEC}px)`;
    if (tcRef.current) tcRef.current.textContent = `${fmt(t)} / ${fmt(duration)}`;

    // spine breathes with the live analyser (2px → 6px)
    if (analyserRef.current && spineRef.current && playing) {
      const { analyser, data } = analyserRef.current;
      analyser.getByteFrequencyData(data);
      const end = Math.floor(data.length / 3);
      let sum = 0;
      for (let i = 0; i < end; i++) sum += data[i];
      const amp = Math.min(1, (sum / (end * 255)) * 2.8);
      const w = 2 + amp * 4;
      spineRef.current.style.width = `${w}px`;
      spineRef.current.style.marginLeft = `${-(w - 2) / 2}px`;
    }

    // which comment speaks / which are past
    let speaking: string | null = null;
    const past = new Set<string>();
    for (const c of comments) {
      const ct = c.timestamp_seconds;
      if (ct === null) continue;
      if (Math.abs(ct - t) < SPEAK_WINDOW) speaking = c.id;
      else if (ct < t - SPEAK_WINDOW) past.add(c.id);
    }
    setSpeakingId((prev) => (prev === speaking ? prev : speaking));
    setPastIds((prev) => (prev.size === past.size && [...past].every((id) => prev.has(id)) ? prev : past));

    rafRef.current = requestAnimationFrame(syncFrame);
  }, [comments, duration, playing]);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(syncFrame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [syncFrame]);

  /* ── play ritual ──────────────────────────────────────────── */
  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (analyserRef.current?.ctx.state === "suspended") analyserRef.current.ctx.resume();
      if (!reduce && audio.currentTime < 0.1) {
        setThreading(true);
        setTimeout(() => {
          setThreading(false);
          audio.play().catch(console.error);
          setPlaying(true);
        }, 600);
      } else {
        audio.play().catch(console.error);
        setPlaying(true);
      }
      setEnded(false);
    }
  }

  const seekTo = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(seconds, duration));
    if (!playing) {
      if (analyserRef.current?.ctx.state === "suspended") analyserRef.current.ctx.resume();
      audio.play().catch(console.error);
      setPlaying(true);
    }
  }, [duration, playing]);

  /* ── drag-to-scrub + long-press-to-mark ───────────────────── */
  function timeAtClientY(clientY: number): number {
    const viewport = viewportRef.current;
    const audio = audioRef.current;
    if (!viewport || !audio) return 0;
    const rect = viewport.getBoundingClientRect();
    const nowY = viewport.clientHeight * NOWLINE_FRAC;
    const y = clientY - rect.top;
    return Math.max(0, Math.min(audio.currentTime + (y - nowY) / PX_PER_SEC, duration));
  }

  function onPointerDown(e: React.PointerEvent) {
    if (markAt !== null || ended) return;
    const audio = audioRef.current;
    if (!audio) return;
    drag.current.active = true;
    drag.current.moved = false;
    drag.current.startY = e.clientY;
    drag.current.startTime = audio.currentTime;
    drag.current.ghostTime = audio.currentTime;

    // long-press → grease-pencil mark at that moment
    const pressY = e.clientY;
    drag.current.pressTimer = setTimeout(() => {
      if (!drag.current.moved && drag.current.active) {
        drag.current.active = false;
        const t = timeAtClientY(pressY);
        if (audioRef.current) audioRef.current.volume = 0.4; // duck −6dB-ish
        if (navigator.vibrate) navigator.vibrate(10);
        setMarkAt(t);
      }
    }, LONG_PRESS_MS);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current.active) return;
    const dy = e.clientY - drag.current.startY;
    if (Math.abs(dy) > 8) {
      drag.current.moved = true;
      if (drag.current.pressTimer) { clearTimeout(drag.current.pressTimer); drag.current.pressTimer = null; }
    }
    if (!drag.current.moved) return;
    // dragging the feed down = going back in time
    drag.current.ghostTime = Math.max(0, Math.min(drag.current.startTime - dy / PX_PER_SEC, duration));
    if (ghostRef.current) {
      ghostRef.current.style.opacity = "1";
      ghostRef.current.textContent = fmt(drag.current.ghostTime);
    }
  }

  function onPointerUp() {
    if (drag.current.pressTimer) { clearTimeout(drag.current.pressTimer); drag.current.pressTimer = null; }
    if (!drag.current.active) return;
    const wasDrag = drag.current.moved;
    drag.current.active = false;
    if (ghostRef.current) ghostRef.current.style.opacity = "0";
    if (wasDrag) {
      const audio = audioRef.current;
      if (audio) audio.currentTime = drag.current.ghostTime;
    }
  }

  /* ── posting a mark ───────────────────────────────────────── */
  async function submitMark() {
    if (markAt === null || !markBody.trim()) return;
    setPosting(true);
    try {
      const body = markBody.trim();
      const ts = extractFirstTimestamp(body) ?? Math.round(markAt);
      const comment = await createReviewComment({
        trackId: track.id,
        userId,
        body,
        timestampSeconds: ts,
      });
      setComments((prev) => [...prev, comment].sort((a, b) => (a.timestamp_seconds ?? 0) - (b.timestamp_seconds ?? 0)));
      onSkipStreakChange(0);
      closeMark();
    } catch (err) {
      console.error("[submitMark]", err);
    } finally {
      setPosting(false);
    }
  }

  function closeMark() {
    setMarkAt(null);
    setMarkBody("");
    if (audioRef.current) audioRef.current.volume = 1;
  }

  function handlePass() {
    if (karmaBlocked) return;
    audioRef.current?.pause();
    onSkipStreakChange(skipStreak + 1);
    onPass();
  }

  /* ── derived render data ──────────────────────────────────── */
  const timedComments = comments.filter((c) => c.timestamp_seconds !== null);
  const untimedComments = comments.filter((c) => c.timestamp_seconds === null);
  const markers = new Set(timedComments.map((c) => Math.round((c.timestamp_seconds ?? 0))));
  const tickCount = Math.floor(duration / 15);

  return (
    <div className="flex flex-col" style={{ fontFamily: UI_FONT }}>

      {/* ── header — recedes on play ── */}
      <div
        className="flex items-start justify-between px-1 pb-3"
        style={{
          transform: playing ? "scale(0.97)" : "scale(1)",
          opacity: playing ? 0.6 : 1,
          transformOrigin: "left top",
          transition: "transform .45s cubic-bezier(.22,1,.36,1), opacity .45s",
        }}
      >
        <div>
          <p className="text-base font-semibold text-white" style={{ letterSpacing: "-0.01em" }}>{track.title}</p>
          <p className="text-xs text-zinc-500 mt-0.5">@{track.profile?.username ?? "unknown"} · {fmt(duration)}</p>
          <span
            className="inline-block mt-2 text-[8.5px] font-bold uppercase px-2 py-0.5 rounded"
            style={{
              fontFamily: MONO_FONT, letterSpacing: "0.18em",
              color: "rgba(255,255,255,.6)", border: "1px solid rgba(255,255,255,.22)",
              transform: "rotate(-2deg)",
            }}
          >
            {track.category}
          </span>
        </div>
        <span ref={tcRef} className="text-[11px] pt-1" style={{ fontFamily: MONO_FONT, color: "rgba(255,255,255,.6)" }}>
          0:00 / {fmt(duration)}
        </span>
      </div>

      {/* ── the tape ── */}
      <div
        ref={viewportRef}
        className="relative rounded-2xl overflow-hidden select-none touch-none"
        style={{ background: TAPE, height: "52vh", minHeight: 340, border: "1px solid rgba(255,255,255,.07)" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* now-line */}
        <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${NOWLINE_FRAC * 100}%` }}>
          <div style={{ height: 1, background: "linear-gradient(90deg, rgba(245,166,35,.5), rgba(255,255,255,.06) 45%, transparent)" }} />
          <span
            className="absolute rounded-full"
            style={{
              left: SPINE_X - 3, top: -3.5, width: 8, height: 8, background: AMBER,
              boxShadow: `0 0 12px rgba(245,166,35,.8)`,
            }}
          />
        </div>

        {/* ghost timecode while scrubbing */}
        <div
          ref={ghostRef}
          className="absolute z-30 pointer-events-none rounded-md px-2 py-1 text-[11px]"
          style={{
            fontFamily: MONO_FONT, right: 12, top: `calc(${NOWLINE_FRAC * 100}% - 26px)`,
            background: "rgba(0,0,0,.7)", color: AMBER_HOT, opacity: 0, transition: "opacity .2s",
          }}
        />

        {/* threading charge (play ritual) */}
        {threading && (
          <div
            className="absolute z-20 pointer-events-none"
            style={{
              left: SPINE_X - 1, top: 0, width: 4, borderRadius: 2,
              background: `linear-gradient(180deg, transparent, ${AMBER_HOT})`,
              animation: "tapeThread .6s cubic-bezier(.22,1,.36,1) forwards",
            }}
          />
        )}

        {/* the feed */}
        <div ref={feedRef} className="absolute left-0 right-0 will-change-transform" style={{ height: feedHeight + 400 }}>
          {/* spine */}
          <div
            ref={spineRef}
            className="absolute"
            style={{ left: SPINE_X, top: -200, bottom: 0, width: 2, background: "rgba(255,255,255,.14)", borderRadius: 2, transition: "width .12s" }}
          />

          {/* tick labels every 15s */}
          {Array.from({ length: tickCount }, (_, i) => {
            const t = (i + 1) * 15;
            return (
              <div key={t} className="absolute pointer-events-none" style={{ top: t * PX_PER_SEC }}>
                <div style={{ position: "absolute", left: SPINE_X, width: 8, height: 1, background: "rgba(255,255,255,.14)" }} />
                <span style={{ position: "absolute", left: 8, top: -5, fontFamily: MONO_FONT, fontSize: 8.5, color: "rgba(255,255,255,.28)" }}>
                  {fmt(t)}
                </span>
                {markers.has(t) && null}
              </div>
            );
          })}

          {/* comment cards */}
          {timedComments.map((c) => {
            const t = c.timestamp_seconds ?? 0;
            const isSpeaking = c.id === speakingId;
            const isPast = pastIds.has(c.id);
            return (
              <div
                key={c.id}
                className="absolute rounded-xl"
                style={{
                  left: SPINE_X + 20, right: 12, top: t * PX_PER_SEC - 14,
                  padding: "10px 13px",
                  background: isSpeaking ? "rgba(245,166,35,.08)" : "transparent",
                  transform: isSpeaking ? "scale(1.03)" : "scale(1)",
                  transformOrigin: "left center",
                  opacity: isPast ? 0.42 : 1,
                  transition: "all .45s cubic-bezier(.22,1,.36,1)",
                }}
              >
                {/* grease-pencil tick crossing the spine */}
                <span
                  className="absolute"
                  style={{
                    left: -20, top: 16, width: 20, height: 2, borderRadius: 2,
                    background: isSpeaking ? AMBER_HOT : AMBER,
                    opacity: isSpeaking ? 1 : 0.75,
                    boxShadow: isSpeaking ? `0 0 10px rgba(255,200,97,.7)` : "none",
                    transition: "all .3s",
                  }}
                />
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
                  <button
                    onClick={(e) => { e.stopPropagation(); seekTo(t); }}
                    className="ml-auto text-[8.5px]"
                    style={{ fontFamily: MONO_FONT, color: "rgba(255,255,255,.3)" }}
                  >
                    {fmt(t)}
                  </button>
                </div>
                <p
                  className="text-[14px] leading-relaxed"
                  style={{
                    fontFamily: SERIF_FONT,
                    color: isSpeaking ? "rgba(255,255,255,.92)" : "rgba(255,255,255,.6)",
                    transition: "color .3s",
                  }}
                >
                  {renderBodyWithTimestamps(c.body, seekTo)}
                </p>
              </div>
            );
          })}

          {/* empty state */}
          {timedComments.length === 0 && untimedComments.length === 0 && (
            <p
              className="absolute text-[14px] italic leading-relaxed"
              style={{
                fontFamily: SERIF_FONT, color: "rgba(255,255,255,.35)",
                left: SPINE_X + 24, right: 24, top: 60,
              }}
            >
              Nobody&rsquo;s marked this tape yet. Hold the line where you hear something.
            </p>
          )}
        </div>

        {/* inline composer — the writing slot */}
        {markAt !== null && (
          <div
            className="absolute left-3 right-3 z-40 rounded-2xl p-3"
            style={{
              top: `${NOWLINE_FRAC * 100}%`, transform: "translateY(-30%)",
              background: "#1a1820", border: `1px solid rgba(245,166,35,.35)`,
              boxShadow: "0 12px 40px rgba(0,0,0,.5)",
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] uppercase" style={{ fontFamily: MONO_FONT, letterSpacing: "0.18em", color: AMBER }}>
                ✏ marca en {fmt(markAt)}
              </span>
              <button onClick={closeMark} className="text-[11px]" style={{ color: "rgba(255,255,255,.4)" }}>cancel</button>
            </div>
            <textarea
              autoFocus
              value={markBody}
              onChange={(e) => setMarkBody(e.target.value)}
              placeholder="What do you hear at this moment…"
              rows={2}
              className="w-full bg-transparent outline-none resize-none text-[14.5px] italic leading-relaxed"
              style={{ fontFamily: SERIF_FONT, color: "rgba(255,255,255,.92)", caretColor: AMBER }}
            />
            <div className="flex justify-end">
              <button
                onClick={submitMark}
                disabled={!markBody.trim() || posting}
                className="text-[11px] font-bold px-3 py-1.5 rounded-lg disabled:opacity-30 transition"
                style={{ background: AMBER, color: "#111114" }}
              >
                {posting ? "…" : "Mark it"}
              </button>
            </div>
          </div>
        )}

        {/* session recap — the tape "prints" */}
        {ended && (
          <div className="absolute inset-0 z-40 flex items-center justify-center p-6" style={{ background: "rgba(11,10,9,.88)", backdropFilter: "blur(6px)" }}>
            <div className="w-full max-w-[300px] text-center">
              <p className="text-[9px] uppercase" style={{ fontFamily: MONO_FONT, letterSpacing: "0.25em", color: "rgba(255,255,255,.3)" }}>
                Session recap
              </p>
              <p className="text-lg font-semibold text-white mt-2" style={{ letterSpacing: "-0.01em" }}>
                {new Set(timedComments.map((c) => c.user_id)).size || "0"} producer{new Set(timedComments.map((c) => c.user_id)).size !== 1 ? "s" : ""} marked{" "}
                <em style={{ fontFamily: SERIF_FONT, fontStyle: "italic", color: AMBER_HOT }}>{timedComments.length} moment{timedComments.length !== 1 ? "s" : ""}</em>
              </p>
              <div className="relative h-10 my-5">
                <div className="absolute left-0 right-0 top-1/2 h-[2px] rounded" style={{ background: "rgba(255,255,255,.12)" }} />
                {timedComments.map((c) => (
                  <span key={c.id} className="absolute top-1/2 rounded"
                    style={{
                      left: `${((c.timestamp_seconds ?? 0) / duration) * 100}%`,
                      width: 2.5, height: 18, background: AMBER,
                      transform: "translateY(-50%) rotate(-4deg)", opacity: 0.9,
                    }} />
                ))}
              </div>
              <button
                onClick={() => { setEnded(false); if (audioRef.current) audioRef.current.currentTime = 0; }}
                className="text-[11px] font-semibold px-4 py-2 rounded-xl transition"
                style={{ border: "1px solid rgba(255,255,255,.15)", color: "rgba(255,255,255,.6)" }}
              >
                Listen again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* karma gate */}
      {karmaBlocked && (
        <div className="mt-3 rounded-xl px-3 py-2.5 text-xs text-center font-medium"
          style={{ border: "1px solid rgba(245,166,35,.3)", background: "rgba(245,166,35,.1)", color: AMBER, boxShadow: "0 0 18px rgba(245,166,35,.12)" }}>
          Other producers need your help — leave a mark to keep listening
        </div>
      )}

      {/* transport */}
      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={handlePass}
          disabled={karmaBlocked}
          className="h-11 px-5 rounded-xl text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition active:scale-[0.97]"
          style={{ border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "rgba(255,255,255,.55)" }}
        >
          Pass
        </button>
        <button
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition active:scale-95"
          style={{ border: "1px solid rgba(255,255,255,.18)", background: "rgba(255,255,255,.06)" }}
        >
          {playing
            ? <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" style={{ fill: "rgba(255,255,255,.92)", width: 18, height: 18 }}><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
            : <svg viewBox="0 0 24 24" style={{ fill: "rgba(255,255,255,.92)", width: 18, height: 18, transform: "translateX(1px)" }}><path d="M7 5v14l12-7z"/></svg>}
        </button>
        <p className="text-[10.5px] leading-snug flex-1" style={{ color: "rgba(255,255,255,.3)" }}>
          <b style={{ color: "rgba(255,255,255,.55)", fontWeight: 500 }}>Hold the tape</b> to mark a moment · drag to scrub
        </p>
      </div>

      {/* skips remaining */}
      {skipStreak > 0 && !karmaBlocked && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {Array.from({ length: MAX_SKIPS }).map((_, i) => (
            <span key={i} className="w-1 h-1 rounded-full transition-colors"
              style={{ background: i < MAX_SKIPS - skipStreak ? "rgba(245,166,35,.75)" : "rgba(255,255,255,.12)" }} />
          ))}
          <span className="text-[9px] ml-1 uppercase tracking-wider" style={{ color: "rgba(255,255,255,.3)" }}>skips left</span>
        </div>
      )}

      {/* untimed comments — general notes below the tape */}
      {untimedComments.length > 0 && (
        <div className="space-y-3 pt-4 mt-4" style={{ borderTop: "1px solid rgba(255,255,255,.05)" }}>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ fontFamily: MONO_FONT, color: "rgba(255,255,255,.3)" }}>
            General notes
          </p>
          {untimedComments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] shrink-0 overflow-hidden"
                style={{ background: "#26262c", color: "rgba(255,255,255,.5)" }}>
                {c.profile?.avatar_url
                  ? <img src={c.profile.avatar_url} className="w-full h-full object-cover" alt="" />
                  : (c.profile?.username?.[0] ?? "?").toUpperCase()}
              </div>
              <div>
                <p className="text-[10px] font-bold mb-0.5" style={{ color: "rgba(255,255,255,.45)" }}>@{c.profile?.username ?? "unknown"}</p>
                <p className="text-[13.5px] leading-relaxed" style={{ fontFamily: SERIF_FONT, color: "rgba(255,255,255,.6)" }}>
                  {renderBodyWithTimestamps(c.body, seekTo)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes tapeThread {
          from { height: 0; opacity: 1; }
          to   { height: ${NOWLINE_FRAC * 100}%; opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
        }
      `}</style>
    </div>
  );
}
