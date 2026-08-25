"use client";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { useEffect, useMemo, useState } from "react";
import { Plus, X, Trash2 } from "lucide-react";
import { formatMoney, useCurrency } from "@/lib/currency";
import {
  type ArtistEvent, type ArtistEventKind, type ReleaseType,
  EVENT_LADDER, nextStatus, eventMoney, monthTotals,
  getArtistEvents, upsertArtistEvent, deleteArtistEvent,
  computeArtistRate, loadArtistPricing, syncArtistPricingFromCloud,
  type ArtistPricingState,
} from "@/lib/artistBusiness";
import ArtistRateSetup from "./ArtistRateSetup";
import ArtistBusinessHubDesktop from "./ArtistBusinessHubDesktop";
import ShowQuoteSheet from "./ShowQuoteSheet";
import { useIsDesktop } from "@/lib/useIsDesktop";
import i18nInstance from "@/lib/i18n";

/* El Business del artista: un timeline de carrera (fechas, grabaciones,
 * lanzamientos) con el dinero en dos direcciones — lo que un gig te paga y lo
 * que grabar/lanzar te cuesta — y la tarifa minima por show arriba.
 * Spec: docs/SPEC-artist-business-v1-events.md. */

const STATUS_KEY: Record<string, string> = {
  hold: "abStHold", confirmed: "abStConfirmed", played: "abStPlayed", paid: "abStPaid",
  planned: "abStPlanned", in_progress: "abStInProgress", done: "abStDone",
  scheduled: "abStScheduled", released: "abStReleased",
};

const KIND_KEY: Record<ArtistEventKind, string> = {
  gig: "abKindGig", recording: "abKindRecording", release: "abKindRelease",
};

function nuevoEvento(kind: ArtistEventKind, currency: ArtistEvent["currency"]): ArtistEvent {
  return {
    id: crypto.randomUUID(), kind, title: "", eventDate: null,
    status: EVENT_LADDER[kind][0],
    fee: 0, deposit: 0, cost: 0, recouped: 0, currency,
    venue: "", city: "", releaseType: kind === "release" ? "single" : null,
    notes: "", createdAt: Date.now(),
  };
}

// ─── La hoja de alta/edicion ─────────────────────────────────────────────────

function CampoNum({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-zinc-400">{label}</span>
      <input
        type="number" inputMode="decimal" min={0}
        value={value || ""} placeholder="0"
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[14px] text-white outline-none transition placeholder:text-zinc-600 focus:border-accent/60"
      />
    </label>
  );
}

function CampoTxt({ label, value, onChange, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-zinc-400">{label}</span>
      <input
        type={type} value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[14px] text-white outline-none transition placeholder:text-zinc-600 focus:border-accent/60 [color-scheme:dark]"
      />
    </label>
  );
}

function EventSheet({
  inicial, onClose, onSave, onDelete,
}: {
  inicial: ArtistEvent;
  onClose: () => void;
  onSave: (e: ArtistEvent) => void;
  onDelete: ((id: string) => void) | null;
}) {
  const { t } = useTranslation();
  const [e, setE] = useState<ArtistEvent>(inicial);
  const set = <K extends keyof ArtistEvent>(k: K, v: ArtistEvent[K]) => setE((p) => ({ ...p, [k]: v }));

  /* Cambiar de kind re-ancla el status a su escalera: un "paid" no significa
     nada en una grabacion. Solo aplica al crear (editar no cambia de kind). */
  const cambiarKind = (kind: ArtistEventKind) =>
    setE((p) => ({ ...p, kind, status: EVENT_LADDER[kind][0], releaseType: kind === "release" ? (p.releaseType ?? "single") : null }));

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#131216] sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div className="flex gap-2">
            {(["gig", "recording", "release"] as const).map((k) => (
              <button
                key={k}
                onClick={() => onDelete === null && cambiarKind(k)}
                disabled={onDelete !== null}
                className={`rounded-full border px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] transition ${
                  e.kind === k
                    ? "border-accent/50 bg-accent/10 text-accent"
                    : "border-white/10 text-zinc-500 disabled:opacity-40"
                }`}
              >
                {t(KIND_KEY[k])}
              </button>
            ))}
          </div>
          <button onClick={onClose} aria-label={t("abCancel")} className="text-zinc-600 transition hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
          <CampoTxt label={t("abTitleField")} value={e.title} onChange={(v) => set("title", v)} />
          <CampoTxt label={t("abDate")} type="date" value={e.eventDate ?? ""} onChange={(v) => set("eventDate", v || null)} />

          {e.kind === "gig" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <CampoTxt label={t("abVenue")} value={e.venue} onChange={(v) => set("venue", v)} />
                <CampoTxt label={t("abCity")} value={e.city} onChange={(v) => set("city", v)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <CampoNum label={t("abFee")} value={e.fee} onChange={(v) => set("fee", v)} />
                <CampoNum label={t("abDeposit")} value={e.deposit} onChange={(v) => set("deposit", v)} />
              </div>
              <CampoNum label={t("abCost")} value={e.cost} onChange={(v) => set("cost", v)} />
            </>
          )}

          {e.kind === "recording" && (
            <CampoNum label={t("abCost")} value={e.cost} onChange={(v) => set("cost", v)} />
          )}

          {e.kind === "release" && (
            <>
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-zinc-400">{t("abReleaseType")}</span>
                <div className="flex gap-2">
                  {(["single", "ep", "album", "video"] as ReleaseType[]).map((rt) => (
                    <button key={rt} onClick={() => set("releaseType", rt)}
                      className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition ${
                        e.releaseType === rt ? "border-accent/50 bg-accent/10 text-accent" : "border-white/10 text-zinc-500"
                      }`}>{rt}</button>
                  ))}
                </div>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <CampoNum label={t("abCost")} value={e.cost} onChange={(v) => set("cost", v)} />
                <CampoNum label={t("abRecouped")} value={e.recouped} onChange={(v) => set("recouped", v)} />
              </div>
            </>
          )}

          <CampoTxt label={t("abNotes")} value={e.notes} onChange={(v) => set("notes", v)} />
        </div>

        <div className="flex items-center gap-3 border-t border-white/[0.06] px-6 py-4">
          {onDelete && (
            <button onClick={() => onDelete(e.id)} aria-label={t("abDelete")}
              className="rounded-xl border border-white/10 p-3 text-zinc-500 transition hover:border-red-500/40 hover:text-red-400">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => onSave(e)}
            disabled={!e.title.trim()}
            className="flex-1 rounded-2xl bg-accent py-3 text-[13px] font-bold text-black transition hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
          >
            {t("abSave")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── El hub ──────────────────────────────────────────────────────────────────

/** El dia de hoy como YYYY-MM-DD LOCAL (nada de toISOString, que es UTC y ya
 *  mordio una vez con el "0 scheduled" del dashboard). */
function hoyKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ArtistBusinessHub({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();
  const currency = useCurrency();
  const [events, setEvents] = useState<ArtistEvent[]>([]);
  const [filtro, setFiltro] = useState<ArtistEventKind | "all">("all");
  const [hoja, setHoja] = useState<{ e: ArtistEvent; nuevo: boolean } | null>(null);
  const [setupAbierto, setSetupAbierto] = useState(false);
  const [quoteAbierto, setQuoteAbierto] = useState(false);
  const [pricing, setPricing] = useState<ArtistPricingState | null>(null);

  useEffect(() => {
    getArtistEvents(userId).then(setEvents).catch(() => {});
    void syncArtistPricingFromCloud().then(() => setPricing(loadArtistPricing()));
  }, [userId]);

  const rate = useMemo(() => computeArtistRate(pricing ?? loadArtistPricing()), [pricing]);

  const ahora = new Date();
  const mes = useMemo(
    () => monthTotals(events, ahora.getFullYear(), ahora.getMonth()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events],
  );

  /* La organizacion manda: que sigue, la agenda, y cada carril con lo proximo
     primero y lo reciente despues. */
  const hoy = hoyKey();
  const proximos = useMemo(
    () => events
      .filter((e) => e.eventDate && e.eventDate >= hoy)
      .sort((a, b) => (a.eventDate ?? "").localeCompare(b.eventDate ?? "")),
    [events, hoy],
  );
  const upNext = proximos[0] ?? null;
  const daysAway = upNext?.eventDate
    ? Math.round((new Date(`${upNext.eventDate}T00:00:00`).getTime() - new Date(`${hoy}T00:00:00`).getTime()) / 86400000)
    : null;
  const agenda = proximos.slice(0, 6);

  const lanes = useMemo(() => {
    const porKind = (k: ArtistEventKind) => {
      const del = events.filter((e) => e.kind === k);
      const fut = del.filter((e) => e.eventDate && e.eventDate >= hoy)
        .sort((a, b) => (a.eventDate ?? "").localeCompare(b.eventDate ?? ""));
      const resto = del.filter((e) => !e.eventDate || e.eventDate < hoy)
        .sort((a, b) => (b.eventDate ?? "").localeCompare(a.eventDate ?? ""));
      return [...fut, ...resto];
    };
    return { gig: porKind("gig"), recording: porKind("recording"), release: porKind("release") };
  }, [events, hoy]);

  /* Fechas cotizables: gigs vivos (no pagados), las proximas primero. */
  const gigsAbiertos = useMemo(
    () => [...lanes.gig].filter((e) => e.status !== "paid"),
    [lanes.gig],
  );

  const visibles = useMemo(
    () => (filtro === "all" ? events : events.filter((e) => e.kind === filtro)),
    [events, filtro],
  );

  function guardar(e: ArtistEvent) {
    setEvents((prev) => {
      const i = prev.findIndex((x) => x.id === e.id);
      const next = i >= 0 ? prev.map((x) => (x.id === e.id ? e : x)) : [e, ...prev];
      return [...next].sort((a, b) => (b.eventDate ?? "").localeCompare(a.eventDate ?? ""));
    });
    void upsertArtistEvent(userId, e);
    setHoja(null);
  }

  function borrar(id: string) {
    setEvents((prev) => prev.filter((x) => x.id !== id));
    void deleteArtistEvent(userId, id);
    setHoja(null);
  }

  function avanzar(e: ArtistEvent) {
    const next = nextStatus(e);
    if (!next) return;
    const done = { ...e, status: next };
    setEvents((prev) => prev.map((x) => (x.id === e.id ? done : x)));
    void upsertArtistEvent(userId, done);
  }

  /* La cotizacion no es un documento aparte: es el numero que el gig promete. */
  function aplicarFee(gig: ArtistEvent, fee: number) {
    guardar({ ...gig, fee });
  }

  const hojas = (
    <>
      {hoja && (
        <EventSheet
          inicial={hoja.e}
          onClose={() => setHoja(null)}
          onSave={guardar}
          onDelete={hoja.nuevo ? null : borrar}
        />
      )}
      {quoteAbierto && (
        <ShowQuoteSheet
          gigs={gigsAbiertos}
          onClose={() => setQuoteAbierto(false)}
          onApplyFee={aplicarFee}
        />
      )}
    </>
  );

  /* ── Escritorio: la tabuladora es una VISTA, como la calculadora del
     productor (Paco 2026-08-19). ── */
  if (isDesktop && setupAbierto) {
    return (
      <ArtistRateSetup
        inline
        onClose={() => setSetupAbierto(false)}
        onSaved={setPricing}
      />
    );
  }

  if (isDesktop) {
    return (
      <>
        <ArtistBusinessHubDesktop
          events={events}
          lanes={lanes}
          upNext={upNext}
          daysAway={daysAway}
          agenda={agenda}
          mes={mes}
          minFee={rate.minFee}
          rateReady={rate.isSetupComplete}
          currency={currency}
          lang={i18nInstance.resolvedLanguage ?? "en"}
          onOpenSetup={() => setSetupAbierto(true)}
          onOpenQuote={() => setQuoteAbierto(true)}
          onAddEvent={(kind) => setHoja({ e: nuevoEvento(kind, currency), nuevo: true })}
          onEditEvent={(e) => setHoja({ e, nuevo: false })}
          onAdvance={avanzar}
        />
        {hojas}
      </>
    );
  }

  /* ── Telefono: mismo orden de prioridades — que sigue, la lista, y el
     dinero con sus herramientas hasta abajo. ── */
  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-28 pt-4">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-accent">{t("abKicker")}</p>
      <h1 className="mt-1 text-[22px] font-bold text-white">{t("abTitle")}</h1>

      {/* Que sigue */}
      {upNext ? (
        <button
          type="button"
          onClick={() => setHoja({ e: upNext, nuevo: false })}
          className="mt-4 w-full rounded-2xl border border-accent/20 bg-accent/[0.05] px-4 py-3.5 text-left transition active:scale-[0.99]"
        >
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-accent/70">
            {t("aqUpNext")}{daysAway !== null && <> · {daysAway === 0 ? t("aqToday") : t("aqInDays", { count: daysAway })}</>}
          </p>
          <p className="mt-1 truncate text-[16px] font-bold text-white">{upNext.title}</p>
          <p className="mt-0.5 truncate text-[11.5px] text-zinc-500">
            {upNext.eventDate}
            {upNext.kind === "gig" && (upNext.venue || upNext.city) && <> · {[upNext.venue, upNext.city].filter(Boolean).join(", ")}</>}
          </p>
        </button>
      ) : (
        <p className="mt-4 rounded-2xl border border-dashed border-white/10 px-4 py-3.5 text-center text-[12.5px] text-zinc-500">
          {t("aqNothingBooked")}
        </p>
      )}

      {/* Filtros + alta */}
      <div className="mt-5 flex items-center gap-2">
        {([["all", "abAll"], ["gig", "abGigs"], ["recording", "abRecordings"], ["release", "abReleases"]] as const).map(([k, key]) => (
          <button key={k} onClick={() => setFiltro(k as ArtistEventKind | "all")}
            className={`rounded-full border px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] transition ${
              filtro === k ? "border-accent/50 bg-accent/10 text-accent" : "border-white/10 text-zinc-500 hover:text-white"
            }`}>{t(key)}</button>
        ))}
        <button
          onClick={() => setHoja({ e: nuevoEvento(filtro === "all" ? "gig" : filtro, currency), nuevo: true })}
          className="ml-auto flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-[12px] font-bold text-black transition hover:brightness-110 active:scale-[0.97]"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("abAddEvent")}
        </button>
      </div>

      {/* El timeline */}
      <div className="mt-4 space-y-2.5">
        {visibles.length === 0 && (
          <p className="rounded-2xl border border-dashed border-white/10 px-5 py-8 text-center text-[13px] text-zinc-500">
            {t("abEmpty")}
          </p>
        )}
        {visibles.map((e) => {
          const m = eventMoney(e);
          const next = nextStatus(e);
          return (
            <div key={e.id}
              className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 transition hover:border-white/[0.12]">
              <button onClick={() => setHoja({ e, nuevo: false })} className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[8.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                    {t(KIND_KEY[e.kind])}
                  </span>
                  {e.eventDate && (
                    <span className="font-mono text-[10px] text-zinc-600 tabular-nums">{e.eventDate}</span>
                  )}
                </div>
                <p className="truncate text-[14px] font-semibold text-white">
                  {e.title}
                  {e.kind === "gig" && (e.venue || e.city) && (
                    <span className="font-normal text-zinc-500"> · {[e.venue, e.city].filter(Boolean).join(", ")}</span>
                  )}
                </p>
                <p className="mt-0.5 font-mono text-[10.5px] tabular-nums text-zinc-500">
                  {e.kind === "gig"
                    ? <>{formatMoney(e.fee, e.currency)}{m.pending > 0 && <span className="text-zinc-600"> · {formatMoney(m.pending, e.currency)} {t("abPending")}</span>}</>
                    : <>−{formatMoney(e.cost, e.currency)}{e.recouped > 0 && <span className="text-accent/80"> · +{formatMoney(e.recouped, e.currency)}</span>}</>}
                </p>
              </button>
              <button
                onClick={() => avanzar(e)}
                disabled={!next}
                title={next ? t(STATUS_KEY[next]) : undefined}
                className={`shrink-0 rounded-full border px-3 py-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.1em] transition ${
                  e.status === "paid" || e.status === "done" || e.status === "released"
                    ? "border-accent/40 text-accent"
                    : "border-white/15 text-zinc-400 hover:border-accent/40 hover:text-accent"
                } ${next ? "active:scale-[0.96]" : "cursor-default"}`}
              >
                {t(STATUS_KEY[e.status])}
              </button>
            </div>
          );
        })}
      </div>

      {/* El dinero, hasta abajo: herramientas con nombre y el mes compacto */}
      <div className="mt-6 grid grid-cols-2 gap-2.5">
        <button
          onClick={() => setSetupAbierto(true)}
          className="rounded-2xl border border-accent/25 bg-accent/[0.06] px-4 py-3 text-left transition active:scale-[0.98]"
        >
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-accent/70">{t("abRate")}</p>
          <p className="mt-1 text-[15px] font-black tabular-nums text-accent">
            {rate.isSetupComplete ? formatMoney(rate.minFee, currency) : t("abRateSetup")}
          </p>
        </button>
        <button
          onClick={() => setQuoteAbierto(true)}
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition active:scale-[0.98]"
        >
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-500">{t("aqQuoteTool")}</p>
          <p className="mt-1 text-[12px] leading-snug text-zinc-400">{t("aqQuoteToolDesc")}</p>
        </button>
      </div>

      <div className="mt-2.5 flex items-baseline justify-between rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
        {[
          { l: t("abEarned"), v: mes.earned, cls: "text-white" },
          { l: t("abInvested"), v: mes.invested, cls: "text-white" },
          { l: t("abNet"), v: mes.net, cls: mes.net >= 0 ? "text-accent" : "text-red-400" },
        ].map((c) => (
          <div key={c.l} className="min-w-0">
            <p className="font-mono text-[8.5px] font-bold uppercase tracking-[0.14em] text-zinc-600">{c.l}</p>
            <p className={`mt-0.5 truncate text-[15px] font-black tabular-nums ${c.cls}`}>{formatMoney(c.v, currency)}</p>
          </div>
        ))}
      </div>
      {mes.pending > 0 && (
        <p className="mt-2 font-mono text-[10px] text-zinc-500">
          {formatMoney(mes.pending, currency)} {t("abPending")}
        </p>
      )}

      {hojas}
      {setupAbierto && (
        <ArtistRateSetup
          onClose={() => setSetupAbierto(false)}
          onSaved={setPricing}
        />
      )}
    </div>
  );
}
