"use client";
import { type Project, type Quote, type Client, formatCOP } from "@/lib/pricingData";
import type { BusinessView } from "./BusinessHub";

/* ═══════════════════════════════════════════════════════════════
   BUSINESS HUB — desktop content. Enterprise register (KPI band,
   revenue chart, quotes table) per the approved mockup. Pure
   presentation: all data computed in BusinessHub and passed in.
   ═══════════════════════════════════════════════════════════════ */

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

function KPI({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-5 py-4">
      <span className="text-[9.5px] uppercase tracking-[0.18em] text-zinc-600">{label}</span>
      <b className={`mt-1.5 block text-[26px] font-extrabold tabular-nums tracking-tight ${accent ? "text-accent" : "text-white"}`}>{value}</b>
      {sub && <div className="mt-0.5 text-[10.5px] text-zinc-500">{sub}</div>}
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  sent:  "bg-accent/15 text-accent",
  paid:  "bg-emerald-400/10 text-emerald-400",
  draft: "bg-white/[0.06] text-zinc-400",
};

export default function BusinessHubDesktop({
  projects, quotes, clients, revenue, months, revenues, onOpenView,
}: {
  projects: Project[];
  quotes: Quote[];
  clients: Client[];
  revenue: number;
  months: { label: string; isCurrent: boolean }[];
  revenues: number[];
  onOpenView: (view: BusinessView) => void;
}) {
  const activeProjects = projects.filter((p) => p.status !== "paid");
  const paidProjects   = projects.filter((p) => p.status === "paid");
  const sentQuotes     = quotes.filter((q) => q.status === "sent");
  const outstanding    = sentQuotes.reduce((s, q) => s + q.finalPrice, 0);
  const avgProject     = paidProjects.length ? paidProjects.reduce((s, p) => s + p.price, 0) / paidProjects.length : 0;
  const maxRev         = Math.max(...revenues, 1);
  const recentQuotes   = [...quotes].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[21px] font-bold tracking-tight text-white">Business</h1>
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={() => onOpenView("clients")} className="rounded-full border border-white/10 px-3.5 py-1.5 text-[11.5px] text-zinc-400 transition hover:text-white">
            Clients &amp; leads
          </button>
          <button type="button" onClick={() => onOpenView("quotes")} className="rounded-full border border-accent/40 px-3.5 py-1.5 text-[11.5px] font-semibold text-accent transition hover:brightness-110">
            + New quote
          </button>
        </div>
      </div>

      {/* KPI band */}
      <div className="grid grid-cols-4 gap-3">
        <KPI label="Revenue · MTD" value={revenue > 0 ? formatCOP(revenue) : "$0"} accent sub={`${paidProjects.length} paid this month`} />
        <KPI label="Outstanding quotes" value={outstanding > 0 ? usd(outstanding) : "—"} sub={`${sentQuotes.length} awaiting reply`} />
        <KPI label="Active projects" value={String(activeProjects.length)} sub={activeProjects.length ? "in progress" : "none yet"} />
        <KPI label="Avg. project" value={avgProject > 0 ? usd(avgProject) : "—"} sub={paidProjects.length ? "from paid work" : "—"} />
      </div>

      {/* quotes table + revenue chart */}
      <div className="mt-4 grid gap-4" style={{ gridTemplateColumns: "1.55fr 1fr" }}>
        <div className="overflow-hidden rounded-xl border border-white/[0.07]">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3.5">
            <b className="text-[13.5px] font-bold text-white">Quotes</b>
            <button type="button" onClick={() => onOpenView("quotes")} className="text-[11px] font-semibold text-accent">View all →</button>
          </div>
          {recentQuotes.length === 0 ? (
            <div className="px-5 py-10 text-center text-[12.5px] text-zinc-600">
              No quotes yet. Turn a calculated rate into a client-ready quote.
            </div>
          ) : (
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr>
                  {["Client", "Project", "Amount", "Status"].map((h) => (
                    <th key={h} className="border-b border-white/[0.07] px-5 py-2.5 text-left text-[9.5px] font-semibold uppercase tracking-[0.16em] text-zinc-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentQuotes.map((q) => (
                  <tr key={q.id} className="cursor-pointer transition hover:bg-white/[0.02]" onClick={() => onOpenView("quotes")}>
                    <td className="border-b border-white/[0.04] px-5 py-3 text-zinc-300">{q.clientName || "—"}</td>
                    <td className="border-b border-white/[0.04] px-5 py-3 text-zinc-300">{q.projectName || q.projectTypeName}</td>
                    <td className="border-b border-white/[0.04] px-5 py-3 font-semibold tabular-nums text-white">{usd(q.finalPrice)}</td>
                    <td className="border-b border-white/[0.04] px-5 py-3">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLE[q.status] ?? STATUS_STYLE.draft}`}>{q.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-xl border border-white/[0.07] p-5">
          <b className="text-[13.5px] font-bold text-white">Revenue · last 6 months</b>
          <div className="mt-5 flex h-[150px] items-end gap-2.5">
            {months.map((m, i) => {
              const pct = revenues[i] > 0 ? Math.max((revenues[i] / maxRev) * 100, 6) : 3;
              return (
                <div key={i} className="flex-1 rounded-t-[4px]" style={{ height: `${pct}%`, background: m.isCurrent ? "linear-gradient(180deg,#ffc861,#f5a623)" : "rgba(255,255,255,.08)" }} />
              );
            })}
          </div>
          <div className="mt-2 flex gap-2.5">
            {months.map((m, i) => (
              <span key={i} className={`flex-1 text-center font-mono text-[9.5px] ${m.isCurrent ? "text-accent" : "text-zinc-600"}`}>{m.label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* tools */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {([
          { v: "calculator", t: "Pricing Calculator", d: "Know exactly what to charge" },
          { v: "projects",   t: "Active Projects",     d: `${activeProjects.length} in progress` },
          { v: "clients",    t: "Clients & Leads",     d: `${clients.length} in your roster` },
        ] as { v: BusinessView; t: string; d: string }[]).map(({ v, t, d }) => (
          <button
            key={v}
            type="button"
            onClick={() => onOpenView(v)}
            className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-5 py-4 text-left transition hover:border-accent/30"
          >
            <b className="block text-[13.5px] font-bold text-white">{t}</b>
            <span className="mt-1 block text-[11px] text-zinc-500">{d}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
