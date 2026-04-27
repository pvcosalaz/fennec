"use client";
import { useState } from "react";
import { Play } from "lucide-react";

type Props = { url: string; title?: string | null };

function getEmbedUrl(url: string): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
  return null;
}

function getThumbnailUrl(url: string): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  return null;
}

export default function VideoEmbed({ url, title }: Props) {
  const [playing, setPlaying] = useState(false);
  const embedUrl = getEmbedUrl(url);
  const thumbnail = getThumbnailUrl(url);

  if (!embedUrl) return null;

  if (playing) {
    return (
      <div className="relative rounded-xl overflow-hidden aspect-video w-full">
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setPlaying(true)}
      className="relative w-full rounded-xl overflow-hidden aspect-video bg-zinc-900 flex items-center justify-center group"
    >
      {thumbnail && (
        <img src={thumbnail} alt={title ?? "Video"} className="absolute inset-0 w-full h-full object-cover opacity-70" />
      )}
      <div className="relative z-10 w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center group-hover:scale-110 transition">
        <Play className="h-5 w-5 text-black ml-0.5" />
      </div>
      {title && (
        <p className="absolute bottom-2 left-3 right-3 text-xs text-white font-medium truncate z-10 drop-shadow">{title}</p>
      )}
    </button>
  );
}
