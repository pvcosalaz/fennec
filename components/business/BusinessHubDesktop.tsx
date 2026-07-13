"use client";
import { type Project, type Quote, type Client, formatCOP } from "@/lib/pricingData";
import type { BusinessView } from "./BusinessHub";

/* ═══════════════════════════════════════════════════════════════
   BUSINESS HUB — desktop content. Enterprise register (KPI band,
   revenue chart, quotes table) per the approved mockup. Pure
   presentation: all data computed in BusinessHub and passed in.
   ═══════════════════════════════════════════════════════════════ */

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

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

      {/* tools — same illustrated icons as the mobile app, up top so the
          quick actions read before the numbers */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        {([
          { v: "calculator", t: "Pricing Calculator", d: "Know exactly what to charge", icon: <CalculatorIcon /> },
          { v: "projects",   t: "Active Projects",     d: `${activeProjects.length} in progress`, icon: <ProjectsIcon /> },
          { v: "clients",    t: "Clients & Leads",     d: `${clients.length} in your roster`, icon: <ClientsIcon /> },
        ] as { v: BusinessView; t: string; d: string; icon: React.ReactNode }[]).map(({ v, t, d, icon }) => (
          <button
            key={v}
            type="button"
            onClick={() => onOpenView(v)}
            className="flex items-center gap-3.5 rounded-xl border border-white/[0.07] bg-white/[0.02] px-5 py-4 text-left transition hover:border-accent/30"
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(255,255,255,.04)" }}>{icon}</div>
            <div>
              <b className="block text-[13.5px] font-bold text-white">{t}</b>
              <span className="mt-0.5 block text-[11px] text-zinc-500">{d}</span>
            </div>
          </button>
        ))}
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
    </div>
  );
}
