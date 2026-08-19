"use client";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";

import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft, User, Globe, DollarSign, Trash2,
  ChevronRight, Check, AlertTriangle, Bell, Camera, Loader2,
  Lightbulb, Send, Lock, Coins,
} from "lucide-react";
import NotificationPreferences from "./NotificationPreferences";
import { submitSuggestion, fetchMySuggestions, type Suggestion } from "@/lib/suggestionsDb";
import { SiInstagram, SiSpotify, SiYoutube, SiTiktok } from "react-icons/si";
import Select from "@/components/ui/Select";
import { GENRE_OPTIONS } from "@/lib/genres";
import { fetchProfile, updateProfile } from "@/lib/communityDb";
import { supabase } from "@/lib/supabase";
import { useIsDesktop } from "@/lib/useIsDesktop";
import {
  CURRENCY_KEY, CURRENCIES, CURRENCY_REGIONS, currencyMeta,
  notifyCurrencyChange, type Currency,
} from "@/lib/currency";

export const PROFILE_KEY = "fennec-profile-v1";

export type UserProfile = {
  name: string;
  role: string;
  country: string;
  genres: string[];
  instagram: string;
  spotify: string;
  youtube: string;
  tiktok: string;
};

const DEFAULT_PROFILE: UserProfile = {
  name: "", role: "", country: "", genres: [],
  instagram: "", spotify: "", youtube: "", tiktok: "",
};

// Genre catalog now lives in lib/genres.ts so the /join waitlist form shares it.

// Currency now lives in lib/currency.ts (the formatters need it and a lib must
// not import from a component). Re-exported so existing imports keep working.
export { CURRENCY_KEY, CURRENCIES, type Currency };

const ROLES = [
  "Music Producer",
  "Composer",
  "Beatmaker",
  "Sound Designer",
  "Mix Engineer",
  "Mastering Engineer",
  "Multi-instrumentalist",
  "Other",
];

// Country list — LATAM-first (the app's core audience) then major markets.
// Value = country name so existing free-text data (e.g. "Mexico") stays valid.
const COUNTRIES = [
  { name: "Mexico", flag: "🇲🇽" },
  { name: "Colombia", flag: "🇨🇴" },
  { name: "Argentina", flag: "🇦🇷" },
  { name: "Chile", flag: "🇨🇱" },
  { name: "Peru", flag: "🇵🇪" },
  { name: "Ecuador", flag: "🇪🇨" },
  { name: "Venezuela", flag: "🇻🇪" },
  { name: "Guatemala", flag: "🇬🇹" },
  { name: "Cuba", flag: "🇨🇺" },
  { name: "Bolivia", flag: "🇧🇴" },
  { name: "Dominican Republic", flag: "🇩🇴" },
  { name: "Honduras", flag: "🇭🇳" },
  { name: "Paraguay", flag: "🇵🇾" },
  { name: "El Salvador", flag: "🇸🇻" },
  { name: "Nicaragua", flag: "🇳🇮" },
  { name: "Costa Rica", flag: "🇨🇷" },
  { name: "Panama", flag: "🇵🇦" },
  { name: "Uruguay", flag: "🇺🇾" },
  { name: "Puerto Rico", flag: "🇵🇷" },
  { name: "Brazil", flag: "🇧🇷" },
  { name: "United States", flag: "🇺🇸" },
  { name: "Canada", flag: "🇨🇦" },
  { name: "Spain", flag: "🇪🇸" },
  { name: "United Kingdom", flag: "🇬🇧" },
  { name: "France", flag: "🇫🇷" },
  { name: "Germany", flag: "🇩🇪" },
  { name: "Italy", flag: "🇮🇹" },
  { name: "Portugal", flag: "🇵🇹" },
  { name: "Netherlands", flag: "🇳🇱" },
  { name: "Sweden", flag: "🇸🇪" },
  { name: "Nigeria", flag: "🇳🇬" },
  { name: "South Africa", flag: "🇿🇦" },
  { name: "Australia", flag: "🇦🇺" },
  { name: "Japan", flag: "🇯🇵" },
  { name: "South Korea", flag: "🇰🇷" },
  { name: "India", flag: "🇮🇳" },
  { name: "Other", flag: "🌍" },
];

export type Section = "main" | "profile" | "language" | "currency" | "data" | "notifications" | "suggest" | "password";

type Props = {
  onBack: () => void;
  language: string;
  onLanguageChange: (lang: string) => void;
  avatarUrl?: string | null;
  onAvatarChange?: (url: string) => void;
  onSignOut?: () => void;
  userId: string;
  initialSection?: Section;
  /** El modo recien elegido. Sin esto el shell se queda con su copia vieja del
   *  perfil y el Business enseña el oficio equivocado: solo UNA de las ocho
   *  salidas de Ajustes recarga el perfil (la flecha atras), y por el dock no
   *  pasa por ahi (Paco 2026-08-19: "estoy en producer y me sale la
   *  calculadora de artist"). */
  onAccountModeChange?: (mode: "artist" | "producer") => void;
};

export default function SettingsModule({ onBack, language, onLanguageChange, avatarUrl, onAvatarChange, onSignOut, userId, initialSection, onAccountModeChange }: Props) {
  const isDesktop = useIsDesktop();

  /* El contenedor de cada seccion.
     En telefono es la columna centrada de siempre. En escritorio se alinea a la
     IZQUIERDA y se ensancha con mesura: 768px, no el ancho completo.
     Un formulario no mejora por estirarse. Un campo de contraseña de 900px es
     peor de usar que uno de 400, porque el ojo tiene que viajar de la etiqueta
     al campo. Lo que estaba mal no era el ancho de los campos, era que TODA la
     seccion vivia centrada como en un telefono, desperdiciando la mitad del
     area de contenido y obligando a scrollear (Paco 2026-08-03).
     Las secciones que SI son listas usan dos columnas mas abajo. */
  /* mx-auto tambien en escritorio. Con max-w-3xl y sin centrar, el modulo se
     pegaba al borde izquierdo de la columna de 1100px y dejaba todo el hueco a
     la derecha: se leia descuadrado respecto al resto de la app, que si va
     centrada (Paco 2026-08-03). El ancho se queda en 3xl —es un formulario, no
     un tablero— pero centrado. */
  const { t } = useTranslation();
  const shell = isDesktop
    ? "mx-auto w-full max-w-3xl space-y-5"
    : "mx-auto w-full max-w-lg space-y-5 px-4";
  const [section,       setSection]       = useState<Section>(initialSection ?? "main");
  const [profile,       setProfile]       = useState<UserProfile>(DEFAULT_PROFILE);
  const [currency,      setCurrency]      = useState<Currency>("USD");
  const [saved,         setSaved]         = useState(false);
  const [confirmReset,  setConfirmReset]  = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [localAvatarUrl,  setLocalAvatarUrl]  = useState<string | null>(avatarUrl ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Feature suggestions
  const [suggestBody,   setSuggestBody]   = useState("");
  const [suggestSending, setSuggestSending] = useState(false);
  const [suggestSent,   setSuggestSent]   = useState(false);
  const [mySuggestions, setMySuggestions] = useState<Suggestion[]>([]);

  // Change password
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError,   setPasswordError]   = useState<string | null>(null);
  const [passwordSaving,  setPasswordSaving]  = useState(false);
  const [passwordCodeSent, setPasswordCodeSent] = useState(false);
  const [passwordCode,     setPasswordCode]     = useState("");
  const [passwordSaved,   setPasswordSaved]   = useState(false);

  /* El switch de oficio, solo para cuentas del equipo. Se carga el perfil de
     comunidad porque ahi viven is_admin y account_type; el UserProfile local de
     esta pantalla es otra cosa (campos de formulario). */
  const [esAdmin, setEsAdmin] = useState(false);
  const [modo, setModo] = useState<"artist" | "producer" | null>(null);
  const [modoGuardando, setModoGuardando] = useState(false);
  useEffect(() => {
    if (!userId) return;
    /* Quien es admin NO vive en profiles: julio lo movio a profiles_private
       (service-role only) y lo expone la funcion definer public.is_admin().
       Preguntarle a la columna era el bug: la columna no debe existir. */
    void supabase.rpc("is_admin").then(({ data }) => setEsAdmin(data === true));
    fetchProfile(userId).then((p) => {
      if (p) setModo(p.account_type ?? "producer");
    }).catch(() => {});
  }, [userId]);

  async function cambiarModo(next: "artist" | "producer") {
    if (!userId || modoGuardando || next === modo) return;
    setModoGuardando(true);
    const previo = modo;
    setModo(next);
    const { error } = await supabase
      .from("profiles")
      .update({ account_type: next })
      .eq("id", userId);
    /* Si la base dijo no, la UI no puede quedarse presumiendo el cambio. */
    if (error) { console.error("cambiarModo:", error); setModo(previo); }
    else onAccountModeChange?.(next);   // el shell se entera YA, no al salir
    setModoGuardando(false);
  }

  // Permanent account deletion (App Store / Play Store requirement)
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [deleteError,   setDeleteError]   = useState<string | null>(null);

  useEffect(() => {
    if (section === "suggest" && userId) {
      fetchMySuggestions(userId).then(setMySuggestions).catch(() => {});
    }
  }, [section, userId]);

  async function handleSubmitSuggestion() {
    if (!userId || suggestBody.trim().length < 3 || suggestSending) return;
    setSuggestSending(true);
    const created = await submitSuggestion(userId, suggestBody);
    setSuggestSending(false);
    if (created) {
      setMySuggestions((prev) => [created, ...prev]);
      setSuggestBody("");
      setSuggestSent(true);
      setTimeout(() => setSuggestSent(false), 2500);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setDeleteError(t("stSesionExpirada")); setDeleting(false); return; }
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setDeleteError(body.error ?? t("stErrorBorrarCuenta"));
        setDeleting(false);
        return;
      }
      // Account is gone server-side: wipe local data and leave the app.
      try { localStorage.clear(); } catch { /* private mode */ }
      await supabase.auth.signOut().catch(() => {});
      if (onSignOut) onSignOut(); else window.location.href = "/";
    } catch {
      setDeleteError(t("stErrorBorrarCuenta"));
      setDeleting(false);
    }
  }

  /* ── Cambio de contraseña con RE-AUTENTICACION ──
     Antes bastaba la sesion activa: updateUser({ password }) y ya. Eso
     significa que cualquiera con acceso a una compu desbloqueada podia cambiar
     la contraseña y quedarse con la cuenta (Paco lo señalo, 2026-08-05).

     Flujo en dos pasos con el mecanismo nativo de Supabase:
     1 · reauthenticate() manda un codigo de 6 digitos al CORREO del dueño.
     2 · updateUser({ password, nonce }) exige ese codigo.
     Funciona igual para cuentas de Google/Apple/Facebook, que no tienen
     contraseña previa que pedir — el correo es el autenticador comun.

     ⚠️ Para que el servidor lo EXIJA (y no solo lo pida esta pantalla), hay que
     prender "Secure password change" en Supabase → Authentication → Settings.
     Sin ese toggle, un cliente malicioso podria saltarse el codigo. */
  async function handleSendPasswordCode() {
    setPasswordError(null);
    if (newPassword.length < 6) { setPasswordError(t("pwTooShort")); return; }
    if (newPassword !== confirmPassword) { setPasswordError(t("pwNoMatch")); return; }
    setPasswordSaving(true);
    const { error } = await supabase.auth.reauthenticate();
    setPasswordSaving(false);
    if (error) { setPasswordError(error.message); return; }
    setPasswordCodeSent(true);
  }

  async function handleChangePassword() {
    setPasswordError(null);
    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword, nonce: passwordCode.trim() });
    setPasswordSaving(false);
    if (error) { setPasswordError(error.message); return; }
    setNewPassword(""); setConfirmPassword(""); setPasswordCode(""); setPasswordCodeSent(false);
    setPasswordSaved(true);
    setTimeout(() => setPasswordSaved(false), 2500);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      // Unique filename per upload → new URL every time → no browser cache issues
      const ext = (file.name.split(".").pop() || file.type.split("/")[1] || "jpg").toLowerCase();
      const path = `avatars/${userId}-${Date.now()}.${ext}`;
      const contentType = file.type || `image/${ext}`;

      const { error } = await supabase.storage
        .from("community-images")
        .upload(path, file, { contentType });
      if (error) throw error;

      const { data } = supabase.storage.from("community-images").getPublicUrl(path);
      const url = data.publicUrl;

      await updateProfile(userId, { avatar_url: url });
      setLocalAvatarUrl(url);
      onAvatarChange?.(url);
    } catch (err) {
      console.error("Avatar upload failed", err);
      alert(t("stErrorFoto"));
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  useEffect(() => {
    // Load currency from localStorage
    try {
      const c = localStorage.getItem(CURRENCY_KEY) as Currency;
      if (c) setCurrency(c);
    } catch { /* ignore */ }
    // Load profile from Supabase
    fetchProfile(userId).then((p) => {
      if (p) {
        const loaded: UserProfile = {
          name:      p.display_name ?? "",
          role:      p.role ?? "",
          country:   p.country ?? "",
          genres:    p.genres ?? [],
          instagram: p.instagram ?? "",
          spotify:   p.spotify ?? "",
          youtube:   p.youtube_url ?? "",
          tiktok:    p.tiktok ?? "",
        };
        setProfile(loaded);
        try { localStorage.setItem(PROFILE_KEY, JSON.stringify(loaded)); } catch {}
      }
    }).catch(console.error);
  }, [userId]);

  async function saveProfile() {
    try {
      await updateProfile(userId, {
        display_name: profile.name || null,
        role:         profile.role || null,
        country:      profile.country || null,
        genres:       profile.genres,
        instagram:    profile.instagram || null,
        spotify:      profile.spotify || null,
        youtube_url:  profile.youtube || null,
        tiktok:       profile.tiktok || null,
      });
      // Keep localStorage in sync so Dashboard reads fresh data
      try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch {}
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save profile", err);
    }
  }

  function saveCurrency(c: Currency) {
    setCurrency(c);
    localStorage.setItem(CURRENCY_KEY, c);
    notifyCurrencyChange();
  }

  function resetData(key: string, label: string) {
    if (confirmReset !== key) { setConfirmReset(key); return; }
    localStorage.removeItem(key);
    setConfirmReset(null);
  }

  // ── Notifications section ──
  if (section === "notifications") return (
    <NotificationPreferences userId={userId} onBack={() => setSection("main")} />
  );

  // ── Suggest a feature section ──
  if (section === "suggest") {
    const STATUS_LABEL: Record<Suggestion["status"], string> = {
      new: t("stSugRecibida"), planned: t("stSugPlaneada"), in_progress: t("stSugEnCurso"),
      done: "Shipped", declined: "Not planned",
    };
    return (
      <div className={shell}>
        <div className="flex items-center gap-3">
          <button onClick={() => setSection("main")} className="text-zinc-400 hover:text-accent transition">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">Fennec</p>
            <h1 className="text-2xl font-bold text-white">{t("stSuggest")}</h1>
          </div>
        </div>

        <div className={isDesktop ? "grid items-start gap-5 sm:grid-cols-2" : "space-y-5"}>
        <div className="space-y-5">
        <p className="text-sm text-zinc-500">
          {t("stSuggestBody")}
        </p>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <textarea
            value={suggestBody}
            onChange={(e) => setSuggestBody(e.target.value)}
            placeholder={t("stSugPlaceholder")}
            rows={4}
            maxLength={1000}
            className="w-full bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-600">{suggestBody.trim().length}/1000</span>
            <button
              onClick={handleSubmitSuggestion}
              disabled={suggestBody.trim().length < 3 || suggestSending}
              className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-black transition hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {suggestSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {suggestSent ? "Sent!" : "Send"}
            </button>
          </div>
        </div>

        </div>{/* /columna del formulario */}

        {mySuggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-[0.2em] text-zinc-500 uppercase">{t("stTusSugerencias")}</p>
            {mySuggestions.map((s) => (
              <div key={s.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-sm text-zinc-200 leading-relaxed">{s.body}</p>
                <span
                  className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{
                    color: s.status === "done" ? "#4ade80" : s.status === "declined" ? "#71717a" : "#f5a623",
                    background: s.status === "done" ? "rgba(74,222,128,.1)" : s.status === "declined" ? "rgba(113,113,122,.1)" : "rgba(245,166,35,.1)",
                  }}
                >
                  {STATUS_LABEL[s.status]}
                </span>
              </div>
            ))}
          </div>
        )}
        </div>{/* /dos columnas */}
      </div>
    );
  }

  // ── Profile section ──
  /* GUARDAR, definido una vez y montado en dos sitios: arriba en escritorio,
     al final en telefono. En telefono el pulgar ya esta abajo y el formulario
     es una sola columna, asi que el pie es el sitio natural; en escritorio ese
     mismo pie te obliga a scrollear hasta el fondo para guardar, que es
     justo lo que molestaba (Paco 2026-08-03). */
  const botonGuardar = (
    <button
      onClick={saveProfile}
      className={isDesktop
        ? "flex flex-shrink-0 items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-[13px] font-bold text-black transition hover:brightness-105 active:scale-[0.98]"
        : "w-full rounded-2xl bg-accent py-3 text-sm font-bold text-black flex items-center justify-center gap-2"}
    >
      {saved ? <><Check className="h-4 w-4" /> {t("stSaved")}</> : t("stSave")}
    </button>
  );

  if (section === "profile") return (
    <div className={isDesktop ? "w-full" : "mx-auto w-full max-w-lg space-y-5 px-4"}>
      <div className={isDesktop ? "mb-6 flex items-center justify-between gap-6" : "flex items-center gap-3"}>
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={() => setSection("main")} className="text-zinc-400 hover:text-accent transition">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">{t("stKicker")}</p>
            <h1 className="text-2xl font-bold text-white">{t("stProfile")}</h1>
          </div>
        </div>
        {isDesktop && botonGuardar}
      </div>

      {/* DOS COLUMNAS en escritorio. Era la tira vertical del telefono estirada
          a lo ancho: campos angostos, mucho scroll y el guardado fuera de vista.
          Identidad de un lado, enlaces del otro, y todo cabe sin scrollear. */}
      {/* La foto va ARRIBA de las dos columnas, no dentro de la izquierda.
          Metida en la columna empujaba los campos hacia abajo mientras "Social
          profiles" arrancaba pegado al techo: los dos paneles no empezaban a la
          misma altura y la foto quedaba centrada respecto a media pantalla en
          vez de a la pagina (Paco 2026-08-03). Fuera de la rejilla, los dos
          recuadros arrancan parejos y la foto queda centrada de verdad. */}
      {/* Avatar upload */}
      {/* mb-7: al sacar la foto de la columna quedo pegada a los dos recuadros
          y "Click to change photo" se leia amontonado entre la foto y el borde
          de las tarjetas (Paco 2026-08-03). El aviso pertenece a la foto, no a
          los paneles, y necesita mas hueco abajo que arriba para que se agrupe
          con ella. */}
      <div className="mb-7 flex flex-col items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative group w-20 h-20 rounded-full overflow-hidden ring-2 ring-white/10 hover:ring-accent/50 transition"
          disabled={uploadingAvatar}
        >
          {localAvatarUrl ? (
            <img src={localAvatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-accent/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-accent">
                {profile.name ? profile.name[0].toUpperCase() : "?"}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
            {uploadingAvatar
              ? <Loader2 className="h-5 w-5 text-white animate-spin" />
              : <Camera className="h-5 w-5 text-white" />
            }
          </div>
        </button>
        <p className="text-[11px] text-zinc-600">
          {uploadingAvatar ? t("stUploading") : isDesktop ? t("stChangePhotoClick") : t("stChangePhotoTap")}
        </p>
      </div>


      <div
        className={isDesktop ? "grid items-start gap-5" : "space-y-5"}
        style={isDesktop ? { gridTemplateColumns: "1fr 1fr" } : undefined}
      >
      <div className="space-y-5">

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
        <div className="space-y-1">
          <p className="text-xs text-zinc-500">{t("stName")}</p>
          <input
            type="text"
            value={profile.name}
            onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
            placeholder={t("stTuNombre")}
            className="w-full h-10 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-accent"
          />
        </div>

        <div className="space-y-1">
          <p className="text-xs text-zinc-500">{t("stRole")}</p>
          <Select
            value={profile.role}
            onChange={(val) => setProfile((p) => ({ ...p, role: val }))}
            placeholder={t("stEligeRol")}
            options={ROLES.map((r) => ({ value: r, label: r }))}
          />
        </div>

        <div className="space-y-1">
          <p className="text-xs text-zinc-500">{t("stCountry")}</p>
          <Select
            value={profile.country}
            onChange={(val) => setProfile((p) => ({ ...p, country: val }))}
            placeholder={t("stEligePais")}
            options={COUNTRIES.map((c) => ({ value: c.name, label: `${c.flag}  ${c.name}` }))}
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs text-zinc-500">{t("stGenres")} <span className="text-zinc-700">{t("stGenresMax")}</span></p>
          <div className="flex flex-wrap gap-2">
            {GENRE_OPTIONS.map((g) => {
              const selected = profile.genres.includes(g);
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() =>
                    setProfile((p) => ({
                      ...p,
                      genres: selected
                        ? p.genres.filter((x) => x !== g)
                        : p.genres.length < 4 ? [...p.genres, g] : p.genres,
                    }))
                  }
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                    selected
                      ? "bg-accent/20 border-accent text-accent"
                      : "bg-white/5 border-white/10 text-zinc-400 hover:border-white/25"
                  }`}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      </div>{/* /columna izquierda */}

      <div className="space-y-5">
      {/* Social links */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">{t("stSocial")}</h2>

        {[
          { key: "instagram", icon: SiInstagram, placeholder: "@username",       color: "#E1306C" },
          { key: "spotify",   icon: SiSpotify,   placeholder: t("stArtistaUrl"), color: "#1DB954" },
          { key: "youtube",   icon: SiYoutube,   placeholder: t("stCanalUrl"),      color: "#FF0000" },
          { key: "tiktok",    icon: SiTiktok,    placeholder: "@username",        color: "#ffffff" },
        ].map(({ key, icon: Icon, placeholder, color }) => (
          <div key={key} className="flex items-center gap-3">
            <Icon style={{ color }} className="h-4 w-4 flex-shrink-0" />
            <input
              type="text"
              value={profile[key as keyof UserProfile]}
              onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
              placeholder={placeholder}
              className="flex-1 h-10 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-accent"
            />
          </div>
        ))}
      </div>

      {!isDesktop && botonGuardar}
      </div>{/* /columna derecha */}
      </div>{/* /dos columnas */}
    </div>
  );


  // ── Language section ──
  if (section === "language") return (
    <div className={shell}>
      <div className="flex items-center gap-3">
        <button onClick={() => setSection("main")} className="text-zinc-400 hover:text-accent transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">{t("stKicker")}</p>
          <h1 className="text-2xl font-bold text-white">{t("stLanguage")}</h1>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        {[
          { id: "en", label: "English", flag: "🇺🇸" },
          { id: "es", label: "Español", flag: "🇲🇽" },
        ].map((lang, i) => (
          <button
            key={lang.id}
            onClick={() => onLanguageChange(lang.id)}
            className={`w-full flex items-center justify-between px-5 py-4 text-left transition hover:bg-white/5 ${
              i > 0 ? "border-t border-white/5" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{lang.flag}</span>
              <p className="text-sm font-medium text-white">{lang.label}</p>
            </div>
            {language.startsWith(lang.id) && <Check className="h-4 w-4 text-accent" />}
          </button>
        ))}
      </div>
    </div>
  );

  /* ── Currency section ──
     This screen was declared in `Section` and had a working `saveCurrency()`,
     but no render branch and no menu row ever shipped — so the currency was
     unreachable and everyone silently stayed on the default. That's how a
     Mexican producer's quote got frozen in COP (Paco 2026-08-01). */
  if (section === "currency") return (
    <div className={shell}>
      <div className="flex items-center gap-3">
        <button onClick={() => setSection("main")} className="text-zinc-400 hover:text-accent transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">{t("stKicker")}</p>
          <h1 className="text-2xl font-bold text-white">{t("stCurrency")}</h1>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-zinc-500">
        Used for new quotes and every amount across Business. Quotes you already
        saved keep the currency they were written in.
      </p>

      {CURRENCY_REGIONS.map((region) => (
        <div key={region}>
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
            {region}
          </p>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            {CURRENCIES.filter((c) => c.region === region).map((c, i) => (
              <button
                key={c.id}
                onClick={() => saveCurrency(c.id)}
                className={`flex w-full items-center justify-between px-5 py-3.5 text-left transition hover:bg-white/5 ${
                  i > 0 ? "border-t border-white/5" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{c.flag}</span>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {c.id} <span className="text-zinc-500">· {c.symbol}</span>
                    </p>
                    <p className="text-xs text-zinc-500">{c.label}</p>
                  </div>
                </div>
                {currency === c.id && <Check className="h-4 w-4 text-accent" />}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  // ── Data section ──
  if (section === "password") return (
    <div className={shell}>
      <div className="flex items-center gap-3">
        <button onClick={() => setSection("main")} className="text-zinc-400 hover:text-accent transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">{t("stKicker")}</p>
          <h1 className="text-2xl font-bold text-white">{t("pwTitle")}</h1>
        </div>
      </div>

      <p className="text-xs text-zinc-500 leading-relaxed">{t("pwIntro")}</p>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
        <input
          type="password"
          placeholder={t("pwNew")}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          minLength={6}
          disabled={passwordCodeSent}
          className="w-full h-11 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-accent disabled:opacity-50"
        />
        <input
          type="password"
          placeholder={t("pwConfirm")}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          minLength={6}
          disabled={passwordCodeSent}
          className="w-full h-11 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-accent disabled:opacity-50"
        />

        {/* Paso 2: el codigo que llego al correo. Solo existe despues de
            enviarlo — mostrar el campo antes confunde ("¿que codigo?"). */}
        {passwordCodeSent && (
          <>
            <p className="text-xs leading-relaxed text-zinc-400">{t("pwCodeSent")}</p>
            <input
              type="text"
              inputMode="text"
              autoComplete="one-time-code"
              /* 8, no 6: Supabase manda codigos de reautenticacion de 8
                 caracteres (verificado con el correo real, Paco 2026-08-05).
                 El tope de 6 hacia imposible escribir el codigo completo. Se
                 acepta hasta 10 por si el largo cambia con la config. */
              maxLength={10}
              placeholder={t("pwCode")}
              value={passwordCode}
              /* Sin filtrar a digitos: el codigo real de Supabase puede traer letras
                 (el de Paco llego de 8 caracteres). Solo se quitan espacios,
                 que es lo que se pega de mas desde el correo. */
              onChange={(e) => setPasswordCode(e.target.value.replace(/\s/g, ""))}
              className="w-full h-11 rounded-xl border border-accent/40 bg-black/30 px-3 text-center font-mono text-[16px] tracking-[0.28em] text-white outline-none placeholder:text-zinc-600 placeholder:tracking-normal focus:border-accent"
            />
          </>
        )}

        {passwordError && <p className="text-xs text-red-400">{passwordError}</p>}
        {passwordSaved && <p className="text-xs text-green-400">{t("pwUpdated")}</p>}

        {passwordCodeSent ? (
          <button
            onClick={handleChangePassword}
            disabled={passwordSaving || passwordCode.length < 6}
            className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-black transition disabled:opacity-40"
          >
            {passwordSaving ? t("pwSaving") : t("pwUpdate")}
          </button>
        ) : (
          <button
            onClick={handleSendPasswordCode}
            disabled={passwordSaving || !newPassword || !confirmPassword}
            className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-black transition disabled:opacity-40"
          >
            {passwordSaving ? t("pwSending") : t("pwSendCode")}
          </button>
        )}

        <p className="text-[11px] leading-relaxed text-zinc-600">{t("pwWhy")}</p>
      </div>
    </div>
  );

  if (section === "data") return (
    <div className={shell}>
      <div className="flex items-center gap-3">
        <button onClick={() => setSection("main")} className="text-zinc-400 hover:text-accent transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">{t("stKicker")}</p>
          <h1 className="text-2xl font-bold text-white">{t("stData")}</h1>
        </div>
      </div>

      <p className="text-xs text-zinc-500 leading-relaxed">
        {t("stReiniciarAviso")}
      </p>

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        {[
          { key: "fennec-pricing-v1",          label: t("bzCalculator") },
          { key: "fennec-quotes-v1",            label: t("bzQuotes") },
          { key: "fennec-projects-v1",          label: t("bzProjects") },
          { key: "fennec-clients-v1",           label: t("bzClients") },
          { key: "fennec-content-lines-v4",     label: t("stLineasContenido") },
          { key: "fennec-content-formats-v4",   label: t("stFormatosContenido") },
          { key: "fennec-briefs-v1",            label: t("stGuionesIdeas") },
          { key: "fennec-ideas-bank-v1",        label: t("mkQuickIdeas") },
          { key: "fennec-posts-v1",             label: t("stPostsCalendario") },
        ].map((item, i) => (
          <div key={item.key} className={`flex items-center justify-between px-5 py-4 ${i > 0 ? "border-t border-white/5" : ""}`}>
            <p className="text-sm text-zinc-300">{item.label}</p>
            {confirmReset === item.key ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400">{t("stSeguro")}</span>
                <button
                  onClick={() => resetData(item.key, item.label)}
                  className="rounded-lg bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/30 transition"
                >
                  {t("stReiniciar")}
                </button>
                <button onClick={() => setConfirmReset(null)} className="text-xs text-zinc-500 hover:text-white transition">
                  {t("mtCancel")}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmReset(item.key)}
                className="text-xs text-zinc-600 hover:text-red-400 transition"
              >
                {t("stReiniciar")}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* ── Delete account — permanent, App Store / Play Store requirement ── */}
      <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
          <h2 className="text-sm font-semibold text-white">{t("stBorrarCuenta")}</h2>
        </div>
        <p className="text-xs text-zinc-500 leading-relaxed">
          {t("stBorrarCuentaAviso")}
        </p>
        {deleteError && <p className="text-xs text-red-400">{deleteError}</p>}
        {confirmDelete ? (
          <div className="flex items-center gap-3">
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="rounded-lg bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:bg-red-600 transition disabled:opacity-50"
            >
              {deleting ? t("stBorrando") : t("stSiBorrar")}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              className="text-xs text-zinc-500 hover:text-white transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="rounded-lg border border-red-500/30 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition"
          >
            {t("stBorrarCuenta")}
          </button>
        )}
      </div>
    </div>
  );

  // ── Main settings menu ──
  const displayLang = language.startsWith("es") ? "Español" : "English";
  const displayName = profile.name || t("stNotSet");

  const menuItems = [
    {
      icon: User,
      label: t("stProfile"),
      value: displayName,
      section: "profile" as Section,
    },
    {
      icon: Globe,
      label: t("stLanguage"),
      value: displayLang,
      section: "language" as Section,
    },
    {
      icon: Coins,
      label: t("stCurrency"),
      value: `${currencyMeta(currency).flag}  ${currency} · ${currencyMeta(currency).label}`,
      section: "currency" as Section,
    },
    {
      icon: Lock,
      label: t("stPassword"),
      value: t("stPasswordSub"),
      section: "password" as Section,
    },
    {
      icon: Trash2,
      label: t("stData"),
      value: t("stDataSub"),
      section: "data" as Section,
    },
    {
      icon: Bell,
      label: t("stNotifications"),
      value: t("stNotificationsSub"),
      section: "notifications" as Section,
    },
  ];

  return (
    <div className={shell}>
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-zinc-400 hover:text-accent transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">Fennec</p>
          <h1 className="text-2xl font-bold text-white">{t("stKicker")}</h1>
        </div>
      </div>

      {/* Profile preview */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 flex items-center gap-4">
        <div className="h-14 w-14 rounded-full overflow-hidden flex-shrink-0">
          {localAvatarUrl ? (
            <img src={localAvatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-accent/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-accent">
                {profile.name ? profile.name[0].toUpperCase() : "?"}
              </span>
            </div>
          )}
        </div>
        <div>
          <p className="font-semibold text-white">{profile.name || t("stAddName")}</p>
          <p className="text-xs text-zinc-500">{profile.role || t("stSetRole")}</p>
          {profile.country && <p className="text-xs text-zinc-600">{profile.country}</p>}
        </div>
      </div>

      {/* Menu.
          Esta seccion SI es una lista, y una lista de ocho renglones en una sola
          columna obliga a recorrer media pantalla vacia. En escritorio va en dos
          columnas: se ve todo de un vistazo y no hay que scrollear. */}
      <div
        className={isDesktop
          ? "grid gap-x-4 gap-y-0 rounded-2xl border border-white/10 bg-white/5 p-1 sm:grid-cols-2"
          : "rounded-2xl border border-white/10 bg-white/5 overflow-hidden"}
      >
        {menuItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => setSection(item.section)}
              className={`w-full flex items-center justify-between px-5 py-4 text-left transition hover:bg-white/5 ${
                i > 0 ? "border-t border-white/5" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-accent flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-xs text-zinc-500">{item.value}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-600" />
            </button>
          );
        })}
      </div>

      {/* Switch de oficio — SOLO cuentas del equipo (is_admin, otorgado por SQL).
          Cambia profiles.account_type, que es lo unico que intercambia el
          modulo de Business; el resto de la app es identico. El refresh llega
          solo: onBack ya recarga el perfil al salir de Ajustes. */}
      {esAdmin && (
        <div className="rounded-2xl border border-accent/20 bg-accent/[0.04] px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">{t("stAccountMode")}</p>
              <p className="text-xs text-zinc-500">{t("stAccountModeSub")}</p>
            </div>
            <span className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-accent/70 border border-accent/30 rounded-full px-2 py-0.5">
              Admin
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["producer", "artist"] as const).map((m) => (
              <button
                key={m}
                onClick={() => cambiarModo(m)}
                disabled={modoGuardando}
                className={`rounded-xl border py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] transition active:scale-[0.98] ${
                  modo === m
                    ? "border-accent/50 bg-accent/10 text-accent"
                    : "border-white/10 text-zinc-500 hover:text-white"
                }`}
              >
                {m === "producer" ? t("stModeProducer") : t("stModeArtist")}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Suggest a feature — a CTA, distinct from the settings rows above */}
      <button
        onClick={() => setSection("suggest")}
        className="w-full flex items-center gap-3 rounded-2xl border border-accent/20 bg-accent/[0.06] px-5 py-4 text-left transition hover:bg-accent/[0.1] active:scale-[0.99]"
      >
        <Lightbulb className="h-4 w-4 text-accent flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-white">{t("stSuggest")}</p>
          <p className="text-xs text-zinc-500">{t("stSuggestSub")}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-zinc-600" />
      </button>

      {/* Sign out */}
      {onSignOut && (
        <button
          onClick={onSignOut}
          className="w-full py-3 rounded-2xl border border-white/8 text-sm text-zinc-500 hover:text-red-400 hover:border-red-400/20 transition-colors"
        >
          {t("stSignOut")}
        </button>
      )}

      {/* App info */}
      <div className="text-center space-y-1 pt-2">
        <p className="text-xs text-zinc-600">Fennec · fennec.audio</p>
        <p className="text-xs text-zinc-700">v0.1.0 · Pro</p>
      </div>
    </div>
  );
}
