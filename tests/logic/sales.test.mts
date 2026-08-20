// tests/logic/sales.test.mts
//
// LE TABLEAU DES VENTES, ET CE QU'IL NE DOIT JAMAIS MONTRER.
//
// Béné, 20 août 2026 : "je vais avoir un truc dans mon dashboard admin
// pour gérer directement les refund etc. ?"
//
// Une vente est une SUITE d'événements, pas une ligne : l'achat en écrit
// un, le remboursement en écrit un autre deux jours plus tard. Afficher
// les événements bruts montrerait DEUX entrées pour un seul achat, ce
// qui est exactement le bug de la distribution par résultat du 8 juin,
// transposé au tableau des ventes.

import { test } from "node:test";
import assert from "node:assert/strict";

import { buildSales, formatSaleAmount, type EventRow } from "../../lib/checkout/sales.ts";

function achatStripe(pi: string, quand: string, email = "gwenn@exemple.fr"): EventRow {
  return {
    source: "stripe",
    event_type: "checkout.session.completed",
    created_at: quand,
    payload: {
      data: {
        object: {
          id: "cs_1",
          payment_intent: pi,
          amount_total: 4700,
          currency: "eur",
          customer_details: { email, name: "Gwenn" },
          metadata: { product: "atelier" },
        },
      },
    },
  };
}

function remboursementStripe(pi: string, quand: string): EventRow {
  return {
    source: "stripe",
    event_type: "charge.refunded",
    created_at: quand,
    payload: { data: { object: { id: "ch_1", payment_intent: pi, amount: 4700, amount_refunded: 4700 } } },
  };
}

test("un achat puis son remboursement font UNE ligne, pas deux", () => {
  const ventes = buildSales([
    remboursementStripe("pi_1", "2026-08-22T09:00:00Z"),
    achatStripe("pi_1", "2026-08-20T10:43:00Z"),
  ]);
  assert.equal(ventes.length, 1, "le remboursement a cree une deuxieme ligne");
  assert.equal(ventes[0].email, "gwenn@exemple.fr");
  assert.equal(ventes[0].amountCents, 4700);
  assert.equal(ventes[0].refundedAt, "2026-08-22T09:00:00Z");
});

test("un remboursement dont l'achat est hors de la fenetre ne cree PAS de vente fantome", () => {
  // La lecture est bornee (500 lignes). Un remboursement d'une vente
  // plus ancienne que la fenetre arriverait seul : il ne doit rien
  // inventer, sinon le tableau afficherait une vente sans acheteur.
  const ventes = buildSales([remboursementStripe("pi_inconnu", "2026-08-22T09:00:00Z")]);
  assert.deepEqual(ventes, []);
});

test("les ventes sont triees, la plus recente en haut", () => {
  const ventes = buildSales([
    achatStripe("pi_vieux", "2026-08-01T10:00:00Z"),
    achatStripe("pi_recent", "2026-08-20T10:00:00Z"),
  ]);
  assert.deepEqual(
    ventes.map((v) => v.ref),
    ["pi_recent", "pi_vieux"],
  );
});

test("on rembourse le PAIEMENT, pas la session", () => {
  // C'est le PaymentIntent qui identifie une vente d'un bout a l'autre :
  // c'est lui que Stripe attend pour rembourser, et c'est lui que porte
  // l'evenement de remboursement. Prendre l'identifiant de session
  // rendrait le bouton Rembourser inoperant.
  const ventes = buildSales([achatStripe("pi_1", "2026-08-20T10:00:00Z")]);
  assert.equal(ventes[0].ref, "pi_1");
  assert.equal(ventes[0].provider, "stripe");
});

test("PayPal : la vente porte l'identifiant de CAPTURE", () => {
  // Chez PayPal, c'est la capture qu'on rembourse, pas la commande.
  const ventes = buildSales([
    {
      source: "paypal",
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      created_at: "2026-08-20T11:00:00Z",
      payload: {
        resource: {
          id: "CAP123",
          custom_id: "atelier|GWENN23",
          amount: { value: "47.00", currency_code: "EUR" },
        },
      },
    },
  ]);
  assert.equal(ventes.length, 1);
  assert.equal(ventes[0].ref, "CAP123");
  assert.equal(ventes[0].provider, "paypal");
  assert.equal(ventes[0].amountCents, 4700, "47.00 EUR doit valoir 4700 centimes");
  assert.equal(ventes[0].productId, "atelier");
  // L'adresse n'est pas dans cet evenement : la route la complete.
  assert.equal(ventes[0].email, null);
});

test("PayPal : le remboursement retrouve sa capture par le lien", () => {
  const ventes = buildSales([
    {
      source: "paypal",
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      created_at: "2026-08-20T11:00:00Z",
      payload: {
        resource: { id: "CAP123", custom_id: "atelier", amount: { value: "47.00", currency_code: "EUR" } },
      },
    },
    {
      source: "paypal",
      event_type: "PAYMENT.CAPTURE.REFUNDED",
      created_at: "2026-08-23T08:00:00Z",
      payload: {
        resource: {
          id: "REF999",
          links: [
            { rel: "self", href: "https://api-m.paypal.com/v2/payments/refunds/REF999" },
            { rel: "up", href: "https://api-m.paypal.com/v2/payments/captures/CAP123" },
          ],
        },
      },
    },
  ]);
  assert.equal(ventes.length, 1, "le remboursement a cree une deuxieme ligne");
  assert.equal(ventes[0].refundedAt, "2026-08-23T08:00:00Z");
});

test("les deux moyens de paiement cohabitent dans le meme tableau", () => {
  const ventes = buildSales([
    achatStripe("pi_1", "2026-08-20T10:00:00Z"),
    {
      source: "paypal",
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      created_at: "2026-08-21T10:00:00Z",
      payload: {
        resource: { id: "CAP1", custom_id: "atelier", amount: { value: "47.00", currency_code: "EUR" } },
      },
    },
  ]);
  assert.equal(ventes.length, 2);
  assert.deepEqual(
    ventes.map((v) => v.provider),
    ["paypal", "stripe"],
  );
});

test("un evenement qu'on ne sait pas lire n'invente pas de vente", () => {
  // L'absence ferme, partout. Un payload vide, un type inconnu, une
  // source etrangere : rien ne doit apparaitre dans le tableau.
  const ventes = buildSales([
    { source: "stripe", event_type: "customer.created", created_at: "2026-08-20T10:00:00Z", payload: {} },
    { source: "systeme_io", event_type: "SALE", created_at: "2026-08-20T10:00:00Z", payload: {} },
    { source: "stripe", event_type: "checkout.session.completed", created_at: "2026-08-20T10:00:00Z", payload: null },
  ]);
  assert.deepEqual(ventes, []);
});

test("le montant s'affiche en euros avec deux decimales", () => {
  const [vente] = buildSales([achatStripe("pi_1", "2026-08-20T10:00:00Z")]);
  // Espace insecable dans le format francais : on compare sur le chiffre.
  assert.ok(formatSaleAmount(vente).startsWith("47,00"), formatSaleAmount(vente));
});
