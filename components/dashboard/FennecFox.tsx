"use client";

type Props = { isActive: boolean; size?: number };

export default function FennecFox({ isActive, size = 120 }: Props) {
  return (
    <>
      <style>{`
        @keyframes foxFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%       { transform: translateY(-10px) rotate(2deg); }
        }
        @keyframes foxBounce {
          0%   { transform: translateY(0px) rotate(-2deg) scale(1); }
          25%  { transform: translateY(-12px) rotate(2deg) scale(1.03); }
          50%  { transform: translateY(-5px) rotate(-1deg) scale(0.98); }
          75%  { transform: translateY(-14px) rotate(1.5deg) scale(1.03); }
          100% { transform: translateY(0px) rotate(-2deg) scale(1); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50%       { opacity: 0.45; transform: scale(1.1); }
        }
        @keyframes glowPulseActive {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50%       { opacity: 0.7; transform: scale(1.15); }
        }
      `}</style>

      {/* SVG filter to thicken the logo strokes */}
      <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
        <defs>
          <filter id="fennec-thicken" x="-10%" y="-10%" width="120%" height="120%">
            <feMorphology operator="dilate" radius="0.7" />
          </filter>
        </defs>
      </svg>

      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {/* Glow behind logo */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(245,166,35,0.5) 0%, transparent 70%)",
            animation: isActive ? "glowPulse 3.2s ease-in-out infinite" : "none",
          }}
        />

        {/* Logo image animated */}
        <img
          src="/fennec-logo.png"
          alt="Fennec"
          style={{
            width: size * 0.85,
            height: "auto",
            position: "relative",
            zIndex: 1,
            animation: isActive ? "foxFloat 3.2s ease-in-out infinite" : "none",
            filter: "url(#fennec-thicken) brightness(0) invert(1) drop-shadow(0 6px 16px rgba(245,166,35,0.4))",
          }}
        />
      </div>
    </>
  );
}
