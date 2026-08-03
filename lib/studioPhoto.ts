"use client";

/* ═══════════════════════════════════════════════════════════════
   STUDIO PHOTO — the producer's room behind their dashboard.

   Paco's ask (2026-08-02): let each producer upload a photo of their
   studio and have it sit behind the home screen, so the app feels
   like their headquarters instead of a template.

   Two things make this safe rather than a readability disaster:

   1 · The photo is COMPRESSED IN THE BROWSER before upload. A phone
       snap is 4-8MB; nobody should pay that on every dashboard load.
       1600px wide at q0.82 lands around 200-400KB and still looks
       sharp behind a scrim.

   2 · The SCRIM IS COMPUTED FROM THE PHOTO, once, at upload. A dark
       studio needs almost no veil; a white-walled room in daylight
       needs a lot. Measuring here means the dashboard just reads a
       number instead of analysing pixels on every render, and the
       cards stay legible no matter what anyone uploads.
   ═══════════════════════════════════════════════════════════════ */

/** Anything bigger is almost certainly a raw camera file, not a room photo. */
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024; // 12MB
const TARGET_WIDTH = 1600;
const JPEG_QUALITY = 0.82;

export type StudioPhoto = { blob: Blob; luma: number };

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read that image")); };
    img.src = url;
  });
}

/**
 * Perceived brightness, 0 (black) to 1 (white).
 *
 * Sampled from a 64px thumbnail rather than the full image: the average of a
 * downscaled copy is the same number for a thousandth of the work. Uses the
 * Rec. 709 luma weights because green reads far brighter to the eye than blue,
 * and a flat RGB average would call a green-lit room darker than it looks.
 */
function measureLuma(img: HTMLImageElement): number {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 0.5;
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
  }
  return sum / (data.length / 4);
}

/** Downscale + re-encode, and measure while the pixels are already decoded. */
export async function prepareStudioPhoto(file: File): Promise<StudioPhoto> {
  if (!file.type.startsWith("image/")) throw new Error("That file isn't an image");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("That image is over 12MB");

  const img = await loadImage(file);
  const luma = measureLuma(img);

  const scale = Math.min(1, TARGET_WIDTH / img.naturalWidth);
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser can't process images");
  ctx.drawImage(img, 0, 0, w, h);

  const blob = await new Promise<Blob | null>((r) =>
    canvas.toBlob(r, "image/jpeg", JPEG_QUALITY));
  if (!blob) throw new Error("Could not compress that image");

  return { blob, luma };
}

/**
 * The veil, derived from the photo's own brightness.
 *
 * A dark room barely needs one; a bright room needs to be pushed well down or
 * the amber numbers on top disappear. The floor of 0.42 exists because even a
 * near-black photo has highlights, and a card sitting on a specular window
 * reflection is the one place text breaks.
 */
export function scrimOpacity(luma: number | null | undefined): number {
  const l = typeof luma === "number" && Number.isFinite(luma) ? luma : 0.5;
  /* Aflojado el 2026-08-02. La curva original (0.34 + l*0.62, tope 0.9) era la
     única defensa de la legibilidad, así que con una foto luminosa subía a 0.72
     y borraba el cuarto: quedaba un rectángulo gris con la textura apenas
     insinuada, que es justo lo contrario de lo que se pidió.
     Ahora el texto lo protegen los paneles opacos (TILE_BG_OVER_PHOTO), y el
     velo solo tiene que evitar que la foto compita, no taparla. Sigue subiendo
     con el brillo: un cuarto blanco a mediodía se hunde más que uno oscuro. */
  /* Subido dos veces el 2026-08-03. La foto seguía leyéndose como contenido y
     no como fondo: se ve original y está buena, pero compite. Un fondo tiene
     que poder ignorarse.

     La curva SIGUE siendo por foto, no un valor plano: se calcula del brillo
     medido de la imagen de cada quien al subirla. Un estudio a oscuras recibe
     0.62 y se sigue distinguiendo; una pared blanca a mediodía llega a 0.90 y
     se hunde. Así cada productor conserva su cuarto sin que a nadie se le
     coma la interfaz.

     Oscurecer solo puede MEJORAR el contraste del texto claro, así que la
     cuenta del alpha del vidrio (0.78) sigue valiendo. */
  return Math.min(0.90, Math.max(0.62, 0.56 + l * 0.40));
}
