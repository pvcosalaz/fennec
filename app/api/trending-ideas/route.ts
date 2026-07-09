export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { fetchTrendingVideos, personalizeAngles, type TrendingVideo } from "@/lib/trendingData";
// Admin client: cached_content is RLS-protected, and the anon client's
// upserts were failing silently — the cache never refreshed (stuck at its
// 2026-06-02 row) and every visit re-hit YouTube + Claude.
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type { TrendingVideo } from "@/lib/trendingData";

const CACHE_KEY = "trending_videos";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

/** The video list + generic analysis stays ONE shared cache for all users.
 *  Personalization only rewrites the "angle" field on top of it. */
async function getVideos(): Promise<{ videos: TrendingVideo[]; cachedAt: number }> {
  const supabase = getSupabaseAdmin();
  const { data: cached } = await supabase
    .from("cached_content")
    .select("data, updated_at")
    .eq("key", CACHE_KEY)
    .single();

  if (cached) {
    const age = Date.now() - new Date(cached.updated_at).getTime();
    if (age < CACHE_TTL_MS) {
      console.log("[trending-ideas] serving from cache");
      return { videos: cached.data, cachedAt: new Date(cached.updated_at).getTime() };
    }
  }

  // Cache stale or missing — fetch fresh data
  const videos = await fetchTrendingVideos();

  // Save to cache (best-effort, don't fail if upsert errors)
  if (videos.length > 0) {
    await getSupabaseAdmin()
      .from("cached_content")
      .upsert({ key: CACHE_KEY, data: videos, updated_at: new Date().toISOString() });
  }

  return { videos, cachedAt: Date.now() };
}

export async function GET(req: Request) {
  try {
    const genres = (new URL(req.url).searchParams.get("genres") ?? "")
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean)
      .slice(0, 5); // sanity cap — profiles hold a handful of genres

    const { videos, cachedAt } = await getVideos();

    if (!genres.length || !videos.length) {
      return NextResponse.json({ videos, cachedAt });
    }

    // ── Personalized angles — cached per genre COMBO, not per user ──
    // Same 6h window as the videos; invalidated when the video set changes.
    const slug = genres
      .map((g) => g.toLowerCase().replace(/[^a-z0-9]+/g, "-"))
      .sort()
      .join("_")
      .slice(0, 60);
    const anglesKey = `trending_angles_${slug}`;
    const videoIds = videos.map((v) => v.id);

    try {
      let angles: Record<string, string> | null = null;

      const supabase = getSupabaseAdmin();
      const { data: cachedAngles } = await supabase
        .from("cached_content")
        .select("data, updated_at")
        .eq("key", anglesKey)
        .single();

      if (cachedAngles) {
        const age = Date.now() - new Date(cachedAngles.updated_at).getTime();
        const stored = cachedAngles.data as { videoIds?: string[]; angles?: Record<string, string> };
        const sameVideos =
          stored.videoIds?.length === videoIds.length &&
          stored.videoIds.every((id) => videoIds.includes(id));
        if (age < CACHE_TTL_MS && sameVideos && stored.angles) angles = stored.angles;
      }

      if (!angles) {
        angles = await personalizeAngles(videos, genres);
        await supabase
          .from("cached_content")
          .upsert({ key: anglesKey, data: { videoIds, angles }, updated_at: new Date().toISOString() });
      }

      const personalized = videos.map((v) => ({ ...v, angle: angles[v.id] ?? v.angle }));
      return NextResponse.json({ videos: personalized, cachedAt, personalizedFor: genres });
    } catch (err) {
      // Personalization must never break the feed — fall back to generic angles
      console.error("[trending-ideas] personalization failed, serving generic", err);
      return NextResponse.json({ videos, cachedAt });
    }
  } catch (err) {
    console.error("[trending-ideas]", err);
    return NextResponse.json({ error: "Failed to fetch trending ideas" }, { status: 500 });
  }
}
