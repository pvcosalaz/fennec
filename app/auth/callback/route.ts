import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      // Pass tokens to client via URL hash so client-side Supabase picks them up
      const redirectUrl = new URL(next, origin);
      redirectUrl.hash = `access_token=${data.session.access_token}&refresh_token=${data.session.refresh_token}&token_type=bearer&type=recovery`;
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.redirect(new URL(next, origin));
}
