"use client";

import { TILE_BG, TILE_SHADOW } from "@/components/desktop/surfaces";

/* ═══════════════════════════════════════════════════════════════
   DESKTOP UI PRIMITIVES — one visual language for every module.
   Extracted from the dashboard's design pass (2026-07-31) so
   Business, The Tape, Marketing and Community don't each invent
   their own surfaces.

   The rules this encodes:
   - Materiality over borders: a top highlight + tinted floor shadow
     reads as a physical panel; a 1px grey border reads as a div.
   - Group by function, not by box: hairline Bands and divided Cols
     carry structure without wrapping everything in cards.
   - One accent (amber). Identity color belongs to the FennecID card
     alone. No neon glows, no gradient text, no emojis.
   ═══════════════════════════════════════════════════════════════ */

export const ACCENT = "#f5a623";

/** The shared surface: a top highlight + tinted floor shadow. Spread it onto
 *  any panel that used a flat `border-white/[0.07] bg-white/[0.02]` box so
 *  every module reads as the same material. */
/* Brushed, not glassy: a lit top edge and a dark underside are what make a
   panel read as a physical object rather than a lighter rectangle. Matches
   the rails' edge lighting so the whole shell is one material
   (Paco 2026-08-02). */
export const SURFACE: React.CSSProperties = {
  background: TILE_BG,
  boxShadow: TILE_SHADOW,
};

/** Staggered entrance. Drop <RiseStyle/> once per module, then put
 *  `dd-rise` on each section with an increasing animationDelay. */
export function RiseStyle() {
  return (
    <style>{`
      @keyframes ddRise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
      .dd-rise { animation: ddRise .5s cubic-bezier(.16,1,.3,1) both; }
      @media (prefers-reduced-motion: reduce) { .dd-rise { animation: none; } }
    `}</style>
  );
}

/** Section header: a small label with a hairline running off to the right. */
export function Band({ label, children, className, action }: {
  label: string; children: React.ReactNode; className?: string; action?: React.ReactNode;
}) {
  return (
    <div className={className ?? "mt-5"}>
      <div className="mb-1 flex items-center gap-2.5">
        <span className="text-[8.5px] font-bold uppercase tracking-[0.22em] text-zinc-600">{label}</span>
        <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, rgba(255,255,255,.07), transparent)" }} />
        {action}
      </div>
      {children}
    </div>
  );
}

/** Grouping surface. Lighter than a card, heavier than nothing: the
 *  dB panel's materiality dialled down. Use to group related data. */
export function Tile({ label, children, action, className, padded = true }: {
  label?: string; children: React.ReactNode; action?: React.ReactNode;
  className?: string; padded?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${padded ? "px-4 pb-3 pt-3.5" : ""} ${className ?? ""}`}
      // Tile had its own copy of the old values, so it drifted the moment
      // SURFACE changed. One token, one material.
      style={SURFACE}
    >
      {label && (
        <div className={`mb-1.5 flex items-center justify-between ${padded ? "" : "px-4 pt-3.5"}`}>
          <span className="text-[8.5px] font-bold uppercase tracking-[0.22em] text-zinc-600">{label}</span>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

/** The hero instrument: one number that owns the screen. Same treatment
 *  as the dashboard's Fennec dB — solid accent, layered surface, light
 *  pooling from the floor rather than a halo around the glyph. */
export function Instrument({ label, value, footer, size = 92 }: {
  label: string; value: string; footer?: React.ReactNode; size?: number;
}) {
  return (
    <div
      className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl p-6"
      style={{
        background: "linear-gradient(180deg,#151318,#100f13)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 16px 34px -18px rgba(0,0,0,0.7)",
      }}
    >
      <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(60% 42% at 50% 100%, ${ACCENT}12, transparent 72%)` }} />
      <span className="relative text-[9px] font-bold uppercase tracking-[0.35em] text-zinc-500">{label}</span>
      <div className="relative flex items-baseline" style={{ padding: "2px 4px" }}>
        <span
          className="font-black tabular-nums leading-none tracking-[-0.035em]"
          style={{ color: ACCENT, fontSize: size }}
        >
          {value}
        </span>
      </div>
      {footer}
    </div>
  );
}

/** Hairline-divided metric row. Structure without boxes. */
export function Cols({ children }: { children: React.ReactNode }) {
  return <div className="grid" style={{ gridAutoFlow: "column", gridAutoColumns: "1fr" }}>{children}</div>;
}

export function Col({ value, label, sub, extra, muted, onClick, icon }: {
  value: string; label: string; sub?: string;
  /** A quieter second line under `sub` — used for totals in other currencies. */
  extra?: string | null;
  muted?: boolean;
  onClick?: () => void; icon?: React.ReactNode;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick}
      className={`group relative border-l border-white/[0.05] px-[18px] py-[11px] text-left first:border-l-0 first:pl-0.5 ${onClick ? "transition hover:bg-white/[0.02]" : ""}`}>
      {onClick && (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
        </span>
      )}
      {icon && <div className="mb-1.5">{icon}</div>}
      <b className={`text-[21px] font-extrabold tabular-nums ${muted ? "text-zinc-600" : "text-white"}`}>{value}</b>
      <span className="mt-[3px] block text-[9px] uppercase tracking-[0.16em] text-zinc-600">{label}</span>
      {sub && <span className="block text-[10px] font-semibold text-accent">{sub}</span>}
      {extra && <span className="block text-[10px] text-zinc-600">{extra}</span>}
    </Tag>
  );
}

/** Compact action row (the dashboard's "Today on Fennec" pattern):
 *  a line of text and an accent verb, divided by hairlines. */
export function ActionRow({ text, verb, onClick }: { text: string; verb: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="group flex w-full items-center justify-between gap-3 py-[9px] text-left">
      <span className="min-w-0 truncate text-[12px] text-zinc-400">{text}</span>
      <span className="flex-shrink-0 text-[11px] font-semibold text-accent transition group-hover:brightness-110">{verb} →</span>
    </button>
  );
}
