// lib/webhooks/verrouRegles.ts
//
// LA DÉCISION DU VERROU, PURE ET TESTABLE.
//
// `log.ts` importe `supabaseAdmin`, qui exige des variables
// d'environnement AU CHARGEMENT : aucun test ne peut donc l'importer.
// C'est la règle du dépôt depuis le 1er août, et c'est exactement là
// que les bugs s'installent. La décision vit donc ici, séparée de la
// plomberie.

/**
 * Au delà de ce délai, une ligne `processing` est considérée MORTE.
 *
 * Un traitement qui dépasse deux minutes a été tué (redémarrage PM2,
 * délai de la plateforme, machine qui redémarre). Trop court, on
 * traiterait deux fois en parallèle ; trop long, une vente resterait
 * bloquée le temps du délai. Deux minutes couvrent largement le pire de
 * nos traitements, qui font trois appels réseau.
 */
export const REPRISE_APRES_MS = 2 * 60 * 1000;

export type VerdictVerrou =
  /** Le verrou est à nous : on traite. */
  | { action: "traiter" }
  /** Déjà fait. On répond 200 sans rien refaire. */
  | { action: "doublon" }
  /**
   * Quelqu'un d'autre est en train de le faire, à l'instant. On demande
   * un réessai PLUS TARD plutôt que de répondre 200 : si son traitement
   * échoue, il faut que quelqu'un repasse.
   */
  | { action: "en_cours" };

export interface LigneDeVerrou {
  status?: string | null;
  /** L'horodatage de la ligne, tel que Postgres le rend. */
  received_at?: string | null;
}

/**
 * Que faire, au vu de la ligne qui nous a bloqués ?
 *
 * `maintenant` est un PARAMÈTRE : une fonction qui lit l'horloge toute
 * seule n'est pas testable, et un test qui dépend de l'heure est un test
 * qui clignote (leçon du 1er août).
 *
 * Ligne absente ou illisible -> `en_cours`. On SAIT qu'il y a eu
 * conflit, donc une ligne existe : ne pas pouvoir la lire est le cas où
 * on ne sait pas, et rejouer une vente coûte plus cher que la retarder.
 */
export function lireVerrou(
  ligne: LigneDeVerrou | null | undefined,
  maintenant: number,
): VerdictVerrou {
  if (!ligne) return { action: "en_cours" };

  const statut = String(ligne.status ?? "").trim().toLowerCase();
  if (statut === "processed") return { action: "doublon" };

  // Tout autre statut que `processing` est SORTI de l'index : la ligne
  // ne peut pas nous avoir bloqués, donc on ne sait pas ce qu'on lit.
  if (statut !== "processing") return { action: "en_cours" };

  const depuis = ligne.received_at ? Date.parse(ligne.received_at) : Number.NaN;
  // Un horodatage illisible se traite comme un traitement mort : mieux
  // vaut reprendre une vente que la laisser bloquée pour toujours.
  const mort = !Number.isFinite(depuis) || maintenant - depuis > REPRISE_APRES_MS;
  return mort ? { action: "traiter" } : { action: "en_cours" };
}
