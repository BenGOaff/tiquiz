// lib/site/hubIntegrations.ts
//
// LES MOTS DU HUB INTÉGRATIONS, DANS LES DEUX LANGUES.
//
// Béné, 8 septembre 2026 : "continue la traduction de tout stp." Et,
// plus tôt le même jour : "il faut à chaque fois utiliser le champ
// sémantique, les expressions, tournures de phrases, ponctuation etc.
// propre à chaque langue, c'est pas uniquement du mot à mot."
//
// -- UNE STRUCTURE, UN TEXTE PAR LANGUE --------------------------------
//
// C'est le geste des 8 pages de fonctionnalités et de `/a-propos` : la
// STRUCTURE vit une fois (quelles sections, dans quel ordre, quels
// liens), une langue n'apporte que du texte. Dupliquer la structure
// laisserait les deux versions diverger, et c'est le défaut que ce
// dépôt paie en boucle depuis juin.
//
// `TRADUCTIONS` est un `Record` des langues PRÉFIXÉES : en oublier une
// ne compile pas. Sans ça, une langue déclarée sans son texte servirait
// du français sous une adresse anglaise, la page s'afficherait
// parfaitement, et Google jugerait l'anglais sur du contenu dupliqué.
//
// -- LES FAITS NE SONT PAS ICI -----------------------------------------
//
// Les prix, les limites de Zapier et ce que chaque outil demande vivent
// dans `lib/site/integrations.ts`, et ils sont INTERPOLÉS depuis là. Un
// chiffre recopié dans une phrase est un chiffre faux le jour où il
// change, et il vit ici à l'endroit exact où un lecteur le vérifie.

import { LANGUE_SANS_PREFIXE, type LanguePublique } from "@/lib/site/langues";
import { ZAPIER, type QuestionFaq } from "@/lib/site/integrations";

/**
 * LE CHROME DES BRIQUES PARTAGÉES.
 *
 * Trois chaînes, mesurées dans `components/site/Integrations.tsx` : le
 * libellé du fil d'Ariane, le titre de l'encadré, le titre de la FAQ.
 *
 * **Le libellé du fil d'Ariane ne s'affiche pas, et il compte quand
 * même** : c'est ce qu'un lecteur d'écran ANNONCE avant de lire la
 * ligne. Un texte qu'on n'affiche pas reste un texte que quelqu'un
 * lit (règle du 8 septembre, sur le chrome du site).
 */
export interface ChromeIntegrations {
  filDAriane: string;
  enBref: string;
  faq: string;
}

const CHROME: Readonly<Record<LanguePublique, ChromeIntegrations>> = {
  fr: {
    filDAriane: "Fil d'Ariane",
    enBref: "En bref",
    faq: "Questions fréquentes",
  },
  en: {
    filDAriane: "Breadcrumb",
    enBref: "In short",
    faq: "Frequently asked questions",
  },
};

export function chromeIntegrations(langue: LanguePublique): ChromeIntegrations {
  return CHROME[langue];
}

/** Un lien nommé, avec sa destination : les deux changent par langue. */
export interface LienNomme {
  href: string;
  libelle: string;
}

export interface TexteHub {
  langue: LanguePublique;
  /** 45 caractères visés : le gabarit du site ajoute " · Tiquiz". */
  titre: string;
  description: string;
  etiquette: string;
  /** Le `<h1>`, coupé au fragment que le surligneur porte. */
  h1Avant: string;
  h1Surb: string;
  enBref: readonly [string, string];
  altSchema: string;
  intro: readonly [string, string];
  tableauTitre: string;
  tableauLegende: string;
  tableauEntetes: readonly [string, string, string, string];
  natifOui: string;
  natifNon: string;
  tableauApres: string;
  choisirTitre: string;
  choisirCorps: readonly [string, string, string];
  outilsTitre: string;
  /** "Tally et Systeme.io" : le mot qui joint le nom au produit. */
  outilsEt: string;
  zapierResume: string;
  /** Dit que les pages détaillées ne sont pas dans cette langue. */
  outilsLangueDesPages: string | null;
  avantTitre: string;
  avantCorps: string;
  avantLiens: readonly [LienNomme, LienNomme];
  faq: readonly QuestionFaq[];
  finTitre: string;
  finCorps: string;
  finCta: string;
  filAccueil: string;
  filIntegrations: string;
  itemListNom: string;
}

const FR: TexteHub = {
  langue: "fr",
  titre: "Intégrations Systeme.io : formulaires et quiz",
  description:
    "Tally, Typeform, Google Forms, Interact, Zapier : comment chaque outil se connecte à Systeme.io, ce que chaque méthode coûte, et laquelle choisir.",
  etiquette: "Intégrations",
  h1Avant: "Connecter un formulaire ou un quiz à ",
  h1Surb: "Systeme.io",
  enBref: [
    `Aucun des grands outils de formulaire ne parle directement à Systeme.io. Tally, Typeform, Google Forms, Jotform et Interact passent tous par un intermédiaire : Zapier, Make ou Pabbly. Compter un abonnement de plus, à partir de ${ZAPIER.professionnelParMois} par mois dès qu'il faut un tag différent selon la réponse.`,
    "Tiquiz écrit dans Systeme.io avec ta clé API, sans intermédiaire, et crée le tag s'il n'existe pas.",
  ],
  altSchema:
    "Tally, Typeform, Google Forms, Jotform et Interact passent par Zapier, Make, n8n ou Pabbly pour atteindre Systeme.io, Tiquiz s'y connecte directement",
  intro: [
    "Systeme.io ne fabrique pas de quiz. Il fait très bien le reste : les emails, les tags, les tunnels, les paiements. La question qui revient donc sans arrêt est celle du raccord : comment les réponses d'un formulaire arrivent-elles DANS Systeme.io, avec le bon tag sur le bon contact ?",
    "Chaque outil a été vérifié un par un, en septembre 2026. Voilà l'état des lieux.",
  ],
  tableauTitre: "Ce que chaque outil demande",
  tableauLegende: "Ce que chaque outil de formulaire demande pour atteindre Systeme.io",
  tableauEntetes: [
    "Outil",
    "Intégration native Systeme.io",
    "Ce qu'il faut en plus",
    "Tag automatique par profil",
  ],
  natifOui: "Oui, avec ta clé API",
  natifNon: "Non",
  tableauApres:
    "Ce tableau ne dit pas que ces outils sont mauvais. Tally est excellent et gratuit, Typeform est le plus beau du marché, Interact a une bibliothèque de modèles que personne n'égale. Il dit seulement ce que chacun demande avant que la première réponse arrive dans Systeme.io.",
  choisirTitre: "Comment choisir",
  choisirCorps: [
    "Si le besoin est un FORMULAIRE SIMPLE avec un tag unique pour tout le monde, n'importe lequel de ces outils fait l'affaire, et le plan gratuit de Zapier suffit tant qu'on reste sous cent réponses par mois.",
    "Si le besoin est un QUIZ QUI POSE UN TAG DIFFÉRENT SELON LES RÉPONSES, le calcul change complètement. Il faut un Zap par profil, donc des Zaps multi-étapes, donc le plan Zapier payant, plus chaque tag créé à la main dans Systeme.io au préalable.",
    "C'est ce deuxième cas qui justifie un outil connecté directement.",
  ],
  outilsTitre: "Choisis ton outil",
  outilsEt: "et",
  zapierResume: "Ce que le plan gratuit permet vraiment, et à partir de quand il faut payer.",
  outilsLangueDesPages: null,
  avantTitre: "Avant de commencer, quel que soit l'outil",
  avantCorps:
    "La clé API se trouve dans Systeme.io, Paramètres, API. C'est elle qui autorise un outil extérieur à créer un contact et à poser un tag. Elle donne accès à toute la liste de contacts : elle se traite comme un mot de passe et ne se colle que dans un outil de confiance.",
  avantLiens: [
    { href: "/blog/comment-creer-quiz-systeme-io", libelle: "La méthode complète, étape par étape" },
    { href: "/blog/comparatif-outils-quiz-systeme-io", libelle: "Le comparatif des outils de quiz" },
  ],
  faq: [
    {
      q: "Systeme.io a-t-il des intégrations natives avec les outils de formulaire ?",
      r: "Non. Systeme.io expose une API et se connecte à Zapier, Make et Pabbly, mais aucun des grands outils de formulaire (Tally, Typeform, Google Forms, Jotform) ne s'y connecte directement. Il faut passer par une plateforme d'automatisation, ou par un outil qui a développé la connexion lui-même.",
    },
    {
      q: "Peut-on connecter un formulaire à Systeme.io gratuitement ?",
      r: `Oui, de deux façons. Avec le plan gratuit de Zapier, limité à ${ZAPIER.gratuitTachesParMois} tâches par mois et à des Zaps de ${ZAPIER.gratuitEtapesParZap} étapes. Ou avec un webhook et un peu de code appelant l'API Systeme.io, ce qui ne coûte rien mais demande de savoir programmer.`,
    },
    {
      q: "Comment poser un tag différent selon la réponse au formulaire ?",
      r: `Avec Zapier, il faut un Zap par réponse possible et des chemins, ce qui demande le plan Professional à ${ZAPIER.professionnelParMois} par mois. Chaque tag doit aussi exister dans Systeme.io avant la configuration. Un outil de quiz connecté directement, comme Tiquiz, associe le tag au profil sans intermédiaire.`,
    },
  ],
  finTitre: "Un quiz qui écrit dans Systeme.io tout seul",
  finCorps:
    "La connexion et les tags par profil sont dans le plan gratuit de Tiquiz, à 0 €, sans carte bancaire et sans limite de durée.",
  finCta: "Je teste Tiquiz gratuitement →",
  filAccueil: "Accueil",
  filIntegrations: "Intégrations",
  itemListNom: "Connecter un formulaire ou un quiz à Systeme.io",
};

const EN: TexteHub = {
  langue: "en",
  titre: "Systeme.io integrations: forms and quizzes",
  description:
    "Tally, Typeform, Google Forms, Interact, Zapier: how each tool connects to Systeme.io, what each method costs, and which one to pick.",
  etiquette: "Integrations",
  h1Avant: "Connect a form or a quiz to ",
  h1Surb: "Systeme.io",
  enBref: [
    `None of the big form tools talk to Systeme.io directly. Tally, Typeform, Google Forms, Jotform and Interact all go through something in between: Zapier, Make or Pabbly. Budget for one more subscription, from ${ZAPIER.professionnelParMoisEn} a month as soon as you need a different tag depending on the answer.`,
    "Tiquiz writes into Systeme.io with your API key, with nothing in between, and it creates the tag if it does not exist yet.",
  ],
  altSchema:
    "Tally, Typeform, Google Forms, Jotform and Interact go through Zapier, Make, n8n or Pabbly to reach Systeme.io, while Tiquiz connects to it directly",
  intro: [
    "Systeme.io does not build quizzes. It does everything else very well: emails, tags, funnels, payments. So the question that keeps coming back is the join: how do form answers land INSIDE Systeme.io, with the right tag on the right contact?",
    "Every tool below was checked one by one, in September 2026. Here is where things stand.",
  ],
  tableauTitre: "What each tool asks for",
  tableauLegende: "What each form tool needs in order to reach Systeme.io",
  tableauEntetes: [
    "Tool",
    "Native Systeme.io integration",
    "What you need on top",
    "Automatic tag per profile",
  ],
  natifOui: "Yes, with your API key",
  natifNon: "No",
  tableauApres:
    "This table does not say these tools are bad. Tally is excellent and free, Typeform is the best looking one around, Interact has a template library nobody matches. It only says what each one asks for before the very first answer reaches Systeme.io.",
  choisirTitre: "How to choose",
  choisirCorps: [
    "If what you need is a SIMPLE FORM with the same tag for everyone, any of these tools will do, and Zapier's free plan is enough as long as you stay under a hundred answers a month.",
    "If what you need is a QUIZ THAT SETS A DIFFERENT TAG DEPENDING ON THE ANSWERS, the maths change completely. You need one Zap per profile, so multi-step Zaps, so Zapier's paid plan, plus every tag created by hand inside Systeme.io beforehand.",
    "It is that second case that makes a directly connected tool worth it.",
  ],
  outilsTitre: "Pick your tool",
  outilsEt: "and",
  zapierResume: "What the free plan really covers, and the point where you have to start paying.",
  // LES SIX PAGES DÉTAILLÉES ONT LEUR ANGLAIS : PLUS RIEN À ANNONCER.
  //
  // Cette ligne a existé une demi-journée, et c'était sa raison d'être :
  // tant que les pages derrière les cartes étaient en français, la
  // règle du chrome (8 septembre) gardait leur titre en français et
  // cette phrase disait pourquoi, au lieu de laisser la surprise au
  // clic. Leur texte vit maintenant dans `lib/site/outils/*.ts`, une
  // entrée par langue, donc la phrase mentirait.
  //
  // Le garde-fou s'auto-corrige et il a fait exactement son travail :
  // `hub-en-anglais.test.mts` exige la ligne tant qu'AUCUNE fille n'est
  // traduite, exige qu'elle DISPARAISSE quand les six le sont, et
  // refuse l'entre deux ("2 pages filles sur 6 sont traduites").
  outilsLangueDesPages: null,
  avantTitre: "Before you start, whichever tool you pick",
  avantCorps:
    "The API key lives in Systeme.io, under Settings, API. It is what lets an outside tool create a contact and set a tag. It opens your whole contact list: treat it like a password, and only paste it into a tool you trust.",
  // LE PREMIER LIEN A UNE VERSION ANGLAISE, LE SECOND NON.
  //
  // Mesuré dans `content/blog/en/` : `create-quiz-systeme-io` existe,
  // `comparatif-outils-quiz-systeme-io` n'a pas d'équivalent. Le second
  // garde donc son libellé FRANÇAIS, pour la même raison que les cartes
  // juste au dessus.
  avantLiens: [
    { href: "/en/blog/create-quiz-systeme-io", libelle: "The full method, step by step" },
    { href: "/blog/comparatif-outils-quiz-systeme-io", libelle: "Le comparatif des outils de quiz" },
  ],
  faq: [
    {
      q: "Does Systeme.io have native integrations with form tools?",
      r: "No. Systeme.io exposes an API and connects to Zapier, Make and Pabbly, but none of the big form tools (Tally, Typeform, Google Forms, Jotform) connect to it directly. You have to go through an automation platform, or through a tool that built the connection itself.",
    },
    {
      q: "Can you connect a form to Systeme.io for free?",
      r: `Yes, in two ways. With Zapier's free plan, capped at ${ZAPIER.gratuitTachesParMois} tasks a month and Zaps of ${ZAPIER.gratuitEtapesParZap} steps. Or with a webhook and a bit of code calling the Systeme.io API, which costs nothing but means you have to write it.`,
    },
    {
      q: "How do you set a different tag depending on the form answer?",
      r: `With Zapier you need one Zap per possible answer plus paths, which means the Professional plan at ${ZAPIER.professionnelParMoisEn} a month. Every tag also has to exist inside Systeme.io before you can pick it. A quiz tool connected directly, like Tiquiz, ties the tag to the profile with nothing in between.`,
    },
  ],
  finTitre: "A quiz that writes into Systeme.io on its own",
  finCorps:
    "The connection and the tags per profile are in Tiquiz's free plan, at €0, no card, no time limit.",
  finCta: "Try Tiquiz for free →",
  filAccueil: "Home",
  filIntegrations: "Integrations",
  itemListNom: "Connect a form or a quiz to Systeme.io",
};

const TRADUCTIONS: Readonly<Record<Exclude<LanguePublique, typeof LANGUE_SANS_PREFIXE>, TexteHub>> =
  { en: EN };

export const CHEMIN_HUB = "/integrations";

export function contenuHub(langue: LanguePublique): TexteHub {
  return langue === LANGUE_SANS_PREFIXE ? FR : TRADUCTIONS[langue];
}
