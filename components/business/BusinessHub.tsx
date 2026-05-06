"use client";

import { useEffect, useState, useMemo } from "react";
import { Calculator, FileText, FolderOpen, Users, ArrowRight, Lock } from "lucide-react";
import {
  PROJECTS_STORAGE_KEY, QUOTES_STORAGE_KEY, CLIENTS_STORAGE_KEY,
  type Project, type Quote, type Client,
  formatCOP, computePricing,
} from "@/lib/pricingData";

export type BusinessView = "hub" | "calculator" | "quotes" | "projects" | "clients";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLastNMonths(n: number) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return {
      month: d.getMonth(), year: d.getFullYear(),
      label: d.toLocaleString("en-US", { month: "short" }),
      isCurrent: i === n - 1,
    };
  });
}

function revenueForMonth(projects: Project[], month: number, year: number) {
  return projects
    .filter((p) => p.status === "paid" && (() => { const d = new Date(p.createdAt); return d.getMonth() === month && d.getFullYear() === year; })())
    .reduce((s, p) => s + p.price, 0);
}

// ─── Equalizer bars ───────────────────────────────────────────────────────────

function EqualizerBars({ months, revenues }: { months: ReturnType<typeof getLastNMonths>; revenues: number[] }) {
  const [up, setUp] = useState(false);
  useEffect(() => { const t = setTimeout(() => setUp(true), 150); return () => clearTimeout(t); }, []);
  const max = Math.max(...revenues, 1);

  return (
    <div className="flex items-end gap-1.5" style={{ height: 100 }}>
      {months.map((m, i) => {
        const hasRev = revenues[i] > 0;
        const pct = hasRev ? Math.max((revenues[i] / max) * 100, 10) : 3;
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <div className="relative w-full flex items-end rounded-lg overflow-hidden bg-white/[0.04]" style={{ height: 76 }}>
              <div
                className={`w-full rounded-lg transition-all duration-700 ease-out ${m.isCurrent ? "bg-accent" : "bg-white/15"}`}
                style={{
                  height: up ? `${pct}%` : "0%",
                  transitionDelay: `${i * 55}ms`,
                  boxShadow: m.isCurrent && hasRev ? "0 0 16px rgba(245,166,35,0.45)" : "none",
                }}
              />
            </div>
            <span className={`text-[10px] font-medium ${m.isCurrent ? "text-accent" : "text-zinc-700"}`}>
              {m.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Project track ────────────────────────────────────────────────────────────

const TRACK_COLORS = ["#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff", "#c77dff", "#ff9f43"];
const STATUS_PROGRESS: Record<string, number> = { in_progress: 28, review: 55, delivered: 80, paid: 100 };

function ProjectTrack({ project, color }: { project: Project; color: string }) {
  const [up, setUp] = useState(false);
  useEffect(() => { const t = setTimeout(() => setUp(true), 300); return () => clearTimeout(t); }, []);
  const progress = STATUS_PROGRESS[project.status] ?? 25;
  const isPaid = project.status === "paid";

  return (
    <div className="flex items-center gap-3">
      <div className="h-9 w-1 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-white truncate">{project.name}</p>
          <span className={`text-[10px] shrink-0 font-medium ${isPaid ? "text-emerald-400" : "text-zinc-600"}`}>
            {isPaid ? "✓ Paid" : project.status.replace("_", " ")}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{ width: up ? `${progress}%` : "0%", backgroundColor: color, boxShadow: `0 0 8px ${color}50` }}
          />
        </div>
        {project.clientName && <p className="text-[10px] text-zinc-700 truncate">{project.clientName}</p>}
      </div>
      <p className="text-xs font-semibold text-zinc-500 shrink-0">{formatCOP(project.price)}</p>
    </div>
  );
}

type Tool = {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  description: string;
  status: "available" | "coming_soon";
  view?: BusinessView;
  pro?: boolean;
};

type BusinessHubProps = {
  onOpenView: (view: BusinessView) => void;
  isPro?: boolean;
};

export default function BusinessHub({ onOpenView, isPro = false }: BusinessHubProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [quotes,   setQuotes]   = useState<Quote[]>([]);
  const [clients,  setClients]  = useState<Client[]>([]);

  useEffect(() => {
    try {
      const p = localStorage.getItem(PROJECTS_STORAGE_KEY);
      const q = localStorage.getItem(QUOTES_STORAGE_KEY);
      const c = localStorage.getItem(CLIENTS_STORAGE_KEY);
      if (p) setProjects(JSON.parse(p));
      if (q) setQuotes(JSON.parse(q));
      if (c) setClients(JSON.parse(c));
    } catch {}
  }, []);

  const { monthlyTarget } = computePricing();
  const months   = useMemo(() => getLastNMonths(6), []);
  const revenues = useMemo(() => months.map((m) => revenueForMonth(projects, m.month, m.year)), [projects, months]);
  const revenueThisMonth = revenues[revenues.length - 1] ?? 0;
  const targetPct = monthlyTarget > 0 ? Math.min((revenueThisMonth / monthlyTarget) * 100, 100) : 0;
  const trackedProjects = projects.slice(0, 5);

  const activeProjects  = projects.filter((p) => p.status !== "paid");
  const quotesSent      = quotes.filter((q) => q.status === "sent").length;

  const [tab, setTab] = useState<"dashboard" | "tools">("dashboard");

  const tools: Tool[] = [
    {
      icon: Calculator,
      name: "Pricing Calculator",
      description: "Know your minimum rate for any project.",
      status: "available",
      view: "calculator",
    },
    {
      icon: FileText,
      name: "Quote Generator",
      description: "Send professional quotes to clients in seconds.",
      status: "available",
      view: "quotes",
      pro: true,
    },
    {
      icon: FolderOpen,
      name: "Active Projects",
      description: "Track productions, deadlines and deliverables.",
      status: "available",
      view: "projects",
      pro: true,
    },
    {
      icon: Users,
      name: "Clients & Leads",
      description: "Your contacts, prospects and client history.",
      status: "available",
      view: "clients",
      pro: true,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl -mt-6">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="px-2 pt-2 pb-4 space-y-1">
        <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">Business Hub</p>
        <h1 className="text-3xl font-bold tracking-tight text-white">Run your business.</h1>
        <p className="text-sm text-zinc-400">Price, quote, track — all in one place.</p>
      </div>

      {/* ── Tab switcher — same style as Community ────────────────────────── */}
      <div className="flex border-b border-white/10 mt-1 mb-6">
        <button
          onClick={() => setTab("dashboard")}
          className={`flex flex-1 items-center justify-center py-3.5 text-sm font-semibold transition-all relative ${
            tab === "dashboard" ? "text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
          }`}
        >
          Dashboard
          {tab === "dashboard" && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[3px] rounded-full bg-amber-500" />
          )}
        </button>
        <button
          onClick={() => setTab("tools")}
          className={`flex flex-1 items-center justify-center py-3.5 text-sm font-semibold transition-all relative ${
            tab === "tools" ? "text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
          }`}
        >
          Tools
          {tab === "tools" && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[3px] rounded-full bg-amber-500" />
          )}
        </button>
      </div>

      <div className="px-2 space-y-6">

      {/* ── Dashboard tab ────────────────────────────────────────────────── */}
      {tab === "dashboard" && (<>
        {/* Monthly revenue */}
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Monthly Revenue</p>
              <p className="text-3xl font-black tracking-tighter text-white mt-1">
                {revenueThisMonth > 0 ? formatCOP(revenueThisMonth) : "$0"}
              </p>
            </div>
            <p className="text-[10px] text-zinc-700">6 months</p>
          </div>
          {monthlyTarget > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-zinc-700">
                <span>Target {formatCOP(monthlyTarget)}</span>
                <span>{Math.round(targetPct)}%</span>
              </div>
              <div className="h-0.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full transition-all duration-1000" style={{ width: `${targetPct}%` }} />
              </div>
            </div>
          )}
          <EqualizerBars months={months} revenues={revenues} />
        </div>

        {/* Stats row */}
        {isPro && (
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/5">
            <button onClick={() => onOpenView("projects")} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4 text-center hover:bg-white/10 transition space-y-1">
              <p className="text-2xl font-black text-white">{activeProjects.length}</p>
              <p className="text-[10px] text-zinc-500">Active</p>
            </button>
            <button onClick={() => onOpenView("quotes")} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4 text-center hover:bg-white/10 transition space-y-1">
              <p className="text-2xl font-black text-white">{quotesSent}</p>
              <p className="text-[10px] text-zinc-500">Quotes sent</p>
            </button>
            <button onClick={() => onOpenView("clients")} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4 text-center hover:bg-white/10 transition space-y-1">
              <p className="text-2xl font-black text-white">{clients.length}</p>
              <p className="text-[10px] text-zinc-500">Clients</p>
            </button>
          </div>
        )}

        {/* Active projects */}
        {trackedProjects.length > 0 && (
          <div className="pt-2 space-y-4 border-t border-white/5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Active Sessions</p>
              {isPro && <button onClick={() => onOpenView("projects")} className="text-[10px] text-accent hover:underline">See all →</button>}
            </div>
            <div className="space-y-4">
              {trackedProjects.map((p, i) => (
                <ProjectTrack key={p.id} project={p} color={TRACK_COLORS[i % TRACK_COLORS.length]} />
              ))}
            </div>
          </div>
        )}

        {trackedProjects.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center space-y-2">
            <p className="text-sm text-zinc-500">No active projects yet.</p>
            <button onClick={() => setTab("tools")} className="text-xs text-accent hover:underline">
              Go to Tools →
            </button>
          </div>
        )}
      </>)}

      {/* ── Tools tab ────────────────────────────────────────────────────── */}
      {tab === "tools" && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 pb-2">Your workflow</p>

          {[
            {
              step: 1, view: "calculator" as BusinessView, icon: Calculator,
              name: "Pricing Calculator",
              desc: "Know your minimum rate before saying yes to any music production.",
              badge: isPro ? null : "Free", pro: false,
            },
            {
              step: 2, view: "clients" as BusinessView, icon: Users,
              name: "Clients & Leads",
              desc: "Register your contacts so they're ready when you generate a quote.",
              badge: null, pro: true,
              fakePreview: (
                <div className="space-y-2 mt-1" style={{ filter: "blur(1.5px)", opacity: 0.8 }}>
                  {[
                    { name: "A. Rodriguez", co: "Sony Music Publishing LA" },
                    { name: "M. Chen",      co: "Netflix Original Music" },
                    { name: "C. Williams",  co: "Universal Music Group" },
                  ].map((c) => (
                    <div key={c.name} className="flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2">
                      <div className="w-7 h-7 rounded-full bg-accent/30 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-white">{c.name}</p>
                        <p className="text-[10px] text-zinc-500">{c.co}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ),
            },
            {
              step: 3, view: "quotes" as BusinessView, icon: FileText,
              name: "Quote Generator",
              desc: "Send a professional quote to your client. Once sent, it becomes an active project.",
              badge: null, pro: true,
              fakePreview: (
                <div className="space-y-2 mt-1" style={{ filter: "blur(1.5px)", opacity: 0.8 }}>
                  {[
                    { title: "Original Score · 90 sec", client: "Netflix · A. Rodriguez", price: "$4,500", status: "Sent ✓", sc: "text-emerald-400" },
                    { title: "Sync License · Ad 30s",   client: "Sony · M. Chen",         price: "$1,800", status: "Pending",  sc: "text-amber-400"  },
                  ].map((q) => (
                    <div key={q.title} className="rounded-xl bg-white/5 px-3 py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{q.title}</p>
                        <p className="text-[10px] text-zinc-500 truncate">{q.client}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-accent">{q.price}</p>
                        <p className={`text-[10px] font-semibold ${q.sc}`}>{q.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ),
            },
            {
              step: 4, view: "projects" as BusinessView, icon: FolderOpen,
              name: "Active Projects",
              desc: "Track every production — status, deadlines and deliverables.",
              badge: null, pro: true,
              fakePreview: (
                <div className="space-y-2 mt-1" style={{ filter: "blur(1.5px)", opacity: 0.8 }}>
                  {[
                    { name: "Netflix Score S2", pct: 65,  status: "In production" },
                    { name: "Sony Sync Pack",   pct: 85,  status: "Mixing" },
                    { name: "Ad Campaign · BB", pct: 100, status: "Delivered" },
                  ].map((p) => (
                    <div key={p.name} className="space-y-1.5">
                      <div className="flex justify-between">
                        <p className="text-[10px] text-zinc-300">{p.name}</p>
                        <p className="text-[10px] text-zinc-500">{p.status}</p>
                      </div>
                      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${p.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ),
            },
          ].map((tool, idx, arr) => {
            const isLocked = tool.pro && !isPro;
            const Icon = tool.icon;
            return (
              <div key={tool.step}>
                {/* Step card */}
                <div className="rounded-2xl border border-white/10 overflow-hidden relative">
                  <div className={isLocked ? "select-none pointer-events-none" : ""}>
                    {/* Header row — always visible */}
                    <button
                      onClick={() => !isLocked && onOpenView(tool.view)}
                      disabled={isLocked}
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition disabled:cursor-default"
                    >
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                        isLocked ? "bg-white/10 text-zinc-400" : "bg-accent text-black"
                      }`}>{tool.step}</span>
                      <Icon className={`h-4 w-4 shrink-0 ${isLocked ? "text-zinc-600" : "text-accent"}`} />
                      <div className="flex-1 text-left">
                        <p className="text-sm font-semibold text-white">{tool.name}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">{tool.desc}</p>
                      </div>
                      {tool.badge && (
                        <span className="text-[10px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full shrink-0">{tool.badge}</span>
                      )}
                      {!isLocked && !tool.badge && (
                        <ArrowRight className="h-4 w-4 text-zinc-600 shrink-0" />
                      )}
                    </button>

                    {/* Blurred preview — only for locked pro steps */}
                    {isLocked && tool.fakePreview && (
                      <div className="px-4 pb-3">{tool.fakePreview}</div>
                    )}
                  </div>

                  {/* Lock overlay */}
                  {isLocked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                      <button className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 transition text-black text-xs font-bold px-4 py-2 rounded-full shadow-lg shadow-amber-500/30">
                        <Lock className="h-3 w-3" /> Unlock Pro — $9.99/mo
                      </button>
                    </div>
                  )}
                </div>

                {/* Connector arrow between steps */}
                {idx < arr.length - 1 && (
                  <div className="flex justify-center my-1">
                    <div className="w-px h-4 bg-white/10" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
    </div>
  );
}
