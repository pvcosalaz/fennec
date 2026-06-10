"use client";
import { useRef, useEffect } from "react";

// Marquee uses a JS-measured pixel offset so the loop is perfectly seamless.

const TAGS = [
  "Trap", "Lo-fi", "R&B", "House", "Cinematic",
  "Mixing", "Mastering", "Sound Design", "Reggaeton", "Ambient",
];

const CSS = `
  @keyframes inspireGlow {
    from { opacity: 0.06; }
    to   { opacity: 0.20; }
  }
  @keyframes boltPulse {
    from { transform: scale(0.93); filter: drop-shadow(0 0 8px  rgba(245,166,35,0.7)); }
    to   { transform: scale(1.06); filter: drop-shadow(0 0 26px rgba(245,166,35,1.0)); }
  }
  @keyframes sparkFly {
    0%   { transform: translate(0, 0)                      scale(0);   opacity: 0;   }
    12%  { transform: translate(0, 0)                      scale(1);   opacity: 0.9; }
    75%  { transform: translate(var(--tx), var(--ty))      scale(0.3); opacity: 0.2; }
    100% { transform: translate(var(--tx), var(--ty))      scale(0);   opacity: 0;   }
  }
  @keyframes inspireScroll {
    0%   { transform: translateX(0); }
    100% { transform: translateX(var(--marquee-shift, -50%)); }
  }
`;

const SPARKS = [
  { tx:  36, ty: -22, delay: "0s",    dur: "8.7s" },
  { tx:  28, ty: -32, delay: "1.4s",  dur: "7.5s" },
  { tx:  10, ty: -38, delay: "2.7s",  dur: "9.8s" },
  { tx: -14, ty: -35, delay: "4.1s",  dur: "8.1s" },
  { tx: -30, ty: -24, delay: "5.4s",  dur: "9.1s" },
  { tx: -34, ty:  -8, delay: "6.8s",  dur: "7.1s" },
  { tx:  -8, ty:  14, delay: "8.1s",  dur: "10.2s" },
  { tx:  30, ty:   6, delay: "9.4s",  dur: "7.8s" },
];

export default function InspireHero() {
  const doubled = [...TAGS, ...TAGS];
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    // scrollWidth = full width of both copies; half = one copy exactly
    const half = scrollRef.current.scrollWidth / 2;
    scrollRef.current.style.setProperty("--marquee-shift", `-${half}px`);
  }, []);

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "radial-gradient(ellipse 80% 80% at 50% 0%, #232323 0%, #141414 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 6, overflow: "hidden", position: "relative",
      paddingBottom: 28,
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <style>{CSS}</style>

      {/* Ambient glow blob */}
      <div style={{
        position: "absolute", width: "70%", height: "60%",
        borderRadius: "50%", top: "10%", left: "15%",
        background: "radial-gradient(circle, rgba(245,166,35,1) 0%, transparent 70%)",
        animation: "inspireGlow 16.2s ease-in-out infinite alternate",
      }} />

      {/* Subtle grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `linear-gradient(rgba(245,166,35,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(245,166,35,0.025) 1px, transparent 1px)`,
        backgroundSize: "28px 28px",
      }} />

      {/* Sparks — radiate from center, CSS variable per-spark direction */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {SPARKS.map((s, i) => (
          <div key={i} style={{
            position: "absolute",
            width: 3, height: 3, borderRadius: "50%",
            background: "#f5a623",
            boxShadow: "0 0 4px rgba(245,166,35,0.9)",
            ["--tx" as string]: `${s.tx}px`,
            ["--ty" as string]: `${s.ty}px`,
            animation: `sparkFly ${s.dur} ease-out ${s.delay} infinite`,
          } as React.CSSProperties} />
        ))}

        {/* Lightning bolt */}
        <span style={{
          fontSize: 38, lineHeight: 1, display: "block",
          animation: "boltPulse 10.8s ease-in-out infinite alternate",
        }}>⚡</span>
      </div>

      {/* Title */}
      <p style={{ fontSize: 14, fontWeight: 800, color: "#fff",
        letterSpacing: "-0.01em", margin: 0 }}>Inspire</p>

      {/* Scrolling tags — CSS loop, unaffected by any frame restart */}
      <div style={{
        position: "absolute", bottom: 14, left: 0, right: 0,
        overflow: "hidden",
        maskImage: "linear-gradient(90deg, transparent 0%, black 12%, black 88%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(90deg, transparent 0%, black 12%, black 88%, transparent 100%)",
      }}>
        <div ref={scrollRef} style={{
          display: "inline-flex", whiteSpace: "nowrap",
          animation: "inspireScroll 54s linear infinite",
        }}>
          {doubled.map((tag, i) => {
            const hi = i % 3 === 0;
            return (
              <span key={i} style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: hi ? "rgba(245,166,35,0.75)" : "rgba(255,255,255,0.22)",
                padding: "2px 8px", borderRadius: 20,
                border: `1px solid ${hi ? "rgba(245,166,35,0.22)" : "rgba(255,255,255,0.07)"}`,
                background: hi ? "rgba(245,166,35,0.07)" : "transparent",
                flexShrink: 0,
                marginRight: 8,
              }}>{tag}</span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
