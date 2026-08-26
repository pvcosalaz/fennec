"use client";
// Client-side helpers for the Google Calendar integration. The Connect UI only
// appears when NEXT_PUBLIC_GOOGLE_CLIENT_ID is set, so nothing shows a dead
// button before the OAuth app is configured (Paco has to create the creds).
import { supabase } from "@/lib/supabase";
import type { GCalEvent } from "@/lib/googleCalendar";

export const GCAL_ENABLED = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

/**
 * Starts the Google Calendar OAuth flow.
 *
 * [SECURITY 2026-08-05] Two steps instead of one navigation: /connect is an
 * authenticated POST that returns the provider URL, and only then do we
 * navigate. A top-level navigation cannot carry an Authorization header, and
 * without one the server had to trust a userId from the query string — which
 * let an attacker capture someone else's calendar tokens. Identity now comes
 * from the session; nothing about the account travels through the URL.
 */
export async function connectGoogleCalendar(): Promise<{ ok: boolean; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, error: "not-signed-in" };

  const res = await fetch("/api/gcal/connect", {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!res.ok) return { ok: false, error: `http-${res.status}` };

  const { url } = (await res.json()) as { url?: string };
  if (!url) return { ok: false, error: "no-url" };

  window.location.href = url;
  return { ok: true };
}

export async function disconnectGoogleCalendar(userId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  await fetch(`/api/gcal/disconnect?userId=${encodeURIComponent(userId)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
}

/** Events in [timeMin, timeMax]; `connected:false` means not linked yet. */
export async function fetchGCalEvents(
  userId: string, timeMinIso: string, timeMaxIso: string,
): Promise<{ connected: boolean; events: GCalEvent[] }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { connected: false, events: [] };
  const params = new URLSearchParams({ userId, timeMin: timeMinIso, timeMax: timeMaxIso });
  const res = await fetch(`/api/gcal/events?${params}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!res.ok) return { connected: false, events: [] };
  return (await res.json()) as { connected: boolean; events: GCalEvent[] };
}

/** Empuja (o retira) el espejo de un evento del artista. Fire-and-forget desde
 *  la UI: sin conexion devuelve {connected:false} y no pasa nada. */
export async function syncEventToGcal(
  body:
    | { action: "upsert"; gcalId?: string | null; title: string; day: string; description?: string }
    | { action: "delete"; gcalId: string },
): Promise<{ connected: boolean; gcalId?: string | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { connected: false };
  const res = await fetch("/api/gcal/sync", {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return { connected: false };
  return (await res.json()) as { connected: boolean; gcalId?: string | null };
}
