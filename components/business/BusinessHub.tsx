"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Calculator, FileText, FolderOpen, Users, ArrowRight, Lock } from "lucide-react";
import {
  type Project, type Quote, type Client,
  formatCOP, computePricing,
} from "@/lib/pricingData";
import { getProjects, getQuotes, getClients } from "@/lib/businessDb";
import NetworkSection from "@/components/network/NetworkSection";
import type { Profile } from "@/lib/communityTypes";

export type BusinessView = "hub" | "calculator" | "quotes" | "projects" | "clients";

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
            <span className={`text-[10px] font-medium ${m.isCurrent ? "text-accent" : "text-zinc-600"}`}>
              {m.label}
            </span>
          </div>
        );
      })}
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
  profile: Profile;
  onColorAssigned: (colorId: string) => void;
};

export default function BusinessHub({ onOpenView, isPro = false, userId, profile, onColorAssigned }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [quotes,   setQuotes]   = useState<Quote[]>([]);
  const [clients,  setClients]  = useState<Client[]>([]);

  useEffect(() => {
    Promise.all([getProjects(userId), getQuotes(userId), getClients(userId)]).then(
      ([p, q, c]) => { setProjects(p); setQuotes(q); setClients(c); }
    );
  }, [userId]);

  const { monthlyTarget } = computePricing();
  const revenue      = useMemo(() => revenueThisMonth(projects), [projects]);
  const activeCount  = useMemo(() => projects.filter((p) => p.status !== "paid").length, [projects]);
  const quotesCount  = useMemo(() => quotes.filter((q) => q.status === "sent").length, [quotes]);
  const months       = useMemo(() => getLastNMonths(6), []);
  const revenues     = useMemo(() => months.map((m) => revenueForMonth(projects, m.month, m.year)), [projects, months]);

  return (
    <div className="mx-auto w-full max-w-4xl flex flex-col gap-5 pb-4 px-4">

      {/* ── Header ── */}
      <div className="space-y-1">
        <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">Business Hub</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">Run your music business.</h1>
        <p className="mt-2 text-sm text-zinc-400">Price, quote, track your productions.</p>
      </div>

      {/* ── Pricing Calculator — hero ── */}
      <button
        onClick={() => onOpenView("calculator")}
        className="w-full text-left py-3 flex items-center gap-4 border-b border-white/5"
      >
        <div className="h-10 w-10 rounded-xl bg-amber-400/10 flex items-center justify-center shrink-0">
          <Calculator size={20} className="text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">Pricing Calculator</p>
          <p className="text-xs text-zinc-500 mt-0.5">Know your rate before saying yes.</p>
        </div>
        <ArrowRight size={16} className="text-zinc-600 shrink-0" />
      </button>

      {/* ── Quotes + Projects — 2 columns ── */}
      <div className="grid grid-cols-2 gap-6">
        {/* Quotes */}
        <button
          onClick={() => isPro ? onOpenView("quotes") : undefined}
          className="text-left space-y-1 relative"
        >
          {!isPro && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px] rounded-xl z-10">
              <Lock size={14} className="text-zinc-500" />
            </div>
          )}
          <div className="flex items-center justify-between">
            <FileText size={16} className="text-zinc-500" />
            <span className="text-2xl font-black text-white">{quotesCount}</span>
          </div>
          <p className="text-sm font-semibold text-white">Quotes</p>
          <p className="text-xs text-zinc-500">Sent this month</p>
        </button>

        {/* Active Projects */}
        <button
          onClick={() => isPro ? onOpenView("projects") : undefined}
          className="text-left space-y-1 relative"
        >
          {!isPro && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px] rounded-xl z-10">
              <Lock size={14} className="text-zinc-500" />
            </div>
          )}
          <div className="flex items-center justify-between">
            <FolderOpen size={16} className="text-zinc-500" />
            <span className="text-2xl font-black text-white">{activeCount}</span>
          </div>
          <p className="text-sm font-semibold text-white">Projects</p>
          <p className="text-xs text-zinc-500">Active right now</p>
        </button>
      </div>

      {/* ── Clients & Leads ── */}
      <button
        onClick={() => isPro ? onOpenView("clients") : undefined}
        className="w-full text-left py-3 flex items-center gap-3 border-t border-white/5 relative"
      >
        {!isPro && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px] rounded-xl z-10">
            <div className="flex items-center gap-1.5 bg-amber-400 text-black text-xs font-bold px-3 py-1.5 rounded-full">
              <Lock size={12} /> Unlock Pro
            </div>
          </div>
        )}
        <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
          <Users size={18} className="text-zinc-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Clients & Leads</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {clients.length > 0 ? `${clients.length} contact${clients.length !== 1 ? "s" : ""}` : "Your contacts and prospects"}
          </p>
        </div>
        <ArrowRight size={16} className="text-zinc-600 shrink-0" />
      </button>

      {/* ── Revenue summary + bars ── */}
      <div className="space-y-4 pt-2 border-t border-white/5">
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

      {/* ── Network section ── */}
      <div className="border-t border-white/5 pt-4">
        <NetworkSection
          profile={profile}
          userId={userId}
          onColorAssigned={onColorAssigned}
        />
      </div>

    </div>
  );
}
