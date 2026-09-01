export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { allowPublic } from "@/lib/publicRateLimit";
import { waitlistWelcomeEmail } from "@/lib/waitlistEmail";

/* Sends the branded welcome email to a waitlist signup via Resend.
   Called by the /join form right after the row lands in Supabase.
   The Resend key stays server-side (RESEND_API_KEY env var, set in Vercel).
   FROM defaults to Resend's onboarding sender (works to your own account
   email without domain verification); set RESEND_FROM=hello@fennec.audio
   once fennec.audio is verified in Resend to send to everyone. */

export async function POST(req: Request) {
  /* La ruta MAS abusable de la app: manda correo con Resend y no pedia nada
     (auditoria 2026-08-31). Sin freno, cualquiera quema la cuota o la usa
     para spam a terceros. Cuatro por hora por IP: de sobra para un alta y
     un reintento, insuficiente para una campaña. */
  if (!(await allowPublic("waitlist_welcome", req, 4))) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "email not configured" }, { status: 503 });
  }

  let body: { email?: string; name?: string | null; lang?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "invalid email" }, { status: 400 });
  }

  const from = process.env.RESEND_FROM || "Fennec <onboarding@resend.dev>";
  const { subject, html, text } = waitlistWelcomeEmail(body.lang ?? null, body.name ?? null);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      // text (plaintext part) + List-Unsubscribe both improve inbox placement.
      body: JSON.stringify({
        from, to: [email], subject, html, text,
        headers: { "List-Unsubscribe": "<mailto:hello@fennec.audio?subject=unsubscribe>" },
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("resend send failed", res.status, detail);
      return NextResponse.json({ error: "send failed", status: res.status }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("resend send error", e);
    return NextResponse.json({ error: "send error" }, { status: 502 });
  }
}
