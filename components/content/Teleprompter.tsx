"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { X, Play, Pause, RotateCcw, Minus, Plus } from "lucide-react";

/* Full-screen teleprompter for reading a script to camera (see roadmap).
   Auto-scrolls at an adjustable speed; tap anywhere to play/pause; big
   type, generous line height, a fixed reading guide across the middle.
   Keeps the screen awake via a Wake Lock while running. */

const SPEEDS = [0.5, 0.75, 1, 1.5, 2, 3] as const;
const FONT_MIN = 20;
const FONT_MAX = 52;
const ACCENT = "#f5a623";

export default function Teleprompter({
  text,
  title,
  onClose,
}: {
  text: string;
  title?: string;
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef<number>(0);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);

  const [running, setRunning] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(2); // 1×
  const [fontSize, setFontSize] = useState(32);
  const [mirror, setMirror] = useState(false); // for a real teleprompter rig
  const [done, setDone] = useState(false);

  const speed = SPEEDS[speedIdx];

  // ── keep the screen awake while scrolling ──
  const acquireWakeLock = useCallback(async () => {
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
      if (nav.wakeLock) wakeLockRef.current = await nav.wakeLock.request("screen");
    } catch { /* not supported / denied — fine */ }
  }, []);
  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }, []);

  // ── the auto-scroll loop (rAF, framerate-independent) ──
  useEffect(() => {
    if (!running) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    acquireWakeLock();
    lastTsRef.current = 0;

    const step = (ts: number) => {
      const el = scrollRef.current;
      if (!el) return;
      if (lastTsRef.current === 0) lastTsRef.current = ts;
      const dt = ts - lastTsRef.current;
      lastTsRef.current = ts;

      // ~48 px/sec at 1× — a natural reading pace, scaled by speed
      el.scrollTop += (dt / 1000) * 48 * speed;

      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) {
        setRunning(false);
        setDone(true);
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, speed, acquireWakeLock]);

  useEffect(() => () => { cancelAnimationFrame(rafRef.current); releaseWakeLock(); }, [releaseWakeLock]);

  function toggle() {
    if (done) return restart();
    setRunning((r) => !r);
    if (running) releaseWakeLock();
  }
  function restart() {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setDone(false);
    setRunning(true);
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: "#0a0a0c", height: "var(--app-h, 100dvh)" }}>
      {/* top bar */}
      <div className="flex items-center justify-between px-4 shrink-0"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)", paddingBottom: "0.5rem" }}>
        <button onClick={onClose} className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition">
          <X className="h-5 w-5" />
        </button>
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] truncate max-w-[55%]"
          style={{ color: "rgba(255,255,255,.4)" }}>
          {title || "Teleprompter"}
        </span>
        <button onClick={() => setMirror((m) => !m)}
          className="text-[10px] font-bold px-2.5 py-1 rounded-full transition"
          style={{ color: mirror ? "#0a0a0c" : "rgba(255,255,255,.5)", background: mirror ? ACCENT : "rgba(255,255,255,.08)" }}>
          MIRROR
        </button>
      </div>

      {/* reading guide — fixed band the eyes lock onto */}
      <div className="relative flex-1 overflow-hidden" onClick={toggle}>
        <div aria-hidden className="pointer-events-none absolute left-0 right-0 z-10"
          style={{ top: "42%", height: 2, background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)`, opacity: 0.5 }} />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24"
          style={{ background: "linear-gradient(#0a0a0c, transparent)" }} />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24"
          style={{ background: "linear-gradient(transparent, #0a0a0c)" }} />

        <div ref={scrollRef} className="h-full overflow-y-auto no-scrollbar"
          style={{ scrollBehavior: "auto" }}>
          <div
            className="px-6 font-semibold text-white whitespace-pre-wrap"
            style={{
              paddingTop: "42vh", paddingBottom: "60vh",
              fontSize, lineHeight: 1.55, letterSpacing: "-0.01em",
              transform: mirror ? "scaleX(-1)" : "none",
            }}
          >
            {text || "No script to read."}
          </div>
        </div>

        {/* tap hint / paused affordance */}
        {!running && !done && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-2" style={{ color: "rgba(255,255,255,.55)" }}>
              <Play className="h-10 w-10" style={{ fill: "currentColor" }} />
              <span className="text-[11px] uppercase tracking-widest">Tap to start</span>
            </div>
          </div>
        )}
        {done && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
            <span className="text-[12px] uppercase tracking-widest" style={{ color: ACCENT }}>End of script</span>
          </div>
        )}
      </div>

      {/* controls */}
      <div className="shrink-0 px-4 pt-3 border-t border-white/8"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}>
        <div className="flex items-center justify-between gap-3">
          {/* font size */}
          <div className="flex items-center gap-1.5">
            <button onClick={() => setFontSize((f) => Math.max(FONT_MIN, f - 4))}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5 text-zinc-300 active:scale-90 transition">
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-[10px] w-8 text-center" style={{ fontFamily: "monospace", color: "rgba(255,255,255,.4)" }}>{fontSize}px</span>
            <button onClick={() => setFontSize((f) => Math.min(FONT_MAX, f + 4))}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5 text-zinc-300 active:scale-90 transition">
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* play / restart */}
          <button onClick={toggle}
            className="w-14 h-14 rounded-full flex items-center justify-center active:scale-95 transition shrink-0"
            style={{ background: ACCENT, color: "#0a0a0c" }}>
            {done ? <RotateCcw className="h-6 w-6" /> : running ? <Pause className="h-6 w-6" style={{ fill: "currentColor" }} /> : <Play className="h-6 w-6" style={{ fill: "currentColor" }} />}
          </button>

          {/* speed */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,.35)" }}>speed</span>
            <button
              onClick={() => setSpeedIdx((i) => (i + 1) % SPEEDS.length)}
              className="px-3 h-9 rounded-full flex items-center justify-center bg-white/5 text-white text-[13px] font-bold active:scale-90 transition"
              style={{ minWidth: 52, fontFamily: "monospace" }}
            >
              {speed}×
            </button>
          </div>
        </div>
      </div>

      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </div>
  );
}
