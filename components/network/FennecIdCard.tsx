// components/network/FennecIdCard.tsx
"use client";

import { useState } from "react";
import { SiInstagram, SiTiktok, SiSpotify, SiYoutube } from "react-icons/si";
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
  /** Collection number shown at bottom right, e.g. 1 → "#0001". Omit for own card. */
  collectionNumber?: number;
  /** Two-letter initials for the avatar circle */
  initials: string;
  /**
   * Optional social handles — rendered as icons only (Phase 1).
   * Phase 2: wrap icons in <a href> links using these handle strings.
   */
  instagram?: string | null;
  tiktok?: string | null;
  spotify?: string | null;
  youtube?: string | null;
};

function pad4(n: number): string {
  return `#${String(n).padStart(4, "0")}`;
}

// Simple QR-like grid — purely decorative placeholder
// In Phase 2 this will be replaced with a real QR code library
function QrPlaceholder() {
  return (
    <div
      style={{
        width: 50,
        height: 50,
        background: "#fff",
        borderRadius: 6,
        padding: 4,
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gridTemplateRows: "repeat(7, 1fr)",
        gap: 1,
        flexShrink: 0,
      }}
    >
      {/* Corner squares */}
      <div style={{ gridColumn: "1/4", gridRow: "1/4", background: "#111", borderRadius: 2 }} />
      <div style={{ gridColumn: "2/3", gridRow: "2/3", background: "#fff" }} />
      <div style={{ gridColumn: "5/8", gridRow: "1/4", background: "#111", borderRadius: 2 }} />
      <div style={{ gridColumn: "6/7", gridRow: "2/3", background: "#fff" }} />
      <div style={{ gridColumn: "1/4", gridRow: "5/8", background: "#111", borderRadius: 2 }} />
      <div style={{ gridColumn: "2/3", gridRow: "6/7", background: "#fff" }} />
      {/* Data dots */}
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

// EQ soundwave bars — same pattern as Dashboard but accent-colored for dark card
const EQ_HEIGHTS = [10, 16, 8, 14, 10, 18, 7, 13, 16, 9];

function EqBars({ accent }: { accent: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 0, height: 18, marginTop: 4 }}>
      {EQ_HEIGHTS.map((h, i) => (
        <span
          key={i}
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
  instagram,
  tiktok,
  spotify,
  youtube,
}: FennecIdCardProps) {
  const { accent, dark1, dark2, glowRgb, textOnAvatar } = colorScheme;
  const primaryGenre = genres[0] ?? "";
  const [showDbInfo, setShowDbInfo] = useState(false);

  return (
    <div
      style={{
        borderRadius: 18,
        padding: "20px 20px 18px",
        background: `linear-gradient(135deg, ${dark1}, ${dark2})`,
        border: `1px solid ${accent}35`,
        boxShadow: `0 12px 40px rgba(${glowRgb},0.15)`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Glow overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 85% 10%, rgba(${glowRgb},0.12), transparent 55%)`,
          pointerEvents: "none",
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
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/fennec-icon-transparent.png"
          alt=""
          style={{ width: 260, height: 260, objectFit: "contain", filter: "brightness(0) invert(1)" }}
        />
      </div>

      {/* TOP ROW: role (left) · fennec ID + QR (right) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, position: "relative" }}>
        <p style={{ fontSize: 8, color: `${accent}55`, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", paddingTop: 3 }}>
          {role}
        </p>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
            <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13, fontWeight: 900, color: "#fff", letterSpacing: "-0.06em" }}>
              fennec
            </span>
            <span style={{ fontSize: 9, fontWeight: 700, color: accent, letterSpacing: "0.06em", textTransform: "uppercase", marginLeft: 3 }}>
              ID
            </span>
          </div>
          <QrPlaceholder />
        </div>
      </div>

      {/* NAME — staggered */}
      <div style={{ marginBottom: 16, lineHeight: 1.0, position: "relative" }}>
        <p style={{ fontSize: 28, fontWeight: 900, color: "#fff", textTransform: "uppercase", letterSpacing: "-0.02em", margin: 0 }}>
          {firstName}
        </p>
        <p style={{ fontSize: 28, fontWeight: 900, color: "#fff", textTransform: "uppercase", letterSpacing: "-0.02em", margin: 0, paddingLeft: 20 }}>
          {lastName}
        </p>
      </div>

      {/* BOTTOM ROW: avatar + dB score + EQ bars + (i) (left) · genre + country/#num + social icons (right) */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", position: "relative", marginBottom: 12 }}>
        {/* Left: avatar + score */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 800,
              color: textOnAvatar === "white" ? "#fff" : "#000",
              boxShadow: `0 3px 12px rgba(${glowRgb},0.45)`,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div>
            {/* dB label + (i) button */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
              <p style={{ fontSize: 7, color: `${accent}60`, fontWeight: 700, letterSpacing: "0.14em", margin: 0 }}>FENNEC dB</p>
              <button
                onClick={() => setShowDbInfo((v) => !v)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: `${accent}60`, lineHeight: 1 }}
                aria-label="What is Fennec dB?"
              >
                <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="8" cy="8" r="7.5" stroke="currentColor" strokeWidth="1" fill="none"/>
                  <text x="8" y="12" textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor">i</text>
                </svg>
              </button>
            </div>
            <p style={{ fontSize: 24, fontWeight: 900, color: accent, lineHeight: 1, margin: 0 }}>{fennecDb}</p>
            {/* EQ soundwave animation */}
            <EqBars accent={accent} />
          </div>
        </div>

        {/* Right: genre + country/#num */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
          {primaryGenre && (
            <span
              style={{
                fontSize: 7,
                background: `${accent}12`,
                color: accent,
                padding: "2px 8px",
                borderRadius: 20,
                border: `1px solid ${accent}25`,
                letterSpacing: "0.04em",
              }}
            >
              {primaryGenre}
            </span>
          )}
          <span style={{ fontSize: 7, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", fontWeight: 600 }}>
            {country.toUpperCase()}{collectionNumber !== undefined ? ` · ${pad4(collectionNumber)}` : ""}
          </span>
          {/* Social icons */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            {instagram && <SiInstagram size={10} style={{ color: "#E1306C", opacity: 0.7 }} />}
            {spotify   && <SiSpotify   size={10} style={{ color: "#1DB954", opacity: 0.7 }} />}
            {youtube   && <SiYoutube   size={10} style={{ color: "#FF0000", opacity: 0.7 }} />}
            {tiktok    && <SiTiktok    size={10} style={{ color: "#fff",    opacity: 0.6 }} />}
          </div>
        </div>
      </div>

      {/* dB info panel — toggles with (i) */}
      {showDbInfo && (
        <div
          style={{
            borderRadius: 10,
            border: `1px solid ${accent}20`,
            background: `${accent}08`,
            padding: "8px 10px",
            position: "relative",
          }}
        >
          <p style={{ fontSize: 9, color: `${accent}99`, lineHeight: 1.6, margin: 0 }}>
            A growing number that measures how active your music business is — like signal strength, but for your career.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", marginTop: 6 }}>
            {[
              { label: "Active project", value: "×150" },
              { label: "Closed project", value: "×50"  },
              { label: "Client",         value: "×75"  },
              { label: "Quote sent",     value: "×25"  },
            ].map((r) => (
              <span key={r.label} style={{ fontSize: 8, color: `${accent}70` }}>
                {r.label} <strong style={{ color: accent }}>{r.value}</strong>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
