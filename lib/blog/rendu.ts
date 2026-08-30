// lib/blog/rendu.ts
//
// CE QU'ON REND, ET CE QU'ON REFUSE DE RENDRE.
//
// Le contenu vient d'un import, donc de fichiers écrits par nous, mais
// il finit dans un `dangerouslySetInnerHTML`. Une liste blanche de
// balises ne coûte rien et ferme la question pour de bon : le jour où
// quelqu'un colle un bloc récupéré ailleurs dans un article, il ne peut
// pas y glisser de script sans que ce fichier le retire.
//
// Toutes les décisions sont PURES : le sommaire, les ancres, le temps
// de lecture, les liens qui doivent s'ouvrir ailleurs. La page les
// appelle, elle n'en réécrit aucune.

import type { Bloc } from "./articles";

/** Ce qu'un article a le droit de contenir. */
const BALISES = new Set([
  "h2","h3","h4","p","ul","ol","li","strong","b","em","i","a","br","blockquote","code",
  "table","thead","tbody","tr","th","td",
]);

/**
 * Nettoie le HTML d'un bloc.
 *
 * Les attributs sont TOUS retirés sauf le `href` d'un lien : une classe
 * ou un style importés imposeraient l'apparence de Systeme.io au milieu
 * d'une page qui a la nôtre.
 */
export function nettoyerBloc(html: string): string {
  return String(html ?? "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(\/?)([a-zA-Z0-9]+)([^>]*)>/g, (_tout, fermant: string, nom: string, attrs: string) => {
      const balise = nom.toLowerCase();
      if (!BALISES.has(balise)) return "";
      if (fermant) return `</${balise}>`;
      if (balise === "a") {
        const href = /href\s*=\s*"([^"]*)"/i.exec(attrs)?.[1] ?? "";
        return href && estHrefSur(href) ? `<a href="${href}"${attributsLien(href)}>` : "<a>";
      }
      return `<${balise}>`;
    });
}

/**
 * Un `href` acceptable.
 *
 * `javascript:` exécute du code au clic, et `data:` peut porter un
 * document entier. Les deux sont refusés, et le lien devient un `<a>`
 * nu plutôt que de disparaître : le texte qu'il portait reste lisible.
 */
export function estHrefSur(href: string): boolean {
  const h = String(href ?? "").trim().toLowerCase();
  if (!h) return false;
  if (h.startsWith("/") || h.startsWith("#")) return true;
  return h.startsWith("https://") || h.startsWith("http://") || h.startsWith("mailto:");
}

/** Notre domaine, ou celui d'un article : la navigation reste interne. */
function estInterne(href: string): boolean {
  const h = String(href ?? "").trim().toLowerCase();
  return h.startsWith("/") || h.startsWith("#");
}

/**
 * Un lien SORTANT s'ouvre dans un nouvel onglet.
 *
 * Règle du 24 août, transposée : un visiteur au milieu d'un article qui
 * clique une source part et ne revient pas. `noopener` est obligatoire,
 * sinon la page ouverte garde une poignée sur la nôtre.
 */
export function attributsLien(href: string): string {
  return estInterne(href) ? "" : ' target="_blank" rel="noopener noreferrer"';
}

export interface EntreeSommaire {
  id: string;
  texte: string;
  niveau: 2 | 3;
}

/**
 * Le sommaire, REGÉNÉRÉ à partir des titres de l'article.
 *
 * Recopier celui de Systeme.io aurait figé une liste qui ne suit plus
 * le contenu : au premier titre ajouté, le sommaire ment. Ici il ne
 * peut pas diverger, il EST les titres.
 */
export function sommaire(blocs: readonly Bloc[]): EntreeSommaire[] {
  return blocs
    .filter((b): b is Extract<Bloc, { type: "titre" }> => b.type === "titre")
    .map((b) => ({ id: b.id, texte: b.texte, niveau: b.niveau }));
}

/** ~200 mots par minute, arrondi à la minute, jamais moins d'une. */
export function minutesDeLecture(blocs: readonly Bloc[]): number {
  let mots = 0;
  for (const b of blocs) {
    if (b.type === "html") mots += texteBrut(b.html).split(/\s+/).filter(Boolean).length;
    if (b.type === "titre") mots += b.texte.split(/\s+/).filter(Boolean).length;
    if (b.type === "faq") {
      for (const q of b.questions) {
        mots += q.question.split(/\s+/).filter(Boolean).length;
        mots += texteBrut(q.reponse).split(/\s+/).filter(Boolean).length;
      }
    }
  }
  return Math.max(1, Math.round(mots / 200));
}

/** Le texte d'un fragment HTML, sans ses balises. */
export function texteBrut(html: string): string {
  return String(html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
