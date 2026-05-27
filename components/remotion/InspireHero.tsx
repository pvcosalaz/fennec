"use client";

import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";

const TAGS = [
  "Trap", "Lo-fi", "R&B", "House", "Cinematic",
  "Mixing", "Mastering", "Sound Design", "Reggaeton", "Ambient",
];

// Infinite scrolling tag strip
function TagStrip() {
  const frame = useCurrentFrame();
  // scroll at ~18px/sec (at 30fps = 0.6px/frame)
  const offset = (frame * 0.55) % 220;

  const allTags = [...TAGS, ...TAGS]; // duplicate to fill

  return (
    <div style={{
      position: "absolute",
      bottom: 14,
      left: 0,
      right: 0,
      overflow: "hidden",
      maskImage: "linear-gradient(90deg, transparent 0%, black 12%, black 88%, transparent 100%)",
      WebkitMaskImage: "linear-gradient(90deg, transparent 0%, black 12%, black 88%, transparent 100%)",
    }}>
      <div style={{
        display: "flex",
        gap: 8,
        transform: `translateX(-${offset}px)`,
        whiteSpace: "nowrap",
      }}>
        {allTags.map((tag, i) => (
          <span key={i} style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: i % 3 === 0 ? "rgba(245,166,35,0.7)" : "rgba(255,255,255,0.2)",
            padding: "2px 8px",
            borderRadius: 20,
            border: `1px solid ${i % 3 === 0 ? "rgba(245,166,35,0.2)" : "rgba(255,255,255,0.06)"}`,
            background: i % 3 === 0 ? "rgba(245,166,35,0.06)" : "transparent",
            flexShrink: 0,
            fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
          }}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

// Spark particle — a single dot that radiates out and fades
function Spark({ angle, delay, speed }: { angle: number; delay: number; speed: number }) {
  const frame = useCurrentFrame();
  const t = ((frame - delay) % 60 + 60) % 60; // loop within 60 frames
  const dist = interpolate(t, [0, 40], [0, speed], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const opacity = interpolate(t, [0, 8, 35, 45], [0, 0.9, 0.4, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const x = Math.cos(angle) * dist;
  const y = Math.sin(angle) * dist;
  return (
    <div style={{
      position: "absolute",
      width: 3, height: 3,
      borderRadius: "50%",
      background: "#f5a623",
      transform: `translate(${x}px, ${y}px)`,
      opacity,
      boxShadow: "0 0 4px rgba(245,166,35,0.8)",
    }} />
  );
}

export default function InspireHero() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Breathing ambient glow
  const breathe = Math.sin(frame * 0.07) * 0.5 + 0.5;
  const glowOpacity = 0.08 + breathe * 0.14;

  // Lightning bolt pulse
  const boltScale = 1 + Math.sin(frame * 0.12) * 0.06;
  const boltGlow  = 12 + breathe * 20;

  // Sparks — 8 radiating outward, staggered
  const sparks = Array.from({ length: 8 }, (_, i) => ({
    angle: (i / 8) * Math.PI * 2 + Math.PI / 8,
    delay: i * 7,
    speed: 22 + (i % 3) * 8,
  }));

  return (
    <AbsoluteFill style={{
      background: "radial-gradient(ellipse 80% 80% at 50% 0%, #232323 0%, #141414 100%)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    }}>

      {/* Ambient glow blob */}
      <div style={{
        position: "absolute",
        width: "70%", height: "60%",
        borderRadius: "50%",
        background: `radial-gradient(circle, rgba(245,166,35,${glowOpacity}) 0%, transparent 70%)`,
        top: "10%",
        left: "15%",
        pointerEvents: "none",
      }} />

      {/* Subtle grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `linear-gradient(rgba(245,166,35,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(245,166,35,0.025) 1px, transparent 1px)`,
        backgroundSize: "28px 28px",
      }} />

      {/* Lightning bolt + sparks */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {sparks.map((s, i) => <Spark key={i} {...s} />)}
        <span style={{
          fontSize: 38,
          lineHeight: 1,
          filter: `drop-shadow(0 0 ${boltGlow}px rgba(245,166,35,0.9))`,
          transform: `scale(${boltScale})`,
          display: "block",
        }}>⚡</span>
      </div>

      {/* Title */}
      <p style={{
        fontSize: 14,
        fontWeight: 800,
        color: "#fff",
        letterSpacing: "-0.01em",
        fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
        margin: 0,
      }}>
        Inspire
      </p>

      {/* Subtitle */}
      <p style={{
        fontSize: 10,
        color: "rgba(255,255,255,0.35)",
        fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
        margin: 0,
        letterSpacing: "0.01em",
      }}>
        Daily trends in music production
      </p>

      {/* Scrolling tags at bottom */}
      <TagStrip />
    </AbsoluteFill>
  );
}
