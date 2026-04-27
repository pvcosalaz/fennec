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
  finalPrice: number;
  notes: string;
  createdAt: number;
  status: "draft" | "sent";
};

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

export const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

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
