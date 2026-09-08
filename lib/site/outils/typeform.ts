// lib/site/outils/typeform.ts
//
// LES MOTS DE LA PAGE TYPEFORM, DANS LES DEUX LANGUES.
//
// 🚨 AUCUN PRIX N'EST ÉCRIT À LA MAIN ICI.
//
// Le prix de Zapier vient de `ZAPIER`, relevé sur la capture que la page
// Zapier affiche. Le prix de Tiquiz vient du CATALOGUE (`OWNER_CATALOG`),
// c'est à dire de ce que le bon de commande encaisse vraiment. C'est la
// leçon du blog : un montant recopié est un montant faux au premier
// changement de tarif, et ici il vit dans un tableau de comparaison,
// donc à l'endroit exact où un lecteur le vérifie.
//
// ET LE MONTANT SE FORMATE DANS LA LANGUE QUI LE LIT : `17,00 €` en
// français, `€17.00` en anglais (mesuré, pas supposé). Servir la forme
// française dans une phrase anglaise se remarque tout de suite, et c'est
// exactement ce que Béné a demandé le 8 septembre ("la ponctuation
// propre à chaque langue, c'est pas uniquement du mot à mot").
//
// -- LE LIEN VERS LE COMPARATIF DU BLOG, ET SA DÉCISION ---------------
//
// `comparatif-outils-quiz-systeme-io` n'a PAS de version anglaise (les
// quatre articles traduits sont 17-reasons, capturing-emails,
// create-quiz-systeme-io et monthly-recurring-income). Son adresse
// reste donc NUE, ce que `hrefPourLangue` fait déjà tout seul, et le
// libellé anglais DIT que l'article est en français : promettre de
// l'anglais derrière un clic qui mène au français est le seul vrai
// mensonge possible ici.

import { LANGUE_SANS_PREFIXE, type LanguePublique } from "@/lib/site/langues";
import { OWNER_CATALOG, formatCents } from "@/lib/checkout/catalog";
import { ZAPIER, type QuestionFaq } from "@/lib/site/integrations";
import type { CaptureTexte, Segment } from "@/lib/site/outils/segments";

/** Le prix du palier d'entrée, lu dans le catalogue, jamais recopié. */
const PRIX_TIQUIZ_FR = formatCents(
  OWNER_CATALOG.mensuel.amountCents,
  OWNER_CATALOG.mensuel.currency,
  "fr",
);
const PRIX_TIQUIZ_EN = formatCents(
  OWNER_CATALOG.mensuel.amountCents,
  OWNER_CATALOG.mensuel.currency,
  "en",
);

const CHEMIN_COMPARATIF = "/blog/comparatif-outils-quiz-systeme-io";

export interface TexteTypeform {
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
  captureRecherche: CaptureTexte;
  methodeTitre: string;
  methodeCorps: readonly (readonly Segment[])[];
  captureZap: CaptureTexte;
  coutTitre: string;
  coutLegende: string;
  coutEntetes: readonly [string, string, string, string];
  coutLignes: readonly (readonly [string, string, string, string])[];
  coutApres: readonly string[];
  quizTitre: string;
  quizCorps: readonly string[];
  captureCle: CaptureTexte;
  quizLien: readonly Segment[];
  ctaEssayer: string;
  ctaTousLesOutils: string;
  faq: readonly QuestionFaq[];
}

const FR: TexteTypeform = {
  langue: "fr",
  // 53 caractères avec le suffixe " · Tiquiz". L'ancien en faisait 63,
  // donc Google en coupait la fin. "Connecter" saute plutôt que le mot
  // clé : la requête visée est "typeform systeme io".
  titre: "Typeform et Systeme.io : méthode et coût réel",
  description:
    "Typeform n'a pas d'intégration Systeme.io native. La méthode avec Zapier, les deux pièges de configuration, et le calcul du coût à l'année.",
  etiquette: "Intégrations",
  h1Avant: "Connecter ",
  h1Surb: "Typeform",
  h1Apres: " à Systeme.io",
  filAccueil: "Accueil",
  filIntegrations: "Intégrations",
  enBref: [
    "Typeform n'a pas d'intégration Systeme.io. La connexion passe par Zapier ou Make : compter deux abonnements, dont un qui sert uniquement de transport.",
    "Deux pièges à la configuration : le champ email doit être de type email dans Typeform, et le tag doit exister dans Systeme.io avant de créer le Zap.",
  ],
  intro:
    "Typeform est le plus soigné des outils de formulaire : une question par écran, des transitions douces, un taux de complétion élevé. La connexion à Systeme.io, elle, passe par un tiers.",
  captureRecherche: {
    alt: "Une recherche Systeme.io dans les intégrations Typeform ne donne aucun résultat",
    legende:
      "La recherche « systeme » dans l'annuaire d'intégrations de Typeform : aucun résultat.",
  },
  methodeTitre: "La méthode",
  methodeCorps: [
    [
      "Dans Zapier, déclencheur « New Entry » chez Typeform, action « Create or Update a Contact, Including Adding Tags » chez Systeme.io. Le champ email est associé, le tag choisi, le Zap testé avec une vraie réponse, puis activé.",
    ],
    [
      "Deux détails coûtent une heure quand personne ne les signale. Le champ email doit être un vrai champ de ",
      { gras: "type email" },
      " dans Typeform, sinon Zapier propose une liste de champs sans lui. Et le tag doit ",
      { gras: "exister dans Systeme.io avant" },
      " la configuration du Zap, sinon il n'apparaît pas dans la liste déroulante.",
    ],
  ],
  captureZap: {
    alt: "Le Zap qui relie une réponse Typeform à un contact Systeme.io",
    legende: "Le Zap une fois configuré : Typeform déclenche, Systeme.io crée le contact.",
  },
  coutTitre: "Le coût, posé à plat",
  coutLegende: "Ce que coûte la connexion vers Systeme.io selon l'outil choisi",
  coutEntetes: ["", "Typeform seul", "Typeform + Zapier", "Tiquiz"],
  coutLignes: [
    ["Outil", "plan gratuit limité en réponses", "idem", `0 € puis ${PRIX_TIQUIZ_FR} par mois`],
    [
      "Transport vers Systeme.io",
      "impossible",
      `0 € jusqu'à ${ZAPIER.gratuitTachesParMois} réponses par mois, puis ${ZAPIER.professionnelParMois}`,
      "compris",
    ],
    ["Tag différent par profil", "non", "plan Zapier payant obligatoire", "compris"],
    ["Tags à créer à la main", "sans objet", "oui, un par profil", "non, créés au passage"],
  ],
  coutApres: [
    "Le plan gratuit de Typeform limite le nombre de réponses mensuelles, ce qui est précisément le chiffre qu'on cherche à faire monter.",
    "Ce calcul se défend malgré tout : une entreprise qui fait déjà tourner quinze automatisations sur Zapier paie cette connexion zéro de plus.",
  ],
  quizTitre: "Le cas du quiz",
  quizCorps: [
    "Un quiz à quatre profils demande quatre tags différents selon la réponse. Chez Zapier, cela veut dire des chemins, donc des Zaps multi-étapes, donc le plan payant, sans alternative. Plus les quatre tags créés à la main dans Systeme.io avant de commencer.",
    "Tiquiz associe le tag au profil directement, avec la clé API Systeme.io collée une fois. Le tag est cherché puis créé s'il manque. La connexion est comprise dans le plan gratuit, à 0 €, sans carte bancaire.",
  ],
  captureCle: {
    alt: "L'écran de Tiquiz où se colle la clé API Systeme.io",
    legende: "La clé API se colle une seule fois, dans les réglages de Tiquiz.",
  },
  quizLien: [
    "Le comparatif des outils de quiz, avec leurs prix réels : ",
    { lien: "comparatif des outils de quiz pour Systeme.io", chemin: CHEMIN_COMPARATIF },
    ".",
  ],
  ctaEssayer: "Je crée mon quiz gratuitement →",
  ctaTousLesOutils: "Voir tous les outils",
  faq: [
    {
      q: "Typeform a-t-il une intégration Systeme.io ?",
      r: "Non. Aucune intégration native n'existe entre Typeform et Systeme.io. La connexion passe par une plateforme d'automatisation comme Zapier, Make ou Pabbly.",
    },
    {
      q: "Pourquoi le tag n'apparaît-il pas dans Zapier ?",
      r: "Parce qu'il n'existe pas encore dans Systeme.io. Zapier ne propose que les tags déjà créés dans le compte. Il faut créer le tag dans Systeme.io, puis recharger la liste dans Zapier.",
    },
    {
      q: "Combien coûte la connexion Typeform vers Systeme.io ?",
      r: `Zéro jusqu'à ${ZAPIER.gratuitTachesParMois} réponses par mois avec un tag unique, grâce au plan gratuit de Zapier. Au delà, ou dès qu'il faut un tag différent selon la réponse, le plan Zapier Professional à ${ZAPIER.professionnelParMois} par mois devient obligatoire, en plus de l'abonnement Typeform.`,
    },
  ],
};

const EN: TexteTypeform = {
  langue: "en",
  titre: "Typeform and Systeme.io: method and real cost",
  description:
    "Typeform has no native Systeme.io integration. The Zapier method, the two setup traps, and what the connection really costs over a year.",
  etiquette: "Integrations",
  h1Avant: "Connect ",
  h1Surb: "Typeform",
  h1Apres: " to Systeme.io",
  filAccueil: "Home",
  filIntegrations: "Integrations",
  enBref: [
    "Typeform has no Systeme.io integration. The connection goes through Zapier or Make, so count on two subscriptions, one of which is nothing but transport.",
    "Two traps at setup: the email field has to be an email-type field inside Typeform, and the tag has to exist inside Systeme.io before you build the Zap.",
  ],
  intro:
    "Typeform is the most polished of the form builders: one question per screen, soft transitions, a high completion rate. The connection to Systeme.io, though, goes through a third party.",
  captureRecherche: {
    alt: "A search for Systeme.io in the Typeform integrations returns no result",
    legende: "Searching “systeme” in Typeform's integration directory: no result.",
  },
  methodeTitre: "The method",
  methodeCorps: [
    [
      "Inside Zapier, the “New Entry” trigger on the Typeform side, the “Create or Update a Contact, Including Adding Tags” action on the Systeme.io side. Map the email field, pick the tag, test the Zap with a real submission, then switch it on.",
    ],
    [
      "Two details cost you an hour when nobody warns you. The email field has to be a real ",
      { gras: "email-type" },
      " field inside Typeform, otherwise Zapier hands you a list of fields without it. And the tag has to ",
      { gras: "exist inside Systeme.io before" },
      " you configure the Zap, otherwise it never shows up in the dropdown.",
    ],
  ],
  captureZap: {
    alt: "The Zap wiring a Typeform submission to a Systeme.io contact",
    legende: "The Zap once it is set up: Typeform fires, Systeme.io creates the contact.",
  },
  coutTitre: "The cost, laid flat",
  coutLegende: "What the connection to Systeme.io costs depending on the tool you pick",
  coutEntetes: ["", "Typeform alone", "Typeform + Zapier", "Tiquiz"],
  coutLignes: [
    [
      "Tool",
      "free plan, capped on submissions",
      "same",
      `€0 then ${PRIX_TIQUIZ_EN} a month`,
    ],
    [
      "Transport to Systeme.io",
      "not possible",
      `€0 up to ${ZAPIER.gratuitTachesParMois} submissions a month, then ${ZAPIER.professionnelParMoisEn}`,
      "included",
    ],
    ["A different tag per profile", "no", "paid Zapier plan required", "included"],
    ["Tags to create by hand", "not applicable", "yes, one per profile", "no, created on the fly"],
  ],
  coutApres: [
    "Typeform's free plan caps how many submissions you get a month, which is precisely the number you are trying to push up.",
    "The maths still holds in one case: a company already running fifteen automations on Zapier pays nothing extra for this connection.",
  ],
  quizTitre: "The quiz case",
  quizCorps: [
    "A quiz with four profiles needs four different tags depending on the answer. On the Zapier side that means paths, so multi-step Zaps, so the paid plan, with no way around it. Plus the four tags created by hand inside Systeme.io before you start.",
    "Tiquiz pins the tag to the profile directly, with the Systeme.io API key pasted once. The tag is looked up, then created if it is missing. The connection is in the free plan, at €0, no card needed.",
  ],
  captureCle: {
    alt: "The Tiquiz screen where you paste the Systeme.io API key",
    legende: "The API key gets pasted once, in the Tiquiz settings.",
  },
  quizLien: [
    "The quiz tools compared, with their real prices: ",
    { lien: "quiz tools for Systeme.io, compared (in French)", chemin: CHEMIN_COMPARATIF },
    ".",
  ],
  ctaEssayer: "Build my quiz for free →",
  ctaTousLesOutils: "See all the tools",
  faq: [
    {
      q: "Does Typeform have a Systeme.io integration?",
      r: "No. There is no native integration between Typeform and Systeme.io. The connection goes through an automation platform such as Zapier, Make or Pabbly.",
    },
    {
      q: "Why does the tag not show up inside Zapier?",
      r: "Because it does not exist inside Systeme.io yet. Zapier only offers the tags already created in the account. Create the tag inside Systeme.io, then reload the list in Zapier.",
    },
    {
      q: "What does the Typeform to Systeme.io connection cost?",
      r: `Nothing up to ${ZAPIER.gratuitTachesParMois} submissions a month with a single tag, thanks to Zapier's free plan. Beyond that, or as soon as you need a different tag per answer, the Zapier Professional plan at ${ZAPIER.professionnelParMoisEn} a month becomes mandatory, on top of your Typeform subscription.`,
    },
  ],
};

const TRADUCTIONS: Readonly<
  Record<Exclude<LanguePublique, typeof LANGUE_SANS_PREFIXE>, TexteTypeform>
> = { en: EN };

export const CHEMIN_TYPEFORM = "/integrations/typeform-systeme-io";

export function contenuTypeform(langue: LanguePublique): TexteTypeform {
  return langue === LANGUE_SANS_PREFIXE ? FR : TRADUCTIONS[langue];
}
