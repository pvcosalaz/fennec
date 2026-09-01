export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { allowPublic } from "@/lib/publicRateLimit";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { waitlistWelcomeEmail } from "@/lib/waitlistEmail";

/* One-call waitlist signup for the marketing landing (fennec.audio), which is
   a different origin than the app — hence CORS. Inserts the row server-side
   (service role, so no anon key in the static landing) and sends the welcome
   email. The in-app /join form keeps its own client insert + /welcome call;
   this endpoint mirrors that behavior for cross-origin callers. */

const ALLOWED_ORIGINS = new Set([
  "https://fennec.audio",
  "https://www.fennec.audio",
  "https://app.fennec.audio",
]);

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://fennec.audio";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export async function POST(req: Request) {
  const cors = corsHeaders(req.headers.get("origin"));

  /* Ruta publica: sin freno se podia llenar la waitlist de basura
     (auditoria 2026-08-31). Un alta legitima manda UNA peticion. */
  if (!(await allowPublic("waitlist_signup", req, 8))) {
    return NextResponse.json({ error: "too many requests" }, { status: 429, headers: cors });
  }

  let body: { email?: string; name?: string | null; genre?: string | null; lang?: string | null; source?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400, headers: cors });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "invalid email" }, { status: 400, headers: cors });
  }

  // Insert (service role bypasses RLS). 23505 = duplicate email = already on
  // the list, which is success for a waitlist.
  try {
    const { error } = await getSupabaseAdmin().from("waitlist").insert({
      email,
      name: body.name?.trim() || null,
      genre: body.genre || null,
      lang: body.lang === "en" ? "en" : "es",
      source: body.source || "landing",
    });
    if (error && error.code !== "23505") {
      console.error("waitlist insert failed", error);
      return NextResponse.json({ error: "insert failed" }, { status: 502, headers: cors });
    }
  } catch (e) {
    console.error("waitlist insert error", e);
    return NextResponse.json({ error: "insert error" }, { status: 502, headers: cors });
  }

  // Best-effort welcome email — never fail the signup if the send hiccups.
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const from = process.env.RESEND_FROM || "Fennec <onboarding@resend.dev>";
      const { subject, html, text } = waitlistWelcomeEmail(body.lang ?? null, body.name ?? null);
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        // text (plaintext part) + List-Unsubscribe both improve inbox placement.
        body: JSON.stringify({
          from, to: [email], subject, html, text,
          headers: { "List-Unsubscribe": "<mailto:hello@fennec.audio?subject=unsubscribe>" },
        }),
      });
    } catch (e) {
      console.error("waitlist welcome email error", e);
    }
  }

  return NextResponse.json({ ok: true }, { headers: cors });
}
