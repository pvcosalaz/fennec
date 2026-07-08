export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";

/** Hard-deletes voice notes that aged out of their 48h "on air" window and
 *  weren't printed to tape (archived). Scheduled daily in vercel.json. */
async function handler(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await getSupabaseAdmin().rpc("purge_expired_voice_notes");
  if (error) {
    console.error("[cron/purge-voice-notes]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ purged: data ?? 0 });
}

export const GET = handler;
export const POST = handler;
