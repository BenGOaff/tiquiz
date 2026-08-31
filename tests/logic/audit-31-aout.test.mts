// tests/logic/audit-31-aout.test.mts
//
// L'AUDIT DU 31 AOÛT : LA COMMISSION RÉCURRENTE TENAIT À LA VERSION
// D'API DE STRIPE.
//
// Béné : "je vais démarcher de très gros affiliés, je ne peux pas me
// permettre de proposer un système instable."
//
// Trois défauts, et les trois ont la même forme : **une valeur lue à
// UN seul endroit, alors qu'elle vit à deux selon la version d'API du
// compte.** Aucun ne plante, aucun n'écrit une ligne d'erreur. C'est le
// silence du 7 août ("raisonner sur la forme SUPPOSÉE d'un payload au
// lieu de la regarder"), transposé à ce qui paie les affiliés.
//
//  1. `invoice.subscription` -> `invoice.parent.subscription_details`.
//     Lu à la racine seulement, `invoice.paid` sortait en "ce n'est pas
//     un abonnement" : l'affilié touchait le premier mois et plus rien
//     ensuite.
//  2. `invoice.tax` -> `invoice.total_taxes[]`. Absent, la taxe valait
//     zéro et la commission se calculait sur le TTC : 1,13 EUR de trop
//     par vente et par mois, le MÊME écart que le 26 août.
//  3. `subscription.current_period_end` -> sur les LIGNES. Absente, la
//     date annoncée à qui descend de palier disparaissait.
//
// Et deux trous d'identité affiliée sur les changements de palier : la
// montée PayPal ouvre un abonnement NEUF, la descente Stripe passe par
// un calendrier. Les deux perdaient l'affiliée en route.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { describe } from "node:test";

import {
  abonnementDeLaFacture,
  finDePeriodeAbonnement,
  metaAbonnementDeLaFacture,
  montantAbonnement,
  taxeDeLaFacture,
} from "@/lib/checkout/formeStripe";
import { metadonneesDeLaPhaseSuivante } from "@/lib/checkout/planChangeStripe";
import { OWNER_SUBSCRIPTION_EVENTS } from "@/lib/checkout/subscriptionLifecycle";
import { OWNER_CATALOG } from "@/lib/checkout/catalog";

const lire = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

const webhook = lire("app/api/commande/webhook/route.ts");
const changePlan = lire("app/api/billing/change-plan/route.ts");
const scriptStripe = lire("scripts/check-stripe.mjs");

// ── 1. L'ABONNEMENT D'UNE FACTURE ────────────────────────────────────

describe("L'abonnement d'une facture se lit sous ses DEUX formes", () => {
  test("la forme historique, à la racine", () => {
    assert.equal(abonnementDeLaFacture({ subscription: "sub_123" }), "sub_123");
  });

  test("LA FORME RÉCENTE : sous `parent`", () => {
    // C'EST LE BUG. Sans cette lecture, `invoice.paid` répondait "ce
    // n'est pas un abonnement" et aucune commission récurrente ne
    // partait, pour personne, sans une ligne d'erreur.
    assert.equal(
      abonnementDeLaFacture({
        parent: { subscription_details: { subscription: "sub_456" } },
      }),
      "sub_456",
    );
  });

  test("l'objet étendu compte autant que la chaîne", () => {
    assert.equal(abonnementDeLaFacture({ subscription: { id: "sub_789" } }), "sub_789");
  });

  test("sur les lignes, quand la facture n'en dit rien", () => {
    assert.equal(
      abonnementDeLaFacture({
        lines: { data: [{ parent: { subscription_item_details: { subscription: "sub_l" } } }] },
      }),
      "sub_l",
    );
  });

  test("UN ACHAT UNIQUE REND `null`, et ça doit le rester", () => {
    // C'est ce qui distingue une échéance d'un achat à l'unité. Une
    // lecture trop généreuse commissionnerait deux fois le même
    // paiement, sous deux clés que l'unicité ne verrait pas.
    assert.equal(abonnementDeLaFacture({ id: "in_1", amount_paid: 1700 }), null);
    assert.equal(abonnementDeLaFacture(null), null);
  });
});

// ── 2. LA TVA D'UNE FACTURE ──────────────────────────────────────────

describe("La TVA d'une facture décide de 1,13 EUR par mois", () => {
  test("la forme historique", () => {
    assert.equal(taxeDeLaFacture({ tax: 283 }), 283);
  });

  test("LA FORME RÉCENTE : une liste de taxes", () => {
    assert.equal(taxeDeLaFacture({ total_taxes: [{ amount: 200 }, { amount: 83 }] }), 283);
  });

  test("la forme intermédiaire, servie par beaucoup de comptes", () => {
    assert.equal(taxeDeLaFacture({ total_tax_amounts: [{ amount: 283 }] }), 283);
  });

  test("ZÉRO EST UNE RÉPONSE LÉGITIME, et c'est ce qui cachait le bug", () => {
    // Un client hors UE ne paie aucune TVA. Une taxe absente et une taxe
    // nulle se ressemblent donc à l'écran, et l'écart partait en
    // commission tous les mois sans que rien ne le dise.
    assert.equal(taxeDeLaFacture({ tax: 0, total_taxes: [] }), 0);
    assert.equal(taxeDeLaFacture({}), 0);
  });
});

// ── 3. LA FIN DE PÉRIODE ─────────────────────────────────────────────

describe("La fin de période se lit sur l'abonnement OU sur ses lignes", () => {
  test("la forme historique", () => {
    assert.equal(finDePeriodeAbonnement({ current_period_end: 1_800_000_000 }), 1_800_000_000);
  });

  test("LA FORME RÉCENTE : sur les lignes", () => {
    assert.equal(
      finDePeriodeAbonnement({ items: { data: [{ current_period_end: 1_800_000_000 }] } }),
      1_800_000_000,
    );
  });

  test("plusieurs lignes : la PLUS LOINTAINE", () => {
    // C'est la date à laquelle l'abonnement dans son ensemble se
    // renouvelle. Annoncer la plus proche promettrait une bascule qui
    // n'arrivera pas ce jour là.
    assert.equal(
      finDePeriodeAbonnement({
        items: { data: [{ current_period_end: 100 }, { current_period_end: 900 }] },
      }),
      900,
    );
  });

  test("rien de lisible rend `null`, jamais 0", () => {
    // Une date absente vaut mieux qu'une date fausse : 0 se traduirait
    // en 1er janvier 1970 sur l'écran d'une cliente.
    assert.equal(finDePeriodeAbonnement({}), null);
    assert.equal(finDePeriodeAbonnement({ current_period_end: 0 }), null);
  });
});

// ── 4. LE RESTE DE LA FACTURE ────────────────────────────────────────

describe("Les metadonnées et le montant suivent la même règle", () => {
  test("les metadonnées de l'abonnement, sous les deux formes", () => {
    assert.equal(
      metaAbonnementDeLaFacture({ subscription_details: { metadata: { product: "mensuel" } } }).product,
      "mensuel",
    );
    assert.equal(
      metaAbonnementDeLaFacture({
        parent: { subscription_details: { metadata: { product: "annuel-plus" } } },
      }).product,
      "annuel-plus",
    );
  });

  test("le montant d'un abonnement", () => {
    const lu = montantAbonnement({
      items: { data: [{ price: { unit_amount: 1700, currency: "EUR" } }] },
    });
    assert.equal(lu.amountCents, 1700);
    assert.equal(lu.currency, "eur");
  });
});

// ── 5. LE WEBHOOK LES APPELLE VRAIMENT ───────────────────────────────

describe("Le webhook de paiement passe par ces lectures", () => {
  test("l'abonnement d'une facture ne se lit plus à la racine seule", () => {
    assert.match(webhook, /abonnementDeLaFacture\(objet\)/);
    // L'ancienne lecture ne doit pas revenir : c'est elle qui coupait
    // les commissions récurrentes.
    assert.doesNotMatch(webhook, /surLAbonnement \? objet\.id : objet\.subscription/);
  });

  test("LA TAXE VIENT DE `taxeDeLaFacture`, jamais de `facture.tax`", () => {
    assert.match(webhook, /const taxe = taxeDeLaFacture\(facture\)/);
    assert.doesNotMatch(webhook, /Number\(facture\.tax \?\? 0\)/);
  });

  test("la fin de période aussi", () => {
    assert.match(webhook, /finDePeriodeAbonnement\(abonnement\)/);
  });

  test("UNE RELECTURE RATÉE NE COÛTE PLUS UN MOIS D'AFFILIÉ", () => {
    // Les metadonnées de l'abonnement sont recopiées sur la facture :
    // une seconde d'API indisponible ne doit pas faire disparaître la
    // commission, d'autant que le webhook aura répondu 200 et que le
    // réessai de Stripe n'y changerait rien.
    assert.match(webhook, /metaAbonnementDeLaFacture\(facture\)/);
    assert.match(webhook, /if \(eventType === "invoice\.paid"\) \{/);
  });
});

// ── 6. L'AFFILIÉE SURVIT À UN CHANGEMENT DE PALIER ───────────────────

describe("Monter ou descendre de palier ne change pas qui a amené le client", () => {
  test("LA MONTÉE PAYPAL RECOPIE L'AFFILIÉE SUR L'ABONNEMENT NEUF", () => {
    // PayPal ne sait pas changer le palier : on ouvre un abonnement
    // NEUF, dont le `custom_id` naissait sans affiliée. Le repli par
    // conversion en base ne rattrape que ceux qui ont DÉJÀ eu une
    // commission : quelqu'un qui monte pendant son mois offert n'en a
    // aucune, donc son affiliée n'était plus jamais payée.
    assert.match(changePlan, /affiliateRef: abo\.affiliateRef/);
    assert.match(changePlan, /affiliateCode: abo\.affiliateCode/);
    assert.match(changePlan, /affiliateRef: affiliation\.affiliateRef/);
    assert.match(changePlan, /affiliateCode: affiliation\.affiliateCode/);
  });

  test("LA DESCENTE STRIPE REPORTE TOUTES LES METADONNÉES", () => {
    const meta = metadonneesDeLaPhaseSuivante(
      {
        metadata: {
          product: "mensuel-plus",
          source: "stripe",
          affiliate_code: "jocelyne",
          free_month_days: "30",
        },
      },
      OWNER_CATALOG.mensuel,
    );
    // Ce qui PAIE survit à la bascule.
    assert.equal(meta.affiliate_code, "jocelyne");
    assert.equal(meta.free_month_days, "30");
    // Et le palier décrit la phase QUI COMMENCE, pas celle qui finit.
    assert.equal(meta.product, "mensuel");
    assert.equal(meta.source, "stripe");
  });

  test("une metadonnée hors gabarit est LÂCHÉE, jamais toute la descente", () => {
    // Stripe borne une clé à 40 caractères et une valeur à 500 : une
    // entrée trop longue ferait REFUSER la mise à jour entière, donc la
    // descente que la cliente vient de demander.
    const meta = metadonneesDeLaPhaseSuivante(
      { metadata: { ["x".repeat(41)]: "trop long", affiliate_code: "y".repeat(501), ok: "1" } },
      OWNER_CATALOG.annuel,
    );
    assert.equal(meta["x".repeat(41)], undefined);
    assert.equal(meta.affiliate_code, undefined);
    assert.equal(meta.ok, "1");
    assert.equal(meta.product, "annuel");
  });

  test("un abonnement sans metadonnée reste descendable", () => {
    const meta = metadonneesDeLaPhaseSuivante(null, OWNER_CATALOG.mensuel);
    assert.deepEqual(meta, { product: "mensuel", source: "stripe" });
  });
});

// ── 7. LE CONTRÔLE QUI DIT CE QUE STRIPE ÉCOUTE ──────────────────────

describe("`npm run check:stripe` ne peut pas dériver en silence", () => {
  test("il connaît TOUS les événements d'abonnement qu'on écoute", () => {
    // Le script tourne sur le serveur avec `node`, sans build : sa
    // liste est recopiée, donc elle peut vieillir. Un événement écouté
    // par le code et absent du contrôle, c'est un événement qui manque
    // chez Stripe sans que rien ne le dise.
    for (const evenement of OWNER_SUBSCRIPTION_EVENTS) {
      assert.ok(
        scriptStripe.includes(`"${evenement}"`),
        `${evenement} est écouté par le webhook mais absent de check-stripe.mjs`,
      );
    }
  });

  test("les deux événements de PAIEMENT y sont aussi", () => {
    assert.ok(scriptStripe.includes('"checkout.session.completed"'));
    assert.ok(scriptStripe.includes('"checkout.session.async_payment_succeeded"'));
  });

  test("IL N'IMPRIME JAMAIS DE SECRET", () => {
    // Ce rapport finit dans un terminal, un historique, parfois un
    // copier-coller. Même règle que `check-prod.mjs`.
    // La clé ne sort JAMAIS telle quelle : on n'en dit que la FAMILLE
    // (réel ou test), qui est ce qui rend un diagnostic évident.
    const impressions = scriptStripe
      .split("\n")
      .filter((l) => /console\.(log|error)/.test(l));
    for (const ligne of impressions) {
      assert.ok(!ligne.includes("${cle}"), `la cle est imprimee telle quelle : ${ligne.trim()}`);
    }
    assert.match(scriptStripe, /startsWith\("sk_live"\)/);
  });
});
