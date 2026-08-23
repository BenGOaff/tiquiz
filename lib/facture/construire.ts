// lib/facture/construire.ts
//
// D'UNE VENTE À UNE FACTURE, ET RIEN D'AUTRE.
//
// Ce module ne parle ni à Supabase ni à PayPal : il prend ce qu'on a
// encaissé et l'identité de l'acheteur, et il rend exactement ce qui
// doit être écrit. C'est la règle du dépôt depuis le 1er août : une
// logique enfermée dans une route n'est pas testable, donc elle n'est
// pas testée, donc c'est là que les bugs s'installent. Ici, il s'agit
// d'argent et de mentions légales.
//
// LA SÉRIE EST L'ANNÉE DU PAIEMENT, PAS L'ANNÉE COURANTE.
// Un webhook rejoué le 2 janvier pour un encaissement du 31 décembre
// doit tomber dans la série de décembre, sinon la numérotation n'est
// plus chronologique.

import {
  ACHETEUR_VIDE,
  manques,
  vendeur,
  type Acheteur,
  type Vendeur,
} from "@/lib/facture/identite";
import { decomposerTTC, resoudreTva } from "@/lib/facture/tva";

export type FactureGenre = "facture" | "avoir";
export type FactureProvider = "paypal" | "stripe" | "manuel";

/** Ce qu'on sait de l'encaissement au moment d'émettre. */
export interface VenteAFacturer {
  provider: FactureProvider;
  /** L'identifiant de l'encaissement chez le fournisseur. Clé d'idempotence. */
  saleRef: string | null;
  productId: string | null;
  libelle: string;
  currency: string;
  /** TTC, en centimes. Le prix de Béné est TTC (décision du 12 août). */
  totalCents: number;
  /** ISO 8601. Décide la série. */
  paidAt: string;
  emailCle: string;
  userId?: string | null;
}

export interface FactureAEmettre {
  serie: string;
  genre: FactureGenre;
  provider: FactureProvider;
  saleRef: string | null;
  productId: string | null;
  libelle: string;
  currency: string;
  totalCents: number;
  htCents: number;
  tvaCents: number;
  tvaTauxBp: number;
  tvaMention: string | null;
  acheteur: Acheteur;
  vendeur: Vendeur;
  aCompleter: string[];
  paidAt: string;
  emailCle: string;
  userId: string | null;
}

/** "TQ-2026". Le préfixe ne bouge jamais : il est dans le numéro émis. */
export const PREFIXE_SERIE = "TQ";

export function serieDe(paidAtIso: string): string {
  const d = new Date(paidAtIso);
  const annee = Number.isNaN(d.getTime()) ? new Date().getUTCFullYear() : d.getUTCFullYear();
  return `${PREFIXE_SERIE}-${annee}`;
}

/**
 * Construit la facture. `genre` est un PARAMÈTRE OBLIGATOIRE.
 *
 * Un avoir n'est pas une facture avec un signe moins deviné du contexte :
 * c'est une pièce différente, qui référence la facture qu'elle annule.
 * Le déduire d'un montant négatif marcherait jusqu'au premier
 * remboursement partiel.
 */
export function construireFacture(
  genre: FactureGenre,
  vente: VenteAFacturer,
  acheteurBrut: Acheteur | null | undefined,
): FactureAEmettre {
  const acheteur = acheteurBrut ?? ACHETEUR_VIDE;
  const tva = resoudreTva({ pays: acheteur.pays, numeroTva: acheteur.tvaNumero });
  const signe = genre === "avoir" ? -1 : 1;
  const m = decomposerTTC(Math.abs(vente.totalCents), tva.tauxBp);

  return {
    serie: serieDe(vente.paidAt),
    genre,
    provider: vente.provider,
    saleRef: vente.saleRef,
    productId: vente.productId,
    libelle: vente.libelle,
    currency: (vente.currency || "eur").toLowerCase(),
    totalCents: signe * m.totalCents,
    htCents: signe * m.htCents,
    tvaCents: signe * m.tvaCents,
    tvaTauxBp: m.tauxBp,
    tvaMention: tva.mention,
    acheteur,
    vendeur: vendeur(),
    // Les deux listes se cumulent : ce qui manque dans l'identité, et ce
    // que la TVA laisse en suspens (pays supposé, numéro à valider).
    aCompleter: [...new Set([...manques(acheteur), ...tva.aCompleter])],
    paidAt: vente.paidAt,
    emailCle: vente.emailCle.trim().toLowerCase(),
    userId: vente.userId ?? null,
  };
}

/** Le montant formaté, dans la devise de la facture. */
export function formatMontant(cents: number, currency = "eur", locale = "fr-FR"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: (currency || "eur").toUpperCase(),
  }).format((Number(cents) || 0) / 100);
}
