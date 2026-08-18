"use client";

/* Despliega el Fennec ID de alguien sobre lo que estes viendo.
 *
 * Nace para el perfil de Community, que enseñaba banner, avatar, nombre y dB
 * pero NO la credencial, aunque si sale en tu Dashboard, en tu red y en tu
 * perfil publico. Ponerla ahi tal cual dejaba a la misma persona retratada dos
 * veces en la misma pantalla (Paco 2026-08-18), asi que no vive en la pagina:
 * se despliega desde un boton y se va.
 *
 * El gesto es el del Dashboard, no uno nuevo: las curvas viven en
 * lib/fennecIdMotion.ts y las usan los dos.
 */

import { useEffect, useRef, useState } from "react";
import FennecIdCard from "./FennecIdCard";
import { getColorScheme } from "@/lib/fennecIdPalette";
import type { Profile } from "@/lib/communityTypes";
import {
  FENNEC_ID_OPEN, FENNEC_ID_CLOSE, FENNEC_ID_EXIT_MS, FENNEC_ID_ACTIONS_DELAY,
} from "@/lib/fennecIdMotion";

/** El nombre de la tarjeta va en dos lineas: pila y resto. Misma reparticion
 *  que en el Dashboard, para que la credencial de alguien se lea igual en
 *  todos los sitios donde aparece. */
function partirNombre(p: Profile) {
  const nombre = (p.display_name || p.username || "").trim();
  const partes = nombre.split(/\s+/).filter(Boolean);
  return {
    first: partes[0] ?? "",
    last: partes.slice(1).join(" "),
    initials: partes.length >= 2
      ? (partes[0][0] + partes[1][0]).toUpperCase()
      : nombre.slice(0, 2).toUpperCase(),
  };
}

export default function FennecIdSheet({
  profile, open, onClose,
}: {
  profile: Profile;
  open: boolean;
  onClose: () => void;
}) {
  /* `montado` sobrevive a `open:false` los milisegundos que dura la salida: sin
     eso el nodo desaparece de golpe y no hay animacion de cierre, solo un corte. */
  const [montado, setMontado] = useState(open);
  const [dentro, setDentro] = useState(false);
  /* Quien pidio menos movimiento no recibe el muelle ni el recorrido: solo el
     fundido. El rebote es lo primero que marea, y aqui no lleva informacion que
     se pierda al quitarlo. */
  const quieto = useRef(false);
  if (typeof window !== "undefined") {
    quieto.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }

  useEffect(() => {
    if (open) {
      setMontado(true);
      /* Dos rAF: el primero deja que el navegador pinte la tarjeta chica y
         transparente, el segundo dispara la transicion. Con uno solo el
         navegador agrupa los dos estados y no hay nada que animar. */
      const r = requestAnimationFrame(() => requestAnimationFrame(() => setDentro(true)));
      return () => cancelAnimationFrame(r);
    }
    setDentro(false);
    const t = setTimeout(() => setMontado(false), FENNEC_ID_EXIT_MS);
    return () => clearTimeout(t);
  }, [open]);

  // Escape cierra, y mientras esta abierto no se scrollea lo de atras.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previo;
    };
  }, [open, onClose]);

  if (!montado) return null;

  const { first, last, initials } = partirNombre(profile);
  const scheme = getColorScheme(profile.color_id);
  const nombre = profile.display_name || profile.username;

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        style={{
          position: "fixed", inset: 0, zIndex: 99,
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
          opacity: dentro ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
      />
      <div
        role="dialog" aria-modal="true" aria-label={`Fennec ID de ${nombre}`}
        style={{
          position: "fixed", left: "50%", top: "50%",
          width: "min(380px, calc(100vw - 40px))",
          zIndex: 100,
          opacity: dentro ? 1 : 0,
          /* Nunca desde scale(0): nada real aparece de la nada. */
          transform: quieto.current
            ? "translate(-50%, -50%)"
            : dentro
              ? "translate(-50%, -50%) scale(1)"
              : "translate(-50%, calc(-50% + 14px)) scale(0.92)",
          transformOrigin: "center center",
          transition: quieto.current
            ? "opacity 0.15s ease"
            : `transform ${dentro ? FENNEC_ID_OPEN : FENNEC_ID_CLOSE}, opacity ${dentro ? "0.28s ease-out" : "0.2s ease-in"}`,
          willChange: "transform, opacity",
        }}
      >
        <FennecIdCard
          firstName={first}
          lastName={last}
          role={profile.role ?? "Producer"}
          country={profile.country ?? ""}
          genres={profile.genres ?? []}
          fennecDb={profile.fennec_db_score ?? 0}
          colorScheme={scheme}
          collectionNumber={profile.fennec_number ?? undefined}
          initials={initials}
          avatarUrl={profile.avatar_url}
          instagram={profile.instagram}
          spotify={profile.spotify}
          youtube={profile.youtube_url}
          hideZeroDb
        />

        <div
          style={{
            display: "flex", gap: 10, marginTop: 12,
            opacity: dentro ? 1 : 0,
            transform: quieto.current ? "none" : dentro ? "translateY(0)" : "translateY(8px)",
            transition: quieto.current
              ? "opacity 0.15s ease"
              : `opacity 0.3s ease ${dentro ? FENNEC_ID_ACTIONS_DELAY : "0s"}, transform 0.3s cubic-bezier(.16,1,.3,1) ${dentro ? FENNEC_ID_ACTIONS_DELAY : "0s"}`,
          }}
        >
          <button
            onClick={() => {
              /* Se comparte la pagina publica y no un texto suelto: /u/username
                 tiene su imagen OG, asi que en WhatsApp se despliega la tarjeta
                 en vez de un enlace pelado. Mismo criterio que en el Dashboard. */
              const url = `https://app.fennec.audio/u/${profile.username}`;
              const text = `@${profile.username} — ${profile.fennec_db_score ?? 0} dB on Fennec`;
              if (navigator.share) void navigator.share({ title: `Fennec ID · ${nombre}`, text, url });
              else void navigator.clipboard?.writeText(url);
            }}
            className="flex-1 rounded-2xl py-3 text-[13px] font-bold transition active:scale-[0.96]"
            style={{
              background: `${scheme.accent}18`,
              border: `1px solid ${scheme.accent}30`,
              color: scheme.accent,
            }}
          >
            Share
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border border-white/10 bg-white/[0.06] py-3 text-[13px] font-bold text-white/70 transition active:scale-[0.96]"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
