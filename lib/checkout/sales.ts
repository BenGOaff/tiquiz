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
}

export type SaleProvider = "stripe" | "paypal";

export interface Sale {
  /** Ce qu'on rembourse. PaymentIntent chez Stripe, capture chez PayPal. */
  ref: string;
  provider: SaleProvider;
  email: string | null;
  name: string | null;
  productId: string | null;
  /** En centimes, pour ne jamais manipuler de flottant. */
  amountCents: number;
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
          currency: (texte(montant.currency_code) ?? "eur").toLowerCase(),
          paidAt: row.created_at,
          refundedAt: null,
        });
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
