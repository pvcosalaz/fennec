"use client";
import { useState, useRef } from "react";
import { X, Music2, ImageIcon, SmilePlus } from "lucide-react";
import { createPost, uploadImage } from "@/lib/communityDb";
import type { Profile, Post, PostCategory, MediaType } from "@/lib/communityTypes";
import { CATEGORIES } from "@/lib/communityTypes";
import MelodyPicker from "./MelodyPicker";
import GifPicker from "./GifPicker";

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

export default function ComposerSheet({ profile, onClose, onPostCreated, initialMediaUrl, initialMediaType, initialMediaName }: Props) {
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
  const fileRef = useRef<HTMLInputElement>(null);

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

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-zinc-950 border-t border-white/10 p-4 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Nuevo post</span>
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
              {cat.label}
            </button>
          ))}
        </div>

        {/* Text input */}
        <textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="¿Qué está pasando en tu estudio?"
          maxLength={500}
          rows={3}
          autoFocus
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-amber-500 resize-none"
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
              title="Adjuntar audio del Melody Bank"
            >
              <Music2 className="h-4 w-4 text-zinc-400" />
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition"
              title="Adjuntar imagen"
            >
              <ImageIcon className="h-4 w-4 text-zinc-400" />
            </button>
            <button
              onClick={() => setShowGif(true)}
              className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition"
              title="Adjuntar GIF"
            >
              <SmilePlus className="h-4 w-4 text-zinc-400" />
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canPost || submitting}
            className="px-5 h-9 rounded-xl bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition disabled:opacity-40"
          >
            {submitting ? "..." : "Publicar"}
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
    </>
  );
}
