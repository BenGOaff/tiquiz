// lib/site/pagesPubliques.ts
//
// LES PAGES DU SITE PUBLIC, DÉCLARÉES UNE FOIS.
//
// Béné, 30 août 2026 : "il faut construire toutes les autres pages de
// mon site tiquiz.fr pour tout basculer de systeme io vers notre
// domaine et augmenter son ranking, sa fiabilité etc."
//
// "Augmenter son ranking" est la raison d'être de ce fichier. Une page
// construite mais absente du sitemap et de `llms.txt` dépend entièrement
// du fait qu'un robot suive un lien jusqu'à elle. On les déclare donc à
// UN endroit, lu par le sitemap ET par `llms.txt` : deux listes écrites
// séparément finissent toujours par diverger, et c'est la page la plus
// récente qui manque à l'une des deux.
//
// Un test EXIGE que toute page déclarée ici soit atteignable depuis le
// pied de page : une page que Google connaît et qu'aucun humain ne peut
// trouver depuis le site est une page qui ne sert à rien.
import { fonctionnalites } from "@/lib/site/fonctionnalites";
import {
  LANGUE_SANS_PREFIXE,
  LANGUES_PUBLIQUES,
  type LanguePublique,
} from "@/lib/site/langues";

export interface PagePublique {
  chemin: string;
  /** Le titre annoncé dans `llms.txt`. */
  titre: string;
  /** Une ligne qui dit à quoi sert la page. */
  resume: string;
  /** La priorité du sitemap. */
  priorite: number;
  /**
   * LES LANGUES DANS LESQUELLES CETTE PAGE EXISTE VRAIMENT.
   *
   * Absent = la seule langue sans préfixe, donc le français. Ce n'est
   * pas un défaut de confort : déclarer une langue qu'une page n'a pas
   * mettrait `https://tiquiz.fr/en/<chemin>` dans le sitemap et dans
   * ses `hreflang`, et Google y trouverait du FRANÇAIS sous une adresse
   * anglaise. La page s'afficherait parfaitement, et l'anglais serait
   * jugé sur du contenu dupliqué.
   *
   * Une page entre ici le jour où son texte anglais existe, jamais le
   * jour où on prévoit de l'écrire.
   */
  langues?: readonly LanguePublique[];
}

/** Les langues d'une page, avec son repli. */
export function languesDePage(p: PagePublique): readonly LanguePublique[] {
  return p.langues && p.langues.length > 0 ? p.langues : [LANGUE_SANS_PREFIXE];
}

const PAGES_ECRITES: readonly PagePublique[] = [
  // LA RACINE N'EST PAS DÉCLARÉE ICI, ET C'EST VOLONTAIRE. Elle sert la
  // page de vente capturée, qui porte déjà ses propres données
  // structurées (`lib/sales/servePage.ts`). Et la landing courte qui la
  // remplacera un jour vit derrière un slug introuvable, en noindex,
  // tant que Béné ne l'a pas validée : la déclarer ici l'annoncerait à
  // Google avant qu'elle ne soit en ligne.
  // LE GÉNÉRATEUR EST UNE PAGE À PART ENTIÈRE, pas un bout de la
  // landing : "générateur de quiz" est une requête que quelqu'un tape
  // avant même de connaître Tiquiz, et l'outil qu'elle cherche est
  // POSÉ dedans, gratuitement et sans compte. C'est la seule page du
  // site où la promesse se vérifie sur place, en trente secondes.
  {
    chemin: "/generateur-de-quiz",
    titre: "Générateur de quiz gratuit par IA",
    resume:
      "Décris ton sujet et à qui tu parles : l'IA écrit les questions, leurs réponses et les profils de résultat. Sans compte et sans carte bancaire, et le quiz se retrouve dans un compte gratuit.",
    priorite: 0.9,
    // Traduite le 8 septembre : son texte vit dans
    // `lib/site/generateurQuiz.ts`, structure d'un côté, texte par
    // langue de l'autre. L'OUTIL suit la langue de la page.
    langues: ["fr", "en"],
  },
  {
    chemin: "/tarifs",
    titre: "Tarifs Tiquiz",
    resume:
      "Trois paliers, le premier ne coûte rien et ne demande pas de carte bancaire. Le détail ligne par ligne, ce que ça remplace, et les questions d'argent.",
    priorite: 0.9,
    // Son texte anglais vit dans `contenuLanding("en")`
    // (`lib/site/landing.ts`). Une page ne déclare une langue que
    // lorsque son texte existe VRAIMENT : sinon le sitemap et les
    // `hreflang` annonceraient une adresse anglaise qui sert du
    // français, et Google jugerait l'anglais sur du contenu dupliqué.
    langues: ["fr", "en"],
  },
  {
    chemin: "/affiliation",
    titre: "Programme d'affiliation Tiquiz",
    resume:
      "40 % de commission récurrente sur chaque abonnement Tiquiz, tant que le filleul reste client. Cookie d'un an, versement dès 20 €, facture éditée par nous.",
    priorite: 0.8,
  },
  {
    chemin: "/affiliation-atelier",
    titre: "Affiliation de l'Atelier du Quiz",
    resume:
      "70 % de commission sur chaque vente de l'Atelier du Quiz, la formation de 7 jours à 47 €.",
    priorite: 0.7,
  },
  {
    chemin: "/a-propos",
    // Traduite le 8 septembre : `lib/site/aPropos.ts` porte le récit
    // entier dans les deux langues.
    langues: LANGUES_PUBLIQUES,
    titre: "Bénédicte Lagardette, fondatrice de Tiquiz",
    resume:
      "Ex-infirmière (urgences en Corse, ambulance en Suisse), handicapée à 34 ans après trois opérations du dos, elle a repris depuis son lit et code aujourd'hui ses propres logiciels avec l'IA. L'histoire derrière Tiquiz et l'Atelier du Quiz, y compris l'échec d'iziquiz.",
    priorite: 0.7,
  },
  {
    chemin: "/integrations",
    // LE HUB ET SES SIX PAGES FILLES SONT BILINGUES (8 septembre).
    //
    // Cette note disait "ses six pages filles NON", et c'était vrai le
    // matin : leur texte vit maintenant dans `lib/site/outils/*.ts`, une
    // entrée par langue. On ne déclare que les langues qu'une page a
    // VRAIMENT, et c'est la règle qui compte : déclarer une langue
    // absente mettrait l'adresse anglaise dans le sitemap ET dans ses
    // `hreflang`, et Google y trouverait du français, donc jugerait
    // l'anglais sur du contenu dupliqué.
    langues: LANGUES_PUBLIQUES,
    titre: "Connecter ses outils à Systeme.io",
    resume:
      "Ce que chaque outil de formulaire ou de quiz demande pour envoyer ses réponses dans Systeme.io : Zapier, un webhook, ou rien du tout. Tally, Typeform, Google Forms, Jotform, Interact et Tiquiz comparés.",
    priorite: 0.7,
  },
  {
    chemin: "/integrations/zapier-systeme-io",
    langues: LANGUES_PUBLIQUES,
    titre: "Zapier et Systeme.io",
    resume:
      "L'application Systeme.io est accessible dès le plan gratuit de Zapier. Les actions disponibles, les limites chiffrées, et le moment où le plan gratuit ne suffit plus.",
    priorite: 0.6,
  },
  {
    chemin: "/integrations/tally-systeme-io",
    langues: LANGUES_PUBLIQUES,
    titre: "Connecter Tally à Systeme.io",
    resume:
      "Tally n'a pas d'intégration Systeme.io. Les trois méthodes (webhook et code, Zapier, Make), ce que chacune coûte, et le piège de l'identifiant de tag.",
    priorite: 0.6,
  },
  {
    chemin: "/integrations/typeform-systeme-io",
    langues: LANGUES_PUBLIQUES,
    titre: "Connecter Typeform à Systeme.io",
    resume:
      "Typeform n'a pas d'intégration Systeme.io native. La méthode avec Zapier, les deux pièges de configuration, et le coût réel des deux abonnements.",
    priorite: 0.6,
  },
  {
    chemin: "/integrations/google-forms-systeme-io",
    langues: LANGUES_PUBLIQUES,
    titre: "Connecter Google Forms à Systeme.io",
    resume:
      "Afficher un Google Forms dans une page Systeme.io est possible, mais il n'envoie rien dans les contacts. Zapier lit la feuille de calcul liée, pas le formulaire.",
    priorite: 0.6,
  },
  {
    chemin: "/integrations/interact-systeme-io",
    langues: LANGUES_PUBLIQUES,
    titre: "Connecter Interact à Systeme.io",
    resume:
      "La documentation d'Interact demande un compte Zapier Pro, un tag créé à la main dans Systeme.io par résultat de quiz, et un Zap par résultat. Les citations et leur source.",
    priorite: 0.6,
  },
  {
    chemin: "/integrations/jotform-systeme-io",
    langues: LANGUES_PUBLIQUES,
    titre: "Connecter Jotform à Systeme.io",
    resume:
      "Jotform annonce une intégration Systeme.io, mais son bouton ouvre Zapier : l'adresse porte integration=Zapier et aucune clé API Systeme.io n'est demandée.",
    priorite: 0.6,
  },
  {
    chemin: "/fonctionnalites",
    titre: "Tout ce que Tiquiz sait faire",
    resume:
      "La connexion Systeme.io, les quiz par profil ou scorés, les sondages, les Popquiz, les tags automatiques, les générateurs : chaque fonctionnalité expliquée en détail.",
    priorite: 0.7,
    langues: LANGUES_PUBLIQUES,
  },
  {
    chemin: "/newsletter",
    titre: "La newsletter de Béné",
    resume:
      "Ce qu'elle teste dans ses propres quiz, les chiffres réels, et ce qui rate aussi. Désinscription en un clic.",
    priorite: 0.6,
  },
  {
    chemin: "/support",
    titre: "Aide et contact",
    resume:
      "Le formulaire pour écrire à Béné. Publique : aucun compte n'est demandé, parce que celui qui a le plus besoin d'aide est celui qui n'arrive pas à se connecter.",
    priorite: 0.5,
  },
] as const;

/**
 * LES PAGES DE FONCTIONNALITÉS SONT DÉRIVÉES, JAMAIS RECOPIÉES.
 *
 * Huit chemins à tenir à la main dans une deuxième liste, c'est huit
 * occasions d'oublier une page dans le sitemap. Et ce fichier
 * dit dans son propre en-tête que deux listes écrites séparément
 * finissent toujours par diverger : c'est arrivé une branche plus bas
 * le 4 septembre, sur les pages légales du domaine de vente.
 *
 * Une fonctionnalité ajoutée dans `lib/site/fonctionnalites.ts` entre
 * donc dans le sitemap et dans `llms.txt` sans qu'on y pense.
 */
export const PAGES_PUBLIQUES: readonly PagePublique[] = [
  ...PAGES_ECRITES,
  // LE TITRE ET LE RÉSUMÉ SONT PRIS EN FRANÇAIS, et c'est délibéré :
  // ce sont eux qui partent dans `llms.txt`, qui n'a qu'une version.
  // Les langues, elles, sont DÉCLARÉES, donc le sitemap et les
  // `hreflang` savent que `/en/fonctionnalites/<slug>` existe.
  ...fonctionnalites(LANGUE_SANS_PREFIXE).map((f) => ({
    chemin: `/fonctionnalites/${f.slug}`,
    titre: f.nom,
    resume: f.resume,
    priorite: 0.6,
    langues: LANGUES_PUBLIQUES,
  })),
];
