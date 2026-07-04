export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300; // up to 5 min (Vercel Pro) — scraping is slow

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import { scrapeSocialStats, hasApifyToken } from "@/lib/socialStats";


const BATCH_SIZE = 3;        // profiles scraped concurrently
const MAX_PROFILES = 60;     // hard cap per run
const TIME_BUDGET_MS = 250_000; // stop starting new batches after ~250s

async function handler(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasApifyToken()) {
    console.error("[cron/social-stats] APIFY_API_TOKEN not set");
    return NextResponse.json({ error: "apify_not_configured" }, { status: 500 });
  }

  // Profiles with at least one social handle, stalest first so everyone
  // eventually gets refreshed even if we hit the per-run cap.
  const { data: profiles, error } = await getSupabaseAdmin()
    .from("profiles")
    .select("id, instagram, tiktok, youtube_url, social_synced_at")
    .or("instagram.not.is.null,tiktok.not.is.null,youtube_url.not.is.null")
    .order("social_synced_at", { ascending: true, nullsFirst: true })
    .limit(MAX_PROFILES);

  if (error) {
    console.error("[cron/social-stats] query error:", error.message);
    return NextResponse.json({ error: "query_failed", detail: error.message }, { status: 500 });
  }

  const list = profiles ?? [];
  const start = Date.now();
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < list.length; i += BATCH_SIZE) {
    if (Date.now() - start > TIME_BUDGET_MS) {
      console.warn(`[cron/social-stats] time budget hit, stopping at ${i}/${list.length}`);
      break;
    }
    const batch = list.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (p) => {
        const stats = await scrapeSocialStats(p);
        // Persist ONLY the platforms that actually returned data. TikTok's
        // Apify scraper (clockworks) fails far more often than Instagram's,
        // so the old per-column write kept stamping tiktok_followers = null
        // over a good value whenever IG succeeded but TikTok failed — that's
        // the "TikTok keeps disconnecting" bug. Build from non-null fields only.
        const update: Record<string, number | string> = {};
        if (stats.ig_followers     != null) update.ig_followers     = stats.ig_followers;
        if (stats.tiktok_followers != null) update.tiktok_followers = stats.tiktok_followers;
        if (stats.yt_subscribers   != null) update.yt_subscribers   = stats.yt_subscribers;
        if (Object.keys(update).length === 0) {
          skipped++; // every platform failed — keep last known values
          return;
        }
        update.social_synced_at = new Date().toISOString();
        const { error: upErr } = await getSupabaseAdmin()
          .from("profiles")
          .update(update)
          .eq("id", p.id);
        if (upErr) {
          console.error(`[cron/social-stats] update ${p.id} failed:`, upErr.message);
          skipped++;
        } else {
          updated++;
        }
      })
    );
  }

  console.log(`[cron/social-stats] done — ${updated} updated, ${skipped} skipped of ${list.length}`);
  return NextResponse.json({ ok: true, total: list.length, updated, skipped });
}

export const GET = handler;
export const POST = handler;
