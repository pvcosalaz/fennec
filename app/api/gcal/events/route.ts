import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getValidAccessToken, fetchEvents } from "@/lib/googleCalendar";

// Returns the user's Google Calendar events in [timeMin, timeMax].
// Auth: the caller must present their own Supabase session and ask only for
// their own userId — same guard as /api/spotify/stats.
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const timeMin = req.nextUrl.searchParams.get("timeMin");
  const timeMax = req.nextUrl.searchParams.get("timeMax");
  if (!userId || !timeMin || !timeMax) {
    return NextResponse.json({ error: "missing params" }, { status: 400 });
  }

  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !user || user.id !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return NextResponse.json({ connected: false, events: [] });

  const events = await fetchEvents(accessToken, timeMin, timeMax);
  return NextResponse.json({ connected: true, events });
}
