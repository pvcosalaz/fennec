"use client";
import { useEffect, useRef, useState } from "react";
import { Home, Briefcase, Camera, Users, Settings, AudioWaveform, UserPlus, ChevronRight } from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import { getColorScheme } from "@/lib/fennecIdPalette";
import {
  CANVAS_BG, DOCK_BG, DOCK_BLUR, DOCK_SHADOW, Grain, Atmosphere,
} from "@/components/desktop/surfaces";
import type { Profile } from "@/lib/communityTypes";

/* ═══════════════════════════════════════════════════════════════
   DESKTOP SHELL — the approved prototype language, on real data.
   Chrome only: the left rail (nav + live tape pulse + mini ID), a
   three-button account cluster at the top of the content column, and
   the scrolling main area. The module tree renders as children — ONE
   source of truth in PricingCalculator.

   The 292px right social rail was removed 2026-08-02: it spent a fifth
   of the screen on chrome read once a session, and its only real
   content (Your Network) duplicated a left-nav destination.
   Prototype reference: public/desktop-mockup.html · spec:
   docs/superpowers/specs/2026-07-09-desktop-foundation-design.md
   ═══════════════════════════════════════════════════════════════ */

export type DesktopTab = "dashboard" | "pricing" | "ideas" | "contenido" | "noticias";

import { NETWORK_ENABLED } from "@/lib/featureFlags";

type NavItem = { id: DesktopTab | "network"; label: string; icon: React.ComponentType<{ className?: string }> };

const NAV_ALL: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "pricing",   label: "Business",  icon: Briefcase },
  { id: "ideas",     label: "The Tape",  icon: AudioWaveform },
  { id: "contenido", label: "Marketing", icon: Camera },
  { id: "noticias",  label: "Community", icon: Users },
  /* Network apagado para el lanzamiento web — ver lib/featureFlags. Se filtra
     en vez de borrarse para que volver a prenderlo sea una linea. */
  { id: "network",   label: "Network",   icon: UserPlus },
];

const NAV: NavItem[] = NAV_ALL.filter((n) => NETWORK_ENABLED || n.id !== "network");

/** Sidebar: full with labels, or icon-only once the window gets narrow so a
 *  squeezed desktop window keeps the desktop shell instead of flipping to the
 *  phone UI (Paco 2026-07-30). */
const SIDEBAR_FULL = 232;
const SIDEBAR_MINI = 62;
/* Cuánto se despega el dock de los bordes. Es la medida que lo convierte en
   objeto: a 0 vuelve a ser pared. */
const DOCK_INSET = 12;
/* Lo que el contenido tiene que dejar libre: el hueco de la izquierda, el
   ancho del dock cerrado, y un respiro para que el contenido no lo roce. */
const CONTENT_GUTTER = DOCK_INSET + SIDEBAR_MINI + 10;
const HAIR = "rgba(255,255,255,.06)";

/* The tape's heartbeat in the sidebar: 24 amber bars breathing. Heights are
   fixed (not random) so SSR/CSR match; the stagger makes them feel alive. */
const PULSE_BARS = [8, 14, 7, 18, 11, 22, 9, 15, 7, 12, 17, 8, 13, 20, 10, 6, 16, 9, 14, 7, 19, 11, 8, 15];

export default function DesktopShell({
  profile,
  userId,
  activeTab,
  networkActive = false,
  settingsOpen = false,
  onNavigate,
  onOpenNetwork,
  onOpenSettings,
  onOpenMyProfile,
  children,
}: {
  profile: Profile;
  userId: string;
  activeTab: DesktopTab;
  networkActive?: boolean;
  settingsOpen?: boolean;
  onNavigate: (tab: DesktopTab) => void;
  onOpenNetwork: () => void;
  onOpenSettings: () => void;
  onOpenMyProfile: () => void;
  children: React.ReactNode;
}) {
  const scheme = getColorScheme(profile.color_id ?? null);
  const name = profile.display_name || profile.username || "";
  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "F";

  // Narrow window → icon-only sidebar. Keeps the desktop shell usable when the
  // window is dragged small, instead of falling back to the phone UI.
  /* Icons at rest, labels on hover — the Supabase behaviour Paco asked for
     (2026-08-02), which beats the click toggle because reading a label costs
     nothing and demands no decision.

     The critical part: the expanded rail OVERLAYS the canvas, it doesn't push
     it. Content margin stays pinned to the mini width, so sweeping the mouse
     past the edge never reflows the page underneath. A rail that shoves the
     layout on hover is worse than one that never expands.

     focus-within too, or the labels would be unreachable by keyboard. */
  const [railHover, setRailHover] = useState(false);
  const compact = !railHover;
  const SIDEBAR_W = CONTENT_GUTTER;

  /* INTENCIÓN POR VELOCIDAD, no por reloj.
     Antes era un retraso fijo de 110ms antes de abrir. Filtraba bien el
     barrido accidental, pero un tiempo muerto igual para todos se percibe como
     traba: mueves el mouse al dock y no pasa nada durante un rato
     (Paco 2026-08-03).

     La señal buena no es cuánto llevas encima, es CÓMO llegaste. Un puntero
     que viene a propósito desacelera al llegar; uno que va cruzando la
     pantalla pasa rápido. Así que se mide la velocidad dentro del dock:
     despacio abre YA, rápido espera a que frene.

     El cierre sigue con reloj, y con holgura: perdona rozar el borde de salida
     y volver a entrar. */
  const SLOW_ENOUGH = 0.55;   // px/ms — por debajo de esto, el puntero viene a quedarse
  const GIVE_UP_AFTER = 260;  // si nunca frena, abre igual y no lo dejamos colgado
  const CLOSE_DELAY = 140;

  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMove = useRef<{ x: number; y: number; t: number } | null>(null);

  function clearTimer() {
    if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null; }
  }

  function onRailEnter(e: React.MouseEvent) {
    clearTimer();
    lastMove.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    // Red de seguridad: si el puntero entra y se queda quieto, no hay más
    // mousemove que midan velocidad, así que abrimos de todos modos.
    hoverTimer.current = setTimeout(() => setRailHover(true), GIVE_UP_AFTER);
  }

  function onRailMove(e: React.MouseEvent) {
    if (railHover) return;
    const prev = lastMove.current;
    const now = performance.now();
    lastMove.current = { x: e.clientX, y: e.clientY, t: now };
    if (!prev) return;
    const dt = now - prev.t;
    if (dt <= 0) return;
    const dist = Math.hypot(e.clientX - prev.x, e.clientY - prev.y);
    if (dist / dt < SLOW_ENOUGH) { clearTimer(); setRailHover(true); }
  }

  function onRailLeave() {
    clearTimer();
    lastMove.current = null;
    hoverTimer.current = setTimeout(() => setRailHover(false), CLOSE_DELAY);
  }

  /* El foco de teclado es deliberado por definición: sin esperas. */
  function setRailNow(open: boolean) { clearTimer(); setRailHover(open); }

  useEffect(() => () => clearTimer(), []);


  const slide = "transform .32s cubic-bezier(.22,1,.36,1)";

  // Immersive: The Tape is the flagship, so entering it clears the chrome —
  // both side rails slide away and the reel takes the whole viewport.
  const immersive = activeTab === "ideas" && !networkActive && !settingsOpen;

  return (
    <div className="min-h-screen" style={{ background: CANVAS_BG }}>
      {/* Film grain over the whole shell: large gradients band on wide
          displays, and the noise also makes rail and canvas read as one
          material instead of two flat fills. */}
      <Grain />

      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside
        /* DOCK FLOTANTE, no columna a sangre (Paco 2026-08-03).
           `top-1/2 -translate-y-1/2` con alto automático: la barra mide lo que
           mide su contenido y se centra sola, en vez de estirarse de borde a
           borde. Separada de los tres lados, se lee como un objeto encima de la
           habitación y no como una pared.
           El tope de alto es por si la ventana es muy baja: antes que
           desbordar, scrollea por dentro. */
        className="fixed z-40 flex flex-col overflow-hidden"
        onMouseEnter={onRailEnter}
        onMouseMove={onRailMove}
        onMouseLeave={onRailLeave}
        onFocusCapture={() => setRailNow(true)}
        onBlurCapture={(e) => {
          // Only collapse once focus has genuinely left the rail, not while
          // it's moving between two nav buttons inside it.
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setRailNow(false);
        }}
        style={{
          left: DOCK_INSET,
          top: "50%",
          maxHeight: `calc(100dvh - ${DOCK_INSET * 2}px)`,
          // Overlays the canvas when expanded; the content margin below is
          // pinned to the mini width, so hovering never reflows the page.
          width: compact ? SIDEBAR_MINI : SIDEBAR_FULL,
          /* Vidrio, no el panel opaco de antes: flotando sobre el canvas (y
             sobre la foto del estudio en el dashboard) tiene que dejar ver lo
             que hay detrás, o vuelve a leerse como una barra pegada. */
          background: DOCK_BG,
          backdropFilter: DOCK_BLUR,
          WebkitBackdropFilter: DOCK_BLUR,
          boxShadow: DOCK_SHADOW,
          /* Radio y padding FIJOS, no animados.
             Antes cambiaban con el estado, así que la transición movía cuatro
             propiedades a la vez: transform, width, padding y border-radius.
             Tres de ellas provocan re-layout, y sobre un elemento con
             backdrop-filter eso obliga al navegador a re-muestrear y volver a
             desenfocar el fondo en CADA frame, a un tamaño distinto. Era la
             parte cara de la animación, y su aporte visual era casi nulo: 22
             contra 26 de radio no lo nota nadie (Paco 2026-08-03).
             Queda solo `width`, que es la que de verdad comunica que se abre. */
          borderRadius: 22,
          padding: "16px 10px 14px",
          transform: immersive
            ? `translate(calc(-100% - ${DOCK_INSET}px), -50%)`
            : "translate(0, -50%)",
          /* 260ms: lo bastante para leerse como movimiento y no como salto,
             sin que se sienta que estás esperando a que termine. */
          transition: `${slide}, width .26s cubic-bezier(.22,1,.36,1)`,
        }}
      >
        {/* pb-4, no pb-6: el dock ya no tiene una columna entera que llenar, así
            que el aire de arriba pasó de estructural a sobrante. */}
        {/* El punto de la marca se queda quieto y "fennec" se desvanece a su
            izquierda. Antes el texto se MONTABA de golpe y empujaba el punto de
            sitio: dos saltos en el mismo frame. */}
        <div className="relative flex h-[26px] flex-shrink-0 items-center pb-4">
          <span
            aria-hidden={compact}
            className="pointer-events-none absolute left-[13px] whitespace-nowrap text-[19px] font-bold leading-none tracking-tight text-white"
            style={{
              opacity: compact ? 0 : 1,
              transform: compact ? "translateX(-6px)" : "translateX(0)",
              transition: compact
                ? "opacity .09s ease, transform .09s ease"
                : "opacity .22s cubic-bezier(.23,1,.32,1) 30ms, transform .26s cubic-bezier(.23,1,.32,1) 30ms",
            }}
          >
            fennec
          </span>
          <span
            className="absolute inline-block h-[5px] w-[5px] rounded-full bg-accent"
            style={{
              boxShadow: "0 0 8px rgba(245,166,35,.8)",
              left: compact ? 19 : 96,
              transition: "left .26s cubic-bezier(.23,1,.32,1)",
            }}
          />
        </div>

        <nav className="flex flex-col gap-0.5">
          {NAV.map(({ id, label, icon: Icon }, i) => {
            const active = id === "network"
              ? networkActive
              : !networkActive && !settingsOpen && activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => (id === "network" ? onOpenNetwork() : onNavigate(id))}
                aria-current={active ? "page" : undefined}
                title={compact ? label : undefined}
                /* El layout del boton es IDENTICO abierto y cerrado: un slot de
                   icono de ancho fijo y la etiqueta en absoluto. Antes el boton
                   alternaba justify-center/px y la etiqueta pasaba de width 0 a
                   auto, o sea que en un solo frame el texto se maquetaba entero
                   y el icono se movia de sitio. Eso era el corte
                   (Paco 2026-08-03). */
                className={`relative flex items-center rounded-[10px] py-[9px] text-[13.5px] font-medium ${active ? "" : "hover:bg-white/[0.04] hover:text-zinc-200"}`}
                style={active ? { background: "rgba(245,166,35,.09)", color: "#ffc861" } : { color: "#8b8b93" }}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-4 w-[2.5px] -translate-y-1/2 rounded-full" style={{ background: "#f5a623" }} />
                )}

                {/* 42px = el ancho interior del dock cerrado (62 - 10 de padding
                    a cada lado). Asi el icono queda centrado al estar cerrado y
                    NO se mueve ni un pixel al abrirse. */}
                <span className="grid w-[42px] flex-shrink-0 place-items-center">
                  <Icon className="h-4 w-4" />
                </span>

                {/* En absoluto: no ocupa espacio, asi que no hay nada de layout
                    que animar. Solo opacity y transform, las dos en GPU.
                    Cascada de 22ms: seis etiquetas apareciendo a la vez se leen
                    como un parpadeo; escalonadas se leen como que llegan. */}
                <span
                  aria-hidden={compact}
                  className="pointer-events-none absolute left-[42px] whitespace-nowrap"
                  style={{
                    opacity: compact ? 0 : 1,
                    transform: compact ? "translateX(-6px)" : "translateX(0)",
                    transition: compact
                      ? "opacity .09s ease, transform .09s ease"
                      : `opacity .22s cubic-bezier(.23,1,.32,1) ${40 + i * 22}ms, transform .26s cubic-bezier(.23,1,.32,1) ${40 + i * 22}ms`,
                  }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Antes era `mt-auto`, que empujaba este grupo al piso de una columna
            de alto completo. Con el dock a alto automático ese empujón no
            existe (no hay sobrante que repartir), así que la separación ahora
            es explícita: un poco de aire y una hairline, como el bloque de
            perfil separado del resto en la referencia. */}
        <div
          className="mt-4 flex flex-col gap-2.5 pt-4"
          style={{ borderTop: `1px solid ${HAIR}` }}
        >
          {/* The Tape · live pulse — the reel's heartbeat, always present */}
          <button
            type="button"
            onClick={() => onNavigate("ideas")}
            aria-label="Open The Tape"
            title={compact ? "The Tape · live" : undefined}
            className={`rounded-[14px] transition hover:border-accent/40 ${compact ? "grid place-items-center py-2.5" : "px-3 pb-2.5 pt-3 text-left"}`}
            style={{
              background: "linear-gradient(150deg,rgba(245,166,35,.07),rgba(245,166,35,.02))",
              border: "1px solid rgba(245,166,35,.14)",
            }}
          >
            <div className="flex h-[26px] items-center gap-[2px]">
              {(compact ? PULSE_BARS.slice(0, 6) : PULSE_BARS).map((h, i) => (
                <i
                  key={i}
                  className="fennec-pulse-bar w-[3px] rounded-[2px]"
                  style={{
                    height: h,
                    background: "linear-gradient(180deg,#ffc861,rgba(245,166,35,.35))",
                    animationDelay: `${(i * 97) % 900}ms`,
                  }}
                />
              ))}
            </div>
            {!compact && (
              <div className="mt-[7px] flex items-baseline justify-between">
                <b className="text-[9px] font-bold uppercase tracking-[0.2em] text-accent">The Tape · live</b>
              </div>
            )}
          </button>

          {/* mini profile — on-brand chrome; the producer's color belongs to
              the FennecIdCard only (avatar initials keep it: it's their photo) */}
          {/* Tu cara abre TU perfil de comunidad, no los ajustes: es la unica
              foto de la app que ya es tu retrato, y hasta hoy no llevaba a
              ningun lado — el perfil solo se alcanzaba tocando tu nombre en un
              post propio. Los ajustes siguen en el avatar de arriba a la
              derecha (Paco 2026-08-03). */}
          <button
            type="button"
            onClick={onOpenMyProfile}
            aria-label={`${name} — view my community profile`}
            title={compact ? `${name} — my profile` : "My community profile"}
            className={`w-full text-left transition hover:brightness-110 active:scale-[0.98] ${compact ? "grid place-items-center py-1" : "rounded-[14px] p-3"}`}
            style={compact ? undefined : { border: `1px solid ${HAIR}`, background: "linear-gradient(150deg,#17151c,#100f13)" }}
          >
            <div className="flex items-center gap-2.5">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" className="h-[30px] w-[30px] rounded-full object-cover" />
              ) : (
                <div className="grid h-[30px] w-[30px] place-items-center rounded-full text-[11px] font-bold" style={{ background: scheme.accent, color: scheme.textOnAvatar }}>
                  {initials}
                </div>
              )}
              {!compact && (
                <div className="min-w-0">
                  <div className="truncate text-[12.5px] font-semibold text-white">{name}</div>
                  <div className="text-[9.5px] uppercase tracking-[0.12em] text-zinc-500">{profile.role ?? "Producer"}</div>
                </div>
              )}
            </div>
            {!compact && (
              <div className="mt-2 flex items-baseline gap-1.5 border-t pt-2" style={{ borderColor: "rgba(255,255,255,.06)" }}>
                <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-zinc-600">Fennec dB</span>
                <b className="text-[16px] text-accent">{profile.fennec_db_score}</b>
              </div>
            )}
          </button>

        </div>
      </aside>

      {/* ── Main area (margins slide with the rails) ─────────────
          h-screen + overflow-y-auto: this is the ONE scroll container on
          desktop. PricingCalculator's early-return to DesktopShell skips
          the mobile #scroll-root entirely, and html/body are globally
          overflow:hidden (the PWA scroll lock) — without this, nothing
          taller than one viewport (a long Community feed, a full month
          calendar, a tall business table) could ever be reached. Sidebar
          and rail are `fixed`, so they're unaffected by this scrolling. */}
      <div
        className="relative flex h-screen flex-col overflow-y-auto"
        style={{ marginLeft: immersive ? 0 : SIDEBAR_W, transition: "margin .32s cubic-bezier(.22,1,.36,1)" }}
      >
        {/* Giant fox, deep background layer — the brand present at all times,
            like the landing's first screen. Barely-there so content wins.
            Hidden in immersive: the reel owns the whole surface. */}
        {!immersive && (
          <Atmosphere inset={{ left: SIDEBAR_W }} />
        )}
        {immersive ? (
          <div className="relative z-10 w-full flex-1">{children}</div>
        ) : (
          <>
          {/* ── Account cluster ──
              What used to be a 292px rail is two buttons. The rail spent a
              fifth of the screen on chrome that gets read once a session, and
              its one piece of real content — Your Network — was a shortcut to
              a destination already sitting in the left nav (Paco 2026-08-02).

              Pinned to the window's right edge, NOT to the 1100px content
              column: inside the column it landed directly above each module's
              own actions ("+ New quote", "Share my ID") and the two rows read
              as a pile. Out here there's empty gutter to spare.

              The gear folded into the avatar — clicking your face opens
              Fennec's settings, which is where everyone looks for them. */}
          <div className="relative z-20 flex flex-shrink-0 items-center justify-end gap-2 px-8 pt-5">
            <NotificationBell userId={userId} align="right" />
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label={`${name} — account and settings`}
              title="Settings"
              className="rounded-full transition hover:brightness-110"
            >
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover"
                  style={{ border: "1px solid rgba(255,255,255,.16)" }}
                />
              ) : (
                <div
                  className="grid h-9 w-9 place-items-center rounded-full text-[12px] font-extrabold"
                  style={{ background: scheme.accent, color: scheme.textOnAvatar, border: "1px solid rgba(255,255,255,.16)" }}
                >
                  {initials}
                </div>
              )}
            </button>
          </div>

          {/* One canonical content frame for every module: 1100px column,
              40px gutters, generous bottom padding so scroll always lands
              with breathing room. Modules must NOT add their own mx-auto/
              max-w/px — this is the single source of page margins.
              flex-col + min-h-0 so a module can claim h-full and distribute
              its own vertical space (Business fills the screen instead of
              leaving a 340px dead zone) while still scrolling when it
              outgrows one viewport. */}
          <div className="relative z-10 mx-auto flex w-full min-h-0 max-w-[1100px] flex-1 flex-col px-10 pb-8 pt-2">
            {children}
          </div>
          </>
        )}
      </div>

      {/* Immersive exit — quiet home affordance top-left, the only chrome
          left while the reel is playing. Returns to the dashboard. */}
      {immersive && (
        <button
          type="button"
          onClick={() => onNavigate("dashboard")}
          aria-label="Leave The Tape"
          className="fixed left-5 top-5 z-[80] flex items-center gap-2 rounded-full border px-3.5 py-2 text-[12px] font-semibold transition hover:brightness-110"
          style={{ borderColor: "rgba(245,166,35,.35)", background: "rgba(17,16,20,.7)", color: "#f5a623", backdropFilter: "blur(8px)" }}
        >
          <ChevronRight className="h-3.5 w-3.5" style={{ transform: "rotate(180deg)" }} />
          fennec
        </button>
      )}

      <style>{`
        @keyframes fennecPulse { from { transform: scaleY(.45); } to { transform: scaleY(1); } }
        .fennec-pulse-bar { animation: fennecPulse 1.6s ease-in-out infinite alternate; }
        @media (prefers-reduced-motion: reduce) { .fennec-pulse-bar { animation: none; } }
      `}</style>
    </div>
  );
}
