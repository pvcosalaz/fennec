"use client";

import { useEffect, useState, useMemo } from "react";
import { Calculator, FileText, FolderOpen, Users, ArrowRight, Lock } from "lucide-react";
import {
  type Project, type Quote, type Client,
  formatCOP, computePricing,
} from "@/lib/pricingData";
import { getProjects, getQuotes, getClients } from "@/lib/businessDb";

export type BusinessView = "hub" | "calculator" | "quotes" | "projects" | "clients";

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
  const revenue      = useMemo(() => revenueThisMonth(projects), [projects]);
  const activeCount  = useMemo(() => projects.filter((p) => p.status !== "paid").length, [projects]);
  const quotesCount  = useMemo(() => quotes.filter((q) => q.status === "sent").length, [quotes]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 pb-4 px-4">

      {/* ── Header ── */}
      <div className="space-y-1">
        <p className="text-[10px] font-semibold tracking-[0.3em] text-accent uppercase">Business Hub</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">Run your business.</h1>
        <p className="mt-2 text-sm text-zinc-400">Price, quote, track — all in one place.</p>
      </div>

      {/* ── Pricing Calculator — hero ── */}
      <button
        onClick={() => onOpenView("calculator")}
        className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80 transition-colors overflow-hidden text-left"
      >
        <div className="p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
            <Calculator size={22} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-white">Pricing Calculator</p>
            <p className="text-xs text-zinc-500 mt-0.5">Know your rate before saying yes to any project.</p>
          </div>
          <ArrowRight size={16} className="text-zinc-600 shrink-0" />
        </div>
        {monthlyTarget > 0 && (
          <div className="px-4 pb-4 space-y-1.5">
            <div className="flex justify-between text-[10px] text-zinc-600">
              <span>Monthly target</span>
              <span>{formatCOP(monthlyTarget)}</span>
            </div>
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-700"
                style={{ width: `${monthlyTarget > 0 ? Math.min((revenue / monthlyTarget) * 100, 100) : 0}%` }}
              />
            </div>
          </div>
        )}
      </button>

      {/* ── Quotes + Projects — 2 columns ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Quotes */}
        <button
          onClick={() => isPro ? onOpenView("quotes") : undefined}
          className="rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80 transition-colors text-left p-4 space-y-3 relative overflow-hidden"
        >
          {!isPro && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px] rounded-2xl z-10">
              <Lock size={14} className="text-zinc-500" />
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <FileText size={16} className="text-zinc-300" />
            </div>
            <span className="text-2xl font-black text-white">{quotesCount}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Quotes</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Sent this month</p>
          </div>
        </button>

        {/* Active Projects */}
        <button
          onClick={() => isPro ? onOpenView("projects") : undefined}
          className="rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80 transition-colors text-left p-4 space-y-3 relative overflow-hidden"
        >
          {!isPro && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px] rounded-2xl z-10">
              <Lock size={14} className="text-zinc-500" />
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <FolderOpen size={16} className="text-zinc-300" />
            </div>
            <span className="text-2xl font-black text-white">{activeCount}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Projects</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Active right now</p>
          </div>
        </button>
      </div>

      {/* ── Clients & Leads — full width ── */}
      <button
        onClick={() => isPro ? onOpenView("clients") : undefined}
        className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80 transition-colors text-left p-4 relative overflow-hidden"
      >
        {!isPro && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px] rounded-2xl z-10">
            <div className="flex items-center gap-1.5 bg-amber-400 text-black text-xs font-bold px-3 py-1.5 rounded-full">
              <Lock size={12} /> Unlock Pro
            </div>
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
            <Users size={18} className="text-zinc-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Clients & Leads</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {clients.length > 0 ? `${clients.length} contact${clients.length !== 1 ? "s" : ""}` : "Your contacts and prospects"}
            </p>
          </div>
          <ArrowRight size={16} className="text-zinc-600 shrink-0" />
        </div>
      </button>

      {/* ── Revenue summary — contextual, at the bottom ── */}
      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest">This month</p>
          <p className="text-xl font-black text-white mt-0.5">
            {revenue > 0 ? formatCOP(revenue) : "$0"}
          </p>
        </div>
        <p className="text-[10px] text-zinc-700">Revenue</p>
      </div>

    </div>
  );
}
