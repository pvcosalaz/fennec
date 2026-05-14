import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") ?? "";
  const state = Buffer.from(userId).toString("base64");
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID ?? "",
    response_type: "code",
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI ?? "https://fennec-pi.vercel.app/api/spotify/callback",
    scope: "user-read-private user-follow-read",
    state,
  });
  return NextResponse.redirect(`https://accounts.spotify.com/authorize?${params}`);
}
