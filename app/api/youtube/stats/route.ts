import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";


const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "refresh_token",
      refresh_token: refreshToken,
      client_id:     process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");

  // ── Authenticated user: use their verified OAuth channel ──
  if (userId) {
    // Verify the caller is the owner of this data
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user || user.id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: integration } = await supabaseAdmin
      .from("user_integrations")
      .select("*")
      .eq("user_id", userId)
      .eq("platform", "youtube")
      .single();

    if (!integration) return NextResponse.json({ connected: false });

    let accessToken = integration.access_token;

    // Refresh token if expired
    if (new Date(integration.expires_at).getTime() < Date.now() + 5 * 60 * 1000) {
      const newTokens = await refreshAccessToken(integration.refresh_token);
      if (newTokens) {
        accessToken = newTokens.access_token;
        const expiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();
        await supabaseAdmin.from("user_integrations").update({
          access_token: accessToken,
          expires_at:   expiresAt,
          updated_at:   new Date().toISOString(),
        }).eq("user_id", userId).eq("platform", "youtube");
      } else {
        return NextResponse.json({ connected: false, expired: true });
      }
    }

    // Fetch fresh stats
    const channelRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&mine=true",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!channelRes.ok) return NextResponse.json({ connected: false });

    const channelData = await channelRes.json();
    const channel = channelData.items?.[0];
    if (!channel) return NextResponse.json({ connected: false });

    const subscribers = parseInt(channel.statistics?.subscriberCount ?? "0", 10);
    const viewCount   = parseInt(channel.statistics?.viewCount ?? "0", 10);
    const videoCount  = parseInt(channel.statistics?.videoCount ?? "0", 10);

    // Update cached stats in DB
    await supabaseAdmin.from("user_integrations").update({
      subscribers,
      view_count: viewCount,
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId).eq("platform", "youtube");

    return NextResponse.json({
      connected:      true,
      verified:       true,
      subscriberCount: subscribers,
      viewCount,
      videoCount,
      channelTitle:   channel.snippet?.title ?? "",
      thumbnail:      channel.snippet?.thumbnails?.default?.url ?? "",
    });
  }

  // ── No userId: fall back to public API key (for server-side feed display) ──
  const apiKey = process.env.YOUTUBE_API_KEY;
  const handle = process.env.YOUTUBE_CHANNEL_HANDLE ?? "pacosalaz";
  if (!apiKey) return NextResponse.json({ error: "Missing YOUTUBE_API_KEY" }, { status: 500 });

  const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&forHandle=${handle}&key=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: CACHE_TTL / 1000 } });
  if (!res.ok) return NextResponse.json({ error: "YouTube API error" }, { status: 500 });

  const data = await res.json();
  const channel = data.items?.[0];
  if (!channel) return NextResponse.json({ error: "Channel not found" }, { status: 404 });

  return NextResponse.json({
    connected:       false,
    verified:        false,
    subscriberCount: parseInt(channel.statistics?.subscriberCount ?? "0", 10),
    viewCount:       parseInt(channel.statistics?.viewCount ?? "0", 10),
    videoCount:      parseInt(channel.statistics?.videoCount ?? "0", 10),
    channelTitle:    channel.snippet?.title ?? "",
    thumbnail:       channel.snippet?.thumbnails?.default?.url ?? "",
  });
}
