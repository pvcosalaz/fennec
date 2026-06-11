// lib/adminAuth.ts — guards the /api/admin/* routes.
// The client sends its Supabase access token as "Authorization: Bearer <token>";
// we resolve it to a user and require profiles.is_admin = true.

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type AdminCheck =
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string };

export async function requireAdmin(req: Request): Promise<AdminCheck> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { ok: false, status: 401, error: "Missing access token" };

  const admin = getSupabaseAdmin();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return { ok: false, status: 401, error: "Invalid session" };

  const { data: profile, error: profErr } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  // profErr also covers "column is_admin does not exist" before the
  // 20260610_user_events migration has been run — treat as not authorized.
  if (profErr || !profile || !(profile as { is_admin?: boolean }).is_admin) {
    return { ok: false, status: 403, error: "Not an admin (or migration 20260610_user_events not run yet)" };
  }
  return { ok: true, userId: user.id };
}
