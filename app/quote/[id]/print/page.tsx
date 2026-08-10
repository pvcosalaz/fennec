"use client";

/* ═══════════════════════════════════════════════════════════════
   QUOTE · PRINT SHEET

   The client-facing document. Deliberately NOT the app's dark
   chrome: this is paper. Black on white, real type, room to
   breathe — it lands in an inbox next to invoices from studios
   and agencies and has to hold its own.

   No PDF library. `window.print()` + @page CSS produces a real
   vector PDF through the browser's own "Save as PDF", with
   selectable text and no extra bundle. jsPDF/html2canvas would
   ship ~300KB to produce a flat image of this same page.

   Branding is the PRODUCER's, not Fennec's: their name leads.
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getQuotes } from "@/lib/businessDb";
import { quoteItems, quoteTotals, paymentMethodName, type Quote } from "@/lib/pricingData";
import { formatMoneyDoc, type Currency } from "@/lib/currency";
import { fetchProfile } from "@/lib/communityDb";
import type { Profile } from "@/lib/communityTypes";

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

/** Short human reference: the quote's own id is a uuid, useless on paper. */
function quoteRef(q: Quote): string {
  return `#${q.id.replace(/[^0-9a-f]/gi, "").slice(0, 6).toUpperCase()}`;
}

export default function QuotePrintPage() {
  const { t } = useTranslation();
  const params = useParams();
  const id = String(params?.id ?? "");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notfound" | "signedout">("loading");

  useEffect(() => {
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setState("signedout"); return; }
      const [quotes, prof] = await Promise.all([
        getQuotes(session.user.id),
        fetchProfile(session.user.id).catch(() => null),
      ]);
      const q = quotes.find((x) => x.id === id) ?? null;
      setProfile(prof);
      setQuote(q);
      setState(q ? "ready" : "notfound");
    })();
  }, [id]);

  if (state === "loading") return <Shell><p className="muted">{t("qpCargando")}</p></Shell>;
  if (state === "signedout") return <Shell><p className="muted">{t("qpEntraParaVer")}</p></Shell>;
  if (state === "notfound" || !quote) return <Shell><p className="muted">{t("qpNoEncontrada")}</p></Shell>;

  const items = quoteItems(quote);
  const { subtotal, tax, total } = quoteTotals({ items, taxRate: quote.taxRate });
  const currency = (quote.currency ?? "COP") as Currency;
  const money = (n: number) => formatMoneyDoc(n, currency);
  const producer = profile?.display_name || profile?.username || "";

  return (
    <Shell>
      {/* Screen-only toolbar — never printed */}
      <div className="toolbar no-print">
        <button type="button" onClick={() => window.print()} className="btn-print">
          {t("qpDescargarPdf")}
        </button>
        <span className="hint">{t("qpElegirGuardarPdf")}</span>
      </div>

      <article className="sheet">
        <header className="head">
          <div>
            <h1 className="producer">{producer}</h1>
            {profile?.role && <p className="role">{profile.role}</p>}
          </div>
          <div className="meta">
            <p className="doc-title">{t("qpCotizacion")} {quoteRef(quote)}</p>
            <p>{fmtDate(quote.createdAt)}</p>
            {quote.updatedAt && <p className="muted">{t("qpActualizada")} {fmtDate(quote.updatedAt)}</p>}
          </div>
        </header>

        <section className="parties">
          <p className="label">{t("qpPara")}</p>
          <p className="client">{quote.clientName}</p>
          {quote.clientEmail && <p className="muted">{quote.clientEmail}</p>}
          <p className="project">{quote.projectName}</p>
        </section>

        <table className="items">
          <thead>
            <tr>
              <th className="l">{t("qpConcepto")}</th>
              <th className="c">{t("qgCantidad")}</th>
              <th className="r">{t("qpUnitario")}</th>
              <th className="r">{t("pdMonto")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td className="l">
                  {it.concept}
                  {it.note && <span className="item-note">{it.note}</span>}
                </td>
                <td className="c">{it.qty}</td>
                <td className="r">{money(it.unitPrice)}</td>
                <td className="r">{money(it.qty * it.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="totals">
          <div className="row"><span>{t("qgSubtotal")}</span><span>{money(subtotal)}</span></div>
          {quote.taxRate > 0 && (
            <div className="row">
              <span>{quote.taxLabel || t("qpImpuesto")} {Math.round(quote.taxRate * 100)}%</span>
              <span>{money(tax)}</span>
            </div>
          )}
          <div className="row total"><span>{t("qpTotal")}</span><span>{money(total)}</span></div>
        </section>

        {/* How to pay, as its own block. It used to be a sentence inside the
            notes paragraph, which is how a quote goes out with no usable way
            to pay it (Paco 2026-08-01). */}
        {quote.paymentMethods?.length > 0 && (
          <section className="pay">
            <p className="label">{t("qpComoPagar")}</p>
            <table className="pay-table">
              <tbody>
                {quote.paymentMethods.map((m) => (
                  <tr key={m.id}>
                    <th>{paymentMethodName(m)}</th>
                    <td>{m.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {quote.notes && (
          <section className="notes">
            <p className="label">{t("qgNotasTerminos")}</p>
            <p>{quote.notes}</p>
          </section>
        )}

        <footer className="foot">
          <span>{producer}</span>
          {profile?.username && <span>@{profile.username}</span>}
        </footer>
      </article>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="page">
      {children}
      <style jsx global>{`
        /* Paper, not app chrome. !important because layout.tsx sets the dark
           background as an INLINE style on html/body (inline beats a plain
           stylesheet rule) and globals.css locks overflow for the PWA shell. */
        html, body {
          background: #f4f4f5 !important;
          height: auto !important;
          overflow: auto !important;
          margin: 0; padding: 0;
        }
        .page {
          min-height: 100vh; padding: 32px 16px 64px;
          font-family: var(--font-sans), -apple-system, BlinkMacSystemFont, sans-serif;
          color: #18181b;
        }
        .muted { color: #71717a; }

        .toolbar {
          max-width: 760px; margin: 0 auto 20px; display: flex;
          align-items: center; gap: 14px;
        }
        .btn-print {
          background: #18181b; color: #fff; border: 0; border-radius: 999px;
          padding: 10px 20px; font-size: 13.5px; font-weight: 600; cursor: pointer;
          transition: transform .12s cubic-bezier(.16,1,.3,1), opacity .2s;
        }
        .btn-print:active { transform: scale(.98); }
        .hint { font-size: 12.5px; color: #71717a; }

        .sheet {
          max-width: 760px; margin: 0 auto; background: #fff; color: #18181b;
          padding: 56px 56px 44px; border-radius: 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,.08), 0 12px 32px -12px rgba(0,0,0,.12);
        }

        .head {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 32px; padding-bottom: 22px; border-bottom: 1.5px solid #18181b;
        }
        .producer { margin: 0; font-size: 21px; font-weight: 700; letter-spacing: -.01em; }
        .role { margin: 3px 0 0; font-size: 12.5px; color: #71717a; }
        .meta { text-align: right; font-size: 12.5px; color: #52525b; }
        .meta p { margin: 0 0 2px; }
        .doc-title { font-weight: 700; color: #18181b; font-size: 13.5px; }

        .label {
          margin: 0 0 5px; font-size: 9.5px; font-weight: 700;
          letter-spacing: .16em; text-transform: uppercase; color: #a1a1aa;
        }
        .parties { margin-top: 26px; }
        .client { margin: 0; font-size: 15.5px; font-weight: 600; }
        .parties .muted { margin: 2px 0 0; font-size: 12.5px; }
        .project { margin: 12px 0 0; font-size: 13.5px; color: #3f3f46; }

        .items { width: 100%; border-collapse: collapse; margin-top: 30px; font-size: 13px; }
        .items th {
          font-size: 9.5px; font-weight: 700; letter-spacing: .14em;
          text-transform: uppercase; color: #a1a1aa; padding: 0 0 8px;
          border-bottom: 1px solid #e4e4e7;
        }
        .items td { padding: 11px 0; border-bottom: 1px solid #f4f4f5; vertical-align: top; }
        .items .l { text-align: left; }
        .items .c { text-align: center; width: 56px; }
        .items .r { text-align: right; width: 130px; font-variant-numeric: tabular-nums; }
        .item-note { display: block; margin-top: 2px; font-size: 11.5px; color: #71717a; }

        .totals { margin-top: 18px; margin-left: auto; width: 290px; font-size: 13px; }
        .totals .row { display: flex; justify-content: space-between; padding: 5px 0; color: #52525b; }
        .totals .row span:last-child { font-variant-numeric: tabular-nums; }
        .totals .total {
          margin-top: 6px; padding-top: 10px; border-top: 1.5px solid #18181b;
          font-size: 16px; font-weight: 700; color: #18181b;
        }

        .pay { margin-top: 32px; }
        .pay-table { border-collapse: collapse; font-size: 12.5px; }
        .pay-table th {
          text-align: left; vertical-align: top; padding: 4px 22px 4px 0;
          font-weight: 600; color: #18181b; white-space: nowrap;
        }
        .pay-table td { vertical-align: top; padding: 4px 0; color: #3f3f46; }

        .notes { margin-top: 34px; font-size: 12.5px; color: #3f3f46; line-height: 1.65; max-width: 62ch; }
        .notes p:last-child { margin: 0; white-space: pre-wrap; }

        .foot {
          margin-top: 40px; padding-top: 14px; border-top: 1px solid #e4e4e7;
          display: flex; justify-content: space-between;
          font-size: 11.5px; color: #a1a1aa;
        }

        /* ── Print ── */
        @page { size: letter; margin: 16mm; }
        @media print {
          html, body { background: #fff !important; }
          .page { padding: 0; }
          .no-print { display: none !important; }
          .sheet {
            max-width: none; padding: 0; border-radius: 0; box-shadow: none;
          }
          /* Never split a line item or the totals across pages. */
          .items tr, .totals, .notes, .pay { break-inside: avoid; }
        }
        @media (prefers-reduced-motion: reduce) { .btn-print { transition: none; } }
      `}</style>
    </main>
  );
}
