// lib/sales/salesPageLinks.ts
//
// LES BOUTONS DE LA PAGE DE VENTE MÈNENT À NOTRE BON DE COMMANDE.
//
// Jumeau de `lib/sales/salesPageLinks.ts` de l'Atelier, écrit le même
// jour et pour la même raison, mais la mécanique n'est PAS la même. Il
// faut avoir les deux en tête, sinon on porte la mauvaise correction.
//
// -- CE QUI S'EST PASSÉ CÔTÉ ATELIER -----------------------------------
//
// Béné, 21 août, dix minutes après la mise en ligne d'atelierduquiz.fr :
// "par contre j'ai l'impression qu'il ne m'ouvre pas notre bon de
// commande mais celui de systeme io ?" Elle avait raison : ses boutons
// ouvraient une popup Systeme.io capturée avec la page. La page
// s'affichait parfaitement et ne vendait rien de chez nous.
//
// -- ICI, C'EST LA MÊME PANNE SOUS UNE AUTRE FORME ---------------------
//
// La page Tiquiz n'a AUCUNE popup. Ses boutons sont de vrais liens, qui
// pointent en dur vers les pages de plan Systeme.io :
//
//   "Accès Mensuel"       -> https://www.tipote.fr/tiquiz-mensuel
//   "Accès Mensuel PLUS"  -> https://www.tipote.fr/tiquiz-mensuel-plus
//   "Accès Annuel"        -> https://www.tipote.fr/tiquiz-annuel
//   "Accès Annuel PLUS"   -> https://www.tipote.fr/tiquiz-annuel-plus
//
// Le jour où `tiquiz.fr` est branché, un visiteur qui clique quitte donc
// notre domaine et paie chez Systeme.io. Ça marcherait (ces tunnels
// existent et leurs webhooks tournent), mais ce n'est pas ce qu'on est
// en train de construire, et surtout ça ne se verrait pas : la page a
// l'air parfaite, le paiement aboutit, et notre bon de commande ne sert
// jamais.
//
// **On le corrige AVANT de brancher le domaine**, pas en direct comme ce
// matin sur l'Atelier.
//
// -- CE QU'ON NE TOUCHE PAS, ET POURQUOI -------------------------------
//
// Tous les liens vers Systeme.io ne sont pas des ventes. L'inscription
// GRATUITE en est le meilleur exemple : c'est un optin, il crée le
// contact et son tag chez Systeme.io, et c'est le SEUL événement qui
// porte une URL de tunnel (drame Ivan, 7 août). Le rediriger casserait
// le suivi des affiliés sans rien apporter, puisqu'il n'y a pas d'argent
// à encaisser.
//
// D'où deux listes explicites plutôt qu'une règle devinée. Et une URL de
// plan qui ne figure dans NI l'une NI l'autre est SIGNALÉE : c'est le
// seul moyen de savoir qu'une page recapturée a gagné un bouton payant
// qu'on enverrait toujours chez Systeme.io.

import type { OwnerProductId } from "@/lib/checkout/catalog";
import { ATELIER_SALES_URL } from "@/lib/affiliateUrls";

/**
 * LES BOUTONS PAYANTS, ET CE QU'ILS VENDENT.
 *
 * Écrit à la main, jamais déduit du libellé : elle réécrit ses libellés,
 * elle ne réécrit pas ses adresses de tunnel.
 */
export const SALES_CHECKOUT_TARGETS: Readonly<
  Record<string, Readonly<Record<string, OwnerProductId>>>
> = {
  tiquiz: {
    "https://www.tipote.fr/tiquiz-mensuel": "mensuel",
    "https://www.tipote.fr/tiquiz-mensuel-plus": "mensuel-plus",
    "https://www.tipote.fr/tiquiz-annuel": "annuel",
    "https://www.tipote.fr/tiquiz-annuel-plus": "annuel-plus",
  },
};

/**
 * LES LIENS QUI RESTENT CHEZ SYSTEME.IO, EXPRÈS.
 *
 * - `tiquiz-gratuit` : c'est un optin, pas une vente. Il crée le contact
 *   et son tag, et c'est le seul événement qui porte une URL de tunnel,
 *   donc le seul qui sait d'où vient l'inscrit.
 * - `tiquiz` : le hub de vente. Le RÉÉCRITEUR DE BOUTONS le laisse
 *   tranquille parce que ce n'est pas une vente ; c'est la navigation
 *   (`SALES_SITE_LINKS`) qui le ramène sur l'accueil de ce domaine,
 *   depuis le 1er septembre. Les deux listes ne se contredisent pas :
 *   l'une dit où va l'argent, l'autre où va le visiteur.
 * - `tiquiz-beta` et `tiquiz-us` : des tunnels à part, qu'on ne vend pas
 *   depuis notre bon de commande.
 */
export const SALES_LINKS_LEFT_ALONE: readonly string[] = [
  "https://www.tipote.fr/tiquiz",
  "https://www.tipote.fr/tiquiz-gratuit",
  "https://www.tipote.fr/tiquiz-beta",
  "https://www.tipote.fr/tiquiz-us",
];

/** Ce que la réécriture a fait, pour que l'appelant puisse le journaliser. */
export interface OrderLinkRewrite {
  html: string;
  /** Les adresses réécrites, et vers quel produit. */
  rewritten: { from: string; to: string; count: number }[];
  /**
   * Les liens de tunnel Tiquiz rencontrés et laissés tels quels alors
   * qu'ils ne figurent dans AUCUNE des deux listes.
   *
   * Ce n'est pas décoratif. Une page recapturée après un changement de
   * gamme apporterait un bouton payant qu'on continuerait d'envoyer chez
   * Systeme.io, sans que rien ne le dise. C'est exactement la mécanique
   * du drame Ivan : le refus était juste, c'est le silence qui coûtait
   * une journée et un client.
   */
  unmapped: string[];
}

/**
 * Deux adresses désignent-elles la même page ?
 *
 * On compare l'hôte et le chemin, sans le protocole, sans la barre
 * finale, sans ce qui suit le `?`. Un `??` ni une comparaison brute ne
 * suffisent : `https://www.tipote.fr/tiquiz-mensuel/` et
 * `https://www.tipote.fr/tiquiz-mensuel?ref=GWENN23` sont la même page,
 * et rater l'une des deux formes laisserait un bouton payant partir chez
 * Systeme.io.
 */
export function samePage(a: string, b: string): boolean {
  const cle = (u: string): string | null => {
    try {
      const url = new URL(String(u ?? "").trim());
      return `${url.host.toLowerCase()}${url.pathname.replace(/\/+$/, "").toLowerCase()}`;
    } catch {
      return null;
    }
  };
  const x = cle(a);
  const y = cle(b);
  return x !== null && x === y;
}

/** Échappe ce qui part dans un attribut HTML. */
function attr(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * TOUS les boutons payants de la page mènent à notre bon de commande.
 *
 * On réécrit `href="..."` ET `"link":"..."` : le second est la
 * configuration que l'éditeur Systeme.io relit pour reconstruire ses
 * boutons. N'en corriger qu'un des deux, c'est la moitié d'une décision,
 * et une moitié de décision finit toujours par contredire l'autre.
 *
 * Ce qui suit le `?` est CONSERVÉ : une adresse d'affilié dans l'URL doit
 * arriver jusqu'à notre bon de commande, qui sait la lire.
 */
export function rewriteOrderLinks(
  html: string,
  cibles: Readonly<Record<string, OwnerProductId>>,
): OrderLinkRewrite {
  const entrees = Object.entries(cibles);
  const compte = new Map<string, { to: string; count: number }>();
  const unmapped = new Set<string>();

  const remplace = (url: string): string | null => {
    const paire = entrees.find(([source]) => samePage(source, url));
    if (!paire) return null;
    const [source, produit] = paire;
    let query = "";
    try {
      query = new URL(url).search;
    } catch {
      query = "";
    }
    const cible = `/commande/${produit}${query}`;
    const vu = compte.get(source) ?? { to: `/commande/${produit}`, count: 0 };
    vu.count += 1;
    compte.set(source, vu);
    return cible;
  };

  const connuEtLaisse = (url: string): boolean =>
    SALES_LINKS_LEFT_ALONE.some((garde) => samePage(garde, url));

  const surveille = (url: string): void => {
    // On ne surveille que NOS tunnels : les mentions légales, la page
    // d'affiliation et les liens externes ne sont pas des boutons de
    // vente et n'ont rien à faire dans cette alerte.
    if (!/^https?:\/\/(www\.)?tipote\.fr\/tiquiz(-|$|\/)/i.test(url.trim())) return;
    if (connuEtLaisse(url)) return;
    unmapped.add(url.trim());
  };

  let sortie = String(html ?? "").replace(
    /href="(https?:\/\/[^"]+)"/gi,
    (entier, url: string) => {
      const cible = remplace(url);
      if (cible) return `href="${attr(cible)}"`;
      surveille(url);
      return entier;
    },
  );

  // LES DEUX NOMS DE LA MÊME CLÉ, ET C'EST UN PIÈGE VÉRIFIÉ, PAS SUPPOSÉ.
  //
  // La page de l'Atelier écrit `"link":"..."`. Celle de Tiquiz écrit
  // `"linkUrl":"..."`. Le même éditeur, deux pages, deux noms : n'en
  // traiter qu'un, c'est laisser la configuration contredire le HTML, et
  // un bouton payant repartir chez Systeme.io au premier rendu.
  //
  // Trouvé en RELISANT la sortie sur la vraie page, pas en la
  // supposant : le premier jet ne connaissait que `"link"` et laissait
  // les quatre `linkUrl` intacts. C'est la leçon du drame Ivan, appliquée
  // au format d'un fichier au lieu d'un webhook : la forme d'une donnée
  // se regarde, elle ne se déduit pas.
  sortie = sortie.replace(
    /"(link|linkUrl)"\s*:\s*"(https?:\\?\/\\?\/[^"]+)"/gi,
    (entier, cle: string, brut: string) => {
      // Dans le JSON de la page, les barres obliques peuvent être
      // échappées. On compare sur l'adresse réelle, pas sur son écriture.
      const url = brut.replace(/\\\//g, "/");
      const cible = remplace(url);
      if (cible) return `"${cle}":"${cible}"`;
      surveille(url);
      return entier;
    },
  );

  return {
    html: sortie,
    rewritten: [...compte.entries()].map(([from, v]) => ({ from, to: v.to, count: v.count })),
    unmapped: [...unmapped],
  };
}


/**
 * LES LIENS DE SITE QUI POINTAIENT ENCORE VERS L'ANCIEN DOMAINE.
 *
 * En relisant la page capturée le 1er septembre 2026 : quatre liens
 * seulement menaient chez nous, les quatre boutons de commande réécrits
 * plus haut. Tout le reste partait chez `www.tipote.fr`, y compris les
 * cinq liens légaux du pied de page, la page d'affiliation, l'Atelier,
 * le LOGO en haut de page, et `www.tipote.fr/tiquiz`, c'est à dire SA
 * PROPRE COPIE. Ce dernier est le plus cher : depuis la page qui doit
 * remplacer l'ancienne, un lien vers l'ancienne la désigne comme celle
 * qui fait autorité.
 *
 * POURQUOI UNE LISTE ET PAS UNE RÈGLE. « tout ce qui pointe sur
 * tipote.fr revient chez nous » serait faux : l'optin gratuit et les
 * tunnels beta et US vivent chez Systeme.io pour de bonnes raisons (voir
 * `SALES_LINKS_LEFT_ALONE`). Une règle devinée les casserait en
 * silence. On écrit donc les couples à la main.
 *
 * ET LES DESTINATIONS SONT NOS VRAIES ROUTES, VÉRIFIÉES DANS `app/`.
 * Les chemins de Systeme.io (`/mentions-legales`, `/cgv`, `/cgu`,
 * `/politique-de-confidentialite`, `/politique-de-cookies`) n'existent
 * PAS chez nous : les recopier tels quels aurait posé cinq 404 dans le
 * pied de page de la page qui vend, c'est à dire exactement le drame du
 * centre d'aide du 24 août. Nos pages sont `/legal`, `/terms`,
 * `/terms-of-use`, `/privacy` et `/cookies`.
 */
export const SALES_SITE_LINKS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  tiquiz: {
    // SA PROPRE COPIE, ET LE LOGO, MÈNENT À L'ACCUEIL DE CE DOMAINE.
    "https://www.tipote.fr/tiquiz": "/",
    "https://www.tipote.fr/quiz": "/",
    "https://www.tipote.fr/mentions-legales": "/legal",
    "https://www.tipote.fr/cgv": "/terms",
    "https://www.tipote.fr/cgu": "/terms-of-use",
    "https://www.tipote.fr/politique-de-confidentialite": "/privacy",
    "https://www.tipote.fr/politique-de-cookies": "/cookies",
    "https://www.tipote.fr/affiliation": "/affiliation",
    // La DESTINATION vient de `lib/affiliateUrls.ts`, jamais réécrite
    // ici : c'est la règle du drame de l'Atelier du 3 août. Seule la CLÉ
    // est une adresse en dur, et elle doit l'être, c'est la chaîne
    // exacte présente dans le HTML capturé, pas un lien qu'on publie.
    "https://www.tipote.fr/atelier-du-quiz-bene": ATELIER_SALES_URL,
  },
};

/** Ce que la réécriture des liens de site a fait. */
export interface SiteLinkRewrite {
  html: string;
  rewritten: { from: string; to: string; count: number }[];
}

/**
 * Ramène sur ce domaine les liens de site capturés avec la page.
 *
 * Volontairement SÉPARÉ de `rewriteOrderLinks` : celui là décide où va
 * l'ARGENT et n'est jamais optionnel ; celui ci décide où va la
 * NAVIGATION et ne s'applique que sur le domaine public. Derrière la clé
 * d'aperçu, la page n'est pas le site.
 */
export function rewriteSiteLinks(
  html: string,
  cibles: Readonly<Record<string, string>>,
): SiteLinkRewrite {
  const entrees = Object.entries(cibles);
  const compte = new Map<string, { to: string; count: number }>();

  const remplace = (url: string): string | null => {
    const paire = entrees.find(([source]) => samePage(source, url));
    if (!paire) return null;
    const [source, destination] = paire;
    let query = "";
    try {
      query = new URL(url).search;
    } catch {
      query = "";
    }
    const vu = compte.get(source) ?? { to: destination, count: 0 };
    vu.count += 1;
    compte.set(source, vu);
    return `${destination}${query}`;
  };

  let sortie = String(html ?? "").replace(
    /href="(https?:\/\/[^"]+)"/gi,
    (entier, url: string) => {
      const cible = remplace(url);
      return cible ? `href="${attr(cible)}"` : entier;
    },
  );

  // LES LIENS ÉCRITS DANS UN BLOC DE TEXTE, DONC ÉCHAPPÉS.
  //
  // Mesuré sur la capture le 1er septembre : trois liens vers l'Atelier
  // vivent dans le modèle JSON de la page, sous la forme
  // `href=\"...\"` et `href=\\\"...\\\"`. Ne traiter que les `href="..."`
  // nus en laissait trois derrière, et ce sont ceux que l'éditeur relit
  // pour reconstruire le bloc.
  sortie = sortie.replace(
    /href=(\\+)"(https?:\/\/[^"\\]+)\1"/gi,
    (entier, echappement: string, url: string) => {
      const cible = remplace(url);
      return cible ? `href=${echappement}"${cible}${echappement}"` : entier;
    },
  );

  // Les deux noms de la même clé chez Systeme.io : la page de l'Atelier
  // écrit `"link"`, celle de Tiquiz `"linkUrl"`. On traite les deux,
  // sinon la configuration que l'éditeur relit contredit le HTML.
  sortie = sortie.replace(
    /"(link|linkUrl)"\s*:\s*"(https?:\\?\/\\?\/[^"]+)"/gi,
    (entier, cle: string, brut: string) => {
      const cible = remplace(brut.replace(/\\\//g, "/"));
      return cible ? `"${cle}":"${cible}"` : entier;
    },
  );

  return {
    html: sortie,
    rewritten: [...compte.entries()].map(([from, v]) => ({ from, to: v.to, count: v.count })),
  };
}

/**
 * LES PAGES LÉGALES SERVIES PAR CETTE APP.
 *
 * La liste des DESTINATIONS, pas des sources : c'est ce vers quoi
 * `SALES_SITE_LINKS` ramène, et c'est donc ce qu'on retrouve dans le
 * HTML une fois la réécriture faite.
 */
export const CHEMINS_LEGAUX: readonly string[] = [
  "/legal",
  "/terms",
  "/terms-of-use",
  "/privacy",
  "/cookies",
];

/**
 * LES ADRESSES SYSTEME.IO DE CES MÊMES PAGES, DÉRIVÉES, JAMAIS RECOPIÉES.
 *
 * La page de vente est CAPTURÉE : ses liens légaux portent encore les
 * adresses de Systeme.io (`www.tipote.fr/cgv`...) tant que
 * `rewriteSiteLinks` n'est pas passé, et il ne passe QUE sur le domaine
 * public (un chantier relu derrière la clé d'aperçu garde exprès le pied
 * de page du site en ligne).
 *
 * Or la règle de Béné ne parle pas de nos routes, elle parle du
 * visiteur : "JAMAIS faire quitter la page". Un lien vers les CGV chez
 * Systeme.io le fait quitter encore plus sûrement.
 *
 * La liste se DÉDUIT de `SALES_SITE_LINKS` : toute clé dont la
 * destination est une de nos pages légales. Une deuxième liste écrite à
 * la main finirait par ne plus dire la même chose que la première, et
 * c'est le défaut sorti six fois dans ce dépôt.
 */
const ADRESSES_LEGALES_CAPTUREES: ReadonlySet<string> = new Set(
  Object.values(SALES_SITE_LINKS).flatMap((table) =>
    Object.entries(table)
      .filter(([, vers]) => CHEMINS_LEGAUX.includes(vers.replace(/\/+$/, "").toLowerCase() || "/"))
      .map(([depuis]) => depuis.replace(/\/+$/, "").toLowerCase()),
  ),
);

/** Cette adresse mène-t-elle à une page légale, chez nous ou dans la capture ? */
export function estLienLegal(href: string | null | undefined): boolean {
  const brut = (href ?? "").trim();
  if (!brut) return false;
  if (ADRESSES_LEGALES_CAPTUREES.has(brut.replace(/\/+$/, "").toLowerCase())) return true;
  let chemin: string;
  try {
    // Une adresse relative n'a pas d'origine : on lui en prête une, elle
    // n'est jamais lue. Une adresse absolue garde la sienne.
    chemin = new URL(brut, "https://exemple.invalid").pathname;
  } catch {
    return false;
  }
  const propre = chemin.replace(/\/+$/, "").toLowerCase() || "/";
  return CHEMINS_LEGAUX.includes(propre);
}

/**
 * UN LIEN LÉGAL NE FAIT JAMAIS QUITTER LA PAGE (Béné, 24 août 2026).
 *
 * "Un lien vers la politique de confi etc. doit s'ouvrir dans un nouvel
 * onglet et JAMAIS faire quitter la page à un visiteur !!"
 *
 * La règle existait depuis le 24 août, en deux moitiés : le sanitizer
 * pose le `target` sur les liens écrits par les créatrices, et nos liens
 * légaux écrits en dur portent `target="_blank"`. La page de vente
 * n'était couverte NI par l'un NI par l'autre : c'est une page CAPTURÉE,
 * dont on ne réécrit que les adresses au moment de la servir.
 *
 * MESURÉ le 2 septembre sur la production : 10 ancres légales servies,
 * ZÉRO avec un `target`. Le bon de commande, lui, était déjà bon (2/2).
 *
 * `rel="noopener noreferrer"` va avec, toujours : sans `noopener`, la
 * page ouverte garde une poignée sur la nôtre par `window.opener`.
 *
 * ET `target="_self"` SE REMPLACE, c'est le coeur de ce correctif.
 *
 * Le premier jet gardait tout `target` déjà posé, "parce que la capture
 * pourrait en porter un que quelqu'un a choisi". C'était une SUPPOSITION,
 * et elle était fausse : MESURÉ sur la page construite, les 10 ancres
 * légales se répartissent en 6 `_self` et 4 sans rien, ZÉRO `_blank`.
 * `_self` est ce que l'éditeur de Systeme.io écrit mécaniquement sur
 * chaque lien, ce n'est le choix de personne, et le respecter n'aurait
 * corrigé que 4 liens sur 10.
 *
 * Un `target` NOMMÉ (`_parent`, `_top`, un nom de fenêtre) reste, lui :
 * celui-là ne s'obtient pas par défaut.
 */
export function ouvrirLiensLegauxDansUnOnglet(html: string): { html: string; poses: number } {
  let poses = 0;
  const sortie = String(html ?? "").replace(/<a\b[^>]*>/gi, (balise) => {
    const href = /href=\\?["']([^"'\\>]+)/i.exec(balise)?.[1];
    if (!estLienLegal(href)) return balise;
    const cible = /\btarget\s*=\s*\\?["']?([a-z_]+)/i.exec(balise)?.[1]?.toLowerCase();
    if (cible && cible !== "_self") return balise;
    poses += 1;
    const rel = /\brel\s*=/i.test(balise) ? "" : ' rel="noopener noreferrer"';
    if (cible === "_self") {
      return balise.replace(/(\btarget\s*=\s*\\?["']?)_self/i, "$1_blank") .replace(/\s*\/?>$/, (fin) => `${rel}${fin.trim() === "/>" ? " />" : ">"}`);
    }
    return balise.replace(/\s*\/?>$/, (fin) => ` target="_blank"${rel}${fin.trim() === "/>" ? " />" : ">"}`);
  });
  return { html: sortie, poses };
}
