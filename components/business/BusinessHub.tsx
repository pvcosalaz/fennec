"use client";

import { useEffect, useState, useMemo } from "react";
import {
  type Project, type Quote, type Client,
  formatCOP, computePricing, paymentsTotal,
  totalsByCurrency, formatCurrencyTotals,
} from "@/lib/pricingData";
import { formatMoney, useCurrency, type Currency } from "@/lib/currency";
import { getProjects, getQuotes, getClients } from "@/lib/businessDb";
import NetworkHero from "@/components/remotion/NetworkHero";
import {
  PricingCalculatorCard,
  ClientsCard,
  QuotesCard,
  ProjectsCard,
} from "@/components/remotion/BusinessToolCards";
import { useIsDesktop } from "@/lib/useIsDesktop";
import BusinessHubDesktop from "./BusinessHubDesktop";

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

/* Revenue = money actually received, in the month it landed.
   It used to mean "price of projects flagged paid, filed under the month the
   PROJECT WAS CREATED" — so a job started in March and paid in July showed up
   as March revenue, and a deposit on an open job showed as nothing at all.
   Payments carry their own date, so the chart can finally be honest
   (Paco 2026-08-01). */
/** Payments that landed in a given month, still split by their own currency. */
function revenueTotalsForMonth(projects: Project[], month: number, year: number, fallback: Currency) {
  return totalsByCurrency(
    projects.map((p) => {
      const inMonth = (p.payments ?? []).filter((pay) => {
        const d = new Date(`${pay.date}T00:00:00`);
        return d.getMonth() === month && d.getFullYear() === year;
      });
      return { amount: paymentsTotal(inMonth), currency: p.currency };
    }),
    fallback,
  );
}

/* A bar chart can only plot one currency; stacking MXN on USD would draw a
   height that means nothing. So the chart reports in whichever currency the
   producer has actually been paid in most, and the hero names the rest
   underneath rather than folding them in (Paco 2026-08-01). */
function revenueForMonth(projects: Project[], month: number, year: number, currency: Currency) {
  return revenueTotalsForMonth(projects, month, year, currency)
    .filter((t) => t.currency === currency)
    .reduce((s, t) => s + t.amount, 0);
}

/** The currency most money has arrived in. Ties go to the app setting. */
function reportingCurrency(projects: Project[], fallback: Currency): Currency {
  const totals = totalsByCurrency(
    projects.map((p) => ({ amount: paymentsTotal(p.payments), currency: p.currency })),
    fallback,
  );
  return totals[0]?.currency ?? fallback;
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

function revenueThisMonth(projects: Project[], currency: Currency) {
  const now = new Date();
  return revenueForMonth(projects, now.getMonth(), now.getFullYear(), currency);
}

type Props = {
  onOpenView: (view: BusinessView, opts?: { create?: boolean }) => void;
  userId: string;
};

export default function BusinessHub({ onOpenView, userId }: Props) {
  const isDesktop = useIsDesktop();
  const [projects, setProjects] = useState<Project[]>([]);
  const [quotes,   setQuotes]   = useState<Quote[]>([]);
  const [clients,  setClients]  = useState<Client[]>([]);

  useEffect(() => {
    Promise.all([getProjects(userId), getQuotes(userId), getClients(userId)]).then(
      ([p, q, c]) => { setProjects(p); setQuotes(q); setClients(c); }
    );
  }, [userId]);

  const { monthlyTarget } = computePricing();
  const appCurrency = useCurrency();
  /** What the chart and the hero report in. See reportingCurrency. */
  const reportCcy   = useMemo(() => reportingCurrency(projects, appCurrency), [projects, appCurrency]);
  const revenue     = useMemo(() => revenueThisMonth(projects, reportCcy), [projects, reportCcy]);
  const months      = useMemo(() => getLastNMonths(6), []);
  const revenues    = useMemo(
    () => months.map((m) => revenueForMonth(projects, m.month, m.year, reportCcy)),
    [projects, months, reportCcy]);
  /** Money that landed this month in any OTHER currency, named not folded in. */
  const revenueExtra = useMemo(() => {
    const now = new Date();
    const others = revenueTotalsForMonth(projects, now.getMonth(), now.getFullYear(), appCurrency)
      .filter((t) => t.currency !== reportCcy);
    return others.length ? formatCurrencyTotals(others, appCurrency).value : null;
  }, [projects, reportCcy, appCurrency]);

  // Desktop: enterprise layout (same data, band/table render)
  if (isDesktop) {
    return (
      <BusinessHubDesktop
        projects={projects} quotes={quotes} clients={clients}
        revenue={revenue} months={months} revenues={revenues}
        revenueCurrency={reportCcy} revenueExtra={revenueExtra}
        onOpenView={onOpenView}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl flex flex-col flex-1 gap-3 px-4 pb-3">

      {/* ── Header ── */}
      <div className="flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <p className="text-[10px] font-bold tracking-[0.18em] text-accent/70 uppercase flex-shrink-0">Business Hub</p>
          <div className="h-px flex-1 bg-gradient-to-r from-accent/20 to-transparent" />
        </div>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white">Run your music business.</h1>
        <p className="mt-1.5 text-sm text-zinc-500 leading-relaxed">Projects, quotes, clients, and the revenue they bring in.</p>
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
              {revenue > 0 ? formatMoney(revenue, reportCcy) : formatMoney(0, reportCcy)}
            </p>
            {revenueExtra && (
              <p className="mt-0.5 text-[10px] text-zinc-600">+ {revenueExtra}</p>
            )}
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

        {/* Quotes — FREE. The whole Business hub is free; the only paywall is
            the calculator's exact-price reveal. Free CRM tools build data
            lock-in and let people live the quote-to-cash loop before Pro. */}
        <button
          type="button"
          onClick={() => onOpenView("quotes")}
          className="relative h-full rounded-2xl overflow-hidden active:scale-[0.97] transition-transform duration-150"
        >
          <QuotesCard />
        </button>

        {/* Clients & Leads — FREE */}
        <button
          type="button"
          onClick={() => onOpenView("clients")}
          className="relative h-full rounded-2xl overflow-hidden active:scale-[0.97] transition-transform duration-150"
        >
          <ClientsCard />
        </button>

      </div>

    </div>
  );
}
