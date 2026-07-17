// Branded welcome email for waitlist signups. Bilingual (es/en). Returns the
// subject + email-safe HTML (inline styles, dark Fennec look). Sent server-side
// from app/api/waitlist/welcome/route.ts via Resend.

const IG_URL = "https://instagram.com/fennec.audio";

type Lang = "es" | "en";

const COPY: Record<Lang, {
  subject: string; eyebrow: string; heading: string; tagline: string;
  p1: string; p2: string; cta: string; signoff: string; footer: string;
}> = {
  es: {
    subject: "Ya estás en la lista de Fennec",
    eyebrow: "Acceso anticipado",
    heading: "¡Gracias por unirte a Fennec!",
    tagline: "Tu hub de negocio y comunidad musical",
    p1: "Ya estás en la lista de acceso anticipado. Estamos afinando los últimos detalles y muy pronto vas a ser de los primeros en entrar y en enterarte del lanzamiento.",
    p2: "Mientras tanto, síguenos en Instagram para no perderte ninguna novedad.",
    cta: "Seguir a @fennec.audio",
    signoff: "Nos vemos pronto,<br>El equipo de Fennec",
    footer: "Fennec · La app de negocios para productores musicales",
  },
  en: {
    subject: "You're on the Fennec list",
    eyebrow: "Early access",
    heading: "Thanks for joining Fennec!",
    tagline: "Your music business & community hub",
    p1: "You're on the early-access list. We're putting the final touches together, and very soon you'll be among the first to get in and hear about the launch.",
    p2: "In the meantime, follow us on Instagram so you don't miss anything.",
    cta: "Follow @fennec.audio",
    signoff: "See you soon,<br>The Fennec team",
    footer: "Fennec · The business app for music producers",
  },
};

export function waitlistWelcomeEmail(langInput: string | null | undefined, name?: string | null): { subject: string; html: string } {
  const lang: Lang = langInput === "en" ? "en" : "es";
  const t = COPY[lang];
  const hi = name?.trim() ? (lang === "es" ? `Hola ${escapeHtml(name.trim())},` : `Hi ${escapeHtml(name.trim())},`) : "";

  // Bricolage Grotesque (a bold, characterful grotesque) loads in clients
  // that support web fonts (Apple Mail, iOS Mail); Gmail falls back to
  // Trebuchet/Helvetica, still a clean bold sans, not serif.
  const bodyFont = "'Bricolage Grotesque', 'Trebuchet MS', 'Helvetica Neue', Arial, sans-serif";
  const html = `<!doctype html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&display=swap');</style></head>
<body style="margin:0;padding:0;background:#0b0a08;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0a08;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111010;border:1px solid rgba(255,255,255,0.06);border-radius:14px;overflow:hidden;font-family:${bodyFont};">
        <tr><td align="center" style="padding:38px 36px 4px;">
          <img src="https://app.fennec.audio/fennec-icon-transparent.png" width="60" alt="Fennec" style="display:block;margin:0 auto 14px;width:60px;height:auto;" />
          <span style="font-size:30px;font-weight:800;letter-spacing:-0.03em;color:#ffffff;">fennec</span><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#f5a623;margin-left:2px;"></span>
        </td></tr>
        <tr><td align="center" style="padding:20px 36px 0;">
          <div style="font-size:12px;font-weight:700;letter-spacing:0.28em;color:#f5a623;text-transform:uppercase;">${t.eyebrow}</div>
          <div style="font-size:24px;font-weight:700;color:#ffffff;margin-top:14px;">${t.heading}</div>
          <div style="font-family:${bodyFont};font-size:15px;color:rgba(255,255,255,0.55);margin-top:8px;">${t.tagline}</div>
        </td></tr>
        <tr><td style="padding:12px 40px 4px;color:rgba(255,255,255,0.72);font-family:${bodyFont};font-weight:500;font-size:16px;line-height:1.7;text-align:center;">
          ${hi ? `<p style="margin:14px 0;">${hi}</p>` : ""}
          <p style="margin:14px 0;">${t.p1}</p>
          <p style="margin:14px 0;">${t.p2}</p>
        </td></tr>
        <tr><td align="center" style="padding:18px 36px 8px;">
          <a href="${IG_URL}" style="display:inline-block;text-decoration:none;">
            <img src="https://app.fennec.audio/instagram-glyph.png" width="30" alt="Instagram" style="display:block;margin:0 auto 14px;width:30px;height:30px;border:0;" />
          </a>
          <a href="${IG_URL}" style="display:inline-block;background:#f5a623;color:#0b0a08;font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px;">${t.cta}</a>
        </td></tr>
        <tr><td align="center" style="padding:22px 40px 8px;color:rgba(255,255,255,0.72);font-family:${bodyFont};font-weight:500;font-size:16px;line-height:1.7;text-align:center;">
          <p style="margin:8px 0;">${t.signoff}</p>
        </td></tr>
        <tr><td align="center" style="padding:24px 36px 34px;border-top:1px solid rgba(255,255,255,0.05);">
          <p style="margin:12px 0 0;font-size:12px;color:rgba(255,255,255,0.32);">${t.footer}</p>
          <p style="margin:4px 0 0;font-size:12px;"><a href="https://fennec.audio" style="color:rgba(255,255,255,0.45);text-decoration:none;">fennec.audio</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject: t.subject, html };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
