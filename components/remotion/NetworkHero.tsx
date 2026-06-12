"use client";
import { useRef, useEffect } from "react";

// ─── My Network hero ──────────────────────────────────────────────────────────
// Warm, calm constellation — static nodes and lines (no radar grid, no pulse
// rings, no blinking). The only motion is the slow role marquee: constant
// linear motion is the one acceptable infinite animation (emil-design-eng).

const TAGS = [
  "Beat Makers", "Composers", "Mix Engineers", "Sound Designers",
  "Vocalists", "Producers", "Arrangers", "Foley Artists",
];

const CSS = `
  @keyframes networkScroll {
    0%   { transform: translateX(0); }
    100% { transform: translateX(var(--marquee-shift, -50%)); }
  }
`;

// Center + outer nodes (% of container) — static constellation
const NODES = [
  { cx: 50, cy: 44, r: 4.5, primary: true,  o: 1    },
  { cx: 20, cy: 24, r: 2.5, primary: false, o: 0.75 },
  { cx: 75, cy: 18, r: 3,   primary: false, o: 0.85 },
  { cx: 87, cy: 52, r: 2.5, primary: false, o: 0.6  },
  { cx: 66, cy: 74, r: 3,   primary: false, o: 0.7  },
  { cx: 26, cy: 72, r: 2.5, primary: false, o: 0.55 },
  { cx: 11, cy: 46, r: 2,   primary: false, o: 0.45 },
];

const LINES = NODES.slice(1).map((n) => ({
  x1: NODES[0].cx, y1: NODES[0].cy, x2: n.cx, y2: n.cy, o: n.o * 0.28,
}));

export default function NetworkHero() {
  const doubled = [...TAGS, ...TAGS];
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    const half = scrollRef.current.scrollWidth / 2;
    scrollRef.current.style.setProperty("--marquee-shift", `-${half}px`);
  }, []);

  return (
    <div style={{
      width: "100%", height: "100%", position: "relative",
      background: "linear-gradient(180deg, #211a0f 0%, #15110a 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", overflow: "hidden", paddingBottom: 30,
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.05)",
      borderRadius: "inherit",
    }}>
      <style>{CSS}</style>

      {/* Warm static glow */}
      <div aria-hidden style={{
        position: "absolute", width: "80%", height: "70%",
        borderRadius: "50%", top: "-15%", left: "10%",
        background: "radial-gradient(circle, rgba(245,166,35,0.13) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Constellation lines — static */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        {LINES.map((l, i) => (
          <line key={i}
            x1={`${l.x1}%`} y1={`${l.y1}%`} x2={`${l.x2}%`} y2={`${l.y2}%`}
            stroke={`rgba(245,166,35,${l.o})`} strokeWidth="0.35"
          />
        ))}
      </svg>

      {/* Nodes — static, depth via opacity */}
      {NODES.map((n, i) => (
        <div key={i} style={{
          position: "absolute", left: `${n.cx}%`, top: `${n.cy}%`,
          transform: "translate(-50%, -50%)",
          width: n.r * 2, height: n.r * 2, borderRadius: "50%",
          background: n.primary ? "#f5a623" : `rgba(245,166,35,${n.o * 0.8})`,
          boxShadow: n.primary ? "0 0 14px rgba(245,166,35,0.55)" : "none",
        }} />
      ))}

      {/* Title */}
      <div style={{ position: "relative", textAlign: "center" }}>
        <p style={{
          fontSize: 15, fontWeight: 700, color: "#fff",
          letterSpacing: "-0.01em", margin: 0,
        }}>
          My Network
        </p>
        <p style={{
          fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.55)",
          margin: "3px 0 0",
        }}>
          Find your collaborators
        </p>
      </div>

      {/* Bottom mask */}
      <div aria-hidden style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 50,
        background: "linear-gradient(to top, #15110a 50%, rgba(21,17,10,0.85) 78%, transparent 100%)",
        pointerEvents: "none",
      }} />

      {/* Role marquee — slow, constant, linear */}
      <div style={{
        position: "absolute", bottom: 13, left: 0, right: 0, overflow: "hidden",
        maskImage: "linear-gradient(90deg, transparent 0%, black 12%, black 88%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(90deg, transparent 0%, black 12%, black 88%, transparent 100%)",
      }}>
        <div ref={scrollRef} style={{
          display: "inline-flex", whiteSpace: "nowrap",
          animation: "networkScroll 32s linear infinite",
        }}>
          {doubled.map((tag, i) => (
            <span key={i} style={{
              fontSize: 9, fontWeight: 600, letterSpacing: "0.04em",
              color: "rgba(255,255,255,0.45)",
              padding: "3px 9px", borderRadius: 20, flexShrink: 0, marginRight: 8,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
            }}>{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
