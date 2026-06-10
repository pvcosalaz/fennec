import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set — never fall back to anon key for admin ops");

export const supabaseAdmin = createClient(url, key);
