"use client";

/* Dev-only, 404s en produccion: el DockNav suelto para verificar la
   magnificacion sin login (el nav real vive detras del auth). */

import { useState } from "react";
import { notFound } from "next/navigation";
import { Briefcase, Camera, Home, AudioWaveform, Users } from "lucide-react";
import DockNav from "@/components/ui/DockNav";

export default function DevDock() {
  if (process.env.NODE_ENV === "production") notFound();
  const [active, setActive] = useState("dashboard");
  const tabs = [
    { id: "pricing", label: "Business", icon: Briefcase },
    { id: "contenido", label: "Content", icon: Camera },
    { id: "dashboard", label: "Home", icon: Home },
    { id: "ideas", label: "The Tape", icon: AudioWaveform },
    { id: "noticias", label: "Community", icon: Users },
  ];
  return (
    <main className="flex min-h-screen flex-col justify-end bg-black">
      <nav className="shrink-0 border-t border-white/[0.06]" style={{ background: "rgba(10,9,8,.94)" }}>
        <DockNav tabs={tabs} activeTab={active} onSelect={setActive} />
      </nav>
    </main>
  );
}
