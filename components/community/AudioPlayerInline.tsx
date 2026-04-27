"use client";
import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

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
        className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center shrink-0 hover:bg-amber-400 transition"
      >
        {playing
          ? <Pause className="h-3.5 w-3.5 text-black" />
          : <Play className="h-3.5 w-3.5 text-black ml-0.5" />}
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
