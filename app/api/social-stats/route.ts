import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://drmhwzxytwmkpfnjwmra.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const APIFY_TOKEN = process.env.APIFY_API_TOKEN ?? "";

async function callApify(actorId: string, input: object, label: string): Promise<any[]> {
  if (!APIFY_TOKEN) {
    console.error("[social-stats] APIFY_API_TOKEN not set");
    return [];
  }
  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=45&memory=256`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 28_000); // abort before Render kills us
  try {
    console.log(`[social-stats] calling ${label}...`);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[social-stats] ${label} failed ${res.status}:`, text.slice(0, 200));
      return [];
    }
    const data = await res.json();
    console.log(`[social-stats] ${label} OK — ${data.length} items`);
    return data;
  } catch (err: any) {
    clearTimeout(timer);
    console.error(`[social-stats] ${label} error:`, err?.message ?? err);
    return [];
  }
}

export async function POST(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "no userId" }, { status: 400 });

  console.log("[social-stats] POST for userId:", userId);

  // Auth check — use getUser with the bearer token
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    console.error("[social-stats] No auth token provided");
    return NextResponse.json({ error: "No auth token" }, { status: 401 });
  }

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    console.error("[social-stats] Auth failed:", authError?.message);
    return NextResponse.json({ error: "Unauthorized", detail: authError?.message }, { status: 401 });
  }
  if (user.id !== userId) {
    console.error("[social-stats] userId mismatch");
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get handles from profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("instagram, tiktok, youtube_url")
    .eq("id", userId)
    .single();

  if (!profile) {
    console.error("[social-stats] Profile not found:", profileError?.message);
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const igHandle = profile.instagram?.replace(/^@/, "").trim() || null;
  const ttHandle = profile.tiktok?.replace(/^@/, "").trim() || null;
  const ytRaw    = profile.youtube_url ?? "";
  const ytHandle = ytRaw
    ? (ytRaw.startsWith("http")
        ? ytRaw.split("@").pop()?.split("/")[0] ?? null
        : ytRaw.replace(/^@/, "").trim() || null)
    : null;

  console.log("[social-stats] handles →", { igHandle, ttHandle, ytHandle });

  // If all handles null, return early with debug info
  if (!igHandle && !ttHandle && !ytHandle) {
    return NextResponse.json({
      ig_followers: null, tiktok_followers: null, yt_subscribers: null,
      synced_at: new Date().toISOString(),
      _debug: "all handles null in profile",
    });
  }

  // If token missing, return debug info
  if (!APIFY_TOKEN) {
    return NextResponse.json({
      ig_followers: null, tiktok_followers: null, yt_subscribers: null,
      synced_at: new Date().toISOString(),
      _debug: "APIFY_API_TOKEN not set",
    });
  }

  // Run scrapers in parallel
  const [igResult, ttResult, ytResult] = await Promise.allSettled([
    igHandle
      ? callApify("apify~instagram-profile-scraper", { usernames: [igHandle] }, "Instagram")
      : Promise.resolve([]),
    ttHandle
      ? callApify("clockworks~tiktok-profile-scraper", { profiles: [ttHandle], resultsPerPage: 1 }, "TikTok")
      : Promise.resolve([]),
    ytHandle
      ? callApify("streamers~youtube-channel-scraper", {
          startUrls: [{ url: `https://www.youtube.com/@${ytHandle}` }],
          maxResults: 1,
        }, "YouTube")
      : Promise.resolve([]),
  ]);

  const igFollowers = igResult.status === "fulfilled" ? (igResult.value[0]?.followersCount ?? null) : null;
  const ttFollowers = ttResult.status === "fulfilled" ? (ttResult.value[0]?.authorMeta?.fans ?? null) : null;
  const ytSubs      = ytResult.status === "fulfilled"
    ? (ytResult.value[0]?.aboutChannelInfo?.numberOfSubscribers ?? ytResult.value[0]?.numberOfSubscribers ?? null)
    : null;

  console.log("[social-stats] results →", { igFollowers, ttFollowers, ytSubs });

  const syncedAt = new Date().toISOString();

  const { error: updateError } = await supabaseAdmin.from("profiles").update({
    ig_followers:      igFollowers,
    tiktok_followers:  ttFollowers,
    yt_subscribers:    ytSubs,
    social_synced_at:  syncedAt,
  }).eq("id", userId);

  if (updateError) console.error("[social-stats] DB update error:", updateError.message);

  return NextResponse.json({
    ig_followers: igFollowers,
    tiktok_followers: ttFollowers,
    yt_subscribers: ytSubs,
    synced_at: syncedAt,
    _debug: { handles: { igHandle, ttHandle, ytHandle }, hasToken: !!APIFY_TOKEN },
  });
}
