// lib/site/quizHero.ts
//
// LE QUIZ DU HAUT DE PAGE, ET LES SIX BRIEFS QU'IL PARTAGE AVEC LES CARTES.
//
// Béné, 9 septembre 2026 : « Le quiz du hero doit tenir au-dessus de la
// ligne de flottaison sur un écran de 1440x800 : pas de scroll pour voir
// la première question et ses options. » Et, sur toute la landing :
// « Reprends-le, ne le réinvente pas. »
//
// La source est `copywriting-claude/tiquiz-landing.html` : quatre
// questions, six profils, un barème par points. Les questions, les
// réponses et les textes de profil sont les SIENS, portés mot pour mot
// côté français.
//
// ── UN SEUL TABLEAU DE BRIEFS, DEUX RENDUS ───────────────────────────
//
// Dans son HTML, chaque brief est écrit DEUX fois : une fois dans
// `PROFILS[].u` (le bouton du résultat) et une fois dans le `href` de la
// carte « Six quiz déjà écrits ». Mesuré : les six couples
// (sujet, audience, objectif) sont identiques des deux côtés.
//
// Les recopier ici les laisserait diverger au premier passage, et le
// symptôme serait muet : le générateur s'ouvrirait avec un sujet qui
// n'est pas celui que la carte annonçait. `BRIEFS` est donc la seule
// source, et les deux écrans la lisent.
//
// ── LE LIEN NE S'ÉCRIT PAS ICI ───────────────────────────────────────
//
// Il passe par `lienGenerateur` (`lib/generateur/prefillUrl.ts`), qui
// est le SEUL endroit qui sait quelles clés porte l'URL et qui les
// relit. Une deuxième fabrication de lien rendrait le formulaire vide
// sans qu'aucune erreur ne s'écrive.
//
// Et la SOURCE y est obligatoire : le résultat du quiz porte `"hero"`
// plus le profil obtenu, les six cartes portent `"modeles"`. Sans elle,
// toutes les générations de la landing sortiraient en `"direct"` et le
// seul ratio qu'elle lit ne dirait plus d'où viennent les gens.
//
// ── LES SIX PROFILS SONT TOUS ATTEIGNABLES, ET C'EST MESURÉ ──────────
//
// C'est le contrôle de Véronique (1er août) : en mode profils, un
// résultat que le barème ne peut jamais attribuer est un résultat que
// personne ne verra. Les 320 combinaisons possibles ont été jouées :
//
//   acc 18,1 %   for 24,1 %   aff 11,2 %
//   cre 14,4 %   ven 10,9 %   dem 21,2 %
//
// Aucun profil sous 10 %, aucun au dessus de 25 %. `tests/logic/
// quiz-du-hero.test.mts` rejoue ces 320 combinaisons : un barème
// retouché qui rendrait un profil inatteignable le fait rougir.

import {
  lienGenerateur,
  type LienGenerateur,
} from "@/lib/generateur/prefillUrl";
import { LANGUE_SANS_PREFIXE, type LanguePublique } from "@/lib/site/langues";
import { hrefPourLangue } from "@/lib/site/nav";

/** Les six profils, dans SON ordre. L'ordre décide des ex aequo. */
export const PROFILS_HERO = ["acc", "for", "aff", "cre", "ven", "dem"] as const;

export type CleProfil = (typeof PROFILS_HERO)[number];

/** Ce qu'une réponse rapporte, par profil. */
export type Gains = Partial<Record<CleProfil, number>>;

export interface OptionHero {
  texte: string;
  gains: Gains;
}

export interface QuestionHero {
  titre: string;
  options: readonly OptionHero[];
}

export interface ProfilHero {
  /** Le nom affiché sur l'écran de résultat. */
  nom: string;
  /** Le miroir : ce qu'il vit, dit avec ses mots. */
  corps: string;
  /** Le quiz qu'il devrait créer en premier. */
  idee: string;
  /** Pour qui la carte est écrite, dans la grille des six modèles. */
  pour: string;
  /** L'argument de la carte, sous son titre. */
  carte: string;
}

/**
 * LE BRIEF D'UN PROFIL : ce qui part dans l'URL du générateur.
 *
 * `sujet` et `audience` sont écrits EN CLAIR : `lienGenerateur` les
 * encode une fois. Les recopier déjà encodés (comme dans son HTML)
 * enverrait `%C3%AA` littéral dans le champ, et la créatrice le lirait
 * dans son formulaire.
 */
export type Brief = Pick<LienGenerateur, "sujet" | "audience" | "objectif">;

/** Les six briefs, une seule fois, en français comme en anglais. */
const BRIEFS_FR: Readonly<Record<CleProfil, Brief>> = {
  acc: {
    sujet: "Savoir si je suis prêt à me faire accompagner",
    audience: "Les personnes que j'accompagne ou qui hésitent à se lancer",
    objectif: "qualifier",
  },
  for: {
    sujet: "Évaluer mon niveau réel sur le sujet que j'enseigne",
    audience: "Les personnes qui hésitent entre plusieurs de mes formations",
    objectif: "orienter",
  },
  aff: {
    sujet: "Trouver l'outil qui correspond vraiment à ma situation",
    audience: "Les personnes qui hésitent entre plusieurs outils",
    objectif: "orienter",
  },
  cre: {
    sujet: "Découvrir quel type de créateur de contenu je suis",
    audience: "Les créateurs et les entrepreneurs qui publient en ligne",
    objectif: "faire-decouvrir",
  },
  ven: {
    sujet: "Choisir la version de mon offre qui correspond à ma situation",
    audience: "Les visiteurs qui hésitent entre plusieurs de mes formules",
    objectif: "orienter",
  },
  dem: {
    sujet: "Savoir par où commencer quand on part de zéro",
    audience: "Les personnes qui débutent sur mon sujet",
    objectif: "capturer",
  },
};

const BRIEFS_EN: Readonly<Record<CleProfil, Brief>> = {
  acc: {
    sujet: "Find out whether you are ready to work with a coach",
    audience: "The people I work with, or who hesitate to get started",
    objectif: "qualifier",
  },
  for: {
    sujet: "Measure your real level on the subject I teach",
    audience: "People hesitating between several of my courses",
    objectif: "orienter",
  },
  aff: {
    sujet: "Find the tool that actually fits your situation",
    audience: "People hesitating between several tools",
    objectif: "orienter",
  },
  cre: {
    sujet: "Discover what kind of content creator you are",
    audience: "Creators and entrepreneurs who publish online",
    objectif: "faire-decouvrir",
  },
  ven: {
    sujet: "Choose the version of my offer that fits your situation",
    audience: "Visitors hesitating between several of my plans",
    objectif: "orienter",
  },
  dem: {
    sujet: "Know where to start when you are starting from zero",
    audience: "People who are new to my subject",
    objectif: "capturer",
  },
};

export interface ContenuQuizHero {
  /** Le titre au dessus du quiz, dans sa barre. */
  titre: string;
  /** « Fait avec Tiquiz », la mention discrète. C'est vrai : c'en est un. */
  mention: string;
  /** « Question 2 sur 4 ». `{n}` et `{total}` sont interpolés. */
  numero: string;
  /** Le compteur de la jauge. `{n}` et `{total}` sont interpolés. */
  compteur: string;
  /** Le compteur, une fois le résultat atteint. */
  compteurResultat: string;
  etiquetteResultat: string;
  etiquetteIdee: string;
  boutonGenerer: string;
  rassurance: string;
  recommencer: string;
  questions: readonly QuestionHero[];
  profils: Readonly<Record<CleProfil, ProfilHero>>;
}

const FR: ContenuQuizHero = {
  titre: "Quel quiz tu devrais créer ?",
  mention: "Fait avec Tiquiz",
  numero: "Question {n} sur {total}",
  compteur: "{n} / {total}",
  compteurResultat: "Ton résultat",
  etiquetteResultat: "Ton profil",
  etiquetteIdee: "Le quiz à créer en premier",
  boutonGenerer: "Générer ce quiz →",
  rassurance: "Le générateur s'ouvre avec le sujet déjà rempli. Sans compte, sans carte.",
  recommencer: "Recommencer",
  questions: [
    {
      titre: "Tu fais quoi, concrètement ?",
      options: [
        { texte: "J'accompagne des gens : coaching, conseil, thérapie", gains: { acc: 3 } },
        { texte: "Je forme : formation, atelier, cours en ligne", gains: { for: 3 } },
        { texte: "Je recommande des outils qui ne sont pas les miens", gains: { aff: 3 } },
        { texte: "Je publie du contenu : blog, chaîne, newsletter", gains: { cre: 3 } },
        { texte: "Je vends mon propre produit ou service", gains: { ven: 3 } },
      ],
    },
    {
      titre: "Aujourd'hui, tu récupères des adresses email comment ?",
      options: [
        { texte: "Un PDF, une checklist, un guide à télécharger", gains: { acc: 1, ven: 1 } },
        { texte: "Une formation ou un mini-cours offert", gains: { for: 2 } },
        { texte: "Juste un formulaire d'inscription à ma newsletter", gains: { cre: 2 } },
        { texte: "Je n'en récupère pas encore", gains: { dem: 5 } },
      ],
    },
    {
      titre: "Ce qui coince chez ceux qui te suivent, c'est plutôt :",
      options: [
        { texte: "Ils ne savent pas par où commencer", gains: { dem: 2, for: 1 } },
        { texte: "Ils ont déjà essayé et ça n'a rien donné", gains: { acc: 2 } },
        { texte: "Ils hésitent entre plusieurs options", gains: { aff: 2, ven: 1 } },
        { texte: "Ils ne savent pas s'ils ont le niveau", gains: { for: 2 } },
      ],
    },
    {
      titre: "Tu veux que ton quiz serve d'abord à :",
      options: [
        { texte: "Trier qui est prêt à acheter", gains: { acc: 2, ven: 2 } },
        { texte: "Me faire découvrir par des gens qui ne me connaissent pas", gains: { cre: 3 } },
        { texte: "Aider mes abonnés à choisir la bonne offre", gains: { for: 2, aff: 2 } },
        { texte: "Récupérer des adresses, tout simplement", gains: { dem: 2 } },
      ],
    },
  ],
  profils: {
    acc: {
      nom: "L'accompagnateur",
      corps:
        "Tu vends du temps et de l'attention, donc chaque appel avec quelqu'un qui n'est pas prêt te coûte cher. Ton quiz ne doit pas ramener plus de monde, il doit en ramener moins et mieux choisi.",
      idee: "Es-tu prêt à te faire accompagner, ou pas encore ?",
      pour: "Coach, consultant, thérapeute",
      carte:
        "Sépare ceux qui veulent un devis de ceux qui veulent lire un article de plus, avant que tu décroches ton téléphone.",
    },
    for: {
      nom: "Le formateur",
      corps:
        "Ton problème n'est pas de convaincre. C'est que les gens ne savent pas où ils en sont : ils ont peur d'être trop débutants, ou de payer pour ce qu'ils savent déjà.",
      idee: "Quel est ton vrai niveau sur ce sujet ?",
      pour: "Formateur",
      carte:
        "Chacun repart avec son niveau, et avec la formation qui correspond à ce niveau. Fini les gens qui n'osent pas choisir.",
    },
    aff: {
      nom: "L'affilié",
      corps:
        "Tu ne vends pas ton produit, tu vends ton jugement. Ton quiz doit faire ce que fait un bon conseil : écouter la situation avant de recommander.",
      idee: "Quel outil te convient vraiment ?",
      pour: "Affilié",
      carte:
        "Le comparateur qui range chacun sur un seul outil, celui que tu recommandes pour son cas, avec ton lien derrière.",
    },
    cre: {
      nom: "Le créateur",
      corps:
        "Ce n'est pas de contenu que tu manques. Ce qui te manque, c'est un contenu que ton audience montre aux autres. Un quiz se partage parce qu'on veut montrer son résultat.",
      idee: "Quel type de créateur tu es ?",
      pour: "Créateur de contenu",
      carte:
        "On le passe pour se reconnaître, on le partage pour montrer son profil, et chaque partage te met devant une audience neuve.",
    },
    ven: {
      nom: "Le vendeur",
      corps:
        "Tu as une offre, et une page qui parle à tout le monde de la même façon. Un quiz règle ça sans que tu écrives trois pages de vente.",
      idee: "Quelle version de mon offre est faite pour toi ?",
      pour: "Vendeur de produit ou de service",
      carte:
        "Le sélecteur qui envoie chacun sur la bonne page, au lieu de le laisser hésiter devant un tableau à trois colonnes.",
    },
    dem: {
      nom: "Celui qui démarre",
      corps:
        "Tu n'as pas besoin du quiz le plus malin du monde. Tu as besoin du premier : celui qui te donne tes cent premières adresses et qui te dit ce que ces gens attendent de toi.",
      idee: "Par où commencer quand on part de zéro ?",
      pour: "Tu démarres de zéro",
      carte:
        "Ton tout premier quiz. Il aide vraiment, il se partage, et il remplit ta liste pendant que tu construis le reste.",
    },
  },
};

const EN: ContenuQuizHero = {
  titre: "Which quiz should you build?",
  mention: "Built with Tiquiz",
  numero: "Question {n} of {total}",
  compteur: "{n} / {total}",
  compteurResultat: "Your result",
  etiquetteResultat: "Your profile",
  etiquetteIdee: "The quiz to build first",
  boutonGenerer: "Generate this quiz →",
  rassurance: "The generator opens with the subject already filled in. No account, no card.",
  recommencer: "Start over",
  questions: [
    {
      titre: "What do you actually do?",
      options: [
        { texte: "I work with people: coaching, consulting, therapy", gains: { acc: 3 } },
        { texte: "I teach: courses, workshops, online training", gains: { for: 3 } },
        { texte: "I recommend tools that are not mine", gains: { aff: 3 } },
        { texte: "I publish content: blog, channel, newsletter", gains: { cre: 3 } },
        { texte: "I sell my own product or service", gains: { ven: 3 } },
      ],
    },
    {
      titre: "How do you collect email addresses today?",
      options: [
        { texte: "A PDF, a checklist, a guide to download", gains: { acc: 1, ven: 1 } },
        { texte: "A free course or mini-training", gains: { for: 2 } },
        { texte: "Just a newsletter sign-up form", gains: { cre: 2 } },
        { texte: "I do not collect any yet", gains: { dem: 5 } },
      ],
    },
    {
      titre: "What holds your audience back is more like:",
      options: [
        { texte: "They do not know where to start", gains: { dem: 2, for: 1 } },
        { texte: "They already tried and nothing came of it", gains: { acc: 2 } },
        { texte: "They hesitate between several options", gains: { aff: 2, ven: 1 } },
        { texte: "They are not sure they are good enough", gains: { for: 2 } },
      ],
    },
    {
      titre: "You want your quiz to do this first:",
      options: [
        { texte: "Sort out who is ready to buy", gains: { acc: 2, ven: 2 } },
        { texte: "Get me discovered by people who do not know me", gains: { cre: 3 } },
        { texte: "Help my subscribers pick the right offer", gains: { for: 2, aff: 2 } },
        { texte: "Collect addresses, plain and simple", gains: { dem: 2 } },
      ],
    },
  ],
  profils: {
    acc: {
      nom: "The guide",
      corps:
        "You sell time and attention, so every call with someone who is not ready costs you. Your quiz should not bring more people, it should bring fewer and better chosen.",
      idee: "Are you ready to work with a coach, or not yet?",
      pour: "Coach, consultant, therapist",
      carte:
        "Separates those who want a quote from those who want one more article to read, before you pick up the phone.",
    },
    for: {
      nom: "The teacher",
      corps:
        "Your problem is not convincing anyone. It is that people do not know where they stand: they fear being too much of a beginner, or paying for what they already know.",
      idee: "What is your real level on this subject?",
      pour: "Trainer",
      carte:
        "Everyone leaves with their level, and with the course that matches it. No more people who do not dare choose.",
    },
    aff: {
      nom: "The recommender",
      corps:
        "You are not selling your product, you are selling your judgement. Your quiz should do what good advice does: listen to the situation before recommending anything.",
      idee: "Which tool actually fits you?",
      pour: "Affiliate",
      carte:
        "The comparison that puts each person on one single tool, the one you recommend for their case, with your link behind it.",
    },
    cre: {
      nom: "The creator",
      corps:
        "Content is not what you lack. What you lack is content your audience shows to other people. A quiz gets shared because people want to show their result.",
      idee: "What kind of creator are you?",
      pour: "Content creator",
      carte:
        "People take it to recognise themselves, share it to show their profile, and every share puts you in front of a new audience.",
    },
    ven: {
      nom: "The seller",
      corps:
        "You have an offer, and a page that talks to everyone the same way. A quiz fixes that without you writing three sales pages.",
      idee: "Which version of my offer is right for you?",
      pour: "Selling a product or a service",
      carte:
        "The selector that sends each person to the right page, instead of leaving them hesitating in front of a three-column table.",
    },
    dem: {
      nom: "Starting out",
      corps:
        "You do not need the cleverest quiz in the world. You need the first one: the one that gets you your first hundred addresses and tells you what those people expect from you.",
      idee: "Where do you start when you start from zero?",
      pour: "You are starting from zero",
      carte:
        "Your very first quiz. It genuinely helps, it gets shared, and it fills your list while you build the rest.",
    },
  },
};

const PAR_LANGUE: Readonly<Record<LanguePublique, ContenuQuizHero>> = { fr: FR, en: EN };
const BRIEFS_PAR_LANGUE: Readonly<Record<LanguePublique, Readonly<Record<CleProfil, Brief>>>> = {
  fr: BRIEFS_FR,
  en: BRIEFS_EN,
};

export function quizHero(langue: LanguePublique): ContenuQuizHero {
  return PAR_LANGUE[langue] ?? PAR_LANGUE[LANGUE_SANS_PREFIXE];
}

export function briefsDuHero(langue: LanguePublique): Readonly<Record<CleProfil, Brief>> {
  return BRIEFS_PAR_LANGUE[langue] ?? BRIEFS_PAR_LANGUE[LANGUE_SANS_PREFIXE];
}

/**
 * LE PROFIL GAGNANT, ET L'EX AEQUO EST TRANCHÉ PAR L'ORDRE.
 *
 * C'est sa mécanique, reprise telle quelle : on parcourt les profils
 * dans SON ordre et on garde le premier maximum. Trancher autrement
 * (au hasard, au dernier) rendrait deux parcours identiques différents,
 * et un quiz qui ne donne pas deux fois le même résultat sur les mêmes
 * réponses est un quiz auquel personne ne croit.
 */
export function profilGagnant(points: Readonly<Partial<Record<CleProfil, number>>>): CleProfil {
  let gagnant: CleProfil = PROFILS_HERO[0];
  let max = -1;
  for (const cle of PROFILS_HERO) {
    const v = points[cle] ?? 0;
    if (v > max) {
      max = v;
      gagnant = cle;
    }
  }
  return gagnant;
}

/** Additionne les gains des réponses choisies. */
export function pointsDesReponses(gains: readonly Gains[]): Partial<Record<CleProfil, number>> {
  const total: Partial<Record<CleProfil, number>> = {};
  for (const g of gains) {
    for (const cle of PROFILS_HERO) {
      const v = g[cle];
      if (v) total[cle] = (total[cle] ?? 0) + v;
    }
  }
  return total;
}

/** Le chemin du générateur, préfixé quand la langue en a un. */
function chemin(lien: string, langue: LanguePublique): string {
  const coupe = lien.indexOf("?");
  const base = coupe < 0 ? lien : lien.slice(0, coupe);
  const query = coupe < 0 ? "" : lien.slice(coupe);
  return hrefPourLangue(base, langue) + query;
}

/**
 * LE LIEN DU BOUTON DE RÉSULTAT.
 *
 * Il porte `source: "hero"` ET le profil obtenu : c'est ce qui permet de
 * savoir lequel des six profils amène vraiment des générations. Sans le
 * profil, les six boutons sont indiscernables.
 */
export function lienDuProfil(cle: CleProfil, langue: LanguePublique): string {
  return chemin(lienGenerateur({ ...briefsDuHero(langue)[cle], source: "hero", profil: cle }), langue);
}

/** Le lien d'une des six cartes. Même brief, autre porte. */
export function lienDeLaCarte(cle: CleProfil, langue: LanguePublique): string {
  return chemin(lienGenerateur({ ...briefsDuHero(langue)[cle], source: "modeles" }), langue);
}
