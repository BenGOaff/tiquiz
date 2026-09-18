// lib/ventes/identite.ts
//
// QUI A PAYÉ, QUOI, ET QU'EST DEVENUE LA COMMISSION.
//
// Béné, 17 septembre 2026 : "j'ai fait une vente sur notre nouveau
// système, mais rien n'est identifié correctement. Ni dans pilotage ni
// dans l'admin de tiquiz."
//
// -- LA CAUSE, ET ELLE N'EST PAS DANS L'ÉCRAN --------------------------
//
// Le webhook PayPal SAIT tout. Il relit l'abonnement chez PayPal, en
// tire l'adresse saisie sur notre bon de commande, le produit du
// catalogue et le code de l'affiliée
// (`app/api/commande/paypal/webhook/route.ts`, `readCustomId`). Puis il
// ouvre l'accès, émet la facture, crée la commission... et écrit tout ça
// dans un `console.log`.
//
// Le tableau de bord, lui, relit le payload BRUT de l'événement
// (`buildSales`). Or `PAYMENT.SALE.COMPLETED` est le prélèvement, pas
// l'abonnement : PayPal n'y recopie pas toujours le `custom_id`. Le
// lecteur n'a donc ni l'adresse, ni le produit, et l'écran affiche
// "adresse inconnue" et "Produit non identifié" sur une vente dont on
// connaissait parfaitement le propriétaire trente secondes plus tôt.
//
// Pire : `buildPeople` range une vente sans adresse dans les
// ORPHELINES, donc l'accueil annonce "n'apparaît dans aucun compte" sur
// une cliente qui a son compte. Une alerte fausse sur de l'argent, c'est
// une alerte qu'on arrête de lire.
//
// -- LA RÈGLE QUI MANQUAIT ---------------------------------------------
//
// **Ce que le webhook a identifié s'ÉCRIT.** Il est le seul à pouvoir le
// savoir (il interroge le fournisseur, le lecteur ne peut pas), donc il
// est le seul endroit où ça peut être établi. Un tableau de bord qui
// re-déduit une décision déjà prise ailleurs finit toujours par mentir :
// c'est vrai sept fois dans ce dépôt, et c'est la huitième.
//
// -- ET ON COMPLÈTE AVEC DES FAITS, JAMAIS AVEC DU FLAIR --------------
//
// Trois sources, de la plus sûre à la moins sûre, et la première qui
// parle gagne. Aucune n'est une devinette :
//
//   1. la FICHE D'IDENTITÉ écrite par le webhook (table
//      `ventes_identite`) : c'est nous qui l'avons écrite ;
//   2. l'ABONNEMENT, pour une échéance PayPal. `billing_agreement_id`
//      voyage sur chaque prélèvement, et `profiles.paypal_subscription_id`
//      porte l'adresse depuis l'activation. Là encore, c'est nous qui
//      l'avons écrit ;
//   3. le MONTANT, pour nommer le produit. Les paliers vendus ont des
//      montants distincts : c'est une lecture du catalogue, pas un
//      flair. Une somme remisée ne correspond à rien et ne nomme rien.
//
// PUR : aucune lecture de base, aucune horloge. L'appelant apporte ce
// qu'il a lu.

import { OWNER_CATALOG, findOwnerProduct } from "@/lib/checkout/catalog";
import type { Sale } from "@/lib/checkout/sales";
import { planTiquizParMontant } from "@/lib/sio/webhookInference";
import type { StatutCommission, VerdictCommission } from "@/lib/ventes/verdictCommission";

/**
 * D'OÙ VIENT L'ABONNEMENT QUI A PRODUIT CET ENCAISSEMENT.
 *
 * Béné, 17 septembre : "je touche encore des abonnements tiquiz via
 * systeme io mais ce n'est pas non plus identifié dans pilotage."
 *
 * La distinction n'est pas cosmétique, elle dit QUI PAIE L'AFFILIÉE.
 * Une vente prise sur notre bon de commande est commissionnée par nous
 * (`regle_par: "nous"`, voir `lib/affiliate/ownerSale.ts`). Une vente
 * passée par un tunnel Systeme.io est commissionnée par EUX : ne rien
 * créer de notre côté est le comportement JUSTE, et l'écran doit le dire
 * au lieu de laisser croire qu'une commission a été oubliée.
 *
 * `hors_bon_de_commande` est un FAIT, pas une inférence : notre propre
 * bon de commande pose toujours `metadata.product` sur l'abonnement
 * qu'il crée (`lib/checkout/stripeCheckout.ts`). Son absence dit donc
 * que cet abonnement n'a pas été créé par nous. Ce qu'on NE SAIT PAS, et
 * qu'on n'écrit donc pas, c'est par quel autre chemin il l'a été.
 */
export type OrigineVente = "bon_de_commande" | "hors_bon_de_commande" | "inconnue";

/**
 * LE VOCABULAIRE DU VERDICT VIT À CÔTÉ, ET DANS LES DEUX DÉPÔTS.
 *
 * `StatutCommission`, `VerdictCommission` et leur traduction vers
 * l'email sont partagés à l'octet près avec l'Atelier
 * (`lib/ventes/verdictCommission.ts`) : les deux app appellent le même
 * registre et doivent en dire la même chose. Ce qui reste ICI est ce
 * qui parle des VENTES de Tiquiz, et qui n'a pas de jumeau.
 *
 * On re-exporte pour que personne n'ait à savoir lequel des deux
 * fichiers porte quoi : un import qui marchait le 17 septembre marche
 * encore.
 */
export {
  commissionAVerifier,
  statutDepuisTipote,
  etatPourAlerte,
  affiliationPourAlerte,
} from "@/lib/ventes/verdictCommission";
export type { StatutCommission, VerdictCommission } from "@/lib/ventes/verdictCommission";

/**
 * LA FICHE D'IDENTITÉ D'UN ENCAISSEMENT, telle que le webhook l'a
 * établie.
 *
 * `reference` est la MÊME clé que celle de la commission (la facture
 * Stripe, la vente PayPal), et c'est ce qui permet de rapprocher les
 * deux sans un deuxième identifiant à tenir.
 */
export interface IdentiteVente {
  provider: string;
  reference: string;
  email: string | null;
  nom: string | null;
  productId: string | null;
  productLabel: string | null;
  subscriptionId: string | null;
  origine: OrigineVente;
  affiliateRef: string | null;
  affiliateCode: string | null;
  commission: VerdictCommission | null;
}

/** La clé d'une fiche. Écrite ICI, pour que les deux côtés la partagent. */
export function cleIdentite(provider: string, reference: string): string {
  return `${String(provider ?? "").trim()}:${String(reference ?? "").trim()}`;
}

export interface ConnaissancesVentes {
  /**
   * Les fiches écrites par les webhooks, par `cleIdentite`.
   *
   * VIDE n'est pas une réponse : c'est l'absence de réponse. Une fiche
   * absente ne dit rien sur la vente, elle dit que la vente est
   * antérieure à la table (ou que l'écriture a raté). C'est pour ça que
   * les deux replis suivants existent.
   */
  fiches: Readonly<Record<string, IdentiteVente>>;
  /**
   * Abonnement PayPal -> adresse du compte, lu dans `profiles`.
   *
   * Écrit par NOUS à l'activation (`rememberPaypalSubscription`) : ce
   * n'est pas un rapprochement au flair, c'est le fil qu'on a posé
   * exprès pour pouvoir arrêter l'abonnement plus tard.
   */
  emailParAbonnement: Readonly<Record<string, string>>;
}

export const AUCUNE_CONNAISSANCE: ConnaissancesVentes = {
  fiches: {},
  emailParAbonnement: {},
};

/**
 * LE PRODUIT QUI COÛTE EXACTEMENT CETTE SOMME, nom compris.
 *
 * Deux catalogues, dans cet ordre, parce qu'ils ne répondent pas à la
 * même question :
 *
 *   1. `OWNER_CATALOG`, ce que notre bon de commande vend AUJOURD'HUI
 *      (17, 29, 170, 290) ;
 *   2. les montants HISTORIQUES de Tiquiz (9 et 90 avant le 6 août
 *      2026, 57 de l'opération à vie). Ils ne sont plus vendus, mais ils
 *      sont encore PRÉLEVÉS chaque mois sur les abonnements ouverts
 *      avant le changement de prix.
 *
 * C'est le deuxième qui manquait, et c'est ce que Béné a sous les yeux :
 * cinq échéances à 9,00 € affichées "Produit non identifié", alors que
 * `AMOUNT_TO_PLAN` sait depuis toujours que 900 centimes est un mensuel
 * Tiquiz. La table existait, personne ne la posait à cette question là.
 *
 * Correspondance EXACTE, et c'est la garantie : une somme remisée ou un
 * prorata ne correspond à rien et rend `null`. On préfère "non
 * identifié" à un faux nom.
 */
export function produitParMontantCents(
  cents: number,
): { id: string; label: string } | null {
  if (!Number.isFinite(cents) || cents <= 0) return null;

  for (const produit of Object.values(OWNER_CATALOG)) {
    if (produit.amountCents === cents) return { id: produit.id, label: produit.label };
  }

  const plan = planTiquizParMontant(cents);
  if (plan) return { id: plan, label: `Tiquiz ${LIBELLE_PLAN[plan] ?? plan}` };

  return null;
}

/**
 * Le mot lisible d'un palier historique.
 *
 * "ancien prix" n'est PAS écrit ici : le prix d'une échéance est celui
 * qu'elle porte, et le qualifier d'ancien sur la ligne ferait douter du
 * montant. L'écran dit l'origine, ça suffit.
 */
const LIBELLE_PLAN: Readonly<Record<string, string>> = {
  monthly: "mensuel",
  monthly_plus: "mensuel Plus",
  yearly: "annuel",
  yearly_plus: "annuel Plus",
  lifetime: "à vie",
  free: "gratuit",
  beta: "bêta",
};

/**
 * Complète les ventes avec ce qu'on SAIT d'elles.
 *
 * Ne remplace JAMAIS une valeur présente : le payload du fournisseur
 * reste la vérité de ce qu'il a envoyé, et une fiche ne sert qu'à
 * combler un trou. Écraser reviendrait à faire gagner notre copie sur
 * l'original, ce qui est exactement l'erreur inverse.
 *
 * Les montants ne sont JAMAIS touchés : ils viennent du fournisseur, et
 * une fiche d'identité n'a rien à dire sur une somme.
 */
export function completerVentes(
  ventes: readonly Sale[],
  connaissances: ConnaissancesVentes = AUCUNE_CONNAISSANCE,
): Sale[] {
  return ventes.map((v) => completerUneVente(v, connaissances));
}

export function completerUneVente(vente: Sale, connaissances: ConnaissancesVentes): Sale {
  const fiche = connaissances.fiches[cleIdentite(vente.provider, vente.ref)] ?? null;

  const abonnement =
    net(vente.subscriptionId) ?? net(fiche?.subscriptionId) ?? null;

  const email =
    net(vente.email) ??
    net(fiche?.email) ??
    (abonnement ? net(connaissances.emailParAbonnement[abonnement]) : null) ??
    null;

  const parMontant = produitParMontantCents(Number(vente.amountCents) || 0);
  const productId = net(vente.productId) ?? net(fiche?.productId) ?? parMontant?.id ?? null;

  // L'ORIGINE NE S'INVENTE PAS. La fiche d'abord (le webhook l'a
  // établie), puis ce que le lecteur a pu lire du payload, puis
  // `inconnue`. Jamais un repli sur `bon_de_commande` : dire qu'une
  // vente est passée par notre caisse alors qu'on ne le sait pas
  // laisserait croire qu'une commission manque chez nous.
  const origine: OrigineVente = fiche?.origine ?? vente.origine ?? "inconnue";

  return {
    ...vente,
    email,
    // `name` cote fournisseur, `nom` sur la fiche : deux noms pour la
    // meme chose, et c'est celui du type `Sale` qui gagne ici.
    name: net(vente.name) ?? net(fiche?.nom) ?? null,
    productId,
    subscriptionId: abonnement,
    origine,
    // LA COMMISSION VIENT DE LA FICHE, ET D'ELLE SEULE.
    //
    // Une vente réglée par Systeme.io n'a pas de commission chez nous et
    // n'en attend pas : c'est une fin de course légitime, dite comme
    // telle plutôt que laissée vide. Le reste sans fiche est `null`,
    // c'est à dire "je n'ai pas la trace", ce qui n'est PAS "aucun
    // affilié" et doit se voir.
    commission:
      fiche?.commission ??
      (origine === "hors_bon_de_commande"
        ? {
            statut: "reglee_ailleurs" as StatutCommission,
            cents: null,
            affilie: null,
            detail: "abonnement hors de notre bon de commande",
          }
        : null),
  };
}

function net(v: string | null | undefined): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
}

/**
 * Le nom d'affichage du produit d'une vente, complété.
 *
 * `nomProduitVendu` (dans `lib/admin/saleProduct.ts`) répond déjà pour
 * ce que Systeme.io nomme. Celui ci ajoute le seul cas qui lui manquait :
 * un palier reconnu par son montant, qui n'est ni un identifiant de
 * notre catalogue ni un plan tarifaire Systeme.io.
 */
export function nomProduitComplete(vente: Pick<Sale, "productId" | "amountCents">): string | null {
  const id = net(vente.productId);
  if (id) {
    const duCatalogue = findOwnerProduct(id);
    if (duCatalogue) return duCatalogue.label;
    const libelle = LIBELLE_PLAN[id.toLowerCase()];
    if (libelle) return `Tiquiz ${libelle}`;
  }
  return produitParMontantCents(Number(vente.amountCents) || 0)?.label ?? null;
}

// ── CE QUE LA COMMISSION D'UNE VENTE EST DEVENUE, VU DE L'ÉCRAN ───────
//
// Béné, 17 septembre 2026 : "je voudrais être sûre et certaine que la
// dernière cliente est bien arrivée seule et pas via un affilié qu'on
// n'aurait pas vu et qui serait lésé. Il faut être sûre à 200 % qu'un
// affilié ne va pas perdre sa com parce que notre système aurait foiré."
//
// Cette certitude ne peut pas venir d'un calcul : un calcul refait à
// l'écran répond "je ne trouve pas d'affilié", ce qui est EXACTEMENT
// l'ambiguïté qu'elle veut lever. "Personne ne l'a amenée" et "on n'a
// pas regardé" se lisent pareil, et c'est la deuxième qui coûte de
// l'argent à quelqu'un.
//
// D'où DIX états, et non pas deux. Les huit premiers sont des réponses
// du registre, les deux derniers sont l'absence de réponse, séparée en
// deux parce que les deux causes n'appellent pas la même réaction.

export type EtatCommissionVente =
  | StatutCommission
  /**
   * RIEN N'ÉTAIT DÛ, et c'est normal.
   *
   * Un encaissement à zéro (le mois offert, un code de réduction à
   * 100 %) ne commissionne personne : `commissionnerVente` n'est même
   * pas appelée. Sans cet état, chaque mois offert remonterait comme une
   * commission manquante, et l'écran d'alerte finirait par ne plus être
   * lu.
   */
  | "rien_a_devoir"
  /**
   * ON N'A PAS LA TRACE, ET ON DEVRAIT.
   *
   * Soit la vente est antérieure à la table (tout ce qui précède le
   * 18 septembre 2026), soit l'écriture a raté. Ce n'est PAS "aucun
   * affilié" : c'est la seule ligne pour laquelle il faut aller
   * regarder, et c'est ce que fait `npm run audit:affiliation`.
   */
  | "sans_trace";

/**
 * L'état de la commission d'une vente. PUR, donc testable.
 *
 * L'ordre des tests n'est pas indifférent : le montant nul passe AVANT
 * la trace, sinon un mois offert d'avant la table sortirait en
 * "sans trace" et enverrait chercher une commission qui n'a jamais eu
 * lieu d'être.
 */
export function etatCommission(
  vente: Pick<Sale, "provider" | "amountCents" | "origine" | "commission">,
): EtatCommissionVente {
  // 1. UNE VENTE SYSTEME.IO EST COMMISSIONNÉE PAR SYSTEME.IO. Elle
  //    n'attend rien de nous, et c'est vrai avant même de regarder une
  //    trace : nos propres fiches ne couvrent que nos encaissements.
  if (vente.provider === "systeme_io") return "reglee_ailleurs";

  // 2. Rien n'a bougé : rien n'était dû.
  if (!(Number(vente.amountCents) > 0)) return "rien_a_devoir";

  // 3. La réponse du registre, quand on l'a.
  if (vente.commission?.statut) return vente.commission.statut;

  // 4. Un abonnement hors de notre bon de commande est payé par eux.
  if (vente.origine === "hors_bon_de_commande") return "reglee_ailleurs";

  return "sans_trace";
}

export interface ResumeCommissions {
  /** Des affiliés ont été payés sur ces ventes. */
  attribuees: number;
  centsAttribues: number;
  /** Le registre a regardé et n'a trouvé personne. Personne n'est lésé. */
  aucunAffilie: number;
  /** Systeme.io s'en occupe, ou rien n'était dû. */
  horsDeNotreCompte: number;
  /** L'appel n'est pas passé, il sera rejoué. Rien n'est perdu. */
  enAttente: number;
  /** IL FAUT ALLER REGARDER. C'est le seul chiffre qui appelle une action. */
  aVerifier: number;
}

/**
 * Le bilan des commissions d'une liste de ventes.
 *
 * Les ventes REMBOURSÉES sortent du décompte "à vérifier" : leur
 * commission est annulée par construction (`annulerCommissionVente`), et
 * une commission absente sur une vente remboursée n'est pas une
 * anomalie. Elles restent comptées dans leur état, seulement elles
 * n'appellent plus personne.
 */
export function resumeCommissions(ventes: readonly Sale[]): ResumeCommissions {
  const bilan: ResumeCommissions = {
    attribuees: 0,
    centsAttribues: 0,
    aucunAffilie: 0,
    horsDeNotreCompte: 0,
    enAttente: 0,
    aVerifier: 0,
  };
  for (const v of ventes) {
    const etat = etatCommission(v);
    switch (etat) {
      case "attribuee":
        bilan.attribuees += 1;
        bilan.centsAttribues += Number(v.commission?.cents) || 0;
        break;
      case "aucun_affilie":
      case "doublon":
        bilan.aucunAffilie += 1;
        break;
      case "reglee_ailleurs":
      case "rien_a_devoir":
        bilan.horsDeNotreCompte += 1;
        break;
      case "en_attente":
        bilan.enAttente += 1;
        break;
      default:
        // `affilie_inconnu`, `non_tentee`, `reponse_inconnue`,
        // `sans_trace` : les quatre cas où un affilié PEUT avoir été
        // lésé, et les seuls.
        if (!v.refundedAt) bilan.aVerifier += 1;
        break;
    }
  }
  return bilan;
}
