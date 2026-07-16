import { ImageResponse } from "next/og";
import { getColorScheme } from "@/lib/fennecIdPalette";

/* Dynamic OG image for /u/[username]: WhatsApp/iMessage/Twitter unfurl the
 * link as the producer's actual Fennec ID — their color scheme, name, role,
 * genres and dB — instead of a generic preview. Rendered at the edge with
 * next/og (satori), so it's plain flex divs, no Tailwind. */

export const runtime = "edge";
export const alt = "Fennec ID";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type PublicProfile = {
  username: string;
  display_name: string | null;
  role: string | null;
  country: string | null;
  genres: string[] | null;
  color_id: string | null;
  fennec_number: number | null;
  fennec_db_score: number;
  avatar_url: string | null;
};

export default async function OgImage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  let profile: PublicProfile | null = null;
  try {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (base && key) {
      const res = await fetch(
        `${base}/rest/v1/profiles?username=eq.${encodeURIComponent(username)}&select=username,display_name,role,country,genres,color_id,fennec_number,fennec_db_score,avatar_url`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` } },
      );
      if (res.ok) profile = ((await res.json()) as PublicProfile[])[0] ?? null;
    }
  } catch { /* fall through to the generic card */ }

  const scheme = getColorScheme(profile?.color_id ?? null);
  const name = (profile?.display_name || profile?.username || "Fennec ID").toUpperCase();
  const role = (profile?.role || "Producer").toUpperCase();
  const genres = profile?.genres?.slice(0, 3) ?? [];
  const db = profile?.fennec_db_score ?? 0;
  const num = profile?.fennec_number ? `#${String(profile.fennec_number).padStart(4, "0")}` : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: `linear-gradient(150deg, ${scheme.dark1} 0%, ${scheme.dark2} 60%, #0b0a08 100%)`,
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* accent edge glow */}
        <div style={{ position: "absolute", inset: 0, display: "flex", border: `3px solid ${scheme.accent}55` }} />

        {/* top row: role eyebrow + wordmark */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 26, letterSpacing: 10, color: scheme.accent, fontWeight: 700 }}>{role}</div>
            <div style={{ display: "flex", fontSize: 84, fontWeight: 800, color: "#ffffff", lineHeight: 1.05, marginTop: 14, maxWidth: 860 }}>
              {name}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <div style={{ display: "flex", fontSize: 34, fontWeight: 800, color: "#ffffff" }}>fennec</div>
            <div style={{ display: "flex", fontSize: 22, fontWeight: 700, color: scheme.accent, letterSpacing: 3 }}>ID</div>
          </div>
        </div>

        {/* genre pills + country/number */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {genres.map((g) => (
            <div
              key={g}
              style={{
                display: "flex",
                padding: "10px 24px",
                borderRadius: 999,
                border: `2px solid ${scheme.accent}66`,
                color: scheme.accent,
                fontSize: 24,
                fontWeight: 600,
              }}
            >
              {g}
            </div>
          ))}
          <div style={{ display: "flex", fontSize: 24, color: "rgba(255,255,255,.45)", letterSpacing: 4, fontWeight: 600 }}>
            {[profile?.country?.toUpperCase(), num].filter(Boolean).join(" · ")}
          </div>
        </div>

        {/* bottom: the dB reading */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 24, letterSpacing: 8, color: "rgba(255,255,255,.5)", fontWeight: 700 }}>
              FENNEC dB
            </div>
            <div style={{ display: "flex", fontSize: 150, fontWeight: 800, color: scheme.accent, lineHeight: 1 }}>{db}</div>
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "rgba(255,255,255,.4)", letterSpacing: 2 }}>
            @{profile?.username ?? "fennec"} · fennec.audio
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
