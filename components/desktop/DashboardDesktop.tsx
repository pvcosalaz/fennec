"use client";
import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/currency";
import FennecIdCard from "@/components/network/FennecIdCard";
import type { FennecIdColor } from "@/lib/fennecIdPalette";
import type { Quote } from "@/lib/pricingData";
import type { Profile, Post } from "@/lib/communityTypes";
import type { ContributionDays } from "@/lib/contributions";
import ContributionsCard from "@/components/dashboard/ContributionsCard";
import IndustryNews from "@/components/dashboard/IndustryNews";
import SocialMini from "@/components/dashboard/SocialMini";
import { StudioBackdrop, StudioPhotoControl } from "@/components/dashboard/StudioBackdrop";
import { RiseStyle, Tile, Instrument } from "@/components/desktop/ui";
import { TILE_BG_OVER_PHOTO, TILE_BLUR_OVER_PHOTO, TILE_SHADOW_OVER_PHOTO } from "@/components/desktop/surfaces";

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD — desktop content (approved mockup language). Uses the
   REAL FennecIdCard, hairline bands (no boxed grid), and a "Today
   on Fennec" strip fed by real data (latest note, sent quotes, next
   scheduled post). Pure presentation — logic lives in Dashboard.tsx.
   ═══════════════════════════════════════════════════════════════ */

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

// Same soundwave as the mobile Fennec ID card (fennec-eq-bar keyframe in
// globals.css), just a taller set of bars for the bigger desktop hero.
const EQ_HEIGHTS = [10, 18, 8, 22, 12, 26, 9, 16, 22, 11, 19, 8];

type ContentTask = { title: string; date: string; status: "pending" | "done" };

/** Next upcoming scheduled post from the Marketing module's local store. */
function useNextPost(): ContentTask | null {
  const [next, setNext] = useState<ContentTask | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("fennec-content-tasks-v1");
      if (!raw) return;
      const tasks = JSON.parse(raw) as ContentTask[];
      const today = new Date().toISOString().slice(0, 10);
      const upcoming = tasks
        .filter((t) => t.status !== "done" && t.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))[0];
      setNext(upcoming ?? null);
    } catch { /* ignore */ }
  }, []);
  return next;
}

function fmtDate(d: string): string {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase();
}





export default function DashboardDesktop({
  card, networkProfile, fennecDb, cardColorScheme,
  igFollowers, ttFollowers, ytSubs,
  activeProjects, totalProjects, quotesSentCount, quotesOutTotal, karma,
  sentQuotes, latestNote, contributions,
  communityPosts, communityLoading = false,
  studioPhotoUrl, studioPhotoLuma, userId, onStudioPhotoChange,
  onNavigate, onOpenProfileSettings,
}: {
  card: {
    firstName: string; lastName: string; role: string; country: string;
    genres: string[]; initials: string; avatarUrl?: string | null;
    instagram?: string | null; spotify?: string | null; youtube?: string | null;
    collectionNumber?: number;
  };
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
  sentQuotes: Quote[];
  latestNote: string | null;
  contributions?: ContributionDays | null;
  /** Latest community posts. `null` while unknown, `[]` when genuinely empty. */
  communityPosts?: Post[] | null;
  communityLoading?: boolean;
  /** The producer's studio photo and its measured brightness (drives the veil). */
  studioPhotoUrl?: string | null;
  studioPhotoLuma?: number | null;
  userId?: string;
  onStudioPhotoChange?: (url: string | null, luma: number | null) => void;
  onNavigate?: (tab: "pricing" | "contenido" | "dashboard" | "ideas" | "noticias") => void;
  onOpenProfileSettings?: () => void;
}) {
  // The producer's color lives ONLY on the FennecIdCard — it's the card's
  // identity, not the app's. All other accents stay on-brand amber.
  const accent = "#f5a623";
  const nextPost = useNextPost();

  /* ── Spacing ──
     The vertical scale used to run 24 → 0 → 16 → 20 between blocks. Arbitrary,
     and one of them was ZERO: the Fennec ID row and Contributions had nothing
     between them, which is why the three cards read as one glued mass
     (Paco 2026-08-02).

     Two tiers now, so space carries meaning instead of just existing:
       16px  inside a group — these belong together
       28px  between groups — these are different subjects

     The groups are the actual subjects of the page: who you are (ID, dB,
     contributions), what you're running (money, today), and where you reach.

     h-full + flex lets the page own the viewport, and Social Reach takes the
     slack with mt-auto. That kills the dead zone at the bottom without
     inventing content to fill it: the strip simply sits on the floor, the way
     a status bar does, and on a short window it just stacks normally. */
  return (
    <div
      className="relative flex h-full flex-col"
      /* Con foto detrás los paneles pasan a VIDRIO: tinte oscuro translúcido
         más blur. Van como variables CSS en la raíz para que las herede cada
         panel sin pasarle una prop a ninguno, y para que el efecto no se
         derrame a los módulos que no tienen fotografía. */
      style={studioPhotoUrl ? ({
        "--fx-tile-bg": TILE_BG_OVER_PHOTO,
        "--fx-tile-blur": TILE_BLUR_OVER_PHOTO,
        "--fx-tile-shadow": TILE_SHADOW_OVER_PHOTO,
        "--fx-grid-empty": "rgba(255,255,255,0.14)",
      } as React.CSSProperties) : undefined}
    >
      {/* The producer's room, when they've set one. Absent by default, so the
          dashboard is unchanged for anyone who never uploads. */}
      {studioPhotoUrl && <StudioBackdrop url={studioPhotoUrl} luma={studioPhotoLuma ?? null} />}
      <RiseStyle />
      {/* header — greeting follows the actual clock, not a hardcoded evening */}
      <div className="dd-rise mb-7 flex flex-shrink-0 items-center justify-between">
        <h1 className="text-[21px] font-bold tracking-tight text-white">
          {(() => {
            const h = new Date().getHours();
            const g = h < 5 || h >= 19 ? "Good evening" : h < 12 ? "Good morning" : "Good afternoon";
            return `${g}, ${card.firstName || "there"}.`;
          })()}
        </h1>
        <div className="flex items-center gap-4">
        {/* Personalisation sits next to sharing: both are about how this
            screen represents you, and neither belongs in Settings where
            you'd never think to look for a wallpaper. */}
        {userId && onStudioPhotoChange && (
          <StudioPhotoControl
            userId={userId}
            hasPhoto={!!studioPhotoUrl}
            onChange={onStudioPhotoChange}
          />
        )}
        <button
          type="button"
          onClick={() => {
            // Share the PUBLIC card link (/u/username) — recipients get the
            // real Fennec ID page, and the OG image unfurls the card in
            // WhatsApp/iMessage. Desktop browsers often lack navigator.share,
            // so fall back to copying the link.
            const url = `https://app.fennec.audio/u/${networkProfile?.username ?? ""}`;
            const text = `@${networkProfile?.username} · ${fennecDb} dB on Fennec`;
            if (navigator.share) void navigator.share({ title: "My Fennec ID", text, url });
            else void navigator.clipboard?.writeText(url);
          }}
          className="rounded-full border px-3.5 py-1.5 text-[11.5px] font-semibold transition hover:brightness-110"
          style={{ borderColor: `${accent}59`, color: accent }}
        >
          Share my ID
        </button>
        </div>
      </div>

      {/* ══ BENTO, CUATRO FILAS ══
          Antes eran dos columnas independientes, cada una repartiendo su alto
          por su cuenta. Eso dejaba a los bloques de la izquierda flotando con
          huecos enormes entre ellos mientras la derecha iba apretada
          (Paco 2026-08-03). La rejilla que pidió empareja las filas:

            Fennec ID          |  Fennec dB
            Music & Business   |  Audience
            Contributions      |  Today on Fennec
            Noticias (ancho completo)

          Al ser UNA sola rejilla, cada fila mide lo mismo en ambos lados y
          desaparecen los huecos. La tercera fila se lleva la holgura porque
          Contributions es lo que de verdad mejora con alto. */}
      <div
        className="grid min-h-0 flex-1 gap-4 overflow-hidden"
        style={{
          gridTemplateColumns: "minmax(0, 1fr) 320px",
          /* La tercera fila lleva un MÍNIMO, no minmax(0,...). Sin él, en una
             ventana de 720px las otras tres filas se comían los 565px
             disponibles y Contributions quedaba en 8.85px: aplastada y encimada
             (medido 2026-08-03). El mínimo garantiza que la rejilla del año
             siempre se vea, y el sobrante sigue yendo ahí en pantallas altas. */
          /* La fila 3 es AUTO, no 1fr. Cuando se llevaba el sobrante, sus dos
             paneles se comportaban distinto —Contributions centrado con su alto
             natural, Today estirado a toda la fila— y sus bordes inferiores no
             coincidian, asi que la fila de noticias arrancaba en una linea
             torcida (Paco 2026-08-03). En auto los dos miden lo mismo (la
             rejilla estira por defecto) y el sobrante se va a las noticias, que
             era donde hacia falta: tarjetas mas grandes y mas cuadradas. */
          gridTemplateRows: "auto auto auto minmax(96px, 1fr)",
        }}
      >

      {/* ── Fila 1: quién eres, y la lectura que produce ── */}
      <div className="dd-rise min-w-0" style={{ animationDelay: ".06s" }}>
        <FennecIdCard
          firstName={card.firstName} lastName={card.lastName}
          role={card.role || "Producer"} country={card.country}
          genres={card.genres} fennecDb={fennecDb} colorScheme={cardColorScheme}
          initials={card.initials} avatarUrl={card.avatarUrl}
          instagram={card.instagram} spotify={card.spotify} youtube={card.youtube}
          collectionNumber={card.collectionNumber} smallDb
        />
      </div>

      <div className="dd-rise" style={{ animationDelay: ".09s" }}>
        <Instrument
          label="Fennec dB"
          value={String(fennecDb)}
          /* 88: emparejado a la altura de la tarjeta de identidad, el panel da
             para un número mucho más grande, y es EL número de la pantalla. */
          size={88}
          footer={
            <div className="relative flex items-end gap-[3px]" style={{ height: 16, marginTop: 6 }}>
              {EQ_HEIGHTS.map((h, i) => (
                <span key={i} className="fennec-eq-bar" style={{ height: h, width: 3, background: accent, animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          }
        />
      </div>

      {/* ── Fila 2: el dinero, y a cuánta gente le llegas ── */}
      <div className="dd-rise min-w-0" style={{ animationDelay: ".12s" }}>
        <Tile label="Music & Business" className="h-full">
          {/* En fila, no en 2x2: aquí ya hay ancho de sobra y cuatro métricas
              alineadas se comparan de un vistazo. */}
          <div className="grid grid-cols-4">
            <MiniMetric value={String(totalProjects)} label="Projects" sub={activeProjects > 0 ? `${activeProjects} active` : undefined} onClick={() => onNavigate?.("pricing")} />
            <MiniMetric value={String(quotesSentCount)} label="Quotes sent" onClick={() => onNavigate?.("pricing")} />
            <MiniMetric value={quotesOutTotal > 0 ? formatMoney(quotesOutTotal) : "—"} label="Quotes out" muted={quotesOutTotal === 0} onClick={() => onNavigate?.("pricing")} />
            <MiniMetric value={karma != null ? String(karma) : "—"} label="Karma" muted={karma == null} onClick={() => onNavigate?.("ideas")} />
          </div>
        </Tile>
      </div>

      <div className="dd-rise" style={{ animationDelay: ".15s" }}>
        <SocialMini
          igFollowers={igFollowers}
          ttFollowers={ttFollowers}
          ytSubs={ytSubs}
          onConnect={onOpenProfileSettings}
        />
      </div>

      {/* ── Fila 3: la evidencia, y lo que toca hoy ── */}
      <div className="dd-rise flex min-h-0 min-w-0 flex-col" style={{ animationDelay: ".18s" }}>
        {/* SIN cellSize: la tarjeta tiene dos modos y el flexible es el
            correcto aquí. Con celdas fijas de 10px el año medía 673px de ancho
            (52 columnas × 10 + 51 huecos × 3) dentro de un contenedor de 650, y
            se salía por la derecha (Paco 2026-08-03, medido: desborde 23px).
            Cualquier número fijo vuelve a romperse en cuanto cambia el ancho de
            la ventana. En modo flexible las celdas son flex-1 con
            aspect-square, así que caben SIEMPRE, sea cual sea el ancho. */}
        <ContributionsCard data={contributions ?? null} accent="#f5a623" weeks={52} />
      </div>

      <div className="dd-rise flex min-h-0 flex-col" style={{ animationDelay: ".21s" }}>
        <Tile label="Today on Fennec" className="h-full">
          <div className="flex flex-col divide-y divide-white/[0.05]">
            <button type="button" onClick={() => onNavigate?.("ideas")} className="group flex items-center justify-between gap-3 py-[5px] text-left transition first:pt-0">
              <span className="min-w-0 truncate text-[12px] text-zinc-400">
                {latestNote ? "New note on your track" : "No track feedback yet"}
              </span>
              <span className="flex-shrink-0 text-[11px] font-semibold text-accent transition group-hover:brightness-110">
                {latestNote ? "Open →" : "Upload →"}
              </span>
            </button>
            <button type="button" onClick={() => onNavigate?.("pricing")} className="group flex items-center justify-between gap-3 py-[5px] text-left">
              <span className="min-w-0 truncate text-[12px] text-zinc-400">
                {sentQuotes.length > 0 ? `${sentQuotes.length} quote${sentQuotes.length > 1 ? "s" : ""} awaiting reply` : "No open quotes"}
              </span>
              <span className="flex-shrink-0 text-[11px] font-semibold text-accent transition group-hover:brightness-110">
                {sentQuotes.length > 0 ? "View →" : "Send →"}
              </span>
            </button>
            <button type="button" onClick={() => onNavigate?.("contenido")} className="group flex items-center justify-between gap-3 py-[5px] text-left">
              <span className="min-w-0 truncate text-[12px] text-zinc-400">
                {nextPost ? `Next post · ${fmtDate(nextPost.date)}` : "Nothing scheduled"}
              </span>
              <span className="flex-shrink-0 text-[11px] font-semibold text-accent transition group-hover:brightness-110">
                {nextPost ? "Calendar →" : "Plan →"}
              </span>
            </button>
          </div>
        </Tile>
      </div>

      {/* ── Fila 4: la industria, a lo ancho ── */}
      <div className="dd-rise col-span-2 flex min-h-0 min-w-0 flex-col" style={{ animationDelay: ".24s" }}>
        <IndustryNews count={5} onOpen={() => onNavigate?.("noticias")} />
      </div>
      </div>{/* /bento */}
    </div>
  );
}

/** Métrica compacta para la columna angosta. Misma idea que `Col`, pero sin la
 *  hairline vertical: en una rejilla 2x2 las líneas entre celdas producen una
 *  cuadrícula, y lo que se quiere son cuatro datos, no una tabla. */
function MiniMetric({ value, label, sub, muted, onClick }: {
  value: string; label: string; sub?: string; muted?: boolean; onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`rounded-lg px-1 py-[7px] text-left transition ${onClick ? "hover:bg-white/[0.03]" : ""}`}
    >
      <b className={`block truncate text-[17px] font-extrabold tabular-nums leading-none ${muted ? "text-zinc-600" : "text-white"}`}>
        {value}
      </b>
      <span className="mt-[5px] block text-[8.5px] uppercase tracking-[0.16em] text-zinc-500">{label}</span>
      {sub && <span className="block text-[9.5px] font-semibold text-accent">{sub}</span>}
    </Tag>
  );
}
