import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { GCAL_PLATFORM } from "@/lib/googleCalendar";

export async function POST(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "no userId" }, { status: 400 });

  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !user || user.id !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await getSupabaseAdmin()
    .from("user_integrations")
    .delete()
    .eq("user_id", userId)
    .eq("platform", GCAL_PLATFORM);

  return NextResponse.json({ ok: true });
}
