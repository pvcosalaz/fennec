"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "@/lib/i18n";
import {
  AudioWaveform,
  Camera,
  Briefcase,
  Home,
  Globe,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import SettingsModule from "@/components/settings/SettingsModule";
import Dashboard from "@/components/dashboard/Dashboard";
import BusinessHub, { type BusinessView } from "@/components/business/BusinessHub";
import ClientsLeads from "@/components/business/ClientsLeads";
import QuoteGenerator from "@/components/business/QuoteGenerator";
import ActiveProjects from "@/components/business/ActiveProjects";
import Community from "@/components/community/Community";
import ContentModule from "@/components/content/ContentModule";
import IdeasModule from "@/components/ideas/IdeasModule";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { getProfile, updateDbScore, uploadAudio, createPost } from "@/lib/communityDb";
import type { Profile } from "@/lib/communityTypes";
import AuthGate from "@/components/community/AuthGate";
import UsernameSetup from "@/components/community/UsernameSetup";
import Select from "@/components/ui/Select";

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

function DashboardWave() {
  const fillRef   = useRef<SVGPathElement>(null);
  const strokeRef = useRef<SVGPathElement>(null);
  const rafRef    = useRef<number>(0);
  const W = 400; const H = 64;

  useEffect(() => {
    let phase = 0;
    const tick = () => {
      phase += 0.0015;
      const pts = Array.from({ length: 80 }, (_, i) => ({
        x: (i / 79) * W,
        y: H * 0.72
          + Math.sin(i * 0.18 - phase) * H * 0.08
          + Math.sin(i * 0.09 - phase * 0.6) * H * 0.03,
      }));
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) {
        const cw = (pts[i].x - pts[i-1].x) / 2;
        d += ` C ${pts[i-1].x+cw} ${pts[i-1].y} ${pts[i].x-cw} ${pts[i].y} ${pts[i].x} ${pts[i].y}`;
      }
      fillRef.current?.setAttribute("d", d + ` L ${W} ${H} L 0 ${H} Z`);
      strokeRef.current?.setAttribute("d", d);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="wg2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#f5a623" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#f5a623" stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <path ref={fillRef}   fill="url(#wg2)" />
      <path ref={strokeRef} fill="none" stroke="#f5a623" strokeWidth="1.5" strokeOpacity="0.65" />
    </svg>
  );
}

const moduleTabs: {
  id: ModuleTab;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "pricing", labelKey: "tabs.business", icon: Briefcase },
  { id: "contenido", labelKey: "tabs.content", icon: Camera },
  { id: "dashboard", labelKey: "tabs.dashboard", icon: Home },
  { id: "ideas", labelKey: "tabs.ideas", icon: AudioWaveform },
  { id: "noticias", labelKey: "tabs.community", icon: Globe },
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
      <span className="text-xs text-zinc-400">{label}</span>
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
  const [activeTab, setActiveTab] = useState<ModuleTab>(() => {
    if (typeof window === "undefined") return "dashboard";
    const saved = localStorage.getItem("fennec_active_tab") as ModuleTab | null;
    const valid: ModuleTab[] = ["pricing", "contenido", "dashboard", "ideas", "noticias"];
    return saved && valid.includes(saved) ? saved : "dashboard";
  });
  useEffect(() => { localStorage.setItem("fennec_active_tab", activeTab); }, [activeTab]);

  const [pendingAudio, setPendingAudio] = useState<{ url: string; name: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [businessView, setBusinessView] = useState<BusinessView>("hub");
  const prevBusinessView = useRef<BusinessView>("hub");

  // Auto-open setup when user enters calculator without financial data
  useEffect(() => {
    if (businessView === "calculator" && !showSetup) {
      const saved = localStorage.getItem("fennec-pricing-v1");
      const parsed = saved ? JSON.parse(saved) : null;
      if (!parsed?.setupCompleted) {
        setState((prev) => ({ ...prev, step: 1 }));
        setShowSetup(true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessView]);

  // ── Auth gate ────────────────────────────────────────────────────
  const [authUser, setAuthUser]       = useState<{ id: string } | null>(null);
  const [profile, setProfile]         = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setAuthLoading(false), 4000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      const user = session?.user ?? null;
      setAuthUser(user ? { id: user.id } : null);
      if (user) loadProfile(user.id);
      else setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setAuthUser(user ? { id: user.id } : null);
      if (user) loadProfile(user.id);
      else { setProfile(null); setAuthLoading(false); }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProfile(userId: string) {
    const p = await getProfile(userId);
    setAuthLoading(false);
    if (p) {
      // Calculate score directly from localStorage data (same formula as Dashboard)
      // so we don't depend on Dashboard having run first
      const computedScore = (() => {
        try {
          const projects: { status: string }[] = JSON.parse(localStorage.getItem("fennec-projects-v1") ?? "[]");
          const quotes:   { status: string }[] = JSON.parse(localStorage.getItem("fennec-quotes-v1")   ?? "[]");
          const clients:  unknown[]            = JSON.parse(localStorage.getItem("fennec-clients-v1")  ?? "[]");
          const active  = projects.filter((pr) => pr.status !== "paid").length;
          const closed  = projects.filter((pr) => pr.status === "paid").length;
          const sent    = quotes.filter((q)  => q.status === "sent").length;
          return Math.round(active * 150 + closed * 50 + clients.length * 75 + sent * 25);
        } catch { return 0; }
      })();

      // Save computed score so Dashboard picks it up too
      localStorage.setItem("fennec-db-score", String(computedScore));

      if (computedScore !== p.fennec_db_score) {
        updateDbScore(userId, computedScore);
        setProfile({ ...p, fennec_db_score: computedScore });
      } else {
        setProfile(p);
      }
    } else {
      setProfile(null);
    }
  }
  const [quantity, setQuantity] = useState<number | null>(null);
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

  // ── Auth gate renders ────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="h-7 w-7 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="flex h-screen flex-col bg-black">
        <AuthGate />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-screen flex-col bg-black">
        <UsernameSetup userId={authUser.id} avatarUrl={null} onComplete={setProfile} />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
    <main className="flex-1 overflow-y-auto overscroll-none pb-6 pt-6">
      {/* Settings button */}
      <div className={`flex w-full max-w-4xl items-center px-6 ${activeTab === "dashboard" ? "mb-0" : "mb-4"}`}>
        <div className="flex-1" />
        {activeTab === "dashboard" && profile.username && (
          <span className="text-xl font-bold text-amber-400">@{profile.username}</span>
        )}
        <div className="flex-1 flex justify-end">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center justify-center h-8 w-8 rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-accent hover:border-accent/30 transition"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
      {/* wave removed */}
      {showSettings ? (
        <SettingsModule
          onBack={() => setShowSettings(false)}
          language={i18n.resolvedLanguage ?? "en"}
          onLanguageChange={(lang) => { void i18n.changeLanguage(lang); }}
          avatarUrl={profile.avatar_url}
        />
      ) : activeTab === "pricing" && businessView === "hub" ? (
        <BusinessHub onOpenView={setBusinessView} isPro={profile?.is_pro ?? true} userId={authUser.id} />
      ) : activeTab === "pricing" && businessView === "projects" ? (
        <ActiveProjects onBack={() => setBusinessView("hub")} userId={authUser.id} />
      ) : activeTab === "pricing" && businessView === "clients" ? (
        <ClientsLeads onBack={() => setBusinessView(prevBusinessView.current)} userId={authUser.id} />
      ) : activeTab === "pricing" && businessView === "quotes" ? (
        <QuoteGenerator
          onBack={() => setBusinessView("hub")}
          onGoToClients={() => { prevBusinessView.current = "quotes"; setBusinessView("clients"); }}
          onGoToCalculator={() => setBusinessView("calculator")}
          onGoToProjects={() => setBusinessView("projects")}
          userId={authUser.id}
        />
      ) : activeTab === "pricing" && businessView === "calculator" ? (
        <section className="mx-auto w-full max-w-4xl rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm sm:p-10">
          <button
            onClick={() => setBusinessView("hub")}
            className="mb-6 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-accent transition"
          >
            ← Back to Business
          </button>
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">
                {t("brand")}
              </p>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">
                {t("calculatorTitle")}
              </h1>
              <p className="mt-2 text-sm text-zinc-400">{t("calculatorSubtitle")}</p>
            </div>
            <button
              onClick={() => {
                setState((prev) => ({ ...prev, step: 1 }));
                setShowSetup((prev) => !prev);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-zinc-200 transition hover:border-accent hover:text-white whitespace-nowrap"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {showSetup ? "Close" : "My expenses"}
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
                      <span className="text-xs text-zinc-400">{t("step3.impuestos")}</span>
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
                      <span className="text-xs text-zinc-400">{t("step3.reinversion")}</span>
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
                      <span className="text-xs text-zinc-400">{t("step4.horasSemana")}</span>
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
                      <span className="text-xs text-zinc-400">{t("step4.semanasMes")}</span>
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
                      <span className="text-xs text-zinc-400">{t("step4.horasProyecto")}</span>
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
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{t("quote.title")}</h2>
                  <p className="mt-1 text-zinc-400 text-sm">{t("quote.subtitle")}</p>
                </div>
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
              ) : (() => {
                const effectiveQty = quantity ?? maxProjects;
                const monthlyMin = minPricePerProject * effectiveQty;
                const monthlyRec = recommendedPrice * effectiveQty;
                const coveragePct = monthlyTotalCOP > 0
                  ? Math.round((monthlyRec / monthlyTotalCOP) * 100)
                  : 0;
                const barWidth = Math.min(coveragePct, 100);
                const isHealthy = coveragePct >= 100;

                return (
                  <div className="space-y-4 pb-2">
                    {/* Project type */}
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-5 space-y-4">
                      <label className="flex flex-col gap-2">
                        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                          Project type
                        </span>
                        <Select
                          value={state.selectedProjectType}
                          onChange={(val) => setState((prev) => ({ ...prev, selectedProjectType: val }))}
                          options={projectTypes.map((p) => ({ value: p.id, label: t(p.nameKey) }))}
                        />
                      </label>

                      {/* Quantity selector */}
                      <div className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                          Projects this month
                        </span>
                        <div className="flex gap-2 flex-wrap">
                          {Array.from({ length: Math.min(maxProjects, 8) }, (_, i) => i + 1).map((n) => (
                            <button
                              key={n}
                              onClick={() => setQuantity(n)}
                              className={`h-9 w-9 rounded-xl text-sm font-semibold transition ${
                                effectiveQty === n
                                  ? "bg-accent text-black"
                                  : "border border-white/15 bg-black/30 text-zinc-300 hover:border-accent/50 hover:text-white"
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-zinc-500">
                          Based on your setup, you can take up to {maxProjects} project{maxProjects !== 1 ? "s" : ""}/month.
                        </p>
                      </div>
                    </div>

                    {/* Per project */}
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
                        Per project
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-zinc-500">Minimum</p>
                          <p className="text-lg font-semibold text-zinc-200">{formatCOP(minPricePerProject)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">Recommended</p>
                          <p className="text-lg font-bold text-accent">{formatCOP(recommendedPrice)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Monthly projection */}
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
                        Monthly projection × {effectiveQty}
                      </p>
                      <div className="grid grid-cols-2 gap-4 mb-5">
                        <div>
                          <p className="text-xs text-zinc-500">Minimum total</p>
                          <p className="text-lg font-semibold text-zinc-200">{formatCOP(monthlyMin)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">Recommended total</p>
                          <p className="text-xl font-bold text-accent">{formatCOP(monthlyRec)}</p>
                        </div>
                      </div>

                      {/* vs monthly target */}
                      <div className="border-t border-white/10 pt-4 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400">Your monthly target</span>
                          <span className="font-semibold text-zinc-200">{formatCOP(monthlyTotalCOP)}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full rounded-full transition-all ${isHealthy ? "bg-accent" : "bg-red-400"}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <p className={`text-xs font-medium ${isHealthy ? "text-accent" : "text-red-400"}`}>
                          {isHealthy
                            ? `✓ ${coveragePct}% of your target covered — you're good`
                            : `⚠ Only ${coveragePct}% covered — consider more projects or higher rates`}
                        </p>
                      </div>
                    </div>

                  {/* ── Upsell CTA ───────────────────────────────── */}
                  <button
                    onClick={() => {
                      if (profile?.is_pro) {
                        setBusinessView("quotes");
                        setActiveTab("pricing");
                      } else {
                        setShowUpgrade(true);
                      }
                    }}
                    className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 py-4 px-5 flex items-center justify-between shadow-lg shadow-amber-500/25 hover:brightness-110 transition active:scale-[0.98]"
                  >
                    <div className="text-left">
                      <p className="text-sm font-black text-black">Send this quote to a client →</p>
                      <p className="text-[11px] text-black/60 mt-0.5">Your price is set. Now get paid.</p>
                    </div>
                    <span className="text-xl">💸</span>
                  </button>
                </div>);

              })()}
            </div>
          )}

          {/* ── Upgrade sheet ─────────────────────────────────────── */}
          {showUpgrade && !profile?.is_pro && (
            <>
              <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={() => setShowUpgrade(false)} />
              <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-zinc-950 border-t border-white/10 p-6 space-y-5">
                <div className="w-10 h-1 bg-white/20 rounded-full mx-auto" />

                <div className="space-y-1">
                  <p className="text-xl font-black text-white">Your price is set.</p>
                  <p className="text-xl font-black text-accent">Now close the deal.</p>
                  <p className="text-sm text-zinc-500 mt-2">Upgrade to Pro and turn your rate into real income.</p>
                </div>

                <div className="space-y-2.5">
                  {[
                    { emoji: "👥", label: "Clients & Leads",    desc: "Store contacts, track prospects" },
                    { emoji: "📄", label: "Quote Generator",     desc: "Send pro quotes in seconds" },
                    { emoji: "📁", label: "Active Projects",     desc: "Deadlines, status, deliverables" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3">
                      <span className="text-lg">{item.emoji}</span>
                      <div>
                        <p className="text-sm font-semibold text-white">{item.label}</p>
                        <p className="text-[11px] text-zinc-500">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 transition text-black font-black text-base shadow-lg shadow-amber-500/30">
                  Start Pro — $9.99 / month
                </button>

                <button onClick={() => setShowUpgrade(false)} className="w-full text-xs text-zinc-600 hover:text-zinc-400 transition py-1">
                  Maybe later
                </button>
              </div>
            </>
          )}
        </section>
      ) : activeTab === "dashboard" ? (
        <Dashboard avatarUrl={profile.avatar_url} username={profile.username} isPro={profile.is_pro} userId={authUser?.id} />
      ) : activeTab === "contenido" ? (
        <ContentModule />
      ) : activeTab === "ideas" ? (
        <IdeasModule
          onBack={() => setActiveTab("dashboard")}
          onShareToFeed={profile ? async (blob, title) => {
            const url = await uploadAudio(blob, `${title}.webm`);
            setPendingAudio({ url, name: title });
            setActiveTab("noticias");
          } : undefined}
        />
      ) : activeTab === "noticias" ? (
        <Community
          profile={profile}
          openComposerWith={pendingAudio}
          onComposerConsumed={() => setPendingAudio(null)}
        />
      ) : null}

    </main>
      <nav className="shrink-0 border-t border-white/8 bg-background backdrop-blur-xl" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="mx-auto flex w-full max-w-2xl items-center px-2 pb-3 pt-2">
          {moduleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isHome   = tab.id === "dashboard";
            const isFennec = tab.id === "noticias";

            /* ── Fennec tab — logo ──────────────────────── */
            if (isFennec) {
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setBusinessView("hub"); }}
                  className="flex flex-1 flex-col items-center justify-center py-3 transition"
                >
                  <img
                    src="/fennec-icon.png"
                    alt="Fennec"
                    style={{
                      width: 36,
                      height: 36,
                      objectFit: "contain",
                      mixBlendMode: "screen",
                      opacity: isActive ? 1 : 0.45,
                      transition: "opacity 0.2s",
                    }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                  {isActive && <div className="mt-1.5 h-0.5 w-4 rounded-full bg-accent" />}
                </button>
              );
            }

            /* ── Home ───────────────────────────────────── */
            if (isHome) {
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setBusinessView("hub"); }}
                  className="flex flex-1 flex-col items-center justify-center py-3 transition"
                >
                  <div className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
                    isActive ? "bg-accent shadow-md shadow-accent/40" : "bg-zinc-800"
                  }`}>
                    <Icon className={`h-6 w-6 ${isActive ? "text-black" : "text-zinc-400"}`} />
                  </div>
                </button>
              );
            }

            /* ── Regular tabs ───────────────────────────── */
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setBusinessView("hub"); }}
                className={`flex flex-1 flex-col items-center justify-center py-3 transition ${
                  isActive ? "text-accent" : "text-zinc-500"
                }`}
              >
                <Icon className="h-6 w-6" />
                {isActive && <div className="mt-1.5 h-0.5 w-4 rounded-full bg-accent" />}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
