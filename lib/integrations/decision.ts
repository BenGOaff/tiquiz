// lib/integrations/decision.ts
//
// LES DÉCISIONS DU CHANTIER CONNEXIONS, SANS UNE LIGNE DE RÉSEAU NI DE
// BASE : c'est ce qui les rend testables.
//
// Trois questions, et chacune a coûté cher ailleurs dans ce dépôt quand
// elle vivait dans une route :
//   1. vers OÙ part ce lead (`choisirDestination`) ;
//   2. un échec veut-il dire "déconnecté", "réessaie" ou "refusé"
//      (`classerEchecEnvoi`) ;
//   3. faut-il prévenir la créatrice, et une seule fois
//      (`doitAlerterDeconnexion`).

import type { Fournisseur } from "./fournisseurs";

/** Une connexion telle que la base la rend, sans son secret. */
export interface ConnexionPourDecision {
  id: string;
  fournisseur: Fournisseur;
  actif: boolean;
  est_defaut: boolean;
  etat: "ok" | "deconnecte";
  alerte_deconnexion_le: string | null;
}

export type ChoixDestination =
  /** La connexion explicitement choisie sur le quiz, ou le défaut du projet. */
  | { type: "connexion"; id: string; fournisseur: Fournisseur }
  /** Une connexion visée mais mise en PAUSE : rien ne part, et on le sait. */
  | { type: "pause"; id: string; fournisseur: Fournisseur }
  /** Aucune connexion CRM : la cascade Systeme.io d'avant décide. */
  | { type: "systemeio" };

/**
 * Vers où part un lead.
 *
 * L'ORDRE EST LA RÈGLE, et il ne se devine pas :
 *   1. la connexion CHOISIE sur le quiz (`quizzes.connexion_id`) ;
 *   2. sinon la connexion PAR DÉFAUT du projet dans `connexions_crm` ;
 *   3. sinon Systeme.io, par sa cascade historique (clé du quiz, défaut
 *      du projet, clé du projet, colonne historique).
 *
 * Une connexion en PAUSE ne retombe PAS sur la suivante : "en pause"
 * veut dire "ne rien envoyer", pas "envoyer ailleurs". Retomber sur
 * Systeme.io enverrait les leads d'un client GoHighLevel dans le compte
 * Systeme.io de la créatrice, et personne ne le verrait.
 *
 * Une connexion DÉCONNECTÉE (jeton refusé) est quand même visée : c'est
 * l'ENVOI qui échouera et qui le dira, et c'est ce qu'on veut. La sauter
 * en silence est exactement ce que ce chantier existe pour empêcher.
 */
export function choisirDestination(args: {
  connexionDuQuiz: ConnexionPourDecision | null;
  connexionParDefaut: ConnexionPourDecision | null;
}): ChoixDestination {
  const c = args.connexionDuQuiz ?? args.connexionParDefaut;
  if (!c) return { type: "systemeio" };
  if (!c.actif) return { type: "pause", id: c.id, fournisseur: c.fournisseur };
  return { type: "connexion", id: c.id, fournisseur: c.fournisseur };
}

export type ClasseEchec = "deconnecte" | "temporaire" | "refus";

/**
 * Ce qu'un statut HTTP du fournisseur veut dire pour NOUS.
 *
 *   - 401 / 403 : le jeton ne vaut plus rien (révoqué, expiré, droits
 *     retirés). C'est "déconnecté", et c'est le SEUL cas qui prévient la
 *     créatrice : un lead qui ne part pas pour cette raison ne partira
 *     jamais tant qu'elle n'a pas agi.
 *   - 0 (réseau), 408, 429, 5xx : le fournisseur ne répond pas ou
 *     demande d'attendre. Temporaire. On ne touche pas à l'état de la
 *     connexion : une panne de dix minutes chez eux ne doit pas envoyer
 *     un email "déconnecté" qui fait ressaisir un jeton valide.
 *   - le reste (400, 404, 422...) : notre demande a été refusée. Le
 *     jeton marche, c'est le contenu qui cloche. Journal, pas email.
 */
export function classerEchecEnvoi(status: number): ClasseEchec {
  if (status === 401 || status === 403) return "deconnecte";
  if (status === 0 || status === 408 || status === 429 || status >= 500) return "temporaire";
  return "refus";
}

/**
 * Faut-il envoyer l'email "ta connexion est coupée" ?
 *
 * UNE FOIS par déconnexion : la première fois qu'un envoi rend 401, et
 * plus jamais tant que la connexion n'a pas été revalidée (ce qui remet
 * `alerte_deconnexion_le` à null). Sans ce garde, chaque lead qui
 * arrive pendant que le jeton est mort enverrait un email : quarante
 * leads, quarante emails, et le quarante et unième est dans le filtre
 * anti-spam avec la vraie information.
 */
export function doitAlerterDeconnexion(c: Pick<ConnexionPourDecision, "alerte_deconnexion_le">): boolean {
  return c.alerte_deconnexion_le === null;
}

/**
 * Les quatre derniers caractères d'un secret, pour que la créatrice
 * RECONNAISSE le sien sans jamais le relire (règle des IBAN, 25 août).
 */
export function derniersCaracteres(secret: string, n = 4): string {
  const s = String(secret ?? "");
  return s.length <= n ? s : s.slice(-n);
}
