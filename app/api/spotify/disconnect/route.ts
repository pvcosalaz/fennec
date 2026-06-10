import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";


export async function POST(req: NextRequest) {
  // Verify the caller owns the integration they're disconnecting
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await getSupabaseAdmin()
    .from("user_integrations")
    .delete()
    .eq("user_id", user.id)  // always use the verified user, never trust body
    .eq("platform", "spotify");

  return NextResponse.json({ ok: true });
}
