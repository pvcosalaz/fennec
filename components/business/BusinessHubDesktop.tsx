"use client";
import { type Project, type Quote, type Client, formatCOP } from "@/lib/pricingData";
import type { BusinessView } from "./BusinessHub";
import { RiseStyle, Tile, Instrument, Cols, Col, ACCENT } from "@/components/desktop/ui";

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
    // Fill the shell's height and let the bottom row absorb the slack: with
    // real data (one quote, an empty chart) the module left 340px of dead
    // screen and squeezed the tools (Paco 2026-07-31).
    <div className="flex flex-col">
      <RiseStyle />

      <div className="dd-rise mb-6 flex flex-shrink-0 items-center justify-between">
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
          label="Revenue · MTD"
          value={revenue > 0 ? formatCOP(revenue) : "$0"}
          size={64}
          footer={
            <span className="relative mt-2 text-[10px] text-zinc-500">
              {paidProjects.length > 0 ? `${paidProjects.length} paid this month` : "No paid work yet"}
            </span>
          }
        />
        <Tile label="Revenue · last 6 months">
          {revenues.every((r) => r === 0) ? (
            /* Flat hairlines across an empty chart read as broken. Say it. */
            <div className="flex h-[168px] flex-col items-center justify-center gap-1">
              <p className="text-[12.5px] text-zinc-600">No revenue logged yet.</p>
              <p className="text-[11px] text-zinc-700">Mark a project paid and it lands here.</p>
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
        <Tile label="Pipeline" className="py-1">
          <Cols>
            <Col value={outstanding > 0 ? usd(outstanding) : "—"} label="Outstanding" muted={outstanding === 0}
              sub={sentQuotes.length ? `${sentQuotes.length} awaiting reply` : undefined} onClick={() => onOpenView("quotes")} />
            <Col value={String(activeProjects.length)} label="Active projects" muted={activeProjects.length === 0}
              sub={activeProjects.length ? "in progress" : undefined} onClick={() => onOpenView("projects")} />
            <Col value={avgProject > 0 ? usd(avgProject) : "—"} label="Avg. project" muted={avgProject === 0}
              sub={paidProjects.length ? "from paid work" : undefined} />
            <Col value={String(clients.length)} label="Clients" muted={clients.length === 0}
              sub={clients.length ? "in your roster" : undefined} onClick={() => onOpenView("clients")} />
          </Cols>
        </Tile>
      </div>

      {/* Quotes + tools. The three tool cards used to be an equal 3-across
          row (the generic feature-row shape); they're now a compact rail
          beside the table, which also gives the table the width it wants. */}
      <div className="dd-rise grid gap-4" style={{ gridTemplateColumns: "1.55fr 1fr", animationDelay: ".18s" }}>
        <Tile padded={false} className="flex flex-col">
          <div className="flex flex-shrink-0 items-center justify-between px-5 py-3.5">
            <b className="text-[13.5px] font-bold text-white">Quotes</b>
            <button type="button" onClick={() => onOpenView("quotes")} className="text-[11px] font-semibold text-accent transition hover:brightness-110">View all →</button>
          </div>
          {recentQuotes.length === 0 ? (
            <div className="px-5 pb-10 pt-4 text-center text-[12.5px] text-zinc-600">
              No quotes yet. Turn a calculated rate into a client-ready quote.
            </div>
          ) : (
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr>
                  {["Client", "Project", "Amount", "Status"].map((h) => (
                    <th key={h} className="border-y border-white/[0.06] px-5 py-2.5 text-left text-[9.5px] font-semibold uppercase tracking-[0.16em] text-zinc-600">{h}</th>
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
          {/* The table rarely fills the column. Rather than leave raw void,
              the leftover space carries the next action. */}
          {recentQuotes.length > 0 && (
            <button
              type="button"
              onClick={() => onOpenView("quotes")}
              className="group flex flex-col items-center justify-center gap-1 px-5 py-8 text-center transition hover:bg-white/[0.015]"
            >
              <span className="text-[12px] text-zinc-600">
                {recentQuotes.length === 1 ? "One quote out." : `${recentQuotes.length} quotes out.`}
              </span>
              <span className="text-[11.5px] font-semibold text-accent transition group-hover:brightness-110">
                Build the next one →
              </span>
            </button>
          )}
        </Tile>

        <Tile label="Tools" className="self-start">
          <div className="flex flex-col divide-y divide-white/[0.05]">
            {([
              { v: "calculator", t: "Pricing Calculator", d: "Know what to charge", icon: <CalculatorIcon /> },
              { v: "projects",   t: "Active Projects",    d: `${activeProjects.length} in progress`, icon: <ProjectsIcon /> },
              { v: "clients",    t: "Clients & Leads",    d: `${clients.length} in your roster`, icon: <ClientsIcon /> },
            ] as { v: BusinessView; t: string; d: string; icon: React.ReactNode }[]).map(({ v, t, d, icon }) => (
              <button key={v} type="button" onClick={() => onOpenView(v)}
                className="group flex items-center gap-3.5 py-3.5 text-left transition first:pt-2 hover:bg-white/[0.02]">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition group-hover:bg-accent/10" style={{ background: "rgba(255,255,255,.045)" }}>{icon}</div>
                <div className="min-w-0 flex-1">
                  <b className="block truncate text-[13.5px] font-bold text-white">{t}</b>
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
