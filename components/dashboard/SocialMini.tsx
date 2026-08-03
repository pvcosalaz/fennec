"use client";

/* ═══════════════════════════════════════════════════════════════
   SOCIAL MINI — el alcance, resumido.

   Antes era una banda de ancho completo con tres columnas y números
   de 21px, o sea el mismo peso visual que "Music & Business". Eso es
   demasiado para un dato que se consulta de reojo, y era parte de por
   qué el dashboard no cabía en una pantalla (Paco 2026-08-02).

   Ahora: un total que se lee de un vistazo y el desglose por
   plataforma en chips. La jerarquía dice la verdad, que el total es
   lo que importa y el reparto es detalle.

   Sin conectar sigue siendo accionable: la plataforma vacía aparece
   apagada y lleva a los ajustes, en vez de desaparecer y dejarte sin
   saber que se podía conectar.
   ═══════════════════════════════════════════════════════════════ */

import { SiInstagram, SiTiktok, SiYoutube } from "react-icons/si";
import { Tile } from "@/components/desktop/ui";

type Platform = {
  key: string;
  icon: React.ReactNode;
  value: number | null;
};

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

export default function SocialMini({
  igFollowers, ttFollowers, ytSubs, onConnect,
}: {
  igFollowers?: number | null;
  ttFollowers?: number | null;
  ytSubs?: number | null;
  onConnect?: () => void;
}) {
  const platforms: Platform[] = [
    { key: "ig", icon: <SiInstagram size={11} style={{ color: "#E1306C" }} />, value: igFollowers ?? null },
    { key: "tt", icon: <SiTiktok size={11} style={{ color: "#e6e6e9" }} />, value: ttFollowers ?? null },
    { key: "yt", icon: <SiYoutube size={11} style={{ color: "#FF0000" }} />, value: ytSubs ?? null },
  ];

  const connected = platforms.filter((p) => p.value != null);
  const total = connected.reduce((sum, p) => sum + (p.value ?? 0), 0);

  return (
    /* Dos renglones, no uno. En la columna angosta (320px) el total más tres
       chips en línea desbordaba y YouTube quedaba fuera del recuadro
       (Paco 2026-08-02, visto en el harness). Apilado cabe con holgura y
       además el total gana el peso que le toca. */
    <Tile label="Social reach">
      <button
        type="button"
        onClick={onConnect}
        className="flex items-baseline gap-1.5 text-left"
      >
        <b className="text-[19px] font-extrabold tabular-nums leading-none text-white">
          {connected.length ? fmt(total) : "—"}
        </b>
        <span className="text-[9px] uppercase tracking-[0.16em] text-zinc-500">
          {connected.length ? "reach" : "not connected"}
        </span>
      </button>

      <div className="mt-2 flex items-center gap-1">
        {platforms.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={onConnect}
            title={p.value == null ? "Connect" : undefined}
            className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg py-1 text-[10.5px] font-semibold tabular-nums transition ${
              p.value == null
                ? "text-zinc-600 opacity-45 hover:opacity-80"
                : "text-zinc-300 hover:bg-white/[0.05]"
            }`}
          >
            {p.icon}
            <span className="truncate">{p.value == null ? "+" : fmt(p.value)}</span>
          </button>
        ))}
      </div>
    </Tile>
  );
}
