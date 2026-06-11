// lib/track.ts — lightweight user activity tracking for the CRM (/admin).
// Fire-and-forget: analytics must never break or slow down the app, so every
// call swallows errors (including "table does not exist" before the
// 20260610_user_events migration has been run).

import { supabase } from "@/lib/supabase";

let sessionLogged = false;

export async function track(type: string, meta: Record<string, unknown> = {}): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("user_events").insert({ user_id: user.id, type, meta });
  } catch {
    // never surface analytics failures
  }
}

/** Logs session_start once per page load (call freely on auth events). */
export function trackSessionStart(): void {
  if (sessionLogged) return;
  sessionLogged = true;
  void track("session_start");
}
