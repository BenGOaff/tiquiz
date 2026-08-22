// tests/logic/webhook-rows.test.mts
//
// CE QUE BÉNÉ VOYAIT LE 22 AOÛT 2026, SUR SON ONGLET "MES VENTES" :
//
//   - trois optins gratuits marqués "non reconnu" EN ROUGE, alors que
//     les trois comptes avaient été créés normalement. Ils entrent par
//     `/api/systeme-io/free-optin`, une route qui ne consulte JAMAIS la
//     table de routage : on leur reprochait un mécanisme qui ne les
//     concerne pas. C'est mot pour mot le drame Véronique du 1er août
//     (les contrôles "profil" appliqués à un quiz scoré) ;
//   - un badge rouge "1 sans accès ouvert" pointant la vente d'Ivan du
//     7 août, dont le plan est reconnu depuis le jour même. Une alerte
//     qui reste rouge après la correction est une alerte qu'on arrête
//     de lire ;
//   - huit lignes "transient_failure" en rouge, qui sont des cartes
//     bancaires refusées chez Systeme.io. Rien à corriger chez nous.

import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  compterActions,
  demandeUneAction,
  readCallKind,
  readCallVerdict,
  routageConcerne,
} from "../../lib/admin/webhookRows.ts";

test("un optin gratuit n'est pas jugé par la table de routage", () => {
  // Le tunnel `tiquiz-free` n'est PAS dans URL_TO_PLAN, et c'est sans
  // importance : cette route crée un compte gratuit sans rien router.
  const row = {
    source: "systeme_io_free_optin",
    eventType: "free_optin",
    status: null,
    error: null,
    planNow: null,
  };
  assert.equal(readCallKind(row.source), "free_optin");
  assert.equal(routageConcerne("free_optin"), false);
  assert.equal(readCallVerdict(row), "sans-objet");
  assert.equal(demandeUneAction(readCallVerdict(row)), false);
});

test("la vente d'Ivan, refusée hier, reconnue aujourd'hui, n'alerte plus", () => {
  const hier = {
    source: "systeme_io",
    eventType: "customer.sale.completed",
    status: "refused",
    error: "unknown_offer:3375217",
    planNow: null,
  };
  assert.equal(readCallVerdict(hier), "sans-acces");
  assert.equal(demandeUneAction(readCallVerdict(hier)), true);

  // Le seul changement : la table de routage connait desormais l'offre.
  const aujourdhui = { ...hier, planNow: "monthly" };
  assert.equal(readCallVerdict(aujourdhui), "corrige-depuis");
  assert.equal(demandeUneAction(readCallVerdict(aujourdhui)), false);
});

test("une vente encore inconnue reste rouge, elle", () => {
  const row = {
    source: "systeme_io",
    eventType: "customer.sale.completed",
    status: "refused",
    error: "unknown_offer:9999999",
    planNow: null,
  };
  assert.equal(readCallVerdict(row), "sans-acces");
  assert.equal(demandeUneAction(readCallVerdict(row)), true);
});

test("une carte refusee chez Systeme.io n'est pas une panne chez nous", () => {
  for (const status of ["transient_failure", null]) {
    const row = {
      source: "systeme_io",
      eventType: "subscription.payment.failed",
      status,
      error: null,
      planNow: null,
    };
    assert.equal(readCallVerdict(row), "paiement-echoue");
    assert.equal(demandeUneAction(readCallVerdict(row)), false);
  }
});

test("un acces ouvert par repli se voit, sans crier a l'aide", () => {
  const row = {
    source: "systeme_io",
    eventType: "customer.sale.completed",
    status: "granted_fallback",
    error: "unknown_offer:3375217→granted:monthly",
    planNow: null,
  };
  // Le client A ses acces : ce n'est pas "sans acces".
  assert.equal(readCallVerdict(row), "palier-a-confirmer");
  assert.equal(demandeUneAction(readCallVerdict(row)), false);
});

test("une panne de notre cote reste une alerte", () => {
  const row = {
    source: "systeme_io",
    eventType: "customer.sale.completed",
    status: "error",
    error: "upsert:boom",
    planNow: "monthly",
  };
  assert.equal(readCallVerdict(row), "panne");
  assert.equal(demandeUneAction(readCallVerdict(row)), true);
});

test("une vente a nous n'est jamais jugee par le routage Systeme.io", () => {
  for (const source of ["stripe", "paypal"]) {
    assert.equal(readCallKind(source), "owner");
    assert.equal(
      readCallVerdict({
        source,
        eventType: "checkout.session.completed",
        status: "processed",
        error: null,
        planNow: null,
      }),
      "sans-objet",
    );
  }
});

test("le badge compte ce qui demande une action, et rien d'autre", () => {
  // Exactement la liste de son ecran du 22 aout.
  const rows = [
    { source: "systeme_io_free_optin", eventType: "free_optin", status: null, error: null, planNow: null },
    { source: "systeme_io_free_optin", eventType: "free_optin", status: null, error: null, planNow: null },
    { source: "systeme_io", eventType: "customer.sale.completed", status: "refused", error: "unknown_offer:3375217", planNow: "monthly" },
    { source: "systeme_io", eventType: "subscription.payment.failed", status: "transient_failure", error: null, planNow: null },
    { source: "systeme_io", eventType: "customer.sale.completed", status: "processed", error: null, planNow: "monthly" },
    { source: "stripe", eventType: "charge.refunded", status: null, error: null, planNow: null },
  ];
  assert.equal(compterActions(rows), 0);

  // Et une VRAIE vente sans acces la fait remonter a 1.
  assert.equal(
    compterActions([
      ...rows,
      { source: "systeme_io", eventType: "customer.sale.completed", status: "refused", error: "unknown_offer:4242424", planNow: null },
    ]),
    1,
  );
});
