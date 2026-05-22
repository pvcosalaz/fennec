import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const next = req.nextUrl.searchParams.get("next") ?? "/";
  const origin = req.nextUrl.origin;

  // Let Supabase client-side SDK handle the session from the URL hash/params
  return NextResponse.redirect(new URL(next, origin));
}
