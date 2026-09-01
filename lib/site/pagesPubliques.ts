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

export interface PagePublique {
  chemin: string;
  /** Le titre annoncé dans `llms.txt`. */
  titre: string;
  /** Une ligne qui dit à quoi sert la page. */
  resume: string;
  /** La priorité du sitemap. */
  priorite: number;
}

export const PAGES_PUBLIQUES: readonly PagePublique[] = [
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
