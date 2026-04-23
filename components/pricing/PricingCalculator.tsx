"use client";

import { useEffect, useMemo, useState } from "react";
import "@/lib/i18n";
import {
  AudioWaveform,
  Camera,
  Briefcase,
  Home,
  Newspaper,
  Settings,
} from "lucide-react";
import Dashboard from "@/components/dashboard/Dashboard";
import { useTranslation } from "react-i18next";

type FieldConfig = {
  key: string;
  labelKey: string;
};

type ProjectType = {
  id: string;
  nameKey: string;
  multiplier: number;
};

type PricingState = {
  step: number;
  setupCompleted: boolean;
  personalExpenses: Record<string, string>;
  studioExpenses: Record<string, string>;
  taxPercent: string;
  reinvestmentPercent: string;
  emergencyFund: string;
  hoursPerWeek: string;
  weeksPerMonth: string;
  hoursPerProject: string;
  selectedProjectType: string;
};

type ModuleTab = "pricing" | "contenido" | "dashboard" | "ideas" | "noticias";

const STORAGE_KEY = "fennec-pricing-v1";
const LANGUAGE_STORAGE_KEY = "fennec-language";

const personalFields: FieldConfig[] = [
  { key: "vivienda", labelKey: "step1.vivienda" },
  { key: "alimentacion", labelKey: "step1.alimentacion" },
  { key: "transporte", labelKey: "step1.transporte" },
  { key: "servicios", labelKey: "step1.servicios" },
  { key: "saludSeguro", labelKey: "step1.saludSeguro" },
  { key: "deudas", labelKey: "step1.deudas" },
  { key: "otros", labelKey: "step1.otros" },
];

const studioFields: FieldConfig[] = [
  { key: "suscripcionesPlugins", labelKey: "step2.suscripcionesPlugins" },
  { key: "equipoProrrateado", labelKey: "step2.equipoProrrateado" },
  { key: "internetEstudio", labelKey: "step2.internetEstudio" },
  { key: "contador", labelKey: "step2.contador" },
  { key: "marketing", labelKey: "step2.marketing" },
  { key: "asistentes", labelKey: "step2.asistentes" },
  { key: "otros", labelKey: "step2.otros" },
];

const projectTypes: ProjectType[] = [
  { id: "corto-estudiantil", nameKey: "step6.cortoEstudiantil", multiplier: 0.5 },
  { id: "corto-profesional", nameKey: "step6.cortoProfesional", multiplier: 2 },
  {
    id: "largometraje-bajo",
    nameKey: "step6.largometrajeBajo",
    multiplier: 1.5,
  },
  { id: "largometraje-medio", nameKey: "step6.largometrajeMedio", multiplier: 2.5 },
  { id: "largometraje-grande", nameKey: "step6.largometrajeGrande", multiplier: 4 },
  { id: "serie-tv", nameKey: "step6.serieTv", multiplier: 2.5 },
  { id: "documental", nameKey: "step6.documental", multiplier: 3 },
  {
    id: "publi-bajo",
    nameKey: "step6.publiBajo",
    multiplier: 1.5,
  },
  { id: "publi-alto", nameKey: "step6.publiAlto", multiplier: 3 },
  { id: "artista-indie", nameKey: "step6.artistaIndie", multiplier: 1 },
  {
    id: "artista-emergente-equipo",
    nameKey: "step6.artistaEmergenteEquipo",
    multiplier: 1.5,
  },
  { id: "artista-firmado", nameKey: "step6.artistaFirmado", multiplier: 3 },
  { id: "sync-libreria", nameKey: "step6.syncLibreria", multiplier: 2 },
];

const initialPersonal = Object.fromEntries(personalFields.map((f) => [f.key, ""]));
const initialStudio = Object.fromEntries(studioFields.map((f) => [f.key, ""]));

const defaultState: PricingState = {
  step: 1,
  setupCompleted: false,
  personalExpenses: initialPersonal,
  studioExpenses: initialStudio,
  taxPercent: "19",
  reinvestmentPercent: "10",
  emergencyFund: "",
  hoursPerWeek: "30",
  weeksPerMonth: "4",
  hoursPerProject: "40",
  selectedProjectType: projectTypes[0].id,
};

const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const sumValues = (values: Record<string, string>) =>
  Object.values(values).reduce((acc, value) => acc + toNumber(value), 0);

const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

const mergePersistedState = (persisted: Partial<PricingState>): PricingState => ({
  ...defaultState,
  ...persisted,
  step:
    typeof persisted.step === "number"
      ? Math.min(4, Math.max(1, Math.floor(persisted.step)))
      : defaultState.step,
  personalExpenses: {
    ...defaultState.personalExpenses,
    ...(persisted.personalExpenses ?? {}),
  },
  studioExpenses: {
    ...defaultState.studioExpenses,
    ...(persisted.studioExpenses ?? {}),
  },
});

const moduleTabs: {
  id: ModuleTab;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "pricing", labelKey: "tabs.business", icon: Briefcase },
  { id: "contenido", labelKey: "tabs.content", icon: Camera },
  { id: "dashboard", labelKey: "tabs.dashboard", icon: Home },
  { id: "ideas", labelKey: "tabs.ideas", icon: AudioWaveform },
  { id: "noticias", labelKey: "tabs.news", icon: Newspaper },
];

function CurrencyInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm text-zinc-300">{label}</span>
      <input
        type="number"
        min="0"
        step="1000"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="h-11 rounded-xl border border-white/15 bg-black/30 px-3 text-white outline-none ring-0 placeholder:text-zinc-500 focus:border-accent"
      />
    </label>
  );
}

export default function PricingCalculator() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<ModuleTab>("dashboard");
  const [showSetup, setShowSetup] = useState(false);
  const [state, setState] = useState<PricingState>(() => {
    if (typeof window === "undefined") {
      return defaultState;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return defaultState;
      }

      const parsed = JSON.parse(stored) as Partial<PricingState>;
      return mergePersistedState(parsed);
    } catch {
      return defaultState;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage === "en" || savedLanguage === "es") {
      void i18n.changeLanguage(savedLanguage);
    }
  }, [i18n]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const normalizedLanguage = i18n.resolvedLanguage?.startsWith("es") ? "es" : "en";
    localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizedLanguage);
  }, [i18n.resolvedLanguage]);

  const personalTotal = useMemo(
    () => sumValues(state.personalExpenses),
    [state.personalExpenses],
  );
  const studioTotal = useMemo(() => sumValues(state.studioExpenses), [state.studioExpenses]);

  const baseMonthlyTotal = personalTotal + studioTotal;
  const taxAmount = (baseMonthlyTotal * toNumber(state.taxPercent)) / 100;
  const reinvestmentAmount =
    (baseMonthlyTotal * toNumber(state.reinvestmentPercent)) / 100;
  const monthlyTotalCOP =
    baseMonthlyTotal + taxAmount + reinvestmentAmount + toNumber(state.emergencyFund);

  const availableMonthlyHours = toNumber(state.hoursPerWeek) * toNumber(state.weeksPerMonth);
  const maxProjects =
    toNumber(state.hoursPerProject) > 0
      ? Math.floor(availableMonthlyHours / toNumber(state.hoursPerProject))
      : 0;

  const minPricePerProject = maxProjects > 0 ? monthlyTotalCOP / maxProjects : 0;

  const activeProjectType =
    projectTypes.find((project) => project.id === state.selectedProjectType) ??
    projectTypes[0];
  const recommendedPrice = minPricePerProject * activeProjectType.multiplier;

  const isSetupComplete =
    state.setupCompleted && monthlyTotalCOP > 0 && maxProjects > 0;
  const canGoBack = state.step > 1;
  const canGoNext = state.step < 4;

  return (
    <div className="flex h-screen flex-col">
    <main className="flex-1 overflow-y-auto px-6 pt-10 pb-6">
      <div className="mx-auto mb-4 flex w-full max-w-4xl justify-end">
        <label className="flex items-center gap-2 text-xs text-zinc-300">
          <span>{t("language")}</span>
          <select
            value={i18n.resolvedLanguage?.startsWith("es") ? "es" : "en"}
            onChange={(e) => void i18n.changeLanguage(e.target.value)}
            className="rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-zinc-100 outline-none focus:border-accent"
          >
            <option value="en">{t("languageEnglish")}</option>
            <option value="es">{t("languageSpanish")}</option>
          </select>
        </label>
      </div>
      {activeTab === "pricing" ? (
        <section className="mx-auto w-full max-w-4xl rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm sm:p-10">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">
                {t("brand")}
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {t("calculatorTitle")}
              </h1>
            </div>
            <button
              onClick={() => setShowSetup((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-zinc-200 transition hover:border-accent hover:text-white"
            >
              <Settings className="h-4 w-4" />
              {t("settings")}
            </button>
          </div>
          {showSetup ? (
            <div>
              <p className="mb-2 text-zinc-300">{t("stepCounter", { step: state.step })}</p>
              <div className="mb-8 h-2 w-28 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${(state.step / 4) * 100}%` }}
                />
              </div>

              {state.step === 1 && (
                <div>
                  <h2 className="mb-5 text-xl font-semibold text-white">{t("step1.title")}</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {personalFields.map((field) => (
                      <CurrencyInput
                        key={field.key}
                        label={t(field.labelKey)}
                        value={state.personalExpenses[field.key] ?? ""}
                        onChange={(value) =>
                          setState((prev) => ({
                            ...prev,
                            personalExpenses: { ...prev.personalExpenses, [field.key]: value },
                          }))
                        }
                      />
                    ))}
                  </div>
                  <p className="mt-6 text-lg text-zinc-200">
                    {t("step1.total")}{" "}
                    <span className="font-semibold text-accent">{formatCOP(personalTotal)}</span>
                  </p>
                </div>
              )}

              {state.step === 2 && (
                <div>
                  <h2 className="mb-5 text-xl font-semibold text-white">{t("step2.title")}</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {studioFields.map((field) => (
                      <CurrencyInput
                        key={field.key}
                        label={t(field.labelKey)}
                        value={state.studioExpenses[field.key] ?? ""}
                        onChange={(value) =>
                          setState((prev) => ({
                            ...prev,
                            studioExpenses: { ...prev.studioExpenses, [field.key]: value },
                          }))
                        }
                      />
                    ))}
                  </div>
                  <p className="mt-6 text-lg text-zinc-200">
                    {t("step2.total")}{" "}
                    <span className="font-semibold text-accent">{formatCOP(studioTotal)}</span>
                  </p>
                </div>
              )}

              {state.step === 3 && (
                <div>
                  <h2 className="mb-5 text-xl font-semibold text-white">{t("step3.title")}</h2>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="flex flex-col gap-2">
                      <span className="text-sm text-zinc-300">{t("step3.impuestos")}</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={state.taxPercent}
                        onChange={(e) =>
                          setState((prev) => ({ ...prev, taxPercent: e.target.value }))
                        }
                        className="h-11 rounded-xl border border-white/15 bg-black/30 px-3 text-white outline-none focus:border-accent"
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-sm text-zinc-300">{t("step3.reinversion")}</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={state.reinvestmentPercent}
                        onChange={(e) =>
                          setState((prev) => ({
                            ...prev,
                            reinvestmentPercent: e.target.value,
                          }))
                        }
                        className="h-11 rounded-xl border border-white/15 bg-black/30 px-3 text-white outline-none focus:border-accent"
                      />
                    </label>
                    <CurrencyInput
                      label={t("step3.fondo")}
                      value={state.emergencyFund}
                      onChange={(value) =>
                        setState((prev) => ({ ...prev, emergencyFund: value }))
                      }
                    />
                  </div>
                  <div className="mt-6 space-y-1 text-zinc-200">
                    <p>{t("step3.base")} {formatCOP(baseMonthlyTotal)}</p>
                    <p>{t("step3.impuestosMonto")} {formatCOP(taxAmount)}</p>
                    <p>{t("step3.reinversionMonto")} {formatCOP(reinvestmentAmount)}</p>
                    <p className="text-lg">
                      {t("step3.totalObjetivo")}{" "}
                      <span className="font-semibold text-accent">
                        {formatCOP(monthlyTotalCOP)}
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {state.step === 4 && (
                <div>
                  <h2 className="mb-5 text-xl font-semibold text-white">{t("step4.title")}</h2>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="flex flex-col gap-2">
                      <span className="text-sm text-zinc-300">{t("step4.horasSemana")}</span>
                      <input
                        type="number"
                        min="0"
                        value={state.hoursPerWeek}
                        onChange={(e) =>
                          setState((prev) => ({ ...prev, hoursPerWeek: e.target.value }))
                        }
                        className="h-11 rounded-xl border border-white/15 bg-black/30 px-3 text-white outline-none focus:border-accent"
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-sm text-zinc-300">{t("step4.semanasMes")}</span>
                      <input
                        type="number"
                        min="0"
                        value={state.weeksPerMonth}
                        onChange={(e) =>
                          setState((prev) => ({ ...prev, weeksPerMonth: e.target.value }))
                        }
                        className="h-11 rounded-xl border border-white/15 bg-black/30 px-3 text-white outline-none focus:border-accent"
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-sm text-zinc-300">{t("step4.horasProyecto")}</span>
                      <input
                        type="number"
                        min="1"
                        value={state.hoursPerProject}
                        onChange={(e) =>
                          setState((prev) => ({ ...prev, hoursPerProject: e.target.value }))
                        }
                        className="h-11 rounded-xl border border-white/15 bg-black/30 px-3 text-white outline-none focus:border-accent"
                      />
                    </label>
                  </div>
                  <div className="mt-6 space-y-2 text-zinc-200">
                    <p>
                      {t("step4.horasMensuales")}{" "}
                      <span className="font-semibold text-accent">{availableMonthlyHours}</span>
                    </p>
                    <p>
                      {t("step4.proyectosMaximos")}{" "}
                      <span className="font-semibold text-accent">{maxProjects}</span>
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-10 flex items-center justify-between border-t border-white/10 pt-6">
                <button
                  onClick={() =>
                    setState((prev) => ({ ...prev, step: Math.max(1, prev.step - 1) }))
                  }
                  disabled={!canGoBack}
                  className="rounded-xl border border-white/15 px-4 py-2 text-sm text-zinc-200 transition hover:border-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t("previous")}
                </button>
                {canGoNext ? (
                  <button
                    onClick={() =>
                      setState((prev) => ({ ...prev, step: Math.min(4, prev.step + 1) }))
                    }
                    className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
                  >
                    {t("next")}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setState((prev) => ({ ...prev, setupCompleted: true }));
                      setShowSetup(false);
                    }}
                    className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
                  >
                    {t("finishSetup")}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-white">{t("quote.title")}</h2>
                <p className="mt-2 text-zinc-300">{t("quote.subtitle")}</p>
              </div>

              {!isSetupComplete ? (
                <div className="rounded-2xl border border-amber-400/30 bg-black/30 p-6">
                  <p className="text-zinc-200">{t("quote.setupMissing")}</p>
                  <button
                    onClick={() => setShowSetup(true)}
                    className="mt-4 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
                  >
                    {t("openSetup")}
                  </button>
                </div>
              ) : (
                <div className="space-y-5 rounded-2xl border border-white/10 bg-black/30 p-6">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm text-zinc-300">{t("quote.selectProjectType")}</span>
                    <select
                      value={state.selectedProjectType}
                      onChange={(e) =>
                        setState((prev) => ({ ...prev, selectedProjectType: e.target.value }))
                      }
                      className="h-11 rounded-xl border border-white/15 bg-black/30 px-3 text-white outline-none focus:border-accent"
                    >
                      {projectTypes.map((project) => (
                        <option key={project.id} value={project.id}>
                          {t(project.nameKey)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <p className="text-zinc-200">
                    {t("quote.minimumPrice")}{" "}
                    <span className="font-semibold text-accent">
                      {formatCOP(minPricePerProject)}
                    </span>
                  </p>
                  <p className="text-xl text-zinc-100">
                    {t("quote.recommendedPrice")}{" "}
                    <span className="font-bold text-accent">{formatCOP(recommendedPrice)}</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      ) : activeTab === "dashboard" ? (
        <Dashboard />
      ) : (
        <section className="mx-auto flex min-h-[70vh] w-full max-w-4xl items-center justify-center rounded-3xl border border-white/10 bg-white/5 p-10 text-center shadow-2xl shadow-black/40 backdrop-blur-sm">
          <div>
            <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">
              {t("module.title")}
            </p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight text-white">
              {t(moduleTabs.find((tab) => tab.id === activeTab)?.labelKey ?? "tabs.dashboard")}
            </h2>
          </div>
        </section>
      )}

    </main>
      <nav className="shrink-0 px-4 pb-4 pt-2">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between rounded-2xl border border-white/10 bg-black/80 px-2 py-2 backdrop-blur-xl">
          {moduleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs transition ${
                  isActive
                    ? "text-accent"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{t(tab.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
