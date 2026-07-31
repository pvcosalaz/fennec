"use client";

import { useState, useEffect, useRef } from "react";
import FennecFox from "@/components/dashboard/FennecFox";

/* Pre-launch curtain shown at the app root (app.fennec.audio) while
   NEXT_PUBLIC_COMING_SOON is on. Keeps the public out of the unlaunched app
   and points them at the waitlist. Bilingual (ES default for the campaign
   audience). The bypass link lives in ComingSoonGate. */

const COPY = {
  es: {
    eyebrow: "Muy pronto",
    heading: "Fennec está por llegar.",
    sub: "Tu hub de negocio y comunidad musical. Estamos afinando los últimos detalles. Déjanos tu correo y serás de los primeros en entrar.",
    cta: "Únete a la waitlist",
  },
  en: {
    eyebrow: "Coming soon",
    heading: "Fennec is almost here.",
    sub: "Your music business & community hub. We're putting the final touches together. Drop your email and be among the first in.",
    cta: "Join the waitlist",
  },
};

export default function ComingSoon() {
  const [lang, setLang] = useState<"es" | "en">("es");
  useEffect(() => {
    try {
      if (!navigator.language?.toLowerCase().startsWith("es")) setLang("en");
    } catch { /* ignore */ }
  }, []);
  const t = COPY[lang];

  // Secret unlock for the installed PWA. iOS home-screen apps have isolated
  // storage from Safari, so a Safari ?acceso= bypass never reaches them. Tapping
  // the wordmark 5x sets the bypass flag in THIS context's storage and reloads,
  // so the standalone app opens straight into Fennec from then on. Keeps the
  // preview code out of the public manifest.
  const tapsRef = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function secretTap() {
    tapsRef.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => { tapsRef.current = 0; }, 1500);
    if (tapsRef.current >= 5) {
      try { localStorage.setItem("fennec-preview", "1"); } catch { /* ignore */ }
      window.location.reload();
    }
  }

  return (
    <main
      className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 py-12"
      style={{ background: "#0b0a08" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(120% 80% at 50% -10%, rgba(245,166,35,0.14), transparent 60%)" }}
      />
      <div className="relative w-full max-w-md text-center">
        <div className="mb-8 flex flex-col items-center">
          <FennecFox isActive={false} glow={false} size={92} />
          <div className="mt-2 flex items-baseline gap-1 cursor-default select-none" onClick={secretTap}>
            <span className="text-3xl font-extrabold tracking-tight text-white" style={{ letterSpacing: "-0.03em" }}>fennec</span>
            <span className="mb-1 inline-block h-[7px] w-[7px] rounded-full" style={{ background: "#f5a623", boxShadow: "0 0 10px rgba(245,166,35,0.9)" }} />
          </div>
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-accent">{t.eyebrow}</p>
        <h1 className="mt-4 text-[28px] font-bold leading-tight text-white">{t.heading}</h1>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-zinc-400">{t.sub}</p>

        <a
          href="/join"
          className="mt-8 inline-block h-12 rounded-xl bg-accent px-7 text-[15px] font-bold leading-[3rem] text-black transition hover:brightness-105 active:scale-[0.99]"
        >
          {t.cta}
        </a>

        <p className="mt-8 text-[12px] text-zinc-600">@fennec.audio</p>
      </div>
    </main>
  );
}
