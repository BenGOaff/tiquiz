import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils";
import { Figure } from "@/components/figures/Figure";

const FIGURE_SPLIT = /(\[\[figure:[a-z0-9-]+\]\])/i;
const FIGURE_ONE = /^\[\[figure:([a-z0-9-]+)\]\]$/i;
// Retire le <p>/<div> qui entoure un shortcode (l'editeur l'enveloppe).
const FIGURE_UNWRAP = /<(p|div)>\s*(\[\[figure:[a-z0-9-]+\]\])\s*<\/\1>/gi;

/**
 * Rend du HTML riche (intro de jour, page de resultat) apres nettoyage
 * DOMPurify. Les shortcodes [[figure:cle]] sont remplaces par le schema
 * SVG correspondant. Classe .fq-rich = styles dans globals.css.
 */
export function RichContent({ html, className }: { html: string | null; className?: string }) {
  if (!html) return null;

  const normalized = html.replace(FIGURE_UNWRAP, "$2");
  const parts = normalized.split(FIGURE_SPLIT);

  return (
    <div className={cn("fq-rich text-[0.95rem] leading-relaxed", className)}>
      {parts.map((part, i) => {
        if (!part) return null;
        const fig = part.match(FIGURE_ONE);
        if (fig) return <Figure key={i} name={fig[1].toLowerCase()} />;
        const clean = DOMPurify.sanitize(part, { USE_PROFILES: { html: true } });
        if (!clean.trim()) return null;
        return <div key={i} dangerouslySetInnerHTML={{ __html: clean }} />;
      })}
    </div>
  );
}
