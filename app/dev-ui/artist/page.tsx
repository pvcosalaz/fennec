"use client";

// Dev-only, 404s en produccion. El Business de artista vive detras de una
// sesion con account_type='artist', que hoy no existe en produccion: aqui se
// monta suelto. Las llamadas a Supabase fallan sin sesion y el hub aguanta
// (console.error y sigue), asi que se puede mirar el layout, la tabuladora y
// el flujo de alta aunque nada persista.

import { notFound } from "next/navigation";
import ArtistBusinessHub from "@/components/artist/ArtistBusinessHub";

export default function DevArtist() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="min-h-screen bg-[#0b0a08]">
      <ArtistBusinessHub userId="00000000-0000-0000-0000-000000000005" />
    </main>
  );
}
