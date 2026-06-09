"use client";

import { useEffect, useState, useRef } from "react";
import { type Project, type Quote, type Client } from "@/lib/pricingData";
import { getProjects, getQuotes, getClients } from "@/lib/businessDb";
import { PROFILE_KEY, type UserProfile } from "@/components/settings/SettingsModule";
import { fetchProfile } from "@/lib/communityDb";
import FennecIdCard from "@/components/network/FennecIdCard";
import { getColorScheme } from "@/lib/fennecIdPalette";
import { ensureColorAssigned } from "@/lib/networkDb";
import type { Profile } from "@/lib/communityTypes";

// ─── AnimatedNumber ───────────────────────────────────────────────────────────

function AnimatedNumber({ value }: { value: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (value === 0) { setN(0); return; }
    let start: number | null = null;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1000, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.floor(eased * value));
      if (p < 1) requestAnimationFrame(tick);
      else setN(value);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [value]);
  return <>{n}</>;
}

// ─── Stat chip ────────────────────────────────────────────────────────────────

function StatChip({
  value,
  label,
  pending,
}: {
  value?: number | null;
  label: string;
  pending?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 py-4">
      {pending || value == null ? (
        <span className="text-2xl font-black text-zinc-600">—</span>
      ) : (
        <p className="text-2xl font-black text-white">
          <AnimatedNumber value={value} />
        </p>
      )}
      <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{label}</p>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard({
  avatarUrl,
  username,
  isPro,
  userId,
  onOpenSettings,
  onOpenProfileSettings,
  networkProfile,
  onColorAssigned,
  onNavigate,
  className,
}: {
  avatarUrl?: string | null;
  username?: string | null;
  isPro?: boolean;
  userId?: string | null;
  onOpenSettings?: () => void;
  onOpenProfileSettings?: () => void;
  networkProfile?: Profile | null;
  onColorAssigned?: (colorId: string) => void;
  onNavigate?: (tab: "pricing" | "contenido" | "dashboard" | "ideas" | "noticias") => void;
  className?: string;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [quotes,   setQuotes]   = useState<Quote[]>([]);
  const [clients,  setClients]  = useState<Client[]>([]);
  const [profile,  setProfile]  = useState<UserProfile | null>(null);
  const [mounted,  setMounted]  = useState(false);

  useEffect(() => {
    try {
      const pr = localStorage.getItem(PROFILE_KEY);
      if (pr) setProfile(JSON.parse(pr));
    } catch {}
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetchProfile(userId).then((p) => {
      if (!p) return;
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
    }).catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    Promise.all([getProjects(userId), getQuotes(userId), getClients(userId)]).then(
      ([p, q, c]) => { setProjects(p); setQuotes(q); setClients(c); }
    );
  }, [userId]);

  // Resolve color for FennecIdCard
  const [resolvedColorId, setResolvedColorId] = useState<string | null>(networkProfile?.color_id ?? null);
  const onColorAssignedRef = useRef(onColorAssigned);
  useEffect(() => { onColorAssignedRef.current = onColorAssigned; });

  useEffect(() => {
    if (!userId || !networkProfile) return;
    ensureColorAssigned(userId, networkProfile.color_id).then((colorId) => {
      setResolvedColorId(colorId);
      if (colorId !== networkProfile.color_id) onColorAssignedRef.current?.(colorId);
    });
  }, [userId, networkProfile?.color_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // FENNEC dB score (Muso.AI points will be added when API is live)
  const activeCount = projects.filter((p) => p.status !== "paid").length;
  const closedCount = projects.filter((p) => p.status === "paid").length;
  const quotesSent  = quotes.filter((q) => q.status === "sent").length;

  const fennecDb = Math.round(
    activeCount   * 150 +
    closedCount   * 50  +
    clients.length * 75 +
    quotesSent    * 25
  );

  useEffect(() => {
    if (mounted) localStorage.setItem("fennec-db-score", String(fennecDb));
  }, [fennecDb, mounted]);

  // FennecIdCard data
  const cardColorScheme = getColorScheme(resolvedColorId);
  const cardName    = networkProfile?.display_name || username || "";
  const cardParts   = cardName.trim().split(/\s+/);
  const cardFirst   = cardParts[0] ?? "";
  const cardLast    = cardParts.slice(1).join(" ");
  const cardInitials = cardParts.length >= 2
    ? (cardParts[0][0] + cardParts[1][0]).toUpperCase()
    : cardName.slice(0, 2).toUpperCase();

  return (
    <div className={`mx-auto w-full max-w-4xl space-y-3 pb-2 pt-1 px-4 ${className ?? ""}`}>

      {/* ── Username ── */}
      {username && (
        <p className="-mt-2 text-center text-xl font-bold text-amber-400">@{username}</p>
      )}

      {/* ── Fennec ID card ── */}
      {networkProfile && (
        <FennecIdCard
          firstName={cardFirst}
          lastName={cardLast}
          role={networkProfile.role ?? "Producer"}
          country={networkProfile.country ?? ""}
          genres={networkProfile.genres ?? []}
          fennecDb={fennecDb}
          colorScheme={cardColorScheme}
          initials={cardInitials}
          avatarUrl={avatarUrl}
          instagram={networkProfile.instagram}
          spotify={networkProfile.spotify}
          youtube={networkProfile.youtube_url}
        />
      )}

      {/* ── Stat chips: Streams · Créditos · Proyectos ── */}
      <div className="grid grid-cols-3 divide-x divide-white/5 border border-white/5 rounded-2xl overflow-hidden bg-white/[0.02]">
        <StatChip label="Streams"  pending />
        <StatChip label="Créditos" pending />
        <StatChip label="Proyectos" value={activeCount} />
      </div>

      {/* ── Muso.AI connect CTA ── */}
      <button
        type="button"
        onClick={() => onOpenSettings?.()}
        className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-white/5 bg-white/[0.02] py-2.5 text-[11px] text-zinc-500 hover:text-zinc-300 hover:border-white/10 transition"
      >
        <span className="text-zinc-600">◎</span>
        Conectar Muso.AI para ver tus streams
        <span className="text-zinc-600">→</span>
      </button>

      {/* ── Empty state ── */}
      {projects.length === 0 && quotes.length === 0 && (
        <div className="border-t border-white/5 pt-4 px-2 flex flex-col items-center gap-3 pb-2">
          <p className="text-[11px] font-semibold text-zinc-400 text-center">
            Tu negocio empieza aquí.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onNavigate?.("pricing")}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-white/10 transition"
            >
              + Crear proyecto
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.("pricing")}
              className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-[10px] font-semibold text-accent hover:bg-accent/20 transition"
            >
              + Enviar cotización
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
