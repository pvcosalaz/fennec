"use client";

// ─── Pure CSS animated cards for Business Hub ─────────────────────────────────

const BASE = `
  @keyframes glowAmber  { from { opacity:0.05; } to { opacity:0.18; } }
  @keyframes glowTeal   { from { opacity:0.05; } to { opacity:0.17; } }
  @keyframes glowGreen  { from { opacity:0.04; } to { opacity:0.16; } }
  @keyframes glowPurple { from { opacity:0.04; } to { opacity:0.15; } }
`;

// ─── Pricing Calculator ───────────────────────────────────────────────────────
const PRICING_CSS = `
  @keyframes coinFloat1 {
    0%   { transform: translateY(0)    scale(1);   opacity: 0.8; }
    100% { transform: translateY(-36px) scale(0.5); opacity: 0;   }
  }
  @keyframes coinFloat2 {
    0%   { transform: translateY(0)    scale(0.8); opacity: 0.6; }
    100% { transform: translateY(-28px) scale(0.3); opacity: 0;   }
  }
  @keyframes dollarPulse {
    from { transform: scale(0.92); filter: drop-shadow(0 0 7px rgba(245,166,35,0.6)); }
    to   { transform: scale(1.07); filter: drop-shadow(0 0 22px rgba(245,166,35,1.0)); }
  }
`;

const COINS = [
  { left: -16, anim: "coinFloat1", dur: "3.4s", delay: "0s",   size: 5 },
  { left:  -4, anim: "coinFloat2", dur: "2.9s", delay: "1.1s", size: 4 },
  { left:   8, anim: "coinFloat1", dur: "3.8s", delay: "0.6s", size: 6 },
];

export function PricingCalculatorCard() {
  return (
    <div style={{
      width: "100%", height: "100%", position: "relative",
      background: "radial-gradient(ellipse 120% 120% at 50% 0%, #222010 0%, #141414 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 8, overflow: "hidden",
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <style>{BASE + PRICING_CSS}</style>

      {/* Glow */}
      <div style={{
        position: "absolute", width: "75%", height: "65%",
        borderRadius: "50%", top: "5%", left: "12%",
        background: "radial-gradient(circle, rgba(245,166,35,1) 0%, transparent 70%)",
        animation: "glowAmber 5s ease-in-out infinite alternate",
      }} />

      {/* Floating coins */}
      <div style={{ position: "relative" }}>
        {COINS.map((c, i) => (
          <div key={i} style={{
            position: "absolute", bottom: 28,
            left: `calc(50% + ${c.left}px)`,
            width: c.size, height: c.size, borderRadius: "50%",
            background: "rgba(245,166,35,0.8)",
            boxShadow: "0 0 4px rgba(245,166,35,0.7)",
            animation: `${c.anim} ${c.dur} ease-in ${c.delay} infinite`,
          }} />
        ))}
        <span style={{
          fontSize: 32, lineHeight: 1, display: "block",
          animation: "dollarPulse 4s ease-in-out infinite alternate",
        }}>💰</span>
      </div>

      <span style={{ fontSize: 10, fontWeight: 600,
        color: "rgba(255,255,255,0.45)", letterSpacing: "0.02em", textAlign: "center" }}>
        Pricing Calculator
      </span>
    </div>
  );
}

// ─── Clients & Leads ──────────────────────────────────────────────────────────
const CLIENTS_CSS = `
  @keyframes personBob {
    from { transform: translateY(-2px); filter: drop-shadow(0 0 6px rgba(251,113,90,0.5)); }
    to   { transform: translateY(2px);  filter: drop-shadow(0 0 18px rgba(251,113,90,0.9)); }
  }
  @keyframes ringExpand {
    0%   { transform: scale(0.5); opacity: 0.7; }
    100% { transform: scale(2.0); opacity: 0;   }
  }
`;

export function ClientsCard() {
  return (
    <div style={{
      width: "100%", height: "100%", position: "relative",
      background: "radial-gradient(ellipse 120% 120% at 50% 0%, #201210 0%, #141414 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 8, overflow: "hidden",
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <style>{BASE + CLIENTS_CSS}</style>

      {/* Glow */}
      <div style={{
        position: "absolute", width: "75%", height: "65%",
        borderRadius: "50%", top: "5%", left: "12%",
        background: "radial-gradient(circle, rgba(251,113,90,1) 0%, transparent 70%)",
        animation: "glowTeal 5.5s ease-in-out infinite alternate",
      }} />

      {/* Pulse rings */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {[0, 1].map(i => (
          <div key={i} style={{
            position: "absolute", width: 28, height: 28, borderRadius: "50%",
            border: "1.5px solid rgba(251,113,90,0.5)",
            animation: `ringExpand 3s ease-out ${i * 1.2}s infinite`,
          }} />
        ))}
        <span style={{
          fontSize: 30, lineHeight: 1, display: "block",
          animation: "personBob 4s ease-in-out infinite alternate",
        }}>🤝</span>
      </div>

      <span style={{ fontSize: 10, fontWeight: 600,
        color: "rgba(255,255,255,0.45)", letterSpacing: "0.02em", textAlign: "center" }}>
        Clients & Leads
      </span>
    </div>
  );
}

// ─── Quotes ───────────────────────────────────────────────────────────────────
const QUOTES_CSS = `
  @keyframes docFloat {
    from { transform: translateY(-2px) rotate(-1deg); filter: drop-shadow(0 0 6px rgba(250,204,21,0.5)); }
    to   { transform: translateY(2px)  rotate(1deg);  filter: drop-shadow(0 0 18px rgba(250,204,21,0.9)); }
  }
  @keyframes lineWrite1 { 0%,100%{width:0;opacity:0;} 25%,70%{width:44px;opacity:1;} 90%{width:44px;opacity:.3;} }
  @keyframes lineWrite2 { 0%,100%{width:0;opacity:0;} 25%,70%{width:32px;opacity:1;} 90%{width:32px;opacity:.3;} }
  @keyframes lineWrite3 { 0%,100%{width:0;opacity:0;} 25%,70%{width:38px;opacity:1;} 90%{width:38px;opacity:.3;} }
`;

export function QuotesCard() {
  return (
    <div style={{
      width: "100%", height: "100%", position: "relative",
      background: "radial-gradient(ellipse 120% 120% at 50% 0%, #1d1a0f 0%, #141414 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 8, overflow: "hidden",
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <style>{BASE + QUOTES_CSS}</style>

      {/* Glow */}
      <div style={{
        position: "absolute", width: "75%", height: "65%",
        borderRadius: "50%", top: "5%", left: "12%",
        background: "radial-gradient(circle, rgba(250,204,21,1) 0%, transparent 70%)",
        animation: "glowGreen 6s ease-in-out infinite alternate",
      }} />

      <span style={{
        fontSize: 28, lineHeight: 1, display: "block",
        animation: "docFloat 4.5s ease-in-out infinite alternate",
      }}>📄</span>

      {/* Animated text lines */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3.5, alignItems: "flex-start" }}>
        {[
          { anim: "lineWrite1", delay: "0s",    color: "rgba(250,204,21,0.75)", dur: "4.2s" },
          { anim: "lineWrite2", delay: "0.7s",  color: "rgba(255,255,255,0.22)", dur: "4.2s" },
          { anim: "lineWrite3", delay: "1.4s",  color: "rgba(255,255,255,0.18)", dur: "4.2s" },
        ].map((l, i) => (
          <div key={i} style={{
            height: 2, borderRadius: 2,
            background: l.color,
            boxShadow: i === 0 ? "0 0 5px rgba(250,204,21,0.4)" : "none",
            animation: `${l.anim} ${l.dur} ease-in-out ${l.delay} infinite`,
          }} />
        ))}
      </div>

      <span style={{ fontSize: 10, fontWeight: 600,
        color: "rgba(255,255,255,0.45)", letterSpacing: "0.02em" }}>
        Quotes
      </span>
    </div>
  );
}

// ─── Active Projects ──────────────────────────────────────────────────────────
const PROJECTS_CSS = `
  @keyframes folderBob {
    from { transform: scale(0.93); filter: drop-shadow(0 0 7px rgba(167,139,250,0.5)); }
    to   { transform: scale(1.06); filter: drop-shadow(0 0 22px rgba(167,139,250,0.95)); }
  }
  @keyframes barFill1 { 0%,100%{width:0;opacity:0;} 20%,65%{width:46px;opacity:1;} 85%{width:46px;opacity:.4;} }
  @keyframes barFill2 { 0%,100%{width:0;opacity:0;} 20%,65%{width:28px;opacity:1;} 85%{width:28px;opacity:.4;} }
  @keyframes barFill3 { 0%,100%{width:0;opacity:0;} 20%,65%{width:36px;opacity:1;} 85%{width:36px;opacity:.4;} }
`;

export function ProjectsCard() {
  return (
    <div style={{
      width: "100%", height: "100%", position: "relative",
      background: "radial-gradient(ellipse 120% 120% at 50% 0%, #1a1525 0%, #141414 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 8, overflow: "hidden",
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <style>{BASE + PROJECTS_CSS}</style>

      {/* Glow */}
      <div style={{
        position: "absolute", width: "75%", height: "65%",
        borderRadius: "50%", top: "5%", left: "12%",
        background: "radial-gradient(circle, rgba(167,139,250,1) 0%, transparent 70%)",
        animation: "glowPurple 5s ease-in-out infinite alternate",
      }} />

      <span style={{
        fontSize: 30, lineHeight: 1, display: "block",
        animation: "folderBob 4s ease-in-out infinite alternate",
      }}>🗂️</span>

      {/* Progress bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
        {[
          { anim: "barFill1", delay: "0s",    color: "rgba(167,139,250,0.8)", dur: "4.0s" },
          { anim: "barFill2", delay: "0.6s",  color: "rgba(167,139,250,0.45)", dur: "4.0s" },
          { anim: "barFill3", delay: "1.2s",  color: "rgba(167,139,250,0.3)", dur: "4.0s" },
        ].map((b, i) => (
          <div key={i} style={{
            height: 3, borderRadius: 3,
            background: b.color,
            boxShadow: i === 0 ? "0 0 6px rgba(167,139,250,0.5)" : "none",
            animation: `${b.anim} ${b.dur} ease-in-out ${b.delay} infinite`,
          }} />
        ))}
      </div>

      <span style={{ fontSize: 10, fontWeight: 600,
        color: "rgba(255,255,255,0.45)", letterSpacing: "0.02em" }}>
        Active Projects
      </span>
    </div>
  );
}
