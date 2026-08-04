"use client";
import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/currency";
import FennecIdCard from "@/components/network/FennecIdCard";
import type { FennecIdColor } from "@/lib/fennecIdPalette";
import type { Quote } from "@/lib/pricingData";
import type { Profile, Post } from "@/lib/communityTypes";
import type { ContributionDays } from "@/lib/contributions";
import { NETWORK_ENABLED } from "@/lib/featureFlags";
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

/** Alto de la tarjeta en la rejilla. El ancho lo saca del aspecto 1.586. */
const ID_CARD_H = 216;

/* El mismo resorte que usa la app movil al abrir el Fennec ID: amortiguado a
   ζ=0.74, o sea que sube, se pasa apenas 3% y se acomoda. Se porta tal cual
   para que abrir la tarjeta se sienta igual en los dos lados (Paco 2026-08-03).
   Ojo: NO es un FLIP que interpola el rectangulo. En movil probaron eso y lo
   descartaron porque la tarjeta colapsada es ancha-y-baja y la expandida es
   mas alta: morfear entre esas dos proporciones escala x e y por separado y
   deforma visiblemente. Escala uniforme + fundido nunca distorsiona. */
const OPEN_SPRING = "linear(0, 0.0371, 0.1278, 0.2469, 0.3762, 0.5032, 0.6199, 0.7218, 0.8071, 0.8757, 0.9288, 0.9681, 0.9958, 1.014, 1.0249, 1.0302, 1.0315, 1.0302, 1.0273, 1.0235, 1.0194, 1.0154, 1.0118, 1.0086, 1.0059, 1.0038, 1.0022, 1.0009, 1.0001, 1)";

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
  onNavigate, onOpenProfileSettings, onReplayTour,
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
  /** Vuelve a lanzar el recorrido de globos. */
  onReplayTour?: () => void;
}) {
  // The producer's color lives ONLY on the FennecIdCard — it's the card's
  // identity, not the app's. All other accents stay on-brand amber.
  const accent = "#f5a623";
  const nextPost = useNextPost();

  /* Abrir la tarjeta. `cardOpen` monta la copia grande, `cardIn` dispara la
     transicion en el frame SIGUIENTE (doble rAF) para que el navegador alcance
     a pintar el estado inicial: sin eso la transicion no corre y aparece de
     golpe. `cardClosing` deja que la tarjeta chica reaparezca cruzandose con la
     grande que se encoge, en vez de parpadear. */
  const cardRef = useRef<HTMLButtonElement | null>(null);
  const [cardOpen, setCardOpen] = useState(false);
  const [cardIn, setCardIn] = useState(false);
  const [cardClosing, setCardClosing] = useState(false);

  function openCard() {
    setCardClosing(false);
    setCardOpen(true);
    setCardIn(false);
    /* Doble rAF para que el navegador alcance a pintar el estado inicial, MAS
       un temporizador de respaldo: el rAF se estrangula cuando la pestaña no
       esta al frente, y sin el respaldo la tarjeta se queda invisible en su
       estado de entrada (visto midiendo: opacity 0 y scale .92 congelados). */
    let disparado = false;
    const encender = () => { if (!disparado) { disparado = true; setCardIn(true); } };
    requestAnimationFrame(() => requestAnimationFrame(encender));
    setTimeout(encender, 60);
  }
  function closeCard() {
    setCardClosing(true);
    setCardIn(false);
    setTimeout(() => { setCardOpen(false); setCardClosing(false); }, 280);
  }
  // Escape cierra: es un overlay, y cerrar con teclado es lo que se espera.
  useEffect(() => {
    if (!cardOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeCard(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cardOpen]);

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
      {/* mb-5, no mb-7: el saludo crece de 21 a 28px y eso se come alto de la
          rejilla, que a 720px va justa. Quitarle 8px al margen devuelve mas de
          lo que cuesta la tipografia, asi que el titulo gana peso sin que nada
          de abajo se apriete. */}
      <div className="dd-rise mb-5 flex flex-shrink-0 items-center justify-between">
        {/* 28px: es el titulo de la pagina y estaba al mismo peso que los
            rotulos de los paneles. A 32px la jerarquia se lee sola y
            el saludo deja de competir (Paco 2026-08-03). */}
        <h1 className="text-[32px] font-bold leading-none tracking-[-0.02em] text-white">
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
        {/* "Share my ID" vive detras de la bandera de Network: compartir para
            que te coleccionen no sirve de nada mientras coleccionar esta
            apagado (Paco 2026-08-03). */}
        {/* Repetir el recorrido. Chiquito y permanente: el chip de progreso
            desaparece al completar los cinco pasos, asi que sin esto el
            recorrido dejaba de existir justo para quien ya lleva tiempo y es
            quien mas puede haber olvidado que era el dB (Paco 2026-08-03). */}
        {onReplayTour && (
          <button
            type="button"
            onClick={onReplayTour}
            aria-label="Show me around again"
            title="Show me around again"
            className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full border border-white/10 text-[11px] font-bold text-zinc-500 transition hover:border-accent/40 hover:text-accent active:scale-95"
          >
            ?
          </button>
        )}

        {NETWORK_ENABLED && (
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
        )}
        </div>
      </div>

      {/* ══ BENTO, CUATRO FILAS ══
          Antes eran dos columnas independientes, cada una repartiendo su alto
          por su cuenta. Eso dejaba a los bloques de la izquierda flotando con
          huecos enormes entre ellos mientras la derecha iba apretada
          (Paco 2026-08-03). La rejilla que pidió empareja las filas:

            Fennec ID + dB     |  Noticias (2x2)
            Music & Business   |  Today on Fennec
            Contributions (ancho completo)
            Audience (ancho completo)

          La columna derecha quedo como la parte informativa: arriba lo que pasa
          en la industria, abajo lo que pasa en tu casa. Audience bajo a su
          propia fila horizontal, que es donde estaba antes y donde el numero
          respira (Paco 2026-08-03).

          Al ser UNA sola rejilla, cada fila mide lo mismo en ambos lados y
          desaparecen los huecos. La tercera fila se lleva la holgura porque
          Contributions es lo que de verdad mejora con alto. */}
      <div
        /* gap-3, no gap-4. Con Audience abajo son cuatro filas cuyos minimos
           (216 de la tarjeta de ID + 93.5 de metricas + 144 del año + 80 de
           Audience) suman 533.5, y en una ventana de 720px la rejilla solo mide
           572. Con 16px de hueco entre filas el total daba 581.5 y los ultimos
           10px de Audience se cortaban; con 12 cabe justo (medido 2026-08-03).
           En pantallas mas altas el sobrante se sigue yendo a la ultima fila. */
        className="grid min-h-0 flex-1 gap-3 overflow-hidden"
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
          /* El sobrante lo toma Contributions, y Audience lleva TOPE.
             Mientras las noticias vivian abajo tenia sentido darles todo el
             sobrante: mas alto = tarjetas mas grandes. Ahora abajo esta
             Audience, que es un numero y tres iconos: en una ventana de 1250px
             se estiraba a 227px de puro aire (visto 2026-08-03). Dejar las
             filas en automatico tampoco sirve — sin restriccion su alto natural
             suma mas de lo que cabe en 720px y Audience quedaba en 27px. */
          /* 232 y no 210 en la fila del año: con 210 la ultima fila de dias se
             quedaba 11px fuera del recorte, y con ella el anillo del dia
             elegido — que es como se noto (Paco 2026-08-03). Las celdas son
             cuadradas y siguen al ancho, asi que el alto que pide la rejilla
             sube con la ventana; 232 cubre hasta ~1960px de ancho. */
          gridTemplateRows: "auto auto minmax(144px, 232px) minmax(80px, 128px)",
          /* El sobrante que ya no cabe en ningun tope se junta ABAJO, fuera de
             los paneles. Sin esto se lo comia Contributions y quedaba un hueco
             de 400px dentro del recuadro: las celdas del año son cuadradas, no
             crecen con el alto, asi que estirar el panel solo estira el vacio.
             Fuera del panel ese espacio es la foto del estudio. */
          alignContent: "start",
        }}
      >

      {/* ── Fila 1: quién eres, y la lectura que produce ── */}
      <div className="dd-rise flex min-w-0 items-stretch gap-4" style={{ animationDelay: ".06s" }}>
        {/* PROPORCION DE IDENTIFICACION.
            La tarjeta ocupaba el ancho completo de la columna: 684x195, o sea
            3.5:1. Una identificacion real (ID-1, la de una tarjeta bancaria) es
            1.586:1, y por eso no se leia como tarjeta sino como banner estirado
            (Paco 2026-08-03). Con el aspecto correcto vuelve a ser un objeto que
            reconoces, y el hueco que deja se lo lleva el dB, que estaba en la
            otra columna. */}
        <button
          type="button"
          onClick={openCard}
          ref={cardRef}
          data-coach="id"
          aria-label="Open my Fennec ID"
          className="group relative flex-shrink-0 text-left transition active:scale-[0.99]"
          style={{
            aspectRatio: "1.586 / 1",
            height: ID_CARD_H,
            opacity: cardOpen && !cardClosing ? 0 : 1,
            transition: cardClosing ? "opacity .32s ease" : "opacity .1s ease, transform .15s cubic-bezier(.16,1,.3,1)",
            pointerEvents: cardOpen ? "none" : "auto",
          }}
        >
          <FennecIdCard
            firstName={card.firstName} lastName={card.lastName}
            role={card.role || "Producer"} country={card.country}
            genres={card.genres} fennecDb={fennecDb} colorScheme={cardColorScheme}
            initials={card.initials} avatarUrl={card.avatarUrl}
            instagram={card.instagram} spotify={card.spotify} youtube={card.youtube}
            collectionNumber={card.collectionNumber} smallDb
          />
        </button>

        <div className="min-w-0 flex-1" data-coach="db">
          <Instrument
            label="Fennec dB"
            value={String(fennecDb)}
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
      </div>

      {/* Las noticias suben aqui, junto a quien eres: la columna derecha pasa a
          ser la parte informativa de la pantalla y Audience baja a su propia
          fila (Paco 2026-08-03). En 320px de ancho van 2x2 en vez de la tira de
          cuatro. */}
      <div className="dd-rise flex min-h-0 min-w-0 flex-col" style={{ animationDelay: ".09s" }}>
        <IndustryNews count={4} columnas={2} onOpen={() => onNavigate?.("noticias")} />
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


      {/* Today comparte fila con Music & Business: las dos son "lo que está
          pasando ahora", y asi Contributions queda libre para ocupar el ancho. */}
      <div className="dd-rise flex min-h-0 flex-col" style={{ animationDelay: ".15s" }}>
        <Tile label="Today on Fennec" className="h-full">
          <div className="flex flex-col divide-y divide-white/[0.05]">
            <button type="button" onClick={() => onNavigate?.("ideas")} className="group flex items-center justify-between gap-3 py-[5px] text-left transition first:pt-0">
              <span className="min-w-0 truncate text-[12px] text-zinc-400">
                {latestNote ? "New note on your track" : "No track feedback yet"}
              </span>
              <span className="flex-shrink-0 text-[11px] font-semibold text-zinc-500 transition group-hover:text-accent">
                {latestNote ? "Open →" : "Upload →"}
              </span>
            </button>
            <button type="button" onClick={() => onNavigate?.("pricing")} className="group flex items-center justify-between gap-3 py-[5px] text-left">
              <span className="min-w-0 truncate text-[12px] text-zinc-400">
                {sentQuotes.length > 0 ? `${sentQuotes.length} quote${sentQuotes.length > 1 ? "s" : ""} awaiting reply` : "No open quotes"}
              </span>
              <span className="flex-shrink-0 text-[11px] font-semibold text-zinc-500 transition group-hover:text-accent">
                {sentQuotes.length > 0 ? "View →" : "Send →"}
              </span>
            </button>
            <button type="button" onClick={() => onNavigate?.("contenido")} className="group flex items-center justify-between gap-3 py-[5px] text-left">
              <span className="min-w-0 truncate text-[12px] text-zinc-400">
                {nextPost ? `Next post · ${fmtDate(nextPost.date)}` : "Nothing scheduled"}
              </span>
              <span className="flex-shrink-0 text-[11px] font-semibold text-zinc-500 transition group-hover:text-accent">
                {nextPost ? "Calendar →" : "Plan →"}
              </span>
            </button>
          </div>
        </Tile>
      </div>

      {/* ── Fila 3: la evidencia, a lo ancho ──
          52 semanas necesitan ancho. En la columna de 320px los meses no se
          alcanzaban a leer, asi que ocupa las dos columnas. */}
      <div data-coach="contributions" className="dd-rise col-span-2 flex min-h-0 min-w-0 flex-col" style={{ animationDelay: ".18s" }}>
        {/* SIN cellSize: la tarjeta tiene dos modos y el flexible es el
            correcto aquí. Con celdas fijas de 10px el año medía 673px de ancho
            (52 columnas × 10 + 51 huecos × 3) dentro de un contenedor de 650, y
            se salía por la derecha (Paco 2026-08-03, medido: desborde 23px).
            Cualquier número fijo vuelve a romperse en cuanto cambia el ancho de
            la ventana. En modo flexible las celdas son flex-1 con
            aspect-square, así que caben SIEMPRE, sea cual sea el ancho. */}
        <ContributionsCard data={contributions ?? null} accent="#f5a623" weeks={52} />
      </div>

      {/* ── Fila 4: a cuánta gente le llegas, a lo ancho ──
          Volvio abajo y en horizontal, como estaba antes de que el dB liberara
          la celda de arriba (Paco 2026-08-03). Con el ancho completo el total
          crece y cada plataforma lleva su nombre escrito. */}
      <div className="dd-rise col-span-2 flex min-h-0 min-w-0 flex-col" style={{ animationDelay: ".24s" }}>
        <SocialMini
          ancho
          igFollowers={igFollowers}
          ttFollowers={ttFollowers}
          ytSubs={ytSubs}
          onConnect={onOpenProfileSettings}
        />
      </div>
      </div>{/* /bento */}

      {/* ── La tarjeta, abierta ── */}
      {cardOpen && (
        <>
          <div
            onClick={closeCard}
            className="fixed inset-0 z-[99]"
            style={{
              background: "rgba(0,0,0,0.72)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              opacity: cardIn ? 1 : 0,
              transition: "opacity .3s ease",
            }}
          />
          <div
            className="fixed left-1/2 top-1/2 z-[100]"
            style={{
              width: 420,
              marginLeft: -210,
              marginTop: -170,
              opacity: cardIn ? 1 : 0,
              transform: cardIn ? "translateY(0) scale(1)" : "translateY(14px) scale(0.92)",
              transformOrigin: "center center",
              transition: cardIn
                ? `transform .5s ${OPEN_SPRING}, opacity .28s ease-out`
                : "transform .26s cubic-bezier(.3,0,.66,1), opacity .2s ease-in",
              willChange: "transform, opacity",
            }}
          >
            <FennecIdCard
              firstName={card.firstName} lastName={card.lastName}
              role={card.role || "Producer"} country={card.country}
              genres={card.genres} fennecDb={fennecDb} colorScheme={cardColorScheme}
              initials={card.initials} avatarUrl={card.avatarUrl}
              instagram={card.instagram} spotify={card.spotify} youtube={card.youtube}
              collectionNumber={card.collectionNumber}
            />
          </div>
        </>
      )}
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
