import { createClient } from "@supabase/supabase-js";

// Service role client — bypasses RLS. Only used server-side.
// Uses ! assertions instead of top-level throw so Next.js build doesn't crash
// (env vars aren't available at build time, only at request time).
// If the key is missing at runtime, Supabase auth will fail — never falls back to anon key.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
