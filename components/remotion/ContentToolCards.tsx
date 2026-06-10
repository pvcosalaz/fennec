"use client";

// ─── Pure CSS animated cards — no Remotion frame counter ─────────────────────
// Using CSS `animation-direction: alternate` so animations reverse smoothly
// instead of snapping back to start (the root cause of the abrupt restart).

const BASE_STYLES = `
  @keyframes cardGlowAmber {
    from { opacity: 0.05; }
    to   { opacity: 0.18; }
  }
  @keyframes cardGlowGreen {
    from { opacity: 0.05; }
    to   { opacity: 0.16; }
  }
  @keyframes cardGlowPurple {
    from { opacity: 0.04; }
    to   { opacity: 0.15; }
  }
`;

// ─── Quick Ideas ──────────────────────────────────────────────────────────────
const QUICK_IDEAS_CSS = `
  @keyframes bulbScale {
    from { transform: scale(0.94); filter: drop-shadow(0 0 6px rgba(251,191,36,0.5)); }
    to   { transform: scale(1.05); filter: drop-shadow(0 0 20px rgba(251,191,36,0.95)); }
  }
  @keyframes sparkle {
    0%,100% { opacity: 0; transform: scale(0) rotate(0deg); }
    35%,65% { opacity: 1; transform: scale(1) rotate(20deg); }
  }
`;

const SPARKLE_POSITIONS = [
  { top: "14%", left: "18%", delay: "0s",    dur: "5.8s" },
  { top: "10%", left: "65%", delay: "1.6s",  dur: "5s" },
  { top: "38%", left: "74%", delay: "3.1s",  dur: "6.5s" },
  { top: "42%", left: "12%", delay: "4.3s",  dur: "5.4s" },
];

export function QuickIdeasCard() {
  return (
    <div style={{
      width: "100%", height: "100%",
      background: "radial-gradient(ellipse 120% 120% at 50% 0%, #202020 0%, #141414 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 8, overflow: "hidden", position: "relative",
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <style>{BASE_STYLES + QUICK_IDEAS_CSS}</style>

      {/* Ambient glow */}
      <div style={{
        position: "absolute", width: "75%", height: "65%",
        borderRadius: "50%", top: "5%", left: "12%",
        background: "radial-gradient(circle, rgba(251,191,36,1) 0%, transparent 70%)",
        animation: "cardGlowAmber 9s ease-in-out infinite alternate",
      }} />

      {/* Sparkles */}
      {SPARKLE_POSITIONS.map((s, i) => (
        <div key={i} style={{
          position: "absolute", top: s.top, left: s.left,
          width: 5, height: 5, borderRadius: "50%",
          background: "#fbbf24",
          boxShadow: "0 0 6px rgba(251,191,36,0.9)",
          animation: `sparkle ${s.dur} ease-in-out ${s.delay} infinite`,
        }} />
      ))}

      <span style={{ fontSize: 34, lineHeight: 1, display: "block",
        animation: "bulbScale 7.2s ease-in-out infinite alternate" }}>💡</span>

      <span style={{ fontSize: 10, fontWeight: 600,
        color: "rgba(255,255,255,0.45)", letterSpacing: "0.02em" }}>
        Quick Ideas
      </span>
    </div>
  );
}

// ─── Music Content Lab ────────────────────────────────────────────────────────
const CONTENT_LAB_CSS = `
  @keyframes tubeRock {
    from { transform: rotate(-4deg); filter: drop-shadow(0 0 8px rgba(251,113,90,0.5)); }
    to   { transform: rotate(4deg);  filter: drop-shadow(0 0 20px rgba(251,113,90,0.85)); }
  }
  @keyframes bubbleRise1 {
    0%   { transform: translateY(0)   scale(1);   opacity: 0.7; }
    100% { transform: translateY(-34px) scale(0.4); opacity: 0;   }
  }
  @keyframes bubbleRise2 {
    0%   { transform: translateY(0)   scale(0.8); opacity: 0.55; }
    100% { transform: translateY(-28px) scale(0.3); opacity: 0;   }
  }
  @keyframes bubbleRise3 {
    0%   { transform: translateY(0)   scale(1.1); opacity: 0.65; }
    100% { transform: translateY(-38px) scale(0.5); opacity: 0;   }
  }
`;

export function ContentLabCard() {
  return (
    <div style={{
      width: "100%", height: "100%",
      background: "radial-gradient(ellipse 120% 120% at 50% 0%, #231512 0%, #141414 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 8, overflow: "hidden", position: "relative",
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <style>{BASE_STYLES + CONTENT_LAB_CSS}</style>

      {/* Ambient glow */}
      <div style={{
        position: "absolute", width: "75%", height: "65%",
        borderRadius: "50%", top: "5%", left: "12%",
        background: "radial-gradient(circle, rgba(251,113,90,1) 0%, transparent 70%)",
        animation: "cardGlowGreen 9s ease-in-out infinite alternate",
      }} />

      {/* Bubbles — positioned relative to tube bottom */}
      <div style={{ position: "relative" }}>
        {[
          { left: -14, anim: "bubbleRise1", dur: "5.8s", delay: "0s",    size: 5 },
          { left:  -2, anim: "bubbleRise2", dur: "5s", delay: "2s",  size: 4 },
          { left:  10, anim: "bubbleRise3", dur: "6.5s", delay: "1s", size: 6 },
        ].map((b, i) => (
          <div key={i} style={{
            position: "absolute",
            bottom: 32, left: `calc(50% + ${b.left}px)`,
            width: b.size, height: b.size, borderRadius: "50%",
            background: "rgba(251,113,90,0.75)",
            boxShadow: "0 0 4px rgba(251,113,90,0.6)",
            animation: `${b.anim} ${b.dur} ease-in ${b.delay} infinite`,
          }} />
        ))}

        <span style={{ fontSize: 38, lineHeight: 1, display: "block",
          animation: "tubeRock 9s ease-in-out infinite alternate" }}>🧪</span>
      </div>

      <span style={{ fontSize: 10, fontWeight: 600,
        color: "rgba(255,255,255,0.45)", letterSpacing: "0.02em", textAlign: "center" }}>
        Music Content Lab
      </span>
    </div>
  );
}

// ─── My Scripts ───────────────────────────────────────────────────────────────
const MY_SCRIPTS_CSS = `
  @keyframes penBob {
    from { transform: translateY(-3px) rotate(-3deg); filter: drop-shadow(0 0 6px rgba(167,139,250,0.5)); }
    to   { transform: translateY(3px)  rotate(2deg);  filter: drop-shadow(0 0 16px rgba(167,139,250,0.85)); }
  }
  @keyframes lineGrow1 {
    0%,100% { width: 0px;  opacity: 0;   }
    20%,50% { width: 52px; opacity: 1;   }
    75%     { width: 52px; opacity: 0.4; }
  }
  @keyframes lineGrow2 {
    0%,100% { width: 0px;  opacity: 0;   }
    20%,50% { width: 38px; opacity: 1;   }
    75%     { width: 38px; opacity: 0.4; }
  }
  @keyframes lineGrow3 {
    0%,100% { width: 0px;  opacity: 0;   }
    20%,50% { width: 44px; opacity: 1;   }
    75%     { width: 44px; opacity: 0.4; }
  }
`;

export function MyScriptsCard() {
  return (
    <div style={{
      width: "100%", height: "100%",
      background: "radial-gradient(ellipse 120% 120% at 50% 0%, #1e1a23 0%, #141414 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 8, overflow: "hidden", position: "relative",
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <style>{BASE_STYLES + MY_SCRIPTS_CSS}</style>

      {/* Ambient glow */}
      <div style={{
        position: "absolute", width: "75%", height: "65%",
        borderRadius: "50%", top: "5%", left: "12%",
        background: "radial-gradient(circle, rgba(167,139,250,1) 0%, transparent 70%)",
        animation: "cardGlowPurple 9s ease-in-out infinite alternate",
      }} />

      <span style={{ fontSize: 32, lineHeight: 1, display: "block",
        animation: "penBob 7.2s ease-in-out infinite alternate" }}>✍️</span>

      {/* Animated text lines */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
        {[
          { anim: "lineGrow1", delay: "0s",    color: "rgba(167,139,250,0.7)", dur: "7.2s" },
          { anim: "lineGrow2", delay: "1.4s",  color: "rgba(255,255,255,0.22)", dur: "7.2s" },
          { anim: "lineGrow3", delay: "2.9s",  color: "rgba(255,255,255,0.18)", dur: "7.2s" },
        ].map((l, i) => (
          <div key={i} style={{
            height: 2.5, borderRadius: 2,
            background: l.color,
            boxShadow: i === 0 ? "0 0 5px rgba(167,139,250,0.4)" : "none",
            animation: `${l.anim} ${l.dur} ease-in-out ${l.delay} infinite`,
          }} />
        ))}
      </div>

      <span style={{ fontSize: 10, fontWeight: 600,
        color: "rgba(255,255,255,0.45)", letterSpacing: "0.02em" }}>
        My Scripts
      </span>
    </div>
  );
}
