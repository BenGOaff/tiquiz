// lib/site/outils/zapier.ts
//
// LES MOTS DE LA PAGE ZAPIER, DANS LES DEUX LANGUES.
//
// Béné, 8 septembre 2026 : "continue la traduction de tout stp." Et :
// "il faut à chaque fois utiliser le champ sémantique, les expressions,
// tournures de phrases, ponctuation etc. propre à chaque langue, c'est
// pas uniquement du mot à mot."
//
// 🚨 DEUX FAITS À NE JAMAIS INVERSER, DANS AUCUNE DES DEUX LANGUES :
//
// 1. **Systeme.io n'est PAS une application "Premium" sur Zapier** :
//    elle est accessible depuis le plan gratuit. Ce qui coince, c'est le
//    nombre de tâches et d'étapes. Écrire l'inverse enverrait le lecteur
//    payer pour une raison qui n'existe pas.
// 2. **Les chiffres viennent de `ZAPIER`**, relevés sur la capture que
//    la page affiche, jamais recopiés ici. Le document de départ
//    annonçait 19,99 $ et la capture dit 29,99 $.
//
// -- LES MORCEAUX EN TROIS PARTIES, ET POURQUOI ----------------------
//
// Trois paragraphes de cette page portent un `<strong>` AU MILIEU d'une
// phrase. Le module rend donc `[avant, gras, apres]` : mettre la balise
// dans le texte obligerait à l'injecter en `innerHTML`, et retirer
// l'emphase perdrait exactement la ligne qui dit "ne paie pas pour
// rien".

import { LANGUE_SANS_PREFIXE, type LanguePublique } from "@/lib/site/langues";
import { ZAPIER, type QuestionFaq } from "@/lib/site/integrations";
import type { CaptureTexte } from "@/lib/site/outils/segments";

/** Un paragraphe dont le milieu est en gras. */
export type PhraseAvecGras = readonly [avant: string, gras: string, apres: string];

export interface TexteZapier {
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
  exposeTitre: string;
  declencheursFort: string;
  declencheurs: string;
  actionsFort: string;
  actions: string;
  actionUtile: string;
  captureActions: CaptureTexte;
  limitesTitre: string;
  tableauLegende: string;
  tableauEntetes: readonly [string, string, string];
  tableauLignes: readonly (readonly [string, string, string])[];
  limitesApres: PhraseAvecGras;
  captureTarifs: CaptureTexte;
  momentTitre: string;
  momentIntro: string;
  momentEtapes: readonly string[];
  eviteTitre: string;
  eviteTiquiz: PhraseAvecGras;
  eviteReste: string;
  ctaEssayer: string;
  ctaTousLesOutils: string;
  faq: readonly QuestionFaq[];
}

const FR: TexteZapier = {
  langue: "fr",
  titre: "Zapier et Systeme.io : ce que le plan gratuit permet",
  description:
    "Connecter Zapier à Systeme.io : les actions disponibles, les limites réelles du plan gratuit, et à partir de quand il faut passer au payant.",
  etiquette: "Intégrations",
  h1Avant: "Connecter ",
  h1Surb: "Zapier",
  h1Apres: " à Systeme.io",
  filAccueil: "Accueil",
  filIntegrations: "Intégrations",
  enBref: [
    "L'application Systeme.io existe sur Zapier et elle est accessible dès le plan gratuit : elle n'est pas classée « Premium ». La limite est ailleurs.",
    `Le plan gratuit donne ${ZAPIER.gratuitTachesParMois} tâches par mois et des Zaps à ${ZAPIER.gratuitEtapesParZap} étapes. Pour poser un tag différent selon une réponse, il faut des chemins, donc le plan Professional à ${ZAPIER.professionnelParMois} par mois.`,
  ],
  intro:
    "Zapier est le passage obligé de la plupart des intégrations Systeme.io, puisque presque aucun outil ne s'y connecte directement. Voici ce qu'il sait faire et où il s'arrête.",
  exposeTitre: "Ce que Systeme.io expose dans Zapier",
  declencheursFort: "Déclencheurs :",
  declencheurs:
    " nouvelle inscription à un formulaire d'opt-in, nouvelle vente, tag ajouté à un contact, campagne terminée, nouvelle inscription à un webinaire.",
  actionsFort: "Actions :",
  actions:
    " créer ou mettre à jour un contact avec ses tags, retirer un tag, inscrire ou désinscrire d'une campagne, donner ou retirer l'accès à un cours.",
  actionUtile:
    "L'action utile dans neuf cas sur dix s'appelle « Create or Update a Contact, Including Adding Tags ». Elle crée le contact s'il n'existe pas, le met à jour sinon, et pose les tags choisis dans la foulée.",
  captureActions: {
    alt: "Les actions Systeme.io proposées dans Zapier : créer ou mettre à jour un contact avec ses tags, retirer un tag, inscrire ou désinscrire d'une campagne",
    legende: "Les actions Systeme.io telles que Zapier les propose, dans un Zap réel.",
  },
  limitesTitre: "Les limites, chiffrées",
  tableauLegende: "Ce que le plan gratuit de Zapier permet, comparé au plan Professional",
  tableauEntetes: ["", "Plan gratuit", "Professional"],
  tableauLignes: [
    ["Prix", "0 €", `${ZAPIER.professionnelParMois} par mois`],
    ["Tâches par mois", String(ZAPIER.gratuitTachesParMois), "selon le palier choisi"],
    ["Étapes par Zap", String(ZAPIER.gratuitEtapesParZap), "illimitées"],
    ["Chemins et filtres", "disponibles", "disponibles"],
    ["Applications Premium", "non", "oui"],
  ],
  limitesApres: [
    "Deux précisions qui comptent. ",
    "Systeme.io n'est pas une application Premium",
    ` : son accès n'est pas ce qui bloque. Et les étapes « Filter », « Formatter » et « Path » ne consomment pas de tâche, ce qui aide sur le quota mais pas sur la limite de ${ZAPIER.gratuitEtapesParZap} étapes.`,
  ],
  captureTarifs: {
    alt: `Le plan gratuit de Zapier est limité à ${ZAPIER.gratuitTachesParMois} tâches par mois et ${ZAPIER.gratuitEtapesParZap} étapes par Zap, le plan Professional démarre à ${ZAPIER.professionnelParMois} par mois`,
    legende: "La page de tarifs de Zapier, en septembre 2026.",
  },
  momentTitre: "Le moment où le plan gratuit ne suffit plus",
  momentIntro: "Trois situations, et elles arrivent vite.",
  momentEtapes: [
    "Le volume dépasse cent réponses par mois. Cent tâches, c'est cent formulaires remplis, pas cent visiteurs.",
    "Le tag doit dépendre de la réponse. Un tag unique pour tout le monde tient en deux étapes. Un tag par profil demande des chemins, donc un Zap multi-étapes, donc le plan payant.",
    "Il faut plusieurs actions à la suite : créer le contact, poser le tag, puis l'inscrire à une campagne. Trois étapes.",
  ],
  eviteTitre: "Ce qui évite Zapier entièrement",
  eviteTiquiz: [
    "Pour un quiz, Tiquiz écrit dans Systeme.io avec ta clé API, sans intermédiaire. Chaque profil porte son tag, et Tiquiz ",
    "crée le tag dans Systeme.io s'il n'existe pas encore",
    " : rien à préparer à l'avance, aucun Zap à dupliquer. La connexion et les tags sont compris dans le plan gratuit de Tiquiz, à 0 €, sans carte bancaire.",
  ],
  eviteReste:
    "Pour tout le reste (Calendly, Stripe, une boutique, un formulaire de contact), Zapier reste le bon outil.",
  ctaEssayer: "Je teste Tiquiz gratuitement →",
  ctaTousLesOutils: "Voir tous les outils",
  faq: [
    {
      q: "Systeme.io est-il une application Premium sur Zapier ?",
      r: "Non. L'application Systeme.io est accessible depuis le plan gratuit de Zapier. Ce sont le nombre de tâches mensuelles et le nombre d'étapes par Zap qui limitent, pas l'accès à l'application.",
    },
    {
      q: "Combien de tâches Zapier consomme un formulaire rempli ?",
      r: `Une tâche par action exécutée. Un Zap simple qui crée un contact avec son tag consomme une tâche par réponse, soit ${ZAPIER.gratuitTachesParMois} réponses par mois sur le plan gratuit. Les étapes Filter, Formatter et Path ne comptent pas.`,
    },
    {
      q: "Peut-on poser un tag différent selon la réponse avec le plan gratuit ?",
      r: `Non. Cela demande des chemins dans un Zap multi-étapes, réservé au plan Professional à ${ZAPIER.professionnelParMois} par mois. Le tag doit également exister dans Systeme.io avant d'être sélectionnable dans Zapier.`,
    },
  ],
};

const EN: TexteZapier = {
  langue: "en",
  titre: "Zapier and Systeme.io: what the free plan covers",
  description:
    "Connecting Zapier to Systeme.io: the available actions, the real limits of the free plan, and the point where you have to start paying.",
  etiquette: "Integrations",
  h1Avant: "Connect ",
  h1Surb: "Zapier",
  h1Apres: " to Systeme.io",
  filAccueil: "Home",
  filIntegrations: "Integrations",
  enBref: [
    "The Systeme.io app does exist on Zapier, and it is available on the free plan: it is not flagged as “Premium”. The limit sits somewhere else.",
    `The free plan gives you ${ZAPIER.gratuitTachesParMois} tasks a month and Zaps of ${ZAPIER.gratuitEtapesParZap} steps. To set a different tag depending on an answer you need paths, so the Professional plan at ${ZAPIER.professionnelParMoisEn} a month.`,
  ],
  intro:
    "Zapier is the toll gate of almost every Systeme.io integration, because barely any tool connects to it directly. Here is what it can do, and where it stops.",
  exposeTitre: "What Systeme.io exposes inside Zapier",
  declencheursFort: "Triggers:",
  declencheurs:
    " a new opt-in form submission, a new sale, a tag added to a contact, a campaign completed, a new webinar registration.",
  actionsFort: "Actions:",
  actions:
    " create or update a contact along with its tags, remove a tag, subscribe or unsubscribe from a campaign, grant or revoke access to a course.",
  actionUtile:
    "The action you want nine times out of ten is called “Create or Update a Contact, Including Adding Tags”. It creates the contact if it does not exist, updates it if it does, and sets the chosen tags in the same move.",
  captureActions: {
    alt: "The Systeme.io actions offered inside Zapier: create or update a contact with its tags, remove a tag, subscribe or unsubscribe from a campaign",
    legende: "The Systeme.io actions exactly as Zapier offers them, inside a real Zap.",
  },
  limitesTitre: "The limits, in numbers",
  tableauLegende: "What Zapier's free plan covers, next to the Professional plan",
  tableauEntetes: ["", "Free plan", "Professional"],
  tableauLignes: [
    ["Price", "€0", `${ZAPIER.professionnelParMoisEn} a month`],
    ["Tasks a month", String(ZAPIER.gratuitTachesParMois), "depends on the tier you pick"],
    ["Steps per Zap", String(ZAPIER.gratuitEtapesParZap), "unlimited"],
    ["Paths and filters", "available", "available"],
    ["Premium apps", "no", "yes"],
  ],
  limitesApres: [
    "Two details that matter. ",
    "Systeme.io is not a Premium app",
    `: getting to it is not what blocks you. And the “Filter”, “Formatter” and “Path” steps do not burn a task, which helps with the quota but not with the ${ZAPIER.gratuitEtapesParZap}-step ceiling.`,
  ],
  captureTarifs: {
    alt: `Zapier's free plan is capped at ${ZAPIER.gratuitTachesParMois} tasks a month and ${ZAPIER.gratuitEtapesParZap} steps per Zap, the Professional plan starts at ${ZAPIER.professionnelParMoisEn} a month`,
    legende: "Zapier's pricing page, in September 2026.",
  },
  momentTitre: "The point where the free plan runs out",
  momentIntro: "Three situations, and they show up fast.",
  momentEtapes: [
    "Your volume goes past a hundred submissions a month. A hundred tasks means a hundred forms filled in, not a hundred visitors.",
    "The tag has to depend on the answer. One tag for everybody fits in two steps. One tag per profile needs paths, so a multi-step Zap, so the paid plan.",
    "You need several actions in a row: create the contact, set the tag, then subscribe it to a campaign. That is three steps.",
  ],
  eviteTitre: "What skips Zapier altogether",
  eviteTiquiz: [
    "For a quiz, Tiquiz writes into Systeme.io with your API key, with nothing in between. Every profile carries its tag, and Tiquiz ",
    "creates the tag inside Systeme.io if it does not exist yet",
    ": nothing to prepare in advance, no Zap to duplicate. The connection and the tags are in the Tiquiz free plan, at €0, no card needed.",
  ],
  eviteReste:
    "For everything else (Calendly, Stripe, a shop, a contact form), Zapier is still the right tool.",
  ctaEssayer: "Try Tiquiz for free →",
  ctaTousLesOutils: "See all the tools",
  faq: [
    {
      q: "Is Systeme.io a Premium app on Zapier?",
      r: "No. The Systeme.io app is available on Zapier's free plan. What limits you is the number of monthly tasks and the number of steps per Zap, not access to the app.",
    },
    {
      q: "How many Zapier tasks does one form submission burn?",
      r: `One task per action run. A simple Zap that creates a contact with its tag burns one task per submission, so ${ZAPIER.gratuitTachesParMois} submissions a month on the free plan. Filter, Formatter and Path steps do not count.`,
    },
    {
      q: "Can you set a different tag per answer on the free plan?",
      r: `No. That needs paths inside a multi-step Zap, which is reserved for the Professional plan at ${ZAPIER.professionnelParMoisEn} a month. The tag also has to exist inside Systeme.io before Zapier will let you pick it.`,
    },
  ],
};

const TRADUCTIONS: Readonly<
  Record<Exclude<LanguePublique, typeof LANGUE_SANS_PREFIXE>, TexteZapier>
> = { en: EN };

export const CHEMIN_ZAPIER = "/integrations/zapier-systeme-io";

export function contenuZapier(langue: LanguePublique): TexteZapier {
  return langue === LANGUE_SANS_PREFIXE ? FR : TRADUCTIONS[langue];
}
