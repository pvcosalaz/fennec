// Google Calendar OAuth + token helpers. Mirrors the Spotify integration:
// tokens live in user_integrations (platform "google_calendar"), refreshed on
// demand. Read-only scope — Fennec shows your Google events inside its content
// calendar, it never writes to Google.
//
// Requires (env, server-side unless noted):
//   NEXT_PUBLIC_GOOGLE_CLIENT_ID   — also the flag that reveals the Connect UI
//   GOOGLE_CLIENT_SECRET
//   GOOGLE_REDIRECT_URI            — e.g. https://app.fennec.audio/api/gcal/callback
// See docs/google-calendar-setup.md for the Google Cloud Console steps.

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const GCAL_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
export const GCAL_PLATFORM = "google_calendar";

export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
export const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ?? "https://app.fennec.audio/api/gcal/callback";

/** True only when the server is fully configured to run the OAuth exchange. */
export function gcalConfigured(): boolean {
  return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

/** Exchange an authorization code for tokens. */
export async function exchangeCode(code: string): Promise<TokenResponse | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) return null;
  return (await res.json()) as TokenResponse;
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  return (await res.json()) as TokenResponse;
}

/**
 * Returns a valid access token for the user, refreshing if it's within 5 min
 * of expiry. Null when not connected or the refresh fails (treat as disconnected).
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const admin = getSupabaseAdmin();
  const { data: integration } = await admin
    .from("user_integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("platform", GCAL_PLATFORM)
    .single();

  if (!integration) return null;

  if (new Date(integration.expires_at).getTime() > Date.now() + 5 * 60 * 1000) {
    return integration.access_token as string;
  }

  const refreshed = await refreshAccessToken(integration.refresh_token as string);
  if (!refreshed) return null;

  const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  await admin
    .from("user_integrations")
    .update({
      access_token: refreshed.access_token,
      expires_at: expiresAt,
      ...(refreshed.refresh_token && { refresh_token: refreshed.refresh_token }),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("platform", GCAL_PLATFORM);

  return refreshed.access_token;
}

export type GCalEvent = {
  id: string;
  title: string;
  /** YYYY-MM-DD (local day of the event start) */
  day: string;
  /** HH:MM or null for all-day events */
  time: string | null;
  allDay: boolean;
};

/** Fetch events between two ISO instants from the user's primary calendar. */
export async function fetchEvents(
  accessToken: string,
  timeMinIso: string,
  timeMaxIso: string,
): Promise<GCalEvent[]> {
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", timeMinIso);
  url.searchParams.set("timeMax", timeMaxIso);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "250");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    items?: {
      id: string;
      summary?: string;
      start?: { date?: string; dateTime?: string };
    }[];
  };

  return (data.items ?? []).map((e) => {
    const dateTime = e.start?.dateTime;
    const dateOnly = e.start?.date;
    if (dateOnly) {
      return { id: e.id, title: e.summary ?? "(no title)", day: dateOnly, time: null, allDay: true };
    }
    const d = new Date(dateTime ?? Date.now());
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    return { id: e.id, title: e.summary ?? "(no title)", day, time, allDay: false };
  });
}
