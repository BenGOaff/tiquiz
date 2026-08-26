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

import { rewriteOrderLinks, type OrderLinkRewrite } from "@/lib/sales/salesPageLinks";
import type { OwnerProductId } from "@/lib/checkout/catalog";
import {
  baliseVerificationGoogle,
  GA_MEASUREMENT_ID,
  remplacerIdMesure,
  scriptAnalyticsGoogle,
} from "@/lib/analytics/google";

/** Ce qu'on sait d'une page de vente, indépendamment de son HTML. */
export type SalesPageMeta = {
  slug: string;
  /** L'adresse canonique une fois en ligne. */
  canonical: string;
  title: string;
  description: string;
  /** L'image de partage, chemin absolu sur notre domaine. */
  ogImage?: string;
  /** La langue de la page, pour `<html lang>`. */
  locale: string;
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
    .replace(/<title>[\s\S]*?<\/title>/gi, "")
    .replace(/<meta[^>]*name=["']?description["']?[^>]*>/gi, "")
    .replace(/<meta[^>]*property=["']og:[^"']*["'][^>]*>/gi, "")
    .replace(/<meta[^>]*name=["']twitter:[^"']*["'][^>]*>/gi, "")
    .replace(/<link[^>]*rel=["']?canonical["']?[^>]*>/gi, "")
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
  if (meta.ogImage) {
    balises.push(`<meta property="og:image" content="${attr(meta.ogImage)}">`);
    balises.push(`<meta name="twitter:image" content="${attr(meta.ogImage)}">`);
  }
  return balises.join("\n");
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

  // LA MESURE : on réécrit l'identifiant DANS le bandeau cookies de la
  // page quand elle en porte un, et on n'ajoute une balise brute que
  // s'il n'y en a pas. Ajouter par dessus contournerait le consentement
  // que la page demande, et mettrait deux balises Google sur une page
  // (cf. lib/analytics/google.ts).
  let baliseBrute = "";
  if (opts.analytics) {
    const rec = remplacerIdMesure(sortie, GA_MEASUREMENT_ID);
    sortie = rec.html;
    if (!rec.remplace) {
      baliseBrute = scriptAnalyticsGoogle();
      console.warn(
        `[apercu/vente] ${meta.slug} : aucun bandeau cookies dans la page, ` +
          `la mesure est posee SANS consentement. A verifier.`,
      );
    }
  }

  const tetes = [
    buildHeadTags(meta),
    opts.indexable
      ? ""
      : `<meta name="robots" content="noindex, nofollow">`,
    baliseBrute,
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
