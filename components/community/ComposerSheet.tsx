"use client";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Music2, ImageIcon, SmilePlus } from "lucide-react";
import { createPost, uploadImage } from "@/lib/communityDb";
import type { Profile, Post, PostCategory, MediaType } from "@/lib/communityTypes";
import { CATEGORIES } from "@/lib/communityTypes";
import MelodyPicker from "./MelodyPicker";
import GifPicker from "./GifPicker";
import { useSheetDismiss, SHEET_BOTTOM, SHEET_ENTER } from "@/components/ui/useSheetDismiss";

type Props = {
  profile: Profile;
  onClose: () => void;
  onPostCreated: (post: Post) => void;
  initialMediaUrl?: string;
  initialMediaType?: MediaType;
  initialMediaName?: string;
};

const YOUTUBE_RE = /(?:youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}/;
const VIMEO_RE   = /vimeo\.com\/\d+/;

function detectVideo(text: string): string | null {
  const words = text.split(/\s+/);
  for (const w of words) {
    if (YOUTUBE_RE.test(w) || VIMEO_RE.test(w)) return w;
  }
  return null;
}

export default function ComposerSheet({ profile, onClose, onPostCreated, initialMediaUrl, initialMediaType, initialMediaName, anchor }: Props & { anchor?: DOMRect | null }) {
  /* flotante = hay ancla, y punto. Antes era `isDesktop && anchor`, y
     useIsDesktop arranca en false hasta que mide: durante ese primer frame se
     pintaba la hoja de telefono pegada al borde inferior — el parpadeo abajo
     que Paco veia al abrir y al cancelar (2026-08-04). El ancla solo existe si
     el "+" de escritorio la capturo, asi que ya trae la decision puesta. */
  const flotante = !!anchor;
  const { sheetRef, dismiss } = useSheetDismiss(onClose);
  const { t } = useTranslation();
  const [content, setContent]       = useState("");
  const [category, setCategory]     = useState<PostCategory>("music");
  const [mediaUrl, setMediaUrl]     = useState<string | null>(initialMediaUrl ?? null);
  const [mediaType, setMediaType]   = useState<MediaType>(initialMediaType ?? null);
  const [mediaName, setMediaName]   = useState<string | null>(initialMediaName ?? null);
  const [linkUrl, setLinkUrl]       = useState<string | null>(null);
  const [linkTitle, setLinkTitle]   = useState<string | null>(null);
  const [showMelody, setShowMelody] = useState(false);
  const [showGif, setShowGif]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const canPost = content.trim().length > 0 || !!mediaUrl;

  function handleContentChange(val: string) {
    setContent(val);
    // Auto-detect YouTube/Vimeo
    const vid = detectVideo(val);
    if (vid && mediaType !== "video-embed") {
      setLinkUrl(vid);
      setMediaType("video-embed");
    } else if (!vid && mediaType === "video-embed") {
      setLinkUrl(null);
      setMediaType(null);
    }
  }

  function clearMedia() {
    setMediaUrl(null);
    setMediaType(null);
    setMediaName(null);
    setLinkUrl(null);
    setLinkTitle(null);
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubmitting(true);
    try {
      const url = await uploadImage(file);
      setMediaUrl(url);
      setMediaType("image");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit() {
    if (!canPost) return;
    setSubmitting(true);
    try {
      const post = await createPost({
        userId:    profile.id,
        content:   content.trim(),
        category,
        mediaUrl:  mediaUrl ?? undefined,
        mediaType: mediaType ?? undefined,
        mediaName: mediaName ?? undefined,
        linkUrl:   linkUrl ?? undefined,
        linkTitle: linkTitle ?? undefined,
      });
      onPostCreated(post);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error("createPost error:", msg);
      alert(`Error publicando: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <>
      {/* El velo NO oscurece en escritorio: un popover no es un modal, y
          apagar la pantalla entera para escribir un post de tres renglones
          exagera el peso de la accion. Sigue capturando el clic para cerrar. */}
      <div
        className="fixed inset-0 z-[100]"
        style={{ background: flotante ? "transparent" : "rgba(0,0,0,0.6)", animation: "sheetFadeIn .25s ease both" }}
        onClick={flotante ? onClose : dismiss}
      />
      <div
        ref={sheetRef}
        className={flotante
          ? "fixed z-[101] rounded-2xl border border-white/10 p-4 space-y-4 overflow-y-auto"
          : "fixed left-0 right-0 z-[101] rounded-t-3xl bg-zinc-950 border-t border-white/10 p-4 space-y-4 max-h-[90vh] overflow-y-auto"}
        style={flotante
          ? {
              /* Colgado de la esquina del boton, no centrado en pantalla: el
                 panel crece DESDE el "+" — transform-origin en la esquina que lo
                 toca. Un panel que se abre desde otro sitio se lee como si
                 viniera de otro lado. Escala desde 0.96, nunca desde 0: nada en
                 el mundo real aparece de la nada. 190ms con ease-out fuerte, que
                 es lo que pide un popover de este tamaño. */
              top: Math.min(anchor!.bottom + 10, window.innerHeight - 380),
              left: Math.min(Math.max(anchor!.right - 460, 16), window.innerWidth - 476),
              width: 460,
              maxHeight: "min(560px, calc(100vh - 120px))",
              transformOrigin: "top right",
              /* Gris del material de la app (#211f26), no negro pleno: sobre el
                 feed oscurecido el zinc-950 se fundia en un bloque sin cuerpo
                 (Paco 2026-08-04). El mismo gris del panel de notificaciones. */
              background: "#211f26",
              boxShadow: "0 26px 60px -20px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.06)",
              animation: "composerPop 300ms cubic-bezier(.23,1,.32,1) both",
            }
          : { bottom: SHEET_BOTTOM, paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)", animation: SHEET_ENTER }}
      >

        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">{t("cmNewPost")}</span>
          <button onClick={onClose}><X className="h-5 w-5 text-zinc-500" /></button>
        </div>

        {/* Category selector */}
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                category === cat.id ? "bg-amber-500 text-black" : "bg-white/5 text-zinc-400 hover:text-white"
              }`}
            >
              <span>{cat.emoji}</span>
              {t(cat.label)}
            </button>
          ))}
        </div>

        {/* Text input */}
        <textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder={t("cmPlaceholder")}
          maxLength={500}
          rows={3}
          autoFocus
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-amber-500 resize-none"
        />

        {/* Media preview */}
        {mediaUrl && (
          <div className="relative">
            {(mediaType === "image" || mediaType === "gif") && (
              <img src={mediaUrl} className="w-full max-h-40 rounded-xl object-cover" alt="" />
            )}
            {mediaType === "audio" && (
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-400">
                <Music2 className="h-4 w-4 text-amber-500" />
                <span className="truncate">{mediaName}</span>
              </div>
            )}
            <button
              onClick={clearMedia}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center"
            >
              <X className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        )}

        {mediaType === "video-embed" && linkUrl && (
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-400">
            <span>▶</span>
            <span className="truncate flex-1">{linkUrl}</span>
            <button onClick={clearMedia}><X className="h-3.5 w-3.5" /></button>
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setShowMelody(true)}
              className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition"
              title={t("cmAdjuntarAudio")}
            >
              <Music2 className="h-4 w-4 text-zinc-400" />
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition"
              title={t("cmAdjuntarImagen")}
            >
              <ImageIcon className="h-4 w-4 text-zinc-400" />
            </button>
            <button
              onClick={() => setShowGif(true)}
              className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition"
              title={t("cmAdjuntarGif")}
            >
              <SmilePlus className="h-4 w-4 text-zinc-400" />
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canPost || submitting}
            className="px-5 h-9 rounded-xl bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition disabled:opacity-40"
          >
            {submitting ? "..." : "Post"}
          </button>
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
      </div>

      {showMelody && (
        <MelodyPicker
          onSelect={(url, name) => { setMediaUrl(url); setMediaType("audio"); setMediaName(name); }}
          onClose={() => setShowMelody(false)}
        />
      )}
      {showGif && (
        <GifPicker
          onSelect={(url) => { setMediaUrl(url); setMediaType("gif"); }}
          onClose={() => setShowGif(false)}
        />
      )}
    </>,
    document.body
  );
}
