// Shared types and utilities for the Business module

export const PRICING_STORAGE_KEY  = "fennec-pricing-v1";
export const CLIENTS_STORAGE_KEY  = "fennec-clients-v1";
export const QUOTES_STORAGE_KEY   = "fennec-quotes-v1";
export const PROJECTS_STORAGE_KEY = "fennec-projects-v1";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Client = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  createdAt: number;
};

/** One billable concept inside a quote. Producers quote bundles, not a single
 *  number: a soundtrack + a 1-min variation + a rush premium are three lines
 *  the client needs to see (Paco, quoting a real project 2026-07-31). */
export type QuoteItem = {
  id: string;
  concept: string;
  qty: number;
  unitPrice: number;
  note?: string;
};

export type Quote = {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  projectName: string;
  projectTypeId: string;
  projectTypeName: string;
  minPrice: number;
  recommendedPrice: number;
  /** Line items. Empty on quotes created before the breakdown existed —
   *  read them through `quoteItems()` which migrates those in memory. */
  items: QuoteItem[];
  /** Tax is per-quote and NOT hardcoded to 16%: Fennec has users in Mexico,
   *  Colombia and Argentina, and quoting without tax is legitimate. */
  taxLabel: string;
  taxRate: number;
  /** The currency the quote was WRITTEN in. Frozen at creation so changing
   *  the app-wide setting never rewrites a price a client already saw. */
  currency: Currency;
  /** Derived: subtotal(items) * (1 + taxRate). Kept as a column for fast
   *  list/aggregate queries. */
  finalPrice: number;
  notes: string;
  createdAt: number;
  updatedAt?: number;
  status: "draft" | "sent";
};

/** Items for a quote, migrating legacy ones (no breakdown) to a single line
 *  so every consumer can assume `items` is populated. */
export function quoteItems(q: Quote): QuoteItem[] {
  if (q.items?.length) return q.items;
  return [{
    id: `${q.id}-legacy`,
    concept: q.projectName || q.projectTypeName || "Project",
    qty: 1,
    unitPrice: q.finalPrice,
  }];
}

export const itemsSubtotal = (items: QuoteItem[]) =>
  items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0), 0);

/** subtotal, tax and total for a quote — one place, so the form, the list and
 *  the PDF can never disagree. */
export function quoteTotals(q: Pick<Quote, "items" | "taxRate"> & Partial<Quote>) {
  const subtotal = itemsSubtotal(q.items?.length ? q.items : []);
  const tax = subtotal * (Number(q.taxRate) || 0);
  return { subtotal, tax, total: subtotal + tax };
}

export type ProjectStatus = "in_progress" | "review" | "delivered" | "paid";

export type Project = {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  projectTypeId: string;
  projectTypeName: string;
  price: number;
  deadline: string;       // YYYY-MM-DD
  status: ProjectStatus;
  notes: string;
  quoteId?: string;       // if created from a quote
  createdAt: number;
};

export type ProjectType = {
  id: string;
  label: string;
  multiplier: number;
};

// ─── Project types ────────────────────────────────────────────────────────────

export const projectTypes: ProjectType[] = [
  { id: "corto-estudiantil",       label: "Student short film",          multiplier: 0.5 },
  { id: "corto-profesional",       label: "Professional short film",     multiplier: 2   },
  { id: "largometraje-bajo",       label: "Low-budget feature film",     multiplier: 1.5 },
  { id: "largometraje-medio",      label: "Mid-budget feature film",     multiplier: 2.5 },
  { id: "largometraje-grande",     label: "Large-budget feature film",   multiplier: 4   },
  { id: "serie-tv",                label: "TV series",                   multiplier: 2.5 },
  { id: "documental",              label: "Documentary",                 multiplier: 3   },
  { id: "publi-bajo",              label: "Low-budget advertising",      multiplier: 1.5 },
  { id: "publi-alto",              label: "High-budget advertising",     multiplier: 3   },
  { id: "artista-indie",           label: "Independent artist",          multiplier: 1   },
  { id: "artista-emergente-equipo",label: "Emerging artist with team",   multiplier: 1.5 },
  { id: "artista-firmado",         label: "Signed artist / label",       multiplier: 3   },
  { id: "sync-libreria",           label: "Sync / library composition",  multiplier: 2   },
];

// ─── Formatters ───────────────────────────────────────────────────────────────

/** @deprecated Misleading name kept for call sites: it no longer forces COP,
 *  it formats in the user's chosen currency. Prefer formatMoney directly. */
export const formatCOP = (value: number) => formatMoney(value);

import { formatMoney, type Currency } from "@/lib/currency";

// ─── Pricing computation ──────────────────────────────────────────────────────

const toNum = (v: unknown): number => {
  const n = Number(v ?? "0");
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const sumObj = (obj: unknown): number =>
  Object.values((obj as Record<string, string>) ?? {}).reduce(
    (a, v) => a + toNum(v),
    0,
  );

export function computePricing(): {
  minPricePerProject: number;
  monthlyTarget: number;
  isSetupComplete: boolean;
} {
  if (typeof window === "undefined")
    return { minPricePerProject: 0, monthlyTarget: 0, isSetupComplete: false };

  try {
    const stored = localStorage.getItem(PRICING_STORAGE_KEY);
    if (!stored) return { minPricePerProject: 0, monthlyTarget: 0, isSetupComplete: false };

    const s = JSON.parse(stored) as Record<string, unknown>;

    const base = sumObj(s.personalExpenses) + sumObj(s.studioExpenses);
    const monthly =
      base +
      (base * toNum(s.taxPercent)) / 100 +
      (base * toNum(s.reinvestmentPercent)) / 100 +
      toNum(s.emergencyFund);

    const hours = toNum(s.hoursPerWeek) * toNum(s.weeksPerMonth);
    const hPerProject = toNum(s.hoursPerProject);
    const maxProjects = hPerProject > 0 ? Math.floor(hours / hPerProject) : 0;

    const min = maxProjects > 0 ? monthly / maxProjects : 0;
    const complete = !!s.setupCompleted && monthly > 0 && maxProjects > 0;

    return { minPricePerProject: min, monthlyTarget: monthly, isSetupComplete: complete };
  } catch {
    return { minPricePerProject: 0, monthlyTarget: 0, isSetupComplete: false };
  }
}
