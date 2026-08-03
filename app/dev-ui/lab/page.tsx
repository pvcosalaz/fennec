"use client";

// Dev-only, 404s in production. El Content Lab de desktop sobre el canvas real
// del shell, para juzgar el rediseño mirándolo en vez de leyendo la descripción.
// El Lab vive detrás del login y detrás de Pro, así que sin este harness la
// única forma de verlo sería en producción.

import { notFound } from "next/navigation";
import { CANVAS_BG, Grain, Atmosphere } from "@/components/desktop/surfaces";
import MusicContentLab from "@/components/content/MusicContentLab";

export default function LabDevPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className="min-h-[100dvh]" style={{ background: CANVAS_BG }}>
      <Grain />
      <Atmosphere />
      <div className="relative z-10 mx-auto max-w-[1100px] px-8 py-10">
        <MusicContentLab
          isDesktop
          onClose={() => {}}
          onGenerateScript={(ref) => console.log("generate:", ref)}
        />
      </div>
    </div>
  );
}
