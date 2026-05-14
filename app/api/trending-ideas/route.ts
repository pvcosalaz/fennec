export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { fetchTrendingVideos } from "@/lib/trendingData";
import { supabase } from "@/lib/supabase";

export type { TrendingVideo } from "@/lib/trendingData";

const CACHE_KEY = "trending_videos";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export async function GET() {
  try {
    // Check Supabase cache first
    const { data: cached } = await supabase
      .from("cached_content")
      .select("data, updated_at")
      .eq("key", CACHE_KEY)
      .single();

    if (cached) {
      const age = Date.now() - new Date(cached.updated_at).getTime();
      if (age < CACHE_TTL_MS) {
        console.log("[trending-ideas] serving from cache");
        return NextResponse.json({ videos: cached.data, cachedAt: new Date(cached.updated_at).getTime() });
      }
    }

    // Cache stale or missing — fetch fresh data
    const videos = await fetchTrendingVideos();

    // Save to cache (best-effort, don't fail if upsert errors)
    if (videos.length > 0) {
      await supabase
        .from("cached_content")
        .upsert({ key: CACHE_KEY, data: videos, updated_at: new Date().toISOString() });
    }

    return NextResponse.json({ videos, cachedAt: Date.now() });
  } catch (err) {
    console.error("[trending-ideas]", err);
    return NextResponse.json({ error: "Failed to fetch trending ideas" }, { status: 500 });
  }
}
