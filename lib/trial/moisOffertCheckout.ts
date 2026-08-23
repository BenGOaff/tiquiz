// lib/trial/moisOffertCheckout.ts
//
// LE MOIS OFFERT, POSÉ SUR LE BON DE COMMANDE.
//
// La DÉCISION vit dans `moisOffert.ts`, pure et testée. Ici, les deux
// gestes qui l'entourent :
//   - avant le paiement : ce checkout mérite-t-il 30 jours gratuits ?
//   - après le paiement : marquer que cette personne a eu le sien.
//
// -- CE QU'ON SAIT, ET QUAND ------------------------------------------
//
// Sur le bon de commande Stripe, l'adresse est saisie DANS le formulaire
// de Stripe : on ne la connaît pas avant que le paiement soit ouvert.
// On ne peut donc pas toujours vérifier "a-t-elle déjà eu son mois"
// AVANT. Trois cas, et ils sont traités différemment :
//
//   1. elle est connectée -> on connaît son adresse, contrôle complet ;
//   2. elle donne son adresse (PayPal) -> contrôle complet ;
//   3. anonyme -> on accorde, et on VÉRIFIE APRÈS.
//
// Le cas 3 n'est pas un trou : c'est le cas d'une nouvelle personne,
// donc celui où l'essai est légitime. Et s'il s'avère après coup
// qu'elle avait déjà eu son mois, la ligne remonte dans l'admin avec le
// motif. On ne reprend rien : reprendre un essai déjà commencé, c'est
// prélever quelqu'un qui ne s'y attend pas.

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createHash } from "node:crypto";

import {
  JOURS_MOIS_OFFERT_ANNONCE,
  verdictMoisOffert,
  type MotifRefus,
  type MotifSuspect,
} from "@/lib/trial/moisOffert";
import { proprietaireDuLien } from "@/lib/trial/proprietaireDuLien";

/** La durée du cadeau. Le nombre vit dans le module pur : c'est LUI
 *  que le bon de commande annonce, et deux nombres écrits séparément
 *  finissent toujours par diverger. */
export const JOURS_MOIS_OFFERT = JOURS_MOIS_OFFERT_ANNONCE;

/**
 * L'empreinte d'une adresse IP, jamais l'adresse.
 *
 * Même approche que `affiliate_clicks.ip_hash` côté Tipote depuis mai :
 * on compare des empreintes pour repérer un tricheur, on ne stocke pas
 * de donnée personnelle. Sans sel, une empreinte d'IP se retrouve par
 * force brute (il n'y a que quatre milliards d'adresses).
 */
export function empreinteIp(ip: string | null | undefined): string | null {
  const v = String(ip ?? "").trim();
  if (!v) return null;
  const sel = (process.env.AFFILIATE_INTERNAL_SECRET ?? "").trim();
  if (!sel) return null;
  return createHash("sha256").update(`${sel}:${v}`).digest("hex").slice(0, 32);
}

export interface EssaiDeCeCheckout {
  /** 0 = pas d'essai. 30 = le mois offert. */
  jours: number;
  /** Pourquoi il n'y en a pas, pour le journal. */
  motif?: MotifRefus | "pas_de_lien" | "lien_ancien" | "registre_injoignable";
  /** Accordé, mais quelque chose sent l'auto-affiliation. */
  signale?: MotifSuspect;
}

const SANS_ESSAI = (motif: EssaiDeCeCheckout["motif"]): EssaiDeCeCheckout => ({ jours: 0, motif });

/**
 * Ce bon de commande ouvre-t-il un essai de 30 jours ?
 *
 * Ne jette jamais : un cadeau qui échoue ne doit pas empêcher un
 * paiement. En cas de doute, pas d'essai, et le journal le dit.
 */
export async function essaiPourCeCheckout(args: {
  /** Le lien d'affiliation transporté depuis la page de vente. */
  sa: string | null;
  /**
   * Ce lien vient-il du système d'affiliation COURANT ?
   *
   * PARAMÈTRE OBLIGATOIRE, jamais déduit de la présence d'un `sa` : les
   * deux générations de liens portent le même identifiant, donc le
   * deviner reviendrait à offrir le mois sur les anciens liens
   * Systeme.io, ce que Béné a explicitement exclu. Il se lit avec
   * `lienOuvreLeMoisOffert()` (`lib/affiliate/moisOffertLien.ts`).
   */
  lienCourant: boolean;
  /** L'adresse, quand on la connaît déjà (session ouverte, ou PayPal). */
  email?: string | null;
  ip?: string | null;
}): Promise<EssaiDeCeCheckout> {
  const sa = String(args.sa ?? "").trim();
  if (!sa) return SANS_ESSAI("pas_de_lien");
  // Un ancien lien commissionne exactement comme avant : c'est le
  // CADEAU qui est réservé au système courant, pas la vente.
  if (!args.lienCourant) return SANS_ESSAI("lien_ancien");

  try {
    const proprietaire = await proprietaireDuLien(sa);
    if (!proprietaire.connu) {
      // On n'a pas pu vérifier : on n'offre rien. Offrir au nom d'une
      // affiliée non vérifiée ouvrirait la porte au premier identifiant
      // inventé. Un cadeau manqué se rattrape, une fraude non.
      console.error("[mois-offert] registre des affiliees injoignable : aucun essai ouvert.");
      return SANS_ESSAI("registre_injoignable");
    }

    const email = String(args.email ?? "").trim().toLowerCase();
    const empreinte = empreinteIp(args.ip);

    const verdict = verdictMoisOffert({
      email,
      dejaRecuLe: email ? await dejaEuSonMois(email) : null,
      emailAffiliee: proprietaire.email,
      affilieeActive: proprietaire.existe && proprietaire.actif,
      ipHash: empreinte,
      ipsDejaVues: await ipsDuLien(sa),
    });

    if (!verdict.ok) return SANS_ESSAI(verdict.motif);
    return {
      jours: JOURS_MOIS_OFFERT,
      signale: verdict.aVerifier ? verdict.motif : undefined,
    };
  } catch (e) {
    console.error(`[mois-offert] ${e instanceof Error ? e.message : String(e)}`);
    return SANS_ESSAI("registre_injoignable");
  }
}

/**
 * Marque que cette personne a eu son mois offert.
 *
 * Appelé quand l'abonnement s'ouvre, pas quand le checkout part : un
 * bon de commande abandonné ne doit pas consommer le cadeau.
 *
 * Rend le motif quand la personne en avait DÉJÀ eu un : on ne reprend
 * rien (reprendre un essai commencé, c'est prélever quelqu'un qui ne
 * s'y attend pas), mais Béné doit le voir.
 */
export async function marquerMoisOffertConsomme(args: {
  email: string;
  sa: string | null;
  ip?: string | null;
  signale?: MotifSuspect | null;
}): Promise<{ ok: boolean; dejaEu: boolean }> {
  const email = String(args.email ?? "").trim().toLowerCase();
  if (!email.includes("@")) return { ok: false, dejaEu: false };

  try {
    const dejaRecu = await dejaEuSonMois(email);
    const patch = {
      free_month_granted_at: new Date().toISOString(),
      free_month_source: "filleul",
      free_month_sa: args.sa ?? null,
      free_month_ip_hash: empreinteIp(args.ip),
      // Un deuxième mois offert est plus grave qu'une IP partagée : le
      // drapeau dit lequel des deux, jamais les deux mélangés.
      free_month_flag: dejaRecu ? "deja_recu" : (args.signale ?? null),
    };

    const { error } = await supabaseAdmin.from("profiles").update(patch).ilike("email", email);
    if (error) {
      if (/column .* does not exist|schema cache/i.test(error.message)) {
        console.error(
          "[mois-offert] colonnes absentes : migration 20260823_mois_offert.sql a passer. " +
            "L'essai a bien ete ouvert, mais rien ne le trace.",
        );
        return { ok: false, dejaEu: !!dejaRecu };
      }
      console.error(`[mois-offert] marquage impossible pour ${email} : ${error.message}`);
      return { ok: false, dejaEu: !!dejaRecu };
    }
    if (dejaRecu) {
      console.error(
        `[mois-offert] ${email} a eu un DEUXIEME mois offert (lien ${args.sa ?? "?"}) : ` +
          `a regarder dans l'admin.`,
      );
    }
    return { ok: true, dejaEu: !!dejaRecu };
  } catch (e) {
    console.error(`[mois-offert] ${e instanceof Error ? e.message : String(e)}`);
    return { ok: false, dejaEu: false };
  }
}

/** La date de son mois offert, ou `null`. Fail-open : on n'invente rien. */
async function dejaEuSonMois(email: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("free_month_granted_at")
      .ilike("email", email)
      .maybeSingle();
    if (error) return null;
    return (data as { free_month_granted_at?: string | null } | null)?.free_month_granted_at ?? null;
  } catch {
    return null;
  }
}

/**
 * Les empreintes d'IP déjà servies sur CE lien d'affiliation.
 *
 * Une même adresse qui amène plusieurs filleuls au même lien, c'est une
 * personne qui se crée des comptes, pas une affiliée qui travaille.
 * Fail-open : si on ne peut pas lire, on n'invente pas de soupçon.
 */
async function ipsDuLien(sa: string): Promise<string[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("free_month_ip_hash")
      .eq("free_month_sa", sa)
      .not("free_month_ip_hash", "is", null)
      .limit(200);
    if (error) return [];
    return (data ?? [])
      .map((r) => String((r as { free_month_ip_hash?: string }).free_month_ip_hash ?? ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}
