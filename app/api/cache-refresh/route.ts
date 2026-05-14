export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { fetchTrendingVideos } from "@/lib/trendingData";
import { fetchNewsItems } from "@/lib/newsData";
import { supabase } from "@/lib/supabase";

async function handler(req: NextRequest) {
  // Auth check — same pattern as /api/bot-post
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch both in parallel
    const [videos, newsItems] = await Promise.all([
      fetchTrendingVideos(),
      fetchNewsItems(),
    ]);

    const now = new Date().toISOString();

    // Upsert both into cached_content
    await Promise.all([
      supabase.from("cached_content").upsert({ key: "trending_videos", data: videos, updated_at: now }),
      supabase.from("cached_content").upsert({ key: "news_items", data: newsItems, updated_at: now }),
    ]);

    console.log(`[cache-refresh] videos: ${videos.length}, news: ${newsItems.length}`);

    return NextResponse.json({ ok: true, videosCount: videos.length, newsCount: newsItems.length });
  } catch (err) {
    console.error("[cache-refresh]", err);
    return NextResponse.json({ error: "Cache refresh failed" }, { status: 500 });
  }
}

export const GET  = handler;
export const POST = handler;
