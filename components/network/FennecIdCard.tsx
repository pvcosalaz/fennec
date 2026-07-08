// components/network/FennecIdCard.tsx
"use client";

import { useState, useEffect, useRef } from "react";

function useCountUp(target: number, duration = 1200) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target <= 0) { setDisplay(0); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return display;
}
import { SiInstagram, SiSpotify, SiYoutube } from "react-icons/si";
import type { FennecIdColor } from "@/lib/fennecIdPalette";

export type FennecIdCardProps = {
  /** First name only — displayed on first line */
  firstName: string;
  /** Last name — displayed indented on second line */
  lastName: string;
  /** e.g. "Producer", "Composer", "Beat Maker" */
  role: string;
  /** e.g. "Mexico" */
  country: string;
  /** e.g. ["Trap", "R&B"] — only first shown as pill */
  genres: string[];
  /** Fennec dB score number */
  fennecDb: number;
  /** The permanent accent color scheme for this producer */
  colorScheme: FennecIdColor;
  /** The producer's immutable global Fennec number (order of joining), e.g. 42 → "#0042".
   *  Shown at bottom right. Omit only while the fennec_number migration hasn't run. */
  collectionNumber?: number;
  /** Two-letter initials for the avatar — shown when no photo */
  initials: string;
  /** User's profile photo URL — shown instead of initials when present */
  avatarUrl?: string | null;
  /**
   * Optional social handles — rendered as icons only (Phase 1).
   * Phase 2: wrap icons in <a href> links using these handle strings.
   */
  instagram?: string | null;
  spotify?: string | null;
  youtube?: string | null;
  /**
   * When true: show dB as a small static badge (no count-up animation, no EQ bars).
   * Use when a larger animated dB is displayed outside the card.
   */
  smallDb?: boolean;
};

function pad4(n: number): string {
  return `#${String(n).padStart(4, "0")}`;
}

// Decorative QR placeholder — size configurable for different card zones
function QrPlaceholder({ size = 50 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        background: "#fff",
        borderRadius: 5,
        padding: Math.round(size * 0.08),
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gridTemplateRows: "repeat(7, 1fr)",
        gap: 1,
        flexShrink: 0,
      }}
    >
      <div style={{ gridColumn: "1/4", gridRow: "1/4", background: "#111", borderRadius: 2 }} />
      <div style={{ gridColumn: "2/3", gridRow: "2/3", background: "#fff" }} />
      <div style={{ gridColumn: "5/8", gridRow: "1/4", background: "#111", borderRadius: 2 }} />
      <div style={{ gridColumn: "6/7", gridRow: "2/3", background: "#fff" }} />
      <div style={{ gridColumn: "1/4", gridRow: "5/8", background: "#111", borderRadius: 2 }} />
      <div style={{ gridColumn: "2/3", gridRow: "6/7", background: "#fff" }} />
      <div style={{ gridColumn: "5/6", gridRow: "5/6", background: "#111" }} />
      <div style={{ gridColumn: "7/8", gridRow: "5/6", background: "#111" }} />
      <div style={{ gridColumn: "6/7", gridRow: "6/7", background: "#111" }} />
      <div style={{ gridColumn: "5/7", gridRow: "7/8", background: "#111" }} />
      <div style={{ gridColumn: "4/5", gridRow: "1/2", background: "#111" }} />
      <div style={{ gridColumn: "4/5", gridRow: "3/5", background: "#111" }} />
      <div style={{ gridColumn: "4/5", gridRow: "6/8", background: "#111" }} />
    </div>
  );
}

const EQ_HEIGHTS = [10, 18, 8, 15, 10, 22, 7, 13, 18, 9];

function EqBars({ accent }: { accent: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", height: 22, marginTop: 2 }}>
      {EQ_HEIGHTS.map((h, i) => (
        <span
          key={`eq-${i}`}
          className="fennec-eq-bar"
          style={{ height: h, background: accent, animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

export default function FennecIdCard({
  firstName,
  lastName,
  role,
  country,
  genres,
  fennecDb,
  colorScheme,
  collectionNumber,
  initials,
  avatarUrl,
  instagram,
  spotify,
  youtube,
  smallDb = false,
}: FennecIdCardProps) {
  const { accent, dark1, dark2, glowRgb, textOnAvatar } = colorScheme;
  const [showDbInfo, setShowDbInfo] = useState(false);
  const animatedDb = useCountUp(fennecDb, 1400);

  return (
    <div
      style={{
        borderRadius: 18,
        padding: 0,
        background: `linear-gradient(135deg, ${dark1}, ${dark2})`,
        border: `1px solid ${accent}35`,
        boxShadow: `0 12px 40px rgba(${glowRgb},0.15)`,
        position: "relative",
        overflow: "hidden",
        height: 195,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Glow overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 85% 10%, rgba(${glowRgb},0.12), transparent 55%)`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Fennec logo watermark */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.06,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/fennec-icon-transparent.png"
          alt=""
          style={{ width: 260, height: 260, objectFit: "contain", filter: "brightness(0) invert(1)" }}
        />
      </div>

      {/* ── TOP SECTION: photo (left) + info (right) ── */}
      <div style={{ display: "flex", alignItems: "stretch", position: "relative", zIndex: 1, flex: 1, minHeight: 0 }}>

        {/* Photo panel — circle avatar, vertically centered */}
        <div
          style={{
            width: 104,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "14px 8px 14px 14px",
          }}
        >
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: "50%",
              overflow: "hidden",
              flexShrink: 0,
              background: accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 4px 16px rgba(${glowRgb},0.5)`,
              border: `2px solid rgba(${glowRgb},0.35)`,
            }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={initials}
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
              />
            ) : (
              <span style={{ fontSize: 22, fontWeight: 800, color: textOnAvatar === "white" ? "#fff" : "#000" }}>
                {initials}
              </span>
            )}
          </div>
        </div>

        {/* Info column: name block top-aligned · fennec ID/QR absolute top-right */}
        <div
          style={{
            flex: 1,
            padding: "32px 10px 8px 6px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            gap: 6,
            minHeight: 0,
            position: "relative",
          }}
        >
          {/* Fennec ID + QR — absolute top-right, out of flow */}
          <div style={{ position: "absolute", top: 10, right: 10, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "baseline" }}>
              <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, fontWeight: 900, color: "#fff", letterSpacing: "-0.06em" }}>
                fennec
              </span>
              <span style={{ fontSize: 8, fontWeight: 700, color: accent, letterSpacing: "0.06em", textTransform: "uppercase", marginLeft: 3 }}>
                ID
              </span>
            </div>
            <QrPlaceholder size={38} />
          </div>

          {/* Role label + staggered name */}
          <div style={{ lineHeight: 1.0 }}>
            <p style={{ fontSize: 7, color: `${accent}55`, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 4px 0" }}>
              {role}
            </p>
            <p style={{ fontSize: 27, fontWeight: 900, color: "#fff", textTransform: "uppercase", letterSpacing: "-0.02em", margin: 0, lineHeight: 1.0 }}>
              {firstName}
            </p>
            <p style={{ fontSize: 27, fontWeight: 900, color: "#fff", textTransform: "uppercase", letterSpacing: "-0.02em", margin: 0, lineHeight: 1.0, paddingLeft: 16 }}>
              {lastName}
            </p>
          </div>

          {/* Genres + country */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            {genres.map((g) => (
              <span
                key={g}
                style={{
                  fontSize: 7,
                  background: `${accent}15`,
                  color: accent,
                  padding: "2px 7px",
                  borderRadius: 20,
                  border: `1px solid ${accent}25`,
                  letterSpacing: "0.04em",
                }}
              >
                {g}
              </span>
            ))}
            <span style={{ fontSize: 7, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", fontWeight: 600 }}>
              {country.toUpperCase()}
              {collectionNumber !== undefined ? ` · ${pad4(collectionNumber)}` : ""}
            </span>
          </div>
        </div>
      </div>

      {/* ── SCORE BAND ── */}
      <div
        style={{
          padding: smallDb ? "7px 16px 10px" : "9px 16px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
          zIndex: 1,
        }}
      >
        {smallDb ? (
          /* Small static badge — dB hero lives outside the card */
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 7, color: `${accent}55`, fontWeight: 700, letterSpacing: "0.16em" }}>
              FENNEC dB
            </span>
            <span style={{ fontSize: 13, fontWeight: 900, color: `${accent}90`, lineHeight: 1 }}>
              {fennecDb}
            </span>
          </div>
        ) : (
          /* Full animated score + EQ bars */
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
              <p style={{ fontSize: 7, color: `${accent}60`, fontWeight: 700, letterSpacing: "0.14em", margin: 0 }}>
                FENNEC dB
              </p>
              <button
                onClick={() => setShowDbInfo((v) => !v)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: `${accent}60`, lineHeight: 1 }}
                aria-label="What is Fennec dB?"
              >
                <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="8" cy="8" r="7.5" stroke="currentColor" strokeWidth="1" fill="none" />
                  <text x="8" y="12" textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor">i</text>
                </svg>
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
              <p style={{ fontSize: 34, fontWeight: 900, color: accent, lineHeight: 1, margin: 0 }}>
                {animatedDb}
              </p>
              <EqBars accent={accent} />
            </div>
          </div>
        )}

        {/* Right: social icons */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {instagram && <SiInstagram size={11} style={{ color: "#E1306C", opacity: 0.75 }} />}
          {spotify   && <SiSpotify   size={11} style={{ color: "#1DB954", opacity: 0.75 }} />}
          {youtube   && <SiYoutube   size={11} style={{ color: "#FF0000", opacity: 0.75 }} />}
        </div>
      </div>

      {/* dB info panel — expands below score band */}
      {showDbInfo && (
        <div
          style={{
            borderTop: `1px solid ${accent}15`,
            padding: "8px 14px 12px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <p style={{ fontSize: 9, color: `${accent}90`, lineHeight: 1.6, margin: 0 }}>
            A growing number that measures how active your music business is — like signal strength, but for your career.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", marginTop: 6 }}>
            {[
              { label: "Active project", value: "×150" },
              { label: "Closed project", value: "×50"  },
              { label: "Client",         value: "×75"  },
              { label: "Quote sent",     value: "×25"  },
            ].map((r) => (
              <span key={r.label} style={{ fontSize: 8, color: `${accent}65` }}>
                {r.label} <strong style={{ color: accent }}>{r.value}</strong>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
