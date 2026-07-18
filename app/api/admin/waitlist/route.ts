export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";

// Campaign waitlist signups for the /admin CRM. Admin-only; read via the
// service role since the waitlist table's RLS is insert-only for the public.
export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = getSupabaseAdmin();
  try {
    const { data, error } = await admin
      .from("waitlist")
      .select("id, email, name, genre, lang, source, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ waitlist: data ?? [] });
  } catch (err) {
    console.error("[admin/waitlist]", err);
    return NextResponse.json({ error: "Failed to load waitlist" }, { status: 500 });
  }
}
