import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") ?? "";

  // Generate a random nonce to prevent CSRF on the OAuth callback
  const nonce = randomBytes(16).toString("hex");

  // State encodes nonce + userId — nonce is verified on callback via HttpOnly cookie
  const state = Buffer.from(`${nonce}:${userId}`).toString("base64");

  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID ?? "",
    response_type: "code",
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI ?? "https://fennec-pi.vercel.app/api/spotify/callback",
    scope: "user-read-private user-follow-read",
    state,
  });

  const response = NextResponse.redirect(`https://accounts.spotify.com/authorize?${params}`);

  // HttpOnly cookie holds the nonce — expires in 10 min
  response.cookies.set("spotify_oauth_nonce", nonce, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
