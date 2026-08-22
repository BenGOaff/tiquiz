// lib/affiliate/ownerSale.ts
//
// UNE VENTE ENCAISSÉE CHEZ NOUS PAIE SON AFFILIÉE.
//
// -- LE TROU QUE CE FICHIER BOUCHE -------------------------------------
//
// Le webhook Systeme.io de Tiquiz remonte bien ses ventes à Tipote, qui
// centralise les commissions (`app/api/systeme-io/webhook/route.ts`,
// bloc "Attribution affiliée"). Notre propre bon de commande, lui,
// n'appelait rien du tout. On avait déplacé la VENTE sans déplacer la
// COMMISSION.
//
// Le symptôme, c'est l'absence de symptôme : la page s'affiche, la carte
// passe, le plan s'ouvre, l'argent arrive. Seule l'affiliée voit qu'il
// ne se passe rien chez elle, et elle ne peut rien prouver.
//
// -- LA SOURCE DE VÉRITÉ EST CHEZ TIPOTE, ET C'EST VOULU ---------------
//
// `affiliates`, `affiliate_conversions` et `affiliate_commissions`
// vivent sur le Supabase de Tipote : c'est ce que lit le tableau de bord
// des affiliées (`affiliate.tipote.com`). Écrire une deuxième table ici
// donnerait deux comptes différents pour le même argent.
//
// -- APRÈS LE PLAN, ET JAMAIS AVANT ------------------------------------
//
// Cette fonction ne jette jamais et ne bloque rien. Une commission qui
// échoue ne doit pas priver un acheteur de ce qu'il a payé. Les échecs
// sont journalisés FORT : c'est de l'argent dû à quelqu'un.
//
// Le module jumeau côté Atelier (`formaquiz`) fait la même chose en
// écrivant directement dans SA base : toute correction ici se regarde
// là-bas, et réciproquement.

import "server-only";

import { commissionBaseCents } from "@/lib/checkout/commissionBase";
import { readSa } from "./sa";

/** L'endroit où Tipote centralise les commissions. */
const ENDPOINT_PAR_DEFAUT = "https://app.tipote.com/api/affiliate/attribute-sale";

export interface VenteACommissionner {
  email: string | null;
  /** L'identifiant du paiement chez Stripe. Clé d'idempotence. */
  reference: string | null;
  /** Le `sa` transporté depuis le lien d'affiliation, s'il y en avait un. */
  affiliateRef: string | null;
  /** Ce qui a été encaissé, TVA comprise. */
  amountTotalCents: number;
  /** La TVA comprise dedans, telle que Stripe la calcule. */
  amountTaxCents: number;
  product: { id: string; label: string };
}

export async function commissionnerVente(vente: VenteACommissionner): Promise<void> {
  try {
    const secret = process.env.AFFILIATE_INTERNAL_SECRET?.trim();
    if (!secret) {
      // L'ABSENCE FERME, mais elle ne se tait pas : sans ce secret,
      // AUCUNE vente ne paie personne, et rien d'autre ne le dirait.
      console.error(
        "[commission] AFFILIATE_INTERNAL_SECRET absente du serveur Tiquiz : " +
          "aucune commission ne peut etre creee.",
      );
      return;
    }

    const email = (vente.email ?? "").trim();
    const reference = (vente.reference ?? "").trim();
    if (!email || !reference) {
      console.error(
        `[commission] vente sans ${!email ? "adresse" : "reference"} : aucune commission possible.`,
      );
      return;
    }

    const base = commissionBaseCents(vente.amountTotalCents, vente.amountTaxCents);
    if (base <= 0) {
      // On a l'adresse ET la reference : un montant a zero veut dire
      // qu'on a perdu la somme en route, pas qu'il n'y avait rien a
      // payer. Se taire rendrait la perte introuvable.
      console.error(
        `[commission] vente ${reference} sans montant exploitable ` +
          `(encaisse ${vente.amountTotalCents} c, taxe ${vente.amountTaxCents} c) : aucune commission.`,
      );
      return;
    }

    // Prefixe : ce n'est PAS un numero de commande Systeme.io, et deux
    // numerotations independantes finissent par se percuter sur la
    // contrainte d'unicite (source_app, sio_order_id). La deuxieme vente
    // serait alors silencieusement traitee comme un doublon.
    const ref = `stripe:${reference}`;

    const url = process.env.TIPOTE_AFFILIATE_ENDPOINT?.trim() || ENDPOINT_PAR_DEFAUT;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Affiliate-Secret": secret },
      body: JSON.stringify({
        customer_email: email,
        sale_amount_cents: base,
        currency: "EUR",
        source_app: "tiquiz",
        sio_order_id: ref,
        // `null` est le cas COURANT : sans lien d'affiliation,
        // l'attribution retombe sur la conversion par email.
        affiliate_ref: readSa(vente.affiliateRef),
        product_name: vente.product.label,
        sale_at: new Date().toISOString(),
        raw_payload: { source: "stripe_checkout", product: vente.product.id, reference },
      }),
    });

    if (!res.ok) {
      const corps = await res.text().catch(() => "");
      console.error(
        `[commission] Tipote a refuse (${res.status}) sur ${ref} : ${corps.slice(0, 200)}`,
      );
      return;
    }

    const json = (await res.json().catch(() => ({}))) as {
      result?: { status?: string; commission_cents?: number; sa?: string };
    };
    const r = json.result ?? {};
    if (r.status === "attributed") {
      console.log(
        `[commission] ${r.commission_cents} c pour ${r.sa} sur ${ref} ` +
          `(base ${base} c, encaisse ${vente.amountTotalCents} c, taxe ${vente.amountTaxCents} c)`,
      );
      return;
    }
    // Les autres cas sont normaux et frequents (pas d'affilie, doublon,
    // affilie inconnu). On les trace quand meme : le jour ou une affiliee
    // dit "je n'ai pas ete payee", c'est cette ligne qui repond.
    console.log(`[commission] ${r.status ?? "reponse illisible"} sur ${ref}`);
  } catch (e) {
    console.error(
      `[commission] attribution impossible : ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}
