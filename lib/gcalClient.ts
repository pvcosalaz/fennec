"use client";
// Client-side helpers for the Google Calendar integration. The Connect UI only
// appears when NEXT_PUBLIC_GOOGLE_CLIENT_ID is set, so nothing shows a dead
// button before the OAuth app is configured (Paco has to create the creds).
import { supabase } from "@/lib/supabase";
import type { GCalEvent } from "@/lib/googleCalendar";

export const GCAL_ENABLED = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

export function connectGoogleCalendar(userId: string) {
  window.location.href = `/api/gcal/connect?userId=${encodeURIComponent(userId)}`;
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
