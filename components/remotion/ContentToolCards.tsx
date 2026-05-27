"use client";

import { AbsoluteFill, useCurrentFrame } from "remotion";

// ─── Shared dark background ───────────────────────────────────────────────────
function CardBase({ glowColor, children }: { glowColor: string; children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const breathe = Math.sin(frame * 0.07) * 0.5 + 0.5;
  const opacity = 0.06 + breathe * 0.09;

  return (
    <AbsoluteFill style={{
      background: "radial-gradient(ellipse 120% 120% at 50% 0%, #202020 0%, #141414 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      overflow: "hidden",
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* Breathing glow blob */}
      <div style={{
        position: "absolute",
        width: "80%", height: "70%",
        borderRadius: "50%",
        background: `radial-gradient(circle, ${glowColor.replace(")", `,${opacity})`).replace("rgb", "rgba")} 0%, transparent 70%)`,
        top: "5%", left: "10%",
        pointerEvents: "none",
      }} />
      {children}
    </AbsoluteFill>
  );
}

// ─── Quick Ideas — lightbulb with sparkles ────────────────────────────────────
function Sparkle({ x, y, delay }: { x: number; y: number; delay: number }) {
  const frame = useCurrentFrame();
  const t = ((frame - delay) % 55 + 55) % 55;
  const scale = t < 10 ? t / 10 : t < 35 ? 1 : Math.max(0, 1 - (t - 35) / 20);
  const opacity = scale;
  return (
    <div style={{
      position: "absolute",
      left: x, top: y,
      width: 4, height: 4,
      borderRadius: "50%",
      background: "#fbbf24",
      opacity,
      transform: `scale(${scale})`,
      boxShadow: "0 0 6px rgba(251,191,36,0.9)",
    }} />
  );
}

export function QuickIdeasCard() {
  const frame = useCurrentFrame();
  const glow = 10 + Math.sin(frame * 0.09) * 8;
  const scale = 1 + Math.sin(frame * 0.08) * 0.04;

  const sparkles = [
    { x: "22%", y: "18%", delay: 0  },
    { x: "68%", y: "12%", delay: 18 },
    { x: "75%", y: "38%", delay: 9  },
    { x: "15%", y: "42%", delay: 27 },
  ];

  return (
    <CardBase glowColor="rgb(251,191,36)">
      {sparkles.map((s, i) => (
        <Sparkle key={i} x={s.x as unknown as number} y={s.y as unknown as number} delay={s.delay} />
      ))}
      <span style={{
        fontSize: 34,
        lineHeight: 1,
        display: "block",
        transform: `scale(${scale})`,
        filter: `drop-shadow(0 0 ${glow}px rgba(251,191,36,0.8))`,
      }}>💡</span>
      <span style={{
        fontSize: 10,
        fontWeight: 600,
        color: "rgba(255,255,255,0.45)",
        letterSpacing: "0.02em",
        textAlign: "center",
      }}>Quick Ideas</span>
    </CardBase>
  );
}

// ─── Music Content Lab — bubbles rising ──────────────────────────────────────
export function ContentLabCard() {
  const frame = useCurrentFrame();
  const glow = 12 + Math.sin(frame * 0.07) * 10;
  const tilt = Math.sin(frame * 0.05) * 3;

  return (
    <CardBase glowColor="rgb(74,222,128)">
      <style>{`
        @keyframes bubble1 { 0%,100% { transform: translateY(0) scale(1); opacity: 0.7; }
                              50% { transform: translateY(-28px) scale(0.7); opacity: 0; } }
        @keyframes bubble2 { 0%,100% { transform: translateY(0) scale(0.8); opacity: 0.5; }
                              50% { transform: translateY(-22px) scale(0.5); opacity: 0; } }
        @keyframes bubble3 { 0%,100% { transform: translateY(0) scale(1.1); opacity: 0.6; }
                              50% { transform: translateY(-32px) scale(0.6); opacity: 0; } }
      `}</style>

      {/* Bubbles */}
      {[
        { left: "36%", bottom: "44%", size: 5, anim: "bubble1", dur: "1.8s", delay: "0s"   },
        { left: "48%", bottom: "44%", size: 4, anim: "bubble2", dur: "2.2s", delay: "0.6s" },
        { left: "58%", bottom: "44%", size: 6, anim: "bubble3", dur: "1.6s", delay: "1.1s" },
      ].map((b, i) => (
        <div key={i} style={{
          position: "absolute",
          left: b.left, bottom: b.bottom,
          width: b.size, height: b.size,
          borderRadius: "50%",
          background: "rgba(74,222,128,0.7)",
          boxShadow: "0 0 4px rgba(74,222,128,0.6)",
          animation: `${b.anim} ${b.dur} ease-in-out ${b.delay} infinite`,
        }} />
      ))}

      <span style={{
        fontSize: 38,
        lineHeight: 1,
        display: "block",
        transform: `rotate(${tilt}deg)`,
        filter: `drop-shadow(0 0 ${glow}px rgba(74,222,128,0.7))`,
      }}>🧪</span>
      <span style={{
        fontSize: 10,
        fontWeight: 600,
        color: "rgba(255,255,255,0.45)",
        letterSpacing: "0.02em",
        textAlign: "center",
      }}>Music Content Lab</span>
    </CardBase>
  );
}

// ─── My Scripts — text lines appearing ───────────────────────────────────────
export function MyScriptsCard() {
  const frame = useCurrentFrame();
  const glow = 8 + Math.sin(frame * 0.08) * 6;
  const penBob = Math.sin(frame * 0.1) * 2;

  // Three text lines that cycle: grow → hold → shrink, staggered
  const lineWidths = [0, 1, 2].map((i) => {
    const period = 70;
    const offset = i * 22;
    const t = ((frame - offset) % period + period) % period;
    if (t < 20) return (t / 20) * (55 + i * 10);
    if (t < 45) return 55 + i * 10;
    return Math.max(0, (55 + i * 10) * (1 - (t - 45) / 25));
  });

  return (
    <CardBase glowColor="rgb(167,139,250)">
      <span style={{
        fontSize: 32,
        lineHeight: 1,
        display: "block",
        transform: `translateY(${penBob}px)`,
        filter: `drop-shadow(0 0 ${glow}px rgba(167,139,250,0.7))`,
      }}>✍️</span>

      {/* Animated text lines */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start", width: 64 }}>
        {lineWidths.map((w, i) => (
          <div key={i} style={{
            height: 2.5,
            width: w,
            borderRadius: 2,
            background: i === 0
              ? "rgba(167,139,250,0.6)"
              : "rgba(255,255,255,0.18)",
            boxShadow: i === 0 ? "0 0 5px rgba(167,139,250,0.4)" : "none",
          }} />
        ))}
      </div>

      <span style={{
        fontSize: 10,
        fontWeight: 600,
        color: "rgba(255,255,255,0.45)",
        letterSpacing: "0.02em",
        textAlign: "center",
      }}>My Scripts</span>
    </CardBase>
  );
}
