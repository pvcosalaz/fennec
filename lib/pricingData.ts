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
  /* The pipeline, stage 1–2 (stages 3–5 live on the Project it becomes):
       draft    · written, not sent
       sent     · in the client's hands, waiting
       approved · client said yes — this is the ONLY thing that starts a project
       declined · client passed
     Every hop is a manual action. Sending a quote used to auto-create an
     active project, so quotes nobody had paid on counted as revenue in
     progress (Paco 2026-08-01). */
  status: QuoteStatus;
  approvedAt?: number;
  /** The project this quote became, if any. Guards against creating two. */
  projectId?: string;
};

export type QuoteStatus = "draft" | "sent" | "approved" | "declined";

export const QUOTE_STATUS_META: Record<QuoteStatus, { label: string; color: string; bg: string }> = {
  draft:    { label: "Draft",    color: "text-zinc-400",    bg: "bg-white/5"          },
  sent:     { label: "Sent",     color: "text-amber-400",   bg: "bg-amber-400/10"     },
  approved: { label: "Approved", color: "text-emerald-400", bg: "bg-emerald-400/10"   },
  declined: { label: "Declined", color: "text-red-400",     bg: "bg-red-400/10"       },
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

/** One thing you owe the client. Born from the approved quote's line items:
 *  what you charged for IS what you have to hand in, so the two can never
 *  drift apart. */
export type Deliverable = {
  id: string;
  concept: string;
  qty: number;
  done: boolean;
  doneAt?: number;
};

/** Money actually received. A composer gets paid in pieces (deposit, midway,
 *  on delivery), and "did they pay the deposit?" was invisible — the board
 *  showed one number that couldn't tell owed from collected (Paco 2026-08-01). */
export type Payment = {
  id: string;
  amount: number;
  date: string;        // YYYY-MM-DD
  label: string;       // "Deposit", "Second installment", "Final"
};

/** A track the client sent as "make it like this". The single most important
 *  artifact of a scoring job, and until now it lived in WhatsApp. */
export type ProjectReference = {
  id: string;
  url: string;
  title: string;
  /** WHY it was sent. "Like this" is useless three weeks later; "the drums,
   *  not the vocal" is what you actually need at 2am. */
  note: string;
};

export type ProjectBrief = {
  references: ProjectReference[];
  genre: string;
  mood: string;
  instrumentation: string;
  tempo: string;
  musicalKey: string;
  /** "60s, 30s, 15s, stems, instrumental" — free text on purpose: every
   *  agency names their cutdowns differently. */
  formats: string;
};

export const EMPTY_BRIEF: ProjectBrief = {
  references: [], genre: "", mood: "", instrumentation: "",
  tempo: "", musicalKey: "", formats: "",
};

export type Project = {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  projectTypeId: string;
  projectTypeName: string;
  price: number;
  /** Frozen like a quote's: changing the app-wide setting must never rewrite
   *  what a past project was worth. */
  currency?: Currency;
  deadline: string;       // YYYY-MM-DD
  status: ProjectStatus;
  notes: string;
  deliverables: Deliverable[];
  payments: Payment[];
  brief: ProjectBrief;
  quoteId?: string;       // if created from a quote
  createdAt: number;
};

// ─── Project derivations ──────────────────────────────────────────────────────

/** The approved quote's line items become the project's checklist. */
export function deliverablesFromQuote(q: Quote): Deliverable[] {
  return quoteItems(q).map((it) => ({
    id: `${it.id}-d`,
    concept: it.concept,
    qty: it.qty,
    done: false,
  }));
}

export const paymentsTotal = (payments: Payment[] = []) =>
  payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

/** price / collected / pending, in one place so the card, the detail view and
 *  the summary strip can never disagree. */
export function projectMoney(p: Pick<Project, "price" | "payments">) {
  const price = Number(p.price) || 0;
  const collected = paymentsTotal(p.payments);
  return { price, collected, pending: Math.max(0, price - collected) };
}

export const deliverableProgress = (d: Deliverable[] = []) => ({
  done: d.filter((x) => x.done).length,
  total: d.length,
});

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

/**
 * Adopt the account's cloud pricing when this device doesn't have a complete
 * setup yet. computePricing() reads localStorage synchronously, so a consumer
 * that mounts before the cloud hydrates would decide "not set up" on a device
 * where the user simply hasn't opened the calculator (Paco 2026-08-01: set it
 * up on his phone, got blocked on the desktop mid-quote).
 *
 * Returns the freshly computed pricing so callers can just setState with it.
 */
export async function syncPricingFromCloud() {
  if (typeof window === "undefined") return computePricing();
  const local = computePricing();
  if (local.isSetupComplete) return local;   // this device already knows
  try {
    const { pullUserState } = await import("@/lib/userState");
    const remote = await pullUserState<Record<string, unknown>>(PRICING_STORAGE_KEY);
    if (remote) localStorage.setItem(PRICING_STORAGE_KEY, JSON.stringify(remote));
  } catch { /* offline or signed out: keep the local answer */ }
  return computePricing();
}

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
