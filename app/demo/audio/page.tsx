"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Player } from "@remotion/player";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";

// ─── Track entrance composition (Remotion) ────────────────────────────────────
function TrackEntrance({ title, category }: { title: string; category: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgReveal = spring({ frame, fps, config: { damping: 80, stiffness: 60 } });

  const artworkScale = spring({ frame: frame - 5, fps, config: { damping: 50, stiffness: 80, mass: 0.6 } });
  const artworkOpacity = interpolate(frame, [5, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const titleY = interpolate(frame, [18, 38], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const titleOpacity = interpolate(frame, [18, 38], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const tagY = interpolate(frame, [26, 44], [16, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const tagOpacity = interpolate(frame, [26, 44], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const lineW = interpolate(frame, [35, 55], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) });

  const gradients: Record<string, string> = {
    "Demo":           "linear-gradient(135deg, #0f0c29, #302b63)",
    "Missing Mix":    "linear-gradient(135deg, #1a0533, #6b21a8)",
    "Idea":           "linear-gradient(135deg, #052e16, #166534)",
    "Missing Master": "linear-gradient(135deg, #431407, #9a3412)",
    "Final Version":  "linear-gradient(135deg, #1c1917, #78350f)",
  };
  const grad = gradients[category] ?? "linear-gradient(135deg, #0f0c29, #302b63)";

  return (
    <AbsoluteFill style={{ background: "#111114", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Slide-in background */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(245,166,35,0.06) 0%, transparent 70%)",
        opacity: bgReveal,
      }} />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, width: "100%" }}>
        {/* Artwork */}
        <div style={{
          width: 180, height: 180,
          borderRadius: 16,
          background: grad,
          display: "flex", alignItems: "center", justifyContent: "center",
          transform: `scale(${0.6 + artworkScale * 0.4})`,
          opacity: artworkOpacity,
          boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(245,166,35,${artworkScale * 0.15})`,
          border: "1px solid rgba(255,255,255,0.08)",
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/fennec-logo.png" alt="" style={{ width: 70, filter: "brightness(0) invert(1)", opacity: 0.4 }} />
        </div>

        {/* Title */}
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontSize: 22, fontWeight: 800, color: "#fff",
            transform: `translateY(${titleY}px)`, opacity: titleOpacity,
            fontFamily: "-apple-system, sans-serif", letterSpacing: "-0.02em",
          }}>
            {title}
          </div>
          <div style={{
            fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4,
            transform: `translateY(${tagY}px)`, opacity: tagOpacity,
            fontFamily: "-apple-system, sans-serif", letterSpacing: "0.05em",
          }}>
            {category}
          </div>
        </div>

        {/* Accent line */}
        <div style={{
          height: 1.5, borderRadius: 1,
          background: "linear-gradient(90deg, transparent, #f5a623, transparent)",
          width: `${lineW}%`, maxWidth: 200,
          boxShadow: "0 0 8px rgba(245,166,35,0.4)",
        }} />
      </div>
    </AbsoluteFill>
  );
}

// ─── Beat simulator ───────────────────────────────────────────────────────────
function useBeatSimulator(playing: boolean) {
  const [amplitude, setAmplitude] = useState(0);
  const [bars, setBars] = useState<number[]>(Array(40).fill(0));
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(rafRef.current);
      setAmplitude(0);
      setBars(Array(40).fill(0));
      return;
    }
    startRef.current = performance.now();

    const tick = (now: number) => {
      const t = (now - startRef.current) / 1000;

      // Simulate a 120 BPM kick + music energy
      const bpm = 120;
      const beat = Math.pow(Math.max(0, Math.cos(t * Math.PI * 2 * (bpm / 60))), 6);
      const sub = Math.pow(Math.max(0, Math.cos(t * Math.PI * 2 * (bpm / 60) * 0.5)), 3) * 0.4;
      const noise = (Math.sin(t * 17.3) * 0.08 + Math.sin(t * 31.7) * 0.06 + Math.sin(t * 7.1) * 0.1);
      const amp = Math.min(1, beat * 0.85 + sub + noise + 0.08);
      setAmplitude(amp);

      // 40 frequency bars — each has its own character
      setBars(Array.from({ length: 40 }, (_, i) => {
        const freq = i / 40;
        // Bass heavy on low freqs, treble lighter
        const bassBoost = Math.pow(1 - freq, 2) * beat;
        const midEnergy = Math.sin(t * 4.3 + i * 0.4) * 0.3 + 0.3;
        const highFreq = Math.sin(t * 11.7 + i * 0.9) * 0.15 + 0.15;
        const v = bassBoost * 0.7 + midEnergy * (1 - freq) * 0.5 + highFreq * 0.3 + noise * 0.2;
        return Math.max(0.04, Math.min(1, v));
      }));

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing]);

  return { amplitude, bars };
}

// ─── Track card (the live demo) ───────────────────────────────────────────────
const TRACKS = [
  { title: "Violet",      category: "Demo",           color: "#302b63" },
  { title: "Late Night",  category: "Missing Mix",    color: "#6b21a8" },
  { title: "Sketch 04",   category: "Idea",           color: "#166534" },
  { title: "Final Cut",   category: "Final Version",  color: "#78350f" },
];

function AudioDemo() {
  const [playing, setPlaying] = useState(false);
  const [trackIdx, setTrackIdx] = useState(0);
  const [showEntrance, setShowEntrance] = useState(false);
  const { amplitude, bars } = useBeatSimulator(playing);
  const track = TRACKS[trackIdx];

  const nextTrack = useCallback(() => {
    setPlaying(false);
    setShowEntrance(true);
    setTimeout(() => {
      setTrackIdx((i) => (i + 1) % TRACKS.length);
    }, 100);
    setTimeout(() => setShowEntrance(false), 2200);
  }, []);

  const glowSize = 20 + amplitude * 30;
  const glowOpacity = 0.04 + amplitude * 0.12;
  const artworkScale = 1 + amplitude * 0.02;
  const borderOpacity = 0.06 + amplitude * 0.14;

  return (
    <div style={{
      width: "100%", maxWidth: 380,
      background: "rgba(18,17,22,0.95)",
      borderRadius: 24,
      border: `1px solid rgba(245,166,35,${borderOpacity})`,
      boxShadow: `0 0 ${glowSize}px rgba(245,166,35,${glowOpacity}), 0 20px 40px rgba(0,0,0,0.5)`,
      overflow: "hidden",
      transition: "box-shadow 0.08s, border-color 0.08s",
    }}>
      {/* Artwork / entrance area */}
      <div style={{ position: "relative", aspectRatio: "1", background: "#0d0c10" }}>
        {showEntrance ? (
          <Player
            component={TrackEntrance}
            inputProps={{ title: TRACKS[(trackIdx + 1) % TRACKS.length].title, category: TRACKS[(trackIdx + 1) % TRACKS.length].category }}
            durationInFrames={65}
            fps={30}
            compositionWidth={380}
            compositionHeight={380}
            style={{ width: "100%", height: "100%" }}
            autoPlay
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            background: `linear-gradient(135deg, #${track.color.slice(1)} 0%, #0d0c10 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative",
          }}>
            {/* Reactive glow rings */}
            {[1, 0.6, 0.3].map((intensity, i) => (
              <div key={i} style={{
                position: "absolute",
                width: `${55 + i * 20 + amplitude * 10}%`,
                height: `${55 + i * 20 + amplitude * 25}%`,
                borderRadius: "50%",
                background: `radial-gradient(circle, rgba(245,166,35,${glowOpacity * intensity}) 0%, transparent 70%)`,
                transition: "width 0.05s, height 0.05s",
              }} />
            ))}

            {/* Logo */}
            <div style={{
              transform: `scale(${artworkScale})`,
              transition: "transform 0.05s",
              filter: `brightness(0) invert(1) drop-shadow(0 0 ${10 + amplitude * 12}px rgba(245,166,35,${0.15 + amplitude * 0.2}))`,
              zIndex: 1,
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/fennec-logo.png" alt="" style={{ width: 100 }} />
            </div>

            {/* Play/pause */}
            <button
              onClick={() => setPlaying((p) => !p)}
              style={{
                position: "absolute",
                width: 52, height: 52, borderRadius: "50%",
                background: "rgba(0,0,0,0.6)",
                border: "1px solid rgba(255,255,255,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#fff", fontSize: 20,
                backdropFilter: "blur(8px)",
                zIndex: 2,
              }}
            >
              {playing ? "⏸" : "▶"}
            </button>

            {/* DEMO badge */}
            <div style={{
              position: "absolute", top: 12, left: 12,
              background: "rgba(245,166,35,0.15)",
              border: "1px solid rgba(245,166,35,0.3)",
              borderRadius: 6, padding: "3px 8px",
              fontSize: 10, fontWeight: 700, color: "#f5a623",
              letterSpacing: "0.1em",
            }}>DEMO</div>
          </div>
        )}
      </div>

      {/* Info row */}
      <div style={{ padding: "14px 16px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{track.title}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
            @producer · {track.category}
          </div>
        </div>
        <button
          onClick={nextTrack}
          style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, padding: "6px 12px", color: "#aaa",
            fontSize: 12, cursor: "pointer",
          }}
        >
          Next ›
        </button>
      </div>

      {/* ── Bar waveform ── */}
      <div style={{ padding: "4px 16px 16px" }}>
        <div style={{
          display: "flex", alignItems: "flex-end", gap: 2.5,
          height: 48, paddingBottom: 2,
        }}>
          {bars.map((v, i) => {
            const isPlayed = i < bars.length * 0.3; // fake progress ~30%
            return (
              <div key={i} style={{
                flex: 1,
                height: Math.max(3, v * 44),
                borderRadius: 2,
                background: isPlayed
                  ? `rgba(245,166,35,${0.5 + v * 0.5})`
                  : `rgba(255,255,255,${0.08 + v * 0.12})`,
                boxShadow: isPlayed && playing ? `0 0 4px rgba(245,166,35,${v * 0.6})` : "none",
                transition: playing ? "height 0.05s, background 0.05s" : "height 0.3s",
              }} />
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 10, color: "#444" }}>0:09</span>
          <span style={{ fontSize: 10, color: "#444" }}>0:48</span>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AudioDemoPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#08080a",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 28,
      padding: 24,
    }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 11, letterSpacing: "0.2em", color: "#f5a623", textTransform: "uppercase", marginBottom: 6 }}>
          Remotion + Web Audio API
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>
          Audio Player Demo
        </h1>
        <p style={{ fontSize: 13, color: "#444", marginTop: 4, maxWidth: 320 }}>
          Presiona ▶ para activar las animaciones. Presiona <strong style={{ color: "#666" }}>Next ›</strong> para ver la entrada de canción.
        </p>
      </div>

      <AudioDemo />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, maxWidth: 380, width: "100%" }}>
        {[
          { icon: "✦", label: "Artwork glow", desc: "Pulsa con el beat" },
          { icon: "▌▌▌", label: "Bar waveform", desc: "Reacciona en vivo" },
          { icon: "◈", label: "Track entrance", desc: "Animación Remotion" },
        ].map((f) => (
          <div key={f.label} style={{
            background: "rgba(255,255,255,0.03)", borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.06)",
            padding: "12px 10px", textAlign: "center",
          }}>
            <div style={{ fontSize: 16, marginBottom: 4 }}>{f.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{f.label}</div>
            <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
