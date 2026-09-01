// lib/sales/servePage.ts
//
// SERVIR UNE PAGE DE VENTE DEPUIS NOTRE SERVEUR.
//
// La page est servie TELLE QUELLE, document complet, en dehors du rendu
// React. C'est ce qui garantit le rendu identique : son CSS vise des
// identifiants précis (`#row-636faa3d`, `#section-ac141c59`) et vit dans
// 47 blocs de style. Toute tentative de la "reconstruire proprement"
// voudrait dire réécrire 190 Ko de CSS, avec une dérive visuelle
// garantie et aucun bénéfice.
//
// Ce qu'on INJECTE, en revanche, doit passer par ici et nulle part
// ailleurs : le référencement, le lien de commande, le suivi affilié.
//
// 21 août : cette phrase était vraie pour le référencement et FAUSSE
// pour le lien de commande, qui n'avait jamais été écrit. Béné s'en est
// aperçue dix minutes après la mise en ligne du domaine de l'Atelier.
// Une intention écrite en commentaire n'est pas du code : les cibles de
// commande sont maintenant un paramètre OBLIGATOIRE de
// `renderSalesPage`, donc on ne peut plus servir une page de vente sans
// avoir dit où elle vend.

import {
  rewriteOrderLinks,
  rewriteSiteLinks,
  type OrderLinkRewrite,
} from "@/lib/sales/salesPageLinks";
import type { OwnerProductId } from "@/lib/checkout/catalog";
import {
  baliseVerificationGoogle,
  scriptAnalyticsGoogle,
  scriptConsentementGoogle,
} from "@/lib/analytics/google";

/** Ce qu'on sait d'une page de vente, indépendamment de son HTML. */
export type SalesPageMeta = {
  slug: string;
  /** L'adresse canonique une fois en ligne. */
  canonical: string;
  /**
   * La marque décrite en données structurées, quand la page en est la
   * page officielle. Absente sur un aperçu : une page fermée n'a pas à
   * se déclarer comme le site de référence de quoi que ce soit.
   */
  marque?: {
    nom: string;
    logo?: string;
    sameAs?: string[];
    produit?: { offres: { nom: string; prix: string; url: string }[] };
  };
  title: string;
  description: string;
  /** L'image de partage, chemin absolu sur notre domaine. */
  ogImage?: string;
  /** La langue de la page, pour `<html lang>`. */
  locale: string;
  /**
   * L'icône de l'onglet.
   *
   * Elle vient de NOUS, jamais de la capture : la page a été prise chez
   * Systeme.io, donc elle porte l'icône du compte qui l'a publiée. Sur
   * `tiquiz.fr`, ça affichait le "t" de Tipote au lieu de celui de
   * Tiquiz. C'est la première chose qu'un visiteur voit dans son onglet
   * et dans ses favoris, et deux produits qui portent la même icône ne
   * se distinguent plus.
   */
  favicon?: string;
};

/**
 * Retire du HTML capturé les balises que NOUS allons réécrire.
 *
 * Sans ce nettoyage, la page porterait deux titres, deux descriptions et
 * deux canoniques : les moteurs choisissent alors eux-mêmes, et on perd
 * la maîtrise de ce qui s'affiche dans les résultats.
 */
export function stripHeadTags(html: string): string {
  return html
    // LE TITRE DE LA CAPTURE, ATTRIBUTS COMPRIS.
    //
    // 1er septembre 2026 : cette ligne visait `<title>` NU, alors que
    // Systeme.io publie `<title data-react-helmet="true">`. Le retrait
    // ne mordait donc pas, et les deux pages de vente en ligne
    // portaient DEUX titres : le nôtre en haut du head, celui de la
    // capture plus bas. C'est exactement ce que le commentaire au
    // dessus promettait d'empêcher, et c'est le titre de la capture que
    // Google pouvait retenir.
    //
    // `<title\b` exige une frontière de mot : on retire `<title>` et
    // `<title lang="fr">`, jamais un hypothétique `<titlebar>`.
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "")
    .replace(/<meta[^>]*name=["']?description["']?[^>]*>/gi, "")
    .replace(/<meta[^>]*property=["']og:[^"']*["'][^>]*>/gi, "")
    .replace(/<meta[^>]*name=["']twitter:[^"']*["'][^>]*>/gi, "")
    .replace(/<link[^>]*rel=["']?canonical["']?[^>]*>/gi, "")
    // L'ICÔNE DE LA CAPTURE, POUR LA MÊME RAISON QUE LE TITRE.
    //
    // Elle pointe sur le fichier du compte Systeme.io qui a publié la
    // page d'origine. La laisser, c'est afficher l'icône d'une autre
    // marque dans l'onglet de celle-ci. Elle est retirée ici et
    // réécrite par `buildHeadTags`.
    .replace(/<link[^>]*rel=["'][^"']*icon[^"']*["'][^>]*>/gi, "")
    .replace(/<link[^>]*rel=["']?apple-touch-icon["']?[^>]*>/gi, "")
    // LE `noindex` DE SYSTEME.IO, TROUVÉ LE 21 AOÛT.
    //
    // La page capturée porte sa propre balise, posée par l'éditeur de
    // Systeme.io :
    //
    //   <meta data-react-helmet="true" name="robots" content="noindex"/>
    //
    // Sans ce retrait, décider `indexable: true` de notre côté ne
    // servait à rien : la balise de la capture restait dans le
    // document et c'est elle que Google aurait lue. On aurait cru la
    // page ouverte au référencement alors qu'elle restait fermée, et
    // c'est exactement le genre d'écart qu'on ne découvre que des mois
    // plus tard en se demandant pourquoi rien ne remonte.
    .replace(/<meta[^>]*name=["']?robots["']?[^>]*>/gi, "");
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
 * Les balises de référencement, écrites par nous.
 *
 * Béné, 19 août : "il faudra aussi optimiser le référencement à chaque
 * étape pour que ces pages rankent correctement." Le minimum qui compte
 * vraiment, et rien de décoratif :
 *
 *   - un TITRE et une DESCRIPTION maîtrisés ;
 *   - une CANONIQUE, indispensable ici : la même page existera un temps
 *     sur tipote.fr ET chez nous, et sans canonique les deux se font
 *     concurrence sur les mêmes mots ;
 *   - les balises de partage, pour que le lien posté sur un réseau
 *     montre la bonne image et le bon texte ;
 *   - `lang`, que les moteurs utilisent pour cibler le marché.
 */
export function buildHeadTags(meta: SalesPageMeta): string {
  const balises = [
    // LE JETON DE PROPRIÉTÉ GOOGLE. Il vit ici et pas seulement dans
    // `app/layout.tsx` : cette page ne passe JAMAIS par le layout, elle
    // est servie telle quelle par un route handler. Le poser dans le
    // seul layout ne l'aurait donc jamais mis sur tiquiz.fr, c'est à
    // dire sur la page qui compte le plus pour le référencement.
    baliseVerificationGoogle(),
    `<title>${attr(meta.title)}</title>`,
    `<meta name="description" content="${attr(meta.description)}">`,
    `<link rel="canonical" href="${attr(meta.canonical)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:url" content="${attr(meta.canonical)}">`,
    `<meta property="og:title" content="${attr(meta.title)}">`,
    `<meta property="og:description" content="${attr(meta.description)}">`,
    `<meta property="og:locale" content="${attr(meta.locale)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
  ];
  if (meta.favicon) {
    balises.push(`<link rel="icon" href="${attr(meta.favicon)}">`);
    balises.push(`<link rel="apple-touch-icon" href="${attr(meta.favicon)}">`);
  }
  if (meta.ogImage) {
    balises.push(`<meta property="og:image" content="${attr(meta.ogImage)}">`);
    balises.push(`<meta name="twitter:image" content="${attr(meta.ogImage)}">`);
  }
  // QUI EST TIQUIZ, EN DONNÉES STRUCTURÉES.
  //
  // Béné, 29 août : "la page de vente tiquiz.fr ne ranke pas du tout sur
  // google quand je tape simplement tiquiz."
  //
  // Sur une requête de MARQUE, un moteur cherche à relier un nom à un
  // site : c'est le rôle d'`Organization` et de `WebSite`. Sans eux, la
  // page est un document parmi d'autres qui contient le mot "tiquiz",
  // et rien ne dit que c'est LE site de ce nom. Ça ne fait pas ranker à
  // soi seul (il faut aussi que le domaine soit indexé et cité), mais
  // c'est la pièce qu'on peut poser nous mêmes, et elle manquait.
  if (meta.marque) balises.push(baliseMarque(meta));
  return balises.join("\n");
}

/**
 * Le JSON-LD de la marque.
 *
 * `sameAs` compte autant que le reste : ce sont les autres endroits où
 * la marque existe, et c'est ce qui permet à un moteur de recouper.
 * Une liste vide n'est pas écrite plutôt qu'écrite vide.
 */
function baliseMarque(meta: SalesPageMeta): string {
  const marque = meta.marque!;
  const organisation: Record<string, unknown> = {
    "@type": "Organization",
    name: marque.nom,
    url: meta.canonical,
    description: meta.description,
  };
  if (marque.logo) organisation.logo = marque.logo;
  if (marque.sameAs?.length) organisation.sameAs = marque.sameAs;

  const donnees = {
    "@context": "https://schema.org",
    "@graph": [
      organisation,
      {
        "@type": "WebSite",
        name: marque.nom,
        url: meta.canonical,
        inLanguage: meta.locale.replace("_", "-"),
        publisher: { "@type": "Organization", name: marque.nom },
      },
      ...(marque.produit
        ? [
            {
              "@type": "SoftwareApplication",
              name: marque.nom,
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              url: meta.canonical,
              description: meta.description,
              offers: marque.produit.offres.map((o) => ({
                "@type": "Offer",
                name: o.nom,
                price: o.prix,
                priceCurrency: "EUR",
                url: o.url,
              })),
            },
          ]
        : []),
    ],
  };
  // Le JSON est inséré dans un `<script>` : une balise fermante à
  // l'intérieur d'une chaîne fermerait le script et casserait la page.
  const json = JSON.stringify(donnees).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">${json}</script>`;
}

/**
 * Le HTML prêt à servir.
 *
 * `indexable: false` par défaut, et c'est un choix de sécurité, pas un
 * oubli : tant que la page est en aperçu, elle ne doit surtout pas être
 * indexée. Une page de test qui remonte dans Google fait doublon avec
 * l'originale et abîme le référencement des DEUX. On ne l'ouvre qu'au
 * moment de la mise en ligne, explicitement.
 */
export function renderSalesPage(
  html: string,
  meta: SalesPageMeta,
  opts: {
    indexable: boolean;
    /**
     * Charge-t-on la mesure d'audience sur cette page ?
     *
     * **Obligatoire, jamais déduit de `indexable`.** Les deux disent des
     * choses différentes : `indexable` parle de Google Search, celui-ci
     * parle de Google Analytics. Les confondre marcherait aujourd'hui,
     * parce que les deux valent `true` sur le domaine public, et
     * casserait le jour où l'on veut mesurer une page qu'on ne veut pas
     * indexer, ou l'inverse.
     *
     * Derrière la clé d'aperçu il vaut `false` : compter ses propres
     * visites de relecture fausserait ses chiffres.
     */
    analytics: boolean;
    /**
     * Où mènent les boutons payants de la page.
     *
     * **Obligatoire, jamais deviné.** Sans lui, les boutons continuent
     * de pointer vers les pages de plan Systeme.io capturées avec la
     * page : le visiteur quitte notre domaine et notre bon de commande
     * ne sert jamais. C'est ce qui s'est passé sur l'Atelier le 21 août,
     * entre la mise en ligne du domaine et le message de Béné dix
     * minutes plus tard.
     *
     * `null` est un choix explicite : "je sers cette page sans y
     * brancher de commande". On ne peut plus l'oublier par distraction.
     */
    checkoutTargets: Readonly<Record<string, OwnerProductId>> | null;
    /**
     * Les liens de SITE capturés avec la page, et où ils doivent mener
     * sur ce domaine : le pied de page légal, l'affiliation, l'Atelier,
     * le logo, et la page elle même.
     *
     * `null` sur un aperçu : derrière la clé, la page n'est pas le site.
     * Séparé de `checkoutTargets` parce que les deux ne répondent pas à
     * la même question, l'un dit où va l'argent et l'autre où va le
     * visiteur, et qu'on ne veut pas pouvoir corriger l'un en croyant
     * corriger l'autre.
     */
    siteLinks?: Readonly<Record<string, string>> | null;
    /** Appelé avec le résultat de la réécriture, pour journaliser. */
    onRewrite?: (info: OrderLinkRewrite) => void;
  },
): string {
  let sortie = stripHeadTags(html);

  if (opts.checkoutTargets) {
    const info = rewriteOrderLinks(sortie, opts.checkoutTargets);
    sortie = info.html;
    opts.onRewrite?.(info);
  }

  // LA NAVIGATION APRÈS L'ARGENT, ET DANS CET ORDRE.
  //
  // Les boutons payants d'abord : ils sont déjà devenus des chemins
  // relatifs quand on arrive ici, donc aucune des deux listes ne peut
  // marcher sur les pieds de l'autre.
  if (opts.siteLinks) {
    sortie = rewriteSiteLinks(sortie, opts.siteLinks).html;
  }

  const tetes = [
    buildHeadTags(meta),
    opts.indexable
      ? ""
      : `<meta name="robots" content="noindex, nofollow">`,
    // LA BALISE GOOGLE, telle que Google la donne. On ne touche pas au
    // bandeau cookies de la page : c'est ce que Béné y a écrit.
    // LE CONSENTEMENT D'ABORD, LA BALISE ENSUITE, ET L'ORDRE COMPTE.
    // `gtag('consent','default')` doit être posé AVANT le chargement de
    // la balise, sinon elle a déjà écrit ses cookies quand l'état par
    // défaut arrive. La balise elle même reste intacte : c'est le mode
    // Consentement qui l'empêche de déposer quoi que ce soit tant que
    // la personne n'a pas accepté dans le bandeau.
    opts.analytics ? scriptConsentementGoogle() : "",
    opts.analytics ? scriptAnalyticsGoogle() : "",
  ]
    .filter(Boolean)
    .join("\n");

  // On insère juste après le premier `<meta charset>` : c'est la seule
  // ancre fiable dans un document capturé, dont le `<head>` peut être
  // implicite (SingleFile ne le réécrit pas toujours).
  const ancre = sortie.match(/<meta[^>]*charset[^>]*>/i);
  if (ancre) {
    sortie = sortie.replace(ancre[0], `${ancre[0]}\n${tetes}`);
  } else {
    sortie = `${tetes}\n${sortie}`;
  }

  return sortie;
}
