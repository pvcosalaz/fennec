import { NextRequest, NextResponse } from "next/server";
import { iniciarOAuth, respuestaConexion, YOUTUBE_COOKIE } from "@/lib/oauthConnect";

// Kicks off YouTube OAuth. POST (not GET) so the Supabase access token can ride
// in the Authorization header: the userId comes from that token, never from the
// query string. See lib/oauthConnect.ts for the account-takeover this prevents.
export async function POST(req: NextRequest) {
  const sesion = await iniciarOAuth(req);
  if (!sesion.ok) {
    return NextResponse.json({ error: sesion.error }, { status: sesion.status });
  }

  // Only the nonce travels through `state`; the callback takes the userId from
  // the HttpOnly cookie instead, because `state` round-trips through the user.
  const state = Buffer.from(sesion.nonce).toString("base64");

  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri:  process.env.YOUTUBE_REDIRECT_URI ?? "https://fennec-pi.vercel.app/api/youtube/callback",
    response_type: "code",
    scope:         "https://www.googleapis.com/auth/youtube.readonly",
    access_type:   "offline",
    prompt:        "consent",
    state,
  });

  return respuestaConexion(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    YOUTUBE_COOKIE, sesion.nonce, sesion.userId,
  );
}
