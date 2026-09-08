// lib/site/outils/tally.ts
//
// LES MOTS DE LA PAGE TALLY, DANS LES DEUX LANGUES.
//
// Béné, 8 septembre 2026 : "continue la traduction de tout stp." Et :
// "il faut à chaque fois utiliser le champ sémantique, les expressions,
// tournures de phrases, ponctuation etc. propre à chaque langue, c'est
// pas uniquement du mot à mot."
//
// 🚨 LE FAIT VÉRIFIÉ DANS CE DÉPÔT, ET IL EST LE COEUR DE LA PAGE :
// Tiquiz CRÉE le tag Systeme.io quand il manque. Ce n'est pas une
// promesse commerciale, c'est `app/api/quiz/[quizId]/public/route.ts`,
// qui fait `POST /tags` sur un nom introuvable avant de le poser sur le
// contact. À ne pas confondre avec `poserTagParNom` (les ventes et la
// newsletter), qui ne crée JAMAIS un tag avec la clé de Béné : un nom
// mal orthographié se retrouverait en double dans SA liste.
//
// -- LES SEGMENTS, ET POURQUOI ----------------------------------------
//
// Cette page porte des `<code>` et des `<strong>` AU MILIEU de ses
// phrases, plus un lien interne. Une phrase est donc une SUITE de
// segments : mettre la balise dans la chaîne obligerait à l'injecter en
// `innerHTML`, et découper en "avant / après" fabriquerait une clé par
// morceau, donc une traduction impossible à relire.
//
// Les noms de points d'entrée de l'API Systeme.io ne se traduisent
// JAMAIS : `POST /tags` s'écrit pareil dans toutes les langues, et le
// traduire enverrait le lecteur appeler une adresse qui n'existe pas.

import { LANGUE_SANS_PREFIXE, type LanguePublique } from "@/lib/site/langues";
import { ZAPIER, type QuestionFaq } from "@/lib/site/integrations";
import type { CaptureTexte, Segment } from "@/lib/site/outils/segments";

export type { Segment };

export interface TexteTally {
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
  intro: readonly string[];
  captureIntegrations: CaptureTexte;
  comparTitre: string;
  comparLegende: string;
  comparEntetes: readonly [string, string, string, string];
  comparLignes: readonly (readonly [string, string, string, string])[];
  m1Titre: string;
  m1Corps: readonly (readonly Segment[])[];
  m2Titre: string;
  m2Corps: readonly (readonly Segment[])[];
  captureZap: CaptureTexte;
  m2Lien: readonly Segment[];
  m3Titre: string;
  m3Corps: string;
  quizTitre: string;
  quizCorps: readonly (readonly Segment[])[];
  captureCle: CaptureTexte;
  captureContact: CaptureTexte;
  quizFin: readonly string[];
  ctaEssayer: string;
  ctaTousLesOutils: string;
  faq: readonly QuestionFaq[];
}

const CHEMIN_ZAPIER_INTERNE = "/integrations/zapier-systeme-io";

const FR: TexteTally = {
  langue: "fr",
  titre: "Connecter Tally à Systeme.io : les 3 méthodes",
  description:
    "Tally n'a pas d'intégration Systeme.io. Webhook, Zapier ou Make : ce que chaque méthode demande, ce qu'elle coûte, et le piège des tags.",
  etiquette: "Intégrations",
  h1Avant: "Connecter ",
  h1Surb: "Tally",
  h1Apres: " à Systeme.io",
  filAccueil: "Accueil",
  filIntegrations: "Intégrations",
  enBref: [
    "Tally n'a pas d'intégration Systeme.io : elle ne figure pas dans sa liste. Trois méthodes existent quand même.",
    `Un webhook Tally vers l'API Systeme.io, gratuit mais avec un peu de code. Zapier, gratuit jusqu'à ${ZAPIER.gratuitTachesParMois} réponses par mois. Ou Make. Pour un quiz qui pose un tag différent par profil, aucune des trois ne suffit sans passer au payant.`,
  ],
  intro: [
    "Tally est gratuit pour presque tout, et c'est ce qui rend la question fréquente : le formulaire est fait en dix minutes, mais les réponses restent chez Tally pendant que la liste de contacts est dans Systeme.io.",
    "Les intégrations proposées par Tally sont Google Sheets, Notion, Coda, Airtable, Slack, Discord, Linear, Attio et les webhooks, plus les plateformes d'automatisation. Systeme.io n'y figure pas.",
  ],
  captureIntegrations: {
    alt: "La page des intégrations de Tally, où Systeme.io ne figure pas",
    legende: "La liste des intégrations de Tally : Systeme.io n'y est pas.",
  },
  comparTitre: "Les trois méthodes, comparées",
  comparLegende:
    "Coût, compétence et temps de mise en place des trois méthodes pour relier Tally à Systeme.io",
  comparEntetes: ["", "Webhook et code", "Zapier", "Make"],
  comparLignes: [
    ["Coût", "0 €", `0 € jusqu'à ${ZAPIER.gratuitTachesParMois} réponses par mois`, "selon le volume"],
    ["Compétence", "savoir programmer", "aucune", "prise en main moyenne"],
    ["Mise en place", "une à deux heures", "un quart d'heure", "une demi-heure"],
    ["Tag par profil", "possible", "plan payant", "possible"],
  ],
  m1Titre: "Méthode 1 : le webhook, directement sur l'API Systeme.io",
  m1Corps: [
    ["La plus propre et la moins chère. La seule qui demande du code."],
    [
      "Tally envoie chaque réponse à une adresse au choix. Systeme.io reçoit un contact sur son API. Ils ne parlent pas la même langue : il faut donc un petit service au milieu qui traduit, par exemple une fonction Netlify ou un worker Cloudflare, dont les plans gratuits suffisent largement.",
    ],
    [
      "Ce que ce service doit faire, dans l'ordre : recevoir le webhook Tally, en extraire l'email et les réponses, appeler ",
      { code: "POST https://api.systeme.io/api/contacts" },
      " avec l'en-tête ",
      { code: "X-API-Key" },
      ", récupérer l'identifiant du contact, puis appeler ",
      { code: "POST /contacts/{id}/tags" },
      ".",
    ],
    [
      { gras: "Le piège, et il n'est documenté nulle part :" },
      " Systeme.io attend l'identifiant du tag, pas son nom. Il faut donc chercher le tag avec ",
      { code: "GET /tags?query=NomDuTag" },
      ", et le créer avec ",
      { code: "POST /tags" },
      " s'il n'existe pas. Sans ça, le contact arrive sans tag et aucune automatisation ne se déclenche. L'erreur est difficile à voir, parce que tout a l'air de fonctionner : le contact est bien là.",
    ],
  ],
  m2Titre: "Méthode 2 : Zapier",
  m2Corps: [
    [
      "Déclencheur « New Submission » chez Tally, action « Create or Update a Contact, Including Adding Tags » chez Systeme.io. Le champ email est associé, le tag choisi, le Zap activé. Un quart d'heure.",
    ],
    [
      `Le plan gratuit donne ${ZAPIER.gratuitTachesParMois} tâches par mois et des Zaps à ${ZAPIER.gratuitEtapesParZap} étapes. Tant que le tag est le même pour tout le monde, deux étapes suffisent.`,
    ],
  ],
  captureZap: {
    alt: "Un Zap qui relie une réponse Tally à la création d'un contact dans Systeme.io",
    legende: "Le Zap, une fois configuré : Tally déclenche, Systeme.io crée le contact.",
  },
  m2Lien: [
    "Le détail des limites de Zapier, chiffré : ",
    { lien: "Zapier et Systeme.io", chemin: CHEMIN_ZAPIER_INTERNE },
    ".",
  ],
  m3Titre: "Méthode 3 : Make, Pabbly ou n8n",
  m3Corps:
    "Même principe, tarifs différents. Make est plus généreux sur le volume et moins simple à prendre en main. Pabbly se paie une fois. n8n s'héberge soi-même, gratuitement.",
  quizTitre: "Le cas du quiz",
  quizCorps: [
    [
      "Tout ce qui précède vaut pour un formulaire : un email, un prénom, un tag pour tout le monde.",
    ],
    [
      "Un quiz pose cinq questions, calcule un profil, et chaque profil doit poser un tag différent. Avec Tally et Zapier, cela signifie un Zap par profil, des chemins, donc le plan Professional, plus chaque tag créé à la main dans Systeme.io au préalable.",
    ],
    [
      "Tiquiz couvre exactement ce cas. La clé API Systeme.io est collée une fois, les profils sont écrits, et chaque personne qui termine le quiz arrive dans Systeme.io avec le tag de son profil. Tiquiz cherche le tag et ",
      { gras: "le crée s'il n'existe pas" },
      ". Un profil peut porter plusieurs tags.",
    ],
  ],
  captureCle: {
    alt: "L'écran de Tiquiz où se colle la clé API Systeme.io",
    legende: "La clé API se colle une seule fois, dans les réglages de Tiquiz.",
  },
  captureContact: {
    alt: "Un contact arrivé dans Systeme.io avec le tag de son profil de quiz",
    legende:
      "Le contact arrive dans Systeme.io avec le tag de son profil, sans intermédiaire.",
  },
  quizFin: [
    "La connexion à Systeme.io et les tags sont dans le plan gratuit de Tiquiz, à 0 €, sans carte bancaire, sans limite de durée.",
    "Tally reste excellent pour les formulaires de contact et les inscriptions simples.",
  ],
  ctaEssayer: "Je teste Tiquiz gratuitement →",
  ctaTousLesOutils: "Voir tous les outils",
  faq: [
    {
      q: "Tally a-t-il une intégration Systeme.io ?",
      r: "Non. La page des intégrations de Tally liste Google Sheets, Notion, Coda, Airtable, Slack, Discord, Linear, Attio et les webhooks, ainsi que les plateformes d'automatisation. Systeme.io n'y figure pas.",
    },
    {
      q: "Peut-on connecter Tally à Systeme.io sans Zapier ?",
      r: "Oui, avec un webhook Tally qui pointe vers un petit service appelant l'API Systeme.io. C'est gratuit, mais cela demande de programmer, parce que les deux outils n'échangent pas le même format de données.",
    },
    {
      q: "Pourquoi le contact arrive-t-il sans son tag ?",
      r: "Parce que l'API Systeme.io attend l'identifiant numérique du tag, pas son nom. Il faut d'abord chercher le tag avec GET /tags?query=, le créer avec POST /tags s'il n'existe pas, puis poser son identifiant sur le contact.",
    },
  ],
};

const EN: TexteTally = {
  langue: "en",
  titre: "Connect Tally to Systeme.io: the 3 methods",
  description:
    "Tally has no Systeme.io integration. Webhook, Zapier or Make: what each method asks of you, what it costs, and the tag trap.",
  etiquette: "Integrations",
  h1Avant: "Connect ",
  h1Surb: "Tally",
  h1Apres: " to Systeme.io",
  filAccueil: "Home",
  filIntegrations: "Integrations",
  enBref: [
    "Tally has no Systeme.io integration: it is not on their list. Three methods still get you there.",
    `A Tally webhook straight to the Systeme.io API, free but with a bit of code. Zapier, free up to ${ZAPIER.gratuitTachesParMois} submissions a month. Or Make. For a quiz that sets a different tag per profile, none of the three is enough without paying.`,
  ],
  intro: [
    "Tally is free for almost everything, which is exactly why the question comes up so often: the form takes ten minutes to build, but the answers stay inside Tally while your contact list lives in Systeme.io.",
    "The integrations Tally offers are Google Sheets, Notion, Coda, Airtable, Slack, Discord, Linear, Attio and webhooks, plus the automation platforms. Systeme.io is not among them.",
  ],
  captureIntegrations: {
    alt: "Tally's integrations page, where Systeme.io does not appear",
    legende: "Tally's list of integrations: Systeme.io is not on it.",
  },
  comparTitre: "The three methods, side by side",
  comparLegende:
    "Cost, skill and setup time for the three ways of wiring Tally to Systeme.io",
  comparEntetes: ["", "Webhook and code", "Zapier", "Make"],
  comparLignes: [
    ["Cost", "€0", `€0 up to ${ZAPIER.gratuitTachesParMois} submissions a month`, "depends on volume"],
    ["Skill", "you need to code", "none", "a moderate learning curve"],
    ["Setup", "one to two hours", "fifteen minutes", "half an hour"],
    ["Tag per profile", "possible", "paid plan", "possible"],
  ],
  m1Titre: "Method 1: the webhook, straight onto the Systeme.io API",
  m1Corps: [
    ["The cleanest and the cheapest. The only one that asks you to code."],
    [
      "Tally posts every submission to any address you choose. Systeme.io takes a contact on its API. They do not speak the same language, so you need a small service in the middle to translate, a Netlify function or a Cloudflare worker for instance, whose free plans are more than enough.",
    ],
    [
      "What that service has to do, in order: take the Tally webhook, pull the email and the answers out of it, call ",
      { code: "POST https://api.systeme.io/api/contacts" },
      " with the ",
      { code: "X-API-Key" },
      " header, read back the contact id, then call ",
      { code: "POST /contacts/{id}/tags" },
      ".",
    ],
    [
      { gras: "The trap, and it is documented nowhere:" },
      " Systeme.io expects the tag id, not its name. So you have to look the tag up with ",
      { code: "GET /tags?query=TagName" },
      ", and create it with ",
      { code: "POST /tags" },
      " if it is not there yet. Without that, the contact lands with no tag and no automation fires. The mistake is hard to spot, because everything looks fine: the contact really is there.",
    ],
  ],
  m2Titre: "Method 2: Zapier",
  m2Corps: [
    [
      "The “New Submission” trigger on the Tally side, the “Create or Update a Contact, Including Adding Tags” action on the Systeme.io side. Map the email field, pick the tag, switch the Zap on. Fifteen minutes.",
    ],
    [
      `The free plan gives you ${ZAPIER.gratuitTachesParMois} tasks a month and Zaps of ${ZAPIER.gratuitEtapesParZap} steps. As long as everybody gets the same tag, two steps are enough.`,
    ],
  ],
  captureZap: {
    alt: "A Zap wiring a Tally submission to the creation of a contact in Systeme.io",
    legende: "The Zap once it is set up: Tally fires, Systeme.io creates the contact.",
  },
  m2Lien: [
    "The Zapier limits in numbers: ",
    { lien: "Zapier and Systeme.io", chemin: CHEMIN_ZAPIER_INTERNE },
    ".",
  ],
  m3Titre: "Method 3: Make, Pabbly or n8n",
  m3Corps:
    "Same idea, different pricing. Make is more generous on volume and harder to get the hang of. Pabbly is a one-off payment. n8n you host yourself, for free.",
  quizTitre: "The quiz case",
  quizCorps: [
    ["Everything above holds for a form: one email, one first name, one tag for everybody."],
    [
      "A quiz asks five questions, works out a profile, and every profile has to set a different tag. With Tally and Zapier that means one Zap per profile, paths, so the Professional plan, plus every tag created by hand inside Systeme.io beforehand.",
    ],
    [
      "Tiquiz covers exactly that case. You paste the Systeme.io API key once, you write your profiles, and everyone who finishes the quiz lands in Systeme.io with their profile's tag. Tiquiz looks the tag up and ",
      { gras: "creates it if it does not exist" },
      ". One profile can carry several tags.",
    ],
  ],
  captureCle: {
    alt: "The Tiquiz screen where you paste the Systeme.io API key",
    legende: "The API key gets pasted once, in the Tiquiz settings.",
  },
  captureContact: {
    alt: "A contact that landed in Systeme.io with the tag of its quiz profile",
    legende:
      "The contact lands in Systeme.io with its profile's tag, with nothing in between.",
  },
  quizFin: [
    "The Systeme.io connection and the tags are in the Tiquiz free plan, at €0, no card needed, no time limit.",
    "Tally is still excellent for contact forms and simple sign-ups.",
  ],
  ctaEssayer: "Try Tiquiz for free →",
  ctaTousLesOutils: "See all the tools",
  faq: [
    {
      q: "Does Tally have a Systeme.io integration?",
      r: "No. Tally's integrations page lists Google Sheets, Notion, Coda, Airtable, Slack, Discord, Linear, Attio and webhooks, along with the automation platforms. Systeme.io is not there.",
    },
    {
      q: "Can you connect Tally to Systeme.io without Zapier?",
      r: "Yes, with a Tally webhook pointing at a small service that calls the Systeme.io API. It is free, but it asks you to code, because the two tools do not exchange the same data format.",
    },
    {
      q: "Why does the contact land without its tag?",
      r: "Because the Systeme.io API expects the numeric tag id, not its name. You first have to look the tag up with GET /tags?query=, create it with POST /tags if it is missing, then set its id on the contact.",
    },
  ],
};

const TRADUCTIONS: Readonly<
  Record<Exclude<LanguePublique, typeof LANGUE_SANS_PREFIXE>, TexteTally>
> = { en: EN };

export const CHEMIN_TALLY = "/integrations/tally-systeme-io";

export function contenuTally(langue: LanguePublique): TexteTally {
  return langue === LANGUE_SANS_PREFIXE ? FR : TRADUCTIONS[langue];
}
