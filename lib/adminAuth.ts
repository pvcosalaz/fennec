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

  // is_admin lives in profiles_private now (service-role only). A missing row
  // or any error means not authorized.
  const { data: priv, error: profErr } = await admin
    .from("profiles_private")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (profErr || !priv || !(priv as { is_admin?: boolean }).is_admin) {
    return { ok: false, status: 403, error: "Not an admin" };
  }
  return { ok: true, userId: user.id };
}
