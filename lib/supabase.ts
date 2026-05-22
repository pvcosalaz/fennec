import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://drmhwzxytwmkpfnjwmra.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRybWh3enh5dHdta3Bmbmp3bXJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNzg2MDUsImV4cCI6MjA5Mjg1NDYwNX0.4_dkGfeAzUWeFwuGAj67weqG2szyWd3cKgBs_RUmbyI";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
});
