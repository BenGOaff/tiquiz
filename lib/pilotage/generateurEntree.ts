// lib/pilotage/generateurEntree.ts
//
// LA LECTURE DES GÉNÉRATIONS, ET AUCUNE DÉCISION.
//
// Ce module importe `supabaseAdmin`, donc aucun test ne peut le
// charger : tout ce qui décide (les marches, les seuils, le coût) vit
// dans `lib/generateur/entonnoirGenerateur.ts`, pur et testé. C'est la
// règle du 1er août, et c'est aussi la seule façon qu'une page publique
// puisse afficher un chiffre du générateur sans faire lever
// `supabaseAdmin` au chargement.
//
// "JE N'AI PAS PU REGARDER" ET "IL N'Y A RIEN" SONT DEUX RÉPONSES
// DIFFÉRENTES (règle du 23 août) : la migration du 8 septembre peut ne
// pas être passée, et l'écran doit alors dire qu'il n'a pas pu lire, pas
// qu'aucun visiteur n'a généré de quiz.
//
// ── DEUX REQUÊTES, ET LA SECONDE EST BORNÉE ──────────────────────────
//
// Le plan d'un inscrit vit dans `profiles`, pas dans la session. On lit
// donc les sessions, puis les profils des comptes qui ont réclamé un
// quiz, par PAQUETS : un `.in()` part dans l'URL, et une liste d'UUID
// qui grandit avec le succès du générateur finirait par faire refuser
// la requête entière (drame du lot d'affiliés, 31 août).

import "server-only";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { LigneGeneration } from "@/lib/generateur/entonnoirGenerateur";

/** Le plafond de sessions lues sur une période. */
const PLAFOND = 20000;

/** Combien d'identifiants par requête de profils. */
const PAQUET = 100;

export type LectureGenerateur =
  | { lisible: true; generations: LigneGeneration[]; tronquee: boolean }
  | { lisible: false; raison: string };

interface SessionRow {
  source: unknown;
  claimed_by_user_id: unknown;
  modele_ia?: unknown;
  jetons_entree?: unknown;
  jetons_sortie?: unknown;
  duree_ms?: unknown;
}

function entier(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

/**
 * Les plans des comptes qui ont réclamé un quiz.
 *
 * Une erreur ARRÊTE tout : rendre ce qu'on a lu ferait passer des
 * abonnés pour des inscrits gratuits, donc un taux de conversion trop
 * bas affiché comme un fait.
 */
async function lirePlans(ids: string[]): Promise<Map<string, string | null>> {
  const plans = new Map<string, string | null>();
  for (let i = 0; i < ids.length; i += PAQUET) {
    const lot = ids.slice(i, i + PAQUET);
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("user_id, plan")
      .in("user_id", lot);
    if (error) throw new Error(`profils illisibles : ${error.message}`);
    for (const p of (data ?? []) as { user_id?: unknown; plan?: unknown }[]) {
      const id = typeof p.user_id === "string" ? p.user_id : null;
      if (id) plans.set(id, typeof p.plan === "string" ? p.plan : null);
    }
  }
  return plans;
}

export async function lireGenerations(args: {
  /** Bornes en ISO. `null` = pas de borne (période "depuis le début"). */
  debut: string | null;
  fin: string | null;
}): Promise<LectureGenerateur> {
  try {
    // LES COLONNES DE MESURE SONT DEMANDÉES NOMMÉMENT, et c'est ce qui
    // fait que la migration manquante se voit tout de suite :
    // PostgREST rejette le select entier, on rend `lisible: false`, et
    // l'écran nomme le fichier à passer. Un `select("*")` rendrait des
    // lignes sans coût et sans durée, donc un ROI et une médiane
    // silencieusement faux.
    let requete = supabaseAdmin
      .from("embed_quiz_sessions")
      .select("source, claimed_by_user_id, modele_ia, jetons_entree, jetons_sortie, duree_ms")
      .order("created_at", { ascending: false })
      .limit(PLAFOND);
    if (args.debut) requete = requete.gte("created_at", args.debut);
    if (args.fin) requete = requete.lte("created_at", args.fin);
    const { data, error } = await requete;

    if (error) {
      console.error(`[pilotage/generateur] lecture impossible : ${error.message}`);
      return { lisible: false, raison: error.message };
    }

    const lignes = (data ?? []) as SessionRow[];
    const ids = [
      ...new Set(
        lignes
          .map((l) => (typeof l.claimed_by_user_id === "string" ? l.claimed_by_user_id : null))
          .filter((v): v is string => Boolean(v)),
      ),
    ];
    const plans = ids.length > 0 ? await lirePlans(ids) : new Map<string, string | null>();

    const generations: LigneGeneration[] = lignes.map((l) => {
      const compte = typeof l.claimed_by_user_id === "string" ? l.claimed_by_user_id : null;
      return {
        source: typeof l.source === "string" ? l.source : null,
        compte,
        // `undefined` (le compte n'a plus de profil) et `null` (aucun
        // compte) se lisent pareil pour l'entonnoir : ni l'un ni
        // l'autre ne prouve un abonnement.
        plan: compte ? plans.get(compte) ?? null : null,
        modele: typeof l.modele_ia === "string" ? l.modele_ia : null,
        jetonsEntree: entier(l.jetons_entree),
        jetonsSortie: entier(l.jetons_sortie),
        // `null` sur toute ligne d'avant le 9 septembre : la colonne
        // n'existait pas. Ces lignes sont COMPTÉES à part par la
        // médiane, jamais lues comme une génération instantanée.
        dureeMs: entier(l.duree_ms),
      };
    });

    return { lisible: true, generations, tronquee: generations.length >= PLAFOND };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[pilotage/generateur] lecture impossible : ${message}`);
    return { lisible: false, raison: message };
  }
}
