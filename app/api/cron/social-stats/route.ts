export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300; // up to 5 min (Vercel Pro) — scraping is slow

import { supabaseAdmin } from "@/lib/supabaseAdmin";
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
  const { data: profiles, error } = await supabaseAdmin
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
        // If every platform came back null, skip the write — keep last known values.
        if (
          stats.ig_followers == null &&
          stats.tiktok_followers == null &&
          stats.yt_subscribers == null
        ) {
          skipped++;
          return;
        }
        const { error: upErr } = await supabaseAdmin
          .from("profiles")
          .update({
            ig_followers:     stats.ig_followers,
            tiktok_followers: stats.tiktok_followers,
            yt_subscribers:   stats.yt_subscribers,
            social_synced_at: new Date().toISOString(),
          })
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
