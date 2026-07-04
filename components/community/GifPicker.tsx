"use client";
import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { useSheetDismiss, SHEET_BOTTOM, SHEET_ENTER } from "@/components/ui/useSheetDismiss";

type GifResult = { id: string; url: string; preview: string };

type Props = {
  onSelect: (url: string) => void;
  onClose: () => void;
};

export default function GifPicker({ onSelect, onClose }: Props) {
  const { sheetRef, dismiss } = useSheetDismiss(onClose);
  const [query, setQuery]     = useState("");
  const [gifs, setGifs]       = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchGifs(q: string) {
    setLoading(true);
    const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY;
    if (!apiKey) {
      setGifs([]);
      setLoading(false);
      return;
    }
    const endpoint = q.trim()
      ? `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(q)}&limit=20&rating=g`
      : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=20&rating=g`;
    try {
      const res = await fetch(endpoint);
      const data = await res.json();
      setGifs((data.data ?? []).map((g: {
        id: string;
        images: {
          fixed_height_small: { url: string };
          preview_gif: { url: string };
        };
      }) => ({
        id: g.id,
        url: g.images.fixed_height_small.url,
        preview: g.images.preview_gif.url,
      })));
    } catch {
      setGifs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchGifs(""); }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchGifs(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex items-end bg-black/60"
      style={{ height: "var(--app-h, 100dvh)", animation: "sheetFadeIn .25s ease both" }} onClick={dismiss}>
      <div
        ref={sheetRef}
        className="w-full rounded-t-3xl bg-zinc-950 border-t border-white/10 p-4 space-y-3 overflow-y-auto"
        style={{ maxHeight: "70vh", paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)", animation: SHEET_ENTER }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">GIFs</span>
          <button onClick={onClose}><X className="h-5 w-5 text-zinc-500" /></button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GIFs..."
            className="w-full h-10 rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-amber-500"
            autoFocus
          />
        </div>

        <div
          className="grid grid-cols-3 gap-2 overflow-y-auto"
          style={{ maxHeight: "50vh" }}
        >
          {loading && [...Array(9)].map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-white/5 animate-pulse" />
          ))}
          {!loading && gifs.length === 0 && (
            <div className="col-span-3 text-center py-8 text-zinc-600 text-sm">
              {process.env.NEXT_PUBLIC_GIPHY_API_KEY ? "No hay GIFs" : "Configura NEXT_PUBLIC_GIPHY_API_KEY para usar GIFs"}
            </div>
          )}
          {!loading && gifs.map((gif) => (
            <button
              key={gif.id}
              onClick={() => { onSelect(gif.url); onClose(); }}
              className="aspect-square rounded-xl overflow-hidden hover:ring-2 hover:ring-amber-500 transition"
            >
              <img src={gif.preview} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
