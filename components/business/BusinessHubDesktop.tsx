"use client";
import { useTranslation } from "react-i18next";
import {
  type Project, type Quote, type Client, formatCOP,
  projectMoney, paymentsTotal, totalsByCurrency, formatCurrencyTotals,
} from "@/lib/pricingData";
import { getCurrency, formatMoney, type Currency } from "@/lib/currency";
import type { BusinessView } from "./BusinessHub";
import { RiseStyle, Tile, Instrument, Cols, Col, ACCENT } from "@/components/desktop/ui";

/* ═══════════════════════════════════════════════════════════════
   BUSINESS HUB — desktop content. Enterprise register (KPI band,
   revenue chart, quotes table) per the approved mockup. Pure
   presentation: all data computed in BusinessHub and passed in.
   ═══════════════════════════════════════════════════════════════ */


// Same brand colors as the mobile tool-card illustrations (components/remotion/BusinessToolCards.tsx)
const AMBER = "#f5a623";
const STROKE = "rgba(255,255,255,0.68)";
const STROKE_SOFT = "rgba(255,255,255,0.30)";

/** The three tool icons, lifted straight from the mobile app's illustrated
 *  cards (components/remotion/BusinessToolCards.tsx) so desktop and mobile
 *  read as the same product — just without the animated card shell. */
function CalculatorIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ transform: "rotate(-6deg)" }}>
      <path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42z" stroke={STROKE} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="7.2" cy="7.2" r="1.4" fill={AMBER} />
      <text x="12.6" y="15.6" fontSize="7.5" fontWeight="700" fill={AMBER} fontFamily="-apple-system, BlinkMacSystemFont, system-ui, sans-serif" textAnchor="middle">$</text>
    </svg>
  );
}
function ProjectsIcon() {
  const tracks = [
    { fill: 0.72, color: "rgba(255,255,255,0.55)" },
    { fill: 0.45, color: "rgba(255,255,255,0.32)" },
    { fill: 0.88, color: AMBER },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, width: 22 }}>
      {tracks.map((t, i) => (
        <div key={i} style={{ position: "relative", height: 3, borderRadius: 3, background: "rgba(255,255,255,0.10)" }}>
          <div style={{ position: "absolute", inset: 0, width: `${t.fill * 100}%`, borderRadius: 3, background: t.color }} />
        </div>
      ))}
    </div>
  );
}
function ClientsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="16.2" cy="8.6" r="2.6" stroke={AMBER} strokeWidth="1.5" opacity="0.9" />
      <path d="M14 19c.4-2.8 2.3-4.4 4.6-4.4 1.5 0 2.8.6 3.6 1.7" stroke={AMBER} strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
      <circle cx="8.8" cy="8" r="3.2" stroke={STROKE} strokeWidth="1.5" fill="#1c1915" />
      <path d="M2.8 19.5c.5-3.4 2.9-5.3 6-5.3s5.5 1.9 6 5.3" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" fill="#1c1915" />
    </svg>
  );
}

const STATUS_STYLE: Record<string, string> = {
  sent:  "bg-accent/15 text-accent",
  paid:  "bg-emerald-400/10 text-emerald-400",
  draft: "bg-white/[0.06] text-zinc-400",
};

/* Llaves, no texto: asi la insignia de cada cotizacion cambia de idioma al
   instante sin volver a derivar los datos (mismo patron que el calendario). */
const STATUS_KEY: Record<string, string> = {
  sent:  "bdEstadoEnviada",
  paid:  "bdEstadoPagada",
  draft: "bdEstadoBorrador",
};

export default function BusinessHubDesktop({
  projects, quotes, clients, revenue, months, revenues,
  revenueCurrency, revenueExtra, onOpenView,
}: {
  projects: Project[];
  quotes: Quote[];
  clients: Client[];
  revenue: number;
  months: { label: string; isCurrent: boolean }[];
  revenues: number[];
  /** The chart plots one currency; these say which, and what else came in. */
  revenueCurrency: Currency;
  revenueExtra: string | null;
  onOpenView: (view: BusinessView, opts?: { create?: boolean }) => void;
}) {
  const { t } = useTranslation();
  const activeProjects = projects.filter((p) => p.status !== "paid");
  const sentQuotes     = quotes.filter((q) => q.status === "sent");
  const outstanding    = sentQuotes.reduce((s, q) => s + q.finalPrice, 0);
  const maxRev         = Math.max(...revenues, 1);

  /* The strip now traces the money's journey instead of mixing pipeline with
     roster size: what's out there → what you're working on → what you're owed.
     "Avg. project" was vanity computed on the old paid-flag basis, and
     "Clients" is a directory count that already has its own tool card
     (Paco 2026-08-01). The fourth step of the journey, what actually landed,
     is the hero above — repeating it here would print the same number twice. */
  /* Per currency: quotes and projects each freeze their own, and adding MXN to
     USD produced a number that doesn't exist. */
  const appCurrency    = getCurrency();
  const outstandingTot = formatCurrencyTotals(
    totalsByCurrency(sentQuotes.map((q) => ({ amount: q.finalPrice, currency: q.currency })), appCurrency),
    appCurrency);
  const activeTot      = formatCurrencyTotals(
    totalsByCurrency(activeProjects.map((p) => ({ amount: p.price, currency: p.currency })), appCurrency),
    appCurrency);
  const owedTot        = formatCurrencyTotals(
    totalsByCurrency(activeProjects.map((p) => ({ amount: projectMoney(p).pending, currency: p.currency })), appCurrency),
    appCurrency);
  const noDeposit      = activeProjects.filter((p) => paymentsTotal(p.payments) === 0).length;
  const hasOutstanding = sentQuotes.some((q) => q.finalPrice > 0);
  const hasActiveValue = activeProjects.some((p) => p.price > 0);
  const hasOwed        = activeProjects.some((p) => projectMoney(p).pending > 0);

  /* Revenue comes from payment dates now, so counting projects flagged paid
     would caption the hero with an unrelated number. */
  const paymentsThisMonth = projects.reduce((n, p) => {
    const now = new Date();
    return n + (p.payments ?? []).filter((pay) => {
      const d = new Date(`${pay.date}T00:00:00`);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, 0);
  const recentQuotes   = [...quotes].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

  return (
    // Fill the shell's height and let the bottom row absorb the slack: with
    // real data (one quote, an empty chart) the module left 340px of dead
    // screen and squeezed the tools (Paco 2026-07-31).
    <div className="flex flex-col">
      <RiseStyle />

      <div className="dd-rise mb-6 flex flex-shrink-0 items-center justify-between">
        <h1 className="text-[21px] font-bold tracking-tight text-white">{t("tabs.business")}</h1>
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={() => onOpenView("clients")} className="rounded-full border border-white/10 px-3.5 py-1.5 text-[11.5px] text-zinc-400 transition hover:text-white">
            {t("bzClients")}
          </button>
          {/* Says "New quote", so it opens the form. Landing on the list and
              making you press Add again is a second click for nothing
              (Paco 2026-08-02). */}
          <button type="button" onClick={() => onOpenView("quotes", { create: true })} className="rounded-full border border-accent/40 px-3.5 py-1.5 text-[11.5px] font-semibold text-accent transition hover:brightness-110">
            {t("bdNuevaCotizacion")}
          </button>
        </div>
      </div>

      {/* The three data blocks share the leftover height with generous but
          capped rhythm, so a sparse month reads as airy rather than as a
          truncated page with a dead zone (Paco 2026-07-31). */}
      <div className="flex flex-col gap-10">
      {/* Hero: the money. A business module's one number is revenue, so it
          gets the dashboard's Instrument treatment instead of hiding as one
          of four identical KPI boxes. Trend sits beside it — number, then
          shape (design pass 2026-07-31). */}
      <div className="dd-rise grid items-stretch gap-4" style={{ gridTemplateColumns: ".85fr 1.35fr", animationDelay: ".06s" }}>
        <Instrument
          label={`${t("bdIngresosMes")} · ${revenueCurrency}`}
          value={formatMoney(revenue, revenueCurrency)}
          size={64}
          footer={
            <span className="relative mt-2 block text-[10px] text-zinc-500">
              {paymentsThisMonth > 0
                ? t("bdPagosEsteMes", { count: paymentsThisMonth })
                : t("bdNadaCobrado")}
              {revenueExtra && (
                <span className="mt-0.5 block text-zinc-600">+ {revenueExtra}</span>
              )}
            </span>
          }
        />
        <Tile label={t("bzLast6")}>
          {revenues.every((r) => r === 0) ? (
            /* Flat hairlines across an empty chart read as broken. Say it. */
            <div className="flex h-[168px] flex-col items-center justify-center gap-1">
              <p className="text-[12.5px] text-zinc-600">{t("bdSinIngresos")}</p>
              <p className="text-[11px] text-zinc-700">{t("bdSinIngresosSub")}</p>
            </div>
          ) : (
            <div className="mt-3 flex h-[168px] items-end gap-2.5">
              {months.map((m, i) => {
                const pct = revenues[i] > 0 ? Math.max((revenues[i] / maxRev) * 100, 6) : 3;
                return (
                  <div key={i} className="flex-1 rounded-t-[4px] transition-all duration-500"
                    style={{ height: `${pct}%`, background: m.isCurrent ? ACCENT : "rgba(255,255,255,.08)" }} />
                );
              })}
            </div>
          )}
          <div className="mt-2 flex gap-2.5">
            {months.map((m, i) => (
              <span key={i} className={`flex-1 text-center font-mono text-[9.5px] ${m.isCurrent ? "text-accent" : "text-zinc-600"}`}>{m.label}</span>
            ))}
          </div>
        </Tile>
      </div>

      {/* Secondary metrics — hairline columns, not four more boxes. */}
      <div className="dd-rise" style={{ animationDelay: ".12s" }}>
        <Tile label={t("bdPipeline")} className="py-1">
          <Cols>
            <Col
              value={hasOutstanding ? outstandingTot.value : "—"}
              label={t("bdEsperandoRespuesta")}
              muted={!hasOutstanding}
              sub={sentQuotes.length
                ? t("bdCotizacionesFuera", { count: sentQuotes.length })
                : undefined}
              extra={hasOutstanding ? outstandingTot.extra : null}
              onClick={() => onOpenView("quotes")}
            />
            <Col
              value={hasActiveValue ? activeTot.value : "—"}
              label={t("bdEnCurso")}
              muted={activeProjects.length === 0}
              sub={activeProjects.length
                ? t("bdProyectosCuenta", { count: activeProjects.length })
                : undefined}
              extra={hasActiveValue ? activeTot.extra : null}
              onClick={() => onOpenView("projects")}
            />
            <Col
              value={hasOwed ? owedTot.value : "—"}
              label={t("bdTeDeben")}
              muted={!hasOwed}
              sub={noDeposit > 0 ? t("bdSinAnticipo", { count: noDeposit }) : undefined}
              extra={hasOwed ? owedTot.extra : null}
              onClick={() => onOpenView("projects")}
            />
          </Cols>
        </Tile>
      </div>

      {/* Quotes + tools. The three tool cards used to be an equal 3-across
          row (the generic feature-row shape); they're now a compact rail
          beside the table, which also gives the table the width it wants. */}
      <div className="dd-rise grid gap-4" style={{ gridTemplateColumns: "1.55fr 1fr", animationDelay: ".18s" }}>
        <Tile padded={false} className="flex flex-col">
          <div className="flex flex-shrink-0 items-center justify-between px-5 py-3.5">
            <b className="text-[13.5px] font-bold text-white">{t("bzQuotes")}</b>
            <button type="button" onClick={() => onOpenView("quotes")} className="text-[11px] font-semibold text-accent transition hover:brightness-110">{t("bdVerTodas")}</button>
          </div>
          {recentQuotes.length === 0 ? (
            <div className="px-5 pb-10 pt-4 text-center text-[12.5px] text-zinc-600">
              {t("bdSinCotizaciones")}
            </div>
          ) : (
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr>
                  {["bdColCliente", "bdColProyecto", "bdColMonto", "bdColEstado"].map((k) => (
                    <th key={k} className="border-y border-white/[0.06] px-5 py-2.5 text-left text-[9.5px] font-semibold uppercase tracking-[0.16em] text-zinc-600">{t(k)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentQuotes.map((q) => (
                  <tr key={q.id} className="cursor-pointer transition hover:bg-white/[0.02]" onClick={() => onOpenView("quotes")}>
                    <td className="border-b border-white/[0.04] px-5 py-3 text-zinc-300">{q.clientName || "—"}</td>
                    <td className="border-b border-white/[0.04] px-5 py-3 text-zinc-300">{q.projectName || q.projectTypeName}</td>
                    <td className="border-b border-white/[0.04] px-5 py-3 font-semibold tabular-nums text-white">{formatMoney(q.finalPrice, q.currency ?? appCurrency)}</td>
                    <td className="border-b border-white/[0.04] px-5 py-3">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLE[q.status] ?? STATUS_STYLE.draft}`}>{t(STATUS_KEY[q.status] ?? STATUS_KEY.draft)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {/* The table rarely fills the column. Rather than leave raw void,
              the leftover space carries the next action. */}
          {recentQuotes.length > 0 && (
            <button
              type="button"
              onClick={() => onOpenView("quotes", { create: true })}
              className="group flex flex-col items-center justify-center gap-1 px-5 py-8 text-center transition hover:bg-white/[0.015]"
            >
              <span className="text-[12px] text-zinc-600">
                {t("bdCotizacionesFueraPunto", { count: recentQuotes.length })}
              </span>
              <span className="text-[11.5px] font-semibold text-accent transition group-hover:brightness-110">
                {t("bdArmaLaSiguiente")}
              </span>
            </button>
          )}
        </Tile>

        <Tile label={t("bdHerramientas")} className="self-start">
          <div className="flex flex-col divide-y divide-white/[0.05]">
            {/* `titulo`, no `t`: aqui `t` ya es la funcion de traduccion. */}
            {([
              { v: "calculator", titulo: t("bzCalculator"), d: t("bdSaberQueCobrar"), icon: <CalculatorIcon /> },
              { v: "projects",   titulo: t("bzProjects"),   d: t("bdEnCursoCuenta", { count: activeProjects.length }), icon: <ProjectsIcon /> },
              { v: "clients",    titulo: t("bzClients"),    d: t("bdEnTuCartera", { count: clients.length }), icon: <ClientsIcon /> },
            ] as { v: BusinessView; titulo: string; d: string; icon: React.ReactNode }[]).map(({ v, titulo, d, icon }) => (
              <button key={v} type="button" onClick={() => onOpenView(v)}
                className="group flex items-center gap-3.5 py-3.5 text-left transition first:pt-2 hover:bg-white/[0.02]">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition group-hover:bg-accent/10" style={{ background: "rgba(255,255,255,.045)" }}>{icon}</div>
                <div className="min-w-0 flex-1">
                  <b className="block truncate text-[13.5px] font-bold text-white">{titulo}</b>
                  <span className="mt-0.5 block truncate text-[11.5px] text-zinc-500">{d}</span>
                </div>
                <span className="flex-shrink-0 text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
                </span>
              </button>
            ))}
          </div>
        </Tile>
      </div>
      </div>
    </div>
  );
}
