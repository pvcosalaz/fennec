"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, Play, Pause, Radio } from "lucide-react";
import { fetchFrequency, sendVoiceNote, archiveNote, type VoiceNote } from "@/lib/networkDb";
import type { Profile } from "@/lib/communityTypes";

/* The card back — a radio frequency with one producer. Press and hold the
   transmit button to record (the same gesture as marking a moment on La
   Cinta); release to send. Notes are "on air" for 48h unless printed to
   tape. There is no text — in Fennec, your network sounds. */

const AMBER = "#f5a623";
const MAX_SECONDS = 60;
const SERIF = 'var(--font-tape-serif, "Newsreader", Georgia, serif)';
const MONO  = 'var(--font-tape-mono, "Space Mono", monospace)';

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  return MediaRecorder.isTypeSupported("audio/mp4")
    ? "audio/mp4"
    : MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : "audio/webm";
}

export default function RadioFrequency({ userId, peer }: { userId: string; peer: Profile }) {
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sending, setSending] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const streamRef   = useRef<MediaStream | null>(null);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const startedAt   = useRef(0);

  useEffect(() => {
    fetchFrequency(userId, peer.id)
      .then(setNotes)
      .finally(() => setLoading(false));
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      audioRef.current?.pause();
    };
  }, [userId, peer.id]);

  async function startRecording() {
    if (recording || sending) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMime();
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => onRecordingStopped(mimeType);
      recorder.start();
      recorderRef.current = recorder;
      startedAt.current = Date.now();
      setElapsed(0);
      setRecording(true);
      navigator.vibrate?.(8);
      timerRef.current = setInterval(() => {
        const s = Math.floor((Date.now() - startedAt.current) / 1000);
        setElapsed(s);
        if (s >= MAX_SECONDS) stopRecording();
      }, 250);
    } catch {
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      setError(isIOS
        ? "Mic blocked. Allow it in Settings → Safari → Microphone."
        : "Mic access is required. Allow it and try again.");
    }
  }

  function stopRecording() {
    if (!recording) return;
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
  }

  async function onRecordingStopped(mimeType: string) {
    const duration = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
    const blob = new Blob(chunksRef.current, { type: mimeType });
    if (blob.size === 0) return;
    setSending(true);
    const note = await sendVoiceNote(userId, peer.id, blob, duration);
    setSending(false);
    if (note) {
      setNotes((prev) => [...prev, note]);
      navigator.vibrate?.(10);
    } else {
      setError("Couldn't send. Try again.");
    }
  }

  function togglePlay(note: VoiceNote) {
    if (playingId === note.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(note.audio_url);
    audioRef.current = audio;
    audio.onended = () => setPlayingId(null);
    audio.play().catch(() => setPlayingId(null));
    setPlayingId(note.id);
  }

  async function handleArchive(note: VoiceNote) {
    const ok = await archiveNote(note.id);
    if (ok) setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, archived: true } : n)));
  }

  return (
    <div className="flex flex-col" style={{ minHeight: 260 }}>
      {/* header */}
      <div className="flex items-center gap-2 px-1 pb-3">
        <Radio className="h-4 w-4" style={{ color: AMBER }} />
        <span className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ fontFamily: MONO, color: "rgba(255,255,255,.55)" }}>
          Frequency · @{peer.username}
        </span>
      </div>

      {/* notes */}
      <div className="flex-1 space-y-2.5 overflow-y-auto px-1" style={{ maxHeight: 220 }}>
        {loading && <p className="text-[11px] text-zinc-600 py-4" style={{ fontFamily: MONO }}>Tuning in…</p>}
        {!loading && notes.length === 0 && (
          <p className="text-[13px] italic text-zinc-500 py-6 text-center" style={{ fontFamily: SERIF }}>
            Quiet on this frequency. Hold to send the first note.
          </p>
        )}
        {notes.map((note) => {
          const mine = note.sender_id === userId;
          const isPlaying = playingId === note.id;
          return (
            <div key={note.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className="flex items-center gap-2.5 rounded-2xl px-3 py-2"
                style={{
                  background: mine ? "rgba(245,166,35,.12)" : "rgba(255,255,255,.05)",
                  border: `1px solid ${mine ? "rgba(245,166,35,.25)" : "rgba(255,255,255,.08)"}`,
                  maxWidth: "80%",
                }}
              >
                <button
                  onClick={() => togglePlay(note)}
                  className="flex h-8 w-8 items-center justify-center rounded-full shrink-0 active:scale-90 transition"
                  style={{ background: mine ? AMBER : "rgba(255,255,255,.12)", color: mine ? "#111114" : "#fff" }}
                >
                  {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" style={{ transform: "translateX(1px)" }} />}
                </button>
                <span className="text-[11px] tabular-nums" style={{ fontFamily: MONO, color: "rgba(255,255,255,.6)" }}>
                  {fmt(note.duration_seconds ?? 0)}
                </span>
                {note.archived ? (
                  <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ fontFamily: MONO, color: AMBER, border: `1px solid ${AMBER}`, transform: "rotate(-2deg)" }}>
                    tape
                  </span>
                ) : (
                  <button
                    onClick={() => handleArchive(note)}
                    className="text-[8px] font-bold uppercase text-zinc-500 hover:text-amber-400 transition"
                    style={{ fontFamily: MONO }}
                  >
                    keep
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="text-[11px] text-center mt-2" style={{ color: AMBER }}>{error}</p>}

      {/* transmit — press and hold */}
      <div className="flex flex-col items-center pt-4 pb-1">
        <button
          onPointerDown={(e) => { e.preventDefault(); startRecording(); }}
          onPointerUp={stopRecording}
          onPointerLeave={() => { if (recording) stopRecording(); }}
          disabled={sending}
          className="flex h-16 w-16 items-center justify-center rounded-full transition active:scale-95 disabled:opacity-50"
          style={{
            background: recording ? AMBER : "rgba(255,255,255,.08)",
            border: `2px solid ${recording ? AMBER : "rgba(255,255,255,.15)"}`,
            boxShadow: recording ? `0 0 24px rgba(245,166,35,.5)` : "none",
            touchAction: "none",
          }}
        >
          <Mic className="h-6 w-6" style={{ color: recording ? "#111114" : "#fff" }} />
        </button>
        <span className="text-[10px] mt-2" style={{ fontFamily: MONO, color: recording ? AMBER : "rgba(255,255,255,.4)" }}>
          {sending ? "Sending…" : recording ? `${fmt(elapsed)} · release to send` : "Hold to talk"}
        </span>
      </div>
    </div>
  );
}
