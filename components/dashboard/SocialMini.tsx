"use client";

/* ═══════════════════════════════════════════════════════════════
   AUDIENCE — la gente que te sigue, resumida.

   Se llamaba "Social reach" y estaba mal dicho: reach es alcance, o sea
   cuanta gente VIO algo en una ventana de tiempo. Lo que aqui se muestra es
   cuanta gente te sigue, que es otra cosa y no se mueve igual. Ademas encaja
   mejor con la postura de Fennec: audiencia es gente, alcance es impresiones
   (Paco 2026-08-03).

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
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
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
  igFollowers, ttFollowers, ytSubs, onConnect, ancho = false,
}: {
  igFollowers?: number | null;
  ttFollowers?: number | null;
  ytSubs?: number | null;
  onConnect?: () => void;
  /** Version de ancho completo, para cuando vive en su propia fila y no en la
   *  columna de 320px: el total crece y las plataformas se reparten a lo largo
   *  en vez de apilarse. */
  ancho?: boolean;
}) {
  const { t } = useTranslation();
  const tam = ancho ? 15 : 11;
  const platforms: Platform[] = [
    { key: "ig", icon: <SiInstagram size={tam} style={{ color: "#E1306C" }} />, value: igFollowers ?? null },
    { key: "tt", icon: <SiTiktok size={tam} style={{ color: "#e6e6e9" }} />, value: ttFollowers ?? null },
    { key: "yt", icon: <SiYoutube size={tam} style={{ color: "#FF0000" }} />, value: ytSubs ?? null },
  ];

  const connected = platforms.filter((p) => p.value != null);
  const total = connected.reduce((sum, p) => sum + (p.value ?? 0), 0);

  const NOMBRE: Record<Platform["key"], string> = { ig: "Instagram", tt: "TikTok", yt: "YouTube" };

  /* A lo ancho el apilado no tiene sentido: sobra sitio para poner el total y
     las tres plataformas en un solo renglon, con el nombre de cada una escrito
     (en 320px solo cabia el icono).

     TODO en una linea, no en dos: la fila solo dispone de ~82px de alto en una
     ventana de 720 —el resto se lo llevan la tarjeta de ID, las metricas y la
     rejilla del año— y una version de dos renglones se salia por abajo, que en
     un dashboard sin scroll significa que se corta (medido 2026-08-03). */
  if (ancho) {
    return (
      /* Sin h-full: la fila mide por contenido (auto), y un alto en porcentaje
         contra un alto indefinido colapsa — con h-full el panel se quedaba en
         27.5px y el numero se salia (medido 2026-08-03). */
      <Tile label={t("audience")}>
        <div className="flex items-center gap-7 py-1">
          <button type="button" onClick={onConnect} className="flex flex-shrink-0 items-baseline gap-2 text-left">
            <b className="text-[26px] font-extrabold tabular-nums leading-none text-white">
              {connected.length ? fmt(total) : "—"}
            </b>
            <span className="text-[9.5px] uppercase tracking-[0.16em] text-zinc-500">
              {connected.length ? t("followingYou") : t("notConnected")}
            </span>
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            {platforms.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={onConnect}
                title={p.value == null ? "Connect" : undefined}
                className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-1.5 text-left transition ${
                  p.value == null ? "opacity-45 hover:opacity-80" : "hover:bg-white/[0.05]"
                }`}
              >
                <span className="flex-shrink-0">{p.icon}</span>
                <b className="text-[15px] font-bold tabular-nums leading-none text-zinc-200">
                  {p.value == null ? t("connect") : fmt(p.value)}
                </b>
                <span className="min-w-0 truncate text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                  {NOMBRE[p.key]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Tile>
    );
  }

  return (
    /* Dos renglones, no uno. En la columna angosta (320px) el total más tres
       chips en línea desbordaba y YouTube quedaba fuera del recuadro
       (Paco 2026-08-02, visto en el harness). Apilado cabe con holgura y
       además el total gana el peso que le toca. */
    <Tile label={t("audience")}>
      <button
        type="button"
        onClick={onConnect}
        className="flex items-baseline gap-1.5 text-left"
      >
        <b className="text-[19px] font-extrabold tabular-nums leading-none text-white">
          {connected.length ? fmt(total) : "—"}
        </b>
        <span className="text-[9px] uppercase tracking-[0.16em] text-zinc-500">
          {connected.length ? t("followingYou") : t("notConnected")}
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
