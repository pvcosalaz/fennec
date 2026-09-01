// Proxy de Giphy (2026-08-31).
//
// Antes el navegador llamaba a Giphy directo con NEXT_PUBLIC_GIPHY_API_KEY, o
// sea que la llave viajaba dentro del bundle y cualquiera podia sacarla del
// devtools y gastarse la cuota. Ahora la llave se queda en el servidor y el
// cliente pide GIFs a esta ruta.
//
// Se acepta GIPHY_API_KEY (la nueva, privada) y como respaldo la publica de
// siempre, para que nada se rompa mientras Paco mueve la variable en Vercel.

import { NextResponse } from "next/server";
import { allowPublic } from "@/lib/publicRateLimit";

export const dynamic = "force-dynamic";

type GiphyGif = {
  id: string;
  images: { fixed_height_small: { url: string }; preview_gif: { url: string } };
};

export async function GET(req: Request) {
  const key = process.env.GIPHY_API_KEY || process.env.NEXT_PUBLIC_GIPHY_API_KEY;
  if (!key) return NextResponse.json({ gifs: [] });

  /* La cuota de Giphy es un recurso agotable: 40 busquedas por hora e IP es
     de sobra para elegir un GIF y muy poco para raspar el catalogo. */
  if (!(await allowPublic("giphy_search", req, 40))) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  const base = q
    ? "https://api.giphy.com/v1/gifs/search"
    : "https://api.giphy.com/v1/gifs/trending";
  const url = new URL(base);
  url.searchParams.set("api_key", key);
  url.searchParams.set("limit", "20");
  url.searchParams.set("rating", "g");
  if (q) url.searchParams.set("q", q);

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
    const data = await res.json() as { data?: GiphyGif[] };
    return NextResponse.json({
      gifs: (data.data ?? []).map((g) => ({
        id: g.id,
        url: g.images.fixed_height_small.url,
        preview: g.images.preview_gif.url,
      })),
    });
  } catch (e) {
    // El detalle se queda aqui; afuera solo una lista vacia.
    console.error("[giphy] busqueda fallida:", e);
    return NextResponse.json({ gifs: [] });
  }
}
