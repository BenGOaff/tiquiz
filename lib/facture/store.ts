// lib/facture/store.ts
//
// LIRE ET ÉCRIRE. AUCUNE DÉCISION ICI.
//
// Tout ce qui se décide (le taux, ce qui manque, la série, les montants)
// vit dans `tva.ts`, `identite.ts` et `construire.ts`, qui n'importent
// rien et se testent. Ce fichier importe `supabaseAdmin`, donc il exige
// des variables d'environnement au chargement, donc aucun test ne peut
// l'importer : c'est exactement pour ça qu'il ne doit rien décider.
// (Leçon du verrou des webhooks, 24 août : la décision était enfermée
// dans le module qui parle à la base, et c'est littéralement là que le
// bug s'était installé.)
//
// LE REPLI SUR UNE COLONNE ABSENTE
// ---------------------------------
// Si la migration n'est pas encore passée en production, PostgREST
// répond une erreur sur la table entière. On JOURNALISE fort et on rend
// null : une facture manquante se rattrape, un paiement refusé parce
// qu'une table manque, non. C'est la leçon des 15 jours de statistiques
// perdues (`quiz_events.meta`) prise dans l'autre sens : ici, ne jamais
// faire échouer l'encaissement pour un problème de facturation.

import "server-only";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ACHETEUR_VIDE, fusionnerAcheteur, lireAcheteur, type Acheteur } from "@/lib/facture/identite";
import type { FactureAEmettre } from "@/lib/facture/construire";

export const TABLE_CLIENTS = "facturation_clients";
export const TABLE_FACTURES = "factures";

export type SourceMaj = "client" | "admin" | "checkout" | "stripe" | "paypal";

export interface LigneFacture {
  id: string;
  numero: string;
  genre: "facture" | "avoir";
  provider: string;
  sale_ref: string | null;
  product_id: string | null;
  libelle: string;
  currency: string;
  total_cents: number;
  ht_cents: number;
  tva_cents: number;
  tva_taux_bp: number;
  tva_mention: string | null;
  acheteur: unknown;
  vendeur: unknown;
  a_completer: string[] | null;
  paid_at: string | null;
  issued_at: string;
  email_cle: string;
  avoir_de: string | null;
}

const cle = (email: string | null | undefined) => String(email ?? "").trim().toLowerCase();

/**
 * Les infos de facturation d'une personne.
 *
 * On cherche par `user_id` EN PREMIER : quelqu'un qui change l'adresse
 * de son compte doit garder ses infos. L'adresse ne sert que de repli,
 * pour le cas où la facturation a été écrite avant que le compte existe
 * (un paiement PayPal ouvre le compte après coup).
 */
export async function lireFacturation(args: {
  userId?: string | null;
  email?: string | null;
}): Promise<Acheteur | null> {
  const champs = "email, prenom, nom, societe, tva_numero, adresse1, adresse2, code_postal, ville, pays";
  try {
    if (args.userId) {
      const { data } = await supabaseAdmin
        .from(TABLE_CLIENTS).select(champs).eq("user_id", args.userId).maybeSingle();
      if (data) return lireAcheteur(data);
    }
    const email = cle(args.email);
    if (!email) return null;
    const { data } = await supabaseAdmin
      .from(TABLE_CLIENTS).select(champs).eq("email_cle", email).maybeSingle();
    return data ? lireAcheteur(data) : null;
  } catch (e) {
    console.error("[facture] lecture facturation impossible :", (e as Error).message);
    return null;
  }
}

/**
 * Écrit les infos de facturation.
 *
 * `source` est OBLIGATOIRE, et ce n'est pas de la décoration : le jour
 * où une adresse est fausse, la première question est "qui l'a écrite".
 * Sans la réponse, on cherche dans trois chemins au lieu d'un.
 */
export async function ecrireFacturation(args: {
  email: string;
  userId?: string | null;
  acheteur: Acheteur;
  source: SourceMaj;
}): Promise<{ ok: boolean; reason?: string }> {
  const email_cle = cle(args.email);
  if (!email_cle) return { ok: false, reason: "email_manquant" };
  const a = args.acheteur;
  try {
    const { error } = await supabaseAdmin.from(TABLE_CLIENTS).upsert(
      {
        email_cle,
        user_id: args.userId ?? null,
        email: a.email ?? args.email,
        prenom: a.prenom, nom: a.nom, societe: a.societe, tva_numero: a.tvaNumero,
        adresse1: a.adresse1, adresse2: a.adresse2,
        code_postal: a.codePostal, ville: a.ville, pays: a.pays,
        maj_par: args.source,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email_cle" },
    );
    if (error) {
      console.error("[facture] ecriture facturation refusee :", error.message);
      return { ok: false, reason: "base" };
    }
    return { ok: true };
  } catch (e) {
    console.error("[facture] ecriture facturation impossible :", (e as Error).message);
    return { ok: false, reason: "reseau" };
  }
}

/**
 * Complète sans effacer.
 *
 * Sert aux sources AUTOMATIQUES (le formulaire Stripe, le bon de
 * commande) : elles apportent ce qu'elles savent, elles ne suppriment
 * jamais ce qu'une personne a saisi à la main. Un client qui a écrit sa
 * société dans ses réglages ne doit pas la perdre au paiement suivant.
 */
export async function completerFacturation(args: {
  email: string;
  userId?: string | null;
  acheteur: Acheteur;
  source: SourceMaj;
}): Promise<{ ok: boolean; reason?: string }> {
  const ancien = await lireFacturation({ userId: args.userId, email: args.email });
  return ecrireFacturation({
    ...args,
    acheteur: fusionnerAcheteur(ancien, args.acheteur),
  });
}

/**
 * ÉMET, ET NE LÈVE JAMAIS.
 *
 * La fonction SQL `emettre_facture` alloue le numéro et insère dans la
 * MÊME transaction (sinon un échec laisse un trou dans la numérotation),
 * et rend la facture déjà émise sur un doublon au lieu d'échouer (un
 * webhook rejoué doit répondre 200 sans consommer un numéro).
 */
export async function emettreFacture(
  f: FactureAEmettre,
  avoirDe?: string | null,
): Promise<LigneFacture | null> {
  try {
    const { data, error } = await supabaseAdmin.rpc("emettre_facture", {
      p_serie: f.serie,
      p_genre: f.genre,
      p_user_id: f.userId,
      p_email_cle: f.emailCle,
      p_provider: f.provider,
      p_sale_ref: f.saleRef,
      p_product_id: f.productId,
      p_libelle: f.libelle,
      p_currency: f.currency,
      p_total_cents: f.totalCents,
      p_ht_cents: f.htCents,
      p_tva_cents: f.tvaCents,
      p_tva_taux_bp: f.tvaTauxBp,
      p_tva_mention: f.tvaMention,
      p_acheteur: f.acheteur,
      p_vendeur: f.vendeur,
      p_a_completer: f.aCompleter,
      p_paid_at: f.paidAt,
      p_avoir_de: avoirDe ?? null,
    });
    if (error) {
      // On CRIE : une vente encaissée sans facture est un problème
      // comptable, même si le client a bien son accès.
      console.error(
        `[facture] EMISSION IMPOSSIBLE pour ${f.provider}:${f.saleRef ?? "-"} (${f.emailCle}) : ${error.message}`,
      );
      return null;
    }
    return (Array.isArray(data) ? data[0] : data) as LigneFacture | null;
  } catch (e) {
    console.error("[facture] emission impossible :", (e as Error).message);
    return null;
  }
}

/** Les factures d'une personne, la plus récente d'abord. */
export async function facturesDe(email: string): Promise<LigneFacture[]> {
  const email_cle = cle(email);
  if (!email_cle) return [];
  try {
    const { data, error } = await supabaseAdmin
      .from(TABLE_FACTURES)
      .select("*")
      .eq("email_cle", email_cle)
      .order("issued_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error("[facture] lecture des factures refusee :", error.message);
      return [];
    }
    return (data ?? []) as LigneFacture[];
  } catch (e) {
    console.error("[facture] lecture des factures impossible :", (e as Error).message);
    return [];
  }
}

/**
 * La facture émise pour un encaissement donné.
 *
 * Sert à l'avoir : il doit porter la MÊME identité que la facture qu'il
 * annule, même si le client a déménagé depuis. Lire l'adresse courante
 * ferait un avoir qui ne correspond à rien.
 */
export async function factureDeLaVente(
  provider: string,
  saleRef: string,
): Promise<LigneFacture | null> {
  const ref = String(saleRef ?? "").trim();
  if (!ref) return null;
  try {
    const { data } = await supabaseAdmin
      .from(TABLE_FACTURES)
      .select("*")
      .eq("provider", provider)
      .eq("sale_ref", ref)
      .eq("genre", "facture")
      .maybeSingle();
    return (data as LigneFacture) ?? null;
  } catch (e) {
    console.error("[facture] lecture par vente impossible :", (e as Error).message);
    return null;
  }
}

/** Une facture par son numéro, pour la page imprimable. */
export async function factureParNumero(numero: string): Promise<LigneFacture | null> {
  const n = String(numero ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9-]{4,32}$/.test(n)) return null;
  try {
    const { data } = await supabaseAdmin
      .from(TABLE_FACTURES).select("*").eq("numero", n).maybeSingle();
    return (data as LigneFacture) ?? null;
  } catch (e) {
    console.error("[facture] lecture par numero impossible :", (e as Error).message);
    return null;
  }
}

export { ACHETEUR_VIDE };
