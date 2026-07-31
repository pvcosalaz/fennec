import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI, GCAL_SCOPE, gcalConfigured } from "@/lib/googleCalendar";

const APP = "https://app.fennec.audio";

// Kicks off Google OAuth. Same CSRF pattern as Spotify: a random nonce lives in
// an HttpOnly cookie and is echoed (with the userId) through `state`.
export async function GET(req: NextRequest) {
  if (!gcalConfigured()) {
    return NextResponse.redirect(`${APP}/?gcal=unconfigured`);
  }
  const userId = req.nextUrl.searchParams.get("userId") ?? "";
  if (!userId) return NextResponse.redirect(`${APP}/?gcal=error`);

  const nonce = randomBytes(16).toString("hex");
  const state = Buffer.from(`${nonce}:${userId}`).toString("base64");

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: GCAL_SCOPE,
    access_type: "offline",   // ask for a refresh_token
    prompt: "consent",        // force it even on re-consent
    include_granted_scopes: "true",
    state,
  });

  const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  response.cookies.set("gcal_oauth_nonce", nonce, {
    httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/",
  });
  return response;
}
