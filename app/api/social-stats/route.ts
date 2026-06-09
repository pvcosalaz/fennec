import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://drmhwzxytwmkpfnjwmra.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const APIFY_TOKEN = process.env.APIFY_API_TOKEN ?? "";

async function callApify(actorId: string, input: object): Promise<any[]> {
  if (!APIFY_TOKEN) return [];
  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=60&memory=256`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "no userId" }, { status: 400 });

  // Auth check
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user || user.id !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get handles from profile
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("instagram, tiktok, youtube_url")
    .eq("id", userId)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const igHandle = profile.instagram?.replace(/^@/, "").trim();
  const ttHandle = profile.tiktok?.replace(/^@/, "").trim();
  // youtube_url can be "@handle" or full URL — extract handle
  const ytRaw = profile.youtube_url ?? "";
  const ytHandle = ytRaw.startsWith("http")
    ? ytRaw.split("@").pop()?.split("/")[0]
    : ytRaw.replace(/^@/, "").trim();

  // Run all scrapers in parallel
  const [igResult, ttResult, ytResult] = await Promise.allSettled([
    igHandle
      ? callApify("apify~instagram-profile-scraper", { usernames: [igHandle] })
      : Promise.resolve([]),
    ttHandle
      ? callApify("clockworks~tiktok-profile-scraper", { profiles: [ttHandle], resultsPerPage: 1 })
      : Promise.resolve([]),
    ytHandle
      ? callApify("streamers~youtube-channel-scraper", {
          startUrls: [{ url: `https://www.youtube.com/@${ytHandle}` }],
          maxResults: 1,
        })
      : Promise.resolve([]),
  ]);

  const igFollowers =
    igResult.status === "fulfilled" ? (igResult.value[0]?.followersCount ?? null) : null;
  const ttFollowers =
    ttResult.status === "fulfilled" ? (ttResult.value[0]?.authorMeta?.fans ?? null) : null;
  const ytSubs =
    ytResult.status === "fulfilled"
      ? (ytResult.value[0]?.aboutChannelInfo?.numberOfSubscribers ??
         ytResult.value[0]?.numberOfSubscribers ?? null)
      : null;

  const syncedAt = new Date().toISOString();

  // Persist to profiles table
  await supabaseAdmin.from("profiles").update({
    ig_followers: igFollowers,
    tiktok_followers: ttFollowers,
    yt_subscribers: ytSubs,
    social_synced_at: syncedAt,
  }).eq("id", userId);

  return NextResponse.json({
    ig_followers: igFollowers,
    tiktok_followers: ttFollowers,
    yt_subscribers: ytSubs,
    synced_at: syncedAt,
  });
}
