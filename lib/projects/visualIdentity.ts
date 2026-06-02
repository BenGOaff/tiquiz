// lib/projects/visualIdentity.ts
//
// Visual identity helpers pour les projets multiprofils Tiquiz.
// Port direct du pattern Tipote (Béné 2 juin 2026, alignement
// "même emplacement, même design").
//
// Chaque projet (users en plan multiprofils débloqué — beta ou
// allowlist côté Tiquiz tant que le palier premium n'existe pas) peut
// être taggué d'un accent color + emoji pour qu'on identifie d'un
// coup d'œil quel projet est actif. Palette curatée TS-side pour
// rester cohérente avec le primary Tiquiz (#5D6CDB).

export interface AccentColor {
  /** Hex code stocké dans projects.accent_color */
  hex: string;
  /** Label UI pour le picker */
  label: string;
}

// 10 accent colors — choisies pour s'harmoniser avec le primary
// Tiquiz (#5D6CDB, identique à Tipote). Évite les jaunes/blancs
// ambigus et reste lisible sur fonds clairs et sombres.
export const ACCENT_COLORS: AccentColor[] = [
  { hex: "#5D6CDB", label: "Indigo (Tiquiz)" },
  { hex: "#8B5CF6", label: "Violet" },
  { hex: "#EC4899", label: "Rose" },
  { hex: "#F43F5E", label: "Framboise" },
  { hex: "#F97316", label: "Orange" },
  { hex: "#EAB308", label: "Or" },
  { hex: "#22C55E", label: "Vert" },
  { hex: "#14B8A6", label: "Teal" },
  { hex: "#0EA5E9", label: "Ciel" },
  { hex: "#64748B", label: "Ardoise" },
];

export const DEFAULT_ACCENT_COLOR = ACCENT_COLORS[0]!.hex;

// 20 emoji — set serré couvrant les niches solopreneur typiques,
// gardé suffisamment neutre pour qu'aucun choix ne soit ridicule
// quand l'user n'a rien sélectionné.
export const PROJECT_EMOJI: string[] = [
  "🚀", "💼", "🎯", "💡", "📈",
  "✨", "🔥", "🌱", "🧠", "🎓",
  "💪", "🩺", "🧘", "🛍️", "🏠",
  "🎨", "🎬", "🎙️", "📚", "🌍",
];

export const DEFAULT_EMOJI = "🚀";

export function isValidAccentColor(hex: unknown): hex is string {
  if (typeof hex !== "string") return false;
  return ACCENT_COLORS.some((c) => c.hex.toLowerCase() === hex.toLowerCase());
}

export function isValidEmoji(emoji: unknown): emoji is string {
  if (typeof emoji !== "string") return false;
  return PROJECT_EMOJI.includes(emoji);
}
