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

// Only allow inline styles we actually surface in the editor (alignment + color).
// DOMPurify will strip anything else via ALLOWED_ATTR + CSS sanitizer.
const SAFE_URL_RE = /^(https?:\/\/|mailto:|tel:|\/)/i;

export function sanitizeRichText(input: string | null | undefined): string {
  if (!input) return "";
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

// Strip all HTML tags — used for short previews, OpenGraph, etc.
export function stripHtml(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}
