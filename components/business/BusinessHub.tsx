"use client";

import { useEffect, useState, useMemo } from "react";
import { Lock } from "lucide-react";
import {
  type Project, type Quote, type Client,
  formatCOP, computePricing,
} from "@/lib/pricingData";
import { getProjects, getQuotes, getClients } from "@/lib/businessDb";
import NetworkHero from "@/components/remotion/NetworkHero";
import {
  PricingCalculatorCard,
  ClientsCard,
  QuotesCard,
  ProjectsCard,
} from "@/components/remotion/BusinessToolCards";

export type BusinessView = "hub" | "calculator" | "quotes" | "projects" | "clients" | "network";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLastNMonths(n: number) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return {
      month: d.getMonth(),
      year: d.getFullYear(),
      label: d.toLocaleString("en-US", { month: "short" }),
      isCurrent: i === n - 1,
    };
  });
}

function revenueForMonth(projects: Project[], month: number, year: number) {
  return projects
    .filter((p) => {
      if (p.status !== "paid") return false;
      const d = new Date(p.createdAt);
      return d.getMonth() === month && d.getFullYear() === year;
    })
    .reduce((s, p) => s + p.price, 0);
}

function EqualizerBars({ months, revenues }: { months: ReturnType<typeof getLastNMonths>; revenues: number[] }) {
  const [up, setUp] = useState(false);
  useEffect(() => { const t = setTimeout(() => setUp(true), 150); return () => clearTimeout(t); }, []);
  const max = Math.max(...revenues, 1);

  return (
    <div className="flex flex-col gap-1.5">
      {/* Bars */}
      <div className="flex items-end gap-1.5" style={{ height: 48 }}>
        {months.map((m, i) => {
          const pct = revenues[i] > 0 ? Math.max((revenues[i] / max) * 100, 10) : 0;
          return (
            <div key={i} className="flex-1 flex flex-col justify-end" style={{ height: "100%" }}>
              <div
                className={`w-full rounded-sm transition-all ease-out ${m.isCurrent ? "bg-accent" : "bg-white/15"}`}
                style={{
                  height: up ? (pct > 0 ? `${pct}%` : "4px") : "4px",
                  minHeight: "4px",
                  transitionDuration: "1400ms",
                  transitionDelay: `${i * 120}ms`,
                }}
              />
            </div>
          );
        })}
      </div>
      {/* Labels */}
      <div className="flex gap-1.5">
        {months.map((m, i) => (
          <span key={i} className={`flex-1 text-center text-[10px] font-medium ${m.isCurrent ? "text-accent" : "text-zinc-600"}`}>
            {m.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function revenueThisMonth(projects: Project[]) {
  const now = new Date();
  return projects
    .filter((p) => {
      if (p.status !== "paid") return false;
      const d = new Date(p.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, p) => s + p.price, 0);
}

type Props = {
  onOpenView: (view: BusinessView) => void;
  isPro?: boolean;
  userId: string;
  onUpgrade?: () => void;
};

export default function BusinessHub({ onOpenView, isPro = false, userId, onUpgrade }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [quotes,   setQuotes]   = useState<Quote[]>([]);
  const [clients,  setClients]  = useState<Client[]>([]);

  useEffect(() => {
    Promise.all([getProjects(userId), getQuotes(userId), getClients(userId)]).then(
      ([p, q, c]) => { setProjects(p); setQuotes(q); setClients(c); }
    );
  }, [userId]);

  const { monthlyTarget } = computePricing();
  const revenue     = useMemo(() => revenueThisMonth(projects), [projects]);
  const months      = useMemo(() => getLastNMonths(6), []);
  const revenues    = useMemo(() => months.map((m) => revenueForMonth(projects, m.month, m.year)), [projects, months]);

  return (
    <div className="mx-auto w-full max-w-4xl flex flex-col flex-1 gap-3 px-4 pb-3">

      {/* ── Header ── */}
      <div className="flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <p className="text-[10px] font-bold tracking-[0.18em] text-accent/70 uppercase flex-shrink-0">Business Hub</p>
          <div className="h-px flex-1 bg-gradient-to-r from-accent/20 to-transparent" />
        </div>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white">Run your music business.</h1>
        <p className="mt-1.5 text-sm text-zinc-500 leading-relaxed">Projects, quotes, clients — and the revenue they bring in.</p>
      </div>

      {/* ── Revenue this month + bars ── */}
      <div className="relative flex-shrink-0 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-3 overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-8 h-24"
          style={{ background: "radial-gradient(ellipse 60% 100% at 50% 0%, rgba(245,166,35,0.06), transparent 70%)" }} />
        <div className="relative flex items-end justify-between">
          <div>
            <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Revenue · This month</p>
            <p className="text-[26px] leading-tight font-black tabular-nums tracking-tight mt-0.5"
               style={{
                 background: "linear-gradient(180deg, #ffffff 0%, #d4d4d8 100%)",
                 WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
               }}>
              {revenue > 0 ? formatCOP(revenue) : "$0"}
            </p>
          </div>
          <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-[0.2em] pb-1">Last 6 months</p>
        </div>
        <EqualizerBars months={months} revenues={revenues} />
      </div>

      {/* ── My Network — animated hero ── */}
      <button
        type="button"
        onClick={() => onOpenView("network")}
        className="relative flex-shrink-0 w-full rounded-2xl overflow-hidden ring-1 ring-white/[0.06] active:scale-[0.985] transition-transform duration-150"
        style={{ height: 130 }}
      >
        <NetworkHero />
      </button>

      {/* ── Tool grid: 2×2 — grows to fill remaining height ── */}
      <div className="grid grid-cols-2 grid-rows-2 gap-2 flex-1" style={{ minHeight: 200 }}>

        {/* Pricing Calculator */}
        <button
          type="button"
          onClick={() => onOpenView("calculator")}
          className="relative h-full rounded-2xl overflow-hidden active:scale-[0.97] transition-transform duration-150"
        >
          <PricingCalculatorCard />
        </button>

        {/* Active Projects — FREE (entry point that connects calculator → real projects) */}
        <button
          type="button"
          onClick={() => onOpenView("projects")}
          className="relative h-full rounded-2xl overflow-hidden active:scale-[0.97] transition-transform duration-150"
        >
          <ProjectsCard />
        </button>

        {/* Quotes */}
        <button
          type="button"
          onClick={() => isPro ? onOpenView("quotes") : onUpgrade?.()}
          className="relative h-full rounded-2xl overflow-hidden active:scale-[0.97] transition-transform duration-150"
        >
          {!isPro && (
            <>
              <div className="absolute inset-0 z-10 rounded-2xl" style={{ background: "rgba(8,6,2,0.28)" }} />
              <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-accent text-black text-[9px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_12px_rgba(245,166,35,0.45)]">
                <Lock size={9} /> Pro
              </div>
            </>
          )}
          <QuotesCard />
        </button>

        {/* Clients & Leads — PRO */}
        <button
          type="button"
          onClick={() => isPro ? onOpenView("clients") : onUpgrade?.()}
          className="relative h-full rounded-2xl overflow-hidden active:scale-[0.97] transition-transform duration-150"
        >
          {!isPro && (
            <>
              <div className="absolute inset-0 z-10 rounded-2xl" style={{ background: "rgba(8,6,2,0.28)" }} />
              <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-accent text-black text-[9px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_12px_rgba(245,166,35,0.45)]">
                <Lock size={9} /> Pro
              </div>
            </>
          )}
          <ClientsCard />
        </button>

      </div>

    </div>
  );
}
