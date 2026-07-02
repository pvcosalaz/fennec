import { createClient } from "@supabase/supabase-js";

// NEXT_PUBLIC_* vars are inlined at build time — Render needs them set as Build Environment Variables
// The fallback prevents build crashes; the app won't work at runtime without real values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://build-placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.build-placeholder.0";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
    flowType: "pkce",
  },
});
