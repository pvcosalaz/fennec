"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function SplashScreen({ exiting }: { exiting: boolean }) {
  const chars = ["f", "e", "n", "n", "e", "c"];
  const delays = [0.05, 0.15, 0.24, 0.33, 0.42, 0.50];

  return (
    <div
      className="flex h-screen flex-col items-center justify-center bg-[#0d0d0f] relative overflow-hidden"
      style={{
        transition: "opacity 0.5s ease, transform 0.5s ease",
        opacity: exiting ? 0 : 1,
        transform: exiting ? "scale(1.08)" : "scale(1)",
      }}
    >
      {/* Content — shifted slightly above true center */}
      <div style={{ transform: "translateY(-8%)", display: "flex", flexDirection: "column", alignItems: "center" }}>

        {/* "fennec" — letter by letter */}
        <div style={{
          display: "flex", alignItems: "baseline", gap: 1,
          perspective: 600, position: "relative",
        }}>
          {chars.map((c, i) => (
            <span key={i} style={{
              fontSize: 64, fontWeight: 900, lineHeight: 1,
              letterSpacing: "-0.03em", color: "#fff",
              opacity: 0, display: "inline-block",
              animation: `bChar 0.35s cubic-bezier(.16,1,.3,1) ${delays[i]}s both`,
            }}>{c}</span>
          ))}

          {/* Amber dot */}
          <span style={{
            display: "inline-block",
            width: 7, height: 7, borderRadius: "50%",
            background: "#f5a623",
            boxShadow: "0 0 10px rgba(245,166,35,0.9)",
            opacity: 0, flexShrink: 0,
            alignSelf: "flex-end",
            marginLeft: 3, marginBottom: 10,
            animation: "bDot 0.3s ease 0.75s forwards",
          }} />

          {/* Underline extending left→right */}
          <div style={{
            position: "absolute", bottom: -6, left: 0,
            height: 2, borderRadius: 2, width: 0,
            background: "#f5a623",
            boxShadow: "0 0 10px rgba(245,166,35,0.6)",
            animation: "bUnder 0.45s cubic-bezier(.16,1,.3,1) 0.65s both",
          }} />
        </div>

        {/* Tagline */}
        <p style={{
          fontSize: 10, letterSpacing: "0.18em",
          textTransform: "uppercase", color: "#444",
          marginTop: 20, opacity: 0,
          animation: "bDot 0.4s ease 1.0s forwards",
        }}>
          music business &amp; community hub
        </p>

      </div>

      <style>{`
@keyframes bChar {
          from { opacity: 0; transform: translateY(20px) rotateX(90deg); }
          to   { opacity: 1; transform: translateY(0)    rotateX(0deg); }
        }
        @keyframes bUnder {
          from { width: 0;    opacity: 0; }
          to   { width: 100%; opacity: 1; }
        }
        @keyframes bDot {
          from { opacity: 0; transform: scale(0); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes fennecNavGlow {
          from { opacity: 0.5; transform: scale(0.9); }
          to   { opacity: 1.0; transform: scale(1.15); }
        }
        @keyframes fennecNavScale {
          from { transform: scale(1.0); }
          to   { transform: scale(1.06); }
        }
        @keyframes fennecEntryGlow {
          0%   { opacity: 0; }
          30%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
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
import AudioModule from "@/components/audio/AudioModule";
import SettingsModule, { type Section as SettingsSection } from "@/components/settings/SettingsModule";
import Dashboard from "@/components/dashboard/Dashboard";
import BusinessHub, { type BusinessView } from "@/components/business/BusinessHub";
import ClientsLeads from "@/components/business/ClientsLeads";
import QuoteGenerator from "@/components/business/QuoteGenerator";
import ActiveProjects from "@/components/business/ActiveProjects";
import NetworkSection from "@/components/network/NetworkSection";
import { getProjects, getQuotes, getClients } from "@/lib/businessDb";
import Community from "@/components/community/Community";
import NotificationBell from "@/components/notifications/NotificationBell";
import ContentModule from "@/components/content/ContentModule";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { getProfile, updateDbScore } from "@/lib/communityDb";
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

type CalcCurrency = "USD" | "MXN" | "COP";
const CALC_CURRENCY_KEY = "fennec-calc-currency-v1";
const CURRENCY_LOCALES: Record<CalcCurrency, string> = { USD: "en-US", MXN: "es-MX", COP: "es-CO" };

const formatCurrency = (value: number, currency: CalcCurrency) =>
  new Intl.NumberFormat(CURRENCY_LOCALES[currency], {
    style: "currency",
    currency,
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
  const [activeTab, setActiveTab] = useState<ModuleTab>("dashboard");
  useEffect(() => {
    localStorage.setItem("fennec_active_tab", activeTab);
    if (activeTab === "contenido") localStorage.setItem("fennec_visited_marketing_v1", "1");
  }, [activeTab]);

  const [showSettings,    setShowSettings]    = useState(false);

  // Lock body scroll on tabs that should not scroll
  useEffect(() => {
    const locked = (activeTab === "dashboard" || activeTab === "contenido") && !showSettings;

    const preventScroll = (e: Event) => { e.preventDefault(); };

    if (locked) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      // Block wheel (trackpad) and touch scroll at the event level
      document.addEventListener("wheel",     preventScroll, { passive: false });
      document.addEventListener("touchmove", preventScroll, { passive: false });
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.removeEventListener("wheel",     preventScroll);
      document.removeEventListener("touchmove", preventScroll);
    }

    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.removeEventListener("wheel",     preventScroll);
      document.removeEventListener("touchmove", preventScroll);
    };
  }, [activeTab, showSettings]);

  const [calcCurrency, setCalcCurrency] = useState<CalcCurrency>(() => {
    try { return (localStorage.getItem(CALC_CURRENCY_KEY) as CalcCurrency) || "USD"; } catch { return "USD"; }
  });
  const saveCurrency = (c: CalcCurrency) => { setCalcCurrency(c); try { localStorage.setItem(CALC_CURRENCY_KEY, c); } catch {} };

  const [pendingAudio, setPendingAudio] = useState<{ url: string; name: string } | null>(null);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("main");
  const [showSetup, setShowSetup] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [businessView, setBusinessView] = useState<BusinessView>("hub");
  const prevBusinessView = useRef<BusinessView>("hub");
  const [hubRefreshKey, setHubRefreshKey] = useState(0);

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
  const [showSplash,   setShowSplash]   = useState(true);
  const [exitingSplash, setExitingSplash] = useState(false);

  useEffect(() => {
    // Start exit animation at 2s, unmount 500ms later
    const t1 = setTimeout(() => setExitingSplash(true), 2000);
    const t2 = setTimeout(() => setShowSplash(false), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => setAuthLoading(false), 4000);

    // Handle OAuth redirect: if there's a ?code= in the URL, exchange it for a session
    async function init() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        try {
          await supabase.auth.exchangeCodeForSession(code);
        } catch (err) {
          console.error("[oauth exchange]", err);
        }
        // Clean the URL so the code isn't left hanging around
        window.history.replaceState({}, "", window.location.pathname);
      }

      const { data: { session } } = await supabase.auth.getSession();
      clearTimeout(timeout);
      const user = session?.user ?? null;
      setAuthUser(user ? { id: user.id } : null);
      if (user) loadProfile(user.id);
      else setAuthLoading(false);
    }
    init();

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
    const [p, projects, quotes, clients] = await Promise.all([
      getProfile(userId),
      getProjects(userId),
      getQuotes(userId),
      getClients(userId),
    ]);
    setAuthLoading(false);
    if (p) {
      const active = projects.filter((pr) => pr.status !== "paid").length;
      const closed = projects.filter((pr) => pr.status === "paid").length;
      const sent   = quotes.filter((q)  => q.status === "sent").length;
      const computedScore = Math.round(active * 150 + closed * 50 + clients.length * 75 + sent * 25);

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
  if (authLoading || showSplash) {
    return <SplashScreen exiting={exitingSplash} />;
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
        <UsernameSetup userId={authUser.id} avatarUrl={null} onComplete={(p) => { setActiveTab("dashboard"); setShowSettings(false); setProfile(p); }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-background" style={{ height: "100dvh" }}>
    <main id="scroll-root" className={`flex-1 flex flex-col overscroll-none ${(activeTab === "dashboard" || activeTab === "contenido" || (activeTab === "pricing" && businessView === "hub")) && !showSettings ? "overflow-hidden" : "overflow-y-auto"}`} style={{ overscrollBehavior: "none", paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}>
      {/* Settings button — hidden on Community tab (has its own header) */}
      {activeTab !== "noticias" && (
        <div className={`flex w-full max-w-4xl items-center px-6 ${activeTab === "dashboard" ? "mb-4" : "mb-4"}`}>
          <div className="flex-1 flex justify-start">
            <NotificationBell userId={authUser.id} />
          </div>
          <div className="flex-1 flex justify-end">
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center justify-center h-8 w-8 rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-accent hover:border-accent/30 transition"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      {/* wave removed */}
      {showSettings ? (
        <SettingsModule
          onBack={async () => {
            setShowSettings(false);
            setSettingsSection("main");
            // Refresh profile so the Fennec ID card + dashboard reflect Settings changes
            const p = await getProfile(authUser.id);
            if (p) setProfile((prev) => prev ? { ...p, fennec_db_score: prev.fennec_db_score } : p);
          }}
          language={i18n.resolvedLanguage ?? "en"}
          onLanguageChange={(lang) => { void i18n.changeLanguage(lang); }}
          avatarUrl={profile.avatar_url}
          onAvatarChange={(url) => setProfile((p) => p ? { ...p, avatar_url: url } : p)}
          onSignOut={async () => { await supabase.auth.signOut(); }}
          userId={authUser.id}
          initialSection={settingsSection}
        />
      ) : activeTab === "pricing" && businessView === "hub" ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <BusinessHub
            key={hubRefreshKey}
            onOpenView={setBusinessView}
            isPro={profile?.is_pro ?? true}
            userId={authUser.id}
          />
        </div>
      ) : activeTab === "pricing" && businessView === "projects" ? (
        <ActiveProjects onBack={() => { setHubRefreshKey((k) => k + 1); setBusinessView("hub"); }} userId={authUser.id} />
      ) : activeTab === "pricing" && businessView === "clients" ? (
        <ClientsLeads onBack={() => { setHubRefreshKey((k) => k + 1); setBusinessView(prevBusinessView.current); }} userId={authUser.id} />
      ) : activeTab === "pricing" && businessView === "quotes" ? (
        <QuoteGenerator
          onBack={() => { setHubRefreshKey((k) => k + 1); setBusinessView("hub"); }}
          onGoToClients={() => { prevBusinessView.current = "quotes"; setBusinessView("clients"); }}
          onGoToCalculator={() => setBusinessView("calculator")}
          onGoToProjects={() => setBusinessView("projects")}
          userId={authUser.id}
        />
      ) : activeTab === "pricing" && businessView === "network" ? (
        <div className="mx-auto w-full max-w-4xl px-4 pb-8">
          <button
            type="button"
            onClick={() => setBusinessView("hub")}
            className="mb-6 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-accent transition"
          >
            ← Business Hub
          </button>
          <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase mb-1">
            Network
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-6">
            Tu red de productores.
          </h1>
          <NetworkSection userId={authUser.id} />
        </div>
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
            <div className="flex flex-col items-end gap-2 shrink-0">
              {/* Currency selector */}
              <div className="flex rounded-xl border border-white/10 bg-black/30 overflow-hidden">
                {(["USD", "MXN", "COP"] as CalcCurrency[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => saveCurrency(c)}
                    className={`px-3 py-1.5 text-xs font-semibold transition ${
                      calcCurrency === c
                        ? "bg-accent text-black"
                        : "text-zinc-500 hover:text-white"
                    }`}
                  >
                    {c}
                  </button>
                ))}
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
                    <span className="font-semibold text-accent">{formatCurrency(personalTotal, calcCurrency)}</span>
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
                    <span className="font-semibold text-accent">{formatCurrency(studioTotal, calcCurrency)}</span>
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
                    <p>{t("step3.base")} {formatCurrency(baseMonthlyTotal, calcCurrency)}</p>
                    <p>{t("step3.impuestosMonto")} {formatCurrency(taxAmount, calcCurrency)}</p>
                    <p>{t("step3.reinversionMonto")} {formatCurrency(reinvestmentAmount, calcCurrency)}</p>
                    <p className="text-lg">
                      {t("step3.totalObjetivo")}{" "}
                      <span className="font-semibold text-accent">
                        {formatCurrency(monthlyTotalCOP, calcCurrency)}
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
                          <p className="text-lg font-semibold text-zinc-200">{formatCurrency(minPricePerProject, calcCurrency)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">Recommended</p>
                          <p className="text-lg font-bold text-accent">{formatCurrency(recommendedPrice, calcCurrency)}</p>
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
                          <p className="text-lg font-semibold text-zinc-200">{formatCurrency(monthlyMin, calcCurrency)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">Recommended total</p>
                          <p className="text-xl font-bold text-accent">{formatCurrency(monthlyRec, calcCurrency)}</p>
                        </div>
                      </div>

                      {/* vs monthly target */}
                      <div className="border-t border-white/10 pt-4 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400">Your monthly target</span>
                          <span className="font-semibold text-zinc-200">{formatCurrency(monthlyTotalCOP, calcCurrency)}</span>
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
        <Dashboard
          className="mt-3"
          avatarUrl={profile.avatar_url}
          username={profile.username}
          isPro={profile.is_pro}
          userId={authUser?.id}
          onOpenSettings={() => { setSettingsSection("main"); setShowSettings(true); }}
          onOpenProfileSettings={() => { setSettingsSection("profile"); setShowSettings(true); }}
          networkProfile={profile}
          onColorAssigned={(colorId) =>
            setProfile((prev) => prev ? { ...prev, color_id: colorId } : prev)
          }
          onNavigate={(tab) => { setActiveTab(tab); setBusinessView("hub"); }}
        />
      ) : activeTab === "contenido" ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <ContentModule isPro={profile?.is_pro ?? true} />
        </div>
      ) : activeTab === "ideas" ? (
        <AudioModule userId={authUser.id} isPro={profile?.is_pro ?? false} />
      ) : activeTab === "noticias" ? (
        <div key="noticias">
          <Community
            profile={profile}
            openComposerWith={pendingAudio}
            onComposerConsumed={() => setPendingAudio(null)}
          />
        </div>
      ) : null}

    </main>
      <nav
        className="shrink-0 border-t border-white/[0.06] backdrop-blur-2xl"
        style={{
          background: "rgba(17, 17, 20, 0.92)",
          WebkitBackdropFilter: "blur(24px)",
          backdropFilter: "blur(24px)",
        }}
      >
        <div className="mx-auto flex w-full max-w-2xl items-center px-2 pt-2" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 6px)" }}>
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
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  <div style={{ position: "relative", width: 36, height: 36 }}>
                    {isActive && (
                      <div style={{
                        position: "absolute", inset: -6, borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(245,166,35,0.22) 0%, transparent 70%)",
                        animation: "fennecNavGlow 2.6s ease-in-out infinite alternate",
                        pointerEvents: "none",
                      }} />
                    )}
                    <img
                      src="/fennec-icon-transparent.png"
                      alt="Fennec"
                      style={{
                        width: 36, height: 36,
                        objectFit: "contain",
                        filter: "brightness(0) invert(1)",
                        opacity: isActive ? 1 : 0.6,
                        transition: "opacity 0.25s ease",
                        animation: isActive ? "fennecNavScale 2.6s ease-in-out infinite alternate" : undefined,
                      }}
                    />
                    {/* Active glow overlay via pseudo-layer */}
                    {isActive && (
                      <img
                        src="/fennec-icon-transparent.png"
                        alt=""
                        aria-hidden
                        style={{
                          position: "absolute", inset: 0,
                          width: 36, height: 36,
                          objectFit: "contain",
                          filter: "brightness(0) invert(1) drop-shadow(0 0 5px rgba(245,166,35,0.7))",
                          opacity: 1,
                          pointerEvents: "none",
                          animation: "fennecNavScale 2.6s ease-in-out infinite alternate",
                        }}
                      />
                    )}
                  </div>
                  {isActive && <div className="mt-1.5 h-0.5 w-4 rounded-full bg-accent" />}
                </button>
              );
            }

            /* ── Home ───────────────────────────────────── */
            if (isHome) {
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setBusinessView("hub"); setShowSettings(false); setSettingsSection("main"); }}
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

