export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { fetchTrendingVideos } from "@/lib/trendingData";
import { fetchNewsItems } from "@/lib/newsData";
import { supabase } from "@/lib/supabase";
import { createNotification, fetchAllPushSubscriptions, deletePushSubscription } from "@/lib/notificationDb";
import { generateNotificationCopy } from "@/lib/notificationCopy";
import { sendPushToMany } from "@/lib/pushSend";

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

    // Upsert both into cached_content. MUST be the admin client: the table
    // is RLS-protected and the anon client's upserts failed silently — the
    // cache sat frozen at 2026-06-02 while this cron "succeeded" daily.
    const admin = getSupabaseAdmin();
    const [vRes, nRes] = await Promise.all([
      admin.from("cached_content").upsert({ key: "trending_videos", data: videos, updated_at: now }),
      admin.from("cached_content").upsert({ key: "news_items", data: newsItems, updated_at: now }),
    ]);
    if (vRes.error) console.error("[cache-refresh] videos upsert failed:", vRes.error.message);
    if (nRes.error) console.error("[cache-refresh] news upsert failed:", nRes.error.message);

    console.log(`[cache-refresh] videos: ${videos.length}, news: ${newsItems.length}`);

    // Send industry_news notification for the top new item
    try {
      const serviceSupabase = getSupabaseAdmin();
      if (newsItems.length > 0) {
        const item = newsItems[0];
        const title = await generateNotificationCopy({
          type: "industry_news",
          newsHeadline: item.headline,
        });
        const { data: users } = await serviceSupabase
          .from("notification_preferences")
          .select("user_id")
          .eq("industry_news", true);
        for (const u of users ?? []) {
          await createNotification({
            userId: u.user_id,
            type: "industry_news",
            title,
            body: item.headline,
            db: getSupabaseAdmin(),
          });
        }
        const allSubs = await fetchAllPushSubscriptions(getSupabaseAdmin());
        const enabledUserIds = new Set((users ?? []).map((u: { user_id: string }) => u.user_id));
        const subs = allSubs.filter((s) => enabledUserIds.has(s.user_id));
        await sendPushToMany(subs, { title, type: "industry_news" }, (endpoint) =>
          deletePushSubscription(endpoint, getSupabaseAdmin())
        );
      }
    } catch (err) {
      console.error("[industry_news notification]", err);
    }

    return NextResponse.json({ ok: true, videosCount: videos.length, newsCount: newsItems.length });
  } catch (err) {
    console.error("[cache-refresh]", err);
    return NextResponse.json({ error: "Cache refresh failed" }, { status: 500 });
  }
}

export const GET  = handler;
export const POST = handler;
