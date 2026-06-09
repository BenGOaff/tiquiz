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

// Propriétés CSS qu'on RETIRE inconditionnellement des `style="..."`
// collés par l'user (typiquement quand il copie/colle depuis Notion ou
// Google Docs). Laisser passer un `font-family: Calibri` inline casse
// l'identité visuelle du quiz visiteur (cf. report Adeline 21 mai 2026).
//
// Important : `font-size` n'est PAS dans ce set — il est traité a part
// (cf. ALLOWED_FONT_SIZES ci-dessous) pour autoriser un choix CURE
// depuis la toolbar (drame Christelle 8 juin 2026 : "je n'ai pas
// acces a la taille de la police"), tout en strippant les valeurs
// arbitraires qui viennent du paste.
const STRIPPED_CSS_PROPS = new Set([
  "font-family", "line-height", "letter-spacing",
  "word-spacing", "font-stretch",
]);

// Tailles de police EXPLICITEMENT autorisees depuis la toolbar.
// Toute autre valeur de font-size = strippee (paste defense).
// Pixels uniquement pour rester predictible (les pt/em/% varient selon
// le contexte parent dans le rendu visiteur).
const ALLOWED_FONT_SIZES = new Set([
  "12px", "14px", "16px", "18px", "20px", "24px", "30px", "36px", "48px",
]);

// Sur les <img>, on autorise une largeur en % ou en px (drame Christelle :
// le GIF d'intro n'avait aucun contrôle de taille). Les autres elements
// gardent leur comportement responsive du design system.
const IMG_WIDTH_RE = /^\d{1,3}(?:\.\d+)?%$|^\d{1,4}px$/i;

// Hook DOMPurify enregistré une seule fois au load du module. S'applique
// à toutes les sanitisations suivantes (server + client).
let _hookInstalled = false;
function installStyleStripperHook(): void {
  if (_hookInstalled) return;
  _hookInstalled = true;
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
        // font-size legacy : on accepte un font-size inline (forme
        // ancienne) UNIQUEMENT pour les 9 tailles curees. Defense
        // anti-paste Notion preservee.
        if (prop === "font-size") return ALLOWED_FONT_SIZES.has(value);
        // CSS variables per-device pour la taille de police (drame
        // Bene 8 juin 2026 : "je veux deux tailles differentes sur
        // mobile et pc"). On accepte --fs-m / --fs-d UNIQUEMENT avec
        // une valeur dans la whitelist. Les autres customs --vars sont
        // strippes pour eviter du noise dans le HTML stocke.
        if (prop === "--fs-m" || prop === "--fs-d") {
          return ALLOWED_FONT_SIZES.has(value);
        }
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

/** Liste des tailles de police autorisees depuis la toolbar Rich Text.
 *  Reexportee pour que la toolbar UI partage la meme source de verite
 *  que le sanitizer (eviter le drift entre "ce que la UI propose" et
 *  "ce que le sanitizer garde apres save"). */
export const RICH_TEXT_FONT_SIZE_OPTIONS = [
  "12px", "14px", "16px", "18px", "20px", "24px", "30px", "36px", "48px",
] as const;

export type RichTextFontSize = (typeof RICH_TEXT_FONT_SIZE_OPTIONS)[number];

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
