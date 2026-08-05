"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import TapeDust from "@/components/audio/TapeDust";
import { Play, Pause, SkipForward, Plus, Upload, ZoomIn, ZoomOut, Volume2, VolumeX, AudioLines } from "lucide-react";
import type { ProjectReview, ReviewComment } from "@/lib/audioTypes";
import { fetchReviewComments, createReviewComment, fetchKarma } from "@/lib/audioDb";

/* ═══════════════════════════════════════════════════════════════
   THE TAPE — desktop. A reel-to-reel machine, not a waveform (every
   app has a waveform): two spinning metal reels with the classic
   3-window plates, the tape pancake transferring from supply to
   take-up as the song plays, amber VU meters lit by the real audio
   signal, and the tape itself as a horizontal strip — timecode
   ticks + grease-pencil marks flowing past a fixed head, the same
   language as the mobile player rotated 90°. Reuses the real data
   layer and real playback.
   ═══════════════════════════════════════════════════════════════ */

const AMBER = "#f5a623";
const MARK_PX = 18;

/** Un grupo de notas que caen tan cerca en pantalla que se encimarian. */
type Cluster = { key: string; x: number; at: number; items: ReviewComment[] };
const AMBER_HOT = "#ffc861";

/** La cara de quien dejo la nota. Con foto si la tiene; si no, su inicial,
 *  que sigue diciendo QUIEN mejor que un punto anonimo. El que esta hablando
 *  crece y gana anillo: la escala comunica presente, el color comunica marca. */
function MarkFace({ c, hablando, style }: {
  c: { profile?: { username?: string; avatar_url?: string | null } | null };
  hablando: boolean;
  style: React.CSSProperties;
}) {
  const size = hablando ? 22 : MARK_PX;
  const base: React.CSSProperties = {
    ...style,
    height: size, width: size,
    borderRadius: 999,
    border: hablando ? `1.5px solid ${AMBER_HOT}` : "1.5px solid rgba(255,255,255,0.16)",
    boxShadow: hablando ? `0 0 0 3px ${AMBER}26` : "none",
    transition: "height 200ms var(--ease-out), width 200ms var(--ease-out), border-color 200ms var(--ease-out)",
    flexShrink: 0,
  };
  if (c.profile?.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={c.profile.avatar_url} alt="" className="object-cover" style={base} />;
  }
  return (
    <span
      className="grid place-items-center font-mono text-[9px] font-bold uppercase text-zinc-300"
      style={{ ...base, background: "#241d16" }}
    >
      {(c.profile?.username ?? "?").slice(0, 1)}
    </span>
  );
}
const DECK = "#131216";

/* Tape strip scale — dynamic (Paco 2026-07-30: "zoom dinámico en la
   soundwave"). 16 px/s is the resting scale; pinch / ⌘-scroll on the strip
   or the −/+ buttons move it. Zoom anchors at the fixed head, so the moment
   under the needle never shifts while zooming. */
const PX_PER_SEC = 16;
const ZOOM_MIN = 4;         // whole track at a glance
const ZOOM_MAX = 80;        // note-precision detail
/** Timecode tick spacing that keeps labels readable at any zoom (~≥70px apart). */
function tickInterval(pxPerSec: number): number {
  for (const s of [5, 10, 15, 30, 60, 120, 300]) if (s * pxPerSec >= 70) return s;
  return 600;
}
const R_FULL = 86;          // pancake radius, viewBox units (reel viewBox 0..200)
const R_EMPTY = 40;
const TAPE_SPEED = 110;     // linear tape speed in viewBox units/s → reel spin

const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

/* ── one reel: light metal plate (RTM-style 3 cutouts) over a dark
   tape pancake. The pancake radius + plate rotation are driven from
   the animation loop via refs — zero React re-renders. ── */
/* ── one reel, modern-vintage: no photoreal metal, no screws, no bezels.
   The reel is drawn in Fennec's own language — flat dark tape disc, a
   1.5px amber edge that IS the fill-level indicator, a hairline outer
   rim for structure, and a thin-spoke hub whose rotation carries the
   motion. All the machine's physics stay (spin ∝ 1/radius, pancake
   transfer); only the rendering stops pretending to be a photo. ── */
function Reel({ plateRef, pancakeRef, edgeRef, r0 }: {
  plateRef: React.Ref<SVGGElement>;
  pancakeRef: React.Ref<SVGCircleElement>;
  /** amber edge circle — tracks the pancake radius from the loop */
  edgeRef: React.Ref<SVGCircleElement>;
  /** initial pancake radius — supply reel starts full, take-up starts empty */
  r0: number;
}) {
  return (
    <svg viewBox="0 0 200 200" style={{ width: "min(28vh, 250px)", height: "auto", display: "block" }}>
      {/* structural rim — always there, whisper-quiet */}
      <circle cx="100" cy="100" r="95" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="1" />

      {/* wound tape: flat dark disc + amber edge as the level indicator */}
      <circle ref={pancakeRef} cx="100" cy="100" r={r0} fill="#1a1511" />
      <circle ref={edgeRef} cx="100" cy="100" r={r0} fill="none" stroke={AMBER} strokeWidth="1.5" opacity="0.85"
        /* no neon glow: the accent carries it (design pass 2026-07-31) */ />

      {/* rotating hub — three thin spokes + an amber index dot that makes
          the spin legible without any metal plate */}
      <g ref={plateRef}>
        <circle cx="100" cy="100" r="30" fill={DECK} stroke="rgba(255,255,255,.14)" strokeWidth="1" />
        <line x1="100" y1="100" x2="100" y2="73" stroke="rgba(255,255,255,.3)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="100" y1="100" x2="123.4" y2="113.5" stroke="rgba(255,255,255,.3)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="100" y1="100" x2="76.6" y2="113.5" stroke="rgba(255,255,255,.3)" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="100" cy="78" r="2.5" fill={AMBER} />
        <circle cx="100" cy="100" r="5" fill="#0e0c0d" stroke="rgba(255,255,255,.18)" strokeWidth="1" />
      </g>
    </svg>
  );
}

/* ── VU meter, minimal: a floating arc + amber needle. No lit box, no
   bezel — instrument reading, not instrument cosplay. ── */
function VuMeter({ needleRef, label }: { needleRef: React.Ref<HTMLDivElement>; label: string }) {
  return (
    <div className="relative" style={{ width: 108, height: 62 }}>
      {/* track arc + ticks — coords rounded: raw Math.cos floats aren't
          bit-identical across JS engines and caused SSR hydration noise */}
      <svg viewBox="0 0 108 62" className="absolute inset-0">
        {/* the arc the needle sweeps */}
        <path d="M 20.4 24.6 A 47 47 0 0 1 87.6 24.6" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="2" strokeLinecap="round" />
        {Array.from({ length: 9 }, (_, i) => {
          const deg = -46 + i * 11.5;
          const a = (deg - 90) * (Math.PI / 180);
          const r2 = (n: number) => Math.round(n * 100) / 100;
          const hot = i >= 7;
          return (
            <line key={i}
              x1={r2(54 + 44 * Math.cos(a))} y1={r2(58 + 44 * Math.sin(a))}
              x2={r2(54 + 49 * Math.cos(a))} y2={r2(58 + 49 * Math.sin(a))}
              stroke={hot ? "#e5484d" : "rgba(255,255,255,.22)"} strokeWidth={hot ? 1.8 : 1} />
          );
        })}
      </svg>
      {/* needle — amber, pivots at bottom center */}
      <div ref={needleRef} className="absolute" style={{ left: 53, bottom: 4, width: 1.5, height: 46, transformOrigin: "bottom center", background: AMBER, borderRadius: 1, transform: "rotate(-46deg)", boxShadow: `0 0 6px ${AMBER}66` }} />
      <div className="absolute rounded-full" style={{ left: 51.5, bottom: 2, width: 5, height: 5, background: "rgba(255,255,255,.25)" }} />
      <span className="absolute bottom-[-11px] left-0 right-0 text-center font-mono text-[7px] font-bold tracking-[0.22em] text-zinc-600">{label}</span>
    </div>
  );
}

export default function TapeDeckDesktop({
  track, userId, onPass, onOpenMyTracks, onOpenIntro,
}: {
  track: ProjectReview;
  userId: string;
  onPass: () => void;
  onOpenMyTracks: () => void;
  onOpenIntro: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);

  /* ── Volumen ──
     Faltaba por completo: no habia forma de bajarle a un track sin tocar el
     volumen de todo el sistema, y estas escuchando material ajeno para
     opinarlo (Paco 2026-08-03).

     Se guarda en localStorage porque es una preferencia del oyente, no del
     track: si le bajaste, es porque asi quieres escuchar Fennec, y volver a
     ajustarlo en cada cinta seria trabajo repetido.

     `mudo` guarda el nivel anterior en vez de ponerlo en cero, para que el
     icono devuelva EXACTAMENTE donde estabas. */
  const [vol, setVol] = useState(0.85);
  const [mudo, setMudo] = useState(false);
  const volPrevio = useRef(0.85);

  useEffect(() => {
    try {
      const g = localStorage.getItem("fennec_tape_volume_v1");
      if (g !== null) { const n = Number(g); if (Number.isFinite(n)) { setVol(n); volPrevio.current = n || 0.85; } }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = mudo ? 0 : vol;
    try { localStorage.setItem("fennec_tape_volume_v1", String(vol)); } catch { /* ignore */ }
  }, [vol, mudo]);

  // Web Audio graph (built lazily on first play) — feeds the VU meters.
  const audioCtxRef  = useRef<AudioContext | null>(null);
  const analyserRef  = useRef<AnalyserNode | null>(null);
  const sourceRef    = useRef<MediaElementAudioSourceNode | null>(null);
  const freqRef      = useRef<Uint8Array<ArrayBuffer> | null>(null);

  // Machine parts driven per-frame via refs (no re-render):
  const stripVpRef      = useRef<HTMLDivElement>(null);  // strip viewport (fixed head at its center)
  const stripRef        = useRef<HTMLDivElement>(null);  // moving tape
  const leftPlateRef    = useRef<SVGGElement>(null);
  const rightPlateRef   = useRef<SVGGElement>(null);
  const leftPancakeRef  = useRef<SVGCircleElement>(null);
  const rightPancakeRef = useRef<SVGCircleElement>(null);
  const leftEdgeRef     = useRef<SVGCircleElement>(null);
  const rightEdgeRef    = useRef<SVGCircleElement>(null);
  const vuLRef          = useRef<HTMLDivElement>(null);
  const vuRRef          = useRef<HTMLDivElement>(null);
  const angleL = useRef(0);
  const angleR = useRef(0);
  const vuLevel = useRef(0);

  const [playing, setPlaying]   = useState(false);
  const [t, setT]               = useState(0);
  // Zoom lives in state (ticks/marks re-render) AND a ref (the rAF loop and
  // event handlers read it without re-subscribing).
  const [pxPerSec, setPxPerSec] = useState(PX_PER_SEC);
  const pxPerSecRef = useRef(PX_PER_SEC);
  function applyZoom(next: number) {
    const z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
    pxPerSecRef.current = z;
    setPxPerSec(z);
  }
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [karma, setKarma]       = useState<number | null>(null);
  const [marking, setMarking]   = useState(false);
  const [markAt, setMarkAt]     = useState(0);
  const [body, setBody]         = useState("");
  const [posting, setPosting]   = useState(false);

  const duration = track.duration_seconds || audioRef.current?.duration || 1;

  // load comments + karma per track
  useEffect(() => {
    setComments([]); setT(0); setPlaying(false); setMarking(false);
    angleL.current = 0; angleR.current = 0;
    fetchReviewComments(track.id).then(setComments).catch(() => {});
    fetchKarma(userId).then(setKarma).catch(() => {});
  }, [track.id, userId]);

  // coarse clock (paused / seek accuracy) + end-of-tape
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setT(a.currentTime);
    const onEnd  = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    return () => { a.removeEventListener("timeupdate", onTime); a.removeEventListener("ended", onEnd); };
  }, [track.id]);

  // ── THE MACHINE LOOP ──────────────────────────────────────────
  // One rAF drives everything mechanical: the tape strip position,
  // both reels (speed ∝ 1/radius — a full reel turns slow, an empty
  // one fast, like the real machine), the pancake transfer, and the
  // VU needles from the analyser's energy. All via refs.
  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const a = audioRef.current;
      const cur = a ? a.currentTime : 0;
      const isPlaying = !!a && !a.paused;
      if (isPlaying) setT(cur);

      // tape strip — time cur sits exactly under the head (viewport center)
      const vp = stripVpRef.current, strip = stripRef.current;
      if (vp && strip) {
        strip.style.transform = `translateX(${vp.clientWidth / 2 - cur * pxPerSecRef.current}px)`;
      }

      // pancake transfer — the amber edge rides the pancake's radius
      const prog = duration > 0 ? Math.min(cur / duration, 1) : 0;
      const rL = R_EMPTY + (R_FULL - R_EMPTY) * (1 - prog);
      const rR = R_EMPTY + (R_FULL - R_EMPTY) * prog;
      leftPancakeRef.current?.setAttribute("r", rL.toFixed(1));
      rightPancakeRef.current?.setAttribute("r", rR.toFixed(1));
      leftEdgeRef.current?.setAttribute("r", rL.toFixed(1));
      rightEdgeRef.current?.setAttribute("r", rR.toFixed(1));

      // reel spin — angular speed = tape speed / current radius
      if (isPlaying && !reduce) {
        angleL.current = (angleL.current + (TAPE_SPEED / rL) * dt * (180 / Math.PI)) % 360;
        angleR.current = (angleR.current + (TAPE_SPEED / rR) * dt * (180 / Math.PI)) % 360;
        leftPlateRef.current?.setAttribute("transform", `rotate(${angleL.current.toFixed(2)} 100 100)`);
        rightPlateRef.current?.setAttribute("transform", `rotate(${angleR.current.toFixed(2)} 100 100)`);
      }

      // VU needles — real spectrum energy; fast attack, slow release
      let level = 0;
      const an = analyserRef.current, bins = freqRef.current;
      if (isPlaying && an && bins) {
        an.getByteFrequencyData(bins);
        let s = 0; const n = Math.min(bins.length, 96);
        for (let k = 0; k < n; k++) s += bins[k];
        level = s / (n * 255);
        // headless / CORS-blocked source gives silence — sway gently instead
        if (level < 0.02) level = 0.3 + 0.16 * Math.sin(cur * 2.3);
      }
      vuLevel.current += (level - vuLevel.current) * (level > vuLevel.current ? 0.4 : 0.07);
      if (!reduce || !isPlaying) {
        const deg = -46 + vuLevel.current * 92;
        if (vuLRef.current) vuLRef.current.style.transform = `rotate(${deg.toFixed(1)}deg)`;
        if (vuRRef.current) vuRRef.current.style.transform = `rotate(${(deg * 0.93).toFixed(1)}deg)`;
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration, track.id]);

  // Build the analyser once, on first play (user gesture). Failures are
  // silent — VUs just rest, playback never breaks.
  function ensureAudioGraph() {
    const a = audioRef.current;
    if (!a || audioCtxRef.current) return;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const source = ctx.createMediaElementSource(a);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current   = source;
      freqRef.current     = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
    } catch { /* VUs stay at rest */ }
  }

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      ensureAudioGraph();
      void audioCtxRef.current?.resume();
      void a.play(); setPlaying(true);
    } else {
      a.pause(); setPlaying(false);
    }
  }

  // SPACE = play/pause (unless typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.code === "Space" && tag !== "INPUT" && tag !== "TEXTAREA") { e.preventDefault(); toggle(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.id]);

  // Pinch / ⌘-scroll over the tape = dynamic zoom. Trackpad pinch arrives as
  // wheel+ctrlKey; non-passive so preventDefault stops the browser page-zoom.
  // The head anchor is free: the rAF loop repositions the strip from
  // cur * pxPerSecRef every frame, so the time under the needle stays put.
  useEffect(() => {
    const vp = stripVpRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      applyZoom(pxPerSecRef.current * Math.exp(-e.deltaY * 0.0025));
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, []);

  /** Click the tape to scrub: x-offset from the head = time offset. */
  function seekFromClient(clientX: number) {
    const vp = stripVpRef.current;
    const a = audioRef.current;
    if (!vp || !a) return;
    const r = vp.getBoundingClientRect();
    const offset = (clientX - (r.left + r.width / 2)) / pxPerSecRef.current;
    const time = Math.min(duration, Math.max(0, t + offset));
    a.currentTime = time;
    setT(time);
  }

  async function submitMark() {
    if (!body.trim()) return;
    setPosting(true);
    try {
      const c = await createReviewComment({ trackId: track.id, userId, body: body.trim(), timestampSeconds: Math.round(markAt) });
      setComments((prev) => [...prev, c].sort((a, b) => (a.timestamp_seconds ?? 0) - (b.timestamp_seconds ?? 0)));
      try { localStorage.setItem("fennec_has_left_note_v1", "1"); } catch { /* ignore */ }
      setBody(""); setMarking(false);
    } catch { /* keep composer open on failure */ }
    setPosting(false);
  }

  const [openCluster, setOpenCluster] = useState<string | null>(null);

  function seekTo(sec: number) {
    const a = audioRef.current;
    if (a) { a.currentTime = sec; setT(sec); }
  }

  /* AGRUPADO POR PIXELES, no por segundos.
     Dos notas a 0:15 y 0:16 se solapan con zoom alto y no con zoom bajo, asi
     que el criterio tiene que ser la distancia en pantalla, que es lo que de
     verdad determina si se encima una cara con otra. Al cambiar el zoom los
     grupos se rehacen solos. */
  const clusters = useMemo(() => {
    const conTiempo = comments
      .filter((c) => c.timestamp_seconds != null)
      .sort((a, b) => (a.timestamp_seconds ?? 0) - (b.timestamp_seconds ?? 0));
    const out: Cluster[] = [];
    for (const c of conTiempo) {
      const x = (c.timestamp_seconds ?? 0) * pxPerSec;
      const ultimo = out[out.length - 1];
      if (ultimo && x - ultimo.x < MARK_PX + 6) ultimo.items.push(c);
      else out.push({ key: c.id, x, at: c.timestamp_seconds ?? 0, items: [c] });
    }
    return out;
  }, [comments, pxPerSec]);

  // Cerrar el popover al soltar el zoom o cambiar de pista evita que quede
  // colgado en una posicion que ya no corresponde a su marca.
  useEffect(() => { setOpenCluster(null); }, [pxPerSec, track.id]);

  // the note "speaking" right now — nearest mark within 3s of the head
  const speaking = comments
    .filter((c) => c.timestamp_seconds != null && Math.abs((c.timestamp_seconds ?? 0) - t) < 3)
    .sort((a, b) => Math.abs((a.timestamp_seconds ?? 0) - t) - Math.abs((b.timestamp_seconds ?? 0) - t))[0];

  const tickStep = tickInterval(pxPerSec);
  const ticks = Array.from({ length: Math.max(0, Math.floor(duration / tickStep)) }, (_, i) => (i + 1) * tickStep);
  const stripWidth = duration * pxPerSec;

  return (
    /* h-full, NO h-screen. Pedir una pantalla completa DENTRO de una columna
       que ya gasto ~60px en la fila de la campana y el avatar da pantalla+60:
       el sobrante se sale por abajo y se come la fila de mandos (Paco
       2026-08-04, dos intentos). Con h-full el deck toma exactamente el alto
       que le da su contenedor, que es flex-1 y ya descuenta esa fila. */
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden" style={{ background: DECK }}>
      {/* El aire del cuarto. Va PRIMERO y sin z-index propio: todo lo demas se
          pinta despues y queda encima solo por orden del DOM, sin tener que
          subirle la capa a media interfaz. */}
      <TapeDust />

      {/* crossOrigin lets the AnalyserNode read the samples */}
      <audio ref={audioRef} src={track.audio_url} preload="metadata" crossOrigin="anonymous" />

      {/* ── header ──
          TRES COLUMNAS, con la identidad de la pista al centro (Paco
          2026-08-03). Era una fila con todo empujado a la izquierda tras un
          margen de 168px que libraba la pastilla de salida, asi que el titulo
          quedaba descolgado del centro del carrete y se leia como algo pegado
          encima en vez de la cabecera de la maquina.

          Las columnas laterales miden 1fr cada una: eso centra el bloque de en
          medio respecto a la PANTALLA, no respecto al espacio que sobra, que es
          la unica forma de que coincida con el eje de los carretes y de la
          cinta. El pl-[168px] vive ahora solo en la columna izquierda, que es
          la unica que necesitaba librar la pastilla. */}
      {/* pr-[124px]: la campana y el avatar del shell flotan sobre esta esquina
          ahora que La Cinta ocupa la ventana completa. Sin ese hueco, el karma
          se metia debajo de ellos (medido 2026-08-04). */}
      <div className="grid items-start py-6 pl-8 pr-[124px]" style={{ gridTemplateColumns: "1fr auto 1fr" }}>
        <div className="flex items-center gap-3">
          <button onClick={onOpenIntro} className="rounded-md border px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.18em] transition hover:brightness-125" style={{ borderColor: `${AMBER}4d`, color: AMBER }}>
            How it works
          </button>
        </div>

        <div className="flex items-center gap-3.5">
          {track.artwork_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={track.artwork_url} alt="" className="h-12 w-12 rounded-[10px] object-cover" />
          ) : (
            <div className="h-12 w-12 rounded-[10px] border border-white/10" style={{ background: "linear-gradient(140deg,#2a2030,#191319)" }} />
          )}
          {/* De quien es y en que estado esta.
              El titulo iba a 16.5px, o sea al mismo peso que la barra de
              herramientas, y el estado de la produccion (demo, master, idea)
              vivia escondido a 9px bajo los VU, donde nadie lo lee. Es lo
              PRIMERO que necesitas saber antes de opinar sobre una pista: no se
              le da la misma nota a una idea cruda que a un master
              (Paco 2026-08-03). */}
          <div className="min-w-0">
            <div className="flex items-center justify-center gap-2.5">
              <h1 className="truncate text-[26px] font-bold leading-none tracking-[-0.02em] text-white">{track.title}</h1>
              {track.category && (
                <span
                  className="flex-shrink-0 rounded-md border px-2 py-[3px] font-mono text-[9px] font-bold uppercase tracking-[0.18em]"
                  style={{ borderColor: `${AMBER}40`, color: AMBER }}
                >
                  {track.category}
                </span>
              )}
            </div>
            {/* El @ lleva a su perfil de comunidad: si te gusto lo que oiste,
                el siguiente paso natural es ver de quien es. */}
            <a
              href={track.profile?.username ? `/u/${track.profile.username}` : undefined}
              className="mt-1 inline-flex items-center gap-1.5 font-mono text-[11px] text-zinc-500 transition hover:text-accent"
            >
              @{track.profile?.username ?? "producer"}
              <span className="text-zinc-700">·</span>
              {fmt(duration)}
              <span className="text-zinc-700">·</span>
              <span className="underline decoration-dotted underline-offset-2">view profile</span>
            </a>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <div className="rounded-full border border-white/10 px-3.5 py-1.5 font-mono text-[12px] text-zinc-400">{fmt(t)} / {fmt(duration)}</div>
          <div className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-bold" style={{ borderColor: `${AMBER}4d`, color: AMBER }}>◈ {karma ?? "—"} karma</div>
        </div>
      </div>

      {/* ── THE MACHINE ─────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 flex-col justify-center">

        {/* reels + VU bridge */}
        <div className="flex items-center justify-center gap-[7vw] px-8">
          <Reel plateRef={leftPlateRef} pancakeRef={leftPancakeRef} edgeRef={leftEdgeRef} r0={R_FULL} />

          {/* center bridge: VU pair, like the lit meters on the deck */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <VuMeter needleRef={vuLRef} label="VU · L" />
              <VuMeter needleRef={vuRRef} label="VU · R" />
            </div>
          </div>

          <Reel plateRef={rightPlateRef} pancakeRef={rightPancakeRef} edgeRef={rightEdgeRef} r0={R_EMPTY} />
        </div>

        {/* ── the tape path — strip runs past a fixed head ── */}
        <div
          ref={stripVpRef}
          onClick={(e) => { if (!marking) seekFromClient(e.clientX); }}
          className="relative mt-7 h-[92px] cursor-pointer"
          /* Recorta SOLO a los lados, no por arriba y abajo.
             Antes era overflow-hidden, que recorta en los dos ejes: la cinta
             mide 40px y va centrada en 92, o sea que arriba de ella solo habia
             26px de caja. Una cara de 18px con su tallo de 16 pide 34, y la que
             esta hablando (22+24) pide 46 — asi que a las fotos les cortaba la
             tapa y a la marca activa casi entera (Paco 2026-08-03). El popover
             de la baraja, que se despliega hacia arriba, desaparecia completo.
             clip-path con inset negativo arriba/abajo mantiene el recorte
             lateral (que es el que hace falta: la cinta corre y el cabezal esta
             fijo) y deja el eje vertical libre. overflow-y:visible no sirve
             aqui: junto a un overflow-x:hidden el navegador lo convierte en
             auto y aparece scroll. */
          style={{ clipPath: "inset(-240px 0px)" }}
        >
          {/* the moving tape — flat body, hairline edges, no heavy banding */}
          <div ref={stripRef} className="absolute top-1/2 h-[40px] -translate-y-1/2 will-change-transform" style={{ width: stripWidth }}>
            <div className="absolute inset-0" style={{ background: "#1a1410", borderTop: "1px solid rgba(255,255,255,.06)", borderBottom: "1px solid rgba(255,255,255,.06)" }} />
            {/* leader before 0 and after the end — fine diagonal hatch */}
            <div className="absolute top-0 bottom-0" style={{ left: -220, width: 220, background: "repeating-linear-gradient(45deg, rgba(255,255,255,.07) 0 1.5px, transparent 1.5px 9px)" }} />
            <div className="absolute top-0 bottom-0" style={{ left: stripWidth, width: 220, background: "repeating-linear-gradient(45deg, rgba(255,255,255,.07) 0 1.5px, transparent 1.5px 9px)" }} />

            {/* timecode ticks every 15s — same ruler as the mobile tape */}
            {ticks.map((tk) => (
              <div key={tk} className="absolute top-0 bottom-0 pointer-events-none" style={{ left: tk * pxPerSec }}>
                <div className="absolute bottom-0 h-[9px] w-px" style={{ background: "rgba(255,255,255,.25)" }} />
                <span className="absolute bottom-[12px] left-1 font-mono text-[8.5px]" style={{ color: "rgba(255,255,255,.28)" }}>{fmt(tk)}</span>
              </div>
            ))}

            {/* ── MARCAS ──
                Antes eran puntos ambar de 5px: todas identicas, sin decir quien
                habla, y dos en el mismo segundo se dibujaban EXACTAMENTE encima
                una de otra, o sea que la de abajo era inalcanzable
                (Paco 2026-08-03).

                Ahora cada marca lleva la foto de quien dejo la nota (el dato ya
                venia en el comentario, lib/audioDb.ts:8, y se estaba tirando), y
                las que caen cerca se agrupan en una baraja que se despliega al
                hacer clic. */}
            {clusters.map((cl) => {
              const abierto = openCluster === cl.key;
              const hablando = cl.items.some((c) => c.id === speaking?.id);
              return (
                <div
                  key={cl.key}
                  /* Las caras van ARRIBA de la cinta y el tallo baja hasta
                     ella. Estaban centradas SOBRE la cinta (top-1/2 con
                     -translate-y-1/2), asi que tapaban los timecodes y no se
                     entendia a que segundo apuntaba cada una
                     (Paco 2026-08-03). Ancladas por abajo, la punta del tallo
                     marca el segundo exacto y nada se encima. */
                  className="absolute -translate-x-1/2"
                  style={{ left: cl.x, bottom: "calc(50% + 20px)", zIndex: abierto ? 30 : hablando ? 20 : 10 }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (cl.items.length === 1) { seekTo(cl.at); setOpenCluster(null); }
                      else setOpenCluster(abierto ? null : cl.key);
                    }}
                    title={cl.items.length === 1
                      ? `@${cl.items[0].profile?.username ?? ""} · ${fmt(cl.at)}`
                      : `${cl.items.length} notes · ${fmt(cl.at)}`}
                    className="flex flex-col items-center outline-none"
                  >
                    {/* baraja: hasta tres caras solapadas, el resto como +N */}
                    <span className="flex items-center">
                      {cl.items.slice(0, 3).map((c, i) => (
                        <MarkFace
                          key={c.id}
                          c={c}
                          hablando={c.id === speaking?.id}
                          style={{ marginLeft: i === 0 ? 0 : -9, zIndex: 3 - i }}
                        />
                      ))}
                      {cl.items.length > 3 && (
                        <span
                          className="grid place-items-center rounded-full font-mono text-[8px] font-bold"
                          style={{
                            marginLeft: -9, height: 18, minWidth: 18, padding: "0 3px",
                            background: "#14110d", color: AMBER,
                            border: `1px solid ${AMBER}59`,
                          }}
                        >
                          +{cl.items.length - 3}
                        </span>
                      )}
                    </span>
                    {/* el tallo baja hasta la cinta: ancla la cara a su segundo */}
                    <span style={{
                      width: 1.5,
                      height: hablando ? 24 : 16,
                      background: hablando ? AMBER_HOT : `${AMBER}b3`,
                      transition: "height 200ms var(--ease-out)",
                    }} />
                  </button>

                  {/* Se despliega DESDE la marca, no desde el centro: un popover
                      que crece desde otro sitio se lee como si viniera de otro
                      lado. */}
                  {abierto && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-1/2 bottom-[calc(100%+6px)] w-[212px] -translate-x-1/2 overflow-hidden rounded-xl"
                      style={{
                        transformOrigin: "bottom center",
                        background: "rgba(16,14,11,0.96)",
                        border: "1px solid rgba(255,255,255,0.09)",
                        boxShadow: "0 18px 40px -18px rgba(0,0,0,0.9)",
                        animation: "tapePop 160ms cubic-bezier(.23,1,.32,1) both",
                      }}
                    >
                      {cl.items.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => { seekTo(c.timestamp_seconds ?? 0); setOpenCluster(null); }}
                          className="flex w-full items-center gap-2 px-2.5 py-2 text-left transition hover:bg-white/[0.05]"
                        >
                          <MarkFace c={c} hablando={false} style={{}} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-mono text-[10px] text-zinc-300">
                              @{c.profile?.username ?? "someone"}
                            </span>
                            <span className="block truncate text-[10.5px] leading-snug text-zinc-500">
                              {c.body}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* fixed head at center — a notch and a line, nothing pretending
              to be hardware */}
          <div className="pointer-events-none absolute left-1/2 top-0 bottom-0 -translate-x-1/2">
            <svg width="12" height="7" viewBox="0 0 12 7" className="absolute left-1/2 top-[10px] -translate-x-1/2">
              <path d="M0 0 H12 L6 7 Z" fill={AMBER} />
            </svg>
            <div className="absolute left-1/2 top-[18px] bottom-[12px] w-[1.5px] -translate-x-1/2" style={{ background: AMBER, boxShadow: `0 0 10px ${AMBER}99` }} />
            <span className="absolute left-1/2 bottom-[-2px] -translate-x-1/2 font-mono text-[10px] font-bold tabular-nums" style={{ color: AMBER }}>{fmt(t)}</span>
          </div>

          {/* soft edge fades so the strip reads endless */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-28" style={{ background: `linear-gradient(90deg, ${DECK}, transparent)` }} />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-28" style={{ background: `linear-gradient(270deg, ${DECK}, transparent)` }} />
        </div>
      </div>

      {/* the note speaking now — grease-pencil serif */}
      <div className="h-16 px-8">
        {speaking ? (
          <div className="mx-auto max-w-2xl text-center">
            {/* Quien la dejo, con su cara. Antes solo iba el @ en ambar: para
                saber quien era tenias que acordarte del usuario. */}
            <a
              href={speaking.profile?.username ? `/u/${speaking.profile.username}` : undefined}
              className="mx-auto flex w-fit items-center gap-2 transition hover:brightness-125"
            >
              <MarkFace c={speaking} hablando={false} style={{}} />
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: AMBER }}>
                @{speaking.profile?.username ?? "producer"} · {fmt(speaking.timestamp_seconds ?? 0)}
              </span>
            </a>
            <p className="mt-1 text-[16px] leading-snug text-zinc-200" style={{ fontFamily: "var(--font-tape-serif, Georgia, serif)" }}>{speaking.body}</p>
          </div>
        ) : (
          <p className="text-center font-mono text-[11px] text-zinc-700">{comments.length} mark{comments.length !== 1 ? "s" : ""} on this tape · click the tape to scrub, hit ＋ to leave a note</p>
        )}
      </div>

      {/* note composer */}
      {marking && (
        <div className="mx-8 mb-3 flex items-center gap-3 rounded-2xl border p-3" style={{ borderColor: `${AMBER}40`, background: "rgba(245,166,35,.05)" }}>
          <span className="font-mono text-[11px]" style={{ color: AMBER }}>@ {fmt(markAt)}</span>
          <input
            autoFocus value={body} onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || !e.shiftKey)) { e.preventDefault(); void submitMark(); } if (e.key === "Escape") setMarking(false); }}
            placeholder="Leave a precise note at this moment…"
            className="flex-1 bg-transparent text-[14px] text-white placeholder:text-zinc-600 outline-none"
          />
          <button onClick={() => setMarking(false)} className="text-[12px] text-zinc-500 hover:text-white">Cancel</button>
          <button onClick={submitMark} disabled={posting || !body.trim()} className="rounded-xl px-4 py-2 text-[12px] font-bold text-black transition disabled:opacity-40" style={{ background: `linear-gradient(180deg,${AMBER_HOT},${AMBER})` }}>
            {posting ? "…" : "Send note"}
          </button>
        </div>
      )}

      {/* transport */}
      {/* ── Fila de mandos ──
          TRES COLUMNAS, con el transporte al centro (Paco 2026-08-03). Era una
          fila que arrancaba pegada a la izquierda y empujaba "My tracks" al
          extremo derecho con ml-auto, asi que el play —la accion principal del
          modulo— no coincidia con el eje de los carretes ni con el cabezal de
          la cinta, que estan al centro.

          Las columnas laterales miden 1fr: eso centra el grupo respecto a la
          PANTALLA y no respecto al hueco que sobra, que es la unica forma de
          que el play quede en la misma vertical que el cabezal. La ayuda de
          teclado se va a la izquierda y "My tracks" a la derecha, cada una en
          su columna, sin margenes automaticos peleando entre si. */}
      <div className="grid items-center gap-4 border-t border-white/10 px-8 py-4" style={{ gridTemplateColumns: "1fr auto 1fr" }}>
        <span className="min-w-0 truncate font-mono text-[10.5px] tracking-[0.06em] text-zinc-700">SPACE play · CLICK scrub · ⌘scroll / pinch zoom · ＋ note</span>

        <div className="flex items-center justify-center gap-3">
        {/* "Pass" vivia aqui y "Next" mas adelante, los dos llamando a onPass: el
            mismo boton dos veces, a lados opuestos del play. Se queda uno solo. */}
        {/* EL PLAY.
            Era el unico circulo solido con halo en una fila de pastillas con
            borde: distinto en forma, en relleno y en elevacion a la vez, por eso
            se sentia pegado encima (Paco 2026-08-03).
            Ahora comparte la geometria de la fila —misma altura, misma pastilla—
            y su jerarquia la da el RELLENO, que es lo unico que necesita para
            leerse como la accion principal. Fuera el halo: el propio sistema de
            diseño de Fennec prohibe los glows, y esta era la unica pieza de la
            app que lo hacia. Queda una sombra tintada, que es lo que da cuerpo
            sin gritar. */}
          <button
            onClick={toggle}
            aria-label={playing ? "Pause" : "Play"}
            className="flex items-center gap-2 rounded-full px-6 text-[13px] font-bold text-black transition hover:brightness-105 active:scale-[0.97]"
            style={{
              height: 44,
              background: `linear-gradient(180deg,${AMBER_HOT},${AMBER})`,
              boxShadow: "0 6px 18px -8px rgba(0,0,0,0.8)",
            }}
          >
            {playing ? <Pause className="h-[18px] w-[18px]" /> : <Play className="h-[18px] w-[18px] translate-x-[1px]" />}
            {playing ? "Pause" : "Play"}
        </button>
        <button onClick={() => { setMarkAt(t); setMarking(true); }} className="flex items-center gap-2 rounded-full border px-4 py-2.5 text-[13px] font-semibold transition hover:brightness-110" style={{ borderColor: `${AMBER}40`, color: AMBER }}>
          <Plus className="h-4 w-4" /> Leave a note
        </button>
        <button onClick={onPass} className="flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2.5 text-[13px] text-zinc-400 transition hover:text-white">
          Next <SkipForward className="h-4 w-4" />
        </button>
        {/* ── Fader ──
            Horizontal y con el icono como interruptor de mudo, que es el gesto
            que ya trae aprendido cualquiera de un reproductor. Va junto al
            zoom y no con el play: los dos son ajustes de COMO escuchas, no
            comandos de transporte. */}
        <div className="ml-2 flex items-center gap-2 rounded-full border border-white/10 px-2.5 py-1">
          <button
            onClick={() => { if (mudo) { setMudo(false); } else { volPrevio.current = vol; setMudo(true); } }}
            aria-label={mudo ? "Unmute" : "Mute"}
            title={mudo ? "Unmute" : "Mute"}
            className="grid h-6 w-6 place-items-center rounded-full text-zinc-500 transition hover:text-white"
          >
            {mudo || vol === 0 ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
          <input
            type="range"
            min={0} max={1} step={0.01}
            value={mudo ? 0 : vol}
            onChange={(e) => { const n = Number(e.target.value); setVol(n); if (n > 0) setMudo(false); }}
            aria-label="Volume"
            className="tape-fader"
            style={{ ["--fill" as string]: `${(mudo ? 0 : vol) * 100}%` }}
          />
        </div>

        {/* zoom cluster — % resets to the resting scale */}
        <div className="ml-2 flex items-center gap-0.5 rounded-full border border-white/10 px-1.5 py-1">
          <button onClick={() => applyZoom(pxPerSecRef.current / 1.35)} aria-label="Zoom out"
            className="grid h-6 w-6 place-items-center rounded-full text-zinc-500 transition hover:text-white">
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => applyZoom(PX_PER_SEC)} title="Reset zoom"
            className="min-w-[42px] text-center font-mono text-[10px] font-bold tabular-nums text-zinc-400 transition hover:text-white">
            {Math.round((pxPerSec / PX_PER_SEC) * 100)}%
          </button>
          <button onClick={() => applyZoom(pxPerSecRef.current * 1.35)} aria-label="Zoom in"
            className="grid h-6 w-6 place-items-center rounded-full text-zinc-500 transition hover:text-white">
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
        </div>

        {/* DOS botones, no uno.
            Este boton decia "Upload Tracks" pero abria MyTracksView, que es tu
            sala de lectura: tus canciones, las notas que te dejaron y el sello
            de karma. Nadie va a picarle a "subir" buscando su feedback, asi que
            Paco concluyo —con razon— que no habia forma de ver sus canciones
            cuando llevaba meses construida (2026-08-03).

            Ahora la etiqueta dice lo que hace. "Upload" queda como accion
            secundaria y lleva al mismo sitio, que es donde se sube: lo que
            cambia es que ya no es el UNICO nombre de esa puerta.

            Pastilla con borde y no solida: habia DOS elementos ambar solidos
            peleando por ser la accion principal, y en un modulo que se llama La
            Cinta esa es el play. */}
        <div className="flex items-center justify-end gap-2">
          <button onClick={onOpenMyTracks}
            title="Upload a track"
            aria-label="Upload a track"
            className="grid h-[42px] w-[42px] flex-shrink-0 place-items-center rounded-full border text-zinc-400 transition hover:text-white"
            style={{ borderColor: "rgba(255,255,255,.12)" }}>
            <Upload className="h-4 w-4" />
          </button>
          <button onClick={onOpenMyTracks}
            className="flex items-center gap-2 rounded-full border px-4 py-2.5 text-[13px] font-semibold transition hover:brightness-110"
            style={{ borderColor: `${AMBER}40`, color: AMBER }}>
            <AudioLines className="h-4 w-4" /> My tracks &amp; notes
          </button>
        </div>
      </div>
    </div>
  );
}
