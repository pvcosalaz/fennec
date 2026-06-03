import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") ?? "";

  // Generate a random nonce to prevent CSRF attacks on the OAuth callback
  const nonce = randomBytes(16).toString("hex");

  // State encodes nonce + userId — nonce is verified on callback via HttpOnly cookie
  const state = Buffer.from(`${nonce}:${userId}`).toString("base64");

  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri:  process.env.YOUTUBE_REDIRECT_URI ?? "https://fennec-pi.vercel.app/api/youtube/callback",
    response_type: "code",
    scope:         "https://www.googleapis.com/auth/youtube.readonly",
    access_type:   "offline",
    prompt:        "consent",
    state,
  });

  const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);

  // HttpOnly cookie holds the nonce — expires in 10 min
  response.cookies.set("youtube_oauth_nonce", nonce, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
