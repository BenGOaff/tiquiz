// tests/logic/echeances-systeme-io.test.mts
//
// "PEUT-ÊTRE QUE LE WEBHOOK N'EST PAS APPELÉ PARCE QUE C'EST PAS UNE
//  NOUVELLE VENTE MAIS UN ABONNEMENT QUI SE CONTINUE ? IL FAUT LE
//  TRAQUER AUSSI." (Béné, 11 septembre 2026)
//
// Lu dans le journal du serveur : Systeme.io rappelle le webhook pour une
// commande DÉJÀ traitée, avec le même identifiant de commande. Ces
// rappels étaient écartés sans trace ; ils sont journalisés en
// `duplicate` depuis le 11 septembre, et le tableau de bord doit les
// compter comme des échéances quand ils tombent un mois après.
//
// Ce que ces tests tiennent :
//   - une relivraison à quelques minutes ne compte PAS deux fois ;
//   - une échéance un mois après compte, nommée comme telle ;
//   - la vente d'ORIGINE garde sa date (le piège du dédoublonnage) ;
//   - un rappel qui dit un échec ou une annulation n'est pas un
//     encaissement ;
//   - le tableau de bord demande bien `status`, sinon rien de tout ça
//     ne peut se voir ;
//   - les scripts de contrôle démarrent sur le Node 20 du serveur.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { buildSioSales, ECART_MIN_JOURS_ECHEANCE } from "../../lib/admin/sioSales.ts";
import { buildSales, type EventRow } from "../../lib/checkout/sales.ts";
import { sansCommentaires } from "./aide/sansCommentaires.mts";

const VENTE = {
  type: "customer.sale.completed",
  customer: { email: "Client@Exemple.fr", first_name: "Fatima" },
  pricePlan: { id: 3375217, amount: 1700 },
  order: { id: 12384179, total_price: "17.00" },
};

function ligne(extra: Partial<EventRow>): EventRow {
  return {
    source: "systeme_io",
    event_type: "customer.sale.completed",
    event_id: "sio_order_12384179",
    status: "processed",
    created_at: "2026-09-10T10:00:00Z",
    payload: VENTE,
    ...extra,
  } as EventRow;
}

// Les lignes arrivent de la plus RÉCENTE à la plus ancienne, comme le
// tableau de bord les lit.
const ORIGINE = ligne({});
const RELIVRAISON = ligne({ status: "duplicate", created_at: "2026-09-10T10:03:00Z" });
const ECHEANCE = ligne({ status: "duplicate", created_at: "2026-10-10T10:01:00Z" });
const ECHEANCE_2 = ligne({ status: "duplicate", created_at: "2026-11-10T10:01:00Z" });

test("une relivraison à trois minutes ne compte pas deux fois", () => {
  const v = buildSioSales([RELIVRAISON, ORIGINE]);
  assert.equal(v.length, 1);
  assert.equal(v[0].nature, "premiere");
});

test("LE PIÈGE : la vente d'origine garde SA date, la relivraison ne la remplace pas", () => {
  // Avant : la clé était l'identifiant de commande et la ligne la plus
  // récente gagnait. Une relivraison journalisée aurait donc DÉPLACÉ la
  // vente à sa propre date, sans la compter deux fois : un chiffre
  // d'affaires juste au mois près, faux au jour près.
  const v = buildSioSales([RELIVRAISON, ORIGINE]);
  assert.equal(v[0].paidAt, "2026-09-10T10:00:00Z");
  assert.equal(v[0].ref, "sio_order_12384179");
});

test("une échéance un mois après COMPTE, et elle est nommée", () => {
  const v = buildSioSales([ECHEANCE, RELIVRAISON, ORIGINE]);
  assert.equal(v.length, 2);
  const e = v.find((s) => s.nature === "echeance");
  assert.ok(e, "l'échéance doit être là");
  assert.equal(e.paidAt, "2026-10-10T10:01:00Z");
  assert.equal(e.amountCents, 1700);
  assert.equal(e.amountSource, "payload");
  assert.equal(e.productId, "monthly");
  assert.equal(e.email, "client@exemple.fr");
  assert.notEqual(e.ref, v[0].ref, "deux lignes, deux références");
});

test("chaque échéance devient la référence de la suivante", () => {
  const v = buildSioSales([ECHEANCE_2, ECHEANCE, ORIGINE]);
  assert.equal(v.filter((s) => s.nature === "echeance").length, 2);
  // Une relivraison de la DEUXIÈME échéance, trois minutes après elle.
  const rejeu = ligne({ status: "duplicate", created_at: "2026-11-10T10:04:00Z" });
  const v2 = buildSioSales([rejeu, ECHEANCE_2, ECHEANCE, ORIGINE]);
  assert.equal(v2.length, 3, "le rejeu de la 2e échéance ne compte pas");
});

test("le seuil est LOIN des deux groupes", () => {
  // Relivraisons : des minutes, des heures. Échéances : 28 jours au
  // moins. Un seuil qui départage à la limite crie sur du travail juste.
  assert.ok(ECART_MIN_JOURS_ECHEANCE >= 7, "au dessus de n'importe quel cycle de relance");
  assert.ok(ECART_MIN_JOURS_ECHEANCE <= 27, "en dessous du plus court renouvellement");
});

test("un rappel qui dit un échec ou une annulation n'est pas un encaissement", () => {
  for (const type of ["subscription.payment.failed", "SALE_CANCELED", "order.refunded"]) {
    const v = buildSioSales([ligne({ status: "duplicate", event_type: type, created_at: "2026-10-10T10:01:00Z" }), ORIGINE]);
    assert.equal(v.length, 1, type);
  }
});

test("un rappel sans identifiant de commande n'est pas une échéance", () => {
  const v = buildSioSales([ligne({ status: "duplicate", event_id: null, created_at: "2026-10-10T10:01:00Z" }), ORIGINE]);
  assert.equal(v.length, 1);
});

test("une ligne d'AVANT le 11 septembre (sans statut) se lit comme avant", () => {
  const ancienne = ligne({ status: undefined });
  const v = buildSioSales([ancienne]);
  assert.equal(v.length, 1);
  assert.equal(v[0].nature, "premiere");
});

test("une échéance Stripe est nommée avec la même règle", () => {
  const facture = (raison: string, ref: string): EventRow => ({
    source: "stripe",
    event_type: "invoice.paid",
    created_at: "2026-09-10T10:00:00Z",
    payload: { data: { object: { billing_reason: raison, payment_intent: ref, amount_paid: 1700, currency: "eur", metadata: { product: "mensuel" } } } },
  });
  const v = buildSales([facture("subscription_create", "pi_1"), facture("subscription_cycle", "pi_2")]);
  assert.equal(v.find((s) => s.ref === "pi_1")?.nature, "premiere");
  assert.equal(v.find((s) => s.ref === "pi_2")?.nature, "echeance");
});

test("le tableau de bord demande `status`, sinon aucune échéance ne peut se voir", () => {
  const src = sansCommentaires(readFileSync("app/api/admin/pilotage/route.ts", "utf8"));
  const select = src.match(/\.select\("([^"]*received_at[^"]*)"\)/)?.[1] ?? "";
  assert.match(select, /\bstatus\b/);
});

test("l'onglet Ventes écrit « échéance » sur ces lignes", () => {
  const src = sansCommentaires(readFileSync("components/pilotage/VentesPilotage.tsx", "utf8"));
  assert.match(src, /nature === "echeance"/);
  assert.match(src, /échéance/);
});

test("LES SCRIPTS DE CONTRÔLE DÉMARRENT SUR LE NODE 20 DU SERVEUR", () => {
  // `node: bad option: --experimental-strip-types` (Béné, 11 septembre,
  // sur le serveur). Le drapeau n'existe qu'à partir de Node 22.6 ; tout
  // script destiné au SERVEUR passe par `tsx`, qui est une dépendance
  // installée par `npm ci`.
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const serveur = Object.entries(pkg.scripts as Record<string, string>).filter(([nom]) => nom.startsWith("check:"));
  assert.ok(serveur.length >= 10);
  for (const [nom, cmd] of serveur) {
    assert.ok(!cmd.includes("--experimental-strip-types"), `${nom} ne démarre pas sur Node 20 : ${cmd}`);
  }
  assert.ok(pkg.devDependencies?.tsx, "tsx doit être une dépendance, pas un `npx` qui va sur le réseau");
  const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
  assert.ok(lock.packages?.["node_modules/tsx"], "le lock doit porter tsx, sinon `npm ci` ne l'installe pas");
});
