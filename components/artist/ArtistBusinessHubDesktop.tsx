"use client";
import { useTranslation } from "react-i18next";
import { formatMoney, type Currency } from "@/lib/currency";
import {
  type ArtistEvent, type ArtistEventKind, eventMoney, nextStatus,
} from "@/lib/artistBusiness";
import { RiseStyle, Tile, Instrument, Cols, Col } from "@/components/desktop/ui";

/* ═══════════════════════════════════════════════════════════════
   ARTIST BUSINESS — contenido de escritorio. Espejo deliberado de
   BusinessHubDesktop (registro enterprise: instrumento + grafica,
   banda de pipeline, tabla + carril de herramientas), porque los dos
   oficios son el MISMO producto con otro eje. Presentacion pura: los
   datos llegan calculados del contenedor (ArtistBusinessHub).
   El primer intento era el layout movil centrado a lo ancho del
   escritorio (Paco 2026-08-19: "siento que esta en modo celular").
   ═══════════════════════════════════════════════════════════════ */

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-emerald-400/10 text-emerald-400",
  played: "bg-accent/15 text-accent",
  confirmed: "bg-accent/15 text-accent",
  released: "bg-emerald-400/10 text-emerald-400",
  done: "bg-emerald-400/10 text-emerald-400",
};

const STATUS_KEY: Record<string, string> = {
  hold: "abStHold", confirmed: "abStConfirmed", played: "abStPlayed", paid: "abStPaid",
  planned: "abStPlanned", in_progress: "abStInProgress", done: "abStDone",
  scheduled: "abStScheduled", released: "abStReleased",
};

const KIND_KEY: Record<ArtistEventKind, string> = {
  gig: "abKindGig", recording: "abKindRecording", release: "abKindRelease",
};

/* Iconos del carril, hermanos visuales de los del hub de productor. */
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

export default function ArtistBusinessHubDesktop({
  events, mes, months, series, minFee, rateReady, currency, upcoming, upcomingTotal,
  onOpenSetup, onAddEvent, onEditEvent, onAdvance,
}: {
  events: ArtistEvent[];
  mes: { earned: number; invested: number; net: number; pending: number };
  months: { label: string; isCurrent: boolean }[];
  /** Cobrado por mes, ultimos 6 — misma grafica de barras que el de productor. */
  series: number[];
  minFee: number;
  rateReady: boolean;
  currency: Currency;
  upcoming: number;
  upcomingTotal: number;
  onOpenSetup: () => void;
  onAddEvent: (kind: ArtistEventKind) => void;
  onEditEvent: (e: ArtistEvent) => void;
  onAdvance: (e: ArtistEvent) => void;
}) {
  const { t } = useTranslation();
  const maxRev = Math.max(...series, 1);
  const recent = events.slice(0, 7);

  return (
    <div className="flex flex-col">
      <RiseStyle />

      <div className="dd-rise mb-6 flex flex-shrink-0 items-center justify-between">
        <h1 className="text-[21px] font-bold tracking-tight text-white">{t("abKicker")}</h1>
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={onOpenSetup}
            className="rounded-full border border-white/10 px-3.5 py-1.5 text-[11.5px] text-zinc-400 transition hover:text-white">
            {rateReady ? t("abRateEdit") : t("abRateSetup")}
          </button>
          <button type="button" onClick={() => onAddEvent("gig")}
            className="rounded-full border border-accent/40 px-3.5 py-1.5 text-[11.5px] font-semibold text-accent transition hover:brightness-110">
            {t("abAddEvent")}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-10">
        {/* Heroe: lo cobrado del mes, con lo invertido y el neto al pie —
            el numero uno de un modulo de negocio es el dinero que entro. */}
        <div className="dd-rise grid items-stretch gap-4" style={{ gridTemplateColumns: ".85fr 1.35fr", animationDelay: ".06s" }}>
          <Instrument
            label={`${t("abEarned")} · ${t("abThisMonth")}`}
            value={formatMoney(mes.earned, currency)}
            size={64}
            footer={
              <span className="relative mt-2 block text-[10px] text-zinc-500">
                {t("abInvested")} <b className="text-zinc-300">{formatMoney(mes.invested, currency)}</b>
                {" · "}{t("abNet")}{" "}
                <b className={mes.net >= 0 ? "text-accent" : "text-red-400"}>{formatMoney(mes.net, currency)}</b>
                {mes.pending > 0 && (
                  <span className="mt-0.5 block text-zinc-600">
                    {formatMoney(mes.pending, currency)} {t("abPending")}
                  </span>
                )}
              </span>
            }
          />
          <Tile label={t("bzLast6")}>
            {series.every((r) => r === 0) ? (
              <div className="flex h-[168px] flex-col items-center justify-center gap-1">
                <p className="text-[12.5px] text-zinc-600">{t("abEmpty")}</p>
              </div>
            ) : (
              <div className="mt-3 flex h-[168px] items-end gap-2.5">
                {months.map((m, i) => {
                  const pct = series[i] > 0 ? Math.max((series[i] / maxRev) * 100, 6) : 3;
                  return (
                    <div key={i} className="flex-1 rounded-t-[4px] transition-all duration-500"
                      style={{ height: `${pct}%`, background: m.isCurrent ? AMBER : "rgba(255,255,255,.08)" }} />
                  );
                })}
              </div>
            )}
            <div className="mt-2 flex gap-2.5">
              {months.map((m, i) => (
                <span key={i} className={`flex-1 text-center font-mono text-[9.5px] ${m.isCurrent ? "text-accent" : "text-zinc-600"}`}>{m.label}</span>
              ))}
            </div>
          </Tile>
        </div>

        {/* La banda: tarifa → agendado → por cobrar. El viaje del dinero del
            artista, como la banda del productor traza el suyo. */}
        <div className="dd-rise" style={{ animationDelay: ".12s" }}>
          <Tile label={t("bdPipeline")} className="py-1">
            <Cols>
              <Col
                value={rateReady ? formatMoney(minFee, currency) : "—"}
                label={t("abMinFee")}
                muted={!rateReady}
                sub={rateReady ? t("abRateHint") : t("abRateSetup")}
                onClick={onOpenSetup}
              />
              <Col
                value={upcoming > 0 ? formatMoney(upcomingTotal, currency) : "—"}
                label={t("abBookedAhead")}
                muted={upcoming === 0}
                sub={upcoming > 0 ? t("abShowsCount", { count: upcoming }) : undefined}
              />
              <Col
                value={mes.pending > 0 ? formatMoney(mes.pending, currency) : "—"}
                label={t("abPending")}
                muted={mes.pending === 0}
              />
            </Cols>
          </Tile>
        </div>

        {/* Tabla de eventos + carril de altas, espejo de cotizaciones + herramientas. */}
        <div className="dd-rise grid gap-4" style={{ gridTemplateColumns: "1.55fr 1fr", animationDelay: ".18s" }}>
          <Tile padded={false} className="flex flex-col">
            <div className="flex flex-shrink-0 items-center justify-between px-5 py-3.5">
              <b className="text-[13.5px] font-bold text-white">{t("abTitle")}</b>
            </div>
            {recent.length === 0 ? (
              <div className="px-5 pb-10 pt-4 text-center text-[12.5px] text-zinc-600">{t("abEmpty")}</div>
            ) : (
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr>
                    {["abDate", "abColEvent", "bdColMonto", "bdColEstado"].map((k) => (
                      <th key={k} className="border-y border-white/[0.06] px-5 py-2.5 text-left text-[9.5px] font-semibold uppercase tracking-[0.16em] text-zinc-600">{t(k)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recent.map((e) => {
                    const m = eventMoney(e);
                    return (
                      <tr key={e.id} className="cursor-pointer transition hover:bg-white/[0.02]" onClick={() => onEditEvent(e)}>
                        <td className="border-b border-white/[0.04] px-5 py-3 font-mono text-[11px] tabular-nums text-zinc-500">{e.eventDate ?? "—"}</td>
                        <td className="border-b border-white/[0.04] px-5 py-3 text-zinc-300">
                          <span className="mr-2 font-mono text-[8.5px] font-bold uppercase tracking-[0.14em] text-zinc-600">{t(KIND_KEY[e.kind])}</span>
                          {e.title}
                          {e.kind === "gig" && (e.venue || e.city) && (
                            <span className="text-zinc-600"> · {[e.venue, e.city].filter(Boolean).join(", ")}</span>
                          )}
                        </td>
                        <td className="border-b border-white/[0.04] px-5 py-3 font-semibold tabular-nums text-white">
                          {e.kind === "gig" ? formatMoney(e.fee, e.currency) : `−${formatMoney(e.cost, e.currency)}`}
                          {e.kind === "gig" && m.pending > 0 && (
                            <span className="ml-1.5 font-normal text-zinc-600">· {formatMoney(m.pending, e.currency)} {t("abPending")}</span>
                          )}
                        </td>
                        <td className="border-b border-white/[0.04] px-5 py-3">
                          {/* Avanza AQUI, sin abrir el editor: el chip es el
                              mismo gesto que en movil. stopPropagation porque
                              la fila entera abre el evento. */}
                          <button
                            type="button"
                            onClick={(ev) => { ev.stopPropagation(); onAdvance(e); }}
                            disabled={!nextStatus(e)}
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase transition ${STATUS_STYLE[e.status] ?? "bg-white/[0.06] text-zinc-400"} ${nextStatus(e) ? "hover:brightness-125 active:scale-[0.96]" : "cursor-default"}`}
                          >
                            {t(STATUS_KEY[e.status])}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Tile>

          <Tile label={t("abLogIt")} className="self-start">
            <div className="flex flex-col divide-y divide-white/[0.05]">
              {([
                { k: "gig" as const,       titulo: t("abKindGig"),       d: t("abGigDesc"),       icon: <GigIcon /> },
                { k: "recording" as const, titulo: t("abKindRecording"), d: t("abRecordingDesc"), icon: <RecordingIcon /> },
                { k: "release" as const,   titulo: t("abKindRelease"),   d: t("abReleaseDesc"),   icon: <ReleaseIcon /> },
              ]).map(({ k, titulo, d, icon }) => (
                <button key={k} type="button" onClick={() => onAddEvent(k)}
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
