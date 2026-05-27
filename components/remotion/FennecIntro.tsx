"use client";

import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";

// ─── Particle ────────────────────────────────────────────────────────────────
function Particle({
  angle,
  distance,
  delay,
  size,
  color,
}: {
  angle: number;
  distance: number;
  delay: number;
  size: number;
  color: string;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 80, mass: 0.5 },
  });

  const opacity = interpolate(
    frame - delay,
    [0, 8, 40, 60],
    [0, 1, 0.8, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const x = Math.cos(angle) * distance * progress;
  const y = Math.sin(angle) * distance * progress;

  return (
    <div
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        transform: `translate(${x}px, ${y}px)`,
        opacity,
        boxShadow: `0 0 ${size * 3}px ${color}`,
      }}
    />
  );
}

// ─── Ring ─────────────────────────────────────────────────────────────────────
function Ring({ delay, maxRadius }: { delay: number; maxRadius: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 60, stiffness: 25, mass: 1 },
  });

  const opacity = interpolate(frame - delay, [0, 5, 30, 55], [0, 0.6, 0.3, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const radius = progress * maxRadius;

  return (
    <div
      style={{
        position: "absolute",
        width: radius * 2,
        height: radius * 2,
        borderRadius: "50%",
        border: "1.5px solid rgba(245,166,35,0.7)",
        transform: "translate(-50%, -50%)",
        left: "50%",
        top: "50%",
        opacity,
        boxShadow: "0 0 20px rgba(245,166,35,0.3)",
      }}
    />
  );
}

// ─── EQ Bars ──────────────────────────────────────────────────────────────────
function EQBars({ startFrame }: { startFrame: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const appear = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 80, stiffness: 120 },
  });

  const heights = [18, 32, 14, 40, 22, 36, 12, 28, 38, 16, 30, 20, 34];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 4,
        height: 50,
        opacity: appear,
      }}
    >
      {heights.map((h, i) => {
        const wave = Math.sin((frame - startFrame) * 0.08 + i * 0.7) * 0.5 + 0.5;
        const barH = 6 + (h - 6) * wave * appear;
        return (
          <div
            key={i}
            style={{
              width: 4,
              height: barH,
              borderRadius: 3,
              background: `rgba(245,166,35,${0.4 + wave * 0.5})`,
              boxShadow: `0 0 6px rgba(245,166,35,${wave * 0.4})`,
              transition: "height 0.1s",
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Score counter ────────────────────────────────────────────────────────────
function ScoreCounter({
  target,
  startFrame,
  duration,
}: {
  target: number;
  startFrame: number;
  duration: number;
}) {
  const frame = useCurrentFrame();

  const progress = interpolate(
    frame - startFrame,
    [0, duration],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }
  );

  const appear = interpolate(frame - startFrame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const value = Math.floor(progress * target);

  return (
    <div
      style={{
        fontSize: 96,
        fontWeight: 900,
        color: "#fff",
        lineHeight: 1,
        letterSpacing: "-0.04em",
        fontVariantNumeric: "tabular-nums",
        opacity: appear,
        textShadow: "0 0 40px rgba(245,166,35,0.4)",
        transform: `translateY(${interpolate(frame - startFrame, [0, 20], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
      }}
    >
      {value}
    </div>
  );
}

// ─── Main composition ─────────────────────────────────────────────────────────
export default function FennecIntro() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Logo
  const logoSpring = spring({
    frame: frame - 15,
    fps,
    config: { damping: 60, stiffness: 60, mass: 0.8 },
  });
  const logoOpacity = interpolate(frame, [15, 35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const logoScale = 0.3 + logoSpring * 0.7;
  const logoGlow = interpolate(
    Math.sin(frame * 0.05),
    [-1, 1],
    [15, 45]
  );

  // "FENNEC" text
  const titleOpacity = interpolate(frame, [55, 75], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const titleY = interpolate(frame, [55, 80], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // "dB" label
  const labelOpacity = interpolate(frame, [75, 90], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Tagline
  const taglineOpacity = interpolate(frame, [100, 120], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Scanline
  const scanY = interpolate(frame, [10, 50], [-height / 2, height / 2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });
  const scanOpacity = interpolate(frame, [10, 15, 45, 55], [0, 0.8, 0.8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Background radial
  const bgGlow = interpolate(frame, [15, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Particles (burst at frame 40)
  const PARTICLE_COLORS = ["#f5a623", "#fff", "#ffd166", "#f5a623", "#ffb347"];
  const particles = Array.from({ length: 18 }, (_, i) => ({
    angle: (i / 18) * Math.PI * 2,
    distance: 120 + (i % 3) * 50,
    delay: 38 + (i % 4) * 2,
    size: 4 + (i % 3) * 3,
    color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
  }));

  return (
    <AbsoluteFill
      style={{
        background: "#0a0a0c",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 60% 50% at 50% 60%, rgba(245,166,35,${bgGlow * 0.12}) 0%, transparent 70%)`,
        }}
      />

      {/* Grid lines */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(rgba(245,166,35,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(245,166,35,0.03) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
          opacity: bgGlow * 0.6,
        }}
      />

      {/* Scanline */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: 2,
          background:
            "linear-gradient(90deg, transparent, rgba(245,166,35,0.8), transparent)",
          top: height / 2 + scanY,
          opacity: scanOpacity,
          boxShadow: "0 0 20px rgba(245,166,35,0.5)",
        }}
      />

      {/* Expanding rings */}
      <Ring delay={38} maxRadius={200} />
      <Ring delay={46} maxRadius={280} />
      <Ring delay={54} maxRadius={350} />

      {/* Particles */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        {particles.map((p, i) => (
          <Particle key={i} {...p} />
        ))}
      </div>

      {/* Center content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Fennec logo */}
        <div
          style={{
            opacity: logoOpacity,
            transform: `scale(${logoScale})`,
            filter: `brightness(0) invert(1) drop-shadow(0 0 ${logoGlow}px rgba(245,166,35,0.7))`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/fennec-logo.png"
            alt="Fennec"
            style={{ width: 120, height: "auto" }}
          />
        </div>

        {/* FENNEC title */}
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            display: "flex",
            alignItems: "baseline",
            gap: 10,
          }}
        >
          <span
            style={{
              fontSize: 64,
              fontWeight: 900,
              letterSpacing: "0.15em",
              color: "#fff",
              textTransform: "uppercase",
              fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
            }}
          >
            FENNEC
          </span>
          <span
            style={{
              fontSize: 32,
              fontWeight: 900,
              color: "#f5a623",
              opacity: labelOpacity,
              letterSpacing: "0.05em",
            }}
          >
            dB
          </span>
        </div>

        {/* Score */}
        <ScoreCounter target={847} startFrame={80} duration={50} />

        {/* EQ bars */}
        {frame >= 110 && <EQBars startFrame={110} />}

        {/* Tagline */}
        <div
          style={{
            opacity: taglineOpacity,
            fontSize: 14,
            letterSpacing: "0.3em",
            color: "rgba(255,255,255,0.4)",
            textTransform: "uppercase",
            fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
            marginTop: 8,
          }}
        >
          your business signal
        </div>
      </div>
    </AbsoluteFill>
  );
}
