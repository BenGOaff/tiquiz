// lib/checkout/sales.ts
//
// TES VENTES, LUES DANS LE JOURNAL DES APPELS REÇUS.
//
// Béné, 20 août : "je vais avoir un truc dans mon dashboard admin pour
// gérer directement les refund etc. ? Sans avoir à passer par Stripe ou
// PayPal ?"
//
// -- POURQUOI ON LIT `webhook_logs` ET PAS LES DEUX API ----------------
//
// Parce que c'est la seule source qui parle des DEUX moyens de paiement
// dans le même format. Interroger Stripe et PayPal chacun de son côté
// donnerait deux listes construites différemment, avec deux notions de
// "remboursé", et il faudrait les réconcilier à l'écran. C'est
// exactement la mécanique qui produit un écran qui ment.
//
// Et c'est déjà la table qui fait autorité : le 7 août, c'est le journal
// de production qui a tranché en dix secondes le drame Ivan, après deux
// diagnostics à l'aveugle. Une vente absente de cette table n'est jamais
// arrivée jusqu'à nous.
//
// -- UNE VENTE EST UNE SUITE D'ÉVÉNEMENTS, PAS UNE LIGNE ---------------
//
// Un achat écrit une ligne. Un remboursement en écrit une autre, deux
// jours plus tard. La vente est le PLIAGE des deux, pas la dernière
// ligne : afficher les événements bruts montrerait deux entrées pour un
// seul achat, ce qui est le bug de la distribution par résultat du
// 8 juin, transposé.
//
// Le pliage est ici, pur et testé. La route se contente de lire la table
// et de l'appeler.

/** Une ligne de `webhook_logs`, réduite à ce qu'on lit. */
export interface EventRow {
  source: string;
  event_type: string | null;
  payload: unknown;
  created_at: string;
  /** L'identifiant de l'evenement chez le fournisseur, quand il existe. */
  event_id?: string | null;
}

/**
 * D'OÙ VIENT L'ARGENT.
 *
 * `systeme_io` a été ajouté le 21 août, et c'est une correction de fond,
 * pas un ajout de confort. Béné : "sur mon dashboard je dois retrouver
 * mes clients actuels et ceux qui sont passés et passeront encore par
 * systeme io sinon c'est tout sauf fiable et exhaustif."
 *
 * Elle a raison : la totalité de ses clients payants d'aujourd'hui sont
 * arrives par Systeme.io. Un tableau de bord qui ne montre que nos
 * propres ventes affiche un chiffre d'affaires proche de zero et laisse
 * croire qu'il n'y a rien a piloter.
 *
 * **Ces ventes ne se remboursent PAS depuis chez nous** : l'argent est
 * chez Systeme.io, qui a son propre bouton. L'ecran doit le dire au lieu
 * d'afficher une action qui echouerait.
 */
import { OWNER_CATALOG } from "@/lib/checkout/catalog";

export type SaleProvider = "stripe" | "paypal" | "systeme_io";

export interface Sale {
  /** Ce qu'on rembourse. PaymentIntent chez Stripe, capture chez PayPal. */
  ref: string;
  provider: SaleProvider;
  email: string | null;
  name: string | null;
  productId: string | null;
  /** En centimes, pour ne jamais manipuler de flottant. */
  amountCents: number;
  /**
   * D'OÙ VIENT CE MONTANT, ET DONC CE QU'IL VAUT.
   *
   * `"payload"` : la somme réellement encaissée, telle que le
   *   fournisseur nous l'a envoyée. C'est la seule qui peut entrer dans
   *   un chiffre d'affaires.
   * `"plan"` : le prix AFFICHÉ du plan tarifaire, quand le payload ne
   *   porte pas de montant. Un ordre de grandeur, jamais un total : le
   *   compte de Béné a 54 codes de réduction actifs, dont certains à
   *   100 %, donc une vente remisée vaudrait moins.
   * `"inconnu"` : on ne sait pas, et `amountCents` vaut 0.
   *
   * **La mécanique est un CHAMP, pas une devinette de l'appelant.**
   * Deduire "0 = pas de montant" marcherait aujourd'hui et casserait le
   * jour d'une vente à 0 € légitime (un code GRATUIT, justement).
   */
  amountSource: "payload" | "plan" | "inconnu";
  currency: string;
  paidAt: string;
  refundedAt: string | null;
}

function lire(o: unknown): Record<string, unknown> {
  return o && typeof o === "object" ? (o as Record<string, unknown>) : {};
}
function texte(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
}

/**
 * Plie les événements en ventes.
 *
 * Les lignes peuvent arriver dans n'importe quel ordre : un
 * remboursement dont l'achat n'est pas (encore) dans la fenêtre lue ne
 * doit pas créer une vente fantôme, donc il ne fait que MARQUER une
 * vente existante. Une vente sans achat connu n'existe pas.
 */
/**
 * CE QU'ON REMBOURSE SUR UNE FACTURE D'ABONNEMENT.
 *
 * Trois formes possibles selon la version d'API du compte, et il faut
 * les trois : `payment_intent` (historique, chaîne ou objet étendu),
 * `payments[].payment.payment_intent` (versions récentes), et à défaut
 * la `charge`. Un `ch_` se rembourse aussi bien qu'un `pi_`, la route
 * de remboursement reconnaît les deux au préfixe.
 */
export function refFacture(facture: Record<string, unknown>): string | null {
  const direct = facture.payment_intent;
  const pi = typeof direct === "string" ? direct.trim() : texte(lire(direct).id);
  if (pi) return pi;

  const paiements = lire(facture.payments).data;
  if (Array.isArray(paiements)) {
    for (const entree of paiements) {
      const p = lire(lire(entree).payment).payment_intent;
      const id = typeof p === "string" ? p.trim() : texte(lire(p).id);
      if (id) return id;
    }
  }

  const charge = facture.charge;
  return (typeof charge === "string" ? charge.trim() : texte(lire(charge).id)) || null;
}

/**
 * Le produit acheté, lu sur la ligne de facture.
 *
 * Notre `metadata[product]` voyage sur l'abonnement, donc il est là la
 * plupart du temps. Cette lecture est le repli : sans elle, une échéance
 * s'afficherait sans nom de produit.
 */
export function productIdDeLaFacture(facture: Record<string, unknown>): string | null {
  // 1. Notre `metadata[product]`, posé sur l'abonnement. Stripe le
  //    recopie sur la facture dans `subscription_details`.
  const surAbo = texte(lire(lire(facture.subscription_details).metadata).product);
  if (surAbo) return surAbo;

  // 2. Sur les lignes, où il peut vivre à trois endroits selon la
  //    version d'API : la ligne, son prix, son plan.
  const lignes = lire(facture.lines).data;
  if (Array.isArray(lignes)) {
    for (const brute of lignes) {
      const ligne = lire(brute);
      const surLigne =
        texte(lire(ligne.metadata).product) ??
        texte(lire(lire(ligne.price).metadata).product) ??
        texte(lire(lire(ligne.plan).metadata).product);
      if (surLigne) return surLigne;
    }
  }

  // 3. LE MONTANT, en dernier recours.
  //
  //    Béné, 23 août : "j'ai 'produit non identifié' au lieu du nom de
  //    l'abonnement souscrit". Elle a raison de le relever : une ligne
  //    de remboursement sans nom de produit oblige à aller vérifier
  //    ailleurs CE qu'on rembourse, et c'est exactement le moment où on
  //    ne veut pas hésiter.
  //
  //    Les quatre paliers vendus ont quatre montants distincts (1700,
  //    2900, 17000, 29000) : le montant les identifie sans ambiguïté.
  //    Ce n'est pas une devinette, c'est une lecture du catalogue.
  //
  //    Une somme remisée ne correspondra à rien et rendra `null` : on
  //    préfère "non identifié" à un faux nom.
  return produitParMontant(Number(facture.amount_paid ?? 0));
}

/** Le produit du catalogue qui coûte EXACTEMENT cette somme. */
export function produitParMontant(cents: number): string | null {
  if (!Number.isFinite(cents) || cents <= 0) return null;
  for (const produit of Object.values(OWNER_CATALOG)) {
    if (produit.amountCents === cents) return produit.id;
  }
  return null;
}

export function buildSales(rows: readonly EventRow[]): Sale[] {
  const ventes = new Map<string, Sale>();
  const rembourses = new Map<string, string>();

  for (const row of rows) {
    const p = lire(row.payload);
    const type = row.event_type ?? "";

    // ── STRIPE ──
    if (row.source === "stripe") {
      const objet = lire(lire(p.data).object);

      if (type === "checkout.session.completed" || type === "checkout.session.async_payment_succeeded") {
        // On rembourse un PAIEMENT, pas une session : c'est le
        // PaymentIntent qui identifie la vente d'un bout à l'autre.
        const ref = texte(objet.payment_intent);
        if (!ref) continue;
        const details = lire(objet.customer_details);
        const meta = lire(objet.metadata);
        ventes.set(ref, {
          ref,
          provider: "stripe",
          email: texte(details.email),
          name: texte(details.name),
          productId: texte(meta.product),
          amountCents: Number(objet.amount_total ?? 0) || 0,
          // Stripe envoie la somme reellement encaissee : c'est la verite.
          amountSource: "payload",
          currency: (texte(objet.currency) ?? "eur").toLowerCase(),
          paidAt: row.created_at,
          refundedAt: null,
        });
      } else if (type === "invoice.paid") {
        // ── L'ÉCHÉANCE D'UN ABONNEMENT ──
        //
        // Béné, 23 août : "mon achat test de tiquiz par abonnement, j'ai
        // bien pu l'arrêter mais pas le rembourser depuis mon dashboard
        // admin : c'est RELOU !"
        //
        // Elle avait raison, et la cause est nette : en mode ABONNEMENT,
        // Stripe ne pose PAS de `payment_intent` sur la session (c'est
        // réservé au paiement unique). Le `if (!ref) continue` juste au
        // dessus écartait donc silencieusement toutes ses ventes Tiquiz,
        // et l'écran affichait "rien pour l'instant" sur un compte qui
        // venait de payer.
        //
        // La vente d'un abonnement, ce n'est pas la session : c'est
        // CHAQUE facture payée. Les lire ici fait d'une pierre deux
        // coups : le premier mois devient remboursable, et les mois
        // suivants apparaissent au lieu de disparaître.
        //
        // ON NE SUPPOSE PAS LA FORME DU PAYLOAD. Stripe a déplacé
        // `invoice.payment_intent` vers `payments[].payment.payment_intent`
        // dans ses versions récentes, et certaines factures ne portent
        // qu'un `charge`. On lit les trois, dans cet ordre. C'est la
        // leçon du drame Ivan : on regarde ce qu'il y a, on ne raisonne
        // pas sur ce qu'il devrait y avoir.
        const ref = refFacture(objet);
        if (!ref) continue;
        ventes.set(ref, {
          ref,
          provider: "stripe",
          email: texte(objet.customer_email) ?? texte(lire(objet.customer_details).email),
          name: texte(objet.customer_name) ?? texte(lire(objet.customer_details).name),
          productId: texte(lire(objet.metadata).product) ?? productIdDeLaFacture(objet),
          // `amount_paid` : ce qui a VRAIMENT été encaissé sur cette
          // échéance, remise comprise.
          amountCents: Number(objet.amount_paid ?? 0) || 0,
          amountSource: "payload",
          currency: (texte(objet.currency) ?? "eur").toLowerCase(),
          paidAt: row.created_at,
          refundedAt: null,
        });
      } else if (type === "charge.refunded") {
        const ref = texte(objet.payment_intent);
        if (ref) rembourses.set(ref, row.created_at);
      }
      continue;
    }

    // ── PAYPAL ──
    if (row.source === "paypal") {
      const res = lire(p.resource);
      if (type === "PAYMENT.CAPTURE.COMPLETED") {
        // La capture EST ce qu'on rembourse chez PayPal.
        const ref = texte(res.id);
        if (!ref) continue;
        const montant = lire(res.amount);
        const custom = texte(res.custom_id) ?? "";
        ventes.set(ref, {
          ref,
          provider: "paypal",
          // L'adresse n'est pas dans cet événement : la route la
          // complète en relisant la commande chez PayPal.
          email: null,
          name: null,
          productId: custom.split("|")[0] || null,
          amountCents: Math.round(Number(montant.value ?? 0) * 100) || 0,
          // PayPal aussi : la capture porte la somme reellement prise.
          amountSource: "payload",
          currency: (texte(montant.currency_code) ?? "eur").toLowerCase(),
          paidAt: row.created_at,
          refundedAt: null,
        });
      } else if (type === "PAYMENT.SALE.COMPLETED") {
        // L'ÉCHÉANCE D'UN ABONNEMENT PAYPAL, ET ELLE MANQUAIT.
        //
        // Trouvé le 25 août : cette fonction ne connaissait que
        // `PAYMENT.CAPTURE.*`, c'est à dire l'API Orders (un achat
        // unique, la forme de l'Atelier). Tiquiz vend des ABONNEMENTS,
        // qui émettent `PAYMENT.SALE.*` (API v1). Résultat : aucune
        // échéance PayPal n'apparaissait dans le tableau des ventes, ni
        // dans le chiffre d'affaires, ni sur la fiche du client.
        //
        // Et depuis le 24 août on émet une FACTURE sur cet événement :
        // il y avait donc des factures pour des ventes invisibles.
        const ref = texte(res.id);
        if (!ref) continue;
        const montant = lire(res.amount);
        // PayPal envoie ses montants en CHAÎNE ("17.00"). `Number("")`
        // vaut 0 : sans le test de chaîne vide, une échéance sans
        // montant deviendrait une vente à zéro euro.
        const brut = texte(montant.total);
        const custom = texte(res.custom_id) ?? "";
        const champs = custom.split("|");
        ventes.set(ref, {
          ref,
          provider: "paypal",
          // `custom_id` porte `<produit>|<email>|...` quand PayPal le
          // recopie de l'abonnement sur l'échéance. Quand il ne le fait
          // pas, on laisse `null` : DEVINER l'adresse rattacherait la
          // vente à la mauvaise personne, ce qui est pire que de la
          // laisser en vente orpheline (elle remonte alors dans l'admin,
          // c'est exactement le drame Ivan qui l'a fait exister).
          email: champs[1] ?? null,
          name: null,
          productId: champs[0] || null,
          amountCents: brut ? Math.round(Number(brut) * 100) || 0 : 0,
          amountSource: brut ? "payload" : "inconnu",
          currency: (texte(montant.currency) ?? "eur").toLowerCase(),
          paidAt: row.created_at,
          refundedAt: null,
        });
      } else if (type === "PAYMENT.SALE.REFUNDED") {
        // Ici le fil est direct : `sale_id` désigne la vente d'origine.
        const origine = texte(res.sale_id);
        if (origine) rembourses.set(origine, row.created_at);
      } else if (type === "PAYMENT.CAPTURE.REFUNDED") {
        // Le remboursement porte l'identifiant de la capture d'origine
        // dans ses liens : c'est le seul fil vers la vente.
        const liens = Array.isArray(res.links) ? res.links : [];
        for (const l of liens) {
          const href = texte(lire(l).href) ?? "";
          const m = href.match(/\/payments\/captures\/([^/]+)$/);
          if (m) rembourses.set(m[1], row.created_at);
        }
      }
    }
  }

  for (const [ref, quand] of rembourses) {
    const v = ventes.get(ref);
    if (v) v.refundedAt = quand;
  }

  // La plus récente en haut : c'est celle qu'on vient de faire, et donc
  // celle qu'on vient éventuellement rembourser.
  return [...ventes.values()].sort((a, b) => (a.paidAt < b.paidAt ? 1 : -1));
}

/** Le montant, écrit comme on l'affiche. */
export function formatSaleAmount(sale: Sale, locale = "fr-FR"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: sale.currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(sale.amountCents / 100);
}
