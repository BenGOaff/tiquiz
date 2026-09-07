// lib/pilotage/trafic.ts
//
// LA LECTURE DU TRAFIC, ET AUCUNE DÉCISION.
//
// Ce module importe `supabaseAdmin`, donc aucun test ne peut le charger.
// Tout ce qui décide (l'entonnoir, les classements, le seuil d'un taux)
// vit dans `lib/trafic/entonnoir.ts`, pur et testé.
//
// "JE N'AI PAS PU REGARDER" ET "IL N'Y A RIEN" SONT DEUX RÉPONSES
// DIFFÉRENTES (règle du 23 août). La table peut ne pas exister encore
// (migration pas passée), ou la lecture peut échouer : dans les deux cas
// on rend `lisible: false` avec sa raison, et l'écran le DIT. Rendre
// zéro vue ferait croire à un site désert, ce qui est exactement la
// mauvaise décision à provoquer.

import "server-only";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { LigneTrafic } from "@/lib/trafic/entonnoir";

/** Le plafond de lignes lues. Une ligne = un (jour, hôte, chemin, source). */
const PLAFOND = 20000;

export type LectureTrafic =
  | { lisible: true; lignes: LigneTrafic[]; tronquee: boolean }
  | { lisible: false; raison: string };

/**
 * Les lignes de trafic d'une période.
 *
 * Les bornes sont des jours (`YYYY-MM-DD`) : la colonne est une `date`,
 * pas un horodatage. Comparer une date à un instant ISO ferait perdre
 * le dernier jour de la période.
 */
export async function lireTrafic(args: {
  /** `null` = pas de borne : c'est la periode "Depuis le debut". */
  debutJour: string | null;
  finJour: string | null;
}): Promise<LectureTrafic> {
  try {
    let requete = supabaseAdmin
      .from("trafic_jour")
      .select("jour, chemin, source, vues")
      .order("jour", { ascending: true })
      .limit(PLAFOND);
    // Une borne ABSENTE n'est pas une borne a zero : sur "Depuis le
    // debut", `periode.debut` vaut `null`, et le comparer ferait une
    // requete qui ne rend rien.
    if (args.debutJour) requete = requete.gte("jour", args.debutJour);
    if (args.finJour) requete = requete.lte("jour", args.finJour);
    const { data, error } = await requete;

    if (error) {
      console.error(`[pilotage/trafic] lecture impossible : ${error.message}`);
      // La raison part à l'écran : "la migration n'est pas passée" et
      // "la base ne répond pas" ne se corrigent pas au même endroit.
      return { lisible: false, raison: error.message };
    }

    const lignes: LigneTrafic[] = (data ?? []).map((l) => ({
      jour: String((l as { jour: unknown }).jour ?? "").slice(0, 10),
      chemin: String((l as { chemin: unknown }).chemin ?? ""),
      source: String((l as { source: unknown }).source ?? ""),
      vues: Number((l as { vues: unknown }).vues) || 0,
    }));

    return { lisible: true, lignes, tronquee: lignes.length >= PLAFOND };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[pilotage/trafic] lecture impossible : ${message}`);
    return { lisible: false, raison: message };
  }
}
