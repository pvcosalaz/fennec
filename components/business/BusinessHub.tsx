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
};

export default function BusinessHub({ onOpenView, isPro = false, userId }: Props) {
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
    <div className="mx-auto w-full max-w-4xl flex flex-col h-full px-4">

      {/* ── Top group: header + hero + grid ── */}
      <div className="flex flex-col gap-3">

      {/* ── Header ── */}
      <div>
        <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">Business Hub</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white">Run your music business.</h1>
        <p className="mt-2 text-sm text-zinc-400">Gestiona proyectos, cotizaciones, clientes y calcula tus ingresos musicales.</p>
      </div>

      {/* ── Revenue this month + bars ── */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">This month</p>
            <p className="text-xl font-black text-white mt-0.5">
              {revenue > 0 ? formatCOP(revenue) : "$0"}
            </p>
          </div>
          <p className="text-xs text-zinc-500">Revenue</p>
        </div>
        <EqualizerBars months={months} revenues={revenues} />
      </div>

      {/* ── My Network — animated hero ── */}
      <button
        type="button"
        onClick={() => onOpenView("network")}
        className="relative w-full rounded-2xl overflow-hidden"
        style={{ height: 130 }}
      >
        <NetworkHero />
      </button>

      {/* ── Tool grid: 2×2 ── */}
      <div className="grid grid-cols-2 gap-2">

        {/* Pricing Calculator */}
        <button
          type="button"
          onClick={() => onOpenView("calculator")}
          className="relative rounded-2xl overflow-hidden"
          style={{ height: 90 }}
        >
          <PricingCalculatorCard />
        </button>

        {/* Clients & Leads */}
        <button
          type="button"
          onClick={() => isPro ? onOpenView("clients") : undefined}
          className="relative rounded-2xl overflow-hidden"
          style={{ height: 90 }}
        >
          {!isPro && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-[2px] rounded-2xl">
              <div className="flex items-center gap-1.5 bg-accent text-black text-[10px] font-bold px-2.5 py-1 rounded-full">
                <Lock size={10} /> Pro
              </div>
            </div>
          )}
          <ClientsCard />
        </button>

        {/* Quotes */}
        <button
          type="button"
          onClick={() => isPro ? onOpenView("quotes") : undefined}
          className="relative rounded-2xl overflow-hidden"
          style={{ height: 90 }}
        >
          {!isPro && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-[2px] rounded-2xl">
              <div className="flex items-center gap-1.5 bg-accent text-black text-[10px] font-bold px-2.5 py-1 rounded-full">
                <Lock size={10} /> Pro
              </div>
            </div>
          )}
          <QuotesCard />
        </button>

        {/* Active Projects */}
        <button
          type="button"
          onClick={() => isPro ? onOpenView("projects") : undefined}
          className="relative rounded-2xl overflow-hidden"
          style={{ height: 90 }}
        >
          {!isPro && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-[2px] rounded-2xl">
              <div className="flex items-center gap-1.5 bg-accent text-black text-[10px] font-bold px-2.5 py-1 rounded-full">
                <Lock size={10} /> Pro
              </div>
            </div>
          )}
          <ProjectsCard />
        </button>

      </div>

      </div>{/* end top group */}

    </div>
  );
}
