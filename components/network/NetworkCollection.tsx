// components/network/NetworkCollection.tsx
"use client";

import { useState } from "react";
import FennecIdCard from "./FennecIdCard";
import { getColorScheme } from "@/lib/fennecIdPalette";
import type { Profile } from "@/lib/communityTypes";

type Props = {
  contacts: Profile[];
};

function getInitials(profile: Profile): string {
  const name = profile.display_name || profile.username || "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getFirstLast(profile: Profile): { firstName: string; lastName: string } {
  const name = profile.display_name || profile.username || "Unknown";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
  }
  return { firstName: name, lastName: "" };
}

export default function NetworkCollection({ contacts }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (contacts.length === 0) {
    return (
      <div
        style={{
          borderRadius: 16,
          padding: "20px 16px",
          background: "#0d0d0f",
          border: "1.5px dashed #1f1f1f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 6,
          minHeight: 80,
        }}
      >
        <span style={{ fontSize: 9, color: "#333", letterSpacing: "0.12em", fontWeight: 600 }}>
          SCAN QR TO ADD PRODUCERS — COMING SOON
        </span>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p style={{ fontSize: 10, color: "#555", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>
          Tu red · {contacts.length} productor{contacts.length !== 1 ? "es" : ""}
        </p>
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            fontSize: 10,
            color: "#f5a623",
            fontWeight: 700,
            letterSpacing: "0.1em",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          {expanded ? "CERRAR" : "VER TODOS"}
        </button>
      </div>

      {/* Collapsed: deck preview */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <div style={{ position: "relative", height: 130 }}>
            {/* Show up to 3 cards peeking behind, in reverse order */}
            {contacts.slice(1, 4).reverse().map((contact, i) => {
              const scheme = getColorScheme(contact.color_id);
              const rotations = [2.5, -1.5, 1];
              const tops = [18, 12, 6];
              const idx = contacts.slice(1, 4).length - 1 - i;
              return (
                <div
                  key={contact.id}
                  style={{
                    position: "absolute",
                    top: tops[idx] ?? 18,
                    left: 0,
                    right: 0,
                    height: 110,
                    borderRadius: 16,
                    background: `linear-gradient(135deg, ${scheme.dark1}, ${scheme.dark2})`,
                    border: `1px solid ${scheme.accent}25`,
                    transform: `rotate(${rotations[idx] ?? 0}deg)`,
                    transformOrigin: "bottom center",
                  }}
                />
              );
            })}
            {/* Top card — fully visible */}
            {(() => {
              const top = contacts[0];
              const scheme = getColorScheme(top.color_id);
              const { firstName, lastName } = getFirstLast(top);
              return (
                <div style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
                  <FennecIdCard
                    firstName={firstName}
                    lastName={lastName}
                    role={top.role ?? "Producer"}
                    country={top.country ?? ""}
                    genres={top.genres ?? []}
                    fennecDb={top.fennec_db_score}
                    colorScheme={scheme}
                    collectionNumber={1}
                    initials={getInitials(top)}
                    instagram={top.instagram}
                    tiktok={top.tiktok}
                    spotify={top.spotify}
                    youtube={top.youtube_url}
                  />
                </div>
              );
            })()}
          </div>
        </button>
      )}

      {/* Expanded: Apple Wallet stack */}
      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {contacts.map((contact, i) => {
            const scheme = getColorScheme(contact.color_id);
            const { firstName, lastName } = getFirstLast(contact);
            const isLast = i === contacts.length - 1;
            return (
              <div
                key={contact.id}
                style={{
                  position: "relative",
                  zIndex: contacts.length - i,
                  marginBottom: isLast ? 0 : -44,
                  animation: `slideInCard 0.3s ease both`,
                  animationDelay: `${i * 60}ms`,
                }}
              >
                <FennecIdCard
                  firstName={firstName}
                  lastName={lastName}
                  role={contact.role ?? "Producer"}
                  country={contact.country ?? ""}
                  genres={contact.genres ?? []}
                  fennecDb={contact.fennec_db_score}
                  colorScheme={scheme}
                  collectionNumber={i + 1}
                  initials={getInitials(contact)}
                  instagram={contact.instagram}
                  tiktok={contact.tiktok}
                  spotify={contact.spotify}
                  youtube={contact.youtube_url}
                />
              </div>
            );
          })}

          {/* Add slot */}
          <div
            style={{
              marginTop: 8,
              borderRadius: 16,
              padding: "14px 16px",
              background: "#0d0d0f",
              border: "1.5px dashed #1f1f1f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "#1a1a1a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                color: "#333",
              }}
            >
              +
            </div>
            <span style={{ fontSize: 9, color: "#333", letterSpacing: "0.12em", fontWeight: 600 }}>
              SCAN QR TO ADD PRODUCER
            </span>
          </div>
        </div>
      )}

      {/* Keyframe for card slide-in animation */}
      <style>{`
        @keyframes slideInCard {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
