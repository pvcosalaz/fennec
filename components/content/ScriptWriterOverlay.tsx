"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import ToolPage from "./ToolPage";

type VideoRef = {
  title: string;
  channel: string;
  angle: string;
  why: string;
  url: string;
  thumbnail: string;
};

type Props = {
  videoRef: VideoRef;
  onSave: (title: string, script: string) => void;
  onClose: () => void;
  isDesktop?: boolean;
};

export default function ScriptWriterOverlay({ videoRef, onSave, onClose, isDesktop = false }: Props) {
  const { t } = useTranslation();
  const [title,  setTitle]  = useState("");
  const [script, setScript] = useState("");
  const [saved,  setSaved]  = useState(false);

  function handleSave() {
    if (!title.trim()) return;
    setSaved(true);
    setTimeout(() => {
      onSave(title.trim(), script.trim());
    }, 600);
  }

  return (
    <ToolPage
      isDesktop={isDesktop}
      eyebrow={t("swEscribirGuion")}
      onBack={onClose}
      actions={saved ? (
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/20">
          <Check size={16} className="text-accent" />
        </div>
      ) : (
        <button
          onClick={handleSave}
          disabled={!title.trim()}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-black transition disabled:opacity-30"
        >
          {t("swGuardar")}
        </button>
      )}
    >
      <>
        {/* ── Reference card ── */}
        <div className="rounded-2xl overflow-hidden border border-white/10">
          {/* Thumbnail strip — video reference */}
          {videoRef.thumbnail ? (
            <div className="relative h-28 w-full">
              <img
                src={videoRef.thumbnail}
                alt={videoRef.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-2 left-3 right-3">
                <p className="text-white text-xs font-semibold line-clamp-2 leading-snug">{videoRef.title}</p>
                <p className="text-zinc-400 text-[10px] mt-0.5">{videoRef.channel}</p>
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 bg-zinc-900">
              <p className="text-white text-sm font-semibold leading-snug">{videoRef.title}</p>
            </div>
          )}

          {/* El ángulo solo existe cuando el guion viene del Lab o de Inspire.
              Desde una Quick Idea no hay, y el bloque ámbar salía vacío con su
              rótulo colgando (Paco 2026-08-02). */}
          {videoRef.angle?.trim() && (
            <div className="bg-amber-400/8 px-4 py-3 space-y-2 border-t border-amber-400/15">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                {t("swTuAngulo")}
              </p>
              <p className="text-sm text-white leading-relaxed">{videoRef.angle}</p>
            </div>
          )}
        </div>

        {/* ── Divider ── */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/5" />
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest">{t("swTuGuion")}</p>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        {/* ── Title field ── */}
        <div className="space-y-1.5">
          <p className="text-xs text-zinc-500">{t("swTituloGancho")}</p>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("swPlaceholderIdea")}
            className="w-full h-12 rounded-2xl border border-white/10 bg-black/25 px-4 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-accent/50 transition"
            autoFocus
          />
        </div>

        {/* ── Script textarea ── */}
        <div className="space-y-1.5">
          <p className="text-xs text-zinc-500">{t("swGuionNotas")}</p>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder={t("swPlaceholderGuion")}
            rows={10}
            className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-accent/50 transition resize-none leading-relaxed"
          />
        </div>

        {/* Reference link — only if URL exists. Generic label: references
            can come from a Quick Idea (Instagram, TikTok, anywhere), not
            just YouTube. */}
        {videoRef.url && (
          <a
            href={videoRef.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 transition"
          >
            {t("swAbrirReferencia")}
          </a>
        )}
      </>
    </ToolPage>
  );
}
