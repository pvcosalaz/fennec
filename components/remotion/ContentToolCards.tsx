"use client";

// ─── Content Lab tool cards ───────────────────────────────────────────────────
// Same warm-workspace system as Business Hub: static hand-tuned glyphs,
// single amber accent, no looping animations.

import ToolCardShell, { AMBER, STROKE, STROKE_SOFT } from "./ToolCardShell";

// ─── Quick Ideas — amber spark ────────────────────────────────────────────────
export function QuickIdeasCard() {
  return (
    <ToolCardShell label="Quick Ideas">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
        {/* main spark */}
        <path
          d="M12 3.5 13.7 10.3 20.5 12 13.7 13.7 12 20.5 10.3 13.7 3.5 12 10.3 10.3 Z"
          fill={AMBER} opacity="0.95"
        />
        {/* small companion spark */}
        <path
          d="M19 3.6 19.6 5.9 21.9 6.5 19.6 7.1 19 9.4 18.4 7.1 16.1 6.5 18.4 5.9 Z"
          fill="rgba(255,255,255,0.45)"
        />
      </svg>
    </ToolCardShell>
  );
}

// ─── Content Lab — frame with amber play ──────────────────────────────────────
export function ContentLabCard() {
  return (
    <ToolCardShell label="Content Lab">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="5" width="18" height="14" rx="3" stroke={STROKE} strokeWidth="1.5" />
        {/* film notches */}
        <line x1="7.5" y1="5" x2="7.5" y2="8" stroke={STROKE_SOFT} strokeWidth="1.2" />
        <line x1="16.5" y1="5" x2="16.5" y2="8" stroke={STROKE_SOFT} strokeWidth="1.2" />
        {/* play */}
        <path d="M10.4 10.4v4.4l4-2.2z" fill={AMBER} />
      </svg>
    </ToolCardShell>
  );
}

// ─── My Scripts — pen over text lines ─────────────────────────────────────────
export function MyScriptsCard() {
  return (
    <ToolCardShell label="My Scripts">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
        <line x1="4" y1="7" x2="13" y2="7" stroke={STROKE_SOFT} strokeWidth="1.4" strokeLinecap="round" />
        <line x1="4" y1="11.5" x2="10.5" y2="11.5" stroke={STROKE_SOFT} strokeWidth="1.4" strokeLinecap="round" />
        <line x1="4" y1="16" x2="8" y2="16" stroke="rgba(255,255,255,0.18)" strokeWidth="1.4" strokeLinecap="round" />
        {/* pen */}
        <path
          d="M17.8 4.2a1.9 1.9 0 0 1 2.7 2.7L12 15.4l-3.6 1 1-3.6z"
          stroke={AMBER} strokeWidth="1.5" strokeLinejoin="round" fill="rgba(245,166,35,0.12)"
        />
      </svg>
    </ToolCardShell>
  );
}
