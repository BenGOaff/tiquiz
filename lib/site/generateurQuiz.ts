// lib/site/generateurQuiz.ts
//
// LA PAGE QUI PORTE LE GÉNÉRATEUR, ET SON CONTENU.
//
// Béné, 8 septembre 2026 : "le générateur de quiz sur une page dédiée,
// optimisée seo, dans le style du blog et des pages de ventes etc."
//
// ── POURQUOI CE CONTENU EST RENDU PAR LE SERVEUR ─────────────────────
//
// C'est la leçon du 7 septembre, mesurée sur le viewer public : une
// page dont tout le contenu est monté par le NAVIGATEUR ne dit RIEN à
// un moteur. Le HTML de `/q/<slug>` ne porte que du JSON-LD et des
// pixels, et le quiz n'existe qu'après un appel d'API.
//
// Le générateur, lui, est 100 % côté client par nature (il streame la
// réponse du modèle). Une page qui ne serait QUE le générateur
// rankerait donc sur rien : elle servirait un titre et un formulaire
// vide. D'où ce module : tout ce qui suit est du TEXTE, rendu par le
// serveur, et le générateur est l'outil POSÉ DEDANS.
//
// ── CHAQUE AFFIRMATION PORTE LE FICHIER QUI LA REND VRAIE ────────────
//
// Même geste que `lib/site/fonctionnalites.ts` : `source` nomme le
// code, et le test vérifie que le fichier EXISTE. Une page qui vend
// une promesse retirée du produit rougit avant la visiteuse.
//
// Béné, 5 septembre : "sans bullshit (n'écris pas sans bullshit, je
// veux juste PAS de bullshit)". Donc rien ici n'est une formule : les
// chiffres sont relevés dans le code, et ce qui n'est pas mesuré n'est
// pas écrit.
//
// ── UNE STRUCTURE, UN TEXTE PAR LANGUE (8 septembre 2026) ────────────
//
// Cette page a dit "ce module est en français seulement" jusqu'au
// 8 septembre. C'est corrigé en place, parce que Béné a demandé la
// suite : "je bosse sur la landing, continue la traduction de tout."
//
// Même geste que `lib/site/fonctionnalites.ts`, et pour la même raison.
// CE QUI EST STRUCTUREL NE SE DUPLIQUE PAS : l'identifiant d'un bloc,
// son ORDRE et son fichier `source` vivent UNE fois, en français. Une
// langue n'apporte que du TEXTE, rangé par identifiant.
//
// ET LE COMPILATEUR REFUSE UNE LANGUE INCOMPLÈTE : chaque table est un
// `Record` dont les clés sont les identifiants, donc en oublier un ne
// compile pas. Sans ça, un bloc manquant servirait du FRANÇAIS sous une
// adresse anglaise, la page s'afficherait parfaitement, et Google
// indexerait du contenu dupliqué (règle du 8 septembre).
//
// LES CHIFFRES SONT INTERPOLÉS DANS CHAQUE LANGUE, jamais recopiés :
// `LIMITE_PAR_IP`, `FENETRE_HEURES` et `FREE_LIMITS` sont lus une fois
// et servent les deux tables. Un nombre écrit à la main dans la version
// anglaise serait faux au premier réglage, et il vit ici dans une page
// qui PROMET quelque chose à une visiteuse.

import { FREE_LIMITS } from "@/lib/planLimits";
import { HOTE_VENTE } from "@/lib/publicHost";
import { FENETRE_HEURES, LIMITE_PAR_IP } from "@/lib/embed/limites";
import {
  LANGUE_SANS_PREFIXE,
  cheminPourLangue,
  type LanguePublique,
} from "@/lib/site/langues";

/** L'adresse de la page. Écrite ICI, lue par le sitemap et la nav. */
export const CHEMIN_GENERATEUR = "/generateur-de-quiz";

/**
 * CE QUE LA PAGE DÉDIÉE ÉCRIT DANS `embed_quiz_sessions.source`.
 *
 * C'est la clé qui permet à l'écran Trafic de diviser les quiz générés
 * ICI par les vues de CETTE page. L'iframe de la page de vente envoie
 * `tiquiz-fr`, et mélanger les deux gonflerait le taux sans que rien ne
 * le dise : deux populations, un seul dénominateur.
 *
 * Elle vit ici et pas dans la page, parce que l'entonnoir du pilotage
 * la lit aussi (`lib/generateur/entonnoirGenerateur.ts`). Deux chaînes
 * écrites séparément finiraient par ne plus se retrouver, et l'écran
 * afficherait zéro quiz sur une page qui en génère.
 */
export const SOURCE_GENERATEUR = "page-generateur";

/**
 * LE NOMBRE DE QUIZ OFFERTS, ET SA FENÊTRE, LUS DANS LE MODULE QUI
 * LES FAIT RESPECTER.
 *
 * On ne recopie RIEN en toutes lettres dans la page : un chiffre écrit
 * à la main est un chiffre faux au premier réglage, et il vit ici dans
 * une page qui PROMET quelque chose à une visiteuse.
 *
 * `lib/embed/limites.ts` est pur exprès : `rateLimit.ts` importe
 * `supabaseAdmin`, donc cette page répondrait 500 sans base si elle
 * allait le chercher là bas.
 */
export { LIMITE_PAR_IP, FENETRE_HEURES };

/** Le nombre d'entrées du catalogue de langues (`lib/quizLanguages.ts`). */
export const LANGUES_ET_VARIANTES = 100;

/** L'identifiant d'un bloc "ce que l'IA écrit". Il ne se traduit pas. */
export type IdBloc = "questions" | "profils" | "accroche" | "mecanique";

/** L'identifiant d'une étape. */
export type IdEtape = "decris" | "ecrit" | "garde";

/** L'identifiant d'un refus. */
export type IdRefus = "sur-mesure" | "embranchements" | "maquette";

/** L'identifiant d'une question de la FAQ. */
export type IdQuestion =
  | "gratuit"
  | "onglet"
  | "publier"
  | "langue"
  | "emails"
  | "modifier";

export interface BlocGenerateur {
  id: IdBloc;
  titre: string;
  corps: readonly string[];
  /** Le fichier qui rend le bloc vrai. Le test exige qu'il existe. */
  source: string;
}

export interface EtapeGenerateur {
  id: IdEtape;
  titre: string;
  corps: string;
}

export interface RefusGenerateur {
  id: IdRefus;
  refus: string;
  alaplace: string;
}

export interface QuestionGenerateur {
  id: IdQuestion;
  q: string;
  r: string;
}

/**
 * CE QUE L'IA ÉCRIT VRAIMENT, et rien de plus.
 *
 * La liste est relevée dans le prompt de génération
 * (`lib/prompts/quiz/system.ts`) et dans ce que la route embed écrit en
 * base : les questions, leurs réponses, les profils de résultat avec
 * leur texte, et le titre plus le sous-titre d'accueil.
 *
 * L'ORDRE ET LE `source` VIVENT ICI, une seule fois. Une langue
 * n'apporte que `titre` et `corps`.
 */
const BLOCS_FR: readonly BlocGenerateur[] = [
  {
    id: "questions",
    titre: "Les questions, et les réponses qui vont avec",
    corps: [
      "Tu donnes ton sujet, à qui tu parles et le ton que tu veux. L'IA écrit les questions et toutes leurs réponses, dans ta langue, sans que tu aies une seule case à remplir.",
      "En mode profil, elle écrit exactement une réponse par profil sur chaque question. C'est ce qui évite le quiz où un profil n'est jamais attribué à personne, et c'est une correction qui vient d'une vraie cliente.",
    ],
    source: "lib/prompts/quiz/system.ts",
  },
  {
    id: "profils",
    titre: "Les profils de résultat, écrits en entier",
    corps: [
      "Chaque profil a son titre, son texte, et la suite logique vers ton offre. Ce ne sont pas des étiquettes : c'est la page que ton visiteur lit à la fin, et c'est elle qui décide s'il clique ou s'il ferme l'onglet.",
      "Tu relis, tu corriges, tu réécris ce que tu veux. L'IA fait le premier jet, tu gardes la main sur chaque mot.",
    ],
    source: "lib/quiz/resultBeats.ts",
  },
  {
    id: "accroche",
    titre: "Le titre et la phrase d'accueil",
    corps: [
      "Le sous-titre annonce un bénéfice et la durée du quiz, jamais le nombre de questions (on s'en fiche, et ça ne lève aucune objection).",
      "Les accroches s'inspirent de mécaniques de copywriting, pas d'une liste de modèles recopiés : deux quiz générés le même jour ne se ressemblent pas.",
    ],
    source: "lib/prompts/quiz/copywriting.ts",
  },
  {
    id: "mecanique",
    titre: "Profil ou score, c'est toi qui choisis",
    corps: [
      "Un quiz de profil répond à \"qui es-tu ?\", un quiz scoré répond à \"où en es-tu ?\". Les deux existent, ils ne se mélangent jamais, et tu peux changer d'avis après coup.",
      "En mode score, tu peux poser tes tranches à la main ou demander à Tiquiz de les répartir sur la plage de points réellement atteignable.",
    ],
    source: "lib/quizScoring.ts",
  },
];

/** Les trois étapes, dans l'ordre où on les vit. */
const ETAPES_FR: readonly EtapeGenerateur[] = [
  {
    id: "decris",
    titre: "Tu décris ton quiz",
    corps:
      "Le sujet, à qui tu parles, ce que tu veux en faire, le nombre de questions et le ton. Cinq champs, et aucun n'est un piège.",
  },
  {
    id: "ecrit",
    titre: "L'IA écrit tout",
    corps:
      "Les questions apparaissent au fur et à mesure. Tu vois le quiz se construire, tu n'attends pas devant un écran vide.",
  },
  {
    id: "garde",
    titre: "Tu modifies, puis tu le gardes",
    corps:
      "L'éditeur s'ouvre sur ton quiz. Tout est modifiable. Quand il te plaît, tu crées ton compte gratuit et il t'attend dedans, tel que tu l'as laissé.",
  },
];

/**
 * CE QUE LE GÉNÉRATEUR NE FAIT PAS.
 *
 * Béné, 5 septembre : "savoir dire non est ce qui rend croyable tout le
 * reste." Et un refus qui ne dit pas ce qui se passe à la place n'est
 * pas un refus, c'est une excuse : chaque ligne porte donc les deux
 * moitiés, dans les deux langues, et le test l'exige des deux.
 */
const REFUS_FR: readonly RefusGenerateur[] = [
  {
    id: "sur-mesure",
    refus: "Il n'écrit pas un résultat sur mesure pour chaque visiteur",
    alaplace:
      "Tiquiz attribue un profil que TU as écrit à l'avance. C'est ce qui le rend relisable et corrigeable, et c'est un choix, pas une limite technique.",
  },
  {
    id: "embranchements",
    refus: "Il ne fabrique pas de parcours à embranchements",
    alaplace:
      "Tout le monde voit les mêmes questions, seul le résultat change. Si un questionnaire conditionnel est indispensable chez toi, Tiquiz n'est pas le bon outil.",
  },
  {
    id: "maquette",
    refus: "Il ne dessine pas une maquette libre",
    alaplace:
      "Ton logo, tes couleurs, ta police et ta langue se règlent, et c'est déjà le cas sur le plan gratuit. Un design au pixel près, non.",
  },
];

/**
 * LA FAQ, ET ELLE RÉPOND VRAIMENT.
 *
 * Elle sert deux choses d'un coup : la visiteuse qui hésite, et le
 * `FAQPage` en données structurées. Écrire deux listes séparées
 * donnerait Google à qui on raconte autre chose qu'à la lectrice, ce
 * qui est exactement le piège évité sur la page de vente le
 * 2 septembre.
 */
const FAQ_FR: readonly QuestionGenerateur[] = [
  {
    id: "gratuit",
    q: "Le générateur est vraiment gratuit ?",
    r: `Oui, et sans compte. Tu arrives sur la page, tu décris ton quiz, l'IA l'écrit. Aucune adresse email n'est demandée pour générer, et aucune carte bancaire nulle part. La seule borne est technique : ${LIMITE_PAR_IP} quiz par ${FENETRE_HEURES} heures depuis la même connexion, pour qu'une boucle accidentelle ne fasse pas tourner le moteur toute la nuit.`,
  },
  {
    id: "onglet",
    q: "Qu'est-ce qui se passe si je ferme l'onglet ?",
    r: "Ton quiz existe déjà, il est enregistré au fur et à mesure. En créant ton compte gratuit depuis le bouton du générateur, tu le retrouves dedans, tel que tu l'as laissé. C'est le compte qui te le rattache, pas ton navigateur : ça marche donc aussi sur Safari et Firefox, qui bloquent le stockage par défaut.",
  },
  {
    id: "publier",
    q: "Je dois payer pour publier mon quiz ?",
    r: `Non. Le plan gratuit publie ${FREE_LIMITS.maxQuizzesPerMode} quiz et ${FREE_LIMITS.maxQuizzesPerMode} sondage, en ligne, avec ton logo et tes couleurs. Ce qui est borné, c'est le nombre de réponses que tu peux LIRE : ${FREE_LIMITS.visibleLeadsPerMonth} par mois, les suivantes sont floutées. Elles ne sont pas perdues, elles t'attendent.`,
  },
  {
    id: "langue",
    q: "Ça marche dans ma langue ?",
    r: `Le catalogue porte ${LANGUES_ET_VARIANTES} langues et variantes, et la variante compte : un quiz en portugais du Brésil n'est pas écrit comme un quiz en portugais du Portugal, et le générateur le sait. L'interface de Tiquiz, elle, existe en 7 langues.`,
  },
  {
    id: "emails",
    q: "Et les adresses email que je récupère, elles vont où ?",
    r: "Dans Tiquiz, et dans Systeme.io si tu l'utilises : le contact est créé et le tag posé automatiquement, sans Zapier, sans Make et sans une ligne de code. Tiquiz crée même le tag chez eux quand il n'existe pas encore. Si tu n'es pas chez Systeme.io, tu exportes tes leads en CSV avec le profil obtenu, donc ta segmentation survit à l'import ailleurs.",
  },
  {
    id: "modifier",
    q: "Je peux modifier ce que l'IA a écrit ?",
    r: "Tout, mot par mot. L'éditeur s'ouvre directement sur ton quiz : les questions, les réponses, les profils, les couleurs, les images. L'IA fait le premier jet pour que tu ne partes pas de la page blanche, elle ne décide de rien.",
  },
];

/**
 * L'ANGLAIS.
 *
 * Ce n'est PAS du mot à mot (Béné, 8 septembre : "il faut à chaque fois
 * utiliser le champ sémantique, les expressions, tournures de phrases,
 * ponctuation etc .. propre à chaque langue"). Le pourcentage se colle,
 * il n'y a pas d'espace devant une ponctuation, et les guillemets sont
 * droits : c'est la typographie anglaise, et elle est déjà figée pour le
 * blog dans `lib/blog/faitsEn.ts`.
 */
const TEXTES_EN: {
  blocs: Readonly<Record<IdBloc, { titre: string; corps: readonly string[] }>>;
  etapes: Readonly<Record<IdEtape, { titre: string; corps: string }>>;
  refus: Readonly<Record<IdRefus, { refus: string; alaplace: string }>>;
  faq: Readonly<Record<IdQuestion, { q: string; r: string }>>;
} = {
  blocs: {
    questions: {
      titre: "Your questions, and the answers that go with them",
      corps: [
        "You give it your topic, who you are talking to and the tone you want. The AI writes every question and every answer, in your language, without a single blank box to fill in.",
        "In profile mode it writes exactly one answer per profile on each question. That is what prevents the quiz where one profile can never be awarded to anyone, and it is a fix that came from a real customer.",
      ],
    },
    profils: {
      titre: "Result profiles, written in full",
      corps: [
        "Each profile gets its title, its copy and the logical step towards your offer. These are not labels: this is the page your visitor reads at the end, and it decides whether they click or close the tab.",
        "You reread it, you fix it, you rewrite whatever you want. The AI does the first draft, you keep control over every word.",
      ],
    },
    accroche: {
      titre: "The title and the welcome line",
      corps: [
        "The subtitle promises a benefit and how long the quiz takes, never the number of questions (nobody cares, and it answers no objection).",
        "Hooks are built from copywriting mechanics, not from a list of templates being copied out: two quizzes generated on the same day do not look alike.",
      ],
    },
    mecanique: {
      titre: "Profile or score, you decide",
      corps: [
        'A profile quiz answers "who are you?", a scored quiz answers "where are you at?". Both exist, they never mix, and you can change your mind afterwards.',
        "In score mode you can set your bands by hand, or ask Tiquiz to spread them over the range of points that is actually reachable.",
      ],
    },
  },
  etapes: {
    decris: {
      titre: "You describe your quiz",
      corps:
        "The topic, who you are talking to, what you want out of it, how many questions and the tone. Five fields, and none of them is a trap.",
    },
    ecrit: {
      titre: "The AI writes all of it",
      corps:
        "Questions show up as they are written. You watch the quiz being built, you are not waiting in front of an empty screen.",
    },
    garde: {
      titre: "You edit it, then you keep it",
      corps:
        "The editor opens on your quiz. Everything can be changed. Once you like it, you create your free account and it is waiting inside, exactly as you left it.",
    },
  },
  refus: {
    "sur-mesure": {
      refus: "It does not write a bespoke result for each visitor",
      alaplace:
        "Tiquiz awards a profile that YOU wrote in advance. That is what makes it readable and fixable, and it is a choice, not a technical limit.",
    },
    embranchements: {
      refus: "It does not build branching paths",
      alaplace:
        "Everyone sees the same questions, only the result changes. If a conditional questionnaire is essential for you, Tiquiz is not the right tool.",
    },
    maquette: {
      refus: "It does not design a free-form layout",
      alaplace:
        "Your logo, your colours, your font and your language are all settings, and they already are on the free plan. A pixel-perfect design, no.",
    },
  },
  faq: {
    gratuit: {
      q: "Is the generator really free?",
      r: `Yes, and no account needed. You land on the page, you describe your quiz, the AI writes it. No email address is asked for to generate, and no card details anywhere. The only limit is technical: ${LIMITE_PAR_IP} quizzes per ${FENETRE_HEURES} hours from the same connection, so an accidental loop cannot keep the engine running all night.`,
    },
    onglet: {
      q: "What happens if I close the tab?",
      r: "Your quiz already exists, it is saved as it is written. Create your free account from the button in the generator and you find it inside, exactly as you left it. It is the account that keeps it for you, not your browser: so it works on Safari and Firefox too, which block storage by default.",
    },
    publier: {
      q: "Do I have to pay to publish my quiz?",
      r: `No. The free plan publishes ${FREE_LIMITS.maxQuizzesPerMode} quiz and ${FREE_LIMITS.maxQuizzesPerMode} survey, live, with your logo and your colours. What is capped is how many answers you can READ: ${FREE_LIMITS.visibleLeadsPerMonth} a month, the rest are blurred. They are not lost, they are waiting for you.`,
    },
    langue: {
      q: "Does it work in my language?",
      r: `The catalogue holds ${LANGUES_ET_VARIANTES} languages and variants, and the variant matters: a Brazilian Portuguese quiz is not written like a European Portuguese one, and the generator knows that. The Tiquiz interface itself comes in 7 languages.`,
    },
    emails: {
      q: "And the email addresses I collect, where do they go?",
      r: "Into Tiquiz, and into Systeme.io if you use it: the contact is created and the tag applied automatically, no Zapier, no Make, no line of code. Tiquiz even creates the tag over there when it does not exist yet. If you are not on Systeme.io, you export your leads as CSV with the profile they got, so your segmentation survives the import anywhere else.",
    },
    modifier: {
      q: "Can I change what the AI wrote?",
      r: "All of it, word by word. The editor opens straight onto your quiz: the questions, the answers, the profiles, the colours, the images. The AI does the first draft so you never face a blank page, it decides nothing.",
    },
  },
};

/** Les blocs "ce que l'IA écrit", dans la langue demandée. */
export function ceQueLIaEcrit(langue: LanguePublique): readonly BlocGenerateur[] {
  if (langue === LANGUE_SANS_PREFIXE) return BLOCS_FR;
  const t = TEXTES_EN.blocs;
  return BLOCS_FR.map((b) => ({ ...b, ...t[b.id] }));
}

/** Les trois étapes, dans la langue demandée. */
export function etapes(langue: LanguePublique): readonly EtapeGenerateur[] {
  if (langue === LANGUE_SANS_PREFIXE) return ETAPES_FR;
  const t = TEXTES_EN.etapes;
  return ETAPES_FR.map((e) => ({ ...e, ...t[e.id] }));
}

/** Ce que le générateur ne fait pas, dans la langue demandée. */
export function ceQuilNeFaitPas(langue: LanguePublique): readonly RefusGenerateur[] {
  if (langue === LANGUE_SANS_PREFIXE) return REFUS_FR;
  const t = TEXTES_EN.refus;
  return REFUS_FR.map((r) => ({ ...r, ...t[r.id] }));
}

/** La FAQ, dans la langue demandée. */
export function faq(langue: LanguePublique): readonly QuestionGenerateur[] {
  if (langue === LANGUE_SANS_PREFIXE) return FAQ_FR;
  const t = TEXTES_EN.faq;
  return FAQ_FR.map((q) => ({ ...q, ...t[q.id] }));
}

/**
 * LE CHROME DE LA PAGE.
 *
 * Il vit ici et pas dans le composant, pour la raison qui vaut pour
 * tout le module : une phrase écrite dans le JSX est une phrase qui
 * n'existe que dans une langue, et rien ne le dit tant que personne
 * n'ouvre l'adresse anglaise.
 *
 * `surb` est le fragment SURLIGNÉ du titre, séparé du reste : c'est sa
 * signature la plus visible (règle du 4 septembre), et un titre écrit
 * d'un bloc ne pourrait plus la porter.
 */
export const CHROME_GENERATEUR: Readonly<
  Record<
    LanguePublique,
    {
      metaTitre: string;
      metaDescription: string;
      h1: string;
      h1Surb: string;
      chapo: string;
      titreEtapes: string;
      titreEtapesSurb: string;
      chapoEtapes: string;
      etapeMot: string;
      titreIa: string;
      titreIaSurb: string;
      chapoIa: string;
      titreRefus: string;
      titreRefusSurb: string;
      refusFin: string;
      titreFaq: string;
      chapoFaq: string;
      versFonctionnalites: string;
      ogLocale: string;
      jsonLdNom: string;
      jsonLdDescription: string;
    }
  >
> = {
  fr: {
    metaTitre: "Générateur de quiz gratuit par IA",
    metaDescription:
      "Décris ton sujet, l'IA écrit les questions, les réponses et les profils de résultat. Sans compte, sans carte bancaire, et tu gardes ton quiz.",
    h1: "Génère ton quiz",
    h1Surb: "en deux minutes",
    chapo:
      "Tu décris ton sujet et à qui tu parles. L'IA écrit les questions, leurs réponses et les profils de résultat, dans ta langue. Tu relis, tu corriges, et tu gardes ton quiz. Sans compte, sans carte bancaire.",
    titreEtapes: "Comment ça",
    titreEtapesSurb: "marche",
    chapoEtapes: "Suis ces 3 étapes pour créer ton premier quiz interactif.",
    etapeMot: "Étape",
    titreIa: "Ce que l'IA écrit",
    titreIaSurb: "à ta place",
    chapoIa:
      "Tiquiz te donne un quiz déjà optimisé pour attirer tes futurs clients et les amener à te confier leur email. Mais tu gardes la main sur tout : édite-le à l'infini.",
    titreRefus: "Ce que le générateur",
    titreRefusSurb: "ne fait pas",
    refusFin:
      "Si l'un des trois est indispensable chez toi, ne prends pas Tiquiz : tu perdrais ton temps, et nous aussi.",
    titreFaq: "Les questions qu'on nous pose",
    chapoFaq:
      "Sur le générateur, sur ce qu'il coûte, et sur ce que ton quiz devient après.",
    versFonctionnalites: "Tout ce que Tiquiz sait faire",
    ogLocale: "fr_FR",
    jsonLdNom: "Générateur de quiz Tiquiz",
    jsonLdDescription:
      "Générateur de quiz par IA : tu décris ton sujet, il écrit les questions, les réponses et les profils de résultat. Sans compte et sans carte bancaire.",
  },
  en: {
    metaTitre: "Free AI quiz generator",
    metaDescription:
      "Describe your topic, the AI writes the questions, the answers and the result profiles. No account, no card details, and the quiz is yours to keep.",
    h1: "Build your quiz",
    h1Surb: "in two minutes",
    chapo:
      "You describe your topic and who you are talking to. The AI writes the questions, their answers and the result profiles, in your language. You reread it, you fix it, and the quiz is yours. No account, no card details.",
    titreEtapes: "How it",
    titreEtapesSurb: "works",
    chapoEtapes: "Follow these 3 steps to build your first interactive quiz.",
    etapeMot: "Step",
    titreIa: "What the AI writes",
    titreIaSurb: "for you",
    chapoIa:
      "Tiquiz hands you a quiz already built to attract your future customers and get them to trust you with their email. But you stay in charge of everything: edit it as much as you like.",
    titreRefus: "What the generator",
    titreRefusSurb: "does not do",
    refusFin:
      "If any one of those three is essential for you, do not take Tiquiz: you would waste your time, and so would we.",
    titreFaq: "The questions we get asked",
    chapoFaq:
      "About the generator, about what it costs, and about what happens to your quiz afterwards.",
    versFonctionnalites: "Everything Tiquiz can do",
    ogLocale: "en_US",
    jsonLdNom: "Tiquiz quiz generator",
    jsonLdDescription:
      "AI quiz generator: you describe your topic, it writes the questions, the answers and the result profiles. No account and no card details.",
  },
};

/**
 * L'adresse complète de la page, DANS LA LANGUE DEMANDÉE.
 *
 * Le JSON-LD annonce l'adresse qu'un moteur doit indexer : servir
 * l'adresse française depuis la page anglaise ferait dire à Google que
 * les deux sont la même, c'est à dire exactement ce que la canonique
 * existe pour éviter.
 */
export function urlGenerateur(langue: LanguePublique): string {
  return `${HOTE_VENTE}${cheminPourLangue(CHEMIN_GENERATEUR, langue)}`;
}

/**
 * LE JSON-LD, CONSTRUIT DEPUIS LES MÊMES DONNÉES QUE L'ÉCRAN.
 *
 * `price: "0"` n'est pas une formule commerciale : la route de
 * génération ne demande ni compte ni paiement (mesuré dans
 * `app/api/embed/quiz/generate/route.ts`). Si ça changeait un jour,
 * cette ligne deviendrait un mensonge servi à Google, et c'est
 * exactement pour ça qu'elle est écrite à côté du reste.
 */
export function applicationJsonLd(langue: LanguePublique) {
  const t = CHROME_GENERATEUR[langue];
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: t.jsonLdNom,
    url: urlGenerateur(langue),
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: langue,
    description: t.jsonLdDescription,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
    },
  };
}

export function faqJsonLd(langue: LanguePublique) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq(langue).map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.r },
    })),
  };
}
