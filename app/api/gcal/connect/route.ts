import { NextRequest, NextResponse } from "next/server";
import { GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI, GCAL_SCOPE, gcalConfigured } from "@/lib/googleCalendar";
import { iniciarOAuth, respuestaConexion, GCAL_COOKIE } from "@/lib/oauthConnect";

// Kicks off Google OAuth. POST (not GET) so the Supabase access token can ride
// in the Authorization header: the userId comes from that token, never from the
// query string. See lib/oauthConnect.ts for the account-takeover this prevents.
export async function POST(req: NextRequest) {
  // Auth first, config second: an anonymous caller shouldn't learn whether the
  // integration is set up on this deploy.
  const sesion = await iniciarOAuth(req);
  if (!sesion.ok) {
    return NextResponse.json({ error: sesion.error }, { status: sesion.status });
  }

  if (!gcalConfigured()) {
    return NextResponse.json({ error: "Google Calendar is not configured" }, { status: 503 });
  }

  // Only the nonce travels through `state`; the callback takes the userId from
  // the HttpOnly cookie instead, because `state` round-trips through the user.
  const state = Buffer.from(sesion.nonce).toString("base64");

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

  return respuestaConexion(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    GCAL_COOKIE, sesion.nonce, sesion.userId,
  );
}
