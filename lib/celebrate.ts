// lib/celebrate.ts
// Confetti zero-dependance, tire sur les vrais jalons (jour valide, badge
// reel debloque). Porte depuis Tiquiz pour garder la meme sensation de
// recompense d'une app a l'autre, sans embarquer de librairie.
//
// USAGE
//   import { celebrate } from "@/lib/celebrate";
//   celebrate();                        // burst depuis le centre
//   celebrate({ intensity: "huge" });   // gros jalon (badge, diplome)
//
// SSR-safe (no-op si window absent). Respecte prefers-reduced-motion :
// la fete est du plaisir, jamais une fonction, donc on la coupe si l'OS
// demande moins d'animation. Chaque appel cree son propre container
// auto-nettoye, donc plusieurs appels rapprochés ne s'empilent pas.

export type CelebrateOptions = {
  origin?: "center" | "top-right" | "bottom-center";
  intensity?: "subtle" | "normal" | "huge";
};

// Palette L'Atelier du Quiz : indigo primaire + couleurs gaies.
const COLORS = [
  "#5D6CDB", // indigo primaire
  "#8B5CF6", // violet
  "#F472B6", // rose
  "#FBBF24", // ambre
  "#34D399", // emeraude
  "#38BDF8", // ciel
];

const INTENSITY_PRESETS = {
  subtle: { count: 14, spread: 60, durationMs: 900 },
  normal: { count: 32, spread: 120, durationMs: 1400 },
  huge: { count: 70, spread: 220, durationMs: 1800 },
} as const;

export function celebrate(options: CelebrateOptions = {}): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const { origin = "center", intensity = "normal" } = options;
  const preset = INTENSITY_PRESETS[intensity];

  let originX = window.innerWidth / 2;
  let originY = window.innerHeight / 2;
  if (origin === "top-right") {
    originX = window.innerWidth - 80;
    originY = 80;
  } else if (origin === "bottom-center") {
    originX = window.innerWidth / 2;
    originY = window.innerHeight - 80;
  }

  const container = document.createElement("div");
  container.setAttribute("data-celebrate", "");
  container.style.cssText =
    "position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden;";
  document.body.appendChild(container);

  for (let i = 0; i < preset.count; i++) {
    const piece = document.createElement("span");
    const angle = (Math.PI * 2 * i) / preset.count + (Math.random() - 0.5) * 0.4;
    const distance = preset.spread + Math.random() * preset.spread;
    const dx = Math.cos(angle) * distance;
    // Biais de gravite : les particules tombent un peu plus vite qu'elles ne montent.
    const dy = Math.sin(angle) * distance + 60 + Math.random() * 60;
    const rotate = Math.random() * 720 - 360;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const isCircle = Math.random() > 0.5;

    piece.style.cssText = `
      position:absolute;
      left:${originX}px;
      top:${originY}px;
      width:${isCircle ? 8 : 6}px;
      height:${isCircle ? 8 : 12}px;
      background:${color};
      border-radius:${isCircle ? "50%" : "1px"};
      transform:translate(-50%,-50%) rotate(0deg);
      opacity:1;
      transition:transform ${preset.durationMs}ms cubic-bezier(0.22,1,0.36,1),opacity ${preset.durationMs}ms ease-out;
    `;
    container.appendChild(piece);

    requestAnimationFrame(() => {
      piece.style.transform = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) rotate(${rotate}deg)`;
      piece.style.opacity = "0";
    });
  }

  setTimeout(() => {
    container.remove();
  }, preset.durationMs + 100);
}
