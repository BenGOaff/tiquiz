// Sanitizer + helpers for rich text fields (intro, results, etc.).
// Works on both server (SSR) and browser — isomorphic-dompurify picks the
// right DOMPurify instance automatically.

import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p", "br", "b", "strong", "i", "em", "u", "s",
  "a", "img",
  "ul", "ol", "li",
  "blockquote", "code", "pre",
  "h1", "h2", "h3", "h4",
  "span", "div",
];

const ALLOWED_ATTR = [
  "href", "target", "rel",
  "src", "alt", "title",
  "style",
  "class",
];

// Propriétés CSS qu'on RETIRE inconditionnellement des `style="..."`.
// Drame Bene 8 juin 2026 : la taille de police PAR MOT (spans avec
// font-size / --fs-m / --fs-d inseres par la toolbar) cassait le rendu
// des titres/questions - des mots a des tailles differentes au hasard,
// parce que ces spans survivaient dans le HTML sauvegarde et entraient
// en conflit avec la taille FIELD-LEVEL du composant. Decision : la
// taille par mot dans un titre rich-text est fondamentalement non
// fiable (les SaaS premium ne le font jamais). On STRIP donc toute
// taille inline ici, ce qui nettoie AUSSI les contenus deja sauvegardes
// au moment du rendu (pas besoin de migration DB).
//
// Ce qu'on garde : color, background, text-align, font-weight,
// text-decoration - les proprietes que l'user personnalise legitimement
// via la toolbar (gras, couleur, alignement). La TAILLE est geree au
// niveau du champ par le design system (responsive mobile/PC).
const STRIPPED_CSS_PROPS = new Set([
  "font-size", "font-family", "line-height", "letter-spacing",
  "word-spacing", "font-stretch",
]);

// Sur les <img>, on autorise une largeur en % ou en px (drame Christelle :
// le GIF d'intro n'avait aucun contrôle de taille). Les autres elements
// gardent leur comportement responsive du design system.
const IMG_WIDTH_RE = /^\d{1,3}(?:\.\d+)?%$|^\d{1,4}px$/i;

// Taille de police AU NIVEAU DU CHAMP (drame Bene 8 juin 2026). Un seul
// wrapper <div class="rt-field-fs" style="--rt-fs: Xpx"> par champ, UNE
// taille pour tout le bloc (jamais par mot -> rendu fiable). On
// whiteliste la classe `rt-field-fs` et la valeur de --rt-fs.
// IMPORTANT : c'est DIFFERENT de l'ancien systeme par mot (rt-fs,
// --fs-m, --fs-d) qui reste strippe pour nettoyer les contenus casses.
const FIELD_FS_CLASS = "rt-field-fs";
const FIELD_ALLOWED_SIZES = new Set([
  "14px", "16px", "18px", "20px", "24px", "28px", "32px", "40px", "48px", "56px", "64px",
]);

// Hook DOMPurify enregistré une seule fois au load du module. S'applique
// à toutes les sanitisations suivantes (server + client).
let _hookInstalled = false;
function installStyleStripperHook(): void {
  if (_hookInstalled) return;
  _hookInstalled = true;

  // Hook 1 : nettoie les classes legacy de l'ancien systeme font-size
  // par mot (`rt-fs`). Sans ca, les spans deja sauvegardes garderaient
  // la classe et le CSS .rt-fs (s'il existait) s'appliquerait. On retire
  // la classe ; si l'element n'a plus aucune classe utile, DOMPurify le
  // garde tel quel (un span sans style ni classe = no-op au rendu).
  DOMPurify.addHook("uponSanitizeAttribute", (_node: Element, data: { attrName: string; attrValue: string }) => {
    if (data.attrName !== "class" || typeof data.attrValue !== "string") return;
    const kept = data.attrValue
      .split(/\s+/)
      // Strip l'ancienne classe par mot `rt-fs`. Garde `rt-field-fs`
      // (nouveau systeme field-level) et toute autre classe legitime.
      .filter((c) => c && c !== "rt-fs");
    data.attrValue = kept.join(" ");
  });

  // Hook 2 : filtre les declarations `style`. Strip les proprietes
  // interdites (cf. STRIPPED_CSS_PROPS) + toutes les CSS custom
  // properties (--fs-m, --fs-d, et autres --x venant d'un paste).
  DOMPurify.addHook("uponSanitizeAttribute", (node: Element, data: { attrName: string; attrValue: string }) => {
    if (data.attrName !== "style" || typeof data.attrValue !== "string") return;
    const isImg = node?.tagName?.toLowerCase?.() === "img";
    const filtered = data.attrValue
      .split(";")
      .map((decl) => decl.trim())
      .filter((decl) => {
        if (!decl) return false;
        const colonIdx = decl.indexOf(":");
        if (colonIdx < 0) return false;
        const prop = decl.slice(0, colonIdx).trim().toLowerCase();
        const value = decl.slice(colonIdx + 1).trim().toLowerCase();
        if (STRIPPED_CSS_PROPS.has(prop)) return false;
        // --rt-fs : taille de police FIELD-LEVEL (nouveau systeme). On
        // l'autorise UNIQUEMENT pour les tailles curees, et UNIQUEMENT
        // sur le wrapper .rt-field-fs (defense supplementaire pour eviter
        // qu'un paste pose un --rt-fs sur n'importe quel element).
        if (prop === "--rt-fs") {
          const onWrapper = (node as Element)?.classList?.contains?.(FIELD_FS_CLASS);
          return onWrapper && FIELD_ALLOWED_SIZES.has(value);
        }
        // Toute autre CSS custom property (--xxx) est strippee : --fs-m /
        // --fs-d de l'ancien systeme par mot + le noise de paste Notion.
        if (prop.startsWith("--")) return false;
        // width / height sur <img> : on tolère des unités explicites
        // (px / %) pour permettre le redimensionnement utilisateur du
        // GIF d'intro (drame Christelle 8 juin 2026). Sur les autres
        // elements on strip pour preserver le responsive.
        if ((prop === "width" || prop === "height") && isImg) {
          return value === "auto" || IMG_WIDTH_RE.test(value);
        }
        if (prop === "width" || prop === "height") return false;
        // max-width / max-height : on garde la valeur "100%" classique
        // (sans elle, les images sortent du container responsive).
        if (prop === "max-width" || prop === "max-height") {
          return value === "100%" || value === "none" || IMG_WIDTH_RE.test(value);
        }
        return true;
      })
      .join("; ");
    data.attrValue = filtered;
  });
}

const SAFE_URL_RE = /^(https?:\/\/|mailto:|tel:|\/)/i;

export function sanitizeRichText(input: string | null | undefined): string {
  if (!input) return "";
  installStyleStripperHook();
  const clean = DOMPurify.sanitize(input, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    // Force links to open safely
    ADD_ATTR: ["target"],
  });
  return typeof clean === "string" ? clean : String(clean);
}

// Tight-check for URLs pasted into the <a> / <img> dialogs
export function isSafeUrl(url: string): boolean {
  return SAFE_URL_RE.test(url.trim());
}

// Strip all HTML tags AND decode HTML entities — used for short previews,
// OpenGraph metadata, navigator.share titles, etc. Le précédent stripHtml
// laissait `&nbsp;`, `&amp;`, `&#39;`… visibles en clair dans les aperçus
// de partage (cf. rapport iMessage Tiquiz, 16 mai 2026) parce qu'on rend
// la sortie comme texte JSX et non comme HTML — les entités ne sont
// alors jamais décodées par le browser.
export function stripHtml(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/<[^>]*>/g, "")
    // Entités nommées les plus fréquentes du contentEditable (le browser
    // insère systématiquement `&nbsp;` à la place des espaces protégés).
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    // Décimales / hex (ex. &#39; pour l'apostrophe droite).
    .replace(/&#(\d+);/g, (_m, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, n) => {
      const code = parseInt(n, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    // &amp; en dernier, sinon on double-decode `&amp;nbsp;`.
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
