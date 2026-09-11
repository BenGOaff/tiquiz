// lib/embed/attente.ts
//
// CE QUE LE VISITEUR LIT PENDANT QUE SON QUIZ S'ÉCRIT (chantier 3,
// 10 septembre 2026). Module PUR : les décisions de l'écran d'attente,
// sans React, donc testées.
//
// Béné : "trois cartes de dix mots qui tournent toutes les 4 secondes
// sous le quiz en train de s'écrire", et "UNE question utile à côté du
// flux : tu utilises Systeme.io ? Oui / Non / Pas encore. Elle ne bloque
// rien." La réponse part dans `generation_reussie` sous la clé
// `systemeio` (`lib/analytics/parcours.ts`, `reponseSystemeIo`).
//
// Les PHRASES vivent dans le dictionnaire de l'embed (fr / en), pas ici :
// ce module ne porte que la mécanique, et il ne sait pas quelle langue
// l'écran parle.

import type { ReponseSystemeIo } from "@/lib/analytics/parcours";

/** Les clés des trois cartes, dans l'ordre où elles tournent. */
export const CLES_CARTES = ["genCarte1", "genCarte2", "genCarte3"] as const;

/** Toutes les 4 secondes, c'est SA consigne. */
export const INTERVALLE_CARTES_MS = 4000;

/** L'indice de la carte suivante, en boucle. */
export function carteSuivante(indice: number, nombre: number = CLES_CARTES.length): number {
  if (nombre <= 0) return 0;
  return (indice + 1) % nombre;
}

/** Les trois réponses possibles, avec la clé de leur libellé. */
export const REPONSES_SIO: ReadonlyArray<{ valeur: ReponseSystemeIo; cle: string }> = [
  { valeur: "oui", cle: "genSioOui" },
  { valeur: "non", cle: "genSioNon" },
  { valeur: "pas-encore", cle: "genSioPasEncore" },
];

/**
 * Ce qu'on met en avant une fois la réponse donnée : la connexion par
 * clé API pour qui a Systeme.io, l'export pour les autres. `null` tant
 * qu'on n'a rien répondu : la question ne bloque rien et n'insiste pas.
 */
export function indiceApresReponse(reponse: ReponseSystemeIo | null): "genSioIndiceCle" | "genSioIndiceExport" | null {
  if (reponse === null) return null;
  return reponse === "oui" ? "genSioIndiceCle" : "genSioIndiceExport";
}
