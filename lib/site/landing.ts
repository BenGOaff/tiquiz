// lib/site/landing.ts
//
// LE CONTENU DE LA LANDING, EN DONNÉES, UNE LANGUE PAR ENTRÉE.
//
// Béné, 4 septembre 2026 : "propose moi une landing pour que je voie à
// quoi elle pourrait ressembler en vrai next avec la traduction".
//
// -- POURQUOI LE TEXTE VIT ICI ET PAS DANS LE JSX ---------------------
//
// C'est la seule façon d'avoir une page traduite. Les onze pages du
// site public écrivent aujourd'hui leur texte en dur, en français
// (`const TITRE = "..."` dans `a-propos/page.tsx`), et c'est exactement
// ce qui rend le chantier 4 impossible : on ne traduit pas du JSX.
//
// Le gabarit repris est celui des documents légaux, qui vivent en
// 5 langues depuis des mois (`lib/legal/privacy.ts` : un objet typé par
// langue, exporté en `Record`). On ne réinvente pas un troisième
// mécanisme.
//
// -- LES PRIX NE SONT PAS ÉCRITS ICI ----------------------------------
//
// Ils viennent de `OWNER_CATALOG`, donc de ce que le bon de commande
// encaisse vraiment. Un prix recopié dans une page de vente est un prix
// faux au premier changement de tarif, et c'est l'endroit exact où un
// lecteur le vérifie.
//
// -- CE QUE CETTE PAGE A LE DROIT D'AFFIRMER --------------------------
//
// Tout ce qui suit est vérifiable dans le code ou porte sa source :
//
//   - l'IA écrit questions, réponses et profils : la formulation reste
//     "tu relis et tu corriges", jamais "parfait du premier coup" ;
//   - Tiquiz CRÉE le tag Systeme.io quand il manque : `POST /tags` dans
//     `app/api/quiz/[quizId]/public/route.ts` ;
//   - 7 langues d'interface : `i18n/config.ts` ;
//   - 100 langues et variantes en génération : `lib/quizLanguages.ts`,
//     comptées, ni "plus de 100" ni "100 langues" ;
//   - 44,9 % : le rapport Interact, et la formulation OBLIGATOIRE est
//     "des personnes qui commencent un quiz". Ce n'est pas un taux de
//     page, et l'écrire ainsi serait faux.
//
// Aucun exemple de campagne payante : la publicité fait peur à cette
// audience, l'argument qui porte est le gratuit.

import { OWNER_CATALOG, formatOwnerPrice } from "@/lib/checkout/catalog";
import {
  AVANTAGES_COMMUNS,
  AVANTAGES_NOUVEAUX,
  AVANTAGES_PAYANTS,
  AVANTAGES_PLUS,
} from "@/lib/checkout/avantages";
import { FREE_LIMITS } from "@/lib/planLimits";

export interface Etape {
  titre: string;
  corps: string;
}

export interface Question {
  q: string;
  r: string;
}

export interface ColonneTarif {
  nom: string;
  /** Le prix affiché en gros. */
  prix: string;
  /** Ce qui va juste dessous : "par mois", ou "pour commencer" sur le gratuit. */
  cadence: string;
  /** L'annuel, déjà composé, ou null quand la colonne n'en a pas. */
  prixAn: string | null;
  /** Ce que CETTE colonne ajoute. Jamais recopié : lu dans `avantages.ts`. */
  lignes: readonly string[];
}

export interface ContenuLanding {
  /** La langue du document, pour l'attribut `lang` et l'`og:locale`. */
  langue: string;
  metaTitre: string;
  metaDescription: string;

  etiquette: string;
  /** Le titre. `motCle` est le fragment mis en couleur, il doit en être un morceau. */
  titre: string;
  motCle: string;
  accroche: string;
  ctaPrincipal: string;
  ctaSecondaire: string;
  sousCta: string;

  problemeTitre: string;
  problemeCorps: string[];

  chiffre: string;
  chiffreLegende: string;
  chiffreSource: string;

  mecaniqueTitre: string;
  etapes: Etape[];

  sioTitre: string;
  sioCorps: string[];

  ouTitre: string;
  ouCorps: string;
  ouListe: string[];

  prixTitre: string;
  prixNote: string;
  prixParMois: string;
  /** "ou {prix} par an". `{prix}` est rempli depuis `OWNER_CATALOG`. */
  prixOuParAn: string;
  gratuit: { nom: string; prix: string; rythme: string };
  /** Les limites du gratuit. `{quiz}`, `{popquiz}` et `{leads}` sont remplis depuis `FREE_LIMITS`. */
  gratuitLignes: readonly string[];
  partageTitre: string;

  faqTitre: string;
  faq: Question[];

  finTitre: string;
  finCorps: string;
}

/**
 * LES TROIS COLONNES DE TARIF, ET AUCUN TEXTE RECOPIÉ.
 *
 * Les prix viennent de `OWNER_CATALOG`, les limites du gratuit de
 * `FREE_LIMITS`, et les fonctionnalités de `lib/checkout/avantages.ts`,
 * qui est LA source depuis le 2 septembre : la grille de la page de
 * vente et le bon de commande la lisent déjà, et un test compare les
 * deux au mot près.
 *
 * Réécrire ces lignes ici ferait une troisième liste, donc une
 * troisième occasion de promettre sur la page ce que le bon de commande
 * ne promet pas. C'est le défaut le plus cher de ce dépôt, et ici il
 * vivrait sur l'écran où quelqu'un sort sa carte.
 */
/*
 * CE QUE ÇA LAISSE OUVERT, ET IL FAUT LE DIRE : `avantages.ts` n'existe
 * QU'EN FRANÇAIS. Sur `?lang=en`, la coquille de la page est traduite et
 * les lignes de fonctionnalités restent en français.
 *
 * Les traduire ici fabriquerait la deuxième liste, donc la divergence
 * qu'on vient de fermer. La traduction se fait dans `avantages.ts`, une
 * fois, quand le texte français est validé, et les trois écrans qui le
 * lisent en profitent le même jour.
 */
export function colonnesDeTarif(t: ContenuLanding): ColonneTarif[] {
  const prix = (id: "mensuel" | "annuel" | "mensuel-plus" | "annuel-plus") =>
    formatOwnerPrice(OWNER_CATALOG[id]);
  const parAn = (id: "annuel" | "annuel-plus") =>
    t.prixOuParAn.replace("{prix}", prix(id));
  return [
    {
      nom: t.gratuit.nom,
      prix: t.gratuit.prix,
      cadence: t.gratuit.rythme,
      prixAn: null,
      // `replaceAll` ET PAS `replace` : une ligne peut nommer deux fois
      // la même limite ("1 quiz et 1 sondage"), et `replace` avec une
      // chaîne ne remplace que la PREMIÈRE. C'est sorti à l'écran, pas
      // au typecheck : le rendu affichait "1 quiz et {quiz} sondage".
      lignes: t.gratuitLignes.map((ligne) =>
        ligne
          .replaceAll("{quiz}", String(FREE_LIMITS.maxQuizzesPerMode))
          .replaceAll("{popquiz}", String(FREE_LIMITS.maxPopquizzes))
          .replaceAll("{leads}", String(FREE_LIMITS.visibleLeadsPerMonth)),
      ),
    },
    {
      nom: OWNER_CATALOG["mensuel"].label.replace(/ mensuel$/i, ""),
      prix: prix("mensuel"),
      cadence: t.prixParMois,
      prixAn: parAn("annuel"),
      lignes: AVANTAGES_PAYANTS.map((a) => a.texte),
    },
    {
      nom: OWNER_CATALOG["mensuel-plus"].label.replace(/ mensuel Plus$/i, " PLUS"),
      prix: prix("mensuel-plus"),
      cadence: t.prixParMois,
      prixAn: parAn("annuel-plus"),
      lignes: AVANTAGES_PLUS.map((a) => a.texte),
    },
  ];
}

/** Ce que TOUS les paliers portent, gratuit compris. Même source. */
export function avantagesPartages(): readonly string[] {
  return [...AVANTAGES_COMMUNS, ...AVANTAGES_NOUVEAUX].map((a) => a.texte);
}

const fr: ContenuLanding = {
  langue: "fr",
  metaTitre: "Tiquiz : le générateur de quiz connecté à Systeme.io",
  metaDescription:
    "Décris ton sujet, l'IA écrit le quiz, et chaque profil renvoie vers ton offre. Le contact arrive dans Systeme.io avec son tag, créé automatiquement s'il n'existe pas.",

  etiquette: "Générateur de quiz",
  titre: "Le générateur de quiz connecté à Systeme.io",
  motCle: "connecté à Systeme.io",
  accroche:
    "Tu décris ton sujet en trois champs. L'IA écrit les questions, les réponses et les profils de résultat. Tu relis, tu remplaces deux ou trois formulations par les tiennes, et c'est en ligne.",
  ctaPrincipal: "Tester le générateur",
  ctaSecondaire: "Créer mon compte gratuit",
  sousCta: "Aucune carte demandée. Le quiz que tu génères reste à toi.",

  problemeTitre: "Un opt-in demande. Un quiz donne.",
  problemeCorps: [
    "Une page de capture demande une adresse et promet un PDF que personne n'ouvrira. La personne doit décider de te faire confiance avant d'avoir reçu quoi que ce soit.",
    "Un quiz fait l'inverse. Il répond à une question que ton visiteur se pose sur lui même, il lui rend un résultat qui lui parle, et l'adresse email arrive au milieu de ça, au moment où il veut savoir la suite.",
  ],

  chiffre: "44,9 %",
  chiffreLegende:
    "des personnes qui commencent un quiz laissent leur email, dans la catégorie coaching et formation.",
  chiffreSource:
    "Rapport Interact sur les taux de conversion des quiz. Ce n'est pas un taux de page : c'est le taux mesuré à partir du moment où le quiz est commencé.",

  mecaniqueTitre: "Comment ça marche",
  etapes: [
    {
      titre: "Tu décris ton sujet",
      corps:
        "Ton thème, à qui tu parles, ce que tu veux obtenir. Trois champs, pas un formulaire de dix minutes.",
    },
    {
      titre: "L'IA écrit le quiz",
      corps:
        "Les questions, les réponses et les profils de résultat arrivent sous tes yeux. C'est une base de départ solide, et tu la corriges là où ça ne sonne pas comme toi.",
    },
    {
      titre: "Tu publies",
      corps:
        "Sur ton domaine, dans une page Systeme.io, dans WordPress, ou tout seul avec sa propre adresse. Tu choisis, et le design suit ta marque.",
    },
    {
      titre: "Chaque profil part vers son offre",
      corps:
        "Le résultat n'est pas une impasse : il renvoie vers l'offre qui correspond à ce profil là, et le contact arrive dans Systeme.io avec son tag.",
    },
  ],

  sioTitre: "Le tag est posé, même s'il n'existe pas encore",
  sioCorps: [
    "C'est la seule chose que les autres outils de quiz ne savent pas faire, et c'est celle qui coûte le plus de temps. Tiquiz écrit le nom du tag que tu as choisi, et si ce tag n'existe pas encore dans ton compte Systeme.io, il le crée.",
    "Ailleurs, il faut passer par Zapier. Et Zapier ne propose que les tags déjà créés à la main : un profil de résultat oublié, c'est un lead qui arrive sans rien pour le reconnaître.",
    "Deux outils suffisent pour tout le système, Tiquiz et Systeme.io. Un des deux, tu l'utilises déjà.",
  ],

  ouTitre: "Ton quiz vit où tu veux",
  ouCorps:
    "Pas sur notre domaine avec notre logo dessus. Sur le tien, ou intégré là où ton audience est déjà.",
  ouListe: [
    "Sur ton propre domaine, avec ton adresse à toi",
    "Intégré dans une page Systeme.io",
    "Intégré dans WordPress, ou dans n'importe quelle page",
    "Tout seul, avec sa propre adresse, si tu n'as pas de site",
    "L'interface existe en 7 langues, et l'IA écrit dans 100 langues et variantes",
  ],

  prixTitre: "Les tarifs",
  prixNote:
    "Les prix affichés sont ceux du bon de commande, à l'euro. Tu peux commencer gratuitement et monter de palier quand ton quiz travaille.",
  prixParMois: "par mois",
  prixOuParAn: "ou {prix} par an",
  gratuit: { nom: "Gratuit", prix: "0 €", rythme: "pour commencer" },
  gratuitLignes: [
    "{quiz} quiz et {quiz} sondage actifs",
    "{popquiz} Popquiz",
    "{leads} réponses visibles sur 30 jours glissants, les suivantes sont capturées et floutées",
  ],
  partageTitre: "Dans tous les paliers, gratuit compris",

  faqTitre: "Les questions qu'on nous pose",
  faq: [
    {
      q: "Faut-il savoir coder ?",
      r: "Non. Tu écris ce dont parle ton quiz, tu relis ce que l'IA propose, et tu publies. Il n'y a rien à installer.",
    },
    {
      q: "Est-ce que je peux m'en servir sans Systeme.io ?",
      r: "Oui. Le quiz fonctionne tout seul, capture les emails et affiche les résultats sans aucune connexion. Systeme.io ajoute l'automatisation derrière, ce n'est pas une condition.",
    },
    {
      q: "L'IA écrit un quiz utilisable du premier coup ?",
      r: "Elle écrit une base de départ solide, et c'est le retour constant de ceux qui s'en servent. Compte quelques minutes de relecture pour remplacer deux ou trois formulations par les tiennes. Personne ne publie un texte généré sans le relire, et c'est très bien comme ça.",
    },
    {
      q: "Dans quelles langues ?",
      r: "L'interface est traduite en 7 langues. La génération, elle, couvre 100 langues et variantes régionales : un quiz écrit en portugais du Brésil ne sort pas en portugais du Portugal.",
    },
  ],

  finTitre: "Teste le générateur avant de créer un compte",
  finCorps:
    "Décris ton sujet, regarde le quiz s'écrire, passe le tien. Si ça te plaît, tu le gardes en créant ton compte gratuit, et il t'attend dedans.",
};

const en: ContenuLanding = {
  langue: "en",
  metaTitre: "Tiquiz: the quiz builder that connects to Systeme.io",
  metaDescription:
    "Describe your topic, the AI writes the quiz, and every result profile points to the matching offer. The contact lands in Systeme.io with its tag, created for you if it does not exist yet.",

  etiquette: "Quiz builder",
  titre: "The quiz builder that connects to Systeme.io",
  motCle: "connects to Systeme.io",
  accroche:
    "You describe your topic in three fields. The AI writes the questions, the answers and the result profiles. You read it over, you swap two or three sentences for your own, and it goes live.",
  ctaPrincipal: "Try the builder",
  ctaSecondaire: "Create my free account",
  sousCta: "No card required. The quiz you generate stays yours.",

  problemeTitre: "An opt-in asks. A quiz gives.",
  problemeCorps: [
    "A capture page asks for an address and promises a PDF nobody will open. Your visitor has to decide to trust you before receiving anything at all.",
    "A quiz does the opposite. It answers a question your visitor is already asking about themselves, hands back a result that fits, and the email address comes in the middle of that, right when they want to know what follows.",
  ],

  chiffre: "44.9%",
  chiffreLegende:
    "of people who start a quiz leave their email, in the coaching and training category.",
  chiffreSource:
    "Interact report on quiz conversion rates. This is not a page rate: it is measured from the moment the quiz is started.",

  mecaniqueTitre: "How it works",
  etapes: [
    {
      titre: "You describe your topic",
      corps:
        "Your subject, who you are talking to, what you want out of it. Three fields, not a ten minute form.",
    },
    {
      titre: "The AI writes the quiz",
      corps:
        "Questions, answers and result profiles appear in front of you. It is a solid starting point, and you fix whatever does not sound like you.",
    },
    {
      titre: "You publish",
      corps:
        "On your own domain, inside a Systeme.io page, inside WordPress, or on its own address. You choose, and the design follows your brand.",
    },
    {
      titre: "Every profile points to its offer",
      corps:
        "The result is not a dead end: it points to the offer that matches that profile, and the contact lands in Systeme.io with its tag.",
    },
  ],

  sioTitre: "The tag gets applied, even if it does not exist yet",
  sioCorps: [
    "This is the one thing other quiz tools cannot do, and it is the one that eats the most time. Tiquiz writes the tag name you chose, and if that tag does not exist in your Systeme.io account yet, it creates it.",
    "Everywhere else you go through Zapier. And Zapier only offers tags you already created by hand: one forgotten result profile means a lead arriving with nothing to recognise it by.",
    "Two tools cover the whole system, Tiquiz and Systeme.io. One of the two, you already use.",
  ],

  ouTitre: "Your quiz lives wherever you want",
  ouCorps:
    "Not on our domain with our logo on it. On yours, or embedded where your audience already is.",
  ouListe: [
    "On your own domain, with your own address",
    "Embedded in a Systeme.io page",
    "Embedded in WordPress, or in any page",
    "On its own address, if you have no website",
    "The interface exists in 7 languages, and the AI writes in 100 languages and regional variants",
  ],

  prixTitre: "Pricing",
  prixNote:
    "These are the checkout prices, to the euro. You can start for free and move up once your quiz is working.",
  prixParMois: "per month",
  prixOuParAn: "or {prix} per year",
  gratuit: { nom: "Free", prix: "0 €", rythme: "to get started" },
  gratuitLignes: [
    "{quiz} active quiz and {quiz} active survey",
    "{popquiz} Popquiz",
    "{leads} responses visible over a rolling 30 days, the rest are captured and blurred",
  ],
  partageTitre: "In every plan, free included",

  faqTitre: "Questions we get",
  faq: [
    {
      q: "Do I need to know how to code?",
      r: "No. You write what your quiz is about, you read what the AI proposes, and you publish. There is nothing to install.",
    },
    {
      q: "Can I use it without Systeme.io?",
      r: "Yes. The quiz runs on its own, captures emails and shows results with no connection at all. Systeme.io adds the automation behind it, it is not a requirement.",
    },
    {
      q: "Does the AI write a usable quiz on the first try?",
      r: "It writes a solid starting point, and that is the consistent feedback from people using it. Budget a few minutes of reading to swap two or three sentences for your own. Nobody publishes generated text without reading it, and that is exactly as it should be.",
    },
    {
      q: "Which languages?",
      r: "The interface is translated into 7 languages. Generation covers 100 languages and regional variants: a quiz written in Brazilian Portuguese does not come out in European Portuguese.",
    },
  ],

  finTitre: "Try the builder before creating an account",
  finCorps:
    "Describe your topic, watch the quiz being written, take it yourself. If you like it, you keep it by creating your free account, and it is waiting for you inside.",
};

/**
 * LES LANGUES ÉCRITES, ET RIEN DE PLUS.
 *
 * Deux pour l'instant, et c'est délibéré. Traduire une page de vente en
 * sept langues avant que le texte français soit validé, c'est refaire
 * sept fois le travail au premier mot qu'elle change.
 *
 * Une langue absente retombe sur l'ANGLAIS, jamais sur le français : un
 * lecteur espagnol comprend plus souvent l'anglais, et un repli qui
 * sert du français à qui a demandé de l'espagnol a l'air de marcher,
 * ce qui est pire qu'un manque visible (leçon du robot d'aide,
 * 31 août).
 */
export const LANDING: Readonly<Record<string, ContenuLanding>> = { fr, en };

export function contenuLanding(locale: string | null | undefined): ContenuLanding {
  const brut = String(locale ?? "").trim();
  return LANDING[brut] ?? LANDING[brut.split("-")[0]] ?? LANDING.en;
}
