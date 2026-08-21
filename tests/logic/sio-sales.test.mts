// tests/logic/sio-sales.test.mts
//
// "SINON C'EST TOUT SAUF FIABLE ET EXHAUSTIF" (Béné, 21 août 2026.)
//
// "Sur mon dashboard je dois retrouver mes clients actuels et ceux qui
// sont passés et passeront encore par systeme io."
//
// Elle avait raison, et mon premier écran l'avouait en bas de page : il
// ne lisait que nos propres ventes, alors que la TOTALITÉ de ses clients
// payants d'aujourd'hui sont arrivés par Systeme.io. Un tableau de bord
// qui annonce un chiffre d'affaires proche de zéro est pire qu'un écran
// vide, parce qu'il a l'air de marcher.
//
// Ces tests portent sur ce qui rendrait l'écran FAUX :
//
//   - compter un optin gratuit comme une vente ;
//   - compter deux fois un événement rejoué ;
//   - lire 17.00 euros comme 17 centimes, ou l'inverse.

import { test } from "node:test";
import assert from "node:assert/strict";

import { buildSioSales, readSioAmountCents } from "../../lib/admin/sioSales.ts";
import type { EventRow } from "../../lib/checkout/sales.ts";

function evt(extra: Partial<EventRow> & { payload?: unknown }): EventRow {
  return {
    source: "systeme_io",
    event_type: "customer.sale.completed",
    created_at: "2026-08-10T10:00:00Z",
    payload: {},
    ...extra,
  } as EventRow;
}

/** La forme OBSERVEE d'une vente Systeme.io (drame Ivan, 7 aout). */
const VENTE = {
  type: "customer.sale.completed",
  customer: { email: "Client@Exemple.fr", first_name: "Ivan" },
  pricePlan: { id: 3375217, amount: 1700 },
};

test("LE BUG : une vente Systeme.io apparait dans le tableau de bord", () => {
  const v = buildSioSales([evt({ payload: VENTE })]);
  assert.equal(v.length, 1);
  assert.equal(v[0].provider, "systeme_io");
  assert.equal(v[0].email, "client@exemple.fr", "l'adresse doit etre en minuscules");
  assert.equal(v[0].amountCents, 1700);
  assert.equal(v[0].paidAt, "2026-08-10T10:00:00Z");
});

test("le PLAN est lu avec la meme fonction que le webhook", () => {
  // Reecrire une table de correspondance ici la ferait diverger de celle
  // qui decide vraiment, et le tableau de bord annoncerait un palier
  // different de celui que le client a recu.
  const v = buildSioSales([evt({ payload: VENTE })]);
  assert.equal(v[0].productId, "monthly");
});

test("UN OPTIN GRATUIT N'EST PAS UNE VENTE", () => {
  // Il passe par le meme webhook. Le compter gonflerait le nombre de
  // ventes et ferait un chiffre d'affaires a zero euro par vente.
  const optin = evt({
    event_type: "contact.opt_in",
    payload: { contact: { email: "curieuse@x.fr" }, funnel: { url: "tipote.fr/tiquiz-gratuit" } },
  });
  assert.deepEqual(buildSioSales([optin]), []);
});

test("un echec de paiement ou une annulation ne sont pas des ventes", () => {
  for (const type of [
    "subscription.payment.failed",
    "subscription.cancelled",
    "customer.sale.refunded",
  ]) {
    assert.deepEqual(buildSioSales([evt({ event_type: type, payload: VENTE })]), [], type);
  }
});

test("les evenements des AUTRES sources sont ignores", () => {
  // Chaque lecteur filtre sur sa source : sans ca, une vente Stripe
  // serait comptee deux fois quand on concatene les deux listes.
  const stripe = evt({ source: "stripe", event_type: "checkout.session.completed" });
  assert.deepEqual(buildSioSales([stripe]), []);
});

test("UN EVENEMENT REJOUE NE COMPTE PAS DEUX FOIS", () => {
  // Un chiffre d'affaires gonfle dans un tableau de bord est pire qu'une
  // absence de chiffre : il fait prendre de mauvaises decisions.
  const a = evt({ event_id: "sio_42", payload: VENTE });
  const b = evt({ event_id: "sio_42", payload: VENTE });
  assert.equal(buildSioSales([a, b]).length, 1);
});

test("sans identifiant, la cle composee evite quand meme le doublon", () => {
  const a = evt({ payload: VENTE });
  const b = evt({ payload: VENTE });
  assert.equal(buildSioSales([a, b]).length, 1);
  // Mais deux ventes a des dates differentes restent DEUX ventes : c'est
  // un renouvellement, et un renouvellement est du chiffre d'affaires.
  const c = evt({ created_at: "2026-09-10T10:00:00Z", payload: VENTE });
  assert.equal(buildSioSales([a, c]).length, 2);
});

test("17.00 EUROS ET 1700 CENTIMES sont le meme montant", () => {
  // Systeme.io envoie tantot l'un tantot l'autre selon l'evenement, et
  // afficher 0,17 EUR au lieu de 17 EUR ferait douter de tout l'ecran.
  assert.equal(readSioAmountCents(1700), 1700, "un montant vendu connu est deja en centimes");
  assert.equal(readSioAmountCents("1700"), 1700);
  // 17 n'est pas un montant vendu, mais 1700 en est un : c'etait donc
  // des euros. On tranche sur ce qu'on a VRAIMENT vendu, pas au flair.
  assert.equal(readSioAmountCents(17), 1700, "17 euros doit valoir 1700 centimes");
  assert.equal(readSioAmountCents(170), 17000, "l'annuel aussi");
  assert.equal(readSioAmountCents(29), 2900, "le PLUS aussi");
});

test("LE PIEGE : une valeur ECRITE avec des decimales est en euros", () => {
  // C'est ce que le test a attrape au premier jet. `Number("17.00")`
  // vaut 17, un ENTIER : lire le nombre au lieu du texte perd
  // l'information et affichait 0,17 EUR.
  assert.equal(readSioAmountCents("17.00"), 1700);
  assert.equal(readSioAmountCents("17,50"), 1750, "la virgule francaise est acceptee");
  assert.equal(readSioAmountCents(170.5), 17050);
  assert.equal(readSioAmountCents("4.99"), 499);
});

test("un montant illisible ne fabrique pas un chiffre", () => {
  for (const v of [null, undefined, "", "gratuit", 0, -5, Number.NaN]) {
    assert.equal(readSioAmountCents(v), null, JSON.stringify(v));
  }
  // Et la vente reste VISIBLE, a zero : elle a eu lieu, on ne la cache
  // pas parce qu'on ne sait pas lire son montant.
  const v = buildSioSales([
    evt({ payload: { type: "customer.sale.completed", customer: { email: "a@x.fr" } } }),
  ]);
  assert.equal(v.length, 1);
  assert.equal(v[0].amountCents, 0);
});

test("un produit qu'on ne sait pas nommer n'est pas perdu", () => {
  const v = buildSioSales([
    evt({
      payload: { type: "customer.sale.completed", customer: { email: "a@x.fr" }, pricePlan: { id: 999999 } },
    }),
  ]);
  assert.equal(v[0].productId, "inconnu");
});

test("ON N'INVENTE PAS UN REMBOURSEMENT qu'on n'a jamais observe", () => {
  // Lecon du 7 aout : "raisonner sur la forme SUPPOSEE d'un payload au
  // lieu de la regarder". On n'a pas d'evenement de remboursement
  // Systeme.io observe dans les journaux, donc on n'en fabrique pas.
  const v = buildSioSales([evt({ payload: VENTE })]);
  assert.equal(v[0].refundedAt, null);
});
