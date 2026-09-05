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
import { FONCTIONNALITES } from "@/lib/site/fonctionnalites";

export interface PagePublique {
  chemin: string;
  /** Le titre annoncé dans `llms.txt`. */
  titre: string;
  /** Une ligne qui dit à quoi sert la page. */
  resume: string;
  /** La priorité du sitemap. */
  priorite: number;
}

const PAGES_ECRITES: readonly PagePublique[] = [
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
    titre: "Bénédicte Lagardette, fondatrice de Tiquiz",
    resume:
      "Ex-infirmière (urgences en Corse, ambulance en Suisse), handicapée à 34 ans après trois opérations du dos, elle a repris depuis son lit et code aujourd'hui ses propres logiciels avec l'IA. L'histoire derrière Tiquiz et l'Atelier du Quiz, y compris l'échec d'iziquiz.",
    priorite: 0.7,
  },
  {
    chemin: "/integrations",
    titre: "Connecter ses outils à Systeme.io",
    resume:
      "Ce que chaque outil de formulaire ou de quiz demande pour envoyer ses réponses dans Systeme.io : Zapier, un webhook, ou rien du tout. Tally, Typeform, Google Forms, Jotform, Interact et Tiquiz comparés.",
    priorite: 0.7,
  },
  {
    chemin: "/integrations/zapier-systeme-io",
    titre: "Zapier et Systeme.io",
    resume:
      "L'application Systeme.io est accessible dès le plan gratuit de Zapier. Les actions disponibles, les limites chiffrées, et le moment où le plan gratuit ne suffit plus.",
    priorite: 0.6,
  },
  {
    chemin: "/integrations/tally-systeme-io",
    titre: "Connecter Tally à Systeme.io",
    resume:
      "Tally n'a pas d'intégration Systeme.io. Les trois méthodes (webhook et code, Zapier, Make), ce que chacune coûte, et le piège de l'identifiant de tag.",
    priorite: 0.6,
  },
  {
    chemin: "/integrations/typeform-systeme-io",
    titre: "Connecter Typeform à Systeme.io",
    resume:
      "Typeform n'a pas d'intégration Systeme.io native. La méthode avec Zapier, les deux pièges de configuration, et le coût réel des deux abonnements.",
    priorite: 0.6,
  },
  {
    chemin: "/integrations/google-forms-systeme-io",
    titre: "Connecter Google Forms à Systeme.io",
    resume:
      "Afficher un Google Forms dans une page Systeme.io est possible, mais il n'envoie rien dans les contacts. Zapier lit la feuille de calcul liée, pas le formulaire.",
    priorite: 0.6,
  },
  {
    chemin: "/integrations/interact-systeme-io",
    titre: "Connecter Interact à Systeme.io",
    resume:
      "La documentation d'Interact demande un compte Zapier Pro, un tag créé à la main dans Systeme.io par résultat de quiz, et un Zap par résultat. Les citations et leur source.",
    priorite: 0.6,
  },
  {
    chemin: "/integrations/jotform-systeme-io",
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
 * Quatorze chemins à tenir à la main dans une deuxième liste, c'est
 * quatorze occasions d'oublier une page dans le sitemap. Et ce fichier
 * dit dans son propre en-tête que deux listes écrites séparément
 * finissent toujours par diverger : c'est arrivé une branche plus bas
 * le 4 septembre, sur les pages légales du domaine de vente.
 *
 * Une fonctionnalité ajoutée dans `lib/site/fonctionnalites.ts` entre
 * donc dans le sitemap et dans `llms.txt` sans qu'on y pense.
 */
export const PAGES_PUBLIQUES: readonly PagePublique[] = [
  ...PAGES_ECRITES,
  ...FONCTIONNALITES.map((f) => ({
    chemin: `/fonctionnalites/${f.slug}`,
    titre: f.nom,
    resume: f.resume,
    priorite: 0.6,
  })),
];
