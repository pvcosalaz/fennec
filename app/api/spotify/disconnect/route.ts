import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Requires SUPABASE_SERVICE_ROLE_KEY env var to bypass RLS for server-side deletes
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://drmhwzxytwmkpfnjwmra.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "no userId" }, { status: 400 });
  await supabaseAdmin.from("user_integrations").delete().eq("user_id", userId).eq("platform", "spotify");
  return NextResponse.json({ ok: true });
}
