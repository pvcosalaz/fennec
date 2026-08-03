"use client";

/* ═══════════════════════════════════════════════════════════════
   STUDIO BACKDROP — the producer's room behind the home screen.

   Off by default: the dashboard looks exactly as it does today
   until someone uploads a photo, so nobody gets a redesign they
   didn't ask for (Paco 2026-08-02).

   The veil is computed from the photo's own brightness at upload
   (see lib/studioPhoto). That's what makes this safe to hand to
   strangers: a white-walled room in daylight gets pushed down hard,
   a dark studio barely gets touched, and the cards on top stay
   readable either way without asking anyone to fiddle with a slider.
   ═══════════════════════════════════════════════════════════════ */

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { prepareStudioPhoto, scrimOpacity } from "@/lib/studioPhoto";
import { uploadStudioPhoto, updateProfile } from "@/lib/communityDb";

/**
 * Pull a readable message out of whatever was thrown.
 *
 * The first version only handled `Error`, so every Supabase failure — which
 * arrives as a plain object with `message`/`hint`, not an Error instance —
 * collapsed into a bare "Upload failed" and told Paco nothing (2026-08-02).
 * An error message that doesn't say what went wrong is barely better than
 * silence.
 */
function readError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object") {
    const o = e as { message?: unknown; error?: unknown; hint?: unknown };
    const msg = typeof o.message === "string" ? o.message
      : typeof o.error === "string" ? o.error
      : null;
    if (msg) {
      /* Translated into the actual fix, because these three are the ones that
         really happen and their raw wording points nowhere useful.

         The schema-cache one is its own case on purpose: PostgREST keeps a
         cached column list, so a migration that HAS run still fails until it
         reloads. Telling Paco to "run the migration" there sent him to redo
         something already done (2026-08-02). */
      if (/schema cache/i.test(msg)) {
        return "Supabase hasn't picked up the new columns yet. Reload its schema and retry.";
      }
      if (/column .*studio_photo|does not exist/i.test(msg)) {
        return "The studio photo columns are missing — run the migration.";
      }
      if (/row-level security|not authorized|permission|denied/i.test(msg)) {
        return "Storage rejected the upload (permissions).";
      }
      return msg;
    }
  }
  return "Upload failed";
}

/** The image + its veil. Sits behind the dashboard's own content. */
export function StudioBackdrop({ url, luma }: { url: string; luma: number | null }) {
  const scrim = scrimOpacity(luma);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${url})` }}
      />
      {/* Flat veil for legibility, plus a vertical gradient so the top (where
          the greeting and the ID card live) is calmer than the bottom. */}
      <div className="absolute inset-0" style={{ background: `rgba(10,9,13,${scrim})` }} />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,9,13,0.55) 0%, rgba(10,9,13,0.12) 42%, rgba(10,9,13,0.62) 100%)",
        }}
      />
    </div>
  );
}

/**
 * Upload / replace / remove. Deliberately a quiet text button rather than a
 * dropzone: it's a once-a-year action and shouldn't take space on a screen
 * you open daily.
 */
export function StudioPhotoControl({
  userId,
  hasPhoto,
  onChange,
}: {
  userId: string;
  hasPhoto: boolean;
  onChange: (url: string | null, luma: number | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    try {
      const { blob, luma } = await prepareStudioPhoto(file);
      const url = await uploadStudioPhoto(userId, blob);
      await updateProfile(userId, { studio_photo_url: url, studio_photo_luma: luma });
      onChange(url, luma);
    } catch (e) {
      setError(readError(e));
      console.error("studio photo upload:", e);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await updateProfile(userId, { studio_photo_url: null, studio_photo_luma: null });
      onChange(null, null);
    } catch (e) {
      setError(readError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2.5">
      {error && <span className="text-[10.5px] text-red-400">{error}</span>}

      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />

      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-600 transition hover:text-accent disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />}
        {busy ? "Uploading…" : hasPhoto ? "Change studio photo" : "Add your studio photo"}
      </button>

      {hasPhoto && !busy && (
        <button
          type="button"
          onClick={() => void remove()}
          aria-label="Remove studio photo"
          className="text-zinc-700 transition hover:text-red-400"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
