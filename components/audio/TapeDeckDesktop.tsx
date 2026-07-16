"use client";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, SkipForward, Plus, Upload } from "lucide-react";
import type { ProjectReview, ReviewComment } from "@/lib/audioTypes";
import { fetchReviewComments, createReviewComment, fetchKarma } from "@/lib/audioDb";

/* ═══════════════════════════════════════════════════════════════
   THE TAPE — desktop. A reel-to-reel machine, not a waveform (every
   app has a waveform): two spinning metal reels with the classic
   3-window plates, the tape pancake transferring from supply to
   take-up as the song plays, amber VU meters lit by the real audio
   signal, and the tape itself as a horizontal strip — timecode
   ticks + grease-pencil marks flowing past a fixed head, the same
   language as the mobile player rotated 90°. Reuses the real data
   layer and real playback.
   ═══════════════════════════════════════════════════════════════ */

const AMBER = "#f5a623";
const AMBER_HOT = "#ffc861";
const DECK = "#131216";

const PX_PER_SEC = 16;      // tape strip scale
const R_FULL = 86;          // pancake radius, viewBox units (reel viewBox 0..200)
const R_EMPTY = 40;
const TAPE_SPEED = 110;     // linear tape speed in viewBox units/s → reel spin

const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

/* ── one reel: light metal plate (RTM-style 3 cutouts) over a dark
   tape pancake. The pancake radius + plate rotation are driven from
   the animation loop via refs — zero React re-renders. ── */
/* ── one reel, modern-vintage: no photoreal metal, no screws, no bezels.
   The reel is drawn in Fennec's own language — flat dark tape disc, a
   1.5px amber edge that IS the fill-level indicator, a hairline outer
   rim for structure, and a thin-spoke hub whose rotation carries the
   motion. All the machine's physics stay (spin ∝ 1/radius, pancake
   transfer); only the rendering stops pretending to be a photo. ── */
function Reel({ plateRef, pancakeRef, edgeRef, r0 }: {
  plateRef: React.Ref<SVGGElement>;
  pancakeRef: React.Ref<SVGCircleElement>;
  /** amber edge circle — tracks the pancake radius from the loop */
  edgeRef: React.Ref<SVGCircleElement>;
  /** initial pancake radius — supply reel starts full, take-up starts empty */
  r0: number;
}) {
  return (
    <svg viewBox="0 0 200 200" style={{ width: "min(28vh, 250px)", height: "auto", display: "block" }}>
      {/* structural rim — always there, whisper-quiet */}
      <circle cx="100" cy="100" r="95" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="1" />

      {/* wound tape: flat dark disc + amber edge as the level indicator */}
      <circle ref={pancakeRef} cx="100" cy="100" r={r0} fill="#1a1511" />
      <circle ref={edgeRef} cx="100" cy="100" r={r0} fill="none" stroke={AMBER} strokeWidth="1.5" opacity="0.85"
        style={{ filter: `drop-shadow(0 0 6px ${AMBER}50)` }} />

      {/* rotating hub — three thin spokes + an amber index dot that makes
          the spin legible without any metal plate */}
      <g ref={plateRef}>
        <circle cx="100" cy="100" r="30" fill={DECK} stroke="rgba(255,255,255,.14)" strokeWidth="1" />
        <line x1="100" y1="100" x2="100" y2="73" stroke="rgba(255,255,255,.3)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="100" y1="100" x2="123.4" y2="113.5" stroke="rgba(255,255,255,.3)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="100" y1="100" x2="76.6" y2="113.5" stroke="rgba(255,255,255,.3)" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="100" cy="78" r="2.5" fill={AMBER} />
        <circle cx="100" cy="100" r="5" fill="#0e0c0d" stroke="rgba(255,255,255,.18)" strokeWidth="1" />
      </g>
    </svg>
  );
}

/* ── VU meter, minimal: a floating arc + amber needle. No lit box, no
   bezel — instrument reading, not instrument cosplay. ── */
function VuMeter({ needleRef, label }: { needleRef: React.Ref<HTMLDivElement>; label: string }) {
  return (
    <div className="relative" style={{ width: 108, height: 62 }}>
      {/* track arc + ticks — coords rounded: raw Math.cos floats aren't
          bit-identical across JS engines and caused SSR hydration noise */}
      <svg viewBox="0 0 108 62" className="absolute inset-0">
        {/* the arc the needle sweeps */}
        <path d="M 20.4 24.6 A 47 47 0 0 1 87.6 24.6" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="2" strokeLinecap="round" />
        {Array.from({ length: 9 }, (_, i) => {
          const deg = -46 + i * 11.5;
          const a = (deg - 90) * (Math.PI / 180);
          const r2 = (n: number) => Math.round(n * 100) / 100;
          const hot = i >= 7;
          return (
            <line key={i}
              x1={r2(54 + 44 * Math.cos(a))} y1={r2(58 + 44 * Math.sin(a))}
              x2={r2(54 + 49 * Math.cos(a))} y2={r2(58 + 49 * Math.sin(a))}
              stroke={hot ? "#e5484d" : "rgba(255,255,255,.22)"} strokeWidth={hot ? 1.8 : 1} />
          );
        })}
      </svg>
      {/* needle — amber, pivots at bottom center */}
      <div ref={needleRef} className="absolute" style={{ left: 53, bottom: 4, width: 1.5, height: 46, transformOrigin: "bottom center", background: AMBER, borderRadius: 1, transform: "rotate(-46deg)", boxShadow: `0 0 6px ${AMBER}66` }} />
      <div className="absolute rounded-full" style={{ left: 51.5, bottom: 2, width: 5, height: 5, background: "rgba(255,255,255,.25)" }} />
      <span className="absolute bottom-[-11px] left-0 right-0 text-center font-mono text-[7px] font-bold tracking-[0.22em] text-zinc-600">{label}</span>
    </div>
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

  // Web Audio graph (built lazily on first play) — feeds the VU meters.
  const audioCtxRef  = useRef<AudioContext | null>(null);
  const analyserRef  = useRef<AnalyserNode | null>(null);
  const sourceRef    = useRef<MediaElementAudioSourceNode | null>(null);
  const freqRef      = useRef<Uint8Array<ArrayBuffer> | null>(null);

  // Machine parts driven per-frame via refs (no re-render):
  const stripVpRef      = useRef<HTMLDivElement>(null);  // strip viewport (fixed head at its center)
  const stripRef        = useRef<HTMLDivElement>(null);  // moving tape
  const leftPlateRef    = useRef<SVGGElement>(null);
  const rightPlateRef   = useRef<SVGGElement>(null);
  const leftPancakeRef  = useRef<SVGCircleElement>(null);
  const rightPancakeRef = useRef<SVGCircleElement>(null);
  const leftEdgeRef     = useRef<SVGCircleElement>(null);
  const rightEdgeRef    = useRef<SVGCircleElement>(null);
  const vuLRef          = useRef<HTMLDivElement>(null);
  const vuRRef          = useRef<HTMLDivElement>(null);
  const angleL = useRef(0);
  const angleR = useRef(0);
  const vuLevel = useRef(0);

  const [playing, setPlaying]   = useState(false);
  const [t, setT]               = useState(0);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [karma, setKarma]       = useState<number | null>(null);
  const [marking, setMarking]   = useState(false);
  const [markAt, setMarkAt]     = useState(0);
  const [body, setBody]         = useState("");
  const [posting, setPosting]   = useState(false);

  const duration = track.duration_seconds || audioRef.current?.duration || 1;

  // load comments + karma per track
  useEffect(() => {
    setComments([]); setT(0); setPlaying(false); setMarking(false);
    angleL.current = 0; angleR.current = 0;
    fetchReviewComments(track.id).then(setComments).catch(() => {});
    fetchKarma(userId).then(setKarma).catch(() => {});
  }, [track.id, userId]);

  // coarse clock (paused / seek accuracy) + end-of-tape
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setT(a.currentTime);
    const onEnd  = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    return () => { a.removeEventListener("timeupdate", onTime); a.removeEventListener("ended", onEnd); };
  }, [track.id]);

  // ── THE MACHINE LOOP ──────────────────────────────────────────
  // One rAF drives everything mechanical: the tape strip position,
  // both reels (speed ∝ 1/radius — a full reel turns slow, an empty
  // one fast, like the real machine), the pancake transfer, and the
  // VU needles from the analyser's energy. All via refs.
  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const a = audioRef.current;
      const cur = a ? a.currentTime : 0;
      const isPlaying = !!a && !a.paused;
      if (isPlaying) setT(cur);

      // tape strip — time cur sits exactly under the head (viewport center)
      const vp = stripVpRef.current, strip = stripRef.current;
      if (vp && strip) {
        strip.style.transform = `translateX(${vp.clientWidth / 2 - cur * PX_PER_SEC}px)`;
      }

      // pancake transfer — the amber edge rides the pancake's radius
      const prog = duration > 0 ? Math.min(cur / duration, 1) : 0;
      const rL = R_EMPTY + (R_FULL - R_EMPTY) * (1 - prog);
      const rR = R_EMPTY + (R_FULL - R_EMPTY) * prog;
      leftPancakeRef.current?.setAttribute("r", rL.toFixed(1));
      rightPancakeRef.current?.setAttribute("r", rR.toFixed(1));
      leftEdgeRef.current?.setAttribute("r", rL.toFixed(1));
      rightEdgeRef.current?.setAttribute("r", rR.toFixed(1));

      // reel spin — angular speed = tape speed / current radius
      if (isPlaying && !reduce) {
        angleL.current = (angleL.current + (TAPE_SPEED / rL) * dt * (180 / Math.PI)) % 360;
        angleR.current = (angleR.current + (TAPE_SPEED / rR) * dt * (180 / Math.PI)) % 360;
        leftPlateRef.current?.setAttribute("transform", `rotate(${angleL.current.toFixed(2)} 100 100)`);
        rightPlateRef.current?.setAttribute("transform", `rotate(${angleR.current.toFixed(2)} 100 100)`);
      }

      // VU needles — real spectrum energy; fast attack, slow release
      let level = 0;
      const an = analyserRef.current, bins = freqRef.current;
      if (isPlaying && an && bins) {
        an.getByteFrequencyData(bins);
        let s = 0; const n = Math.min(bins.length, 96);
        for (let k = 0; k < n; k++) s += bins[k];
        level = s / (n * 255);
        // headless / CORS-blocked source gives silence — sway gently instead
        if (level < 0.02) level = 0.3 + 0.16 * Math.sin(cur * 2.3);
      }
      vuLevel.current += (level - vuLevel.current) * (level > vuLevel.current ? 0.4 : 0.07);
      if (!reduce || !isPlaying) {
        const deg = -46 + vuLevel.current * 92;
        if (vuLRef.current) vuLRef.current.style.transform = `rotate(${deg.toFixed(1)}deg)`;
        if (vuRRef.current) vuRRef.current.style.transform = `rotate(${(deg * 0.93).toFixed(1)}deg)`;
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration, track.id]);

  // Build the analyser once, on first play (user gesture). Failures are
  // silent — VUs just rest, playback never breaks.
  function ensureAudioGraph() {
    const a = audioRef.current;
    if (!a || audioCtxRef.current) return;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const source = ctx.createMediaElementSource(a);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current   = source;
      freqRef.current     = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
    } catch { /* VUs stay at rest */ }
  }

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      ensureAudioGraph();
      void audioCtxRef.current?.resume();
      void a.play(); setPlaying(true);
    } else {
      a.pause(); setPlaying(false);
    }
  }

  // SPACE = play/pause (unless typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.code === "Space" && tag !== "INPUT" && tag !== "TEXTAREA") { e.preventDefault(); toggle(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.id]);

  /** Click the tape to scrub: x-offset from the head = time offset. */
  function seekFromClient(clientX: number) {
    const vp = stripVpRef.current;
    const a = audioRef.current;
    if (!vp || !a) return;
    const r = vp.getBoundingClientRect();
    const offset = (clientX - (r.left + r.width / 2)) / PX_PER_SEC;
    const time = Math.min(duration, Math.max(0, t + offset));
    a.currentTime = time;
    setT(time);
  }

  async function submitMark() {
    if (!body.trim()) return;
    setPosting(true);
    try {
      const c = await createReviewComment({ trackId: track.id, userId, body: body.trim(), timestampSeconds: Math.round(markAt) });
      setComments((prev) => [...prev, c].sort((a, b) => (a.timestamp_seconds ?? 0) - (b.timestamp_seconds ?? 0)));
      try { localStorage.setItem("fennec_has_left_note_v1", "1"); } catch { /* ignore */ }
      setBody(""); setMarking(false);
    } catch { /* keep composer open on failure */ }
    setPosting(false);
  }

  // the note "speaking" right now — nearest mark within 3s of the head
  const speaking = comments
    .filter((c) => c.timestamp_seconds != null && Math.abs((c.timestamp_seconds ?? 0) - t) < 3)
    .sort((a, b) => Math.abs((a.timestamp_seconds ?? 0) - t) - Math.abs((b.timestamp_seconds ?? 0) - t))[0];

  const ticks = Array.from({ length: Math.max(0, Math.floor(duration / 15)) }, (_, i) => (i + 1) * 15);
  const stripWidth = duration * PX_PER_SEC;

  return (
    <div className="relative flex h-screen min-h-0 flex-col overflow-hidden" style={{ background: DECK }}>
      {/* crossOrigin lets the AnalyserNode read the samples */}
      <audio ref={audioRef} src={track.audio_url} preload="metadata" crossOrigin="anonymous" />

      {/* header — left margin clears the "‹ fennec" immersive-exit pill */}
      <div className="flex items-start justify-between py-6 pl-[168px] pr-8">
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

      {/* ── THE MACHINE ─────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 flex-col justify-center">

        {/* reels + VU bridge */}
        <div className="flex items-center justify-center gap-[7vw] px-8">
          <Reel plateRef={leftPlateRef} pancakeRef={leftPancakeRef} edgeRef={leftEdgeRef} r0={R_FULL} />

          {/* center bridge: VU pair, like the lit meters on the deck */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <VuMeter needleRef={vuLRef} label="VU · L" />
              <VuMeter needleRef={vuRRef} label="VU · R" />
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-zinc-700">{track.category}</span>
          </div>

          <Reel plateRef={rightPlateRef} pancakeRef={rightPancakeRef} edgeRef={rightEdgeRef} r0={R_EMPTY} />
        </div>

        {/* ── the tape path — strip runs past a fixed head ── */}
        <div
          ref={stripVpRef}
          onClick={(e) => { if (!marking) seekFromClient(e.clientX); }}
          className="relative mt-7 h-[92px] cursor-pointer overflow-hidden"
        >
          {/* the moving tape — flat body, hairline edges, no heavy banding */}
          <div ref={stripRef} className="absolute top-1/2 h-[40px] -translate-y-1/2 will-change-transform" style={{ width: stripWidth }}>
            <div className="absolute inset-0" style={{ background: "#1a1410", borderTop: "1px solid rgba(255,255,255,.06)", borderBottom: "1px solid rgba(255,255,255,.06)" }} />
            {/* leader before 0 and after the end — fine diagonal hatch */}
            <div className="absolute top-0 bottom-0" style={{ left: -220, width: 220, background: "repeating-linear-gradient(45deg, rgba(255,255,255,.07) 0 1.5px, transparent 1.5px 9px)" }} />
            <div className="absolute top-0 bottom-0" style={{ left: stripWidth, width: 220, background: "repeating-linear-gradient(45deg, rgba(255,255,255,.07) 0 1.5px, transparent 1.5px 9px)" }} />

            {/* timecode ticks every 15s — same ruler as the mobile tape */}
            {ticks.map((tk) => (
              <div key={tk} className="absolute top-0 bottom-0 pointer-events-none" style={{ left: tk * PX_PER_SEC }}>
                <div className="absolute bottom-0 h-[9px] w-px" style={{ background: "rgba(255,255,255,.25)" }} />
                <span className="absolute bottom-[12px] left-1 font-mono text-[8.5px]" style={{ color: "rgba(255,255,255,.28)" }}>{fmt(tk)}</span>
              </div>
            ))}

            {/* marks — amber lollipops (stem + dot), the speaking one grows */}
            {comments.filter((c) => c.timestamp_seconds != null).map((c) => {
              const isSpeaking = c.id === speaking?.id;
              return (
                <button
                  key={c.id}
                  onClick={(e) => { e.stopPropagation(); const a = audioRef.current; if (a) { a.currentTime = c.timestamp_seconds ?? 0; setT(c.timestamp_seconds ?? 0); } }}
                  title={`@${c.profile?.username ?? ""} · ${fmt(c.timestamp_seconds ?? 0)}`}
                  className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                  style={{ transition: "opacity 150ms var(--ease-out)", left: (c.timestamp_seconds ?? 0) * PX_PER_SEC }}
                >
                  <span className="rounded-full" style={{
                    width: isSpeaking ? 7 : 5, height: isSpeaking ? 7 : 5,
                    background: isSpeaking ? AMBER_HOT : AMBER,
                    boxShadow: isSpeaking ? `0 0 12px ${AMBER_HOT}b3` : `0 0 6px ${AMBER}50`,
                    transition: "width 200ms var(--ease-out), height 200ms var(--ease-out), box-shadow 200ms var(--ease-out)",
                  }} />
                  <span style={{
                    width: 1.5, height: isSpeaking ? 26 : 18,
                    background: isSpeaking ? AMBER_HOT : `${AMBER}b3`,
                    transition: "height 200ms var(--ease-out)",
                  }} />
                </button>
              );
            })}
          </div>

          {/* fixed head at center — a notch and a line, nothing pretending
              to be hardware */}
          <div className="pointer-events-none absolute left-1/2 top-0 bottom-0 -translate-x-1/2">
            <svg width="12" height="7" viewBox="0 0 12 7" className="absolute left-1/2 top-[10px] -translate-x-1/2">
              <path d="M0 0 H12 L6 7 Z" fill={AMBER} />
            </svg>
            <div className="absolute left-1/2 top-[18px] bottom-[12px] w-[1.5px] -translate-x-1/2" style={{ background: AMBER, boxShadow: `0 0 10px ${AMBER}99` }} />
            <span className="absolute left-1/2 bottom-[-2px] -translate-x-1/2 font-mono text-[10px] font-bold tabular-nums" style={{ color: AMBER }}>{fmt(t)}</span>
          </div>

          {/* soft edge fades so the strip reads endless */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-28" style={{ background: `linear-gradient(90deg, ${DECK}, transparent)` }} />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-28" style={{ background: `linear-gradient(270deg, ${DECK}, transparent)` }} />
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
          <p className="text-center font-mono text-[11px] text-zinc-700">{comments.length} mark{comments.length !== 1 ? "s" : ""} on this tape · click the tape to scrub, hit ＋ to leave a note</p>
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
        <button onClick={toggle} className="grid place-items-center rounded-full text-black transition active:scale-95" style={{ height: 52, width: 52, background: `linear-gradient(180deg,${AMBER_HOT},${AMBER})`, boxShadow: `0 6px 22px ${AMBER}59` }}>
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-[1px]" />}
        </button>
        <button onClick={() => { setMarkAt(t); setMarking(true); }} className="flex items-center gap-2 rounded-full border px-4 py-2.5 text-[13px] font-semibold transition hover:brightness-110" style={{ borderColor: `${AMBER}40`, color: AMBER }}>
          <Plus className="h-4 w-4" /> Leave a note
        </button>
        <button onClick={onPass} className="flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2.5 text-[13px] text-zinc-400 transition hover:text-white">
          Next <SkipForward className="h-4 w-4" />
        </button>
        <span className="ml-2 font-mono text-[10.5px] tracking-[0.06em] text-zinc-700">SPACE play · CLICK tape to scrub · ＋ note</span>
        <button onClick={onOpenMyTracks} className="ml-auto flex items-center gap-2 rounded-full border px-4 py-2.5 text-[13px] font-bold text-black transition hover:brightness-110" style={{ borderColor: "transparent", background: `linear-gradient(180deg,${AMBER_HOT},${AMBER})` }}>
          <Upload className="h-4 w-4" /> Upload Tracks
        </button>
      </div>
    </div>
  );
}
