"use client";
import { useEffect, useRef, useState } from "react";

type Props = { url: string; name: string };

export default function AudioPlayerInline({ url, name }: Props) {
  const audioRef              = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onloadedmetadata = () => setDuration(audio.duration);
    audio.ontimeupdate = () => setProgress(audio.currentTime / (audio.duration || 1));
    audio.onended = () => { setPlaying(false); setProgress(0); };
    return () => { audio.pause(); audio.src = ""; };
  }, [url]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5">
      <button
        onClick={toggle}
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 hover:brightness-110 transition"
        style={{
          background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
          boxShadow: "0 0 12px rgba(251,191,36,0.45)",
        }}
      >
        {playing
          ? <svg viewBox="0 0 24 24" className="h-4 w-4 fill-black"><rect x="5" y="4" width="4" height="16" rx="1"/><rect x="15" y="4" width="4" height="16" rx="1"/></svg>
          : <svg viewBox="0 0 24 24" className="h-4 w-4 fill-black translate-x-0.5"><path d="M6 4.75a.75.75 0 0 1 1.14-.64l12 7.25a.75.75 0 0 1 0 1.28l-12 7.25A.75.75 0 0 1 6 19.25V4.75z"/></svg>}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-zinc-300 truncate mb-1.5">{name}</p>
        <div className="h-1.5 rounded-full bg-white/10">
          <div
            className="h-1.5 rounded-full bg-amber-500 transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
      <span className="text-[10px] text-zinc-600 shrink-0">{fmt(duration)}</span>
    </div>
  );
}
