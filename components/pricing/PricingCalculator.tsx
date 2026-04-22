"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AudioWaveform,
  Camera,
  Calculator,
  Home,
  Newspaper,
} from "lucide-react";

type FieldConfig = {
  key: string;
  label: string;
};

type ProjectType = {
  id: string;
  name: string;
  multiplier: number;
};

type PricingState = {
  step: number;
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

const personalFields: FieldConfig[] = [
  { key: "vivienda", label: "Vivienda" },
  { key: "alimentacion", label: "Alimentacion" },
  { key: "transporte", label: "Transporte" },
  { key: "servicios", label: "Servicios (luz, agua, gas, internet)" },
  { key: "saludSeguro", label: "Salud / seguro" },
  { key: "deudas", label: "Deudas" },
  { key: "otros", label: "Otros" },
];

const studioFields: FieldConfig[] = [
  { key: "suscripcionesPlugins", label: "Suscripciones / plugins" },
  { key: "equipoProrrateado", label: "Equipo prorrateado" },
  { key: "internetEstudio", label: "Internet estudio" },
  { key: "contador", label: "Contador" },
  { key: "marketing", label: "Marketing" },
  { key: "asistentes", label: "Asistentes" },
  { key: "otros", label: "Otros" },
];

const projectTypes: ProjectType[] = [
  { id: "corto-estudiantil", name: "Cortometraje estudiantil", multiplier: 0.5 },
  { id: "corto-profesional", name: "Cortometraje profesional", multiplier: 2 },
  {
    id: "largometraje-bajo",
    name: "Largometraje bajo presupuesto",
    multiplier: 1.5,
  },
  { id: "largometraje-medio", name: "Largometraje medio", multiplier: 2.5 },
  { id: "largometraje-grande", name: "Largometraje grande", multiplier: 4 },
  { id: "serie-tv", name: "Serie de TV", multiplier: 2.5 },
  { id: "documental", name: "Documental", multiplier: 3 },
  {
    id: "publi-bajo",
    name: "Publicidad bajo presupuesto",
    multiplier: 1.5,
  },
  { id: "publi-alto", name: "Publicidad alto presupuesto", multiplier: 3 },
  { id: "artista-indie", name: "Artista independiente", multiplier: 1 },
  {
    id: "artista-emergente-equipo",
    name: "Artista emergente con equipo",
    multiplier: 1.5,
  },
  { id: "artista-firmado", name: "Artista firmado / disquera", multiplier: 3 },
  { id: "sync-libreria", name: "Composicion sync / libreria", multiplier: 2 },
];

const initialPersonal = Object.fromEntries(personalFields.map((f) => [f.key, ""]));
const initialStudio = Object.fromEntries(studioFields.map((f) => [f.key, ""]));

const defaultState: PricingState = {
  step: 1,
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
      ? Math.min(6, Math.max(1, Math.floor(persisted.step)))
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
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "pricing", label: "Pricing", icon: Calculator },
  { id: "contenido", label: "Contenido", icon: Camera },
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "ideas", label: "Ideas", icon: AudioWaveform },
  { id: "noticias", label: "Noticias", icon: Newspaper },
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
  const [activeTab, setActiveTab] = useState<ModuleTab>("dashboard");
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

  const canGoBack = state.step > 1;
  const canGoNext = state.step < 6;

  return (
    <main className="min-h-screen px-6 py-10 pb-32">
      {activeTab === "pricing" ? (
        <section className="mx-auto w-full max-w-4xl rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm sm:p-10">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">
                Fennec Pricing
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Calculadora de Pricing
              </h1>
              <p className="mt-2 text-zinc-300">Paso {state.step} de 6</p>
            </div>
            <div className="h-2 w-28 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${(state.step / 6) * 100}%` }}
              />
            </div>
          </div>
          {state.step === 1 && (
            <div>
              <h2 className="mb-5 text-xl font-semibold text-white">
                1. Gastos personales mensuales
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {personalFields.map((field) => (
                  <CurrencyInput
                    key={field.key}
                    label={field.label}
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
                Total personal:{" "}
                <span className="font-semibold text-accent">{formatCOP(personalTotal)}</span>
              </p>
            </div>
          )}

          {state.step === 2 && (
            <div>
              <h2 className="mb-5 text-xl font-semibold text-white">2. Gastos del estudio</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {studioFields.map((field) => (
                  <CurrencyInput
                    key={field.key}
                    label={field.label}
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
                Total estudio:{" "}
                <span className="font-semibold text-accent">{formatCOP(studioTotal)}</span>
              </p>
            </div>
          )}

          {state.step === 3 && (
            <div>
              <h2 className="mb-5 text-xl font-semibold text-white">
                3. Seguridad e impuestos
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="flex flex-col gap-2">
                  <span className="text-sm text-zinc-300">% Impuestos</span>
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
                  <span className="text-sm text-zinc-300">% Reinversion</span>
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
                  label="Fondo de emergencia mensual"
                  value={state.emergencyFund}
                  onChange={(value) =>
                    setState((prev) => ({ ...prev, emergencyFund: value }))
                  }
                />
              </div>
              <div className="mt-6 space-y-1 text-zinc-200">
                <p>Base mensual: {formatCOP(baseMonthlyTotal)}</p>
                <p>Impuestos: {formatCOP(taxAmount)}</p>
                <p>Reinversion: {formatCOP(reinvestmentAmount)}</p>
                <p className="text-lg">
                  Total objetivo COP:{" "}
                  <span className="font-semibold text-accent">
                    {formatCOP(monthlyTotalCOP)}
                  </span>
                </p>
              </div>
            </div>
          )}

          {state.step === 4 && (
            <div>
              <h2 className="mb-5 text-xl font-semibold text-white">4. Capacidad</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="flex flex-col gap-2">
                  <span className="text-sm text-zinc-300">Horas por semana</span>
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
                  <span className="text-sm text-zinc-300">Semanas al mes</span>
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
                  <span className="text-sm text-zinc-300">Horas por proyecto</span>
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
                  Horas mensuales disponibles:{" "}
                  <span className="font-semibold text-accent">{availableMonthlyHours}</span>
                </p>
                <p>
                  Proyectos maximos al mes:{" "}
                  <span className="font-semibold text-accent">{maxProjects}</span>
                </p>
              </div>
            </div>
          )}

          {state.step === 5 && (
            <div>
              <h2 className="mb-5 text-xl font-semibold text-white">
                5. Precio minimo por proyecto
              </h2>
              <p className="text-zinc-300">
                Formula: COP total mensual / proyectos maximos al mes
              </p>
              <div className="mt-6 rounded-2xl border border-accent/30 bg-black/30 p-6">
                <p className="text-zinc-300">Resultado</p>
                <p className="mt-2 text-4xl font-bold text-accent">
                  {maxProjects > 0 ? formatCOP(minPricePerProject) : "Define la capacidad"}
                </p>
              </div>
            </div>
          )}

          {state.step === 6 && (
            <div>
              <h2 className="mb-5 text-xl font-semibold text-white">
                6. Tipo de proyecto con multiplicadores
              </h2>
              <label className="flex flex-col gap-2">
                <span className="text-sm text-zinc-300">Selecciona tipo de proyecto</span>
                <select
                  value={state.selectedProjectType}
                  onChange={(e) =>
                    setState((prev) => ({ ...prev, selectedProjectType: e.target.value }))
                  }
                  className="h-11 rounded-xl border border-white/15 bg-black/30 px-3 text-white outline-none focus:border-accent"
                >
                  {projectTypes.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-6 space-y-2 text-zinc-200">
                <p>
                  Precio minimo base:{" "}
                  <span className="font-semibold text-accent">
                    {formatCOP(minPricePerProject)}
                  </span>
                </p>
                <p className="text-xl">
                  Precio recomendado:{" "}
                  <span className="font-bold text-accent">{formatCOP(recommendedPrice)}</span>
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
              Anterior
            </button>
            <button
              onClick={() =>
                setState((prev) => ({ ...prev, step: Math.min(6, prev.step + 1) }))
              }
              disabled={!canGoNext}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </section>
      ) : (
        <section className="mx-auto flex min-h-[70vh] w-full max-w-4xl items-center justify-center rounded-3xl border border-white/10 bg-white/5 p-10 text-center shadow-2xl shadow-black/40 backdrop-blur-sm">
          <div>
            <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">
              Fennec Module
            </p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight text-white">
              {moduleTabs.find((tab) => tab.id === activeTab)?.label}
            </h2>
          </div>
        </section>
      )}

      <nav className="fixed right-0 bottom-0 left-0 z-50 px-4 pb-4">
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
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </main>
  );
}
