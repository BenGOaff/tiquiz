// lib/site/outils/gohighlevel.ts
//
// LES MOTS DE LA PAGE "CONNECTER TIQUIZ À GOHIGHLEVEL", DANS LES DEUX
// LANGUES (Béné, 14 septembre 2026 : "pages d'aide comme celles de
// Quizify" ; puis le 15 : "sur chaque carte de connexion à un outil
// tiers, il faudra un lien qui s'ouvre dans une nouvelle fenêtre avec
// le step by step comme Quizify : illustré, guidé à chaque étape").
//
// Cette page n'est PAS une page du hub `/integrations` au sens des six
// autres : elles disent comment un outil de FORMULAIRE se relie à
// Systeme.io. Celle ci dit comment TIQUIZ se relie à un CRM qui n'est
// pas Systeme.io. Elle vit sous le même chemin parce que c'est là
// qu'un lecteur cherche "gohighlevel", et elle est déclarée à part.
//
// -- LE GUIDE EST UNE SUITE D'ÉTAPES, ET CHAQUE ÉTAPE DIT OÙ ELLE SE
//    PASSE ---------------------------------------------------------------
//
// Le guide de Quizify que Béné a montré fait une chose que le nôtre ne
// faisait pas : UNE action par étape, dans l'ordre où on la fait, avec
// l'écran correspondant. Le premier jet racontait "les trois étapes"
// en trois paragraphes : juste, et pas suivable clic par clic.
//
// Et chaque étape porte `ou` : "tiquiz" ou "gohighlevel". C'est SA
// remarque du 15 septembre en testant ("c'est dans marketplace ou
// dans mon compte test highlevel ?") : un guide qui alterne deux
// produits sans dire lequel perd la lectrice à la deuxième étape.
//
// -- LES CAPTURES : nommées, jamais inventées ------------------------
//
// Chaque étape porte `capture.aFaire`, l'écran à photographier, et
// `capture.image`, le fichier quand il existe. Aucune capture ne peut
// être produite d'ici : il n'y a ni compte GoHighLevel ni base joignable
// dans cet environnement, et une capture "reconstituée" serait un faux.
// Tant que `image` est null, la page AFFICHE l'encadré qui nomme l'écran
// (c'est ce que font déjà les 8 pages de fonctionnalités depuis le
// 5 septembre) : un espace vide passerait pour un oubli, un écran nommé
// se remplit en deux minutes dans un vrai compte.
//
// -- CE QUI EST VRAI, ET D'OÙ ÇA VIENT --------------------------------
//
// Tout ce que cette page affirme est vérifiable dans le code :
//   - la connexion est le bouton OAuth, et lui seul, depuis le
//     15 septembre (`ConnexionsTab`, plus aucun jeton à l'écran) ;
//   - le contact est créé ou retrouvé, puis les tags sont AJOUTÉS,
//     jamais remplacés (`envoyerVersGhl`, qui n'envoie pas `tags` dans
//     l'upsert parce que leur doc dit qu'il écrase). Mesuré le
//     15 septembre sur le sous-compte de test de Béné : un deuxième
//     passage ajoute un deuxième tag et garde le premier ;
//   - les tags sont ceux du profil, des réponses, des scores et du
//     partage (`fusionnerTags`, la route de capture) ;
//   - le champ personnalisé `tiquiz_resultat` reçoit le titre du profil,
//     et les champs personnalisés du formulaire partent chacun dans un
//     champ qui porte leur libellé ; ces champs sont CRÉÉS s'ils manquent
//     (`ecrireChampsGhl`, 16 septembre 2026), à condition que la
//     connexion porte les scopes `locations/customFields.*` ;
//   - une connexion coupée prévient par email, une fois
//     (`doitAlerterDeconnexion`).
// Aucun chiffre, aucun prix : GoHighLevel change les siens sans nous.
// Et on ne dit PAS que GoHighLevel crée un tag inconnu à la première
// pose : ce n'est pas mesuré. Le guide conseille un tag qui existe déjà.

import { LANGUE_SANS_PREFIXE, type LanguePublique } from "@/lib/site/langues";
import type { QuestionFaq } from "@/lib/site/integrations";
import type { Segment } from "@/lib/site/outils/segments";

/** Le produit dans lequel une étape se passe. */
export type OuSePasse = "tiquiz" | "gohighlevel";

/** Une capture posée : le fichier vit dans `public/integrations/`. */
export interface ImageCapture {
  readonly fichier: string;
  readonly largeur: number;
  readonly hauteur: number;
  readonly alt: string;
  readonly legende: string;
}

export interface EtapeGuide {
  readonly titre: string;
  readonly ou: OuSePasse;
  readonly corps: readonly (readonly Segment[])[];
  readonly capture: {
    /** L'écran à photographier, dit en clair tant que l'image manque. */
    readonly aFaire: string;
    readonly image: ImageCapture | null;
  };
}

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
  etapesIntro: string;
  /** Le badge de chaque étape : dans quel produit on est. */
  ou: Readonly<Record<OuSePasse, string>>;
  /** Le mot "Étape" devant le numéro. */
  etapeMot: string;
  /** Le titre de l'encadré quand la capture manque. */
  captureAAjouter: string;
  etapes: readonly EtapeGuide[];
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
    "Envoyer les leads d'un quiz Tiquiz dans un sous-compte GoHighLevel, avec le tag du profil obtenu, en huit étapes guidées. Ce qui part, ce qui déclenche un workflow, et comment mettre en pause.",
  etiquette: "Intégrations",
  h1Avant: "Connecter Tiquiz à ",
  h1Surb: "GoHighLevel",
  h1Apres: "",
  filAccueil: "Accueil",
  filIntegrations: "Intégrations",
  enBref: [
    "Tiquiz crée ou met à jour le contact dans le sous-compte GoHighLevel de ton choix, et lui ajoute les tags que tu as écrits sur chaque profil de résultat. Tes workflows démarrent sur \"Contact Tag Added\", comme pour n'importe quel autre tag.",
    "Connexion native : un bouton, tu choisis le sous-compte chez GoHighLevel, tu reviens. Pas de Zapier, pas de Make, rien à copier. Une agence connecte tous ses sous-comptes d'un coup.",
  ],
  intro: [
    "GoHighLevel range tout autour du contact : ses tags, ses champs, ses conversations, ses opportunités. Un quiz Tiquiz produit exactement ce qu'un CRM veut recevoir, une adresse email et une information sur la personne (son profil, ses réponses, son score), et c'est ce que la connexion transporte.",
    "Rien n'est à recréer côté quiz : les tags que tu as posés sur tes profils de résultat servent tels quels. Si ton quiz envoyait déjà ses leads chez Systeme.io, il suffit de changer sa destination.",
  ],
  etapesTitre: "Le guide, étape par étape",
  etapesIntro:
    "Huit étapes, dans l'ordre où tu les fais. Chacune dit dans quel produit tu es : Tiquiz, ou ton compte GoHighLevel. Compte dix minutes la première fois, deux les suivantes.",
  ou: { tiquiz: "Dans Tiquiz", gohighlevel: "Dans GoHighLevel" },
  etapeMot: "Étape",
  captureAAjouter: "Capture d'écran à ajouter",
  etapes: [
    {
      titre: "Ouvre l'onglet Connexions",
      ou: "tiquiz",
      corps: [
        [
          "Va dans ",
          { gras: "Paramètres" },
          ", onglet ",
          { gras: "Connexions" },
          ". Tu y vois une carte par outil. Sur la carte GoHighLevel, clique sur ",
          { gras: "Connecter" },
          ". C'est le seul geste de cette étape : rien à copier, rien à coller.",
        ],
      ],
      capture: {
        aFaire: "L'onglet Connexions de Tiquiz, avec la carte GoHighLevel et son bouton Connecter.",
        image: null,
      },
    },
    {
      titre: "Choisis le sous-compte",
      ou: "gohighlevel",
      corps: [
        [
          "Tu arrives chez GoHighLevel, connecté à ton compte. La page liste tes sous-comptes (tes ",
          { code: "Locations" },
          "). Choisis celui qui doit recevoir les leads de tes quiz, puis autorise Tiquiz. Une agence peut en cocher plusieurs : chacun devient une connexion.",
        ],
        [
          "Tiquiz ne demande que le nécessaire : lire et écrire les contacts, lire les sous-comptes, lire les tags. Rien sur tes conversations, tes paiements ni tes rendez-vous.",
        ],
      ],
      capture: {
        aFaire: "La page GoHighLevel qui liste les sous-comptes, avec celui à choisir coché.",
        image: null,
      },
    },
    {
      titre: "Vérifie que ça répond",
      ou: "tiquiz",
      corps: [
        [
          "Tu reviens dans Tiquiz, et la fenêtre GoHighLevel s'ouvre toute seule avec ton sous-compte. Clique sur ",
          { gras: "Tester" },
          " : tu dois lire \"Ça répond : la connexion est active\". Tu peux renommer la connexion, la mettre en pause, ou en ajouter une autre avec ",
          { gras: "Ajouter un sous-compte" },
          ".",
        ],
      ],
      capture: {
        aFaire: "La fenêtre GoHighLevel dans Tiquiz, avec le sous-compte connecté et le bouton Tester.",
        image: null,
      },
    },
    {
      titre: "Choisis la destination du quiz",
      ou: "tiquiz",
      corps: [
        [
          "Ouvre le quiz, onglet ",
          { gras: "Créer" },
          ", colonne de gauche, groupe \"Gestion du quiz\" : ",
          { gras: "Destination des leads" },
          ". Choisis ta connexion GoHighLevel. Ta première connexion devient la destination par défaut de ton projet, donc tes prochains quiz la prennent sans rien régler.",
        ],
      ],
      capture: {
        aFaire: "Le sélecteur Destination des leads dans l'éditeur, réglé sur la connexion GoHighLevel.",
        image: null,
      },
    },
    {
      titre: "Écris un tag sur chaque profil",
      ou: "tiquiz",
      corps: [
        [
          "Toujours dans l'onglet Créer, ouvre chaque profil de résultat. Sous son texte, le champ ",
          { gras: "Tag à appliquer aux personnes qui ont obtenu ce profil" },
          ". Le plus sûr est un tag qui existe déjà dans ton sous-compte, écrit au caractère près. Un sondage pose un tag par réponse ; un quiz scoré peut aussi poser un tag par tranche de score.",
        ],
      ],
      capture: {
        aFaire: "Un profil de résultat ouvert dans l'éditeur, avec son tag renseigné.",
        image: null,
      },
    },
    {
      titre: "Copie la liste de tes tags",
      ou: "tiquiz",
      corps: [
        [
          "Onglet ",
          { gras: "Automatiser" },
          " de l'éditeur : il liste, pour ce quiz, les tags exacts qui partiront chez GoHighLevel, et la recette à refaire pour chacun. Un clic sur un tag le copie. C'est cette liste que tu vas prendre à l'étape suivante.",
        ],
      ],
      capture: {
        aFaire: "L'onglet Automatiser, avec la liste des tags du quiz et la recette GoHighLevel.",
        image: null,
      },
    },
    {
      titre: "Crée un workflow par tag",
      ou: "gohighlevel",
      corps: [
        [
          "Un tag posé ne déclenche rien tout seul, chez GoHighLevel comme ailleurs. Dans le sous-compte : ",
          { code: "Automations" },
          ", ",
          { code: "Workflows" },
          ", ",
          { code: "Create Workflow" },
          ". Déclencheur ",
          { code: "Contact Tag" },
          ", filtre ",
          { code: "Tag Added" },
          ", puis colle le tag. Action : l'email ou la campagne que la personne doit recevoir. Publie le workflow.",
        ],
        ["Recommence pour chaque tag de la liste. Un profil sans workflow reçoit son tag, et rien d'autre."],
      ],
      capture: {
        aFaire: "Un workflow GoHighLevel avec le déclencheur Contact Tag, le filtre Tag Added et le tag collé.",
        image: null,
      },
    },
    {
      titre: "Fais un vrai passage de quiz",
      ou: "gohighlevel",
      corps: [
        [
          "Passe ton quiz avec une adresse de test, jusqu'à l'écran d'email. Dans ",
          { code: "Contacts" },
          ", le contact apparaît avec le tag de son profil, la source \"Tiquiz : \" suivie du titre du quiz, et le profil en toutes lettres dans le champ ",
          { code: "tiquiz_resultat" },
          ". Refais le quiz avec la même adresse et un autre résultat : le second tag s'ajoute, le premier reste.",
        ],
      ],
      capture: {
        aFaire: "La fiche du contact de test dans GoHighLevel, avec le tag du profil et la source Tiquiz.",
        image: null,
      },
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
      ". Tiquiz le crée dans le sous-compte s'il manque ; si la création est refusée, tout le reste part quand même.",
    ],
    [
      { gras: "Les champs personnalisés" },
      " de ton formulaire de capture, chacun dans un champ de contact qui porte son libellé, créé s'il manque. Renommer un champ dans l'éditeur crée un nouveau champ chez GoHighLevel : l'ancien garde ses valeurs.",
    ],
    [{ gras: "La source" }, " du contact : \"Tiquiz\" suivi du titre du quiz."],
  ],
  agenceTitre: "Une agence et ses sous-comptes",
  agenceCorps: [
    [
      "Une connexion vaut pour UN sous-compte, parce que c'est là que vivent les contacts et les workflows. Une agence qui gère dix clients a dix connexions, et chaque quiz choisit la sienne. Le bouton Connecter, lancé depuis une agence, propose tous ses sous-comptes d'un coup ; \"Ajouter un sous-compte\" en rajoute un plus tard.",
    ],
  ],
  pauseTitre: "Mettre en pause, et être prévenu",
  pauseCorps: [
    [
      "Chaque connexion a un interrupteur : en pause, plus rien ne part, et les quiz gardent leur réglage. Si GoHighLevel refuse la connexion (app désinstallée, droits retirés), elle passe en \"déconnecté\" et tu reçois un email, une seule fois. Les leads arrivés entre temps restent dans Tiquiz et se renvoient depuis Mes leads, bouton Sync, dès que tu as reconnecté.",
    ],
  ],
  ctaEssayer: "Créer mon compte gratuit",
  ctaTousLesOutils: "Voir toutes les intégrations",
  faq: [
    {
      q: "Faut-il Zapier ou Make pour relier Tiquiz à GoHighLevel ?",
      r: "Non. La connexion est directe : Tiquiz parle à l'API de GoHighLevel pour le sous-compte que tu as autorisé, sans intermédiaire ni abonnement supplémentaire.",
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
      q: "Que se passe-t-il si je désinstalle Tiquiz de GoHighLevel ?",
      r: "La connexion passe en \"déconnecté\", tu reçois un email une seule fois, et rien ne part jusqu'à ce que tu reconnectes le sous-compte. Les leads restent dans Tiquiz et se renvoient ensuite.",
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
    "Send the leads of a Tiquiz quiz into a GoHighLevel sub-account, with the tag of the result they got, in eight guided steps. What is sent, what triggers a workflow, and how to pause.",
  etiquette: "Integrations",
  h1Avant: "Connect Tiquiz to ",
  h1Surb: "GoHighLevel",
  h1Apres: "",
  filAccueil: "Home",
  filIntegrations: "Integrations",
  enBref: [
    "Tiquiz creates or updates the contact in the GoHighLevel sub-account you choose, and adds the tags you wrote on each result profile. Your workflows start on \"Contact Tag Added\", like with any other tag.",
    "Native connection: one button, you pick the sub-account at GoHighLevel, you come back. No Zapier, no Make, nothing to copy. An agency connects all its sub-accounts at once.",
  ],
  intro: [
    "GoHighLevel organises everything around the contact: tags, fields, conversations, opportunities. A Tiquiz quiz produces exactly what a CRM wants to receive, an email address and something known about the person (their profile, their answers, their score), and that is what the connection carries.",
    "Nothing to rebuild on the quiz side: the tags you put on your result profiles are used as they are. If your quiz already sent its leads to Systeme.io, just change its destination.",
  ],
  etapesTitre: "The guide, step by step",
  etapesIntro:
    "Eight steps, in the order you do them. Each one says which product you are in: Tiquiz, or your GoHighLevel account. Count ten minutes the first time, two the next ones.",
  ou: { tiquiz: "In Tiquiz", gohighlevel: "In GoHighLevel" },
  etapeMot: "Step",
  captureAAjouter: "Screenshot to add",
  etapes: [
    {
      titre: "Open the Connections tab",
      ou: "tiquiz",
      corps: [
        [
          "Go to ",
          { gras: "Settings" },
          ", ",
          { gras: "Connections" },
          " tab. You see one card per tool. On the GoHighLevel card, click ",
          { gras: "Connect" },
          ". That is the only action of this step: nothing to copy, nothing to paste.",
        ],
      ],
      capture: {
        aFaire: "The Connections tab in Tiquiz, with the GoHighLevel card and its Connect button.",
        image: null,
      },
    },
    {
      titre: "Pick the sub-account",
      ou: "gohighlevel",
      corps: [
        [
          "You land at GoHighLevel, logged into your account. The page lists your sub-accounts (your ",
          { code: "Locations" },
          "). Pick the one that should receive your quiz leads, then authorise Tiquiz. An agency can tick several: each becomes a connection.",
        ],
        [
          "Tiquiz only asks for what it needs: read and write contacts, read sub-accounts, read tags. Nothing about your conversations, payments or appointments.",
        ],
      ],
      capture: {
        aFaire: "The GoHighLevel page listing the sub-accounts, with the one to pick ticked.",
        image: null,
      },
    },
    {
      titre: "Check that it responds",
      ou: "tiquiz",
      corps: [
        [
          "You are back in Tiquiz, and the GoHighLevel window opens by itself with your sub-account. Click ",
          { gras: "Test" },
          ": you should read \"It responds: the connection is active\". You can rename the connection, pause it, or add another one with ",
          { gras: "Add a sub-account" },
          ".",
        ],
      ],
      capture: {
        aFaire: "The GoHighLevel window in Tiquiz, with the connected sub-account and the Test button.",
        image: null,
      },
    },
    {
      titre: "Pick the quiz destination",
      ou: "tiquiz",
      corps: [
        [
          "Open the quiz, ",
          { gras: "Create" },
          " tab, left column, \"Quiz management\" group: ",
          { gras: "Where this quiz's leads go" },
          ". Pick your GoHighLevel connection. Your first connection becomes the default destination of your project, so your next quizzes use it with nothing to set.",
        ],
      ],
      capture: {
        aFaire: "The lead destination selector in the editor, set to the GoHighLevel connection.",
        image: null,
      },
    },
    {
      titre: "Write a tag on each profile",
      ou: "tiquiz",
      corps: [
        [
          "Still in the Create tab, open each result profile. Below its text, the field ",
          { gras: "Tag to apply to people who got this profile" },
          ". The safest choice is a tag that already exists in your sub-account, written character for character. A survey applies one tag per answer; a scored quiz can also apply one tag per score range.",
        ],
      ],
      capture: {
        aFaire: "A result profile open in the editor, with its tag filled in.",
        image: null,
      },
    },
    {
      titre: "Copy the list of your tags",
      ou: "tiquiz",
      corps: [
        [
          "The ",
          { gras: "Automate" },
          " tab of the editor lists, for this quiz, the exact tags that will be sent to GoHighLevel, and the recipe to repeat for each. One click on a tag copies it. This is the list you take to the next step.",
        ],
      ],
      capture: {
        aFaire: "The Automate tab, with the list of the quiz's tags and the GoHighLevel recipe.",
        image: null,
      },
    },
    {
      titre: "Create one workflow per tag",
      ou: "gohighlevel",
      corps: [
        [
          "A tag on its own triggers nothing, in GoHighLevel as anywhere else. In the sub-account: ",
          { code: "Automations" },
          ", ",
          { code: "Workflows" },
          ", ",
          { code: "Create Workflow" },
          ". Trigger ",
          { code: "Contact Tag" },
          ", filter ",
          { code: "Tag Added" },
          ", then paste the tag. Action: the email or campaign the person should receive. Publish the workflow.",
        ],
        ["Repeat for each tag in the list. A profile without a workflow gets its tag, and nothing else."],
      ],
      capture: {
        aFaire: "A GoHighLevel workflow with the Contact Tag trigger, the Tag Added filter and the pasted tag.",
        image: null,
      },
    },
    {
      titre: "Take the quiz for real",
      ou: "gohighlevel",
      corps: [
        [
          "Take your quiz with a test address, up to the email screen. In ",
          { code: "Contacts" },
          ", the contact shows up with the tag of its profile, the source \"Tiquiz: \" followed by the quiz title, and the profile in plain words in the ",
          { code: "tiquiz_resultat" },
          " field. Take the quiz again with the same address and another result: the second tag is added, the first one stays.",
        ],
      ],
      capture: {
        aFaire: "The test contact's record in GoHighLevel, with the profile tag and the Tiquiz source.",
        image: null,
      },
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
      ". Tiquiz creates it in the sub-account if it is missing; if the creation is refused, everything else is still sent.",
    ],
    [
      { gras: "Your custom fields" },
      " from the capture form, each one in a contact field named after its label, created if missing. Renaming a field in the editor creates a new field in GoHighLevel: the old one keeps its values.",
    ],
    [{ gras: "The source" }, " of the contact: \"Tiquiz\" followed by the quiz title."],
  ],
  agenceTitre: "An agency and its sub-accounts",
  agenceCorps: [
    [
      "One connection is for ONE sub-account, because that is where contacts and workflows live. An agency managing ten clients has ten connections, and each quiz picks its own. The Connect button, started from an agency, offers all its sub-accounts at once; \"Add a sub-account\" adds one later.",
    ],
  ],
  pauseTitre: "Pausing, and being warned",
  pauseCorps: [
    [
      "Each connection has a switch: paused, nothing is sent anymore, and quizzes keep their setting. If GoHighLevel rejects the connection (app uninstalled, permissions removed), it turns \"disconnected\" and you get one email, once. Leads captured in the meantime stay in Tiquiz and can be resent from My leads, Sync button, once you have reconnected.",
    ],
  ],
  ctaEssayer: "Create my free account",
  ctaTousLesOutils: "See all integrations",
  faq: [
    {
      q: "Do I need Zapier or Make to connect Tiquiz to GoHighLevel?",
      r: "No. The connection is direct: Tiquiz talks to the GoHighLevel API for the sub-account you authorised, no middleman and no extra subscription.",
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
      q: "What happens if I uninstall Tiquiz from GoHighLevel?",
      r: "The connection turns \"disconnected\", you get one email, once, and nothing is sent until you reconnect the sub-account. Leads stay in Tiquiz and can be resent afterwards.",
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
