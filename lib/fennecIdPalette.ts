// lib/fennecIdPalette.ts

export type FennecIdColor = {
  id: string;
  accent: string;
  dark1: string;
  dark2: string;
  glowRgb: string;
  textOnAvatar: "white" | "black";
};

export const FENNEC_ID_PALETTE: FennecIdColor[] = [
  { id: "blue",   accent: "#4d96ff", dark1: "#1a1a2e", dark2: "#0f0f1a", glowRgb: "77,150,255",   textOnAvatar: "white" },
  { id: "green",  accent: "#6bcb77", dark1: "#1a2e1a", dark2: "#0f1a0f", glowRgb: "107,203,119",  textOnAvatar: "black" },
  { id: "purple", accent: "#c77dff", dark1: "#2e1a2e", dark2: "#1a0f1a", glowRgb: "199,125,255",  textOnAvatar: "black" },
  { id: "red",    accent: "#ff6b6b", dark1: "#2e1a1a", dark2: "#1a0f0f", glowRgb: "255,107,107",  textOnAvatar: "black" },
  { id: "amber",  accent: "#f5a623", dark1: "#2e2214", dark2: "#1a1209", glowRgb: "245,166,35",   textOnAvatar: "black" },
  { id: "cyan",   accent: "#00d4ff", dark1: "#0f2030", dark2: "#081520", glowRgb: "0,212,255",    textOnAvatar: "black" },
  { id: "pink",   accent: "#ff6eb4", dark1: "#2e1a26", dark2: "#1a0f17", glowRgb: "255,110,180",  textOnAvatar: "black" },
  { id: "lime",   accent: "#b5ff6b", dark1: "#1e2e0f", dark2: "#111a09", glowRgb: "181,255,107",  textOnAvatar: "black" },
  { id: "indigo", accent: "#818cf8", dark1: "#1a1a35", dark2: "#0f0f22", glowRgb: "129,140,248",  textOnAvatar: "white" },
  { id: "orange", accent: "#ff9f43", dark1: "#2e1f0f", dark2: "#1a120a", glowRgb: "255,159,67",   textOnAvatar: "black" },
  { id: "teal",   accent: "#2ed573", dark1: "#0f2e20", dark2: "#091a13", glowRgb: "46,213,115",   textOnAvatar: "black" },
  { id: "rose",   accent: "#ff4757", dark1: "#2e0f14", dark2: "#1a090c", glowRgb: "255,71,87",    textOnAvatar: "white" },
];

export function getColorScheme(colorId: string | null | undefined): FennecIdColor {
  return FENNEC_ID_PALETTE.find((c) => c.id === colorId) ?? FENNEC_ID_PALETTE[0];
}

export function randomColorId(): string {
  return FENNEC_ID_PALETTE[Math.floor(Math.random() * FENNEC_ID_PALETTE.length)].id;
}
