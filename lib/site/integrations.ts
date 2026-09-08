// lib/site/integrations.ts
//
// LE HUB INTÉGRATIONS : LES FAITS, ET RIEN QUE LES FAITS.
//
// Béné, 1er septembre 2026 : "on va créer un hub intégrations pour aller
// capter les intentions de recherches entre les outils concurrents et
// systeme io pour introduire Tiquiz."
//
// -- POURQUOI CES PAGES EXISTENT ---------------------------------------
//
// Sur `tally + systeme.io`, la première page de Google est faite de sept
// plateformes d'automatisation et de rien d'autre. Même schéma sur
// Typeform, Jotform, Google Forms, Interact. Aucune page en français.
// C'est le seul endroit du web où quelqu'un se demande, exactement à cet
// instant, comment faire arriver un formulaire dans Systeme.io.
//
// **La règle qui rend ces pages solides : chaque page résout vraiment le
// problème posé, y compris quand la réponse est "prends Zapier".** Une
// page d'intégration qui n'explique pas l'intégration est une page de
// vente déguisée, et ça se voit en dix secondes.
//
// -- POURQUOI UN MODULE, ET PAS DES NOMBRES DANS LE JSX ----------------
//
// C'est la leçon de `faitsProgramme.ts` : le document de départ répétait
// le prix de Zapier à dix endroits, dans six pages. Un prix recopié dix
// fois est un prix faux neuf fois le jour où il change, et c'est
// exactement ce qui a coûté deux passages au blog. Il vit ici, une fois.

import { usd, usdFr } from "@/lib/site/montantAnglais";
import { LANGUE_SANS_PREFIXE, type LanguePublique } from "@/lib/site/langues";

/**
 * LES CHIFFRES DE ZAPIER, RELEVÉS SUR LA CAPTURE QUE LA PAGE AFFICHE.
 *
 * 🚨 ÉCART ASSUMÉ AVEC LE DOCUMENT DE DÉPART. Il annonçait "Professional
 * 19,99 $ par mois". **La capture fournie par Béné le même jour affiche
 * "À partir de 29,99 $/mois"** sur la page de tarifs française. Écrire
 * 19,99 au dessus d'une image qui dit 29,99 détruit la page en dix
 * secondes, et c'est sa ligne rouge numéro un.
 *
 * On écrit donc ce que la capture montre. Zapier affiche un prix plus
 * bas en paiement annuel sur certains marchés : ce n'est PAS écrit ici,
 * parce que ce n'est pas sur la capture et que je ne l'ai pas vérifié.
 */
export const ZAPIER_PRO_USD = 29.99;

export const ZAPIER = {
  gratuitTachesParMois: 100,
  gratuitEtapesParZap: 2,
  /**
   * LE MÊME NOMBRE, DEUX ÉCRITURES, ET C'EST VOULU.
   *
   * `29,99 $` en français, `$29.99` en anglais : un montant EST de la
   * ponctuation, et le premier posé dans une page anglaise se lit
   * comme une coquille (règle du 8 septembre, mesurée sur les articles
   * anglais du blog). Les deux DÉRIVENT de `ZAPIER_PRO_USD` : écrire
   * les deux chaînes à la main laisserait l'une dériver de l'autre le
   * jour où Zapier change son tarif, et personne ne le verrait avant
   * qu'un lecteur ne compare les deux pages.
   */
  professionnelParMois: usdFr(ZAPIER_PRO_USD),
  professionnelParMoisEn: usd(ZAPIER_PRO_USD),
} as const;

/**
 * LE LOGO OFFICIEL D'UN OUTIL.
 *
 * Ce sont des MOTS, pas des icônes carrées : les enfermer dans un carré
 * de 96 les écraserait. On borne donc la HAUTEUR et on garde le format,
 * exactement comme les images de réponse d'un quiz (règle du 4 août).
 * Les dimensions voyagent avec le chemin : sans elles, la page saute au
 * chargement de chaque logo.
 */
export interface LogoOutil {
  src: string;
  largeur: number;
  hauteur: number;
}

/** Un outil comparé sur le hub. */
export interface OutilIntegration {
  /** L'identifiant du dossier, quand la page existe. */
  slug: string | null;
  nom: string;
  /** Le logo officiel, fourni par la marque. */
  logo: LogoOutil | null;
  /** Ce qu'il faut EN PLUS pour atteindre Systeme.io. */
  intermediaire: string;
  /** Un tag différent selon la réponse ? */
  tagParProfil: string;
  /** Une ligne qui dit à qui la page s'adresse. */
  resume: string;
}

/**
 * LES OUTILS, ET CE QUE CHACUN DEMANDE.
 *
 * `slug: null` veut dire "la page n'existe pas encore". Le hub les
 * MONTRE quand même, sans lien : c'est ce qu'un lecteur cherche, et une
 * ligne manquante dans un comparatif se lit comme un oubli. Mais on ne
 * pose JAMAIS un lien vers une page qui n'est pas écrite : cinq 404 dans
 * un pied de page, c'est le drame du centre d'aide du 24 août.
 */
export const OUTILS: readonly OutilIntegration[] = [
  {
    slug: "tally-systeme-io",
    nom: "Tally",
    logo: { src: "/integrations/logos/tally.webp", largeur: 243, hauteur: 96 },
    intermediaire: "Webhook et un peu de code, ou Zapier / Make",
    tagParProfil: "Non, un Zap par profil",
    resume: "Gratuit et excellent, mais Systeme.io ne figure pas dans ses intégrations.",
  },
  {
    slug: "typeform-systeme-io",
    nom: "Typeform",
    logo: { src: "/integrations/logos/typeform.webp", largeur: 600, hauteur: 96 },
    intermediaire: "Zapier ou Make",
    tagParProfil: "Non, un Zap par profil",
    resume: "Le plus soigné du marché. La connexion à Systeme.io passe par un tiers.",
  },
  {
    slug: "google-forms-systeme-io",
    nom: "Google Forms",
    logo: { src: "/integrations/logos/google-forms.webp", largeur: 99, hauteur: 96 },
    intermediaire: "Zapier, Make, ou un script Google Apps",
    tagParProfil: "Non",
    resume: "S'affiche dans une page Systeme.io, mais n'envoie rien dans les contacts.",
  },
  {
    slug: "jotform-systeme-io",
    nom: "Jotform",
    logo: { src: "/integrations/logos/jotform.webp", largeur: 505, hauteur: 96 },
    intermediaire: "Zapier ou Make",
    tagParProfil: "Non",
    resume: "Il annonce une intégration Systeme.io. Son bouton ouvre Zapier.",
  },
  {
    slug: "interact-systeme-io",
    nom: "Interact",
    logo: { src: "/integrations/logos/interact.webp", largeur: 443, hauteur: 96 },
    intermediaire: "Zapier Pro, un Zap par résultat",
    tagParProfil: "Non, tags à créer à la main",
    resume: "Sa documentation impose Zapier Pro et un Zap par résultat de quiz.",
  },
  {
    slug: null,
    nom: "Tiquiz",
    logo: null,
    intermediaire: "Rien, la clé API suffit",
    tagParProfil: "Oui, et le tag est créé s'il manque",
    resume: "Écrit dans Systeme.io avec ta clé API, sans intermédiaire.",
  },
] as const;

/**
 * LES TROIS CHAMPS DE TEXTE, EN ANGLAIS.
 *
 * Béné, 8 septembre 2026 : "continue la traduction de tout stp." Et,
 * le même jour : "il faut à chaque fois utiliser le champ sémantique,
 * les expressions, tournures de phrases, ponctuation etc. propre à
 * chaque langue, c'est pas uniquement du mot à mot."
 *
 * -- POURQUOI UNE TABLE À CÔTÉ, ET PAS UN `OUTILS` PAR LANGUE --------
 *
 * `OUTILS` porte la STRUCTURE : le slug, le logo et ses dimensions,
 * l'ordre du tableau. Dupliquer le tableau entier laisserait ces
 * champs là diverger sans que rien ne le dise, et c'est le défaut que
 * ce dépôt paie en boucle depuis juin. Une langue n'apporte donc que
 * du TEXTE, rangé par nom d'outil.
 *
 * **Et `OUTILS` reste exporté tel quel, au caractère près.** L'aperçu
 * de la landing le lit (`app/(site)/apercu-landing-8f2c9d41`), Béné
 * est en train de le relire, et une refactorisation qui déplace ses
 * chaînes n'était demandée par personne.
 *
 * Le `Record` est typé sur les NOMS des outils : en oublier un ne
 * compile pas. Sans ça, un outil manquant afficherait du FRANÇAIS dans
 * une ligne de tableau anglaise, la page s'afficherait parfaitement,
 * et personne ne le verrait (règle du 8 septembre).
 */
type NomOutil = (typeof OUTILS)[number]["nom"];

type TexteOutil = Pick<OutilIntegration, "intermediaire" | "tagParProfil" | "resume">;

const TEXTES_OUTILS_EN: Readonly<Record<NomOutil, TexteOutil>> = {
  Tally: {
    intermediaire: "A webhook and some code, or Zapier / Make",
    tagParProfil: "No, one Zap per profile",
    resume: "Free and genuinely good, but Systeme.io is not in its integration list.",
  },
  Typeform: {
    intermediaire: "Zapier or Make",
    tagParProfil: "No, one Zap per profile",
    resume: "The most polished one out there. Reaching Systeme.io goes through a third party.",
  },
  "Google Forms": {
    intermediaire: "Zapier, Make, or a Google Apps Script",
    tagParProfil: "No",
    resume: "It embeds inside a Systeme.io page, but it sends nothing to your contacts.",
  },
  Jotform: {
    intermediaire: "Zapier or Make",
    tagParProfil: "No",
    resume: "It advertises a Systeme.io integration. The button opens Zapier.",
  },
  Interact: {
    intermediaire: "Zapier Pro, one Zap per result",
    tagParProfil: "No, tags created by hand",
    resume: "Its own documentation requires Zapier Pro and one Zap per quiz result.",
  },
  Tiquiz: {
    intermediaire: "Nothing, your API key is enough",
    tagParProfil: "Yes, and the tag is created if it is missing",
    resume: "It writes into Systeme.io with your API key, with nothing in between.",
  },
};

/**
 * LES OUTILS DANS UNE LANGUE, STRUCTURE INTACTE.
 *
 * Le français rend `OUTILS` LUI MÊME, pas une copie : deux tableaux
 * pour la même langue finiraient par ne plus dire la même chose.
 */
export function outilsPourLangue(langue: LanguePublique): readonly OutilIntegration[] {
  if (langue === LANGUE_SANS_PREFIXE) return OUTILS;
  return OUTILS.map((o) => ({ ...o, ...TEXTES_OUTILS_EN[o.nom] }));
}

/**
 * ZAPIER N'EST PAS DANS `OUTILS`, ET C'EST VOULU.
 *
 * Le hub compare des outils de FORMULAIRE ; Zapier est le TRANSPORT que
 * presque tous exigent. Le mettre dans le tableau reviendrait à comparer
 * un camion à des colis. Sa page existe, sa carte est posée à la main,
 * et son logo vit donc ici.
 */
export const LOGO_ZAPIER: LogoOutil = {
  src: "/integrations/logos/zapier.webp",
  largeur: 354,
  hauteur: 96,
};

/** Les pages enfants déjà écrites, dans l'ordre du hub. */
export const OUTILS_PUBLIES = OUTILS.filter((o) => o.slug !== null);

/**
 * TOUTES les pages filles du hub, Zapier compris.
 *
 * L'`ItemList` du JSON-LD doit décrire ce que le hub contient VRAIMENT.
 * En la construisant sur `OUTILS_PUBLIES`, elle oubliait Zapier, qui a
 * pourtant sa page et sa carte : une liste qui annonce cinq éléments là
 * où la page en montre six dit à Google le contraire de ce qu'il lit.
 */
export const ENFANTS_DU_HUB: readonly { slug: string; nom: string }[] = [
  ...OUTILS_PUBLIES.map((o) => ({ slug: o.slug as string, nom: o.nom })),
  { slug: "zapier-systeme-io", nom: "Zapier" },
];

/** Une question et sa réponse, affichée ET déclarée en JSON-LD. */
export interface QuestionFaq {
  q: string;
  r: string;
}

/**
 * LE JSON-LD D'UNE FAQ.
 *
 * Les questions sont formulées comme elles se tapent dans une barre de
 * recherche, et la réponse déclarée est EXACTEMENT celle qui est
 * affichée : déclarer un texte que la page ne porte pas est ce que
 * Google appelle du contenu masqué, et il le sanctionne.
 */
export function faqJsonLd(questions: readonly QuestionFaq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((x) => ({
      "@type": "Question",
      name: x.q,
      acceptedAnswer: { "@type": "Answer", text: x.r },
    })),
  };
}

/** Le fil d'Ariane, en JSON-LD, doublé du fil visible sur la page. */
export function filDArianeJsonLd(
  origine: string,
  etapes: readonly { nom: string; chemin: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: etapes.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: e.nom,
      item: `${origine}${e.chemin}`,
    })),
  };
}
