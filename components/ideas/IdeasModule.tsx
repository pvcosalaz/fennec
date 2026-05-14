"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft, Play, Pause, Trash2, Music,
  Square, Library, Share2, Lock, Search, X,
} from "lucide-react";
import { openDB } from "idb";

// ─── Types ────────────────────────────────────────────────────────────────────

type MoodTag       = "dark" | "uplifting" | "chill" | "melancholic" | "aggressive" | "epic" | "romantic" | "groovy";
type BpmRange      = "slow" | "mid" | "fast";
type InstrumentTag = "piano" | "guitar" | "strings" | "synth" | "bass" | "drums" | "brass" | "flute";
type IdeaStatus    = "raw" | "in_progress" | "used";

type Melody = {
  id:          string;
  title:       string;
  duration:    number;
  createdAt:   number;
  blob:        Blob;
  moods:       MoodTag[];
  bpm:         BpmRange | null;
  instruments: InstrumentTag[];
  notes:       string;
  status:      IdeaStatus;
};

type View = "record" | "bank" | "detail";

// ─── Constants ────────────────────────────────────────────────────────────────

const MOOD_OPTIONS: { id: MoodTag; label: string; color: string }[] = [
  { id: "dark",        label: "Dark",        color: "#4d96ff" },
  { id: "uplifting",   label: "Uplifting",   color: "#ffd93d" },
  { id: "chill",       label: "Chill",       color: "#6bcb77" },
  { id: "melancholic", label: "Melancholic", color: "#c77dff" },
  { id: "aggressive",  label: "Aggressive",  color: "#ff6b6b" },
  { id: "epic",        label: "Epic",        color: "#ff9f43" },
  { id: "romantic",    label: "Romantic",    color: "#ff9ff3" },
  { id: "groovy",      label: "Groovy",      color: "#48dbfb" },
];

const BPM_OPTIONS: { id: BpmRange; label: string; sub: string }[] = [
  { id: "slow", label: "Slow",  sub: "< 90"    },
  { id: "mid",  label: "Mid",   sub: "90–130"  },
  { id: "fast", label: "Fast",  sub: "130+"    },
];

const INSTRUMENT_OPTIONS: { id: InstrumentTag; label: string; emoji: string }[] = [
  { id: "piano",   label: "Piano",   emoji: "🎹" },
  { id: "guitar",  label: "Guitar",  emoji: "🎸" },
  { id: "strings", label: "Strings", emoji: "🎻" },
  { id: "synth",   label: "Synth",   emoji: "🎛️" },
  { id: "bass",    label: "Bass",    emoji: "🎵" },
  { id: "drums",   label: "Drums",   emoji: "🥁" },
  { id: "brass",   label: "Brass",   emoji: "🎺" },
  { id: "flute",   label: "Flute",   emoji: "🪈" },
];

const STATUS_OPTIONS: { id: IdeaStatus; label: string; color: string }[] = [
  { id: "raw",         label: "Raw idea",    color: "bg-zinc-700/60 text-zinc-300"      },
  { id: "in_progress", label: "In progress", color: "bg-amber-400/20 text-amber-400"    },
  { id: "used",        label: "Used",        color: "bg-emerald-400/20 text-emerald-400" },
];

const MOOD_COLOR: Record<MoodTag, string> = Object.fromEntries(
  MOOD_OPTIONS.map((m) => [m.id, m.color])
) as Record<MoodTag, string>;

// ─── IndexedDB ────────────────────────────────────────────────────────────────

const DB_NAME = "fennec-melody-bank";
const STORE   = "melodies";

async function getDB() {
  return openDB(DB_NAME, 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) db.createObjectStore(STORE, { keyPath: "id" });
    },
  });
}

function withDefaults(m: Melody): Melody {
  return {
    ...m,
    moods:       m.moods       ?? [],
    bpm:         m.bpm         ?? null,
    instruments: m.instruments ?? [],
    notes:       m.notes       ?? "",
    status:      m.status      ?? "raw",
  };
}

async function saveMelody(m: Melody)       { const db = await getDB(); await db.put(STORE, m); }
async function loadMelodies(): Promise<Melody[]> {
  const db  = await getDB();
  const all = await db.getAll(STORE);
  return (all as Melody[]).map(withDefaults).sort((a, b) => b.createdAt - a.createdAt);
}
async function deleteMelody(id: string)    { const db = await getDB(); await db.delete(STORE, id); }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDur(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

const NUM_BARS = 28;

// ─── Mini audio player ────────────────────────────────────────────────────────

function MiniPlayer({ src, knownDuration }: { src: string; knownDuration?: number }) {
  const [playing,      setPlaying]      = useState(false);
  const [current,      setCurrent]      = useState(0);
  const [metaDuration, setMetaDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Use recorded timer as source of truth — WebM blobs often have wrong metadata duration
  const duration = (knownDuration && knownDuration > 0) ? knownDuration : metaDuration;

  function toggle() {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else         { void audioRef.current.play(); setPlaying(true); }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  }

  return (
    <div className="flex items-center gap-3 w-full">
      <audio
        ref={audioRef} src={src}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setMetaDuration(e.currentTarget.duration)}
        onEnded={() => { setPlaying(false); setCurrent(0); }}
      />
      <button
        onClick={toggle}
        className="h-9 w-9 rounded-full bg-accent flex items-center justify-center flex-shrink-0 hover:scale-105 transition"
      >
        {playing ? <Pause className="h-4 w-4 text-black" /> : <Play className="h-4 w-4 text-black ml-0.5" />}
      </button>
      <div className="flex-1 space-y-1">
        <div className="h-1 w-full bg-white/10 rounded-full cursor-pointer overflow-hidden" onClick={seek}>
          <div
            className="h-full bg-accent rounded-full transition-all duration-100"
            style={{ width: `${duration > 0 ? Math.min((current / duration) * 100, 100) : 0}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-zinc-600 tabular-nums">
          <span>{fmtDur(current)}</span>
          <span>{fmtDur(duration)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Chip helpers ─────────────────────────────────────────────────────────────

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function IdeasModule({
  onBack,
  onShareToFeed,
}: {
  onBack: () => void;
  onShareToFeed?: (blob: Blob, title: string) => Promise<void>;
}) {
  const [view,     setView]     = useState<View>("record");
  const [melodies, setMelodies] = useState<Melody[]>([]);
  const [selected, setSelected] = useState<Melody | null>(null);

  useEffect(() => { loadMelodies().then(setMelodies); }, []);

  async function handleSave(m: Melody) {
    await saveMelody(m);
    setMelodies(await loadMelodies());
    setView("record");
  }

  async function handleDelete(id: string) {
    await deleteMelody(id);
    setMelodies(await loadMelodies());
    setView("bank");
  }

  if (view === "bank") return (
    <BankView
      melodies={melodies}
      onBack={() => setView("record")}
      onDelete={handleDelete}
      onShareToFeed={onShareToFeed}
    />
  );

  return (
    <RecordView
      melodyCount={melodies.length}
      onOpenBank={() => setView("bank")}
      onSave={handleSave}
    />
  );
}

// ─── Record view ──────────────────────────────────────────────────────────────

function RecordView({
  melodyCount, onOpenBank, onSave,
}: {
  melodyCount: number;
  onOpenBank: () => void;
  onSave: (m: Melody) => void;
}) {
  const [phase,    setPhase]    = useState<"idle" | "recording" | "done">("idle");
  const [timer,    setTimer]    = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [blob,     setBlob]     = useState<Blob | null>(null);
  const [bars,     setBars]     = useState<number[]>(Array(NUM_BARS).fill(3));

  // Metadata state
  const [title,       setTitle]       = useState("");
  const [moods,       setMoods]       = useState<MoodTag[]>([]);
  const [bpm,         setBpm]         = useState<BpmRange | null>(null);
  const [instruments, setInstruments] = useState<InstrumentTag[]>([]);
  const [notes,       setNotes]       = useState("");
  const [status,      setStatus]      = useState<IdeaStatus>("raw");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const animRef     = useRef<number | null>(null);
  const streamRef   = useRef<MediaStream | null>(null);

  const animateWaveform = useCallback((analyser: AnalyserNode) => {
    const data = new Uint8Array(analyser.frequencyBinCount);
    function tick() {
      analyser.getByteFrequencyData(data);
      const step = Math.floor(data.length / NUM_BARS);
      setBars(Array.from({ length: NUM_BARS }, (_, i) =>
        Math.max(3, Math.round((data[i * step] / 255) * 56))
      ));
      animRef.current = requestAnimationFrame(tick);
    }
    tick();
  }, []);

  async function startRecording() {
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioCtx = new AudioContext();
      const source   = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      animateWaveform(analyser);

      // Pick the best supported format — Safari iOS only supports mp4/aac
      const mimeType = MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const b = new Blob(chunksRef.current, { type: mimeType });
        setBlob(b);
        setAudioUrl(URL.createObjectURL(b));
      };
      recorder.start();
      recorderRef.current = recorder;
      setTimer(0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
      setPhase("recording");
    } catch (err) {
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      if (isIOS) {
        alert("Microphone access is blocked.\n\nTo enable it:\nSettings → Safari → Microphone → Allow");
      } else {
        alert("Microphone access is required. Please allow it in your browser settings and try again.");
      }
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    if (animRef.current)  cancelAnimationFrame(animRef.current);
    setBars(Array(NUM_BARS).fill(3));
    setPhase("done");
  }

  function discard() {
    setPhase("idle"); setBlob(null); setAudioUrl(null);
    setTitle(""); setMoods([]); setBpm(null); setInstruments([]);
    setNotes(""); setStatus("raw"); setTimer(0);
  }

  function save() {
    if (!blob || !title.trim()) return;
    onSave({
      id: Date.now().toString(), title: title.trim(),
      duration: timer, createdAt: Date.now(), blob,
      moods, bpm, instruments, notes: notes.trim(), status,
    });
    discard();
  }

  return (
    <div className="mx-auto w-full max-w-lg flex flex-col min-h-[70vh] px-2">

      {/* Top bar */}
      <div className="relative flex items-start justify-center mb-6">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold text-white">
            Melody <span className="text-accent">Bank</span>
          </h1>
          <p className="text-xs text-zinc-500">Capture your ideas before they disappear</p>
        </div>
        <button
          onClick={onOpenBank}
          className="absolute right-0 top-0 flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-3 py-2 hover:bg-white/10 transition"
        >
          <Library className="h-4 w-4 text-accent" />
          {melodyCount > 0 && <span className="text-xs font-semibold text-accent">{melodyCount}</span>}
        </button>
      </div>

      {/* Recorder */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        <div className="flex items-end gap-[2px] h-16 w-full justify-center">
          {bars.map((h, i) => (
            <div
              key={i}
              style={{ height: `${h}px`, opacity: phase === "recording" ? 1 : 0.1 }}
              className="w-[7px] rounded-full bg-accent transition-all duration-75"
            />
          ))}
        </div>

        <p className={`text-5xl font-mono font-bold tabular-nums tracking-widest transition-opacity ${
          phase === "idle" ? "opacity-20" : "opacity-100"
        } text-white`}>
          {fmtDur(timer)}
        </p>

        {phase !== "done" && (
          <button
            onClick={phase === "idle" ? startRecording : stopRecording}
            className={`h-20 w-20 rounded-full flex items-center justify-center shadow-lg transition hover:scale-105 ${
              phase === "recording" ? "bg-red-500 shadow-red-500/30" : "bg-accent shadow-accent/30"
            }`}
          >
            {phase === "recording"
              ? <Square className="h-7 w-7 text-white" />
              : <div className="h-7 w-7 rounded-full bg-black/20" />
            }
          </button>
        )}

        {phase === "idle" && (
          <p className="text-xs text-zinc-600 text-center">Tap to start recording</p>
        )}
      </div>

      {/* Save panel — with metadata */}
      {phase === "done" && audioUrl && (
        <div className="space-y-4 pb-4 pt-4">
          <MiniPlayer src={audioUrl} knownDuration={timer} />

          {/* Title */}
          <input
            autoFocus type="text" value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="Name this idea..."
            className="w-full h-11 rounded-xl border border-white/15 bg-black/30 px-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-accent"
          />

          {/* Mood */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Mood</p>
            <div className="flex flex-wrap gap-1.5">
              {MOOD_OPTIONS.map((m) => {
                const sel = moods.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => setMoods(toggle(moods, m.id))}
                    className="rounded-full px-3 py-1 text-xs font-medium transition border"
                    style={{
                      backgroundColor: sel ? m.color + "25" : "transparent",
                      borderColor:      sel ? m.color        : "rgba(255,255,255,0.1)",
                      color:            sel ? m.color        : "#71717a",
                    }}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* BPM */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">BPM</p>
            <div className="flex gap-2">
              {BPM_OPTIONS.map((b) => {
                const sel = bpm === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => setBpm(sel ? null : b.id)}
                    className={`flex-1 rounded-xl border py-2 text-xs font-medium transition ${
                      sel ? "border-accent bg-accent/10 text-accent" : "border-white/10 text-zinc-500 hover:text-white"
                    }`}
                  >
                    <p>{b.label}</p>
                    <p className="text-[9px] opacity-60 mt-0.5">{b.sub}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Instruments */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Sounds like</p>
            <div className="flex flex-wrap gap-1.5">
              {INSTRUMENT_OPTIONS.map((instr) => {
                const sel = instruments.includes(instr.id);
                return (
                  <button
                    key={instr.id}
                    onClick={() => setInstruments(toggle(instruments, instr.id))}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                      sel ? "border-accent/50 bg-accent/10 text-accent" : "border-white/10 text-zinc-500 hover:text-white"
                    }`}
                  >
                    <span>{instr.emoji}</span> {instr.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional) — context, references, project ideas..."
            rows={2}
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white outline-none resize-none placeholder:text-zinc-600 focus:border-accent"
          />

          {/* Status */}
          <div className="flex gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setStatus(s.id)}
                className={`flex-1 rounded-xl border py-2 text-xs font-medium transition ${
                  status === s.id
                    ? s.color + " border-transparent"
                    : "border-white/10 text-zinc-600 hover:text-zinc-400"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button onClick={discard} className="flex-1 rounded-2xl border border-white/10 py-3 text-sm text-zinc-400 hover:text-white transition">
              Discard
            </button>
            <button
              onClick={save} disabled={!title.trim()}
              className="flex-1 rounded-2xl bg-accent py-3 text-sm font-bold text-black disabled:opacity-40 transition"
            >
              Save to Vault
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bank view ────────────────────────────────────────────────────────────────

function MelodyCard({
  m, onDelete, onShareToFeed,
}: {
  m: Melody;
  onDelete: (id: string) => void;
  onShareToFeed?: (blob: Blob, title: string) => Promise<void>;
}) {
  const [playing,         setPlaying]         = useState(false);
  const [shareOpen,       setShareOpen]       = useState(false);
  const [sharingFennec,   setSharingFennec]   = useState(false);
  const [sharedFennec,    setSharedFennec]    = useState(false);
  const [confirmDelete,   setConfirmDelete]   = useState(false);
  const [bars,            setBars]            = useState<number[]>(Array(20).fill(3));
  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const animRef     = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioUrl    = useState(() => URL.createObjectURL(m.blob))[0];
  const statusOpt   = STATUS_OPTIONS.find((s) => s.id === m.status);

  const NUM_BARS = 20;

  function startWaveform(audio: HTMLAudioElement) {
    try {
      const ctx      = new AudioContext();
      const source   = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      function tick() {
        analyser.getByteFrequencyData(data);
        const step = Math.floor(data.length / NUM_BARS);
        setBars(Array.from({ length: NUM_BARS }, (_, i) =>
          Math.max(3, Math.round((data[i * step] / 255) * 28))
        ));
        animRef.current = requestAnimationFrame(tick);
      }
      tick();
    } catch {
      // iOS Safari fallback — animate bars randomly
      function fakeTick() {
        setBars(Array.from({ length: NUM_BARS }, () => Math.max(3, Math.floor(Math.random() * 28))));
        animRef.current = requestAnimationFrame(fakeTick);
      }
      fakeTick();
    }
  }

  function stopWaveform() {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setBars(Array(NUM_BARS).fill(3));
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      stopWaveform();
      setPlaying(false);
    } else {
      if (!analyserRef.current) startWaveform(audioRef.current);
      void audioRef.current.play();
      setPlaying(true);
    }
  }

  async function shareNative() {
    const file = new File([m.blob], `${m.title}.webm`, { type: "audio/webm" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: m.title, files: [file] });
    } else if (navigator.share) {
      await navigator.share({ title: m.title });
    }
    setShareOpen(false);
  }

  async function shareToFennec() {
    if (!onShareToFeed) return;
    setSharingFennec(true);
    try {
      await onShareToFeed(m.blob, m.title);
      setSharedFennec(true);
    } catch { alert("Error sharing. Try again."); }
    finally { setSharingFennec(false); setShareOpen(false); }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-white leading-snug">{m.title}</p>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${statusOpt?.color}`}>
            {statusOpt?.label}
          </span>
          {confirmDelete ? (
            <>
              <button onClick={() => onDelete(m.id)} className="text-[10px] font-semibold text-red-400">Delete</button>
              <button onClick={() => setConfirmDelete(false)} className="text-[10px] text-zinc-500">✕</button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-zinc-600 hover:text-red-400 transition">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Chips */}
      {(m.moods.length > 0 || m.instruments.length > 0) && (
        <div className="flex flex-wrap gap-1">
          {m.moods.map((mood) => (
            <span key={mood} className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: MOOD_COLOR[mood] + "20", color: MOOD_COLOR[mood] }}>
              {MOOD_OPTIONS.find((o) => o.id === mood)?.label}
            </span>
          ))}
          {m.instruments.map((instr) => {
            const opt = INSTRUMENT_OPTIONS.find((o) => o.id === instr);
            return (
              <span key={instr} className="rounded-full px-2 py-0.5 text-[10px] text-zinc-500 border border-white/8">
                {opt?.emoji} {opt?.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center gap-3 text-[10px] text-zinc-600">
        {m.bpm && <span className="uppercase">{m.bpm}</span>}
        <span>{fmtDur(m.duration)}</span>
        <span>{new Date(m.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
      </div>

      {/* Player + Share */}
      <div className="flex items-center gap-3 pt-1 border-t border-white/5">
        <button
          onClick={togglePlay}
          className="h-9 w-9 rounded-full bg-accent flex items-center justify-center shadow-md shadow-amber-500/30 hover:brightness-110 transition shrink-0"
        >
          {playing
            ? <svg viewBox="0 0 24 24" className="h-4 w-4 fill-black"><rect x="5" y="4" width="4" height="16" rx="1"/><rect x="15" y="4" width="4" height="16" rx="1"/></svg>
            : <svg viewBox="0 0 24 24" className="h-4 w-4 fill-black translate-x-0.5"><path d="M6 4.75a.75.75 0 0 1 1.14-.64l12 7.25a.75.75 0 0 1 0 1.28l-12 7.25A.75.75 0 0 1 6 19.25V4.75z"/></svg>}
        </button>
        <audio ref={audioRef} src={audioUrl} onEnded={() => { setPlaying(false); stopWaveform(); }} className="hidden" />

        {/* Waveform bars */}
        <div className="flex items-end gap-px h-7 flex-1">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-full transition-all duration-75"
              style={{
                height: `${h}px`,
                backgroundColor: playing ? `rgba(251,191,36,${0.4 + (h / 28) * 0.6})` : "rgba(255,255,255,0.08)",
              }}
            />
          ))}
        </div>

        {/* Share button + dropdown */}
        <div className="relative">
          <button
            onClick={() => setShareOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/20"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" stroke="currentColor" strokeWidth="2" fill="none"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
            {sharedFennec ? "Shared ✓" : "Share"}
          </button>
          {shareOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShareOpen(false)} />
              <div className="absolute right-0 bottom-10 z-20 w-52 rounded-2xl border border-white/10 bg-zinc-900 shadow-xl overflow-hidden">
                <button
                  onClick={shareToFennec}
                  disabled={sharingFennec || sharedFennec || !onShareToFeed}
                  className="w-full flex items-center px-4 py-3 text-xs text-white hover:bg-white/5 transition disabled:opacity-50"
                >
                  <span>{sharingFennec ? "Posting…" : sharedFennec ? "Posted to Community!" : "Share to Fennec feed"}</span>
                </button>
                <div className="h-px bg-white/5" />
                <button
                  onClick={shareNative}
                  className="w-full flex items-center px-4 py-3 text-xs text-zinc-400 hover:bg-white/5 hover:text-white transition"
                >
                  <span>Share audio file</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BankView({
  melodies, onBack, onDelete, onShareToFeed,
}: {
  melodies: Melody[];
  onBack: () => void;
  onDelete: (id: string) => void;
  onShareToFeed?: (blob: Blob, title: string) => Promise<void>;
}) {
  const [query,      setQuery]      = useState("");
  const [filterMood, setFilterMood] = useState<MoodTag | null>(null);
  const [filterStat, setFilterStat] = useState<IdeaStatus | null>(null);

  const filtered = melodies.filter((m) => {
    if (query && !m.title.toLowerCase().includes(query.toLowerCase()) && !m.notes.toLowerCase().includes(query.toLowerCase())) return false;
    if (filterMood && !m.moods.includes(filterMood)) return false;
    if (filterStat && m.status !== filterStat) return false;
    return true;
  });

  return (
    <div className="mx-auto w-full max-w-lg space-y-5 px-2">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-zinc-400 hover:text-accent transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">Melody Bank</p>
          <h1 className="text-2xl font-bold text-white">My Melodies</h1>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
        <input
          type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title or notes..."
          className="w-full h-10 rounded-xl border border-white/10 bg-white/5 pl-9 pr-9 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-accent"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Mood filter */}
      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Filter by mood</p>
        <div className="flex flex-wrap gap-1.5">
          {MOOD_OPTIONS.map((m) => {
            const active = filterMood === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setFilterMood(active ? null : m.id)}
                className="rounded-full px-2.5 py-1 text-[11px] font-medium transition border"
                style={{
                  backgroundColor: active ? m.color + "25" : "transparent",
                  borderColor:      active ? m.color        : "rgba(255,255,255,0.08)",
                  color:            active ? m.color        : "#52525b",
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setFilterStat(filterStat === s.id ? null : s.id)}
            className={`flex-1 rounded-xl border py-1.5 text-xs font-medium transition ${
              filterStat === s.id
                ? s.color + " border-transparent"
                : "border-white/10 text-zinc-600 hover:text-zinc-400"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <Music className="h-8 w-8 text-zinc-700 mx-auto" />
          <p className="text-sm text-zinc-500">{melodies.length === 0 ? "No ideas saved yet." : "No results for that filter."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <MelodyCard
              key={m.id}
              m={m}
              onDelete={onDelete}
              onShareToFeed={onShareToFeed}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Detail view ──────────────────────────────────────────────────────────────

function DetailView({
  melody, onBack, onDelete, onShareToFeed,
}: {
  melody: Melody;
  onBack: () => void;
  onDelete: () => void;
  onShareToFeed?: (blob: Blob, title: string) => Promise<void>;
}) {
  const [playing,          setPlaying]          = useState(false);
  const [confirmDelete,    setConfirmDelete]    = useState(false);
  const [sharing,          setSharing]          = useState(false);
  const [sharingToFennec,  setSharingToFennec]  = useState(false);
  const [sharedToFennec,   setSharedToFennec]   = useState(false);
  const [audioUrl] = useState(() => URL.createObjectURL(melody.blob));
  const audioRef   = useRef<HTMLAudioElement | null>(null);

  async function shareNative() {
    setSharing(true);
    try {
      const file = new File([melody.blob], `${melody.title}.webm`, { type: "audio/webm" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: melody.title, text: `🎵 ${melody.title}`, files: [file] });
      } else if (navigator.share) {
        await navigator.share({ title: melody.title, text: `🎵 ${melody.title}` });
      } else {
        alert("Sharing not supported on this browser.");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") console.error(e);
    } finally {
      setSharing(false);
    }
  }

  async function shareToFennec() {
    if (!onShareToFeed) return;
    setSharingToFennec(true);
    try {
      await onShareToFeed(melody.blob, melody.title);
      setSharedToFennec(true);
    } catch (err) {
      console.error(err);
      alert("Error sharing. Try again.");
    } finally {
      setSharingToFennec(false);
    }
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else         { void audioRef.current.play(); setPlaying(true); }
  }

  const statusOpt = STATUS_OPTIONS.find((s) => s.id === melody.status);

  return (
    <div className="mx-auto w-full max-w-lg space-y-5 px-2">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-zinc-400 hover:text-accent transition">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">Melody Bank</p>
            <h1 className="text-2xl font-bold text-white leading-tight">{melody.title}</h1>
          </div>
        </div>
        {confirmDelete ? (
          <div className="flex items-center gap-3">
            <button onClick={onDelete} className="text-xs font-semibold text-red-400">Delete</button>
            <button onClick={() => setConfirmDelete(false)} className="text-xs text-zinc-500">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="text-zinc-600 hover:text-red-400 transition">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Player */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col items-center gap-4">
        <div className="flex items-center gap-3 text-[11px] text-zinc-600">
          <span>{fmtDur(melody.duration)}</span>
          <span>·</span>
          <span>{new Date(melody.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          {statusOpt && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusOpt.color}`}>
              {statusOpt.label}
            </span>
          )}
        </div>
        <button
          onClick={togglePlay}
          className="relative h-20 w-20 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
        >
          {/* outer glow ring */}
          <span className={`absolute inset-0 rounded-full bg-accent/20 blur-xl transition-opacity ${playing ? "opacity-100" : "opacity-50"}`} />
          {/* pulsing ring when playing */}
          {playing && <span className="absolute inset-0 rounded-full border border-accent/40 animate-ping" />}
          {/* button surface */}
          <span className="relative h-20 w-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-xl shadow-amber-500/40 flex items-center justify-center">
            {playing
              ? <svg viewBox="0 0 24 24" className="h-7 w-7 fill-black"><rect x="5" y="4" width="4" height="16" rx="1"/><rect x="15" y="4" width="4" height="16" rx="1"/></svg>
              : <svg viewBox="0 0 24 24" className="h-8 w-8 fill-black translate-x-0.5"><path d="M6 4.75a.75.75 0 0 1 1.14-.64l12 7.25a.75.75 0 0 1 0 1.28l-12 7.25A.75.75 0 0 1 6 19.25V4.75z"/></svg>}
          </span>
        </button>
        <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} className="hidden" />
      </div>

      {/* Metadata */}
      {(melody.moods.length > 0 || melody.bpm || melody.instruments.length > 0 || melody.notes) && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
          <p className="text-sm font-semibold text-white">Details</p>

          {melody.moods.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-widest text-zinc-600">Mood</p>
              <div className="flex flex-wrap gap-1.5">
                {melody.moods.map((mood) => (
                  <span
                    key={mood}
                    className="rounded-full px-3 py-1 text-xs font-medium"
                    style={{ backgroundColor: MOOD_COLOR[mood] + "20", color: MOOD_COLOR[mood] }}
                  >
                    {MOOD_OPTIONS.find((o) => o.id === mood)?.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(melody.bpm || melody.instruments.length > 0) && (
            <div className="flex gap-6">
              {melody.bpm && (
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600">BPM</p>
                  <p className="text-sm font-semibold text-white capitalize">{melody.bpm}</p>
                </div>
              )}
              {melody.instruments.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600">Sounds like</p>
                  <div className="flex flex-wrap gap-1">
                    {melody.instruments.map((instr) => {
                      const opt = INSTRUMENT_OPTIONS.find((o) => o.id === instr);
                      return (
                        <span key={instr} className="text-sm">{opt?.emoji} <span className="text-xs text-zinc-400">{opt?.label}</span></span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {melody.notes && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-zinc-600">Notes</p>
              <p className="text-xs text-zinc-300 leading-relaxed">{melody.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Share */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
        <p className="text-sm font-semibold text-white">Share</p>
        <button
          onClick={shareNative} disabled={sharing}
          className="w-full flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 hover:border-accent/40 transition disabled:opacity-50"
        >
          <Share2 className="h-4 w-4 text-accent flex-shrink-0" />
          <div className="text-left">
            <p className="text-sm font-medium text-white">{sharing ? "Opening…" : "Share audio file"}</p>
            <p className="text-xs text-zinc-500">AirDrop, WhatsApp, Instagram, TikTok…</p>
          </div>
        </button>
        <button
          onClick={shareToFennec}
          disabled={sharingToFennec || sharedToFennec || !onShareToFeed}
          className="w-full flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 hover:border-accent/40 transition disabled:opacity-50"
        >
          <img src="/fennec-logo.png" className="h-5 w-5 shrink-0 brightness-0 invert" alt="" />
          <div className="text-left flex-1">
            <p className="text-sm font-medium text-white">
              {sharingToFennec ? "Posting…" : sharedToFennec ? "Posted to Community!" : "Share to Fennec"}
            </p>
            <p className="text-xs text-zinc-500">Post to the community feed</p>
          </div>
          {sharedToFennec && <span className="text-accent text-lg">✓</span>}
        </button>
      </div>

    </div>
  );
}
