"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, List } from "lucide-react";
import ArtistCalendar from "./ArtistCalendar";
import { formatMoney, type Currency } from "@/lib/currency";
import {
  type ArtistEvent, type ArtistEventKind, eventMoney, nextStatus,
} from "@/lib/artistBusiness";
import { RiseStyle, Tile } from "@/components/desktop/ui";

/* ═══════════════════════════════════════════════════════════════
   ARTIST BUSINESS — escritorio, segunda iteracion.

   La primera era un espejo del hub de productor (heroe de dinero,
   grafica, tabla) y Paco lo rechazo con razon (2026-08-19): "no tanto
   el dinero, sino la organizacion de fechas, grabaciones y
   lanzamientos". La vida del artista se organiza por CALENDARIO, no
   por estado de cuenta.

   Asi que el modulo ahora lee de arriba a abajo como la semana de un
   artista: QUE SIGUE (el proximo evento, en grande, con su cuenta
   regresiva) → la agenda → los tres carriles (fechas / grabaciones /
   lanzamientos, cada uno con su lista y su alta) → y hasta ABAJO el
   dinero: el mes compacto y las dos herramientas con nombre propio,
   la calculadora de tarifa y COTIZAR UN SHOW, que era lo que no se
   encontraba cuando la calculadora vivia en un boton del header.
   ═══════════════════════════════════════════════════════════════ */

const STATUS_KEY: Record<string, string> = {
  hold: "abStHold", confirmed: "abStConfirmed", played: "abStPlayed", paid: "abStPaid",
  planned: "abStPlanned", in_progress: "abStInProgress", done: "abStDone",
  scheduled: "abStScheduled", released: "abStReleased",
};

const KIND_KEY: Record<ArtistEventKind, string> = {
  gig: "abKindGig", recording: "abKindRecording", release: "abKindRelease",
};

const AMBER = "#f5a623";
const STROKE = "rgba(255,255,255,0.68)";
function GigIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 3v10.4" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="9.4" cy="15.6" r="3.1" stroke={AMBER} strokeWidth="1.5" />
      <path d="M12 3c2.6 1 4 2.1 4 3.9" stroke={AMBER} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function RecordingIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8.2" stroke={STROKE} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2.4" fill={AMBER} />
    </svg>
  );
}
function ReleaseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 15V4m0 0 3.5 3.5M12 4 8.5 7.5" stroke={AMBER} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function CalcIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ transform: "rotate(-6deg)" }}>
      <path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42z" stroke={STROKE} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="7.2" cy="7.2" r="1.4" fill={AMBER} />
      <text x="12.6" y="15.6" fontSize="7.5" fontWeight="700" fill={AMBER} fontFamily="-apple-system, system-ui, sans-serif" textAnchor="middle">$</text>
    </svg>
  );
}
function QuoteIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke={STROKE} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M14 3v4h4" stroke={STROKE} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9.5 13h5M9.5 16.5h3" stroke={AMBER} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** "Aug 30" en el idioma activo, sin pelearse con timezones. */
function fechaCorta(iso: string, lang: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(lang, { month: "short", day: "numeric" });
}

function StatusChip({ e, onAdvance }: { e: ArtistEvent; onAdvance: (e: ArtistEvent) => void }) {
  const { t } = useTranslation();
  const next = nextStatus(e);
  const done = e.status === "paid" || e.status === "done" || e.status === "released";
  return (
    <button
      type="button"
      onClick={(ev) => { ev.stopPropagation(); onAdvance(e); }}
      disabled={!next}
      title={next ? t(STATUS_KEY[next]) : undefined}
      className={`shrink-0 rounded-md px-2 py-0.5 text-[9.5px] font-bold uppercase transition ${
        done ? "bg-emerald-400/10 text-emerald-400" : "bg-white/[0.06] text-zinc-400"
      } ${next ? "hover:bg-accent/15 hover:text-accent active:scale-[0.96]" : "cursor-default"}`}
    >
      {t(STATUS_KEY[e.status])}
    </button>
  );
}

export default function ArtistBusinessHubDesktop({
  events, lanes, upNext, daysAway, agenda, mes, minFee, rateReady, currency, lang,
  onOpenSetup, onOpenQuote, onAddEvent, onEditEvent, onAdvance,
}: {
  events: ArtistEvent[];
  /** Por tipo, ya ordenados: lo que viene primero, luego lo reciente. */
  lanes: Record<ArtistEventKind, ArtistEvent[]>;
  upNext: ArtistEvent | null;
  daysAway: number | null;
  /** Los proximos, cronologicos, todos los tipos revueltos. */
  agenda: ArtistEvent[];
  mes: { earned: number; invested: number; net: number; pending: number };
  minFee: number;
  rateReady: boolean;
  currency: Currency;
  lang: string;
  onOpenSetup: () => void;
  onOpenQuote: () => void;
  onAddEvent: (kind: ArtistEventKind) => void;
  onEditEvent: (e: ArtistEvent) => void;
  onAdvance: (e: ArtistEvent) => void;
}) {
  const { t } = useTranslation();
  /* La agenda alterna lista ↔ mes completo. El calendario enseña TODO,
     pasado incluido; la lista solo lo que viene (Paco 2026-08-25). */
  const [verCal, setVerCal] = useState(false);

  const LANES: { k: ArtistEventKind; icon: React.ReactNode; titleKey: string }[] = [
    { k: "gig",       icon: <GigIcon />,       titleKey: "abGigs" },
    { k: "recording", icon: <RecordingIcon />, titleKey: "abRecordings" },
    { k: "release",   icon: <ReleaseIcon />,   titleKey: "abReleases" },
  ];

  return (
    <div className="flex flex-col">
      <RiseStyle />

      {/* Sin boton de alta aqui: agregar vive en los carriles (contextual, cada
          + preseleccciona su tipo) y en el vacio de "Lo que sigue". Un tercer
          boton generico era redundante y ademas ambiguo: ¿evento de que tipo? */}
      <div className="dd-rise mb-6 flex flex-shrink-0 items-center justify-between">
        <h1 className="text-[21px] font-bold tracking-tight text-white">{t("abKicker")}</h1>
      </div>

      <div className="flex flex-col gap-8">
        {/* ── QUE SIGUE: el proximo evento manda, no el dinero ── */}
        <div className="dd-rise grid items-stretch gap-4" style={{ gridTemplateColumns: ".95fr 1.25fr", animationDelay: ".06s" }}>
          <Tile label={t("aqUpNext")} className="flex flex-col justify-center">
            {upNext ? (
              <button type="button" onClick={() => onEditEvent(upNext)} className="group text-left">
                <div className="flex items-baseline gap-3">
                  <span className="text-[40px] font-black leading-none tracking-tight text-accent">
                    {upNext.eventDate ? fechaCorta(upNext.eventDate, lang) : "—"}
                  </span>
                  {daysAway !== null && (
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-zinc-500">
                      {daysAway === 0 ? t("aqToday") : t("aqInDays", { count: daysAway })}
                    </span>
                  )}
                </div>
                <p className="mt-2.5 truncate text-[17px] font-bold text-white transition group-hover:text-accent">
                  {upNext.title}
                </p>
                <p className="mt-0.5 text-[12px] text-zinc-500">
                  <span className="mr-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-600">{t(KIND_KEY[upNext.kind])}</span>
                  {upNext.kind === "gig" && [upNext.venue, upNext.city].filter(Boolean).join(", ")}
                </p>
                <div className="mt-3 flex items-center gap-2.5">
                  <StatusChip e={upNext} onAdvance={onAdvance} />
                  {upNext.kind === "gig" && upNext.fee > 0 && (
                    <span className="font-mono text-[11px] tabular-nums text-zinc-500">{formatMoney(upNext.fee, upNext.currency)}</span>
                  )}
                </div>
              </button>
            ) : (
              <div className="py-6 text-center">
                <p className="text-[13px] text-zinc-500">{t("aqNothingBooked")}</p>
                <button type="button" onClick={() => onAddEvent("gig")}
                  className="mt-3 rounded-full border border-accent/40 px-4 py-1.5 text-[11.5px] font-semibold text-accent transition hover:bg-accent/10">
                  {t("abAddEvent")}
                </button>
              </div>
            )}
          </Tile>

          <Tile
            label={t("aqAgenda")}
            padded={false}
            action={
              <button type="button" onClick={() => setVerCal((v) => !v)}
                aria-label={verCal ? t("aqViewList") : t("aqViewCalendar")}
                className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 transition hover:text-accent active:scale-[0.92]">
                {verCal ? <List className="h-3.5 w-3.5" /> : <CalendarDays className="h-3.5 w-3.5" />}
              </button>
            }
          >
            {verCal ? (
              <ArtistCalendar events={events} lang={lang} onPick={onEditEvent} />
            ) : agenda.length === 0 ? (
              <p className="px-5 py-8 text-center text-[12.5px] text-zinc-600">{t("abEmpty")}</p>
            ) : (
              <div className="flex flex-col divide-y divide-white/[0.04] px-2 py-1">
                {agenda.map((e) => (
                  <button key={e.id} type="button" onClick={() => onEditEvent(e)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/[0.02]">
                    <span className="w-14 shrink-0 font-mono text-[10.5px] tabular-nums text-zinc-500">
                      {e.eventDate ? fechaCorta(e.eventDate, lang) : "—"}
                    </span>
                    <span className="shrink-0 font-mono text-[8.5px] font-bold uppercase tracking-[0.14em] text-zinc-600">{t(KIND_KEY[e.kind])}</span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-300">{e.title}</span>
                    <StatusChip e={e} onAdvance={onAdvance} />
                  </button>
                ))}
              </div>
            )}
          </Tile>
        </div>

        {/* ── LOS TRES CARRILES: la organizacion es el modulo ── */}
        <div className="dd-rise grid gap-4" style={{ gridTemplateColumns: "1fr 1fr 1fr", animationDelay: ".12s" }}>
          {LANES.map(({ k, icon, titleKey }) => (
            <Tile
              key={k}
              padded={false}
              className="flex flex-col"
              label={undefined}
            >
              <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(255,255,255,.045)" }}>{icon}</span>
                  <div>
                    <b className="block text-[13px] font-bold text-white">{t(titleKey)}</b>
                    <span className="font-mono text-[9.5px] text-zinc-600">{lanes[k].length}</span>
                  </div>
                </div>
                <button type="button" onClick={() => onAddEvent(k)} aria-label={`${t("abAddEvent")} · ${t(titleKey)}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-zinc-500 transition hover:border-accent/40 hover:text-accent active:scale-[0.94]">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                </button>
              </div>
              {lanes[k].length === 0 ? (
                <p className="px-4 pb-5 pt-3 text-[11.5px] leading-snug text-zinc-600">{t(`abLaneEmpty_${k}`)}</p>
              ) : (
                <div className="flex flex-col divide-y divide-white/[0.04] px-2 pb-2 pt-1">
                  {lanes[k].slice(0, 4).map((e) => {
                    const m = eventMoney(e);
                    return (
                      <button key={e.id} type="button" onClick={() => onEditEvent(e)}
                        className="flex items-center gap-2.5 rounded-lg px-2 py-2.5 text-left transition hover:bg-white/[0.02]">
                        <span className="w-12 shrink-0 font-mono text-[10px] tabular-nums text-zinc-500">
                          {e.eventDate ? fechaCorta(e.eventDate, lang) : "—"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] text-zinc-300">{e.title}</span>
                          <span className="block truncate font-mono text-[9.5px] tabular-nums text-zinc-600">
                            {k === "gig"
                              ? <>{e.fee > 0 && formatMoney(e.fee, e.currency)}{m.pending > 0 && ` · ${formatMoney(m.pending, e.currency)} ${t("abPending")}`}</>
                              : <>{e.cost > 0 && `−${formatMoney(e.cost, e.currency)}`}{e.recouped > 0 && ` · +${formatMoney(e.recouped, e.currency)}`}</>}
                          </span>
                        </span>
                        <StatusChip e={e} onAdvance={onAdvance} />
                      </button>
                    );
                  })}
                </div>
              )}
            </Tile>
          ))}
        </div>

        {/* ── ABAJO, EL DINERO: el mes compacto y las dos herramientas ── */}
        <div className="dd-rise grid gap-4" style={{ gridTemplateColumns: "1fr 1.35fr", animationDelay: ".18s" }}>
          <Tile label={t("abThisMonth")} className="flex flex-col justify-center">
            <div className="flex items-baseline justify-between gap-4">
              {[
                { l: t("abEarned"), v: mes.earned, cls: "text-white" },
                { l: t("abInvested"), v: mes.invested, cls: "text-white" },
                { l: t("abNet"), v: mes.net, cls: mes.net >= 0 ? "text-accent" : "text-red-400" },
              ].map((c) => (
                <div key={c.l} className="min-w-0">
                  <p className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-600">{c.l}</p>
                  <p className={`mt-1 truncate text-[19px] font-black tabular-nums ${c.cls}`}>{formatMoney(c.v, currency)}</p>
                </div>
              ))}
            </div>
            {mes.pending > 0 && (
              <p className="mt-2.5 font-mono text-[10px] text-zinc-600">
                {formatMoney(mes.pending, currency)} {t("abPending")}
              </p>
            )}
          </Tile>

          <Tile label={t("bdHerramientas")}>
            <div className="flex flex-col divide-y divide-white/[0.05]">
              {[
                {
                  icon: <CalcIcon />, titulo: t("abRate"),
                  d: rateReady ? `${t("abMinFee")}: ${formatMoney(minFee, currency)}` : t("abRateHint"),
                  onClick: onOpenSetup,
                },
                {
                  icon: <QuoteIcon />, titulo: t("aqQuoteTool"),
                  d: t("aqQuoteToolDesc"),
                  onClick: onOpenQuote,
                },
              ].map(({ icon, titulo, d, onClick }) => (
                <button key={titulo} type="button" onClick={onClick}
                  className="group flex items-center gap-3.5 py-3.5 text-left transition first:pt-2 hover:bg-white/[0.02]">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition group-hover:bg-accent/10" style={{ background: "rgba(255,255,255,.045)" }}>{icon}</div>
                  <div className="min-w-0 flex-1">
                    <b className="block truncate text-[13.5px] font-bold text-white">{titulo}</b>
                    <span className="mt-0.5 block truncate text-[11.5px] text-zinc-500">{d}</span>
                  </div>
                  <span className="flex-shrink-0 text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
                  </span>
                </button>
              ))}
            </div>
          </Tile>
        </div>
      </div>
    </div>
  );
}
