import type { Metadata } from "next";

/* Server-side metadata for the public Fennec ID page. page.tsx is a client
 * component, so OG/Twitter tags live here: when someone drops their
 * /u/username link in WhatsApp or iMessage, the preview shows their name,
 * dB and the dynamic card image (opengraph-image.tsx) — the ID itself,
 * not a bare text line. */

type PublicProfile = {
  username: string;
  display_name: string | null;
  role: string | null;
  genres: string[] | null;
  fennec_db_score: number;
};

async function fetchProfileForMeta(username: string): Promise<PublicProfile | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) return null;
  try {
    const res = await fetch(
      `${base}/rest/v1/profiles?username=eq.${encodeURIComponent(username)}&select=username,display_name,role,genres,fennec_db_score`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as PublicProfile[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ username: string }> },
): Promise<Metadata> {
  const { username } = await params;
  const profile = await fetchProfileForMeta(username);

  if (!profile) {
    return { title: "Fennec ID", description: "Producer ID on Fennec — the music business & community hub." };
  }

  const name = profile.display_name || profile.username;
  const title = `${name} — ${profile.fennec_db_score} dB on Fennec`;
  const bits = [profile.role, profile.genres?.slice(0, 3).join(" · ")].filter(Boolean);
  const description = `${bits.join(" · ") || "Producer"} · Fennec ID #@${profile.username}`;

  return {
    title,
    description,
    openGraph: { title, description, type: "profile" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function PublicProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
