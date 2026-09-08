// lib/site/outils/jotform.ts
//
// LES MOTS DE LA PAGE JOTFORM, DANS LES DEUX LANGUES.
//
// Béné, 8 septembre 2026 : "continue la traduction de tout stp." Et,
// le même jour : "il faut à chaque fois utiliser le champ sémantique,
// les expressions, tournures de phrases, ponctuation etc. propre à
// chaque langue, c'est pas uniquement du mot à mot."
//
// -- UN MODULE PAR PAGE, ET C'EST LA MESURE QUI L'IMPOSE --------------
//
// Les six pages d'outil n'ont PAS la même charpente : celle ci porte un
// bloc de code et un tableau à trois colonnes, Tally porte un extrait
// de script, Interact porte trois citations de leur documentation. Une
// interface commune aux six serait donc un mensonge pour chacune, et
// c'est le genre d'abstraction qui force à tordre le contenu.
//
// Ce qui est PARTAGÉ vit déjà ailleurs : les briques d'écran dans
// `components/site/Integrations.tsx`, les chiffres de Zapier dans
// `lib/site/integrations.ts`, le chrome dans `hubIntegrations.ts`.
//
// -- LES TROIS FAITS DE CETTE PAGE ONT ÉTÉ MESURÉS -------------------
//
// Ils sont relevés dans l'en-tête de la page elle même (le bouton qui
// ouvre `integration=Zapier`, le schéma de LEUR page, l'écran du
// constructeur). **Une traduction ne les déplace pas** : `integration=
// Zapier` reste tel quel, et le paramètre d'URL n'est pas du texte.
//
// Et on ne dit pas que Jotform ment, dans aucune des deux langues : le
// raccourci fait vraiment gagner la configuration du Zap, il ne fait
// pas gagner l'abonnement.

import { LANGUE_SANS_PREFIXE, type LanguePublique } from "@/lib/site/langues";
import { ZAPIER, type QuestionFaq } from "@/lib/site/integrations";
import type { CaptureTexte } from "@/lib/site/outils/segments";

// LE TYPE VIT DANS `segments.ts`, un module NEUTRE : il est partage par les
// six pages d'outil, et le re-export garde les appelants existants.
export type { CaptureTexte };


export interface TexteJotform {
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
  boutonTitre: string;
  boutonAvant: string;
  boutonApres: string;
  capturePage: CaptureTexte;
  capturePanneau: CaptureTexte;
  impliqueTitre: string;
  tableauLegende: string;
  tableauEntetes: readonly [string, string, string];
  tableauLignes: readonly (readonly [string, string, string])[];
  impliqueApresAvant: string;
  impliqueApresLien: string;
  quizTitre: string;
  quizPourquoi: string;
  quizTiquiz: string;
  captureProfils: CaptureTexte;
  quizFin: string;
  ctaEssayer: string;
  ctaTousLesOutils: string;
  faq: readonly QuestionFaq[];
}

const FR: TexteJotform = {
  langue: "fr",
  titre: "Jotform et Systeme.io : ça passe par Zapier",
  description:
    "Jotform annonce une intégration Systeme.io. En réalité son bouton ouvre Zapier. Ce que ça implique, et comment connecter les deux proprement.",
  etiquette: "Intégrations",
  h1Avant: "Connecter ",
  h1Surb: "Jotform",
  h1Apres: " à Systeme.io",
  filAccueil: "Accueil",
  filIntegrations: "Intégrations",
  enBref: [
    "Jotform a bien une page « intégration systeme.io », mais son bouton ouvre Zapier : l'adresse contient integration=Zapier. Aucune clé API Systeme.io n'est demandée.",
    "C'est un Zap pré-configuré présenté comme une intégration, avec les mêmes limites que n'importe quel Zap.",
  ],
  intro:
    "Jotform est le plus complet des constructeurs de formulaires : conditions, calculs, paiements, signatures. Sa page d'intégration Systeme.io existe, et c'est ce qui rend le cas particulier.",
  boutonTitre: "Ce que fait vraiment le bouton",
  boutonAvant:
    "Sur jotform.com/integrations/systemeio, le bouton « Use this integration » ouvre cette adresse :",
  boutonApres:
    "Le paramètre est dans l'URL : integration=Zapier. Aucune clé API Systeme.io n'est demandée à aucun moment, et aucun écran d'authentification Systeme.io n'apparaît. Ce que Jotform appelle une intégration est un Zap pré-configuré, et le raccourci est bien pratique, mais il ne change rien aux limites en dessous.",
  capturePage: {
    alt: "La page d'intégration Systeme.io de Jotform, dont le schéma fait passer la connexion par Zapier",
    legende: "Le schéma est de Jotform : entre Jotform et systeme.io, une pastille « zapier ».",
  },
  capturePanneau: {
    alt: "L'intégration Systeme.io de Jotform ouvre un panneau Zapier, avec ses modèles de Zap",
    legende:
      "Dans le constructeur Jotform, l'écran s'intitule ZAPIER et demande de connecter un compte Zapier avant de proposer ses modèles.",
  },
  impliqueTitre: "Ce que ça implique",
  tableauLegende: "Ce que la page d'intégration annonce, et ce qui se passe vraiment",
  tableauEntetes: ["", "Ce qu'annonce la page", "Ce qui se passe"],
  tableauLignes: [
    ["Type de connexion", "intégration Systeme.io", "Zap Jotform vers Systeme.io"],
    ["Compte nécessaire", "Jotform", "Jotform et Zapier"],
    ["Clé API Systeme.io", "non demandée", "gérée par Zapier"],
    ["Volume", "non mentionné", `${ZAPIER.gratuitTachesParMois} tâches par mois en gratuit`],
    ["Tag par réponse", "non mentionné", "plan Zapier payant"],
  ],
  impliqueApresAvant:
    "Le raccourci fait gagner le temps de configuration du Zap. Il ne fait pas gagner l'abonnement. Le détail des limites est sur la page ",
  impliqueApresLien: "Zapier et Systeme.io",
  quizTitre: "Le cas du quiz",
  quizPourquoi: `Jotform sait produire un formulaire conditionnel avec des calculs, ce qui ressemble à un quiz. Ce qu'il ne sait pas faire, c'est envoyer un tag différent par profil dans Systeme.io sans repasser par des chemins Zapier, donc par le plan Professional à ${ZAPIER.professionnelParMois} par mois, et sans créer chaque tag à la main au préalable.`,
  quizTiquiz:
    "Tiquiz écrit dans Systeme.io avec ta clé API, sans intermédiaire. Chaque profil porte son tag, et le tag est créé dans Systeme.io s'il n'existe pas encore. La connexion est comprise dans le plan gratuit, à 0 €, sans carte bancaire.",
  captureProfils: {
    alt: "Les profils d'un quiz Tiquiz et le tag Systeme.io posé sur chacun",
    legende: "Un tag par profil, réglé dans l'éditeur : ni Zap, ni tag à créer avant.",
  },
  quizFin:
    "Pour un formulaire complexe avec paiement et signature, Jotform reste devant, et de loin.",
  ctaEssayer: "Je teste Tiquiz gratuitement →",
  ctaTousLesOutils: "Voir tous les outils",
  faq: [
    {
      q: "Jotform a-t-il une intégration native avec Systeme.io ?",
      r: "Non. Jotform publie une page d'intégration Systeme.io, mais son bouton ouvre un constructeur de Zap : l'adresse contient le paramètre integration=Zapier. Aucune clé API Systeme.io n'est demandée, et la connexion passe donc par un compte Zapier.",
    },
    {
      q: "Faut-il un compte Zapier pour connecter Jotform à Systeme.io ?",
      r: `Oui. Le raccourci proposé par Jotform pré-remplit le Zap, mais il faut un compte Zapier, avec ses limites : ${ZAPIER.gratuitTachesParMois} tâches par mois en gratuit et des Zaps à ${ZAPIER.gratuitEtapesParZap} étapes.`,
    },
    {
      q: "Peut-on poser un tag différent selon la réponse ?",
      r: `Pas avec le plan gratuit. Il faut des chemins dans un Zap multi-étapes, donc le plan Zapier Professional à ${ZAPIER.professionnelParMois} par mois, et chaque tag doit exister dans Systeme.io avant d'être sélectionnable.`,
    },
  ],
};

const EN: TexteJotform = {
  langue: "en",
  titre: "Jotform and Systeme.io: it goes through Zapier",
  description:
    "Jotform advertises a Systeme.io integration. Its button actually opens Zapier. What that means, and how to connect the two properly.",
  etiquette: "Integrations",
  h1Avant: "Connect ",
  h1Surb: "Jotform",
  h1Apres: " to Systeme.io",
  filAccueil: "Home",
  filIntegrations: "Integrations",
  enBref: [
    "Jotform does have a “systeme.io integration” page, but its button opens Zapier: the address contains integration=Zapier. No Systeme.io API key is ever asked for.",
    "It is a pre-filled Zap presented as an integration, with the same limits as any other Zap.",
  ],
  intro:
    "Jotform is the most complete form builder around: conditions, calculations, payments, signatures. Its Systeme.io integration page does exist, and that is what makes this case unusual.",
  boutonTitre: "What the button actually does",
  boutonAvant:
    "On jotform.com/integrations/systemeio, the “Use this integration” button opens this address:",
  boutonApres:
    "The parameter is right there in the URL: integration=Zapier. No Systeme.io API key is requested at any point, and no Systeme.io sign-in screen appears. What Jotform calls an integration is a pre-filled Zap. The shortcut is genuinely handy, and it changes nothing about the limits underneath.",
  capturePage: {
    alt: "Jotform's Systeme.io integration page, whose own diagram routes the connection through Zapier",
    legende: "The diagram is Jotform's own: between Jotform and systeme.io sits a “zapier” chip.",
  },
  capturePanneau: {
    alt: "Jotform's Systeme.io integration opens a Zapier panel, with its Zap templates",
    legende:
      "Inside the Jotform builder, the screen is titled ZAPIER and asks you to connect a Zapier account before it offers any template.",
  },
  impliqueTitre: "What that means for you",
  tableauLegende: "What the integration page announces, and what actually happens",
  tableauEntetes: ["", "What the page announces", "What actually happens"],
  tableauLignes: [
    ["Kind of connection", "Systeme.io integration", "a Jotform to Systeme.io Zap"],
    ["Accounts needed", "Jotform", "Jotform and Zapier"],
    ["Systeme.io API key", "never asked for", "handled by Zapier"],
    ["Volume", "not mentioned", `${ZAPIER.gratuitTachesParMois} tasks a month on the free plan`],
    ["Tag per answer", "not mentioned", "paid Zapier plan"],
  ],
  impliqueApresAvant:
    "The shortcut saves you the time of setting the Zap up. It does not save you the subscription. The limits are laid out on the ",
  impliqueApresLien: "Zapier and Systeme.io",
  quizTitre: "The quiz case",
  quizPourquoi: `Jotform can build a conditional form with calculations, which looks a lot like a quiz. What it cannot do is send a different tag per profile into Systeme.io without going back through Zapier paths, so through the Professional plan at ${ZAPIER.professionnelParMoisEn} a month, and without creating every tag by hand first.`,
  quizTiquiz:
    "Tiquiz writes into Systeme.io with your API key, with nothing in between. Every profile carries its tag, and the tag is created inside Systeme.io if it does not exist yet. The connection is in the free plan, at €0, no card needed.",
  captureProfils: {
    alt: "The profiles of a Tiquiz quiz and the Systeme.io tag set on each one",
    legende: "One tag per profile, set in the editor: no Zap, and no tag to create beforehand.",
  },
  quizFin:
    "For a complex form with payment and signature, Jotform is still ahead, and by a long way.",
  ctaEssayer: "Try Tiquiz for free →",
  ctaTousLesOutils: "See all the tools",
  faq: [
    {
      q: "Does Jotform have a native Systeme.io integration?",
      r: "No. Jotform publishes a Systeme.io integration page, but its button opens a Zap builder: the address carries the parameter integration=Zapier. No Systeme.io API key is requested, so the connection goes through a Zapier account.",
    },
    {
      q: "Do you need a Zapier account to connect Jotform to Systeme.io?",
      r: `Yes. Jotform's shortcut pre-fills the Zap, but you still need a Zapier account, with its limits: ${ZAPIER.gratuitTachesParMois} tasks a month on the free plan, and Zaps of ${ZAPIER.gratuitEtapesParZap} steps.`,
    },
    {
      q: "Can you set a different tag depending on the answer?",
      r: `Not on the free plan. You need paths inside a multi-step Zap, so the Zapier Professional plan at ${ZAPIER.professionnelParMoisEn} a month, and every tag has to exist inside Systeme.io before you can pick it.`,
    },
  ],
};

const TRADUCTIONS: Readonly<
  Record<Exclude<LanguePublique, typeof LANGUE_SANS_PREFIXE>, TexteJotform>
> = { en: EN };

export const CHEMIN_JOTFORM = "/integrations/jotform-systeme-io";

export function contenuJotform(langue: LanguePublique): TexteJotform {
  return langue === LANGUE_SANS_PREFIXE ? FR : TRADUCTIONS[langue];
}
