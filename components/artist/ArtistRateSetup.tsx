"use client";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { formatMoney, useCurrency } from "@/lib/currency";
import {
  type ArtistPricingState, PERSONAL_FIELDS, PROJECT_FIELDS,
  computeArtistRate, loadArtistPricing, saveArtistPricing,
} from "@/lib/artistBusiness";

/* La tabuladora del artista: gastos mensuales ESTIMADOS -> tarifa minima por
 * show. Un formulario por secciones y no un wizard de 6 pasos como el de
 * produccion: aqui el resultado se recalcula en vivo abajo, asi que ver todo
 * junto ES la herramienta — mueves un numero y ves la tarifa moverse.
 *
 * Los rubros de vida reusan las claves step1.* del wizard de produccion: son
 * los mismos gastos de vivir, ya traducidos. Los del proyecto son propios
 * (spec: docs/SPEC-artist-business-v1-events.md). */

function Campo({
  label, hint, value, onChange, suffix,
}: {
  label: string; hint?: string; value: string;
  onChange: (v: string) => void; suffix?: string;
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
      {hint && <span className="mt-1 block text-[10px] leading-snug text-zinc-600">{hint}</span>}
    </label>
  );
}

function Seccion({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-accent/80">{title}</p>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </section>
  );
}

export default function ArtistRateSetup({
  onClose, onSaved,
}: {
  onClose: () => void;
  onSaved: (s: ArtistPricingState) => void;
}) {
  const { t } = useTranslation();
  const currency = useCurrency();
  const [s, setS] = useState<ArtistPricingState>(() => loadArtistPricing());

  const rate = useMemo(() => computeArtistRate({ ...s, setupCompleted: true }), [s]);

  const setPersonal = (k: string, v: string) =>
    setS((p) => ({ ...p, personalExpenses: { ...p.personalExpenses, [k]: v } }));
  const setProject = (k: string, v: string) =>
    setS((p) => ({ ...p, projectExpenses: { ...p.projectExpenses, [k]: v } }));

  const PROJECT_LABELS: Record<string, string> = {
    equipoProrrateado: t("abFldEquipo"), sueldos: t("abFldSueldos"),
    marketing: t("abFldMarketing"), sesiones: t("abFldSesiones"),
    ensayosTransporte: t("abFldEnsayos"), distribucion: t("abFldDistribucion"),
    otros: t("abFldOtros"),
  };

  function guardar() {
    const done = { ...s, setupCompleted: true };
    saveArtistPricing(done);
    onSaved(done);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#131216] sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div>
            <h2 className="text-[16px] font-bold text-white">{t("abSetupTitle")}</h2>
            <p className="mt-0.5 max-w-[40ch] text-[11px] leading-snug text-zinc-500">{t("abSetupIntro")}</p>
          </div>
          <button onClick={onClose} aria-label={t("abCancel")} className="text-zinc-600 transition hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <Seccion title={t("abSecLife")}>
            {PERSONAL_FIELDS.map((k) => (
              <Campo key={k} label={t(`step1.${k}`)} value={s.personalExpenses[k] ?? ""}
                onChange={(v) => setPersonal(k, v)} />
            ))}
          </Seccion>

          <Seccion title={t("abSecProject")}>
            {PROJECT_FIELDS.map((k) => (
              <Campo key={k} label={PROJECT_LABELS[k]} value={s.projectExpenses[k] ?? ""}
                onChange={(v) => setProject(k, v)} />
            ))}
          </Seccion>

          <Seccion title={t("abSecAdjust")}>
            <Campo label={t("abFldTax")} value={s.taxPercent} suffix="%"
              onChange={(v) => setS((p) => ({ ...p, taxPercent: v }))} />
            <Campo label={t("abFldEmergency")} value={s.emergencyFund}
              onChange={(v) => setS((p) => ({ ...p, emergencyFund: v }))} />
          </Seccion>

          <Seccion title={t("abSecReality")}>
            <Campo label={t("abFldLiveShare")} value={s.liveSharePercent} suffix="%"
              onChange={(v) => setS((p) => ({ ...p, liveSharePercent: v }))} />
            <Campo label={t("abFldShows")} hint={t("abFldShowsHint")} value={s.showsPerMonth}
              onChange={(v) => setS((p) => ({ ...p, showsPerMonth: v }))} />
            <Campo label={t("abFldCommission")} value={s.commissionPercent} suffix="%"
              onChange={(v) => setS((p) => ({ ...p, commissionPercent: v }))} />
            <Campo label={t("abFldShowCost")} value={s.avgShowCost}
              onChange={(v) => setS((p) => ({ ...p, avgShowCost: v }))} />
          </Seccion>
        </div>

        {/* El resultado, vivo: mueves un numero arriba y esto respira */}
        <div className="border-t border-white/[0.06] bg-white/[0.02] px-6 py-4">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div className="space-y-0.5 font-mono text-[10px] text-zinc-500">
              <p>{t("abNeed")} <b className="text-zinc-300">{formatMoney(rate.monthlyNeed, currency)}</b></p>
              <p>{t("abLiveCover")} <b className="text-zinc-300">{formatMoney(rate.liveTarget, currency)}</b> · {t("abNetShow")} <b className="text-zinc-300">{formatMoney(rate.netPerShow, currency)}</b></p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-accent/70">{t("abMinFee")}</p>
              <p className="text-[26px] font-black leading-tight text-accent tabular-nums">
                {formatMoney(rate.minFee, currency)}
              </p>
            </div>
          </div>
          <button
            onClick={guardar}
            disabled={rate.minFee <= 0}
            className="w-full rounded-2xl bg-accent py-3 text-[13px] font-bold text-black transition hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
          >
            {t("abSetupDone")}
          </button>
        </div>
      </div>
    </div>
  );
}
