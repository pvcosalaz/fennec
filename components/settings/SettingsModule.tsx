"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft, User, Globe, DollarSign, Trash2,
  ChevronRight, Check, AlertTriangle, Bell,
} from "lucide-react";
import NotificationPreferences from "./NotificationPreferences";
import { SiInstagram, SiSpotify, SiYoutube, SiTiktok } from "react-icons/si";
import Select from "@/components/ui/Select";
import { fetchProfile, updateProfile } from "@/lib/communityDb";

export const PROFILE_KEY = "fennec-profile-v1";

export type UserProfile = {
  name: string;
  role: string;
  country: string;
  instagram: string;
  spotify: string;
  youtube: string;
  tiktok: string;
};

const DEFAULT_PROFILE: UserProfile = {
  name: "", role: "", country: "",
  instagram: "", spotify: "", youtube: "", tiktok: "",
};

export const CURRENCY_KEY = "fennec-currency-v1";
export type Currency = "COP" | "MXN" | "USD";

export const CURRENCIES: { id: Currency; label: string; symbol: string; flag: string }[] = [
  { id: "COP", label: "Colombian Peso",  symbol: "$",  flag: "🇨🇴" },
  { id: "MXN", label: "Mexican Peso",    symbol: "$",  flag: "🇲🇽" },
  { id: "USD", label: "US Dollar",       symbol: "$",  flag: "🇺🇸" },
];

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

type Section = "main" | "profile" | "language" | "currency" | "data" | "notifications";

type Props = {
  onBack: () => void;
  language: string;
  onLanguageChange: (lang: string) => void;
  avatarUrl?: string | null;
  onSignOut?: () => void;
  userId: string;
};

export default function SettingsModule({ onBack, language, onLanguageChange, avatarUrl, onSignOut, userId }: Props) {
  const [section,  setSection]  = useState<Section>("main");
  const [profile,  setProfile]  = useState<UserProfile>(DEFAULT_PROFILE);
  const [currency, setCurrency] = useState<Currency>("COP");
  const [saved,    setSaved]    = useState(false);
  const [confirmReset, setConfirmReset] = useState<string | null>(null);

  useEffect(() => {
    // Load currency from localStorage
    try {
      const c = localStorage.getItem(CURRENCY_KEY) as Currency;
      if (c) setCurrency(c);
    } catch { /* ignore */ }
    // Load profile from Supabase
    fetchProfile(userId).then((p) => {
      if (p) setProfile({
        name:      p.display_name ?? "",
        role:      p.role ?? "",
        country:   p.country ?? "",
        instagram: p.instagram ?? "",
        spotify:   p.spotify ?? "",
        youtube:   p.youtube_url ?? "",
        tiktok:    p.tiktok ?? "",
      });
    }).catch(console.error);
  }, [userId]);

  async function saveProfile() {
    try {
      await updateProfile(userId, {
        display_name: profile.name || null,
        role:         profile.role || null,
        country:      profile.country || null,
        instagram:    profile.instagram || null,
        spotify:      profile.spotify || null,
        youtube_url:  profile.youtube || null,
        tiktok:       profile.tiktok || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save profile", err);
    }
  }

  function saveCurrency(c: Currency) {
    setCurrency(c);
    localStorage.setItem(CURRENCY_KEY, c);
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

  // ── Profile section ──
  if (section === "profile") return (
    <div className="mx-auto w-full max-w-lg space-y-5 px-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setSection("main")} className="text-zinc-400 hover:text-accent transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">Settings</p>
          <h1 className="text-2xl font-bold text-white">Profile</h1>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
        <div className="space-y-1">
          <p className="text-xs text-zinc-500">Name</p>
          <input
            type="text"
            value={profile.name}
            onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
            placeholder="Your name"
            className="w-full h-10 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-accent"
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
          <input
            type="text"
            value={profile.country}
            onChange={(e) => setProfile((p) => ({ ...p, country: e.target.value }))}
            placeholder="e.g. Mexico, Colombia, USA"
            className="w-full h-10 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-accent"
          />
        </div>
      </div>

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
              className="flex-1 h-10 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-accent"
            />
          </div>
        ))}
      </div>

      <button
        onClick={saveProfile}
        className="w-full rounded-2xl bg-accent py-3 text-sm font-bold text-black flex items-center justify-center gap-2"
      >
        {saved ? <><Check className="h-4 w-4" /> Saved!</> : "Save profile"}
      </button>
    </div>
  );

  // ── Currency section ──
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

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        {CURRENCIES.map((c, i) => (
          <button
            key={c.id}
            onClick={() => saveCurrency(c.id)}
            className={`w-full flex items-center justify-between px-5 py-4 text-left transition hover:bg-white/5 ${
              i > 0 ? "border-t border-white/5" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{c.flag}</span>
              <div>
                <p className="text-sm font-medium text-white">{c.id}</p>
                <p className="text-xs text-zinc-500">{c.label}</p>
              </div>
            </div>
            {currency === c.id && <Check className="h-4 w-4 text-accent" />}
          </button>
        ))}
      </div>

      <p className="text-xs text-zinc-600 text-center">
        Affects how prices are displayed in the Pricing Calculator.
      </p>
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

  // ── Data section ──
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
    </div>
  );

  // ── Main settings menu ──
  const displayLang = language.startsWith("es") ? "Español" : "English";
  const displayCurrency = CURRENCIES.find((c) => c.id === currency);
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
      icon: DollarSign,
      label: "Currency",
      value: `${displayCurrency?.flag} ${displayCurrency?.id}`,
      section: "currency" as Section,
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
        <div className="h-14 w-14 rounded-2xl overflow-hidden flex-shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
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
