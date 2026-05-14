import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Requires SUPABASE_SERVICE_ROLE_KEY env var to bypass RLS for server-side reads
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "no userId" }, { status: 400 });

  const { data: integration } = await supabaseAdmin
    .from("user_integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("platform", "spotify")
    .single();

  if (!integration) return NextResponse.json({ connected: false });

  let accessToken = integration.access_token;

  // Refresh if expired (with 5 min buffer)
  if (new Date(integration.expires_at).getTime() < Date.now() + 5 * 60 * 1000) {
    const newTokens = await refreshAccessToken(integration.refresh_token);
    if (newTokens) {
      accessToken = newTokens.access_token;
      const expiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();
      await supabaseAdmin.from("user_integrations").update({
        access_token: accessToken,
        expires_at: expiresAt,
        ...(newTokens.refresh_token && { refresh_token: newTokens.refresh_token }),
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId).eq("platform", "spotify");
    } else {
      // Token refresh failed — treat as disconnected
      return NextResponse.json({ connected: false, expired: true });
    }
  }

  // Fetch Spotify profile
  const profileRes = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileRes.ok) return NextResponse.json({ connected: false });

  const profile = await profileRes.json();

  return NextResponse.json({
    connected: true,
    followers: profile.followers?.total ?? 0,
    displayName: profile.display_name,
    imageUrl: profile.images?.[0]?.url ?? null,
  });
}
