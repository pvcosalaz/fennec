"use client";

// El dock de la app con magnificacion macOS (Paco 2026-08-31, puerto del
// Dock de react-bits): cada icono crece segun la cercania del cursor, con
// springs de `motion`. En touch no hay mouse, mouseX se queda en Infinity y
// la barra se comporta EXACTO igual que antes: esto solo agrega juego donde
// hay puntero (desktop angosto, iPad con trackpad). Los visuales (Home
// elevado con el zorro, subrayado del activo, safe-area) son los mismos que
// tenia el nav inline; solo se movieron aqui.
import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "motion/react";

const SPRING = { mass: 0.1, stiffness: 150, damping: 12 };
const DIST = 140;          // radio de influencia del cursor, en px

type DockTab = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

function DockItem({
  mouseX, mag, onClick, ariaLabel, ariaCurrent, className, children,
}: {
  mouseX: MotionValue<number>;
  mag: number;
  onClick: () => void;
  ariaLabel?: string;
  ariaCurrent?: "page";
  className: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const dist = useTransform(mouseX, (v: number) => {
    const r = ref.current?.getBoundingClientRect();
    return r ? v - (r.x + r.width / 2) : Infinity;
  });
  const target = useTransform(dist, [-DIST, 0, DIST], [1, mag, 1]);
  const scale = useSpring(target, SPRING);
  const y = useTransform(scale, [1, mag], [0, -7]);

  return (
    <motion.button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
      className={className}
      style={{ scale, y, transformOrigin: "bottom center", WebkitTapHighlightColor: "transparent" }}
    >
      {children}
    </motion.button>
  );
}

export default function DockNav({
  tabs, activeTab, onSelect,
}: {
  tabs: DockTab[];
  activeTab: string;
  onSelect: (id: string) => void;
}) {
  const mouseX = useMotionValue(Infinity);

  return (
    <div
      className="mx-auto flex w-full max-w-2xl items-center px-2 pt-2"
      style={{ paddingBottom: "max(calc(env(safe-area-inset-bottom) + 18px), 28px)" }}
      onMouseMove={(e) => mouseX.set(e.clientX)}
      onMouseLeave={() => mouseX.set(Infinity)}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const isHome = tab.id === "dashboard";

        if (isHome) {
          return (
            <DockItem
              key={tab.id}
              mouseX={mouseX}
              mag={1.12}
              onClick={() => onSelect(tab.id)}
              ariaLabel={tab.label}
              className="flex flex-1 flex-col items-center justify-center py-3 transition"
            >
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full transition-transform duration-200 active:scale-95"
                style={{
                  marginTop: -26,
                  background: isActive
                    ? "linear-gradient(160deg, #ffc14d 0%, var(--accent, #f5a623) 55%, #e0822a 100%)"
                    : "linear-gradient(160deg, #2a2a2e 0%, #1c1c20 100%)",
                  boxShadow: isActive
                    ? "inset 0 1px 0 rgba(255,255,255,0.35), 0 0 0 6px rgba(10,9,8,0.94)"
                    : "inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 6px rgba(10,9,8,0.94)",
                }}
              >
                <img
                  src="/fennec-icon-transparent.png"
                  alt={tab.label}
                  style={{
                    width: 38, height: 38, objectFit: "contain",
                    filter: isActive ? "brightness(0)" : "brightness(0) invert(1)",
                    opacity: isActive ? 1 : 0.55,
                    transition: "opacity 0.25s ease, filter 0.25s ease",
                  }}
                />
              </div>
            </DockItem>
          );
        }

        return (
          <DockItem
            key={tab.id}
            mouseX={mouseX}
            mag={1.45}
            onClick={() => onSelect(tab.id)}
            ariaLabel={tab.label}
            ariaCurrent={isActive ? "page" : undefined}
            className={`flex flex-1 flex-col items-center justify-center py-3 transition ${
              isActive ? "text-accent" : "text-zinc-500"
            }`}
          >
            <Icon className="h-6 w-6" />
            {isActive && <div className="mt-1.5 h-0.5 w-4 rounded-full bg-accent" />}
          </DockItem>
        );
      })}
    </div>
  );
}
