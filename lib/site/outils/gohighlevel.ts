// lib/site/outils/gohighlevel.ts
//
// LES MOTS DE LA PAGE "CONNECTER TIQUIZ À GOHIGHLEVEL", DANS LES DEUX
// LANGUES (Béné, 14 septembre 2026 : "pages d'aide comme celles de
// Quizify").
//
// Cette page n'est PAS une page du hub `/integrations` au sens des six
// autres : elles disent comment un outil de FORMULAIRE se relie à
// Systeme.io. Celle ci dit comment TIQUIZ se relie à un CRM qui n'est
// pas Systeme.io. Elle vit sous le même chemin parce que c'est là
// qu'un lecteur cherche "gohighlevel", et elle est déclarée à part.
//
// -- CE QUI EST VRAI, ET D'OÙ ÇA VIENT --------------------------------
//
// Tout ce que cette page affirme est vérifiable dans le code :
//   - le contact est créé ou retrouvé, puis les tags sont AJOUTÉS,
//     jamais remplacés (`envoyerVersGhl`, qui n'envoie pas `tags` dans
//     l'upsert parce que leur doc dit qu'il écrase) ;
//   - les tags sont ceux du profil, des réponses, des scores et du
//     partage (`fusionnerTags`, la route de capture) ;
//   - le champ personnalisé `tiquiz_resultat` reçoit le titre du profil
//     s'il existe (`GHL_CHAMP_RESULTAT`) ;
//   - une connexion coupée prévient par email, une fois
//     (`doitAlerterDeconnexion`).
// Aucun chiffre, aucun prix : GoHighLevel change les siens sans nous.

import { LANGUE_SANS_PREFIXE, type LanguePublique } from "@/lib/site/langues";
import type { QuestionFaq } from "@/lib/site/integrations";
import type { Segment } from "@/lib/site/outils/segments";

export interface TexteGoHighLevel {
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
  etapesTitre: string;
  etapes: readonly { titre: string; corps: readonly (readonly Segment[])[] }[];
  envoyeTitre: string;
  envoyeIntro: string;
  envoye: readonly (readonly Segment[])[];
  agenceTitre: string;
  agenceCorps: readonly (readonly Segment[])[];
  pauseTitre: string;
  pauseCorps: readonly (readonly Segment[])[];
  ctaEssayer: string;
  ctaTousLesOutils: string;
  faq: readonly QuestionFaq[];
}

const FR: TexteGoHighLevel = {
  langue: "fr",
  titre: "Connecter Tiquiz à GoHighLevel",
  description:
    "Envoyer les leads d'un quiz Tiquiz dans un sous-compte GoHighLevel, avec le tag du profil obtenu, en trois étapes. Ce qui part, ce qui déclenche un workflow, et comment mettre en pause.",
  etiquette: "Intégrations",
  h1Avant: "Connecter Tiquiz à ",
  h1Surb: "GoHighLevel",
  h1Apres: "",
  filAccueil: "Accueil",
  filIntegrations: "Intégrations",
  enBref: [
    "Tiquiz crée ou met à jour le contact dans le sous-compte GoHighLevel de ton choix, et lui ajoute les tags que tu as écrits sur chaque profil de résultat. Tes workflows démarrent sur « Contact Tag Added », comme pour n'importe quel autre tag.",
    "Trois étapes : connecter le sous-compte, choisir la destination sur le quiz, créer un workflow par tag. Une agence connecte tous ses sous-comptes d'un coup.",
  ],
  intro: [
    "GoHighLevel range tout autour du contact : ses tags, ses champs, ses conversations, ses opportunités. Un quiz Tiquiz produit exactement ce qu'un CRM veut recevoir, une adresse email et une information sur la personne (son profil, ses réponses, son score), et c'est ce que la connexion transporte.",
    "Rien n'est à recréer côté quiz : les tags que tu as posés sur tes profils de résultat servent tels quels. Si ton quiz envoyait déjà ses leads chez Systeme.io, il suffit de changer sa destination.",
  ],
  etapesTitre: "Les trois étapes",
  etapes: [
    {
      titre: "Étape 1 : connecter le sous-compte",
      corps: [
        [
          "Dans Tiquiz : Paramètres, onglet Connexions, carte GoHighLevel, bouton Connecter. Deux façons de faire. Le bouton « Connecter avec GoHighLevel » t'envoie chez eux, tu choisis le sous-compte, tu reviens : rien à copier.",
        ],
        [
          "Ou avec un jeton privé : dans GoHighLevel, ",
          { code: "Settings" },
          ", ",
          { code: "Private Integrations" },
          ", ",
          { code: "Create" },
          ". Coche les droits contacts (lecture et écriture), locations (lecture) et tags (lecture). Colle le jeton et l'identifiant du sous-compte (",
          { code: "Location ID" },
          ", dans ",
          { code: "Business Profile" },
          "). Tiquiz vérifie que le jeton répond avant de l'enregistrer, et il est chiffré chez nous.",
        ],
      ],
    },
    {
      titre: "Étape 2 : choisir la destination sur le quiz",
      corps: [
        [
          "Dans l'éditeur du quiz, onglet Créer, colonne de gauche, groupe « Gestion du quiz » : « Destination des leads ». Choisis la connexion GoHighLevel. Ta première connexion devient la destination par défaut de ton projet, donc tes nouveaux quiz la prennent sans rien régler.",
        ],
      ],
    },
    {
      titre: "Étape 3 : un workflow par tag",
      corps: [
        [
          "Un tag posé ne déclenche rien tout seul, chez GoHighLevel comme ailleurs. Dans le sous-compte : ",
          { code: "Automations" },
          ", ",
          { code: "Workflows" },
          ", crée un workflow par tag. Déclencheur « Contact Tag », filtre « Tag Added », puis le tag. Action : l'email ou la campagne que la personne doit recevoir.",
        ],
        [
          "L'onglet Automatiser de l'éditeur liste, pour ce quiz, les tags exacts qui partiront : un clic les copie. Les noms doivent être identiques au caractère près.",
        ],
      ],
    },
  ],
  envoyeTitre: "Ce qui part chez GoHighLevel",
  envoyeIntro: "À chaque lead capturé, dans cet ordre :",
  envoye: [
    [{ gras: "Le contact" }, " : email, prénom, nom, téléphone et pays quand le quiz les demande. S'il existe déjà, il est mis à jour, jamais dupliqué."],
    [{ gras: "Les tags" }, " : celui du profil obtenu, ceux des réponses d'un sondage, ceux du score si tu les as activés, et le tag de partage quand la personne partage. Ils sont AJOUTÉS aux tags existants du contact, jamais remplacés."],
    [
      { gras: "Le profil obtenu" },
      ", en toutes lettres, dans un champ personnalisé nommé ",
      { code: "tiquiz_resultat" },
      ". Crée ce champ dans le sous-compte pour le recevoir ; sans lui, tout le reste part quand même.",
    ],
    [{ gras: "La source" }, " du contact : « Tiquiz » suivi du titre du quiz."],
  ],
  agenceTitre: "Une agence et ses sous-comptes",
  agenceCorps: [
    [
      "Une connexion vaut pour UN sous-compte, parce que c'est là que vivent les contacts et les workflows. Une agence qui gère dix clients a dix connexions, et chaque quiz choisit la sienne. Le bouton « Connecter avec GoHighLevel » sur une agence les crée toutes d'un coup ; avec un jeton privé créé au niveau de l'agence, « Une agence et tous ses sous-comptes » fait la même chose.",
    ],
  ],
  pauseTitre: "Mettre en pause, et être prévenu",
  pauseCorps: [
    [
      "Chaque connexion a un interrupteur : en pause, plus rien ne part, et les quiz gardent leur réglage. Si GoHighLevel refuse le jeton (révoqué, app désinstallée, droits retirés), la connexion passe en « déconnecté » et tu reçois un email, une seule fois. Les leads arrivés entre temps restent dans Tiquiz et se renvoient depuis Mes leads, bouton Sync.",
    ],
  ],
  ctaEssayer: "Créer mon compte gratuit",
  ctaTousLesOutils: "Voir toutes les intégrations",
  faq: [
    {
      q: "Faut-il Zapier ou Make pour relier Tiquiz à GoHighLevel ?",
      r: "Non. La connexion est directe : Tiquiz parle à l'API de GoHighLevel avec le jeton du sous-compte, sans intermédiaire ni abonnement supplémentaire.",
    },
    {
      q: "Les tags existants du contact sont-ils effacés ?",
      r: "Non. Tiquiz ajoute ses tags à ceux qui sont déjà là. Un contact qui refait un deuxième quiz garde les tags du premier.",
    },
    {
      q: "Un quiz peut-il envoyer ses leads à la fois chez Systeme.io et chez GoHighLevel ?",
      r: "Non, un quiz a une seule destination. Deux quiz, ou une copie du même quiz, peuvent viser deux destinations différentes.",
    },
    {
      q: "Que se passe-t-il si le jeton est révoqué ?",
      r: "La connexion passe en « déconnecté », tu reçois un email une seule fois, et rien ne part jusqu'à ce que tu colles un nouveau jeton ou que tu reconnectes. Les leads restent dans Tiquiz et se renvoient ensuite.",
    },
    {
      q: "Dans quelle langue arrivent les tags ?",
      r: "Dans celle où tu les as écrits. Tiquiz n'invente ni ne traduit aucun tag : ce que tu poses sur le profil est ce que GoHighLevel reçoit, au caractère près.",
    },
  ],
};

const EN: TexteGoHighLevel = {
  langue: "en",
  titre: "Connect Tiquiz to GoHighLevel",
  description:
    "Send the leads of a Tiquiz quiz into a GoHighLevel sub-account, with the tag of the result they got, in three steps. What is sent, what triggers a workflow, and how to pause.",
  etiquette: "Integrations",
  h1Avant: "Connect Tiquiz to ",
  h1Surb: "GoHighLevel",
  h1Apres: "",
  filAccueil: "Home",
  filIntegrations: "Integrations",
  enBref: [
    "Tiquiz creates or updates the contact in the GoHighLevel sub-account you choose, and adds the tags you wrote on each result profile. Your workflows start on \"Contact Tag Added\", like with any other tag.",
    "Three steps: connect the sub-account, pick the destination on the quiz, create one workflow per tag. An agency connects all its sub-accounts at once.",
  ],
  intro: [
    "GoHighLevel organises everything around the contact: tags, fields, conversations, opportunities. A Tiquiz quiz produces exactly what a CRM wants to receive, an email address and something known about the person (their profile, their answers, their score), and that is what the connection carries.",
    "Nothing to rebuild on the quiz side: the tags you put on your result profiles are used as they are. If your quiz already sent its leads to Systeme.io, just change its destination.",
  ],
  etapesTitre: "The three steps",
  etapes: [
    {
      titre: "Step 1: connect the sub-account",
      corps: [
        [
          "In Tiquiz: Settings, Connections tab, GoHighLevel card, Connect. Two ways. The \"Connect with GoHighLevel\" button sends you to them, you pick the sub-account, you come back: nothing to copy.",
        ],
        [
          "Or with a private token: in GoHighLevel, ",
          { code: "Settings" },
          ", ",
          { code: "Private Integrations" },
          ", ",
          { code: "Create" },
          ". Tick contacts (read and write), locations (read) and tags (read). Paste the token and the sub-account ID (",
          { code: "Location ID" },
          ", under ",
          { code: "Business Profile" },
          "). Tiquiz checks that the token responds before saving it, and it is encrypted on our side.",
        ],
      ],
    },
    {
      titre: "Step 2: pick the destination on the quiz",
      corps: [
        [
          "In the quiz editor, Create tab, left column, \"Quiz management\" group: \"Where this quiz's leads go\". Pick the GoHighLevel connection. Your first connection becomes the default destination of your project, so new quizzes use it with nothing to set.",
        ],
      ],
    },
    {
      titre: "Step 3: one workflow per tag",
      corps: [
        [
          "A tag on its own triggers nothing, in GoHighLevel as anywhere else. In the sub-account: ",
          { code: "Automations" },
          ", ",
          { code: "Workflows" },
          ", create one workflow per tag. Trigger \"Contact Tag\", filter \"Tag Added\", then the tag. Action: the email or campaign the person should receive.",
        ],
        [
          "The Automate tab of the editor lists, for this quiz, the exact tags that will be sent: one click copies them. Names must match character for character.",
        ],
      ],
    },
  ],
  envoyeTitre: "What is sent to GoHighLevel",
  envoyeIntro: "For each captured lead, in this order:",
  envoye: [
    [{ gras: "The contact" }, ": email, first name, last name, phone and country when the quiz asks for them. If it already exists, it is updated, never duplicated."],
    [{ gras: "The tags" }, ": the one of the result profile, those of survey answers, those of the score if you enabled them, and the share tag when the person shares. They are ADDED to the contact's existing tags, never replaced."],
    [
      { gras: "The result profile" },
      ", in plain words, in a custom field named ",
      { code: "tiquiz_resultat" },
      ". Create that field in the sub-account to receive it; without it, everything else is still sent.",
    ],
    [{ gras: "The source" }, " of the contact: \"Tiquiz\" followed by the quiz title."],
  ],
  agenceTitre: "An agency and its sub-accounts",
  agenceCorps: [
    [
      "One connection is for ONE sub-account, because that is where contacts and workflows live. An agency managing ten clients has ten connections, and each quiz picks its own. The \"Connect with GoHighLevel\" button on an agency creates them all at once; with a private token created at agency level, \"An agency and all its sub-accounts\" does the same.",
    ],
  ],
  pauseTitre: "Pausing, and being warned",
  pauseCorps: [
    [
      "Each connection has a switch: paused, nothing is sent anymore, and quizzes keep their setting. If GoHighLevel rejects the token (revoked, app uninstalled, permissions removed), the connection turns \"disconnected\" and you get one email, once. Leads captured in the meantime stay in Tiquiz and can be resent from My leads, Sync button.",
    ],
  ],
  ctaEssayer: "Create my free account",
  ctaTousLesOutils: "See all integrations",
  faq: [
    {
      q: "Do I need Zapier or Make to connect Tiquiz to GoHighLevel?",
      r: "No. The connection is direct: Tiquiz talks to the GoHighLevel API with the sub-account token, no middleman and no extra subscription.",
    },
    {
      q: "Are the contact's existing tags erased?",
      r: "No. Tiquiz adds its tags to those already there. A contact who takes a second quiz keeps the tags from the first one.",
    },
    {
      q: "Can one quiz send its leads to both Systeme.io and GoHighLevel?",
      r: "No, a quiz has a single destination. Two quizzes, or a copy of the same quiz, can target two different destinations.",
    },
    {
      q: "What happens if the token is revoked?",
      r: "The connection turns \"disconnected\", you get one email, once, and nothing is sent until you paste a new token or reconnect. Leads stay in Tiquiz and can be resent afterwards.",
    },
    {
      q: "In which language do the tags arrive?",
      r: "In the one you wrote them in. Tiquiz neither invents nor translates any tag: what you put on the profile is what GoHighLevel receives, character for character.",
    },
  ],
};

const TRADUCTIONS: Readonly<Record<Exclude<LanguePublique, typeof LANGUE_SANS_PREFIXE>, TexteGoHighLevel>> = { en: EN };

export const CHEMIN_GOHIGHLEVEL = "/integrations/gohighlevel";

export function contenuGoHighLevel(langue: LanguePublique): TexteGoHighLevel {
  return langue === LANGUE_SANS_PREFIXE ? FR : TRADUCTIONS[langue];
}
