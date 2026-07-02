import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_REDIRECT_PATHS = new Set(["/", "/dashboard", "/community", "/calendar", "/clients"]);

function safeNextPath(next: string | null): string {
  if (!next) return "/";
  try {
    // Only allow relative paths — reject anything with a host
    const url = new URL(next, "http://localhost");
    const path = url.pathname + url.search;
    // Block open redirect to external hosts
    if (next.startsWith("//") || next.startsWith("http")) return "/";
    return path;
  } catch {
    return "/";
  }
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { flowType: "pkce", detectSessionInUrl: false } }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Redirect cleanly — the client-side SDK picks up the session via PKCE cookie
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL("/?auth_error=1", origin));
}
