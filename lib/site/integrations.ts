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
export const ZAPIER = {
  gratuitTachesParMois: 100,
  gratuitEtapesParZap: 2,
  professionnelParMois: "29,99 $",
} as const;

/** Un outil comparé sur le hub. */
export interface OutilIntegration {
  /** L'identifiant du dossier, quand la page existe. */
  slug: string | null;
  nom: string;
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
    intermediaire: "Webhook et un peu de code, ou Zapier / Make",
    tagParProfil: "Non, un Zap par profil",
    resume: "Gratuit et excellent, mais Systeme.io ne figure pas dans ses intégrations.",
  },
  {
    slug: "typeform-systeme-io",
    nom: "Typeform",
    intermediaire: "Zapier ou Make",
    tagParProfil: "Non, un Zap par profil",
    resume: "Le plus soigné du marché. La connexion à Systeme.io passe par un tiers.",
  },
  {
    slug: null,
    nom: "Google Forms",
    intermediaire: "Zapier, Make, ou un script Google Apps",
    tagParProfil: "Non",
    resume: "S'affiche dans une page Systeme.io, mais n'envoie rien dans les contacts.",
  },
  {
    slug: null,
    nom: "Jotform",
    intermediaire: "Zapier ou Make",
    tagParProfil: "Non",
    resume: "Même schéma : aucune connexion directe à Systeme.io.",
  },
  {
    slug: null,
    nom: "Interact",
    intermediaire: "Zapier Pro, un Zap par résultat",
    tagParProfil: "Non, tags à créer à la main",
    resume: "Sa documentation impose Zapier Pro et un Zap par résultat de quiz.",
  },
  {
    slug: null,
    nom: "Tiquiz",
    intermediaire: "Rien, la clé API suffit",
    tagParProfil: "Oui, et le tag est créé s'il manque",
    resume: "Écrit dans Systeme.io avec ta clé API, sans intermédiaire.",
  },
] as const;

/** Les pages enfants déjà écrites, dans l'ordre du hub. */
export const OUTILS_PUBLIES = OUTILS.filter((o) => o.slug !== null);

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
