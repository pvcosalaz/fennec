export const runtime = "nodejs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import { deletePushSubscription } from "@/lib/notificationDb";


export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { endpoint } = await req.json() as { endpoint: string };
    await deletePushSubscription(endpoint);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push/unsubscribe]", err);
    return NextResponse.json({ error: "Failed to remove subscription" }, { status: 500 });
  }
}
