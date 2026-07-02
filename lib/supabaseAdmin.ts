import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Use globalThis to survive Next.js HMR hot reloads in development
const g = globalThis as typeof globalThis & { __supabaseAdmin?: SupabaseClient };

export function getSupabaseAdmin(): SupabaseClient {
  if (g.__supabaseAdmin) return g.__supabaseAdmin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL not set");
  g.__supabaseAdmin = createClient(url, key, { auth: { persistSession: false } });
  return g.__supabaseAdmin;
}
