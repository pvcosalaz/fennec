import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { exchangeCode, GCAL_PLATFORM } from "@/lib/googleCalendar";

const APP = "https://app.fennec.audio";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state") ?? "";
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code) return NextResponse.redirect(`${APP}/?gcal=error`);

  const decoded = Buffer.from(state, "base64").toString("utf8");
  const colon = decoded.indexOf(":");
  const nonce = colon !== -1 ? decoded.slice(0, colon) : "";
  const userId = colon !== -1 ? decoded.slice(colon + 1) : "";

  // Verify CSRF nonce against the HttpOnly cookie
  const cookieNonce = req.cookies.get("gcal_oauth_nonce")?.value ?? "";
  if (!nonce || !cookieNonce || nonce !== cookieNonce || !userId) {
    return NextResponse.redirect(`${APP}/?gcal=error`);
  }

  const tokens = await exchangeCode(code);
  if (!tokens?.refresh_token) {
    // No refresh_token means we can't stay connected — send them back to retry
    // (prompt=consent should always yield one, but be defensive).
    return NextResponse.redirect(`${APP}/?gcal=error`);
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  await getSupabaseAdmin().from("user_integrations").upsert(
    {
      user_id: userId,
      platform: GCAL_PLATFORM,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,platform" },
  );

  const response = NextResponse.redirect(`${APP}/?gcal=connected`);
  response.cookies.delete("gcal_oauth_nonce");
  return response;
}
