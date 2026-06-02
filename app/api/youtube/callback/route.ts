import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://drmhwzxytwmkpfnjwmra.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BASE_URL = "https://fennec-pi.vercel.app";

export async function GET(req: NextRequest) {
  const code  = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state") ?? "";
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${BASE_URL}/?youtube=error`);
  }

  const userId = Buffer.from(state, "base64").toString("utf8");

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri:  process.env.YOUTUBE_REDIRECT_URI ?? `${BASE_URL}/api/youtube/callback`,
      grant_type:    "authorization_code",
    }),
  });

  if (!tokenRes.ok) return NextResponse.redirect(`${BASE_URL}/?youtube=error`);

  const tokens = await tokenRes.json();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  // Fetch the user's YouTube channel
  const channelRes = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&mine=true",
    { headers: { Authorization: `Bearer ${tokens.access_token}` } }
  );

  if (!channelRes.ok) return NextResponse.redirect(`${BASE_URL}/?youtube=error`);

  const channelData = await channelRes.json();
  const channel = channelData.items?.[0];
  if (!channel) return NextResponse.redirect(`${BASE_URL}/?youtube=error`);

  const channelId    = channel.id;
  const channelTitle = channel.snippet?.title ?? "";
  const thumbnail    = channel.snippet?.thumbnails?.default?.url ?? "";
  const subscribers  = parseInt(channel.statistics?.subscriberCount ?? "0", 10);
  const viewCount    = parseInt(channel.statistics?.viewCount ?? "0", 10);

  // Save integration + channel info
  await supabaseAdmin.from("user_integrations").upsert({
    user_id:        userId,
    platform:       "youtube",
    access_token:   tokens.access_token,
    refresh_token:  tokens.refresh_token ?? "",
    expires_at:     expiresAt,
    channel_id:     channelId,
    channel_title:  channelTitle,
    thumbnail:      thumbnail,
    subscribers,
    view_count:     viewCount,
    updated_at:     new Date().toISOString(),
  }, { onConflict: "user_id,platform" });

  return NextResponse.redirect(`${BASE_URL}/?youtube=connected`);
}
