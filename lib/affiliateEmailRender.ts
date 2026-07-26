// lib/affiliateEmailRender.ts
// Rend un email "swipe" (texte source avec **gras**, puces, ligne CTA) en
// HTML joliment mis en forme, avec styles INLINE. Les styles inline sont
// volontaires : ils survivent au copier-coller dans Systeme.io / Google Docs
// / Notion (le gras, les tailles, les couleurs et l'interligne sont conservés).
//
// Pure (client + serveur). Aucun markdown n'est montré à l'écran : la sortie
// est du vrai texte formaté. Le token {LIEN} / {TON_PRENOM} est substitué en
// amont (fillSwipe) pour les modèles ; les versions éditées par l'affilié sont
// déjà des HTML complets et ne repassent pas ici.

const INK = "#1f2340";
const BRAND = "#5D6CDB";
const LINE = "line-height:1.6;";
const P_STYLE = `margin:0 0 14px;font-size:15px;color:${INK};${LINE}`;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Applique le gras **...** et transforme les URLs en liens cliquables. */
function inline(text: string): string {
  // On échappe d'abord, puis on ré-injecte le balisage voulu.
  let html = esc(text);
  // **gras**
  html = html.replace(/\*\*([^*]+)\*\*/g, `<strong style="color:${INK};">$1</strong>`);
  // URLs nues -> liens
  html = html.replace(
    /(https?:\/\/[^\s<]+)/g,
    `<a href="$1" style="color:${BRAND};font-weight:600;text-decoration:underline;">$1</a>`,
  );
  return html;
}

/**
 * Convertit le texte source d'un email en HTML stylé (inline).
 * Blocs séparés par une ligne vide. Détection puces "- ", numéros "N. ",
 * ligne CTA "👉 ...".
 */
export function renderSwipeEmailHtml(text: string): string {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const out: string[] = [];

  for (const rawBlock of blocks) {
    const block = rawBlock.trim();
    if (!block) continue;
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);

    // Liste à puces : toutes les lignes commencent par "- ".
    if (lines.length > 0 && lines.every((l) => l.startsWith("- "))) {
      const items = lines
        .map((l) => `<li style="margin:0 0 6px;font-size:15px;color:${INK};${LINE}">${inline(l.slice(2))}</li>`)
        .join("");
      out.push(`<ul style="margin:0 0 14px;padding-left:20px;">${items}</ul>`);
      continue;
    }

    // Liste numérotée : toutes les lignes commencent par "N. ".
    if (lines.length > 0 && lines.every((l) => /^\d+\.\s/.test(l))) {
      const items = lines
        .map((l) => `<li style="margin:0 0 6px;font-size:15px;color:${INK};${LINE}">${inline(l.replace(/^\d+\.\s/, ""))}</li>`)
        .join("");
      out.push(`<ol style="margin:0 0 14px;padding-left:22px;">${items}</ol>`);
      continue;
    }

    // Ligne CTA (commence par la flèche) : mise en avant.
    if (lines.length === 1 && lines[0].startsWith("👉")) {
      out.push(
        `<p style="margin:18px 0;font-size:16px;font-weight:700;color:${BRAND};${LINE}">${inline(lines[0])}</p>`,
      );
      continue;
    }

    // Paragraphe standard (les retours simples deviennent des <br>).
    out.push(`<p style="${P_STYLE}">${lines.map(inline).join("<br>")}</p>`);
  }

  return out.join("\n");
}
