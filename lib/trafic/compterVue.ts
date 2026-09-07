// lib/trafic/compterVue.ts
//
// L'ÉCRITURE, ET RIEN D'AUTRE.
//
// Ce module importe `supabaseAdmin`, donc aucun test ne peut le charger
// (il exige ses variables au chargement). C'est exactement pour ça qu'il
// ne porte AUCUNE décision : ce qui compte comme une vue, le chemin
// retenu et la source vivent dans `vueASignaler.ts`, pur et testé.
//
// C'est la règle du 1er août, et c'est aussi le piège qui avait caché le
// verrou des webhooks pendant deux mois : une décision enfermée dans un
// module qu'aucun test ne peut importer est une décision qui dérive.

import "server-only";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Le jour au format `YYYY-MM-DD`, en UTC. */
function jourUtc(maintenant: Date): string {
  return maintenant.toISOString().slice(0, 10);
}

/**
 * Incrémente le compteur d'UNE vue. Ne lève jamais.
 *
 * L'incrément se fait DANS Postgres (`compter_vue_trafic`) : lire puis
 * réécrire depuis ici perdrait une vue sur deux dès que deux visiteurs
 * arrivent en même temps sur la même page.
 */
export async function compterVue(args: {
  hote: string;
  chemin: string;
  source: string;
  /** Paramètre, jamais `new Date()` à l'intérieur : un test qui dépend de l'horloge clignote. */
  maintenant?: Date;
}): Promise<void> {
  try {
    const { error } = await supabaseAdmin.rpc("compter_vue_trafic", {
      p_jour: jourUtc(args.maintenant ?? new Date()),
      p_hote: args.hote,
      p_chemin: args.chemin,
      p_source: args.source,
    });
    if (error) {
      // On CRIE, on ne se tait pas : une migration pas encore passée
      // rendrait le compteur muet, et l'écran afficherait un trafic à
      // zéro sans que personne ne sache pourquoi.
      console.error("[trafic] vue non comptee :", error.message);
    }
  } catch (e) {
    console.error("[trafic] vue non comptee :", e instanceof Error ? e.message : e);
  }
}
