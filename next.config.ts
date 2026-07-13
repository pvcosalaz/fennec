import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "X-Frame-Options",           value: "SAMEORIGIN" },
  { key: "X-XSS-Protection",          value: "1; mode=block" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://cdnjs.cloudflare.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://www.googleapis.com",
      "frame-src https://js.stripe.com https://www.youtube.com https://player.vimeo.com",
      "worker-src 'self' blob:",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  devIndicators: false,
  // LAN IPs allowed to hit the dev server from another device on the same
  // network (Next 15+ blocks cross-origin dev asset/HMR requests otherwise —
  // the page paints but never finishes hydrating, looks "frozen" on the
  // splash). Add your current IP here if it changes (ipconfig getifaddr en0).
  allowedDevOrigins: ["192.168.1.16", "192.168.1.18", "192.168.1.2"],
  env: {
    NEXT_PUBLIC_SUPABASE_URL:     process.env.NEXT_PUBLIC_SUPABASE_URL     ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
