export const dynamic = "force-dynamic";
export const maxDuration = 60; // Apify scrapes take 15-25s; the default 10s kills the function mid-scrape

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import { scrapeSocialStats, normalizeHandles, hasApifyToken } from "@/lib/socialStats";

// Each Apify scrape costs money and takes 15-25s. The dashboard auto-fires
// this on mount (and remounts on every tab switch), so without a cooldown a
// single session could trigger dozens of paid scrapes. Skip re-scraping if
// we synced within this window; the manual refresh button passes ?force=1.
const COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours

export async function POST(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const force  = req.nextUrl.searchParams.get("force") === "1";
  if (!userId) return NextResponse.json({ error: "no userId" }, { status: 400 });

  // Auth check — use getUser with the bearer token
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return NextResponse.json({ error: "No auth token" }, { status: 401 });
  }

  const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized", detail: authError?.message }, { status: 401 });
  }
  if (user.id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get handles + last-sync + current counts from profile
  const { data: profile, error: profileError } = await getSupabaseAdmin()
    .from("profiles")
    .select("instagram, tiktok, youtube_url, social_synced_at, ig_followers, tiktok_followers, yt_subscribers")
    .eq("id", userId)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found", detail: profileError?.message }, { status: 404 });
  }

  // Cooldown: if we synced recently, return the stored counts and skip the
  // paid scrape entirely. The manual refresh button overrides with ?force=1.
  if (!force && profile.social_synced_at) {
    const age = Date.now() - new Date(profile.social_synced_at).getTime();
    if (age < COOLDOWN_MS) {
      return NextResponse.json({
        ig_followers:     profile.ig_followers     ?? null,
        tiktok_followers: profile.tiktok_followers ?? null,
        yt_subscribers:   profile.yt_subscribers   ?? null,
        synced_at: profile.social_synced_at,
        cached: true,
      });
    }
  }

  const { igHandle, ttHandle, ytHandle } = normalizeHandles(profile);

  // No handles saved → nothing to scrape
  if (!igHandle && !ttHandle && !ytHandle) {
    return NextResponse.json({
      ig_followers: null, tiktok_followers: null, yt_subscribers: null,
      synced_at: new Date().toISOString(),
      error: "no_handles",
    });
  }

  // Apify token not configured on this environment
  if (!hasApifyToken()) {
    console.error("[social-stats] APIFY_API_TOKEN not set");
    return NextResponse.json({
      ig_followers: null, tiktok_followers: null, yt_subscribers: null,
      synced_at: new Date().toISOString(),
      error: "apify_not_configured",
    });
  }

  const stats = await scrapeSocialStats(profile);
  const syncedAt = new Date().toISOString();

  // Only persist platforms that actually returned data (never overwrite good
  // counts with nulls from a failed scrape). But ALWAYS stamp social_synced_at,
  // even when everything failed, so the cooldown throttles repeated failures
  // instead of letting them re-scrape on every dashboard mount.
  const update: Record<string, number | string> = { social_synced_at: syncedAt };
  if (stats.ig_followers     != null) update.ig_followers     = stats.ig_followers;
  if (stats.tiktok_followers != null) update.tiktok_followers = stats.tiktok_followers;
  if (stats.yt_subscribers   != null) update.yt_subscribers   = stats.yt_subscribers;
  const { error: updateError } = await getSupabaseAdmin().from("profiles").update(update).eq("id", userId);
  if (updateError) console.error("[social-stats] DB update error:", updateError.message);

  return NextResponse.json({ ...stats, synced_at: syncedAt });
}
