"use client";

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
};

export default function SettingsModule({ onBack, language, onLanguageChange, avatarUrl, onAvatarChange, onSignOut, userId, initialSection }: Props) {
  const isDesktop = useIsDesktop();
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
  const [passwordSaved,   setPasswordSaved]   = useState(false);

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
      if (!token) { setDeleteError("Your session expired. Please sign in again."); setDeleting(false); return; }
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setDeleteError(body.error ?? "Could not delete your account. Please try again.");
        setDeleting(false);
        return;
      }
      // Account is gone server-side: wipe local data and leave the app.
      try { localStorage.clear(); } catch { /* private mode */ }
      await supabase.auth.signOut().catch(() => {});
      if (onSignOut) onSignOut(); else window.location.href = "/";
    } catch {
      setDeleteError("Could not delete your account. Please try again.");
      setDeleting(false);
    }
  }

  async function handleChangePassword() {
    setPasswordError(null);
    if (newPassword.length < 6) { setPasswordError("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Passwords don't match."); return; }
    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);
    if (error) { setPasswordError(error.message); return; }
    setNewPassword(""); setConfirmPassword("");
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
      alert("No se pudo actualizar la foto. Intenta de nuevo.");
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
      new: "Received", planned: "Planned", in_progress: "In progress",
      done: "Shipped", declined: "Not planned",
    };
    return (
      <div className="mx-auto w-full max-w-lg space-y-5 px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSection("main")} className="text-zinc-400 hover:text-accent transition">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">Fennec</p>
            <h1 className="text-2xl font-bold text-white">Suggest a feature</h1>
          </div>
        </div>

        <p className="text-sm text-zinc-500">
          What would make Fennec better for you? We read every suggestion.
        </p>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <textarea
            value={suggestBody}
            onChange={(e) => setSuggestBody(e.target.value)}
            placeholder="I wish Fennec could…"
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

        {mySuggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-[0.2em] text-zinc-500 uppercase">Your suggestions</p>
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
      {saved ? <><Check className="h-4 w-4" /> Saved!</> : "Save profile"}
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
            <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">Settings</p>
            <h1 className="text-2xl font-bold text-white">Profile</h1>
          </div>
        </div>
        {isDesktop && botonGuardar}
      </div>

      {/* DOS COLUMNAS en escritorio. Era la tira vertical del telefono estirada
          a lo ancho: campos angostos, mucho scroll y el guardado fuera de vista.
          Identidad de un lado, enlaces del otro, y todo cabe sin scrollear. */}
      <div
        className={isDesktop ? "grid items-start gap-5" : "space-y-5"}
        style={isDesktop ? { gridTemplateColumns: "1fr 1fr" } : undefined}
      >
      <div className="space-y-5">

      {/* Avatar upload */}
      <div className="flex flex-col items-center gap-2">
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
          {uploadingAvatar ? "Uploading…" : isDesktop ? "Click to change photo" : "Tap to change photo"}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
        <div className="space-y-1">
          <p className="text-xs text-zinc-500">Name</p>
          <input
            type="text"
            value={profile.name}
            onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
            placeholder="Your name"
            className="w-full h-10 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-accent"
          />
        </div>

        <div className="space-y-1">
          <p className="text-xs text-zinc-500">Role</p>
          <Select
            value={profile.role}
            onChange={(val) => setProfile((p) => ({ ...p, role: val }))}
            placeholder="Select your role"
            options={ROLES.map((r) => ({ value: r, label: r }))}
          />
        </div>

        <div className="space-y-1">
          <p className="text-xs text-zinc-500">Country</p>
          <Select
            value={profile.country}
            onChange={(val) => setProfile((p) => ({ ...p, country: val }))}
            placeholder="Select your country"
            options={COUNTRIES.map((c) => ({ value: c.name, label: `${c.flag}  ${c.name}` }))}
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs text-zinc-500">Genres <span className="text-zinc-700">(select up to 4)</span></p>
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
        <h2 className="text-sm font-semibold text-white">Social profiles</h2>

        {[
          { key: "instagram", icon: SiInstagram, placeholder: "@username",       color: "#E1306C" },
          { key: "spotify",   icon: SiSpotify,   placeholder: "Artist name / URL", color: "#1DB954" },
          { key: "youtube",   icon: SiYoutube,   placeholder: "Channel URL",      color: "#FF0000" },
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
    <div className="mx-auto w-full max-w-lg space-y-5 px-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setSection("main")} className="text-zinc-400 hover:text-accent transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">Settings</p>
          <h1 className="text-2xl font-bold text-white">Language</h1>
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
    <div className="mx-auto w-full max-w-lg space-y-5 px-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setSection("main")} className="text-zinc-400 hover:text-accent transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">Settings</p>
          <h1 className="text-2xl font-bold text-white">Currency</h1>
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
    <div className="mx-auto w-full max-w-lg space-y-5 px-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setSection("main")} className="text-zinc-400 hover:text-accent transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">Settings</p>
          <h1 className="text-2xl font-bold text-white">Password</h1>
        </div>
      </div>

      <p className="text-xs text-zinc-500 leading-relaxed">
        Set a new password for your account. This works even if you originally signed in with Google, Apple, or Facebook.
      </p>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
        <input
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          minLength={6}
          className="w-full h-11 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-accent"
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          minLength={6}
          className="w-full h-11 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-accent"
        />
        {passwordError && <p className="text-xs text-red-400">{passwordError}</p>}
        {passwordSaved && <p className="text-xs text-green-400">Password updated.</p>}
        <button
          onClick={handleChangePassword}
          disabled={passwordSaving || !newPassword || !confirmPassword}
          className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-black transition disabled:opacity-40"
        >
          {passwordSaving ? "Saving..." : "Update password"}
        </button>
      </div>
    </div>
  );

  if (section === "data") return (
    <div className="mx-auto w-full max-w-lg space-y-5 px-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setSection("main")} className="text-zinc-400 hover:text-accent transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">Settings</p>
          <h1 className="text-2xl font-bold text-white">Data & Reset</h1>
        </div>
      </div>

      <p className="text-xs text-zinc-500 leading-relaxed">
        Reset individual modules. This cannot be undone.
      </p>

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        {[
          { key: "fennec-pricing-v1",          label: "Pricing Calculator" },
          { key: "fennec-quotes-v1",            label: "Quotes" },
          { key: "fennec-projects-v1",          label: "Active Projects" },
          { key: "fennec-clients-v1",           label: "Clients & Leads" },
          { key: "fennec-content-lines-v4",     label: "Content Lines" },
          { key: "fennec-content-formats-v4",   label: "Content Formats" },
          { key: "fennec-briefs-v1",            label: "Scripts & Ideas" },
          { key: "fennec-ideas-bank-v1",        label: "Quick Ideas" },
          { key: "fennec-posts-v1",             label: "Calendar Posts" },
        ].map((item, i) => (
          <div key={item.key} className={`flex items-center justify-between px-5 py-4 ${i > 0 ? "border-t border-white/5" : ""}`}>
            <p className="text-sm text-zinc-300">{item.label}</p>
            {confirmReset === item.key ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400">Sure?</span>
                <button
                  onClick={() => resetData(item.key, item.label)}
                  className="rounded-lg bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/30 transition"
                >
                  Reset
                </button>
                <button onClick={() => setConfirmReset(null)} className="text-xs text-zinc-500 hover:text-white transition">
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmReset(item.key)}
                className="text-xs text-zinc-600 hover:text-red-400 transition"
              >
                Reset
              </button>
            )}
          </div>
        ))}
      </div>

      {/* ── Delete account — permanent, App Store / Play Store requirement ── */}
      <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
          <h2 className="text-sm font-semibold text-white">Delete account</h2>
        </div>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Permanently delete your Fennec account and all associated data: your profile,
          projects, quotes, clients, tracks, and social connections. This cannot be undone.
          Any active Pro subscription is cancelled.
        </p>
        {deleteError && <p className="text-xs text-red-400">{deleteError}</p>}
        {confirmDelete ? (
          <div className="flex items-center gap-3">
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="rounded-lg bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:bg-red-600 transition disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Yes, permanently delete"}
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
            Delete account
          </button>
        )}
      </div>
    </div>
  );

  // ── Main settings menu ──
  const displayLang = language.startsWith("es") ? "Español" : "English";
  const displayName = profile.name || "Not set";

  const menuItems = [
    {
      icon: User,
      label: "Profile",
      value: displayName,
      section: "profile" as Section,
    },
    {
      icon: Globe,
      label: "Language",
      value: displayLang,
      section: "language" as Section,
    },
    {
      icon: Coins,
      label: "Currency",
      value: `${currencyMeta(currency).flag}  ${currency} · ${currencyMeta(currency).label}`,
      section: "currency" as Section,
    },
    {
      icon: Lock,
      label: "Password",
      value: "Change your password",
      section: "password" as Section,
    },
    {
      icon: Trash2,
      label: "Data & Reset",
      value: "Manage your data",
      section: "data" as Section,
    },
    {
      icon: Bell,
      label: "Notifications",
      value: "Manage notification preferences",
      section: "notifications" as Section,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-lg space-y-5 px-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-zinc-400 hover:text-accent transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">Fennec</p>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
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
          <p className="font-semibold text-white">{profile.name || "Add your name"}</p>
          <p className="text-xs text-zinc-500">{profile.role || "Set your role"}</p>
          {profile.country && <p className="text-xs text-zinc-600">{profile.country}</p>}
        </div>
      </div>

      {/* Menu */}
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
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

      {/* Suggest a feature — a CTA, distinct from the settings rows above */}
      <button
        onClick={() => setSection("suggest")}
        className="w-full flex items-center gap-3 rounded-2xl border border-accent/20 bg-accent/[0.06] px-5 py-4 text-left transition hover:bg-accent/[0.1] active:scale-[0.99]"
      >
        <Lightbulb className="h-4 w-4 text-accent flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-white">Suggest a feature</p>
          <p className="text-xs text-zinc-500">Tell us what would make Fennec better</p>
        </div>
        <ChevronRight className="h-4 w-4 text-zinc-600" />
      </button>

      {/* Sign out */}
      {onSignOut && (
        <button
          onClick={onSignOut}
          className="w-full py-3 rounded-2xl border border-white/8 text-sm text-zinc-500 hover:text-red-400 hover:border-red-400/20 transition-colors"
        >
          Sign out
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
