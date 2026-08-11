"use client";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Mic, Plus, MoreHorizontal, ChevronDown, HelpCircle } from "lucide-react";
import type { ProjectReview, ReviewComment } from "@/lib/audioTypes";
import { fetchReviewComments, createReviewComment, fetchKarma } from "@/lib/audioDb";
import { extractFirstTimestamp, renderBodyWithTimestamps } from "./ReviewFeedback";

/* ═══════════════════════════════════════════════════════════════
   LA CINTA MARCADA — Variant A · Margen, full-bleed (see DESIGN.md)
   The tape IS the screen. Time runs vertically down a tape spine;
   comments are grease-pencil marks docked to it. Everything else
   floats above the tape as liquid glass. Amber appears only where
   a human was.
   ═══════════════════════════════════════════════════════════════ */

const MAX_SKIPS = 4;
const PX_PER_SEC = 9;           // vertical px per second of audio
const NOWLINE_FRAC = 0.38;      // now-line position in the viewport
const SPEAK_WINDOW = 2.5;       // seconds around a comment where it "speaks"
const CLUSTER_GAP_SEC = 10;     // comments closer than this chain into one cluster
const SPINE_X = 48;             // spine offset from the left, px
const LONG_PRESS_MS = 480;

const AMBER = "#f5a623";
const AMBER_HOT = "#ffc861";

const UI_FONT    = 'var(--font-tape-ui, "General Sans", sans-serif)';
const SERIF_FONT = 'var(--font-tape-serif, "Newsreader", Georgia, serif)';
const MONO_FONT  = 'var(--font-tape-mono, "Space Mono", monospace)';

// Apple liquid-glass surface — floats above the tape
const GLASS: React.CSSProperties = {
  background: "rgba(19,18,22,0.55)",
  backdropFilter: "blur(24px) saturate(160%)",
  WebkitBackdropFilter: "blur(24px) saturate(160%)",
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 24px rgba(0,0,0,0.35)",
};

type Props = {
  track: ProjectReview;
  userId: string;
  onPass: () => void;
  skipStreak: number;
  onSkipStreakChange: (n: number) => void;
  /** Dev/demo only: seed comments instead of fetching from Supabase. */
  previewComments?: ReviewComment[];
  /** Opens the Melody Bank overlay (hidden behind the ⋯ toggle). */
  onOpenMelody?: () => void;
  /** Opens the My Tracks sheet (hidden behind the ⋯ toggle). */
  onOpenMyTracks?: () => void;
  /** Re-opens the "how the tape works" intro (⋯ flyout). */
  onOpenIntro?: () => void;
};

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(Math.max(0, s) % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// Comments that land close together on the tape chain into a cluster:
// collapsed to a compact chip, they fan open on tap or when the
// playhead enters their range. Every member keeps its honest tick.
type Cluster = { id: string; start: number; end: number; items: ReviewComment[] };

export default function ProjectReviewPlayer({
  track,
  userId,
  onPass,
  skipStreak,
  onSkipStreakChange,
  previewComments,
  onOpenMelody,
  onOpenMyTracks,
  onOpenIntro,
}: Props) {
  const { t } = useTranslation();
  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<{ ctx: AudioContext; analyser: AnalyserNode; data: Uint8Array<ArrayBuffer> } | null>(null);
  const rafRef      = useRef<number>(0);

  const viewportRef = useRef<HTMLDivElement>(null);
  const feedRef     = useRef<HTMLDivElement>(null);
  const spineRef    = useRef<HTMLDivElement>(null);
  const nowDotRef   = useRef<HTMLSpanElement>(null);
  const tcRef       = useRef<HTMLSpanElement>(null);
  const ghostRef    = useRef<HTMLDivElement>(null);
  const ampSmoothRef  = useRef(0);
  const zeroFramesRef = useRef(0);

  const [playing, setPlaying]         = useState(false);
  const [comments, setComments]       = useState<ReviewComment[]>([]);
  const [speakingId, setSpeakingId]   = useState<string | null>(null);
  const [pastIds, setPastIds]         = useState<Set<string>>(new Set());
  const [ended, setEnded]             = useState(false);
  const [threading, setThreading]     = useState(false); // the 600ms play ritual
  const [showActions, setShowActions] = useState(false); // ⋯ flyout (Melody Bank / My Tracks)
  const [showHint, setShowHint]       = useState(true);  // gesture hint, fades after a few seconds
  const [openClusters, setOpenClusters]     = useState<Set<string>>(new Set()); // manually fanned-open clusters
  const [activeClusterId, setActiveClusterId] = useState<string | null>(null);  // playhead inside this cluster's range
  const [karma, setKarma]           = useState<number | null>(null); // current balance (null = unknown/hidden)

  // Inline composer — opened by long-press on the tape
  const [markAt, setMarkAt]           = useState<number | null>(null);
  const [markBody, setMarkBody]       = useState("");
  const [posting, setPosting]         = useState(false);
  // First-note karma moment: explain karma the instant they earn a way to earn it,
  // not as an upfront wall. Shown once, right after the very first mark.
  const [showKarmaIntro, setShowKarmaIntro] = useState(false);

  // Drag-to-scrub state (refs — no re-render per move)
  const drag = useRef<{ active: boolean; startY: number; startTime: number; moved: boolean; ghostTime: number; pressTimer: ReturnType<typeof setTimeout> | null }>({
    active: false, startY: 0, startTime: 0, moved: false, ghostTime: 0, pressTimer: null,
  });

  const karmaBlocked = skipStreak >= MAX_SKIPS;
  const duration = track.duration_seconds || 1;
  const feedHeight = duration * PX_PER_SEC;

  /* ── derived render data ──────────────────────────────────── */
  const { timedComments, untimedComments, clusters } = useMemo(() => {
    const timed = comments
      .filter((c) => c.timestamp_seconds !== null)
      .sort((a, b) => (a.timestamp_seconds ?? 0) - (b.timestamp_seconds ?? 0));
    const untimed = comments.filter((c) => c.timestamp_seconds === null);
    const cls: Cluster[] = [];
    for (const c of timed) {
      const t = c.timestamp_seconds ?? 0;
      const last = cls[cls.length - 1];
      if (last && t - (last.items[last.items.length - 1].timestamp_seconds ?? 0) <= CLUSTER_GAP_SEC) {
        last.items.push(c);
        last.end = t;
      } else {
        cls.push({ id: c.id, start: t, end: t, items: [c] });
      }
    }
    return { timedComments: timed, untimedComments: untimed, clusters: cls };
  }, [comments]);

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
    setShowActions(false);
    setOpenClusters(new Set());
    setActiveClusterId(null);

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

  // Gesture hint fades out shortly after each track loads
  useEffect(() => {
    setShowHint(true);
    const id = setTimeout(() => setShowHint(false), 6000);
    return () => clearTimeout(id);
  }, [track.id]);

  // Karma balance (hidden in preview mode / until the DB column exists)
  useEffect(() => {
    if (previewComments) return;
    fetchKarma(userId).then(setKarma).catch(() => {});
  }, [userId, track.id, previewComments]);

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

    // spine breathes with the live analyser (2px → 8px + glow).
    // No CSS transition here — the rAF loop smooths with a musical envelope
    // (fast attack, slow release); a transition would re-damp every frame.
    if (spineRef.current) {
      let amp = 0;
      if (playing) {
        if (analyserRef.current) {
          const { analyser, data } = analyserRef.current;
          analyser.getByteFrequencyData(data);
          const end = Math.floor(data.length / 3);
          let sum = 0;
          for (let i = 0; i < end; i++) sum += data[i];
          amp = Math.min(1, (sum / (end * 255)) * 2.8);
          if (amp < 0.01) zeroFramesRef.current++;
          else zeroFramesRef.current = 0;
        }
        // iOS fallback: analyser unavailable (or muted by CORS — reads all
        // zeros while audio is audible) → synthesize a gentle pulse so the
        // tape never plays dead.
        if (!analyserRef.current || zeroFramesRef.current > 45) {
          amp = 0.22 + 0.16 * Math.abs(Math.sin(t * 2.2)) + 0.1 * Math.abs(Math.sin(t * 3.7));
        }
      }
      const prev = ampSmoothRef.current;
      const a = prev + (amp - prev) * (amp > prev ? 0.5 : 0.1);
      ampSmoothRef.current = a;
      const w = 2 + a * 6;
      const el = spineRef.current;
      el.style.width = `${w.toFixed(2)}px`;
      el.style.marginLeft = `${(-(w - 2) / 2).toFixed(2)}px`;
      el.style.background = `rgba(255,255,255,${(0.14 + a * 0.28).toFixed(3)})`;
      el.style.boxShadow = `0 0 ${(4 + a * 16).toFixed(1)}px rgba(255,255,255,${(0.05 + a * 0.3).toFixed(3)})`;
      if (nowDotRef.current) {
        nowDotRef.current.style.boxShadow = `0 0 ${(10 + a * 14).toFixed(1)}px rgba(245,166,35,${(0.7 + a * 0.3).toFixed(2)})`;
        nowDotRef.current.style.transform = `scale(${(1 + a * 0.25).toFixed(3)})`;
      }
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

    // playhead inside a cluster's range → it fans open on its own
    let active: string | null = null;
    for (const cl of clusters) {
      if (cl.items.length > 1 && t >= cl.start - SPEAK_WINDOW && t <= cl.end + SPEAK_WINDOW) { active = cl.id; break; }
    }
    setActiveClusterId((prev) => (prev === active ? prev : active));

    rafRef.current = requestAnimationFrame(syncFrame);
  }, [comments, clusters, duration, playing]);

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
        const a = audioRef.current;
        if (navigator.vibrate) navigator.vibrate(10);
        /* [2026-08-11] Para y se coloca en el segundo marcado, en vez de solo
           bajarle el volumen y seguir.
           El globo cuelga de ese segundo DENTRO del feed, asi que con la cinta
           corriendo se iria de la pantalla mientras escribes. Y al llevar la
           reproduccion ahi, el segundo marcado queda en la linea de ahora
           —el tercio superior—, que es la unica parte que el teclado no tapa.
           Antes el compositor vivia clavado a la linea de ahora, asi que este
           problema no existia; ahora que apunta al punto real, hay que llevarlo
           al punto real. Mismo trato que en escritorio. */
        if (a) { a.pause(); a.currentTime = t; a.volume = 1; }
        setPlaying(false);
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

      // First note ever → mark the onboarding step done + explain karma in-context.
      if (!previewComments) {
        try {
          localStorage.setItem("fennec_has_left_note_v1", "1");
          if (localStorage.getItem("fennec_karma_intro_seen_v1") !== "1") {
            localStorage.setItem("fennec_karma_intro_seen_v1", "1");
            setShowKarmaIntro(true);
          }
        } catch { /* private mode: skip the moment, no harm */ }
      }

      // Keep the balance chip fresh (karma moves via stamps/purchases, not comments)
      if (!previewComments) {
        fetchKarma(userId).then((k) => { if (k !== null) setKarma(k); }).catch(() => {});
      }
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
    const audio = audioRef.current;
    // The streak measures EARLY BAILS, not listens (Paco, 2026-07-03):
    // a real listen is already value for the artist, so it never walls
    // the session — only serial zapping does.
    const frac = audio && duration > 0 ? audio.currentTime / duration : 0;
    audio?.pause();
    if (ended || frac >= 0.8) onSkipStreakChange(0);        // real listen — resets
    else if (frac < 0.5) onSkipStreakChange(skipStreak + 1); // early bail — counts
    /* 50–80%: neutral — neither punishes nor resets */
    onPass();
  }

  function toggleCluster(id: string) {
    setOpenClusters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const tickCount = Math.floor(duration / 15);
  const hasActions = Boolean(onOpenMelody || onOpenMyTracks || onOpenIntro);

  // The only reaction that exists: the artist's grease-pencil seal
  const stampBadge = (
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
  );

  return (
    <div
      className="absolute inset-0 overflow-hidden select-none"
      style={{
        fontFamily: UI_FONT,
        background: "linear-gradient(180deg, #17151b 0%, #131216 45%, #0f0e12 100%)",
      }}
    >
      {/* ── the tape — full bleed, receives all gestures ── */}
      <div
        ref={viewportRef}
        className="absolute inset-0 touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* now-line — spans the whole screen */}
        <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${NOWLINE_FRAC * 100}%` }}>
          <div style={{ height: 1, background: "linear-gradient(90deg, rgba(245,166,35,.5), rgba(255,255,255,.06) 45%, transparent)" }} />
          <span
            ref={nowDotRef}
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
          className="absolute z-30 pointer-events-none rounded-lg px-2.5 py-1 text-[11px]"
          style={{
            ...GLASS,
            fontFamily: MONO_FONT, right: 16, top: `calc(${NOWLINE_FRAC * 100}% - 30px)`,
            color: AMBER_HOT, opacity: 0, transition: "opacity .2s",
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
            style={{ left: SPINE_X, top: -400, bottom: -200, width: 2, background: "rgba(255,255,255,.14)", borderRadius: 2 }}
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
              </div>
            );
          })}

          {/* grease-pencil ticks — one per comment, always honest to its timestamp */}
          {timedComments.map((c) => {
            const t = c.timestamp_seconds ?? 0;
            const isSpeaking = c.id === speakingId;
            return (
              <span
                key={`tick-${c.id}`}
                className="absolute pointer-events-none"
                style={{
                  left: SPINE_X, top: t * PX_PER_SEC, width: 20, height: 2, borderRadius: 2,
                  background: isSpeaking ? AMBER_HOT : AMBER,
                  opacity: isSpeaking ? 1 : 0.75,
                  boxShadow: isSpeaking ? `0 0 10px rgba(255,200,97,.7)` : "none",
                  transition: "all .3s",
                }}
              />
            );
          })}

          {/* comment cards — lone comments render full, close neighbors cluster */}
          {clusters.map((cl) => {
            if (cl.items.length === 1) {
              const c = cl.items[0];
              const t = c.timestamp_seconds ?? 0;
              const isSpeaking = c.id === speakingId;
              const isPast = pastIds.has(c.id);
              return (
                <div
                  key={cl.id}
                  className="absolute rounded-xl"
                  style={{
                    left: SPINE_X + 20, right: 16, top: t * PX_PER_SEC - 14,
                    padding: "10px 13px",
                    background: isSpeaking ? "rgba(245,166,35,.08)" : "transparent",
                    transform: isSpeaking ? "scale(1.03)" : "scale(1)",
                    transformOrigin: "left center",
                    opacity: isPast ? 0.42 : 1,
                    transition: "all .45s cubic-bezier(.22,1,.36,1)",
                  }}
                >
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
                  {c.stamped && stampBadge}
                </div>
              );
            }

            const expanded = openClusters.has(cl.id) || activeClusterId === cl.id;
            const clusterPast = pastIds.has(cl.items[cl.items.length - 1].id);
            return (
              <div key={cl.id}>
                {/* collapsed chip — stacked avatars + count + range */}
                <button
                  onClick={() => toggleCluster(cl.id)}
                  className="absolute z-30 flex items-center gap-2 rounded-full pl-2 pr-3 py-1.5"
                  style={{
                    ...GLASS,
                    left: SPINE_X + 20, top: cl.start * PX_PER_SEC - 14,
                    opacity: expanded ? 0 : clusterPast ? 0.42 : 1,
                    transform: expanded ? "scale(.9)" : "scale(1)",
                    transformOrigin: "left center",
                    pointerEvents: expanded ? "none" : "auto",
                    transition: "opacity .3s, transform .3s cubic-bezier(.22,1,.36,1)",
                  }}
                >
                  <span className="flex -space-x-1.5">
                    {cl.items.slice(0, 3).map((c) => (
                      <span key={c.id} className="w-[18px] h-[18px] rounded-full overflow-hidden flex items-center justify-center text-[8px] font-semibold"
                        style={{ background: "linear-gradient(135deg,#3a3a42,#22222a)", color: "rgba(255,255,255,.6)", border: "1.5px solid #131216" }}>
                        {c.profile?.avatar_url
                          ? <img src={c.profile.avatar_url} className="w-full h-full object-cover" alt="" />
                          : (c.profile?.username?.[0] ?? "?").toUpperCase()}
                      </span>
                    ))}
                  </span>
                  <span className="text-[9px] font-bold" style={{ fontFamily: MONO_FONT, color: AMBER }}>
                    {cl.items.length} marks
                  </span>
                  <span className="text-[8.5px]" style={{ fontFamily: MONO_FONT, color: "rgba(255,255,255,.35)" }}>
                    {fmt(cl.start)}–{fmt(cl.end)}
                  </span>
                </button>

                {/* expanded panel — the cluster fans open */}
                <div
                  className="absolute z-40 rounded-2xl px-3.5 py-3"
                  style={{
                    ...GLASS,
                    background: "rgba(19,18,22,0.78)",
                    left: SPINE_X + 16, right: 12, top: cl.start * PX_PER_SEC - 14,
                    opacity: expanded ? 1 : 0,
                    transform: expanded ? "scale(1)" : "scale(.95)",
                    transformOrigin: "top left",
                    pointerEvents: expanded ? "auto" : "none",
                    transition: "opacity .3s, transform .35s cubic-bezier(.22,1,.36,1)",
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <button onClick={() => toggleCluster(cl.id)} className="w-full flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-bold" style={{ fontFamily: MONO_FONT, color: AMBER }}>
                      {cl.items.length} marks
                    </span>
                    <span className="text-[8.5px]" style={{ fontFamily: MONO_FONT, color: "rgba(255,255,255,.35)" }}>
                      {fmt(cl.start)}–{fmt(cl.end)}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 ml-auto" style={{ color: "rgba(255,255,255,.4)", transform: "rotate(180deg)" }} />
                  </button>
                  <div className="space-y-3">
                    {cl.items.map((c, i) => {
                      const t = c.timestamp_seconds ?? 0;
                      const isSpeaking = c.id === speakingId;
                      const isPast = pastIds.has(c.id);
                      return (
                        <div
                          key={c.id}
                          className="rounded-xl px-2 py-1.5 -mx-2"
                          style={{
                            background: isSpeaking ? "rgba(245,166,35,.08)" : "transparent",
                            opacity: expanded ? (isPast && !isSpeaking ? 0.5 : 1) : 0,
                            transform: expanded ? "translateY(0)" : "translateY(6px)",
                            transition: `opacity .3s ${i * 0.04}s, transform .3s cubic-bezier(.22,1,.36,1) ${i * 0.04}s, background .3s`,
                          }}
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center text-[7px] font-semibold shrink-0"
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
                              style={{ fontFamily: MONO_FONT, color: isSpeaking ? AMBER_HOT : "rgba(255,255,255,.3)" }}
                            >
                              {fmt(t)}
                            </button>
                          </div>
                          <p
                            className="text-[13.5px] leading-relaxed"
                            style={{
                              fontFamily: SERIF_FONT,
                              color: isSpeaking ? "rgba(255,255,255,.92)" : "rgba(255,255,255,.6)",
                              transition: "color .3s",
                            }}
                          >
                            {renderBodyWithTimestamps(c.body, seekTo)}
                          </p>
                          {c.stamped && stampBadge}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {/* general notes (untimed) — docked at the end of the tape */}
          {untimedComments.length > 0 && (
            <div className="absolute" style={{ left: SPINE_X + 20, right: 16, top: feedHeight + 60 }}>
              <p className="text-[9px] font-bold uppercase mb-3" style={{ fontFamily: MONO_FONT, letterSpacing: "0.25em", color: "rgba(255,255,255,.3)" }}>
                General notes
              </p>
              <div className="space-y-4">
                {untimedComments.map((c) => (
                  <div key={c.id}>
                    <p className="text-[10px] font-semibold mb-0.5" style={{ color: "rgba(255,255,255,.45)" }}>
                      @{c.profile?.username ?? "unknown"}
                    </p>
                    <p className="text-[13.5px] leading-relaxed" style={{ fontFamily: SERIF_FONT, color: "rgba(255,255,255,.6)" }}>
                      {renderBodyWithTimestamps(c.body, seekTo)}
                    </p>
                    {c.stamped && stampBadge}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* empty state */}
          {timedComments.length === 0 && untimedComments.length === 0 && (
            <div className="absolute" style={{ left: SPINE_X + 24, right: 24, top: 60 }}>
              <p className="text-[14px] italic leading-relaxed" style={{ fontFamily: SERIF_FONT, color: "rgba(255,255,255,.35)" }}>
                Nobody&rsquo;s marked this tape yet. Hold the line where you hear something.
              </p>
            </div>
          )}

          {/* ── El globo para dejar una nota ──
              Vive DENTRO del feed, colgado del segundo marcado, con el mismo
              sitio y el mismo ancho que las tarjetas de las demas notas: tick
              ambar en el espinazo y la caja a partir de SPINE_X + 20. Antes era
              una franja clavada a la linea de ahora, que no decia a que segundo
              pertenecia mas alla del rotulo (Paco 2026-08-11: el mismo globo que
              en escritorio). Al hacer la pulsacion larga la reproduccion se va a
              ese segundo, asi que el globo cae en la linea de ahora — arriba del
              teclado — sin dejar de apuntar al punto de verdad.

              El borde ambar se queda: distingue "esto lo estas escribiendo tu
              ahora" de las notas ya publicadas, que van sin caja. */}
          {markAt !== null && (
            <div
              className="absolute z-40"
              style={{
                left: SPINE_X + 20, right: 16, top: markAt * PX_PER_SEC - 14,
                /* El origen es el RABITO (0, 14px), no el centro del costado:
                   el globo tiene que brotar del punto que toca la linea. Con
                   "left center" crecia desde la mitad de su propia altura, o
                   sea desde un sitio donde no hay nada. */
                transformOrigin: "0 14px",
                animation: "notePop 280ms cubic-bezier(.23,1,.32,1) both",
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {/* El rabito mira al espinazo: es lo que ata la caja a su segundo. */}
              <span
                className="absolute"
                style={{
                  left: -5, top: 14, width: 10, height: 10,
                  transform: "translateY(-50%) rotate(45deg)",
                  background: "rgba(19,18,22,0.55)",
                  backdropFilter: "blur(24px) saturate(160%)",
                  WebkitBackdropFilter: "blur(24px) saturate(160%)",
                  borderLeft: "1px solid rgba(245,166,35,.35)",
                  borderBottom: "1px solid rgba(245,166,35,.35)",
                }}
              />
              <div className="rounded-2xl p-3" style={{ ...GLASS, border: "1px solid rgba(245,166,35,.35)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] uppercase" style={{ fontFamily: MONO_FONT, letterSpacing: "0.18em", color: AMBER }}>
                    {t("prMarcaEn", { at: fmt(markAt) })}
                  </span>
                  <button onClick={closeMark} className="text-[11px]" style={{ color: "rgba(255,255,255,.4)" }}>
                    {t("mtCancel")}
                  </button>
                </div>
                <textarea
                  autoFocus
                  value={markBody}
                  onChange={(e) => setMarkBody(e.target.value)}
                  placeholder={t("prQueEscuchas")}
                  rows={2}
                  className="w-full bg-transparent outline-none resize-none text-[14.5px] italic leading-relaxed"
                  style={{ fontFamily: SERIF_FONT, color: "rgba(255,255,255,.92)", caretColor: AMBER }}
                />
                <div className="flex justify-end">
                  <button
                    onClick={submitMark}
                    disabled={!markBody.trim() || posting}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition active:scale-[0.97] disabled:opacity-30"
                    style={{ background: AMBER, color: "#111114" }}
                  >
                    {posting ? "…" : t("prMarcarlo")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* El tick del globo, en el espinazo: la misma marca ambar que dejan
              las notas publicadas, para que el segundo se lea en la linea aunque
              la caja quede a un lado. */}
          {markAt !== null && (
            <span
              className="absolute pointer-events-none z-40"
              style={{
                left: SPINE_X, top: markAt * PX_PER_SEC, width: 20, height: 2, borderRadius: 2,
                background: AMBER_HOT, boxShadow: "0 0 10px rgba(255,200,97,.7)",
              }}
            />
          )}
        </div>

        {/* session recap — the tape "prints" */}
        {ended && (
          <div className="absolute inset-0 z-40 flex items-center justify-center p-6"
            style={{ background: "rgba(11,10,9,.7)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
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
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => { setEnded(false); if (audioRef.current) audioRef.current.currentTime = 0; }}
                  className="text-[11px] font-semibold px-4 py-2 rounded-xl transition"
                  style={{ ...GLASS, color: "rgba(255,255,255,.6)" }}
                >
                  Listen again
                </button>
                {/* a full listen is a contribution — advancing here never
                    counts as a skip */}
                <button
                  onClick={() => { onSkipStreakChange(0); onPass(); }}
                  className="text-[11px] font-bold px-4 py-2 rounded-xl transition active:scale-95"
                  style={{ background: AMBER, color: "#111114" }}
                >
                  Next track
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── floating glass header — track info (recedes on play) ── */}
      <div
        className="absolute left-4 z-30 pointer-events-none rounded-2xl px-4 py-3"
        style={{
          ...GLASS,
          top: "calc(env(safe-area-inset-top) + 3.4rem)",
          maxWidth: "62%",
          transform: playing ? "scale(0.97)" : "scale(1)",
          opacity: playing ? 0.6 : 1,
          transformOrigin: "left top",
          transition: "transform .45s cubic-bezier(.22,1,.36,1), opacity .45s",
        }}
      >
        <p className="text-[15px] font-semibold text-white truncate" style={{ letterSpacing: "-0.01em" }}>{track.title}</p>
        <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,.45)" }}>
          @{track.profile?.username ?? "unknown"} · {fmt(duration)}
        </p>
        <span
          className="inline-block mt-2 text-[8px] font-bold uppercase px-2 py-0.5 rounded"
          style={{
            fontFamily: MONO_FONT, letterSpacing: "0.18em",
            color: "rgba(255,255,255,.6)", border: "1px solid rgba(255,255,255,.22)",
            transform: "rotate(-2deg)",
          }}
        >
          {track.category}
        </span>
      </div>

      {/* timecode — glass chip, top right */}
      <span
        ref={tcRef}
        className="absolute right-4 z-30 pointer-events-none rounded-full px-3 py-1.5 text-[11px]"
        style={{
          ...GLASS,
          top: "calc(env(safe-area-inset-top) + 3.4rem)",
          fontFamily: MONO_FONT, color: "rgba(255,255,255,.6)",
        }}
      >
        0:00 / {fmt(duration)}
      </span>

      {/* karma balance — the economy, visible where it grows */}
      {karma !== null && (
        <span
          className="absolute right-4 z-30 pointer-events-none rounded-full px-3 py-1 text-[10px]"
          style={{
            ...GLASS,
            top: "calc(env(safe-area-inset-top) + 5.7rem)",
            fontFamily: MONO_FONT, color: AMBER,
          }}
        >
          ⚡ {karma} karma
        </span>
      )}


      {/* karma gate — glass banner above the transport */}
      {karmaBlocked && (
        <div
          className="absolute left-4 right-4 z-40 rounded-2xl px-3 py-2.5 text-xs text-center font-medium"
          style={{
            ...GLASS,
            bottom: "7rem",
            border: "1px solid rgba(245,166,35,.3)",
            color: AMBER,
            boxShadow: "0 0 18px rgba(245,166,35,.12), inset 0 1px 0 rgba(255,255,255,.08)",
          }}
        >
          Other producers need your help. Leave a mark to keep listening.
        </div>
      )}

      {/* skips remaining — above transport */}
      {skipStreak > 0 && !karmaBlocked && (
        <div className="absolute left-0 right-0 z-40 flex items-center justify-center gap-1.5" style={{ bottom: "6.1rem" }}>
          {Array.from({ length: MAX_SKIPS }).map((_, i) => (
            <span key={i} className="w-1 h-1 rounded-full transition-colors"
              style={{ background: i < MAX_SKIPS - skipStreak ? "rgba(245,166,35,.75)" : "rgba(255,255,255,.12)" }} />
          ))}
          <span className="text-[9px] ml-1 uppercase tracking-wider" style={{ color: "rgba(255,255,255,.3)" }}>skips left</span>
        </div>
      )}

      {/* gesture hint — fades out after a few seconds */}
      <p
        className="absolute left-0 right-0 z-30 text-center text-[10px] pointer-events-none"
        style={{
          bottom: "6.1rem",
          color: "rgba(255,255,255,.35)",
          opacity: showHint && skipStreak === 0 && !karmaBlocked ? 1 : 0,
          transition: "opacity .8s",
        }}
      >
        Hold the tape to mark a moment · drag to scrub
      </p>

      {/* ── transport — floating liquid-glass bar ── */}
      <div className="absolute left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full p-1.5" style={{ ...GLASS, bottom: "2.5rem" }}>
        <button
          onClick={handlePass}
          disabled={karmaBlocked}
          className="h-10 px-5 rounded-full text-[13px] font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition active:scale-[0.96]"
          style={{ color: "rgba(255,255,255,.55)" }}
        >
          Pass
        </button>
        <button
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition active:scale-95"
          style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.14)" }}
        >
          {playing
            ? <svg viewBox="0 0 24 24" style={{ fill: "rgba(255,255,255,.92)", width: 16, height: 16 }}><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
            : <svg viewBox="0 0 24 24" style={{ fill: "rgba(255,255,255,.92)", width: 16, height: 16, transform: "translateX(1px)" }}><path d="M7 5v14l12-7z"/></svg>}
        </button>
        {hasActions && (
          <button
            onClick={() => setShowActions((v) => !v)}
            aria-label={t("prMasAcciones")}
            aria-expanded={showActions}
            className="w-10 h-10 rounded-full flex items-center justify-center transition active:scale-95"
            style={{ color: showActions ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.45)" }}
          >
            <MoreHorizontal className="h-5 w-5" style={{ transform: showActions ? "rotate(90deg)" : "none", transition: "transform .3s cubic-bezier(.22,1,.36,1)" }} />
          </button>
        )}
      </div>

      {/* ⋯ flyout — Melody Bank & My Tracks, hidden until asked for */}
      {hasActions && (
        <div
          className="absolute z-40 flex flex-col items-end gap-2"
          style={{
            right: "1rem", bottom: "6.1rem",
            pointerEvents: showActions ? "auto" : "none",
          }}
        >
          {onOpenIntro && (
            <button
              onClick={() => { setShowActions(false); onOpenIntro(); }}
              className="flex items-center gap-2.5 rounded-full pl-4 pr-3 py-2.5 transition active:scale-95"
              style={{
                ...GLASS,
                color: "rgba(255,255,255,.6)",
                opacity: showActions ? 1 : 0,
                transform: showActions ? "translateY(0) scale(1)" : "translateY(14px) scale(.92)",
                transition: "opacity .28s cubic-bezier(.22,1,.36,1), transform .28s cubic-bezier(.22,1,.36,1)",
                transitionDelay: showActions ? ".1s" : "0s",
              }}
            >
              <span className="text-[12px] font-semibold">{t("tpHowItWorks")}</span>
              <HelpCircle className="h-4 w-4" />
            </button>
          )}
          {onOpenMelody && (
            <button
              onClick={() => { setShowActions(false); onOpenMelody(); }}
              className="flex items-center gap-2.5 rounded-full pl-4 pr-3 py-2.5 transition active:scale-95"
              style={{
                ...GLASS,
                color: "rgba(255,255,255,.85)",
                opacity: showActions ? 1 : 0,
                transform: showActions ? "translateY(0) scale(1)" : "translateY(14px) scale(.92)",
                transition: "opacity .28s cubic-bezier(.22,1,.36,1), transform .28s cubic-bezier(.22,1,.36,1)",
                transitionDelay: showActions ? ".05s" : "0s",
              }}
            >
              <span className="text-[12px] font-semibold">Melody Bank</span>
              <Mic className="h-4 w-4" />
            </button>
          )}
          {onOpenMyTracks && (
            <button
              onClick={() => { setShowActions(false); onOpenMyTracks(); }}
              className="flex items-center gap-2.5 rounded-full pl-4 pr-3 py-2.5 transition active:scale-95"
              style={{
                ...GLASS,
                color: "#111114",
                background: `linear-gradient(180deg, #ffc25c 0%, ${AMBER} 100%)`,
                border: "1px solid rgba(255,255,255,.25)",
                opacity: showActions ? 1 : 0,
                transform: showActions ? "translateY(0) scale(1)" : "translateY(14px) scale(.92)",
                transition: "opacity .28s cubic-bezier(.22,1,.36,1), transform .28s cubic-bezier(.22,1,.36,1)",
              }}
            >
              <span className="text-[12px] font-bold">{t("tpMyTracks")}</span>
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* First-note karma moment — explains the give-to-get loop the instant
          they leave their first mark (their first way to earn karma). */}
      {showKarmaIntro && (
        <div
          className="absolute inset-0 z-[60] flex items-center justify-center px-8"
          style={{ background: "rgba(10,9,8,0.72)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", animation: "sheetFadeIn .25s ease both" }}
          onClick={() => setShowKarmaIntro(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-3xl p-6 text-center"
            style={{ ...GLASS, border: `1px solid ${AMBER}30`, boxShadow: `0 0 40px ${AMBER}18, inset 0 1px 0 rgba(255,255,255,.08)` }}
          >
            <div
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-lg font-black"
              style={{ background: `linear-gradient(180deg, #ffc25c 0%, ${AMBER} 100%)`, color: "#111114" }}
            >
              +2
            </div>
            <h3 className="text-base font-bold text-white">That&rsquo;s your first note.</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-zinc-300">
              When the artist seals it as helpful, you earn <strong style={{ color: AMBER }}>+2 karma</strong>. Karma is what you spend to get feedback on your own tracks.
            </p>
            <p className="mt-2 text-xs font-semibold" style={{ color: AMBER }}>{t("prDaParaRecibir")}</p>
            <button
              onClick={() => setShowKarmaIntro(false)}
              className="mt-5 w-full rounded-2xl py-3 text-sm font-bold text-black transition active:scale-[0.98]"
              style={{ background: `linear-gradient(180deg, #ffc25c 0%, ${AMBER} 100%)` }}
            >
              Got it
            </button>
          </div>
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
