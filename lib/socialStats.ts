// lib/socialStats.ts
// Shared social-stats scraping via Apify. Used by:
//   - app/api/social-stats/route.ts   (manual refresh, one user)
//   - app/api/cron/social-stats/route.ts (weekly cron, all users)

const APIFY_TOKEN = process.env.APIFY_API_TOKEN ?? "";

export function hasApifyToken(): boolean {
  return !!APIFY_TOKEN;
}

export type SocialHandlesInput = {
  instagram?: string | null;
  tiktok?: string | null;
  youtube_url?: string | null;
};

export type NormalizedHandles = {
  igHandle: string | null;
  ttHandle: string | null;
  ytHandle: string | null;
};

export type SocialStats = {
  ig_followers: number | null;
  tiktok_followers: number | null;
  yt_subscribers: number | null;
};

/** Strip @, trim, and parse a YouTube URL down to its @handle. */
export function normalizeHandles(profile: SocialHandlesInput): NormalizedHandles {
  const igHandle = profile.instagram?.replace(/^@/, "").trim() || null;
  const ttHandle = profile.tiktok?.replace(/^@/, "").trim() || null;
  const ytRaw = profile.youtube_url ?? "";
  const ytHandle = ytRaw
    ? ytRaw.startsWith("http")
      ? ytRaw.split("@").pop()?.split("/")[0] ?? null
      : ytRaw.replace(/^@/, "").trim() || null
    : null;
  return { igHandle, ttHandle, ytHandle };
}

async function callApify(actorId: string, input: object, label: string): Promise<any[]> {
  if (!APIFY_TOKEN) {
    console.error("[social-stats] APIFY_API_TOKEN not set");
    return [];
  }
  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=45&memory=256`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 28_000); // abort before the platform kills us
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

/**
 * Scrape Instagram / TikTok / YouTube follower counts for one profile.
 * Runs the three Apify actors in parallel. A platform with no handle, or
 * a failed/timed-out scrape, comes back as null (caller decides whether to
 * keep the previous value).
 */
export async function scrapeSocialStats(profile: SocialHandlesInput): Promise<SocialStats> {
  const { igHandle, ttHandle, ytHandle } = normalizeHandles(profile);

  const [igResult, ttResult, ytResult] = await Promise.allSettled([
    igHandle
      ? callApify("apify~instagram-profile-scraper", { usernames: [igHandle] }, "Instagram")
      : Promise.resolve([]),
    ttHandle
      ? callApify("clockworks~tiktok-profile-scraper", { profiles: [ttHandle], resultsPerPage: 1 }, "TikTok")
      : Promise.resolve([]),
    ytHandle
      ? callApify(
          "streamers~youtube-channel-scraper",
          { startUrls: [{ url: `https://www.youtube.com/@${ytHandle}` }], maxResults: 1 },
          "YouTube"
        )
      : Promise.resolve([]),
  ]);

  const ig_followers =
    igResult.status === "fulfilled" ? igResult.value[0]?.followersCount ?? null : null;
  const tiktok_followers =
    ttResult.status === "fulfilled" ? ttResult.value[0]?.authorMeta?.fans ?? null : null;
  const yt_subscribers =
    ytResult.status === "fulfilled"
      ? ytResult.value[0]?.aboutChannelInfo?.numberOfSubscribers ??
        ytResult.value[0]?.numberOfSubscribers ??
        null
      : null;

  return { ig_followers, tiktok_followers, yt_subscribers };
}
