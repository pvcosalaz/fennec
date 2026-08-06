import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import { usuarioDesdeCookie, SPOTIFY_COOKIE } from "@/lib/oauthConnect";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state") ?? "";
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect("https://fennec-pi.vercel.app/?spotify=error");
  }

  // Identity comes from the HttpOnly cookie written at /connect (which required
  // a valid Supabase token). `state` only proves this callback belongs to the
  // flow this browser started — it never decides whose tokens these are.
  const userId = usuarioDesdeCookie(req, SPOTIFY_COOKIE, state);
  if (!userId) {
    return NextResponse.redirect("https://fennec-pi.vercel.app/?spotify=error");
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI ?? "https://fennec-pi.vercel.app/api/spotify/callback",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect("https://fennec-pi.vercel.app/?spotify=error");
  }

  const tokens = await tokenRes.json();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await getSupabaseAdmin().from("user_integrations").upsert({
    user_id: userId,
    platform: "spotify",
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,platform" });

  // Clear the nonce cookie after successful use
  const response = NextResponse.redirect("https://fennec-pi.vercel.app/?spotify=connected");
  response.cookies.delete(SPOTIFY_COOKIE);
  return response;
}
