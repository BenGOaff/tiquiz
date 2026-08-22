// lib/checkout/commissionBase.ts
//
// SUR QUEL MONTANT ON PAIE UNE AFFILIÉE : LE HT, JAMAIS LE TTC.
//
// C'est la règle appliquée depuis toujours aux ventes Systeme.io : la
// route `/api/affiliate/sio-sale` de l'Atelier passe le montant HT à
// l'attribution, avec le commentaire "Base de commission = HT (règle
// Béné : 70% Atelier / 40% Tiquiz sur le HT)".
//
// Jumeau de `lib/checkout/commissionBase.ts` côté Atelier : toute
// correction ici se porte là-bas, et réciproquement.
//
// -- POURQUOI CE FICHIER EXISTE ----------------------------------------
//
// Notre bon de commande vend en TTC (`tax_behavior: "inclusive"`) : le
// prix affiché ne bouge pas, c'est la part de TVA qui varie selon le
// pays. Stripe renvoie donc `amount_total` (ce que l'acheteuse a payé)
// et `total_details.amount_tax` (la TVA dedans).
//
// Prendre `amount_total` serait invisible et coûteux : sur l'abonnement
// mensuel à 17 € avec 20 % de TVA, 40 % de 17,00 € font 6,80 € au lieu
// de 40 % de 14,17 € qui font 5,67 €. **1,13 € de trop par échéance**,
// versés sans que rien ne le signale, et une différence avec les
// commissions Systeme.io de la même affiliée sur le même produit.
//
// -- CE QUE LA FONCTION REFUSE DE FAIRE --------------------------------
//
// Elle ne devine JAMAIS un taux de TVA. Si Stripe ne dit pas la taxe
// (`automatic_tax` désactivé, pays sans TVA, vente exonérée), la taxe
// vaut zéro et le HT égale le TTC : c'est la vérité de cette vente là,
// pas un défaut à corriger avec une règle de trois. Le `??` avec une
// valeur par défaut est un faux garde-fou, et un taux inventé serait
// pire : il produirait un versement faux qui a l'air juste.

/**
 * La base de commission, en centimes.
 *
 * `total` = ce qui a été encaissé, `taxe` = la TVA comprise dedans.
 * Tout ce qui n'est pas un nombre exploitable vaut zéro : une commission
 * calculée sur `NaN` produirait une ligne de versement absurde.
 */
export function commissionBaseCents(total: unknown, taxe: unknown): number {
  const ttc = Math.round(Number(total));
  if (!Number.isFinite(ttc) || ttc <= 0) return 0;

  const tva = Math.round(Number(taxe));
  // Une taxe absente, negative ou plus grande que le total ne peut pas
  // etre vraie : on l'ignore plutot que de rendre un HT negatif.
  if (!Number.isFinite(tva) || tva <= 0 || tva >= ttc) return ttc;

  return ttc - tva;
}
