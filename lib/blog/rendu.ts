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
/**
 * CE QUI NE SE REND PAS DU TOUT, CONTENU COMPRIS.
 *
 * Bene, 8 septembre : "tu ne sais pas mettre un svg sur notre blog ?
 * C'est embetant ..."
 *
 * -- CE QUI MARCHE, ET CE QUI NE MARCHAIT PAS ------------------------
 *
 * Un SVG en FICHIER marche depuis le 31 aout : cinq d'entre eux vivent
 * dans les articles, poses en blocs `image`, et `dimensionsImage.ts`
 * lit leur taille naturelle dans le `viewBox`. Il n'y a rien a
 * reparer de ce cote la.
 *
 * Ce qui cassait, c'est un `<svg>` EN LIGNE, celui qu'on obtient en
 * collant un schema dans le HTML d'un article. `nettoyerBloc` retire
 * les BALISES inconnues et garde ce qu'il y a ENTRE : le schema
 * disparaissait, et toutes ses etiquettes se deversaient en prose.
 *
 * MESURE avant correction, sur un SVG a deux etiquettes :
 *
 *   ENTREE  <p>Avant</p><svg ...><style>.t{fill:#333}</style>
 *           <text>97 % partent sans rien laisser</text>
 *           <text>3 % laissent leur email</text></svg><p>Apres</p>
 *   SORTIE  <p>Avant</p>.t{fill:#333}97 % partent sans rien laisser3 %
 *           laissent leur email<p>Apres</p>
 *
 * Le CSS sortait AUSSI, et les deux etiquettes se collaient l'une a
 * l'autre. C'est ce que Bene aurait vu en essayant.
 *
 * Ces trois coupes sont celles que l'IMPORT fait deja depuis le
 * 8 septembre (`sansCodeNiStyle`, lib/blog/importBlocs.ts). Elles
 * vivent ici parce qu'un article ECRIT A LA MAIN ne passe jamais par
 * l'import : la regle doit etre au RENDU, sinon elle ne protege que la
 * moitie des chemins.
 *
 * On ne rend PAS le SVG en ligne pour autant, et c'est mesure : le
 * seul candidat du corpus porte un `<style>` (dont les selecteurs
 * s'appliqueraient a TOUTE la page une fois en ligne), 25 `class=`,
 * cinq `id` et cinq `url(#...)` qui entreraient en collision avec ceux
 * d'un deuxieme schema. Un SVG passe par un FICHIER, ou il ne passe
 * pas.
 */
export function sansContenuNonRendu(html: string): string {
  return String(html ?? "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, "");
}

export function nettoyerBloc(html: string): string {
  return sansContenuNonRendu(String(html ?? ""))
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
/**
 * Ce bloc porte-t-il une adresse email ?
 *
 * -- POURQUOI CETTE QUESTION SE POSE ----------------------------------
 *
 * Cloudflare masque toute adresse du HTML SERVI (`[email protected]`
 * plus un script qui la reconstruit). Un lecteur sans JavaScript, un
 * robot d'indexation ou un lecteur d'écran dégradé lit donc une page
 * dont l'adresse de contact a disparu. Mesuré le 2 septembre sur les
 * pages légales : 4 sur 4 étaient masquées.
 *
 * Les marqueurs de Cloudflare sont des COMMENTAIRES HTML, et
 * `nettoyerBloc` les retire (mesuré, pas supposé) : ils ne peuvent donc
 * pas vivre dans le contenu. C'est le RENDU qui doit les poser, autour
 * du seul bloc concerné.
 *
 * On les pose sur le bloc et pas sur l'article entier : la directive
 * désarme l'obfuscation pour toute la zone qu'elle couvre, et il n'y a
 * aucune raison de la désarmer là où il n'y a rien à protéger.
 *
 * La détection est volontairement LARGE (une arobase entre deux
 * fragments plausibles) : un faux positif ne coûte qu'un commentaire
 * HTML inutile, un faux négatif coûte une adresse de contact.
 */
export function porteUneAdresseEmail(html: unknown): boolean {
  return /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/.test(String(html ?? ""));
}

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
