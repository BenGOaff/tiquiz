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
// ── ET LE MODULE EST EN FRANÇAIS SEULEMENT ───────────────────────────
//
// Même choix assumé que `fonctionnalites.ts` et `avantages.ts`, pour la
// même raison : traduire tout de suite fabriquerait une deuxième liste
// à tenir. C'est écrit ici pour que le prochain passage ne le prenne
// pas pour un oubli.

import { FREE_LIMITS } from "@/lib/planLimits";
import { HOTE_VENTE } from "@/lib/publicHost";
import { FENETRE_HEURES, LIMITE_PAR_IP } from "@/lib/embed/limites";

/** L'adresse de la page. Écrite ICI, lue par le sitemap et la nav. */
export const CHEMIN_GENERATEUR = "/generateur-de-quiz";

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

export interface BlocGenerateur {
  titre: string;
  corps: readonly string[];
  /** Le fichier qui rend le bloc vrai. Le test exige qu'il existe. */
  source: string;
}

/**
 * CE QUE L'IA ÉCRIT VRAIMENT, et rien de plus.
 *
 * La liste est relevée dans le prompt de génération
 * (`lib/prompts/quiz/system.ts`) et dans ce que la route embed écrit en
 * base : les questions, leurs réponses, les profils de résultat avec
 * leur texte, et le titre plus le sous-titre d'accueil.
 */
export const CE_QUE_LIA_ECRIT: readonly BlocGenerateur[] = [
  {
    titre: "Les questions, et les réponses qui vont avec",
    corps: [
      "Tu donnes ton sujet, à qui tu parles et le ton que tu veux. L'IA écrit les questions et toutes leurs réponses, dans ta langue, sans que tu aies une seule case à remplir.",
      "En mode profil, elle écrit exactement une réponse par profil sur chaque question. C'est ce qui évite le quiz où un profil n'est jamais attribué à personne, et c'est une correction qui vient d'une vraie cliente.",
    ],
    source: "lib/prompts/quiz/system.ts",
  },
  {
    titre: "Les profils de résultat, écrits en entier",
    corps: [
      "Chaque profil a son titre, son texte, et la suite logique vers ton offre. Ce ne sont pas des étiquettes : c'est la page que ton visiteur lit à la fin, et c'est elle qui décide s'il clique ou s'il ferme l'onglet.",
      "Tu relis, tu corriges, tu réécris ce que tu veux. L'IA fait le premier jet, tu gardes la main sur chaque mot.",
    ],
    source: "lib/quiz/resultBeats.ts",
  },
  {
    titre: "Le titre et la phrase d'accueil",
    corps: [
      "Le sous-titre annonce un bénéfice et la durée du quiz, jamais le nombre de questions (on s'en fiche, et ça ne lève aucune objection).",
      "Les accroches s'inspirent de mécaniques de copywriting, pas d'une liste de modèles recopiés : deux quiz générés le même jour ne se ressemblent pas.",
    ],
    source: "lib/prompts/quiz/copywriting.ts",
  },
  {
    titre: "Profil ou score, c'est toi qui choisis",
    corps: [
      "Un quiz de profil répond à \"qui es-tu ?\", un quiz scoré répond à \"où en es-tu ?\". Les deux existent, ils ne se mélangent jamais, et tu peux changer d'avis après coup.",
      "En mode score, tu peux poser tes tranches à la main ou demander à Tiquiz de les répartir sur la plage de points réellement atteignable.",
    ],
    source: "lib/quizScoring.ts",
  },
];

/** Les trois étapes, dans l'ordre où on les vit. */
export const ETAPES: readonly { titre: string; corps: string }[] = [
  {
    titre: "Tu décris ton quiz",
    corps:
      "Le sujet, à qui tu parles, ce que tu veux en faire, le nombre de questions et le ton. Cinq champs, et aucun n'est un piège.",
  },
  {
    titre: "L'IA écrit tout",
    corps:
      "Les questions apparaissent au fur et à mesure. Tu vois le quiz se construire, tu n'attends pas devant un écran vide.",
  },
  {
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
 * moitiés.
 */
export const CE_QUIL_NE_FAIT_PAS: readonly { refus: string; alaplace: string }[] = [
  {
    refus: "Il n'écrit pas un résultat sur mesure pour chaque visiteur",
    alaplace:
      "Tiquiz attribue un profil que TU as écrit à l'avance. C'est ce qui le rend relisable et corrigeable, et c'est un choix, pas une limite technique.",
  },
  {
    refus: "Il ne fabrique pas de parcours à embranchements",
    alaplace:
      "Tout le monde voit les mêmes questions, seul le résultat change. Si un questionnaire conditionnel est indispensable chez toi, Tiquiz n'est pas le bon outil.",
  },
  {
    refus: "Il ne dessine pas une maquette libre",
    alaplace:
      "Ton logo, tes couleurs, ta police et ta langue se règlent, et c'est déjà le cas sur le plan gratuit. Un design au pixel près, non.",
  },
];

export interface QuestionGenerateur {
  q: string;
  r: string;
}

/**
 * LA FAQ, ET ELLE RÉPOND VRAIMENT.
 *
 * Elle sert deux choses d'un coup : la visiteuse qui hésite, et le
 * `FAQPage` en données structurées. Écrire deux listes séparées
 * donnerait Google à qui on raconte autre chose qu'à la lectrice, ce
 * qui est exactement le piège évité sur la page de vente le
 * 2 septembre.
 */
export const FAQ: readonly QuestionGenerateur[] = [
  {
    q: "Le générateur est vraiment gratuit ?",
    r: `Oui, et sans compte. Tu arrives sur la page, tu décris ton quiz, l'IA l'écrit. Aucune adresse email n'est demandée pour générer, et aucune carte bancaire nulle part. La seule borne est technique : ${LIMITE_PAR_IP} quiz par ${FENETRE_HEURES} heures depuis la même connexion, pour qu'une boucle accidentelle ne fasse pas tourner le moteur toute la nuit.`,
  },
  {
    q: "Qu'est-ce qui se passe si je ferme l'onglet ?",
    r: "Ton quiz existe déjà, il est enregistré au fur et à mesure. En créant ton compte gratuit depuis le bouton du générateur, tu le retrouves dedans, tel que tu l'as laissé. C'est le compte qui te le rattache, pas ton navigateur : ça marche donc aussi sur Safari et Firefox, qui bloquent le stockage par défaut.",
  },
  {
    q: "Je dois payer pour publier mon quiz ?",
    r: `Non. Le plan gratuit publie ${FREE_LIMITS.maxQuizzesPerMode} quiz et ${FREE_LIMITS.maxQuizzesPerMode} sondage, en ligne, avec ton logo et tes couleurs. Ce qui est borné, c'est le nombre de réponses que tu peux LIRE : ${FREE_LIMITS.visibleLeadsPerMonth} par mois, les suivantes sont floutées. Elles ne sont pas perdues, elles t'attendent.`,
  },
  {
    q: "Ça marche dans ma langue ?",
    r: `Le catalogue porte ${LANGUES_ET_VARIANTES} langues et variantes, et la variante compte : un quiz en portugais du Brésil n'est pas écrit comme un quiz en portugais du Portugal, et le générateur le sait. L'interface de Tiquiz, elle, existe en 7 langues.`,
  },
  {
    q: "Et les adresses email que je récupère, elles vont où ?",
    r: "Dans Tiquiz, et dans Systeme.io si tu l'utilises : le contact est créé et le tag posé automatiquement, sans Zapier, sans Make et sans une ligne de code. Tiquiz crée même le tag chez eux quand il n'existe pas encore. Si tu n'es pas chez Systeme.io, tu exportes tes leads en CSV avec le profil obtenu, donc ta segmentation survit à l'import ailleurs.",
  },
  {
    q: "Je peux modifier ce que l'IA a écrit ?",
    r: "Tout, mot par mot. L'éditeur s'ouvre directement sur ton quiz : les questions, les réponses, les profils, les couleurs, les images. L'IA fait le premier jet pour que tu ne partes pas de la page blanche, elle ne décide de rien.",
  },
];

/** L'adresse complète de la page, pour les canoniques et le JSON-LD. */
export const URL_GENERATEUR = `${HOTE_VENTE}${CHEMIN_GENERATEUR}`;

/**
 * LE JSON-LD, CONSTRUIT DEPUIS LES MÊMES DONNÉES QUE L'ÉCRAN.
 *
 * `price: "0"` n'est pas une formule commerciale : la route de
 * génération ne demande ni compte ni paiement (mesuré dans
 * `app/api/embed/quiz/generate/route.ts`). Si ça changeait un jour,
 * cette ligne deviendrait un mensonge servi à Google, et c'est
 * exactement pour ça qu'elle est écrite à côté du reste.
 */
export function applicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Générateur de quiz Tiquiz",
    url: URL_GENERATEUR,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "fr",
    description:
      "Générateur de quiz par IA : tu décris ton sujet, il écrit les questions, les réponses et les profils de résultat. Sans compte et sans carte bancaire.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
    },
  };
}

export function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.r },
    })),
  };
}
