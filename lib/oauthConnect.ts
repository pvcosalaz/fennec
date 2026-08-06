// lib/oauthConnect.ts — shared guards for the OAuth connect/callback pairs
// (Google Calendar, YouTube, Spotify).
//
// [SECURITY 2026-08-05] These flows used to read `userId` straight from the
// query string on /connect and echo it through the OAuth `state`, which the
// callback then trusted as the row key when storing the refresh token. That let
// anyone hand a victim a link carrying the ATTACKER's userId: the victim saw a
// genuine Google consent screen, approved it, and their refresh token landed
// under the attacker's account — who could then read the victim's calendar with
// their own perfectly valid session.
//
// The nonce did not close this. An HttpOnly nonce only proves the same browser
// started the flow; it never bound the userId to an authenticated session.
//
// Fix, in two halves:
//   1. /connect is now an authenticated POST. The userId is derived from the
//      Supabase access token, never from user-supplied input, and both the
//      nonce and that userId are written into the HttpOnly cookie.
//   2. /callback reads the userId from THAT COOKIE and ignores whatever the
//      `state` claims. `state` is still checked, but only to match the nonce —
//      it is attacker-reachable data and never decides who owns the token.
//
// SameSite=Lax is deliberate: the callback arrives as a top-level GET redirect
// from the provider, which Lax allows. Strict would drop the cookie and break
// the flow.

import { NextRequest, NextResponse } from "next/server";
import { randomBytes, timingSafeEqual } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/** 10 minutes: long enough to consent, short enough to not linger. */
const COOKIE_MAX_AGE = 600;

// Cookie names live here, not in the route files: a Next.js `route.ts` may only
// export HTTP handlers and a fixed set of config keys, so exporting a constant
// from one breaks the build.
export const GCAL_COOKIE    = "gcal_oauth_nonce";
export const YOUTUBE_COOKIE = "youtube_oauth_nonce";
export const SPOTIFY_COOKIE = "spotify_oauth_nonce";

export type InicioOAuth =
  | { ok: true; userId: string; nonce: string }
  | { ok: false; status: number; error: string };

/**
 * Resolves the caller's Supabase session into a userId and mints a fresh nonce.
 * Callers MUST use the returned userId — never one from the query string.
 */
export async function iniciarOAuth(req: Request): Promise<InicioOAuth> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { ok: false, status: 401, error: "Missing access token" };

  const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !user) return { ok: false, status: 401, error: "Invalid session" };

  return { ok: true, userId: user.id, nonce: randomBytes(16).toString("hex") };
}

/**
 * JSON response carrying the provider URL, with the nonce+userId cookie set.
 * The browser navigates to `url` itself, so this stays a same-origin fetch and
 * the Authorization header actually reaches us (a top-level navigation could
 * never carry one — that is why /connect is no longer a GET redirect).
 */
export function respuestaConexion(
  url: string, cookie: string, nonce: string, userId: string,
): NextResponse {
  const res = NextResponse.json({ url });
  res.cookies.set(cookie, `${nonce}:${userId}`, {
    httpOnly: true, secure: true, sameSite: "lax", maxAge: COOKIE_MAX_AGE, path: "/",
  });
  return res;
}

/** Constant-time compare that tolerates length mismatch without throwing. */
function nonceCoincide(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * The callback's only trusted source of identity.
 *
 * Returns the userId stored in the HttpOnly cookie at /connect time, or null if
 * the cookie is missing/malformed or its nonce does not match the one echoed
 * back through `state`. The userId inside `state` is never read.
 */
export function usuarioDesdeCookie(
  req: NextRequest, cookie: string, state: string,
): string | null {
  const guardado = req.cookies.get(cookie)?.value ?? "";
  const corte = guardado.indexOf(":");
  if (corte === -1) return null;

  const nonceCookie = guardado.slice(0, corte);
  const userId = guardado.slice(corte + 1);
  if (!nonceCookie || !userId) return null;

  // `state` is attacker-reachable: we read ONLY its nonce, to confirm this
  // callback belongs to the flow this browser started.
  let decodificado = "";
  try {
    decodificado = Buffer.from(state, "base64").toString("utf8");
  } catch {
    return null;
  }
  const corteEstado = decodificado.indexOf(":");
  const nonceEstado = corteEstado === -1 ? decodificado : decodificado.slice(0, corteEstado);

  return nonceCoincide(nonceCookie, nonceEstado) ? userId : null;
}
