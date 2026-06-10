"use client";
import { useRef, useEffect } from "react";

const TAGS = [
  "Beat Makers", "Composers", "Mix Engineers", "Sound Designers",
  "Vocalists", "Producers", "Arrangers", "Foley Artists",
];

const CSS = `
  @keyframes networkGlow {
    from { opacity: 0.06; }
    to   { opacity: 0.22; }
  }
  @keyframes nodeAppear {
    0%,100% { opacity: 0.25; transform: scale(0.85); }
    50%     { opacity: 1;    transform: scale(1.15); }
  }
  @keyframes pulseRing {
    0%   { transform: scale(0.6); opacity: 0.7; }
    100% { transform: scale(2.4); opacity: 0;   }
  }
  @keyframes lineFlash {
    0%,100% { opacity: 0.04; }
    50%     { opacity: 0.30; }
  }
  @keyframes networkScroll {
    0%   { transform: translateX(0); }
    100% { transform: translateX(var(--marquee-shift, -50%)); }
  }
`;

// Center + 6 outer nodes (% of container)
const NODES = [
  { cx: 50, cy: 48, r: 5,   isPrimary: true,  delay: "0s",   dur: "3s"   },
  { cx: 18, cy: 22, r: 2.5, isPrimary: false, delay: "0s",   dur: "4.1s" },
  { cx: 76, cy: 18, r: 3,   isPrimary: false, delay: "0.7s", dur: "3.6s" },
  { cx: 88, cy: 55, r: 2.5, isPrimary: false, delay: "1.4s", dur: "4.4s" },
  { cx: 68, cy: 78, r: 3,   isPrimary: false, delay: "2.1s", dur: "3.2s" },
  { cx: 24, cy: 76, r: 2.5, isPrimary: false, delay: "2.8s", dur: "4.8s" },
  { cx: 10, cy: 48, r: 2,   isPrimary: false, delay: "3.5s", dur: "3.9s" },
];

// Lines from center (index 0) to each outer node
const LINES = NODES.slice(1).map((n, i) => ({
  x1: NODES[0].cx, y1: NODES[0].cy,
  x2: n.cx,        y2: n.cy,
  delay: `${i * 0.5}s`,
  dur:   `${3.2 + i * 0.3}s`,
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
      background: "radial-gradient(ellipse 80% 80% at 50% 0%, #1a1508 0%, #0f0b05 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", overflow: "hidden", paddingBottom: 28,
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <style>{CSS}</style>

      {/* Ambient blue glow */}
      <div style={{
        position: "absolute", width: "70%", height: "60%",
        borderRadius: "50%", top: "5%", left: "15%",
        background: "radial-gradient(circle, rgba(217,135,20,1) 0%, transparent 70%)",
        animation: "networkGlow 7s ease-in-out infinite alternate",
      }} />

      {/* Subtle grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `linear-gradient(rgba(217,135,20,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(217,135,20,0.03) 1px, transparent 1px)`,
        backgroundSize: "28px 28px",
      }} />

      {/* SVG: lines between nodes */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        {LINES.map((l, i) => (
          <line
            key={i}
            x1={`${l.x1}%`} y1={`${l.y1}%`}
            x2={`${l.x2}%`} y2={`${l.y2}%`}
            stroke="rgba(245,166,35,0.5)"
            strokeWidth="0.4"
            style={{ animation: `lineFlash ${l.dur} ease-in-out ${l.delay} infinite` }}
          />
        ))}
      </svg>

      {/* Nodes */}
      {NODES.map((n, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${n.cx}%`, top: `${n.cy}%`,
          transform: "translate(-50%, -50%)",
        }}>
          {n.isPrimary && (
            <>
              <div style={{
                position: "absolute", inset: -8, borderRadius: "50%",
                border: "1px solid rgba(245,166,35,0.3)",
                animation: "pulseRing 3s ease-out 0s infinite",
              }} />
              <div style={{
                position: "absolute", inset: -8, borderRadius: "50%",
                border: "1px solid rgba(245,166,35,0.2)",
                animation: "pulseRing 3s ease-out 1s infinite",
              }} />
            </>
          )}
          <div style={{
            width: n.r * 2, height: n.r * 2, borderRadius: "50%",
            background: n.isPrimary ? "#f5a623" : "rgba(245,166,35,0.7)",
            boxShadow: n.isPrimary
              ? "0 0 12px rgba(245,166,35,0.9)"
              : "0 0 5px rgba(245,166,35,0.5)",
            animation: `nodeAppear ${n.dur} ease-in-out ${n.delay} infinite`,
          }} />
        </div>
      ))}

      {/* Title */}
      <p style={{
        position: "relative",
        fontSize: 14, fontWeight: 800, color: "#fff",
        letterSpacing: "-0.01em", margin: 0,
        textShadow: "0 0 20px rgba(245,166,35,0.6)",
      }}>
        My Network
      </p>

      {/* Scrolling tags */}
      <div style={{
        position: "absolute", bottom: 14, left: 0, right: 0,
        overflow: "hidden",
        maskImage: "linear-gradient(90deg, transparent 0%, black 12%, black 88%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(90deg, transparent 0%, black 12%, black 88%, transparent 100%)",
      }}>
        <div ref={scrollRef} style={{
          display: "inline-flex", whiteSpace: "nowrap",
          animation: "networkScroll 22s linear infinite",
        }}>
          {doubled.map((tag, i) => {
            const hi = i % 3 === 0;
            return (
              <span key={i} style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: hi ? "rgba(245,166,35,0.75)" : "rgba(255,255,255,0.22)",
                padding: "2px 8px", borderRadius: 20, flexShrink: 0, marginRight: 8,
                border: `1px solid ${hi ? "rgba(245,166,35,0.22)" : "rgba(255,255,255,0.07)"}`,
                background: hi ? "rgba(245,166,35,0.07)" : "transparent",
              }}>{tag}</span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
