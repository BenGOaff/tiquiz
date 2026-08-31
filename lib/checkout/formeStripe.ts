// lib/checkout/formeStripe.ts
//
// LIRE UNE FACTURE ET UN ABONNEMENT STRIPE, QUELLE QUE SOIT LA VERSION
// D'API DU COMPTE.
//
// -- LE TROU, ET IL EST SILENCIEUX (audit du 31 août 2026) -------------
//
// Aucun appel de ce dépôt n'envoie d'en-tête `Stripe-Version`. Stripe
// répond donc dans la version PAR DÉFAUT DU COMPTE, et les webhooks
// arrivent dans la version configurée SUR L'ENDPOINT. Ni l'une ni
// l'autre n'est écrite quelque part chez nous : elles se règlent dans
// le tableau de bord de Stripe, et elles peuvent changer sans qu'une
// seule ligne de code bouge.
//
// Or Stripe a DÉPLACÉ trois champs que ce dépôt lit pour payer les
// affiliés :
//
//   | ce qu'on lisait                   | où c'est passé                                        |
//   |-----------------------------------|-------------------------------------------------------|
//   | `invoice.subscription`            | `invoice.parent.subscription_details.subscription`    |
//   | `invoice.tax`                     | `invoice.total_taxes[].amount`                        |
//   | `subscription.current_period_end` | `subscription.items.data[].current_period_end`         |
//
// Ce que ça coûte, dans l'ordre de gravité :
//
// 1. **Plus AUCUNE commission récurrente.** `surAbonnement` lit
//    l'abonnement d'une facture pour décider quoi faire. Sans lui,
//    `invoice.paid` sort en "ce n'est pas un abonnement" et
//    `commissionnerEcheance` n'est jamais appelée. L'affilié est payé
//    le premier mois (par le checkout) et plus jamais ensuite. Rien ne
//    plante, rien ne s'affiche : c'est exactement le silence que Béné
//    ne peut pas se permettre en démarchant de gros affiliés.
// 2. **La commission calculée sur le TTC.** Sans `tax`, on envoie une
//    taxe de zéro, donc Tipote paie 40 % de 17,00 € au lieu de 40 % de
//    14,17 € : 1,13 € de trop par vente et par mois. C'est le MÊME
//    écart que l'audit du 26 août, par une autre porte.
// 3. **La date de fin de période absente** : l'écran de descente de
//    palier n'annonce plus de date, et le départ consigné n'en a plus.
//
// -- LA RÈGLE : ON LIT CE QU'IL Y A, PAS CE QU'IL DEVRAIT Y AVOIR ------
//
// On ne CHOISIT pas une version : épingler les appels sortants ne dit
// rien de la version des webhooks reçus, donc ça ne ferme rien. On lit
// les DEUX formes, l'ancienne d'abord (c'est celle qui a des ventes en
// base), la nouvelle ensuite. Une lecture tolérante ne casse jamais ce
// qui marchait, et elle marche déjà le jour où Béné accepte la mise à
// jour d'API que Stripe lui propose.
//
// C'est la leçon d'Ivan, écrite noir sur blanc le 7 août : « raisonner
// sur la forme SUPPOSÉE d'un payload au lieu de la regarder ». Et
// `refFacture` (`lib/checkout/sales.ts`) le faisait DÉJÀ pour
// `payment_intent` : la moitié du problème était connue, l'autre moitié
// vivait dans le fichier qui paie.
//
// -- POUR SAVOIR OÙ ON EN EST VRAIMENT ---------------------------------
//
//     npm run check:stripe
//
// Il dit la version par défaut du compte, celle de CHAQUE endpoint de
// webhook, et les événements auxquels il est abonné. Un journal se lit,
// il ne se déduit pas.
//
// Ce fichier est PUR : aucun appel réseau, aucune variable
// d'environnement, donc il est testable
// (`tests/logic/forme-stripe.test.mts`).

/** Un objet JSON quelconque, réduit à ce qu'on peut y lire. */
type Obj = Record<string, unknown>;

function obj(v: unknown): Obj {
  return v && typeof v === "object" ? (v as Obj) : {};
}

/** Une chaîne non vide, ou `null`. Accepte un objet étendu (`{id}`). */
function id(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  const inner = obj(v).id;
  return typeof inner === "string" ? inner.trim() || null : null;
}

function tableau(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/**
 * L'ABONNEMENT QUI A PRODUIT CETTE FACTURE, ou `null`.
 *
 * `null` veut dire « paiement unique », et il faut que ça reste vrai :
 * c'est ce qui distingue une échéance d'abonnement d'un achat à
 * l'unité. Une lecture qui rendrait `null` sur un abonnement ferait
 * disparaître la commission récurrente.
 *
 * Quatre endroits, du plus ancien au plus récent. Les trois derniers
 * n'existent que dans les versions où le premier a disparu, donc ils ne
 * peuvent pas se contredire.
 */
export function abonnementDeLaFacture(facture: unknown): string | null {
  const f = obj(facture);

  // 1. La forme historique, au premier niveau.
  const direct = id(f.subscription);
  if (direct) return direct;

  // 2. Depuis `2025-04-30.basil` : le parent de la facture.
  const parent = obj(f.parent);
  const details = id(obj(parent.subscription_details).subscription);
  if (details) return details;

  // 3. Sur les lignes, même déplacement.
  for (const brute of tableau(obj(f.lines).data)) {
    const ligne = obj(brute);
    const surParent = id(
      obj(obj(ligne.parent).subscription_item_details).subscription,
    );
    if (surParent) return surParent;
    const surLigne = id(ligne.subscription);
    if (surLigne) return surLigne;
  }

  return null;
}

/**
 * LES METADONNÉES DE L'ABONNEMENT, RECOPIÉES SUR LA FACTURE.
 *
 * C'est là que vivent `product`, `affiliate_code` et `affiliate_ref`.
 * On la lit quand on n'a pas relu l'abonnement lui même.
 */
export function metaAbonnementDeLaFacture(facture: unknown): Obj {
  const f = obj(facture);
  const ancien = obj(obj(f.subscription_details).metadata);
  if (Object.keys(ancien).length > 0) return ancien;
  return obj(obj(obj(obj(f.parent).subscription_details).metadata));
}

/**
 * LA TVA CONTENUE DANS CETTE FACTURE, EN CENTIMES.
 *
 * **Zéro est une réponse légitime** (un client hors UE, une
 * autoliquidation), et c'est ce qui rend l'erreur invisible : une taxe
 * manquante et une taxe nulle se ressemblent, et l'écart part en
 * commission tous les mois. D'où les trois lectures.
 */
export function taxeDeLaFacture(facture: unknown): number {
  const f = obj(facture);

  // 1. La forme historique : un entier au premier niveau.
  const direct = Number(f.tax);
  if (Number.isFinite(direct) && direct > 0) return Math.round(direct);

  // 2. Depuis `2025-04-30.basil`.
  const parBasil = sommeMontants(f.total_taxes);
  if (parBasil > 0) return parBasil;

  // 3. La forme intermédiaire, toujours servie par beaucoup de comptes.
  return sommeMontants(f.total_tax_amounts);
}

/** La somme des `amount` d'une liste, en centimes. */
function sommeMontants(liste: unknown): number {
  let total = 0;
  for (const brute of tableau(liste)) {
    const n = Number(obj(brute).amount);
    if (Number.isFinite(n) && n > 0) total += n;
  }
  return Math.round(total);
}

/**
 * LA FIN DE LA PÉRIODE DÉJÀ PAYÉE, en secondes Stripe, ou `null`.
 *
 * C'est la date qu'on ANNONCE à quelqu'un qui descend de palier ("ton
 * nouveau tarif s'applique le ..."). Une date absente vaut mieux qu'une
 * date fausse, mais une date absente sur tous les écrans est un défaut
 * que personne ne relie à une version d'API.
 *
 * En cas de plusieurs lignes, la PLUS LOINTAINE : c'est la date à
 * laquelle l'abonnement dans son ensemble se renouvelle.
 */
export function finDePeriodeAbonnement(abonnement: unknown): number | null {
  const a = obj(abonnement);

  const direct = Number(a.current_period_end);
  if (Number.isFinite(direct) && direct > 0) return direct;

  let max = 0;
  for (const brute of tableau(obj(a.items).data)) {
    const n = Number(obj(brute).current_period_end);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max > 0 ? max : null;
}

/**
 * LE MONTANT UNITAIRE D'UN ABONNEMENT, en centimes, et sa devise.
 *
 * `price` sur les versions historiques, `pricing.price_details` sur les
 * plus récentes. Sert au tableau de bord des départs : un départ
 * consigné à 0 € fausse le revenu perdu.
 */
export function montantAbonnement(abonnement: unknown): {
  amountCents: number | null;
  currency: string | null;
} {
  const ligne = obj(tableau(obj(obj(abonnement).items).data)[0]);
  const prix = obj(ligne.price);

  const montant = Number(prix.unit_amount);
  const devise = String(prix.currency ?? "").trim().toLowerCase();
  if (Number.isFinite(montant)) {
    return { amountCents: montant, currency: devise || null };
  }

  // Repli : la ligne porte parfois le montant qu'elle facture.
  const surLigne = Number(ligne.amount ?? obj(ligne.pricing).unit_amount_decimal);
  return {
    amountCents: Number.isFinite(surLigne) ? Math.round(surLigne) : null,
    currency: devise || String(ligne.currency ?? "").trim().toLowerCase() || null,
  };
}
