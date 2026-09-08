// lib/site/outils/interact.ts
//
// INTERACT ET SYSTEME.IO : CE QUE DEMANDE LEUR PROPRE DOCUMENTATION.
//
// 🚨 TOUTE LA PAGE REPOSE SUR TROIS CITATIONS, ET LES TROIS ONT ÉTÉ
// RELEVÉES SUR LA PAGE D'AIDE D'INTERACT LE 1er SEPTEMBRE 2026 :
//
//   1. "A Zapier Pro account" (section « Before you start »)
//   2. "You must create a tag in Systeme.io for each quiz result you
//      want to use, or it won't appear as a selectable option in Zapier."
//   3. "Repeat this Zap setup for each quiz result tag you want to apply
//      in Systeme.io (one Zap per result tag)."
//
// LES DEUX CITATIONS VIVENT HORS DES OBJETS DE LANGUE, et c'est la seule
// protection qui survit au prochain passage : une citation rangée dans
// `FR` puis dans `EN` finirait par être "améliorée" d'un côté, et une
// citation approchée est indéfendable. C'est la même règle que les
// témoignages de la landing (5 septembre) : les mots de quelqu'un
// d'autre ne se traduisent pas et ne se reformulent pas.
//
// L'EXCEPTION « ÉTIQUETTE » EST OBLIGATOIRE. La capture affichée est
// leur page d'aide telle que le navigateur la TRADUIT en français : elle
// dit "étiquette" là où nous écrivons "tag". Sans une légende qui le
// dit, le lecteur croit lire deux notions différentes. La légende
// anglaise doit donc dire aussi pourquoi la capture est en français.

import { ZAPIER, type QuestionFaq } from "@/lib/site/integrations";
import { LANGUE_SANS_PREFIXE, type LanguePublique } from "@/lib/site/langues";
import type { CaptureTexte, Segment } from "@/lib/site/outils/segments";

/** L'adresse de la page d'aide citée, pour que la citation se vérifie. */
export const DOC_INTERACT =
  "https://help.tryinteract.com/en/articles/8676075-how-to-connect-interact-to-systeme-io";

/**
 * LES DEUX PHRASES D'INTERACT, MOT POUR MOT, DANS LES DEUX LANGUES.
 *
 * Elles ne sont pas traduites : on cite un concurrent. Les traduire en
 * ferait un résumé, donc quelque chose qu'il pourrait contester.
 */
export const CITATIONS_INTERACT = [
  "You must create a tag in Systeme.io for each quiz result you want to use, or it won't appear as a selectable option in Zapier.",
  "Repeat this Zap setup for each quiz result tag you want to apply in Systeme.io (one Zap per result tag).",
] as const;

const CHEMIN_ZAPIER = "/integrations/zapier-systeme-io";
const CHEMIN_COMPARATIF = "/blog/comparatif-outils-quiz-systeme-io";

export interface TexteInteract {
  langue: LanguePublique;
  titre: string;
  description: string;
  etiquette: string;
  h1Avant: string;
  h1Surb: string;
  h1Apres: string;
  filAccueil: string;
  filIntegrations: string;
  enBref: readonly [string, string];
  intro: string;
  docTitre: string;
  docCorps: readonly (readonly Segment[])[];
  docAnnonce: string;
  sourceAvant: string;
  sourceLien: string;
  sourceApres: string;
  docApres: string;
  captureDoc: CaptureTexte;
  captureZaps: CaptureTexte;
  reelTitre: string;
  reelLegende: string;
  reelEntetes: readonly [string, string, string];
  reelLignes: readonly (readonly [string, string, string])[];
  reelApres: readonly Segment[];
  tiquizTitre: string;
  tiquizCorps: readonly Segment[];
  captureTag: CaptureTexte;
  tiquizGratuit: string;
  mieuxTitre: string;
  mieuxCorps: readonly string[];
  mieuxLien: readonly Segment[];
  ctaEssayer: string;
  ctaTousLesOutils: string;
  faq: readonly QuestionFaq[];
}

const FR: TexteInteract = {
  langue: "fr",
  // 46 caractères, suffixe " · Tiquiz" compris (voir le hub).
  titre: "Interact et Systeme.io : leur doc impose Zapier",
  description:
    "La documentation d'Interact impose Zapier Pro et un Zap par résultat de quiz pour se connecter à Systeme.io. Le détail exact, et l'alternative.",
  etiquette: "Intégrations",
  h1Avant: "Connecter ",
  h1Surb: "Interact",
  h1Apres: " à Systeme.io",
  filAccueil: "Accueil",
  filIntegrations: "Intégrations",
  enBref: [
    "Interact n'a pas d'intégration native avec Systeme.io. Sa documentation demande un compte Zapier Pro, un Zap distinct par résultat de quiz, et la création à la main d'un tag dans Systeme.io pour chaque résultat.",
    "Sur un quiz à cinq profils : cinq tags créés à la main, cinq Zaps, et deux abonnements.",
  ],
  intro:
    "Interact est le plus connu des outils de quiz marketing, et sa bibliothèque de modèles est la plus fournie du marché. Voici comment il se connecte à Systeme.io, tel que sa propre documentation le décrit.",
  docTitre: "Ce que dit la documentation d'Interact",
  docCorps: [
    [
      "Il n'existe pas d'intégration native. La connexion passe par ",
      { gras: "Zapier" },
      ", et la page d'aide demande un compte ",
      { gras: "Zapier Pro" },
      " dès sa section « Before you start ».",
    ],
    [
      "Le chemin décrit tient en trois temps. Dans Interact, activer la capture de leads et connecter Zapier avec une clé API. Dans Zapier, créer un Zap avec « New Lead » comme déclencheur. Puis choisir, côté Systeme.io, l'action « Create or Update a Contact, Including Adding Tags ».",
    ],
  ],
  docAnnonce: "Et ces deux précisions, dans leurs termes :",
  sourceAvant: "Documentation Interact, ",
  sourceLien: "help.tryinteract.com",
  sourceApres: ", relevée le 1er septembre 2026.",
  docApres:
    "Autrement dit : chaque résultat de quiz demande un tag créé à la main dans Systeme.io avant toute configuration, puis son propre Zap.",
  captureDoc: {
    alt: "La documentation d'Interact demande de créer un tag dans Systeme.io pour chaque résultat de quiz",
    legende:
      "La page d'aide d'Interact, traduite par le navigateur : ce qu'elle appelle « étiquette » est le tag Systeme.io.",
  },
  captureZaps: {
    alt: "Un Zap par résultat de quiz, comme le recommande la documentation d'Interact",
    legende: "Le Zap à refaire pour chaque profil : déclencheur Interact, action Systeme.io.",
  },
  reelTitre: "Ce que cela donne sur un quiz réel",
  reelLegende:
    "Ce qu'un quiz à cinq profils demande, chez Interact avec Zapier et chez Tiquiz",
  reelEntetes: ["Quiz à 5 profils", "Interact + Zapier", "Tiquiz"],
  reelLignes: [
    ["Tags à créer à la main", "5", "0, créés au passage"],
    ["Zaps à configurer", "5", "0"],
    ["Abonnements", "2", "1"],
    ["Ajouter un 6e profil", "1 tag + 1 Zap + 1 test", "écrire le profil"],
    ["Coût du transport", `${ZAPIER.professionnelParMois} par mois`, "compris"],
  ],
  reelApres: [
    `Le plan gratuit de Zapier ne couvre pas ce cas : ${ZAPIER.gratuitTachesParMois} tâches par mois, et des Zaps limités à ${ZAPIER.gratuitEtapesParZap} étapes alors qu'il en faut davantage. Le détail est sur la page `,
    { lien: "Zapier et Systeme.io", chemin: CHEMIN_ZAPIER },
    ".",
  ],
  tiquizTitre: "La différence côté Tiquiz",
  tiquizCorps: [
    "Elle tient en une phrase : ",
    { gras: "Tiquiz cherche le tag dans le compte Systeme.io et le crée s'il n'y est pas." },
    " Rien à préparer, rien à associer, aucun Zap à dupliquer par profil. La clé API est collée une fois, les profils sont écrits, et chaque personne qui termine le quiz arrive taguée. Un profil peut porter plusieurs tags pour croiser deux segments.",
  ],
  captureTag: {
    alt: "Dans Tiquiz, le tag Systeme.io se règle directement sur le profil",
    legende: "Le tag se règle sur le profil lui même, dans l'éditeur du quiz.",
  },
  tiquizGratuit:
    "La connexion à Systeme.io est dans le plan gratuit de Tiquiz, à 0 €, sans carte bancaire, sans limite de durée.",
  mieuxTitre: "Ce qu'Interact fait mieux",
  mieuxCorps: [
    "La bibliothèque de modèles, sans comparaison possible aujourd'hui. Des années d'avance sur la finition de l'éditeur. Et un écosystème d'intégrations bien plus large, puisque Systeme.io n'est qu'une destination parmi des dizaines.",
    "Si le choix se joue sur les modèles tout faits, Interact est devant. Si le choix se joue sur des leads tagués dans Systeme.io sans payer de transport, la réponse est de l'autre côté.",
  ],
  mieuxLien: [
    "Le comparatif complet des outils de quiz : ",
    { lien: "comparatif des outils de quiz pour Systeme.io", chemin: CHEMIN_COMPARATIF },
    ".",
  ],
  ctaEssayer: "Je crée mon quiz gratuitement →",
  ctaTousLesOutils: "Voir tous les outils",
  faq: [
    {
      q: "Interact a-t-il une intégration native avec Systeme.io ?",
      r: "Non. La documentation officielle d'Interact décrit une connexion via Zapier et demande un compte Zapier Pro. Aucune connexion directe n'est proposée.",
    },
    {
      q: "Faut-il créer les tags à la main pour connecter Interact à Systeme.io ?",
      r: "Oui. La documentation d'Interact précise qu'un tag doit être créé dans Systeme.io pour chaque résultat de quiz, faute de quoi il n'apparaît pas comme option sélectionnable dans Zapier.",
    },
    {
      q: "Combien de Zaps faut-il pour un quiz Interact ?",
      r: "La documentation d'Interact demande de refaire le Zap pour chaque tag de résultat, soit un Zap par résultat. Un quiz à cinq profils demande donc cinq Zaps, en plus des cinq tags créés au préalable dans Systeme.io.",
    },
  ],
};

const EN: TexteInteract = {
  langue: "en",
  titre: "Interact and Systeme.io: their docs need Zapier",
  description:
    "Interact's own documentation requires Zapier Pro and one Zap per quiz result to connect to Systeme.io. The exact details, and the alternative.",
  etiquette: "Integrations",
  h1Avant: "Connecting ",
  h1Surb: "Interact",
  h1Apres: " to Systeme.io",
  filAccueil: "Home",
  filIntegrations: "Integrations",
  enBref: [
    "Interact has no native Systeme.io integration. Its documentation asks for a Zapier Pro account, a separate Zap for every quiz result, and a tag created by hand in Systeme.io for each result.",
    "On a five-profile quiz: five tags created by hand, five Zaps, and two subscriptions.",
  ],
  intro:
    "Interact is the best known quiz marketing tool, and its template library is the richest on the market. Here is how it connects to Systeme.io, exactly as its own documentation describes it.",
  docTitre: "What Interact's documentation says",
  docCorps: [
    [
      "There is no native integration. The connection goes through ",
      { gras: "Zapier" },
      ", and the help page asks for a ",
      { gras: "Zapier Pro" },
      " account right in its “Before you start” section.",
    ],
    [
      "The path they describe has three steps. In Interact, turn on lead capture and connect Zapier with an API key. In Zapier, create a Zap with “New Lead” as the trigger. Then pick, on the Systeme.io side, the “Create or Update a Contact, Including Adding Tags” action.",
    ],
  ],
  docAnnonce: "And these two points, in their own words:",
  sourceAvant: "Interact documentation, ",
  sourceLien: "help.tryinteract.com",
  sourceApres: ", read on 1 September 2026.",
  docApres:
    "In other words: every quiz result needs a tag created by hand in Systeme.io before any setup, then its own Zap.",
  captureDoc: {
    alt: "Interact's documentation asks you to create a tag in Systeme.io for every quiz result",
    legende:
      "Interact's help page, as the browser machine-translates it into French: what it calls « étiquette » there is the Systeme.io tag.",
  },
  captureZaps: {
    alt: "One Zap per quiz result, as Interact's documentation recommends",
    legende: "The Zap to rebuild for every profile: Interact trigger, Systeme.io action.",
  },
  reelTitre: "What that means on a real quiz",
  reelLegende:
    "What a five-profile quiz needs, with Interact plus Zapier and with Tiquiz",
  reelEntetes: ["5-profile quiz", "Interact + Zapier", "Tiquiz"],
  reelLignes: [
    ["Tags to create by hand", "5", "0, created along the way"],
    ["Zaps to set up", "5", "0"],
    ["Subscriptions", "2", "1"],
    ["Adding a 6th profile", "1 tag + 1 Zap + 1 test", "write the profile"],
    ["Cost of the plumbing", `${ZAPIER.professionnelParMoisEn} a month`, "included"],
  ],
  reelApres: [
    `Zapier's free plan does not cover this case: ${ZAPIER.gratuitTachesParMois} tasks a month, and Zaps capped at ${ZAPIER.gratuitEtapesParZap} steps when you need more. The details are on the `,
    { lien: "Zapier and Systeme.io", chemin: CHEMIN_ZAPIER },
    " page.",
  ],
  tiquizTitre: "What changes with Tiquiz",
  tiquizCorps: [
    "It comes down to one sentence: ",
    { gras: "Tiquiz looks the tag up in your Systeme.io account and creates it if it is not there." },
    " Nothing to prepare, nothing to map, no Zap to duplicate per profile. The API key goes in once, the profiles get written, and everyone who finishes the quiz arrives tagged. A profile can carry several tags, to cross two segments.",
  ],
  captureTag: {
    alt: "In Tiquiz, the Systeme.io tag is set directly on the profile",
    legende: "The tag is set on the profile itself, in the quiz editor.",
  },
  tiquizGratuit:
    "The Systeme.io connection is in the Tiquiz free plan, at €0, with no card and no time limit.",
  mieuxTitre: "What Interact does better",
  mieuxCorps: [
    "The template library, with nothing comparable today. Years ahead on editor polish. And a far wider integration ecosystem, since Systeme.io is only one destination among dozens.",
    "If the choice comes down to ready-made templates, Interact wins. If it comes down to tagged leads inside Systeme.io without paying for plumbing, the answer is on the other side.",
  ],
  mieuxLien: [
    "The full quiz tool comparison: ",
    { lien: "quiz tools for Systeme.io, compared (in French)", chemin: CHEMIN_COMPARATIF },
    ".",
  ],
  ctaEssayer: "Build my quiz for free →",
  ctaTousLesOutils: "See every tool",
  faq: [
    {
      q: "Does Interact have a native Systeme.io integration?",
      r: "No. Interact's official documentation describes a connection through Zapier and asks for a Zapier Pro account. No direct connection is offered.",
    },
    {
      q: "Do you have to create the tags by hand to connect Interact to Systeme.io?",
      r: "Yes. Interact's documentation states that a tag must be created in Systeme.io for every quiz result, otherwise it does not appear as a selectable option in Zapier.",
    },
    {
      q: "How many Zaps does an Interact quiz need?",
      r: "Interact's documentation asks you to repeat the Zap for every result tag, so one Zap per result. A five-profile quiz therefore needs five Zaps, on top of the five tags created beforehand in Systeme.io.",
    },
  ],
};

const TRADUCTIONS: Readonly<
  Record<Exclude<LanguePublique, typeof LANGUE_SANS_PREFIXE>, TexteInteract>
> = { en: EN };

export const CHEMIN_INTERACT = "/integrations/interact-systeme-io";

export function contenuInteract(langue: LanguePublique): TexteInteract {
  return langue === LANGUE_SANS_PREFIXE ? FR : TRADUCTIONS[langue];
}
