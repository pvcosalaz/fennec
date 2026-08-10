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
import { useTranslation } from "react-i18next";
import i18nInstance from "@/lib/i18n";
import { ImagePlus, Loader2, X } from "lucide-react";
import { prepareStudioPhoto, scrimOpacity } from "@/lib/studioPhoto";
import { uploadStudioPhoto, discardUploadedImage, updateProfile } from "@/lib/communityDb";

/**
 * Pull a readable message out of whatever was thrown.
 *
 * The first version only handled `Error`, so every Supabase failure — which
 * arrives as a plain object with `message`/`hint`, not an Error instance —
 * collapsed into a bare "Upload failed" and told Paco nothing (2026-08-02).
 * An error message that doesn't say what went wrong is barely better than
 * silence.
 */
function readError(e: unknown, step: "upload" | "save"): string {
  const raw = (() => {
    if (e instanceof Error) return e.message;
    if (e && typeof e === "object") {
      const o = e as { message?: unknown; error?: unknown };
      if (typeof o.message === "string") return o.message;
      if (typeof o.error === "string") return o.error;
    }
    return "";
  })();

  if (!raw) return i18nInstance.t(step === "upload" ? "sbErrorSubir" : "sbErrorGuardar");

  /* La etiqueta la decide el PASO que falló, nunca el texto del error. La
     versión anterior clasificaba por regex y le ponía "Storage rejected the
     upload" a cualquier mensaje que dijera "permission", incluido
     "permission denied for table profiles", que es de la base de datos y no
     tiene nada que ver con storage. Esa etiqueta mentirosa costó tres
     diagnósticos equivocados (2026-08-02). Si el mensaje no puede señalar el
     lugar correcto, es peor que no tener mensaje. */
  if (/schema cache/i.test(raw)) {
    return i18nInstance.t("sbErrorEsquema");
  }
  if (/violates check constraint/i.test(raw)) {
    return i18nInstance.t("sbErrorUrl");
  }

  const where = i18nInstance.t(step === "upload" ? "sbFalloSubida" : "sbFalloPerfil");
  return `${where} · ${raw}`;
}

/**
 * La foto y su velo.
 *
 * `fixed`, no `absolute`: colgaba de la columna de 1100px del dashboard, así
 * que la foto salía como un recuadro flotando sobre el canvas en vez de ser el
 * fondo (Paco 2026-08-02). Fija al viewport ocupa todo, y no hace falta
 * descontarle la barra lateral porque la barra es opaca y va en z-40, muy por
 * encima de esto: se pinta sola encima de su franja.
 *
 * Tampoco scrollea con el contenido, que es lo que quieres de un cuarto: la
 * habitación se queda quieta y las tarjetas pasan por delante.
 */
export function StudioBackdrop({ url, luma }: { url: string; luma: number | null }) {
  const scrim = scrimOpacity(luma);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${url})` }}
      />
      {/* Velo plano para legibilidad. */}
      <div className="absolute inset-0" style={{ background: `rgba(10,9,13,${scrim})` }} />
      {/* Y un degradado vertical: arriba viven el saludo y los botones, que van
          directo sobre la foto sin tarjeta que los proteja, así que esa franja
          se hunde más. El centro se deja respirar para que la foto se vea. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,9,13,0.72) 0%, rgba(10,9,13,0.34) 26%, rgba(10,9,13,0.16) 50%, rgba(10,9,13,0.66) 100%)",
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
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Los dos pasos van en try SEPARADOS. Cuando compartían uno solo era
     imposible saber cuál de los dos había fallado, y el mensaje acababa
     culpando al equivocado. */
  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    try {
      let uploaded: { url: string; path: string };
      let measuredLuma: number | null;
      try {
        const prepared = await prepareStudioPhoto(file);
        measuredLuma = prepared.luma;
        uploaded = await uploadStudioPhoto(userId, prepared.blob);
      } catch (e) {
        console.error("studio photo · upload:", e);
        setError(readError(e, "upload"));
        return;
      }

      try {
        await updateProfile(userId, {
          studio_photo_url: uploaded.url,
          studio_photo_luma: measuredLuma,
        });
      } catch (e) {
        /* La foto ya está en el bucket pero nadie la va a referenciar: se
           borra. Sin esto, cada intento fallido dejaba un JPEG huérfano
           comiendo cuota en silencio. */
        await discardUploadedImage(uploaded.path);
        console.error("studio photo · save:", e);
        setError(readError(e, "save"));
        return;
      }

      onChange(uploaded.url, measuredLuma);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await updateProfile(userId, { studio_photo_url: null, studio_photo_luma: null });
      onChange(null, null);
    } catch (e) {
      console.error("studio photo · remove:", e);
      setError(readError(e, "save"));
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
        {busy ? t("stUploading") : hasPhoto ? t("sbCambiarFoto") : t("addStudioPhoto")}
      </button>

      {hasPhoto && !busy && (
        <button
          type="button"
          onClick={() => void remove()}
          aria-label={t("sbQuitarFoto")}
          className="text-zinc-700 transition hover:text-red-400"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
