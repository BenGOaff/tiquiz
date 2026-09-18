// lib/ventes/identiteStore.ts
//
// ON ÉCRIT CE QUE LE WEBHOOK A IDENTIFIÉ, ET ON LE RELIT.
//
// Ce module ne DÉCIDE rien : les décisions vivent dans
// `lib/ventes/identite.ts`, pur et testé. Ici il n'y a que des
// écritures et des lectures, et la règle habituelle de ce dépôt :
//
// **AUCUNE DE CES FONCTIONS NE JETTE.** Une fiche d'identité qui ne
// s'écrit pas ne doit pas faire échouer un webhook qui vient d'ouvrir
// l'accès de quelqu'un qui a payé. On CRIE, par contre : la fiche est
// ce qui répond à "est-ce qu'un affilié a perdu sa com ?", et une trace
// manquante se remarque le jour où on en a besoin, c'est à dire trop
// tard.
//
// Et une table absente ne prive de RIEN : tant que la migration
// `20260918_ventes_identite.sql` n'est pas passée, l'écriture échoue en
// disant quoi appliquer, la lecture rend vide, et les écrans retombent
// sur leurs replis (l'abonnement, puis le montant). C'est le
// comportement voulu : un déploiement en avance sur sa migration ne
// casse pas l'encaissement.

import "server-only";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  cleIdentite,
  type IdentiteVente,
  type OrigineVente,
  type StatutCommission,
} from "@/lib/ventes/identite";

const TABLE = "ventes_identite";

/** Les trois origines qu'on accepte de relire. Le reste est `inconnue`. */
const ORIGINES: ReadonlySet<string> = new Set([
  "bon_de_commande",
  "hors_bon_de_commande",
  "inconnue",
]);

/** Les statuts qu'on accepte de relire. Le reste est `reponse_inconnue`. */
const STATUTS: ReadonlySet<string> = new Set<StatutCommission>([
  "attribuee",
  "aucun_affilie",
  "affilie_inconnu",
  "doublon",
  "reglee_ailleurs",
  "en_attente",
  "non_tentee",
  "reponse_inconnue",
]);

export interface FicheAEcrire {
  provider: "stripe" | "paypal";
  reference: string;
  email?: string | null;
  nom?: string | null;
  subscriptionId?: string | null;
  productId?: string | null;
  productLabel?: string | null;
  origine: OrigineVente;
  affiliateRef?: string | null;
  affiliateCode?: string | null;
  paidAt?: string | null;
}

export interface VerdictAEcrire {
  statut: StatutCommission;
  cents?: number | null;
  affilie?: string | null;
  detail?: string | null;
  baseHtCents?: number | null;
}

/**
 * Écrit (ou met à jour) la fiche d'un encaissement.
 *
 * `upsert` sur `(provider, reference)` : un webhook rejoué met sa fiche à
 * jour au lieu d'en créer une deuxième. Deux fiches pour un encaissement
 * donneraient deux réponses à la question de la commission, et c'est
 * précisément la question qu'on veut pouvoir poser une seule fois.
 *
 * ON N'ÉCRASE PAS AVEC DU VIDE. Un champ absent de l'appel n'est pas
 * envoyé : un deuxième passage qui ne connaît pas l'affilié ne doit pas
 * effacer celui que le premier avait trouvé. C'est la leçon de
 * `rememberStripeCustomer` (22 août), transposée.
 */
export async function ecrireFiche(
  fiche: FicheAEcrire,
  verdict?: VerdictAEcrire | null,
): Promise<{ ok: boolean; reason?: string }> {
  const reference = String(fiche.reference ?? "").trim();
  if (!reference) return { ok: false, reason: "no_reference" };

  const ligne: Record<string, unknown> = {
    provider: fiche.provider,
    reference,
    origine: fiche.origine,
  };
  poser(ligne, "email", bas(fiche.email));
  poser(ligne, "nom", net(fiche.nom));
  poser(ligne, "subscription_id", net(fiche.subscriptionId));
  poser(ligne, "product_id", net(fiche.productId));
  poser(ligne, "product_label", net(fiche.productLabel));
  poser(ligne, "affiliate_ref", net(fiche.affiliateRef));
  poser(ligne, "affiliate_code", bas(fiche.affiliateCode));
  poser(ligne, "paid_at", net(fiche.paidAt));

  if (verdict) {
    ligne.commission_statut = verdict.statut;
    poser(ligne, "commission_cents", nombre(verdict.cents));
    poser(ligne, "commission_affilie", net(verdict.affilie));
    poser(ligne, "commission_detail", net(verdict.detail));
    poser(ligne, "base_ht_cents", nombre(verdict.baseHtCents));
  }
  ligne.updated_at = new Date().toISOString();

  try {
    const { error } = await supabaseAdmin
      .from(TABLE)
      .upsert(ligne, { onConflict: "provider,reference" });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(
      `[ventes/identite] fiche NON ecrite pour ${fiche.provider}:${reference} : ${message}. ` +
        `Si la table est absente, appliquer supabase/migrations/20260918_ventes_identite.sql. ` +
        `Sans elle, le tableau de bord ne saura pas dire si un affilie a ete paye sur cette vente.`,
    );
    return { ok: false, reason: "write_failed" };
  }
}

/**
 * Complète la fiche d'un encaissement avec le verdict de sa commission.
 *
 * SÉPARÉ de `ecrireFiche` parce que les deux moments sont différents :
 * on identifie AVANT d'appeler Tipote (donc avant de savoir), et le
 * rejeu du filet (11 septembre) repasse des jours plus tard, quand la
 * fiche existe déjà. Un seul appel obligerait le rejeu à reconstruire
 * une identité qu'il n'a pas.
 */
export async function ecrireVerdictCommission(
  provider: string,
  reference: string,
  verdict: VerdictAEcrire,
): Promise<{ ok: boolean; reason?: string }> {
  const ref = String(reference ?? "").trim();
  const p = String(provider ?? "").trim();
  if (!ref || !p) return { ok: false, reason: "no_reference" };

  const ligne: Record<string, unknown> = {
    commission_statut: verdict.statut,
    updated_at: new Date().toISOString(),
  };
  poser(ligne, "commission_cents", nombre(verdict.cents));
  poser(ligne, "commission_affilie", net(verdict.affilie));
  poser(ligne, "commission_detail", net(verdict.detail));
  poser(ligne, "base_ht_cents", nombre(verdict.baseHtCents));

  try {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update(ligne)
      .eq("provider", p)
      .eq("reference", ref)
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) {
      // Pas de fiche : ce n'est pas une panne, c'est un encaissement
      // d'avant la table, ou une identification qui a raté. On le dit
      // sans crier, le verdict n'est pas perdu (il est dans le journal
      // du serveur, et le script d'audit le retrouve chez Tipote).
      return { ok: false, reason: "no_fiche" };
    }
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(
      `[ventes/identite] verdict de commission NON ecrit pour ${p}:${ref} : ${message}`,
    );
    return { ok: false, reason: "write_failed" };
  }
}

/**
 * Les fiches des encaissements, par `cleIdentite`.
 *
 * `debut` / `fin` bornent sur `paid_at`, mais une fiche SANS `paid_at`
 * est toujours rendue : l'écran la rapproche par sa clé, et l'écarter
 * sur une date manquante ferait disparaître l'identité d'une vente bien
 * présente dans la liste.
 *
 * Une lecture impossible rend `{ lisible: false }`, jamais un objet
 * vide : "je n'ai pas pu regarder" n'est pas "il n'y a rien" (règle du
 * 11 septembre, le registre qui répond 503).
 */
export async function lireFiches(args: {
  debut?: string | null;
  fin?: string | null;
  limite?: number;
}): Promise<{ lisible: boolean; fiches: Record<string, IdentiteVente> }> {
  try {
    let q = supabaseAdmin
      .from(TABLE)
      .select(
        "provider, reference, email, nom, subscription_id, product_id, product_label, " +
          "origine, affiliate_ref, affiliate_code, commission_statut, commission_cents, " +
          "commission_affilie, commission_detail, paid_at",
      )
      .order("paid_at", { ascending: false, nullsFirst: false })
      .limit(Math.max(1, Math.min(5000, args.limite ?? 3000)));

    // `or` et pas deux `gte`/`lte` : il faut que les fiches sans date
    // passent, et un `gte` seul les écarterait toutes.
    if (args.debut) q = q.or(`paid_at.gte.${args.debut},paid_at.is.null`);
    if (args.fin) q = q.or(`paid_at.lte.${args.fin},paid_at.is.null`);

    const { data, error } = await q;
    if (error) throw error;

    const fiches: Record<string, IdentiteVente> = {};
    for (const brut of (data ?? []) as unknown as Record<string, unknown>[]) {
      const provider = String(brut.provider ?? "").trim();
      const reference = String(brut.reference ?? "").trim();
      if (!provider || !reference) continue;
      fiches[cleIdentite(provider, reference)] = relire(provider, reference, brut);
    }
    return { lisible: true, fiches };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(
      `[ventes/identite] fiches illisibles (${message}). ` +
        `Si la table est absente, appliquer supabase/migrations/20260918_ventes_identite.sql.`,
    );
    return { lisible: false, fiches: {} };
  }
}

/** Une ligne de base, relue dans les types bornés du module pur. */
function relire(
  provider: string,
  reference: string,
  brut: Record<string, unknown>,
): IdentiteVente {
  const origineBrute = String(brut.origine ?? "").trim();
  const statutBrut = String(brut.commission_statut ?? "").trim();
  return {
    provider,
    reference,
    email: net(brut.email as string | null),
    nom: net(brut.nom as string | null),
    productId: net(brut.product_id as string | null),
    productLabel: net(brut.product_label as string | null),
    subscriptionId: net(brut.subscription_id as string | null),
    // UNE VALEUR QU'ON NE CONNAÎT PAS RETOMBE SUR `inconnue`, jamais sur
    // `bon_de_commande` : c'est le repli qui ne fait croire à rien.
    origine: (ORIGINES.has(origineBrute) ? origineBrute : "inconnue") as OrigineVente,
    affiliateRef: net(brut.affiliate_ref as string | null),
    affiliateCode: net(brut.affiliate_code as string | null),
    commission: statutBrut
      ? {
          statut: (STATUTS.has(statutBrut) ? statutBrut : "reponse_inconnue") as StatutCommission,
          cents: nombre(brut.commission_cents),
          affilie: net(brut.commission_affilie as string | null),
          detail: net(brut.commission_detail as string | null),
        }
      : null,
  };
}

function poser(cible: Record<string, unknown>, cle: string, valeur: unknown): void {
  if (valeur != null) cible[cle] = valeur;
}
function net(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
}
function bas(v: unknown): string | null {
  return net(v)?.toLowerCase() ?? null;
}
function nombre(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
