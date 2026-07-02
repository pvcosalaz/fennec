"use client";

import { notFound } from "next/navigation";
import { Player } from "@remotion/player";
import FennecIntro from "@/components/remotion/FennecIntro";

export default function DemoPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050507",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
        padding: 24,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 11, letterSpacing: "0.2em", color: "#f5a623", textTransform: "uppercase", marginBottom: 6 }}>
          Remotion Demo
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>
          Fennec Intro
        </h1>
        <p style={{ fontSize: 13, color: "#444", marginTop: 4 }}>
          160 frames · 30 fps · ~5.3 segundos
        </p>
      </div>

      <Player
        component={FennecIntro}
        durationInFrames={160}
        fps={30}
        compositionWidth={600}
        compositionHeight={400}
        style={{
          width: "100%",
          maxWidth: 600,
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 0 60px rgba(245,166,35,0.08)",
        }}
        controls
        loop
        autoPlay
      />

      <p style={{ fontSize: 12, color: "#333", textAlign: "center", maxWidth: 400 }}>
        Esta misma composición puede exportarse como MP4 para stories, reels o marketing.
      </p>
    </div>
  );
}
