// El Business del artista: eventos de carrera y la tarifa minima por show.
// Spec: docs/SPEC-artist-business-v1-events.md (2026-08-18, con Paco).
//
// Un solo timeline (gigs, grabaciones, lanzamientos) pero DOS direcciones de
// dinero: el gig te paga, la grabacion y el lanzamiento los pagas tu. Toda la
// matematica de este archivo existe para no mezclar esas dos cosas, que es lo
// que dejaria al hub presumiendo "ganaste" cuando en realidad invertiste.

import { supabase } from "@/lib/supabase";
import { pullUserState, pushUserState } from "@/lib/userState";
import type { Currency } from "@/lib/currency";

// ─── Eventos ──────────────────────────────────────────────────────────────────

export type ArtistEventKind = "gig" | "recording" | "release";
export type ReleaseType = "single" | "ep" | "album" | "video";

/** La escalera de cada oficio del evento. La UI avanza al siguiente peldaño;
 *  aqui vive el orden para que nadie lo reinvente por pantalla. */
export const EVENT_LADDER: Record<ArtistEventKind, string[]> = {
  gig:       ["hold", "confirmed", "played", "paid"],
  recording: ["planned", "in_progress", "done"],
  release:   ["planned", "scheduled", "released"],
};

export type ArtistEvent = {
  id: string;
  kind: ArtistEventKind;
  title: string;
  /** YYYY-MM-DD o null: un show es "el 14 de septiembre", no un instante. */
  eventDate: string | null;
  status: string;
  fee: number;       // lo que te pagan (gigs)
  deposit: number;   // anticipo ya recibido
  cost: number;      // lo que te cuesta (todos los kinds)
  recouped: number;  // retorno manual (releases)
  currency: Currency;
  venue: string;
  city: string;
  releaseType: ReleaseType | null;
  notes: string;
  createdAt: number;
};

export function nextStatus(e: Pick<ArtistEvent, "kind" | "status">): string | null {
  const ladder = EVENT_LADDER[e.kind];
  const i = ladder.indexOf(e.status);
  return i >= 0 && i < ladder.length - 1 ? ladder[i + 1] : null;
}

/** El dinero de un evento, ya con direccion.
 *  - earned: lo COBRADO. Un gig pagado vale su fee; uno vivo, su anticipo.
 *  - invested: lo gastado en hacerlo existir.
 *  - pending: lo que el gig aun debe soltar. */
export function eventMoney(e: ArtistEvent) {
  const paid = e.status === "paid";
  const earned = e.kind === "gig"
    ? (paid ? e.fee : e.deposit)
    : e.recouped;
  const pending = e.kind === "gig" && !paid ? Math.max(0, e.fee - e.deposit) : 0;
  return { earned, invested: e.cost, pending, net: earned - e.cost };
}

/** Suma de un mes (por event_date, dia local — nada de toISOString, que ya
 *  mordio una vez con el "0 scheduled" del dashboard). */
export function monthTotals(events: ArtistEvent[], year: number, month: number) {
  let earned = 0, invested = 0, pending = 0;
  for (const e of events) {
    if (!e.eventDate) continue;
    const d = new Date(`${e.eventDate}T00:00:00`);
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    const m = eventMoney(e);
    earned += m.earned; invested += m.invested; pending += m.pending;
  }
  return { earned, invested, pending, net: earned - invested };
}

// ─── La tarifa minima por show ───────────────────────────────────────────────
//
// Misma filosofia que la calculadora de produccion (gastos mensuales ESTIMADOS
// -> precio minimo) con las tres correcciones del spec:
//   1. el divisor es demanda (shows que esperas), no capacidad (shows que caben)
//   2. los shows solo cargan con el % del ingreso que de verdad viene del vivo
//   3. la comision de manager/booking sale del cheque, o sea del bruto

export const ARTIST_PRICING_KEY = "fennec-artist-pricing-v1";

/** Todos los montos son MENSUALES y ESTIMADOS (pedido explicito de Paco: que la
 *  tabulacion lo diga). Strings porque son campos de formulario, igual que el
 *  pricing de productor. */
export type ArtistPricingState = {
  setupCompleted: boolean;
  /** Vida: mismos rubros que la calculadora de produccion. */
  personalExpenses: Record<string, string>;
  /** El proyecto artistico: equipo prorrateado, sueldos, marketing, sesiones... */
  projectExpenses: Record<string, string>;
  taxPercent: string;
  emergencyFund: string;
  /** % del ingreso total que viene del vivo. Los shows solo cubren esta parte. */
  liveSharePercent: string;
  /** Shows REALISTAS al mes — demanda, no capacidad. */
  showsPerMonth: string;
  /** Comision de manager/booking. Default 0: la mayoria indie se autogestiona. */
  commissionPercent: string;
  /** Costo directo promedio de un show (banda, viaticos). Los reales van por evento. */
  avgShowCost: string;
};

export const PERSONAL_FIELDS = [
  "vivienda", "alimentacion", "transporte", "servicios", "saludSeguro", "deudas", "otros",
] as const;

export const PROJECT_FIELDS = [
  "equipoProrrateado", "sueldos", "marketing", "sesiones",
  "ensayosTransporte", "distribucion", "otros",
] as const;

export const defaultArtistPricing: ArtistPricingState = {
  setupCompleted: false,
  personalExpenses: Object.fromEntries(PERSONAL_FIELDS.map((k) => [k, ""])),
  projectExpenses: Object.fromEntries(PROJECT_FIELDS.map((k) => [k, ""])),
  /* Vacio, no "19": un default de impuestos inventado inflaba la tarifa de
     quien no factura, y un campo vacio invita a poner el porcentaje REAL
     (Paco 2026-08-25). Vacio computa como cero. */
  taxPercent: "",
  emergencyFund: "",
  liveSharePercent: "60",
  showsPerMonth: "3",
  commissionPercent: "0",
  avgShowCost: "",
};

const num = (v: string | undefined) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const sum = (o: Record<string, string>) =>
  Object.values(o).reduce((acc, v) => acc + num(v), 0);

export function computeArtistRate(s: ArtistPricingState): {
  monthlyNeed: number;
  liveTarget: number;
  netPerShow: number;
  minFee: number;
  isSetupComplete: boolean;
} {
  const base = sum(s.personalExpenses) + sum(s.projectExpenses);
  const monthlyNeed = base * (1 + num(s.taxPercent) / 100) + num(s.emergencyFund);

  const liveShare = Math.min(100, num(s.liveSharePercent)) / 100;
  const liveTarget = monthlyNeed * liveShare;

  const shows = num(s.showsPerMonth);
  const netPerShow = shows > 0 ? liveTarget / shows : 0;

  /* La comision se topa al 60%: mas alla el (1 - c) del denominador dispara la
     tarifa a numeros absurdos, y ningun trato real llega ahi. */
  const commission = Math.min(60, num(s.commissionPercent)) / 100;
  const minFee = (netPerShow + num(s.avgShowCost)) / (1 - commission);

  return {
    monthlyNeed, liveTarget, netPerShow, minFee,
    isSetupComplete: s.setupCompleted && monthlyNeed > 0 && shows > 0,
  };
}

// ─── Tipos de show: la magnitud del evento escala la tarifa ──────────────────
//
// Mismo patron que los projectTypes de la calculadora de produccion (corto
// estudiantil 0.5x ... largometraje grande 4x): tu minimo es la BASE y el tipo
// de evento lo multiplica. Un privado/corporativo paga el doble que un bar; un
// escolar o telonero, menos. El multiplicador ajusta tambien el piso del aviso
// "estarias pagando por tocar": cobrar 0.7x en un escolar no es malbaratarse,
// cobrarlo en un festival si (Paco 2026-08-25).

export type ShowType = { id: string; labelKey: string; mult: number };

export const SHOW_TYPES: ShowType[] = [
  { id: "local",    labelKey: "aqTypeLocal",    mult: 1 },
  { id: "school",   labelKey: "aqTypeSchool",   mult: 0.7 },
  { id: "opening",  labelKey: "aqTypeOpening",  mult: 0.7 },
  { id: "festival", labelKey: "aqTypeFestival", mult: 1.5 },
  { id: "private",  labelKey: "aqTypePrivate",  mult: 2 },
];

// ─── Ajustes: localStorage + espejo en nube (patron del pricing de productor) ─

export function loadArtistPricing(): ArtistPricingState {
  if (typeof window === "undefined") return defaultArtistPricing;
  try {
    const raw = localStorage.getItem(ARTIST_PRICING_KEY);
    if (!raw) return defaultArtistPricing;
    const p = JSON.parse(raw) as Partial<ArtistPricingState>;
    return {
      ...defaultArtistPricing,
      ...p,
      personalExpenses: { ...defaultArtistPricing.personalExpenses, ...(p.personalExpenses ?? {}) },
      projectExpenses:  { ...defaultArtistPricing.projectExpenses,  ...(p.projectExpenses ?? {}) },
    };
  } catch {
    return defaultArtistPricing;
  }
}

export function saveArtistPricing(s: ArtistPricingState): void {
  try { localStorage.setItem(ARTIST_PRICING_KEY, JSON.stringify(s)); } catch { /* lleno/privado */ }
  void pushUserState(ARTIST_PRICING_KEY, s);
}

export async function syncArtistPricingFromCloud(): Promise<void> {
  try {
    const remote = await pullUserState<ArtistPricingState>(ARTIST_PRICING_KEY);
    if (remote) localStorage.setItem(ARTIST_PRICING_KEY, JSON.stringify(remote));
  } catch { /* sin sesion o sin red: lo local manda */ }
}

// ─── CRUD (patron businessDb: console.error y seguir, nunca reventar la UI) ──

type Row = {
  id: string; kind: ArtistEventKind; title: string; event_date: string | null;
  status: string; fee: number; deposit: number; cost: number; recouped: number;
  currency: Currency; venue: string | null; city: string | null;
  release_type: ReleaseType | null; notes: string | null; created_at: string;
};

function fromRow(r: Row): ArtistEvent {
  return {
    id: r.id, kind: r.kind, title: r.title, eventDate: r.event_date,
    status: r.status,
    fee: Number(r.fee) || 0, deposit: Number(r.deposit) || 0,
    cost: Number(r.cost) || 0, recouped: Number(r.recouped) || 0,
    currency: r.currency, venue: r.venue ?? "", city: r.city ?? "",
    releaseType: r.release_type, notes: r.notes ?? "",
    createdAt: new Date(r.created_at).getTime(),
  };
}

export async function getArtistEvents(userId: string): Promise<ArtistEvent[]> {
  const { data, error } = await supabase
    .from("artist_events")
    .select("*")
    .eq("user_id", userId)
    .order("event_date", { ascending: false, nullsFirst: false });
  if (error) { console.error("getArtistEvents:", error); return []; }
  return (data as Row[] ?? []).map(fromRow);
}

export async function upsertArtistEvent(userId: string, e: ArtistEvent): Promise<void> {
  const { error } = await supabase.from("artist_events").upsert({
    id: e.id, user_id: userId, kind: e.kind, title: e.title,
    event_date: e.eventDate, status: e.status,
    fee: e.fee, deposit: e.deposit, cost: e.cost, recouped: e.recouped,
    currency: e.currency, venue: e.venue || null, city: e.city || null,
    release_type: e.releaseType, notes: e.notes || null,
    created_at: new Date(e.createdAt).toISOString(),
  });
  if (error) console.error("upsertArtistEvent:", error);
}

export async function deleteArtistEvent(userId: string, eventId: string): Promise<void> {
  const { error } = await supabase
    .from("artist_events")
    .delete()
    .eq("id", eventId)
    .eq("user_id", userId);
  if (error) console.error("deleteArtistEvent:", error);
}
