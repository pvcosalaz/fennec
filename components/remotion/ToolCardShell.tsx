"use client";

// ─── Warm-workspace tool card shell ──────────────────────────────────────────
// Design rules (emil-design-eng / impeccable / taste):
// - No ambient animations: these cards are seen dozens of times a day, so the
//   only motion is press feedback on the parent <button>.
// - One warm surface shared by every card; identity comes from the glyph.
// - Single accent (Fennec amber) instead of a per-card neon palette.

export const AMBER = "#f5a623";
export const STROKE = "rgba(255,255,255,0.68)";
export const STROKE_SOFT = "rgba(255,255,255,0.30)";

export default function ToolCardShell({
  label, children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      width: "100%", height: "100%",
      position: "relative", overflow: "hidden",
      borderRadius: "inherit",
      background: "linear-gradient(180deg, #1c1915 0%, #161310 100%)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.05)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 9,
    }}>
      {/* Soft warm pool of light behind the glyph */}
      <div aria-hidden style={{
        position: "absolute", width: 64, height: 64, borderRadius: "50%",
        top: "calc(50% - 44px)", left: "calc(50% - 32px)",
        background: "radial-gradient(circle, rgba(245,166,35,0.09), transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>

      <span style={{
        position: "relative",
        fontSize: 10.5, fontWeight: 600, letterSpacing: "0.01em",
        color: "rgba(255,255,255,0.82)",
        textAlign: "center", padding: "0 10px", lineHeight: 1.3,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
      }}>
        {label}
      </span>
    </div>
  );
}
