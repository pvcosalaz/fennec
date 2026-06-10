import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Lazy singleton — createClient is called at request time, not at module load /
// build time, so missing env vars during the Render/Vercel build don't crash it.
let _admin: SupabaseClient | undefined;

export function getSupabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL not set");
  _admin = createClient(url, key);
  return _admin;
}
