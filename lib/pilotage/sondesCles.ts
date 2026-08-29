// lib/pilotage/sondesCles.ts
//
// EST-CE QUE LA CLÉ MARCHE (Béné, 29 août 2026).
//
// "Dans paramètres ben je vois pas trop l'intérêt... l'idée c'était un
// peu d'éviter à entrer dans le .env, d'avoir accès aux infos."
//
// Elle a raison sur l'intérêt : "posée" ou "absente" ne dit RIEN de
// plus qu'un `grep` dans le fichier. Or une clé posée peut être fausse,
// périmée, ou parler du mauvais projet, et c'est exactement ce qui a
// coûté une journée le 22 août et un client le 7 août. La seule
// information qui change une décision, c'est : est-ce qu'elle RÉPOND.
//
// -- ON DEMANDE AU FOURNISSEUR, ON NE DEVINE PAS ----------------------
//
// Un contrôle qui déduit d'un préfixe dit ce que le fichier dit déjà.
// On appelle donc chaque service avec la clé qu'on a, et on lit ce
// qu'il répond.
//
// -- ET ON TAPE À L'ENDROIT QUI DISTINGUE ----------------------------
//
// Leçon du 22 août, payée une heure : `/rest/v1/` répond 200 à
// n'importe quelle clé valide du projet, quel que soit son rôle. Un
// test qui ne distingue pas ce qu'il est censé distinguer est pire
// qu'un test absent. Chaque sonde ci-dessous vise le point d'entrée qui
// répond à SA question, et le commentaire dit lequel.
//
// -- AUCUNE SONDE N'ÉCRIT, NI NE COÛTE -------------------------------
//
// Que des lectures : lister un client, demander un jeton, lire un
// réglage. Rien qui crée, rien qui facture, rien qui envoie un email.
// Un écran de diagnostic qui déclenche un paiement de test serait une
// très mauvaise surprise.
//
// PUR pour la DÉCISION (`lireReponse`), la plomberie réseau vit dans la
// route : un module qui appelle le réseau n'est pas testable.

export type EtatCle =
  /** Pas de clé : il n'y a rien à tester. */
  | "absente"
  /** Le service a répondu, la clé est bonne. */
  | "ok"
  /** Le service a répondu et REFUSE la clé. */
  | "refusee"
  /** On n'a pas pu demander : réseau, délai, service en panne. */
  | "injoignable";

export interface ResultatCle {
  /** Le service testé, tel qu'il s'affiche. */
  service: string;
  etat: EtatCle;
  /** Ce que ça veut dire, et quoi faire. Jamais vide. */
  detail: string;
  /** La variable concernée, pour savoir quoi corriger. */
  variable: string;
}

/**
 * Ce qu'un code HTTP dit d'une clé.
 *
 * 401 et 403 sont les seuls qui accusent la CLÉ. Tout le reste (500,
 * 502, un délai dépassé) accuse le service ou le réseau : conclure
 * "clé refusée" sur un 500 enverrait regénérer une clé parfaitement
 * bonne, et c'est exactement l'erreur du 22 août dans l'autre sens.
 */
export function lireReponse(statut: number): EtatCle {
  if (statut >= 200 && statut < 300) return "ok";
  if (statut === 401 || statut === 403) return "refusee";
  return "injoignable";
}

/** La phrase qui va avec un état, pour un service donné. */
export function phraseCle(service: string, etat: EtatCle, variable: string): string {
  switch (etat) {
    case "absente":
      return `Aucune clé posée pour ${service}.`;
    case "ok":
      return `${service} a répondu : la clé est bonne.`;
    case "refusee":
      return `${service} REFUSE cette clé. Elle est fausse, révoquée, ou elle appartient à un autre compte. Poser une nouvelle valeur dans ${variable}, puis redémarrer.`;
    case "injoignable":
      return `${service} n'a pas répondu. On ne sait donc pas si la clé est bonne : ce n'est pas la même chose qu'une clé refusée.`;
  }
}

/**
 * L'ORDRE D'AFFICHAGE : ce qui cloche d'abord.
 *
 * Une clé refusée est une panne en cours ; une absente est une
 * fonctionnalité éteinte, souvent volontairement. Les mettre dans
 * l'ordre alphabétique noierait la première dans les secondes.
 */
export function trierCles(r: readonly ResultatCle[]): ResultatCle[] {
  const rang: Record<EtatCle, number> = { refusee: 0, injoignable: 1, absente: 2, ok: 3 };
  return [...r].sort(
    (a, b) => rang[a.etat] - rang[b.etat] || a.service.localeCompare(b.service, "fr"),
  );
}

/** Combien de choses ne vont pas. Sert au bandeau. */
export function comptePannes(r: readonly ResultatCle[]): number {
  return r.filter((x) => x.etat === "refusee").length;
}
