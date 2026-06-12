"use client";

// ─── Business Hub tool cards ──────────────────────────────────────────────────
// Hand-tuned static glyphs on a shared warm surface. No looping animations —
// motion lives only in the parent button's press feedback (emil-design-eng).

import ToolCardShell, { AMBER, STROKE, STROKE_SOFT } from "./ToolCardShell";

// ─── Pricing Calculator — price tag with amber "$" ───────────────────────────
export function PricingCalculatorCard() {
  return (
    <ToolCardShell label="Pricing Calculator">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" style={{ transform: "rotate(-6deg)" }}>
        <path
          d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42z"
          stroke={STROKE} strokeWidth="1.5" strokeLinejoin="round"
        />
        <circle cx="7.2" cy="7.2" r="1.4" fill={AMBER} />
        <text
          x="12.6" y="15.6"
          fontSize="7.5" fontWeight="700" fill={AMBER}
          fontFamily="-apple-system, BlinkMacSystemFont, system-ui, sans-serif"
          textAnchor="middle"
        >$</text>
      </svg>
    </ToolCardShell>
  );
}

// ─── Clients & Leads — two people, the lead in amber ─────────────────────────
export function ClientsCard() {
  return (
    <ToolCardShell label="Clients & Leads">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
        {/* lead — behind, amber */}
        <circle cx="16.2" cy="8.6" r="2.6" stroke={AMBER} strokeWidth="1.5" opacity="0.9" />
        <path d="M14 19c.4-2.8 2.3-4.4 4.6-4.4 1.5 0 2.8.6 3.6 1.7"
          stroke={AMBER} strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
        {/* client — front, white */}
        <circle cx="8.8" cy="8" r="3.2" stroke={STROKE} strokeWidth="1.5" fill="#1c1915" />
        <path d="M2.8 19.5c.5-3.4 2.9-5.3 6-5.3s5.5 1.9 6 5.3"
          stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" fill="#1c1915" />
      </svg>
    </ToolCardShell>
  );
}

// ─── Quotes — document with an amber signature flourish ──────────────────────
export function QuotesCard() {
  return (
    <ToolCardShell label="Quotes">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
        <path d="M5 2.8h8.5l5.5 5.5V21H5z" stroke={STROKE} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M13.5 2.8v5.5H19" stroke={STROKE} strokeWidth="1.5" strokeLinejoin="round" />
        <line x1="8" y1="12.2" x2="16" y2="12.2" stroke={STROKE_SOFT} strokeWidth="1.4" strokeLinecap="round" />
        <line x1="8" y1="15" x2="13.5" y2="15" stroke="rgba(255,255,255,0.18)" strokeWidth="1.4" strokeLinecap="round" />
        {/* signature */}
        <path d="M7.8 18.6c1.1-1.8 1.9-2 2.3-.5s1.1 1.3 2-.2 1.8-1.1 3.1.3"
          stroke={AMBER} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </svg>
    </ToolCardShell>
  );
}

// ─── Active Projects — stacked tracks with progress, the active one amber ────
export function ProjectsCard() {
  const tracks = [
    { fill: 0.72, color: "rgba(255,255,255,0.55)" },
    { fill: 0.45, color: "rgba(255,255,255,0.32)" },
    { fill: 0.88, color: AMBER },
  ];
  return (
    <ToolCardShell label="Active Projects">
      <div style={{ display: "flex", flexDirection: "column", gap: 6, width: 30 }}>
        {tracks.map((t, i) => (
          <div key={i} style={{
            position: "relative", height: 4, borderRadius: 3,
            background: "rgba(255,255,255,0.10)",
          }}>
            <div style={{
              position: "absolute", inset: 0, width: `${t.fill * 100}%`,
              borderRadius: 3, background: t.color,
            }} />
          </div>
        ))}
      </div>
    </ToolCardShell>
  );
}
