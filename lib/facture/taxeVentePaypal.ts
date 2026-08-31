// lib/facture/taxeVentePaypal.ts
//
// LA TVA D'UNE VENTE PAYPAL, POUR PAYER L'AFFILIÉE SUR LE HT.
//
// Béné, 31 août 2026 : "pour l'affiliation on fait uniquement 40 % etc.
// sur le HT. Débrouille toi pour que sur PayPal ça marche aussi, il y a
// forcément un moyen de calculer chez nous la TVA si concerné ou pas et
// le montant de la commission, de manière fiable et stable."
//
// **Ça REMPLACE sa décision du 22 août** ("pour paypal : oui on garde
// le TTC"), qui datait d'un moment où nous ne savions pas ventiler la
// TVA d'une vente PayPal. Depuis le 24 août, nous savons : c'est nous
// qui émettons la facture de ces ventes, donc c'est nous qui résolvons
// le régime (pays de l'acheteur, numéro de TVA, réponse de VIES) et qui
// décomposons le TTC. Le moyen qu'elle cherchait existait déjà, il
// n'était simplement pas branché sur la commission.
//
// -- CE QUE COÛTAIT LE TTC --------------------------------------------
//
// Sur le mensuel à 17 € avec 20 % de TVA : 40 % de 17,00 € font 6,80 €
// au lieu de 40 % de 14,17 € qui font 5,67 €. **1,13 € de trop par
// échéance et par abonné**, tous les mois, et une affiliée payée
// différemment selon que son filleul a sorti une carte ou un compte
// PayPal. C'est exactement l'écart du 26 août, par une autre porte.
//
// Et le plus gênant : le webhook envoyait déjà `base: "ht"` à Tipote
// avec une taxe à zéro. **Le champ disait "hors taxes", le nombre était
// TTC.** Un paramètre obligatoire ne protège de rien quand on lui ment.
//
// -- ON NE DEVINE JAMAIS UN TAUX --------------------------------------
//
// La taxe vient de la FACTURE qu'on vient d'émettre pour cette vente là,
// jamais d'une règle de trois refaite ici. Le montant facturé et le
// montant commissionné sortent ainsi du même calcul, par construction :
// les recalculer séparément est le défaut sorti six fois dans ce dépôt,
// et ici la contradiction se compte en euros versés.
//
// Le seul cas où on n'a pas de facture, c'est quand TOUT a échoué
// (la fiche de facturation illisible ET la construction en exception).
// On ne rend alors pas zéro, parce que zéro veut dire "vente sans TVA"
// et que ce serait faux neuf fois sur dix : on retient le taux du pays
// du vendeur, qui est déjà ce que `resoudreTva` fait d'un pays inconnu,
// et **on crie**.
//
// **Ce repli est CONSERVATEUR, et c'est le sens qui compte** : retenir
// une TVA sur une vente qui n'en portait pas SOUS-paie l'affiliée, ce
// qui se corrige au lot suivant ; l'inverse SUR-paie, et un virement
// parti ne revient pas (règle de Tipote, 26 août).

import { PAYS_VENDEUR, TAUX_UE, decomposerTTC } from "./tva";

/** Ce qu'on a besoin de savoir d'une facture, et rien de plus. */
export interface TaxeDeLaFacture {
  totalCents: number;
  tvaCents: number;
}

/**
 * La TVA à retirer du montant encaissé, en centimes.
 *
 * `facture` est la pièce émise pour CETTE vente. `null` = on n'a pas pu
 * la construire : voir le repli ci-dessus.
 *
 * `totalCents` est le montant réellement encaissé (une remise
 * comprise) : c'est lui qui sert de base au repli, jamais le prix du
 * catalogue.
 */
export function taxePaypalCents(
  facture: TaxeDeLaFacture | null | undefined,
  totalCents: number,
): number {
  const ttc = Math.round(Number(totalCents));
  if (!Number.isFinite(ttc) || ttc <= 0) return 0;

  if (facture) {
    const tva = Math.abs(Math.round(Number(facture.tvaCents)));
    // Une taxe illisible, ou plus grande que ce qui a été encaissé, ne
    // peut pas être vraie. On ne la force pas : on tombe dans le repli,
    // qui est explicite et qui crie.
    if (Number.isFinite(tva) && tva >= 0 && tva < ttc) return tva;
  }

  return decomposerTTC(ttc, TAUX_UE[PAYS_VENDEUR]).tvaCents;
}

/** Vrai quand la taxe rendue vient du repli, donc quand il faut crier. */
export function taxeEstUnRepli(
  facture: TaxeDeLaFacture | null | undefined,
  totalCents: number,
): boolean {
  const ttc = Math.round(Number(totalCents));
  if (!Number.isFinite(ttc) || ttc <= 0) return false;
  if (!facture) return true;
  const tva = Math.abs(Math.round(Number(facture.tvaCents)));
  return !(Number.isFinite(tva) && tva >= 0 && tva < ttc);
}
