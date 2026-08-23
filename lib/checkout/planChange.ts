// lib/checkout/planChange.ts
//
// CHANGER DE PALIER EN COURS D'ABONNEMENT, ET CE QUE ÇA COÛTE.
//
// Béné, 23 août 2026 : "ce serait possible de calculer un pro rata ?
// Genre l'user paye 17€ pour le mois et veut upgrader à tiquiz plus : on
// retire les 17€ qu'il a payés déjà pour lui faire payer le complément
// pour le mois en cours et la bonne somme le mois d'après ?" Puis :
// "Pour stripe oui on met le prorata en route."
//
// -- CE FICHIER NE PARLE À PERSONNE ------------------------------------
//
// Il ne fait aucun appel réseau, donc il est testable. La plomberie
// Stripe vit dans `planChangeStripe.ts`. C'est la règle du dépôt depuis
// le 1er août : une décision enfermée dans un module qui exige des
// variables d'environnement au chargement est une décision que personne
// ne teste, donc c'est exactement là que les bugs s'installent.
//
// -- DEUX AXES, ET ILS NE SE MÉLANGENT PAS -----------------------------
//
// Un palier Tiquiz porte DEUX choix indépendants :
//   - le niveau : base ou Plus (ce que ça ouvre) ;
//   - la facturation : au mois ou à l'année (quand on paie).
//
// Comparer les montants ne suffit donc pas : l'annuel coûte 170 € d'un
// coup mais revient moins cher au mois que le mensuel. Un classement par
// prix rangerait "mensuel -> annuel" dans les DESCENTES, et le passage à
// l'année, qui est la meilleure nouvelle possible pour la trésorerie,
// serait traité comme une rétrogradation.
//
// D'où la règle, sur les deux axes :
//   - monter de niveau  -> MONTÉE ;
//   - à niveau égal, passer du mois à l'année -> MONTÉE ;
//   - tout le reste     -> DESCENTE.
//
// -- ET UNE MONTÉE SE FACTURE, UNE DESCENTE NON ------------------------
//
// Une montée est un service qu'on rend tout de suite : on facture la
// différence tout de suite, et le prorata dit exactement ce qui a déjà
// été payé. Une descente est l'inverse : la personne a payé sa période
// au tarif fort, on ne lui reprend pas ce qu'elle a acheté. C'est la
// même règle que l'annulation du 23 août ("elle a payé son mois, on ne
// le lui reprend pas"), et c'est pour ça que la descente ne passe PAS
// par ici (cf. `raisonDeRefus`).

import {
  OWNER_CATALOG,
  findOwnerProduct,
  produitPourPlan,
  type OwnerProduct,
  type OwnerProductId,
} from "@/lib/checkout/catalog";
import type { TiquizPlan } from "@/lib/sio/webhookInference";

/** Le sens du changement, sur les deux axes du catalogue. */
export type SensDuChangement = "montee" | "descente" | "identique";

/** Pourquoi un changement est refusé. La route traduit, jamais le serveur. */
export type RefusDeChangement =
  | "produit_inconnu"
  | "deja_sur_ce_palier"
  | "descente_non_geree"
  | "pas_d_abonnement"
  | "pas_notre_abonnement";

/** Le palier est-il un "Plus" ? Lu sur le PLAN, jamais sur le libellé. */
export function estPlus(p: OwnerProduct): boolean {
  return p.plan.endsWith("_plus");
}

/**
 * Le sens du changement entre deux produits du catalogue.
 *
 * Fonction pure et totale : elle répond pour n'importe quel couple, y
 * compris le couple identique.
 */
export function sensDuChangement(actuel: OwnerProduct, cible: OwnerProduct): SensDuChangement {
  if (actuel.id === cible.id) return "identique";

  const monteDeNiveau = !estPlus(actuel) && estPlus(cible);
  const descendDeNiveau = estPlus(actuel) && !estPlus(cible);
  if (monteDeNiveau) return "montee";
  if (descendDeNiveau) return "descente";

  // Niveau égal : reste l'axe de facturation.
  if (actuel.interval === "month" && cible.interval === "year") return "montee";
  return "descente";
}

/**
 * Le comportement de prorata à demander à Stripe.
 *
 * **PARAMÈTRE OBLIGATOIRE de l'appel Stripe, jamais deviné à
 * l'intérieur.** C'est la règle du dépôt depuis le quiz scoré du 1er
 * août : quand un cas a deux mécaniques, la mécanique se passe, sinon
 * la fonction finit par appliquer la règle de l'autre cas.
 */
export type ProrationStripe = "always_invoice";

/**
 * Ce qu'on peut faire, ou la raison de ne pas le faire.
 *
 * La DESCENTE est refusée, et c'est délibéré : l'appliquer tout de suite
 * retirerait à quelqu'un des fonctionnalités qu'il a déjà payées
 * jusqu'à la fin de sa période. La sortie honnête est celle qui existe
 * déjà : il arrête son abonnement (l'accès tient jusqu'à la date payée)
 * et reprend le palier qu'il veut. Livrer un demi-changement de palier
 * coûterait plus cher que de ne pas le livrer.
 */
export interface ChangementDecide {
  ok: boolean;
  raison?: RefusDeChangement;
  sens?: SensDuChangement;
  cible?: OwnerProduct;
  actuel?: OwnerProduct;
  proration?: ProrationStripe;
}

export function deciderChangement(args: {
  /** Le produit actuellement facturé, tel qu'écrit dans les metadata. */
  actuelId: string | null | undefined;
  /** Le produit demandé. */
  cibleId: string | null | undefined;
}): ChangementDecide {
  const cible = findOwnerProduct(args.cibleId);
  if (!cible) return { ok: false, raison: "produit_inconnu" };

  const actuel = findOwnerProduct(args.actuelId);
  // Sans produit actuel lisible, on ne SAIT PAS dans quel sens ça va.
  // Refuser est la bonne réponse : facturer une montée à quelqu'un qui
  // descend lui prendrait de l'argent pour moins de service.
  if (!actuel) return { ok: false, raison: "pas_notre_abonnement" };

  const sens = sensDuChangement(actuel, cible);
  if (sens === "identique") return { ok: false, raison: "deja_sur_ce_palier", actuel, cible };
  if (sens === "descente") return { ok: false, raison: "descente_non_geree", sens, actuel, cible };

  return { ok: true, sens, actuel, cible, proration: "always_invoice" };
}

/** Les paliers vers lesquels on peut monter depuis celui ci. */
export function ciblesPossibles(actuelId: string | null | undefined): OwnerProductId[] {
  const actuel = findOwnerProduct(actuelId);
  if (!actuel) return [];
  return (Object.keys(OWNER_CATALOG) as OwnerProductId[]).filter(
    (id) => sensDuChangement(actuel, OWNER_CATALOG[id]) === "montee",
  );
}

/**
 * L'identifiant de produit Stripe d'un palier, FIXE et lisible.
 *
 * Stripe accepte qu'on impose l'`id` d'un produit à sa création. On s'en
 * sert pour n'en avoir qu'UN par palier, quel que soit le nombre de
 * changements : sans ça, chaque montée créerait un produit de plus, le
 * tableau de bord de Béné se remplirait de doublons, et le rapport de
 * ventes par produit deviendrait illisible.
 */
export function idProduitStripe(p: OwnerProduct): string {
  return `tiquiz_${p.id.replace(/-/g, "_")}`;
}

// ── CE QUE LE WEBHOOK DOIT OUVRIR ────────────────────────────────────
//
// Le plan n'est PAS ouvert par la route qui demande le changement : il
// l'est ici, à partir de ce que Stripe facture VRAIMENT. Un écran qui
// ouvrirait l'accès de son côté et un webhook qui l'ouvrirait du sien
// finiraient par se contredire, et c'est le quatrième exemplaire du même
// défaut dans ce dépôt.
//
// Bénéfice de bord : Béné peut changer un palier depuis son tableau de
// bord Stripe, et l'accès suit tout seul.

/** Ce que l'événement d'abonnement demande d'ouvrir, ou `null`. */
export interface OuvertureDemandee {
  plan: TiquizPlan;
  produit: OwnerProductId;
  label: string;
}

/**
 * Le plan à ouvrir sur un `customer.subscription.updated`, ou `null`.
 *
 * Rend `null` dans TOUS les cas où il n'y a rien à faire, et il y en a
 * beaucoup : Stripe envoie cet événement pour à peu près tout (une carte
 * changée, une TVA renseignée, une résiliation programmée). Ouvrir à
 * chaque fois enverrait un email de confirmation à quelqu'un qui vient
 * juste de mettre sa carte à jour.
 *
 * `planActuel` est un PARAMÈTRE, pas une lecture faite ici : c'est ce
 * qui rend la fonction testable, et c'est aussi ce qui garantit qu'on
 * compare au plan RÉEL du compte et pas à une hypothèse.
 */
export function ouvertureDemandee(args: {
  /** `metadata.product` de l'abonnement Stripe. */
  produitFacture: string | null | undefined;
  /** Le statut de l'abonnement, tel que Stripe le donne. */
  vivant: boolean;
  /** Le plan actuellement inscrit sur le compte. */
  planActuel: string | null | undefined;
  /** Ce plan est-il à vie ? Passé par l'appelant (`estPlanAVie`). */
  aVie: boolean;
}): OuvertureDemandee | null {
  // Un abonnement mort n'ouvre rien : c'est la révocation qui décide,
  // et elle a déjà son chemin.
  if (!args.vivant) return null;
  // Un accès à vie ne se remplace jamais par un abonnement : ce serait
  // retirer à quelqu'un ce qu'il a payé une fois pour toutes.
  if (args.aVie) return null;

  const produit = findOwnerProduct(args.produitFacture);
  if (!produit) return null;

  const actuel = String(args.planActuel ?? "").trim().toLowerCase();
  // Rien n'a bougé : silence. C'est ce qui empêche l'email de partir à
  // chaque mise à jour anodine.
  if (actuel === produit.plan) return null;

  return { plan: produit.plan, produit: produit.id, label: produit.label };
}

/**
 * Le produit à demander pour arriver sur CE plan, s'il est une montée.
 *
 * L'écran des formules raisonne en plans (`monthly_plus`) parce que
 * c'est ce qui vit sur le compte ; la route raisonne en produits
 * (`mensuel-plus`) parce que c'est ce qui se facture. La traduction vit
 * ici, testée, et pas dans le JSX : un écran qui recalcule une décision
 * du serveur finit toujours par mentir (six fois dans ce dépôt).
 *
 * Rend `null` si ce plan n'est pas dans les montées possibles, donc le
 * bouton ne s'affiche pas et rien n'est promis.
 */
export function monteeVersProduit(
  plan: string | null | undefined,
  cibles: readonly string[],
): OwnerProductId | null {
  const produit = produitPourPlan(plan);
  if (!produit) return null;
  return cibles.includes(produit.id) ? produit.id : null;
}
