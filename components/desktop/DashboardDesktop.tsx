"use client";
import type { FennecIdColor } from "@/lib/fennecIdPalette";
import type { Profile } from "@/lib/communityTypes";

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD — desktop content (approved mockup language: hairline
   bands, no boxed stat grid). Pure presentation: every number is
   computed by Dashboard.tsx (one source of truth for data/logic)
   and passed in as props. See public/desktop-mockup.html and
   docs/superpowers/specs/2026-07-09-desktop-foundation-design.md.
   ═══════════════════════════════════════════════════════════════ */

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

function fmtUSD(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function Band({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 first:mt-0">
      <div className="mb-1 flex items-center gap-2.5">
        <span className="text-[8.5px] font-bold uppercase tracking-[0.22em] text-zinc-600">{label}</span>
        <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, rgba(255,255,255,.07), transparent)" }} />
      </div>
      <div className="grid" style={{ gridAutoFlow: "column", gridAutoColumns: "1fr" }}>
        {children}
      </div>
    </div>
  );
}

function Col({
  value, label, sub, subAccent, muted, onClick,
}: {
  value: string;
  label: string;
  sub?: string;
  subAccent?: string;
  muted?: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`border-l border-white/[0.05] px-[18px] py-[14px] text-left first:border-l-0 first:pl-0.5 ${onClick ? "transition hover:bg-white/[0.02]" : ""}`}
    >
      <b className={`text-[21px] font-extrabold tabular-nums ${muted ? "text-zinc-600" : "text-white"}`}>{value}</b>
      <span className="mt-[3px] block text-[9px] uppercase tracking-[0.16em] text-zinc-600">{label}</span>
      {sub && <span className="text-[10px] font-semibold" style={{ color: subAccent ?? "#f5a623" }}>{sub}</span>}
    </Tag>
  );
}

export default function DashboardDesktop({
  firstName,
  networkProfile,
  fennecDb,
  cardColorScheme,
  igFollowers,
  ttFollowers,
  ytSubs,
  activeProjects,
  totalProjects,
  quotesSentCount,
  quotesOutTotal,
  karma,
  onNavigate,
  onOpenProfileSettings,
}: {
  firstName: string;
  networkProfile?: Profile | null;
  fennecDb: number;
  cardColorScheme: FennecIdColor;
  igFollowers: number | null;
  ttFollowers: number | null;
  ytSubs: number | null;
  activeProjects: number;
  totalProjects: number;
  quotesSentCount: number;
  quotesOutTotal: number;
  karma: number | null;
  onNavigate?: (tab: "pricing" | "contenido" | "dashboard" | "ideas" | "noticias") => void;
  onOpenProfileSettings?: () => void;
}) {
  const accent = cardColorScheme.accent;
  const genres = networkProfile?.genres ?? [];

  return (
    <div>
      {/* header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[21px] font-bold tracking-tight text-white">Good evening, {firstName || "there"}.</h1>
        <button
          type="button"
          onClick={() => {
            if (navigator.share) void navigator.share({ title: "My Fennec ID", text: `@${networkProfile?.username} · ${fennecDb} dB on Fennec` });
          }}
          className="rounded-full border px-3.5 py-1.5 text-[11.5px] font-semibold transition hover:brightness-110"
          style={{ borderColor: `${accent}59`, color: accent }}
        >
          Share my ID
        </button>
      </div>

      {/* dB hero + Fennec ID card, side by side */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1.25fr .9fr" }}>
        <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/[0.07] p-8" style={{ background: "#111114" }}>
          <div className="pointer-events-none absolute inset-[-40%]" style={{ background: `radial-gradient(40% 32% at 50% 58%, ${accent}22, transparent 70%)` }} />
          <span className="relative text-[9px] font-bold uppercase tracking-[0.35em] text-zinc-600">Fennec dB</span>
          <div
            className="relative text-[88px] font-extrabold leading-none tracking-tight"
            style={{
              background: `linear-gradient(180deg, ${accent}, ${accent}cc)`,
              WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
              filter: `drop-shadow(0 4px 24px ${accent}40)`,
            }}
          >
            {fennecDb}
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenProfileSettings}
          className="relative overflow-hidden rounded-2xl border p-6 text-left transition hover:brightness-110"
          style={{ borderColor: `${accent}4d`, background: `linear-gradient(150deg, ${cardColorScheme.dark1}, ${cardColorScheme.dark2})` }}
        >
          <span className="text-[9px] font-bold uppercase tracking-[0.3em]" style={{ color: `${accent}8c` }}>
            {networkProfile?.role ?? "Producer"}
          </span>
          <h2 className="mt-1.5 text-[26px] font-extrabold leading-[1.02] tracking-tight text-white">
            {firstName || networkProfile?.display_name || "Your name"}
          </h2>
          {genres.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {genres.map((g) => (
                <span key={g} className="rounded-full border px-2.5 py-0.5 text-[10.5px]" style={{ borderColor: `${accent}59`, color: accent }}>{g}</span>
              ))}
            </div>
          )}
          <div className="mt-4 font-mono text-[10px] tracking-[0.12em]" style={{ color: `${accent}80` }}>
            {(networkProfile?.country ?? "").toUpperCase()}{networkProfile?.fennec_number ? ` · #${String(networkProfile.fennec_number).padStart(4, "0")}` : ""}
          </div>
        </button>
      </div>

      {/* Music & Business */}
      <Band label="Music & Business">
        <Col value={String(totalProjects)} label="Projects" sub={activeProjects > 0 ? `${activeProjects} active` : undefined} onClick={() => onNavigate?.("pricing")} />
        <Col value={String(quotesSentCount)} label="Quotes sent" onClick={() => onNavigate?.("pricing")} />
        <Col value={quotesOutTotal > 0 ? fmtUSD(quotesOutTotal) : "—"} label="Quotes out" muted={quotesOutTotal === 0} onClick={() => onNavigate?.("pricing")} />
        <Col value={karma != null ? String(karma) : "—"} label="Karma" muted={karma == null} onClick={() => onNavigate?.("ideas")} />
      </Band>

      {/* Social Reach */}
      <Band label="Social Reach">
        <Col value={igFollowers != null ? fmtCount(igFollowers) : "—"} label="Instagram" muted={igFollowers == null}
          sub={igFollowers == null ? "connect →" : undefined} onClick={onOpenProfileSettings} />
        <Col value={ttFollowers != null ? fmtCount(ttFollowers) : "—"} label="TikTok" muted={ttFollowers == null}
          sub={ttFollowers == null ? "connect →" : undefined} onClick={onOpenProfileSettings} />
        <Col value={ytSubs != null ? fmtCount(ytSubs) : "—"} label="YouTube" muted={ytSubs == null}
          sub={ytSubs == null ? "connect →" : undefined} onClick={onOpenProfileSettings} />
      </Band>
    </div>
  );
}
