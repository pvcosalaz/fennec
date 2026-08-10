"use client";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { ProjectReview } from "@/lib/audioTypes";
import { fetchRandomReviews, fetchReviewById } from "@/lib/audioDb";
import { takePendingTrack, EVENTO_ABRIR_TRACK } from "@/lib/tapeNav";
import ProjectReviewPlayer from "./ProjectReviewPlayer";
import MyTracksView from "./MyTracksView";
import IdeasModule from "@/components/ideas/IdeasModule";
import TapeIntro from "./TapeIntro";
import TapeDeckDesktop from "./TapeDeckDesktop";
import { useSheetDismiss, SHEET_BOTTOM, SHEET_ENTER } from "@/components/ui/useSheetDismiss";
import { useIsDesktop } from "@/lib/useIsDesktop";

type Overlay = "melody" | "mine" | "intro" | null;

const INTRO_SEEN_KEY = "fennec_tape_intro_seen_v1";

type Props = {
  userId: string;
  isPro: boolean;
  /** Fired with true while a bottom sheet (intro / My Tracks) is open, so
   *  the shell can slide the nav away and give the sheet the full bottom. */
  onSheetChange?: (open: boolean) => void;
};

export default function AudioModule({ userId, isPro, onSheetChange }: Props) {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();
  const [overlay, setOverlay]       = useState<Overlay>(null);
  const [queue, setQueue]           = useState<ProjectReview[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [skipStreak, setSkipStreak] = useState(0);

  useEffect(() => {
    /* Si alguien pidio un track concreto (perfil de un productor, o una
       notificacion de feedback), ese va PRIMERO y la cola normal detras: al
       terminarlo sigues escuchando en vez de quedarte en un callejon
       (Paco 2026-08-04). */
    const pedido = takePendingTrack();
    fetchRandomReviews(userId, 10)
      .then(async (tracks) => {
        if (pedido) {
          const t = await fetchReviewById(pedido).catch(() => null);
          if (t) {
            setQueue([t, ...tracks.filter((x) => x.id !== t.id)]);
            setQueueIndex(0);
            return;
          }
        }
        setQueue(tracks); setQueueIndex(0);
      })
      .catch(console.error)
      .finally(() => setLoadingQueue(false));
  }, [userId]);

  // First visit → the tape intro (reopenable from the ⋯ flyout).
  // Mark it seen the moment it's SHOWN, not only when properly dismissed —
  // on desktop, the immersive-exit "‹ fennec" pill sits above this overlay
  // and stays clickable while it's open; leaving that way skipped
  // closeIntro()'s write entirely, so the flag never got set and the intro
  // kept reappearing on every visit to the tab.
  useEffect(() => {
    try {
      if (!localStorage.getItem(INTRO_SEEN_KEY)) {
        setOverlay("intro");
        localStorage.setItem(INTRO_SEEN_KEY, "1");
      }
    } catch { /* private mode */ }
  }, []);

  // Bottom sheets own the whole bottom edge: nav slides away while open
  useEffect(() => {
    const sheetOpen = overlay === "intro" || overlay === "mine";
    onSheetChange?.(sheetOpen);
    return () => onSheetChange?.(false); // leaving the tab restores the nav
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay]);

  function closeIntro(next: Overlay = null) {
    try { localStorage.setItem(INTRO_SEEN_KEY, "1"); } catch { /* ignore */ }
    setOverlay(next);
  }

  /* El modulo ya abierto tambien tiene que obedecer: si estas en La Cinta y
     llega una notificacion, o vienes de un perfil sin cambiar de pestaña, el
     valor guardado no se lee otra vez porque no hay montaje nuevo. */
  useEffect(() => {
    const onAbrir = async (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (!id) return;
      takePendingTrack();
      const t = await fetchReviewById(id).catch(() => null);
      if (!t) return;
      setQueue((q) => [t, ...q.filter((x) => x.id !== t.id)]);
      setQueueIndex(0);
    };
    window.addEventListener(EVENTO_ABRIR_TRACK, onAbrir);
    return () => window.removeEventListener(EVENTO_ABRIR_TRACK, onAbrir);
  }, []);

  function handlePass() {
    if (queueIndex + 1 >= queue.length) {
      setLoadingQueue(true);
      fetchRandomReviews(userId, 10)
        .then((tracks) => { setQueue(tracks); setQueueIndex(0); })
        .catch(console.error)
        .finally(() => setLoadingQueue(false));
    } else {
      setQueueIndex((i) => i + 1);
    }
  }

  const currentTrack = queue[queueIndex] ?? null;

  return (
    // Desktop gets the horizontal reel-to-reel (TapeDeckDesktop, self-framed);
    // mobile keeps the full-bleed vertical player. Overlays are shared.
    <div className={isDesktop ? "relative h-full" : "absolute inset-0"}>

      {/* ── Main player — the tape is the screen ──────────────── */}
      {loadingQueue && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#131216" }}>
          <p className="text-xs text-zinc-600">{t("amCargandoTracks")}</p>
        </div>
      )}
      {!loadingQueue && !currentTrack && (
        <div className="absolute inset-0 flex items-center justify-center px-10 text-center" style={{ background: "#131216" }}>
          <p className="text-xs text-zinc-600">{t("amSinTracks")}</p>
        </div>
      )}
      {!loadingQueue && currentTrack && (
        isDesktop ? (
          <TapeDeckDesktop
            key={currentTrack.id}
            track={currentTrack}
            userId={userId}
            onPass={handlePass}
            onOpenMyTracks={() => setOverlay("mine")}
            onOpenIntro={() => setOverlay("intro")}
          />
        ) : (
          <ProjectReviewPlayer
            key={currentTrack.id}
            track={currentTrack}
            userId={userId}
            onPass={handlePass}
            skipStreak={skipStreak}
            onSkipStreakChange={setSkipStreak}
            onOpenMelody={() => setOverlay("melody")}
            onOpenMyTracks={() => setOverlay("mine")}
            onOpenIntro={() => setOverlay("intro")}
          />
        )
      )}

      {/* ── Tape intro — first visit + on demand ───────────────── */}
      {overlay === "intro" && (
        <TapeIntro
          isDesktop={isDesktop}
          onClose={() => closeIntro(null)}
          onUpload={() => closeIntro("mine")}
        />
      )}

      {/* ── Melody Bank overlay ────────────────────────────────── */}
      {/* z-50: must sit ABOVE the ideas-tab floating bell+settings row
          (z-40 in PricingCalculator) so the Settings gear doesn't overlap
          the Melody Bank collection. */}
      {overlay === "melody" && (
        <div className="fixed inset-0 z-50 bg-[#111114] overflow-y-auto pb-32">
          <div className="flex justify-end px-4 pt-14 pb-2">
            <button onClick={() => setOverlay(null)} aria-label={t("amCerrar")} className="text-zinc-500 hover:text-white transition">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="px-4">
            <IdeasModule onBack={() => setOverlay(null)} />
          </div>
        </div>
      )}

      {/* ── My Tracks bottom sheet ─────────────────────────────── */}
      {overlay === "mine" && (
        <MyTracksSheet userId={userId} isPro={isPro} isDesktop={isDesktop} onClose={() => setOverlay(null)} />
      )}
    </div>
  );
}

/* ── My Tracks: swipe-down sheet on mobile, centered dialog on desktop
   (a bottom sheet is a phone gesture). Own component so useSheetDismiss
   binds on mount. ── */
function MyTracksSheet({
  userId,
  isPro,
  isDesktop = false,
  onClose,
}: {
  userId: string;
  isPro: boolean;
  isDesktop?: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { sheetRef, dismiss } = useSheetDismiss(onClose);
  const close = isDesktop ? onClose : dismiss;
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        style={{ animation: "sheetFadeIn .25s ease both" }}
        onClick={close}
      />
      <div
        ref={isDesktop ? undefined : sheetRef}
        className={
          isDesktop
            ? "fennec-dialog-in fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-white/10 bg-[#1a1a1e]"
            : "fixed inset-x-0 z-50 rounded-t-3xl bg-[#1a1a1e] border-t border-white/8 overflow-y-auto"
        }
        style={
          isDesktop
            ? { maxHeight: "85vh", boxShadow: "0 32px 80px rgba(0,0,0,.55)", paddingBottom: "1.5rem" }
            : {
                bottom: SHEET_BOTTOM,
                maxHeight: "calc(var(--app-h, 100dvh) - 4rem)",
                paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)",
                animation: SHEET_ENTER,
              }
        }
      >
        {/* drag handle — swipe affordance means nothing on desktop */}
        {!isDesktop && (
          <div className="flex justify-center pt-3">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>
        )}
        <div className={`flex items-center justify-between px-4 pb-4 ${isDesktop ? "pt-5" : "pt-2"}`}>
          <span className="text-sm font-bold text-white">{t("tpMyTracks")}</span>
          <button onClick={close} aria-label={t("amCerrar")} className="text-zinc-500 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className={isDesktop ? "px-6" : "px-4"}>
          <MyTracksView userId={userId} isPro={isPro} />
        </div>
      </div>
    </>
  );
}
