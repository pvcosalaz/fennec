"use client";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { useMemo, useState } from "react";
import { X, Copy, Check } from "lucide-react";
import { formatMoney, useCurrency } from "@/lib/currency";
import {
  type ArtistEvent, computeArtistRate, loadArtistPricing,
} from "@/lib/artistBusiness";

/* Cotizar un show: la respuesta a "¿cuanto cobro por esta fecha?".
 *
 * Toma un gig de tu agenda (o una fecha nueva escrita aqui mismo), arranca del
 * MINIMO que dio tu tarifa —no de lo que ofrezca el venue— y arma los numeros
 * que un booking de verdad pide: el total, el anticipo para confirmar y el
 * resto el dia del show. Abajo, para ti, lo que de verdad te queda despues de
 * costos y comision.
 *
 * La cotizacion se entrega como TEXTO copiado: los tratos de fechas se cierran
 * por WhatsApp, no por PDF. Y "guardar" escribe el fee en el gig, porque la
 * cotizacion del artista no es un documento aparte: es el numero que su
 * evento promete (Paco 2026-08-19: "que cotice en base a lo que se genera de
 * los eventos"). */

function CampoNum({ label, value, onChange, suffix }: {
  label: string; value: string; onChange: (v: string) => void; suffix?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-zinc-400">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number" inputMode="decimal" min={0} value={value} placeholder="0"
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[14px] text-white outline-none transition placeholder:text-zinc-600 focus:border-accent/60"
        />
        {suffix && <span className="text-[11px] text-zinc-500">{suffix}</span>}
      </div>
    </label>
  );
}

const n = (v: string) => { const x = Number(v); return Number.isFinite(x) && x > 0 ? x : 0; };

export default function ShowQuoteSheet({
  gigs, onClose, onApplyFee,
}: {
  /** Fechas abiertas (no pagadas), las proximas primero. */
  gigs: ArtistEvent[];
  onClose: () => void;
  /** Escribe el fee cotizado en el gig elegido. */
  onApplyFee: (gig: ArtistEvent, fee: number) => void;
}) {
  const { t } = useTranslation();
  const currency = useCurrency();

  const pricing = useMemo(() => loadArtistPricing(), []);
  const rate = useMemo(() => computeArtistRate(pricing), [pricing]);

  const [gigId, setGigId] = useState<string>(gigs[0]?.id ?? "");
  const gig = gigs.find((g) => g.id === gigId) ?? null;

  /* Arranca del minimo de tu tarifa. Si el gig ya trae un fee mayor, ese: una
     cotizacion nunca deberia sugerir cobrar MENOS de lo que ya pediste. */
  const feeInicial = Math.round(Math.max(rate.minFee, gig?.fee ?? 0)) || "";
  const [fee, setFee] = useState<string>(String(feeInicial));
  const [depositPct, setDepositPct] = useState("50");
  const [showCost, setShowCost] = useState<string>(gig?.cost ? String(gig.cost) : (pricing.avgShowCost || ""));
  const [copiado, setCopiado] = useState(false);

  const F = n(fee);
  const anticipo = Math.round(F * Math.min(100, n(depositPct)) / 100);
  const resto = F - anticipo;
  const comision = Math.round(F * Math.min(60, n(pricing.commissionPercent)) / 100);
  const neto = F - n(showCost) - comision;
  const bajoMinimo = rate.isSetupComplete && F > 0 && F < Math.round(rate.minFee);

  function textoCotizacion(): string {
    const lineas = [
      `${t("aqTxTitle")} — ${gig?.title ?? t("aqTxYourShow")}`,
      gig?.kind === "gig" && (gig.venue || gig.city) ? [gig.venue, gig.city].filter(Boolean).join(", ") : null,
      gig?.eventDate ?? null,
      "",
      `${t("aqTxFee")}: ${formatMoney(F, currency)}`,
      `${t("aqTxDeposit", { pct: n(depositPct) })}: ${formatMoney(anticipo, currency)}`,
      `${t("aqTxBalance")}: ${formatMoney(resto, currency)}`,
    ].filter((l): l is string => l !== null);
    return lineas.join("\n");
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(textoCotizacion());
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1600);
    } catch { /* clipboard bloqueado: el texto sigue visible abajo */ }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#131216] sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div>
            <h2 className="text-[16px] font-bold text-white">{t("aqQuoteTool")}</h2>
            <p className="mt-0.5 max-w-[40ch] text-[11px] leading-snug text-zinc-500">{t("aqQuoteIntro")}</p>
          </div>
          <button onClick={onClose} aria-label={t("abCancel")} className="text-zinc-600 transition hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {gigs.length > 0 ? (
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-zinc-400">{t("aqPickGig")}</span>
              <select
                value={gigId}
                onChange={(e) => {
                  setGigId(e.target.value);
                  const g = gigs.find((x) => x.id === e.target.value);
                  setFee(String(Math.round(Math.max(rate.minFee, g?.fee ?? 0)) || ""));
                  if (g?.cost) setShowCost(String(g.cost));
                }}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[14px] text-white outline-none [color-scheme:dark] focus:border-accent/60"
              >
                {gigs.map((g) => (
                  <option key={g.id} value={g.id}>
                    {[g.eventDate, g.title, g.city].filter(Boolean).join(" · ")}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="rounded-xl border border-dashed border-white/10 px-4 py-3 text-[12px] leading-snug text-zinc-500">
              {t("aqNoGigs")}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <CampoNum label={t("abFee")} value={fee} onChange={setFee} />
            <CampoNum label={t("aqDepositPct")} value={depositPct} onChange={setDepositPct} suffix="%" />
          </div>
          <CampoNum label={t("abFldShowCost")} value={showCost} onChange={setShowCost} />

          {bajoMinimo && (
            <p className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-2.5 text-[11.5px] leading-snug text-red-300">
              {t("aqBelowMin", { min: formatMoney(Math.round(rate.minFee), currency) })}
            </p>
          )}

          {/* Lo que el promotor ve */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-5 py-4">
            <p className="mb-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-500">{t("aqTheyWillSee")}</p>
            <div className="space-y-1.5 text-[13px]">
              <div className="flex justify-between"><span className="text-zinc-400">{t("aqTxFee")}</span><b className="tabular-nums text-white">{formatMoney(F, currency)}</b></div>
              <div className="flex justify-between"><span className="text-zinc-400">{t("aqTxDeposit", { pct: n(depositPct) })}</span><b className="tabular-nums text-accent">{formatMoney(anticipo, currency)}</b></div>
              <div className="flex justify-between"><span className="text-zinc-400">{t("aqTxBalance")}</span><b className="tabular-nums text-white">{formatMoney(resto, currency)}</b></div>
            </div>
          </div>

          {/* Lo que tu ves */}
          <p className="px-1 font-mono text-[10px] text-zinc-600">
            {t("aqYourNet")}: <b className={neto >= 0 ? "text-zinc-400" : "text-red-400"}>{formatMoney(neto, currency)}</b>
            {n(pricing.commissionPercent) > 0 && <> · {t("aqAfterCommission", { pct: n(pricing.commissionPercent) })}</>}
          </p>
        </div>

        <div className="flex items-center gap-3 border-t border-white/[0.06] px-6 py-4">
          <button
            onClick={copiar}
            disabled={F <= 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] py-3 text-[13px] font-bold text-white transition active:scale-[0.98] disabled:opacity-40"
          >
            {copiado ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            {copiado ? t("aqCopied") : t("aqCopy")}
          </button>
          {gig && (
            <button
              onClick={() => { onApplyFee(gig, F); onClose(); }}
              disabled={F <= 0}
              className="flex-1 rounded-2xl bg-accent py-3 text-[13px] font-bold text-black transition hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
            >
              {t("aqApply")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
