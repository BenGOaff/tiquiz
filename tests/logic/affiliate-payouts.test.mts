// tests/logic/affiliate-payouts.test.mts
//
// CE QUE BÉNÉ DOIT À SES AFFILIÉES, ET CE QU'IL LUI RESTE.
//
// Ces montants finissent en virements à de vraies personnes, et sur
// l'écran de l'affiliée EN FACE. Une divergence entre les deux chiffres
// n'a pas de bonne réponse : elle lit un montant, Béné en lit un autre,
// et il faut choisir qui a tort.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  buildAffiliatePayouts,
  HOLD_DAYS,
  readCommissionStage,
  type CommissionRow,
} from "../../lib/admin/affiliatePayouts.ts";

const MAINTENANT = new Date("2026-08-22T12:00:00Z");

function ilYA(jours: number): string {
  return new Date(MAINTENANT.getTime() - jours * 24 * 3600 * 1000).toISOString();
}

function ligne(over: Partial<CommissionRow> = {}): CommissionRow {
  return {
    source: "tiquiz",
    sa: "sa0016",
    saleCents: 1700,
    commissionCents: 567,
    status: "pending",
    saleAt: ilYA(60),
    ...over,
  };
}

// ── LE CYCLE D'UNE COMMISSION ──

test("moins de 30 jours : sous garantie, donc PAS a provisionner", () => {
  // Un remboursement peut encore l'annuler. L'afficher comme "a sortir"
  // ferait mettre de cote de l'argent qui ne sortira peut etre jamais.
  assert.equal(readCommissionStage(ligne({ saleAt: ilYA(1) }), MAINTENANT), "guarantee");
  assert.equal(readCommissionStage(ligne({ saleAt: ilYA(29) }), MAINTENANT), "guarantee");
});

test("passe 30 jours : acquise", () => {
  assert.equal(readCommissionStage(ligne({ saleAt: ilYA(31) }), MAINTENANT), "payable");
  assert.equal(readCommissionStage(ligne({ saleAt: ilYA(400) }), MAINTENANT), "payable");
});

test("la fenetre est celle du satisfait ou rembourse", () => {
  assert.equal(HOLD_DAYS, 30);
});

test("versee ou annulee : le statut brut gagne sur la date", () => {
  assert.equal(readCommissionStage(ligne({ status: "paid", saleAt: ilYA(1) }), MAINTENANT), "paid");
  for (const s of ["refunded", "cancelled", "rejected", "REFUNDED"]) {
    assert.equal(readCommissionStage(ligne({ status: s }), MAINTENANT), "refunded");
  }
  // Une date de remboursement suffit, meme si le statut n'a pas suivi :
  // les deux bases ne remplissent pas les memes colonnes.
  assert.equal(
    readCommissionStage(ligne({ status: "pending", refundedAt: ilYA(5) }), MAINTENANT),
    "refunded",
  );
});

test("une date de vente illisible ne cache pas la commission pour toujours", () => {
  // Sans date on ne peut pas dire si la garantie est passee. On la
  // considere ACQUISE : ces lignes sont anciennes, et les compter en
  // garantie les rendrait invisibles a vie.
  assert.equal(readCommissionStage(ligne({ saleAt: null }), MAINTENANT), "payable");
  assert.equal(readCommissionStage(ligne({ saleAt: "pas une date" }), MAINTENANT), "payable");
});

// ── CE QU'ON DOIT, PAR AFFILIÉE ──

test("chaque etage tombe dans la bonne colonne", () => {
  const out = buildAffiliatePayouts(
    [
      ligne({ saleAt: ilYA(60), commissionCents: 500 }), // acquise
      ligne({ saleAt: ilYA(5), commissionCents: 300 }), // garantie
      ligne({ saleAt: ilYA(90), commissionCents: 200, status: "paid" }), // versee
      ligne({ saleAt: ilYA(70), commissionCents: 100, status: "refunded" }), // annulee
    ],
    MAINTENANT,
  );
  const a = out.affiliates[0];
  assert.equal(a.payableCents, 500);
  assert.equal(a.guaranteeCents, 300);
  assert.equal(a.paidCents, 200);
  assert.equal(a.refundedCents, 100);
});

test("une vente remboursee ne compte NI dans les ventes NI dans le mois", () => {
  // L'argent est reparti. Le laisser dans le chiffre d'affaires
  // gonflerait le benefice restant d'une somme qu'elle n'a plus.
  const out = buildAffiliatePayouts(
    [
      ligne({ saleAt: ilYA(60), saleCents: 1700, commissionCents: 567 }),
      ligne({ saleAt: ilYA(60), saleCents: 4700, commissionCents: 2742, status: "refunded" }),
    ],
    MAINTENANT,
  );
  const a = out.affiliates[0];
  assert.equal(a.salesCount, 1);
  assert.equal(a.salesCents, 1700);
  assert.equal(out.months[0].salesCents, 1700);
  assert.equal(out.months[0].commissionCents, 567);
});

test("une affiliee qui vend les deux produits n'apparait qu'une fois", () => {
  const out = buildAffiliatePayouts(
    [
      ligne({ source: "tiquiz", saleCents: 1700, commissionCents: 567 }),
      ligne({ source: "atelier", saleCents: 4700, commissionCents: 2742 }),
    ],
    MAINTENANT,
  );
  assert.equal(out.affiliates.length, 1);
  assert.deepEqual(out.affiliates[0].sources.sort(), ["atelier", "tiquiz"]);
  assert.equal(out.affiliates[0].salesCents, 6400);
  assert.equal(out.totals.sellers, 1);
});

test("le nom se recupere sur n'importe quelle ligne qui le porte", () => {
  // Les deux bases ne connaissent pas forcement son nom. Afficher un
  // identifiant nu alors qu'on a le nom a cote serait absurde.
  const out = buildAffiliatePayouts(
    [
      ligne({ name: null, email: null }),
      ligne({ name: "Martine", email: "Martine@Exemple.fr" }),
    ],
    MAINTENANT,
  );
  assert.equal(out.affiliates[0].name, "Martine");
  assert.equal(out.affiliates[0].email, "Martine@Exemple.fr");
});

test("le tri met en tete celle qui rapporte le plus", () => {
  const out = buildAffiliatePayouts(
    [
      ligne({ sa: "sa0001", saleCents: 1700 }),
      ligne({ sa: "sa0002", saleCents: 9400 }),
      ligne({ sa: "sa0003", saleCents: 4700 }),
    ],
    MAINTENANT,
  );
  assert.deepEqual(
    out.affiliates.map((a) => a.sa),
    ["sa0002", "sa0003", "sa0001"],
  );
});

// ── CE QU'IL TE RESTE ──

test("le net d'un mois, c'est ce qui rentre moins ce qui ressort", () => {
  const out = buildAffiliatePayouts(
    [
      ligne({ saleAt: "2026-08-03T10:00:00Z", saleCents: 4700, commissionCents: 2742 }),
      ligne({ saleAt: "2026-08-19T10:00:00Z", saleCents: 1700, commissionCents: 567 }),
      ligne({ saleAt: "2026-07-02T10:00:00Z", saleCents: 4700, commissionCents: 2742 }),
    ],
    MAINTENANT,
  );
  const aout = out.months.find((m) => m.key === "2026-08");
  assert.ok(aout);
  assert.equal(aout.salesCents, 6400);
  assert.equal(aout.commissionCents, 3309);
  assert.equal(aout.netCents, 3091);
  assert.equal(aout.salesCount, 2);
  // Le plus recent en premier : c'est le mois en cours qu'elle regarde.
  assert.equal(out.months[0].key, "2026-08");
  assert.equal(out.months[1].key, "2026-07");
});

test("le net compte la commission MEME sous garantie", () => {
  // C'est voulu, et c'est l'inverse du KPI "a verser". Le benefice d'un
  // mois doit refleter ce que ce mois coute, pas ce qui est deja
  // versable : sinon il parait genereux le mois de la vente et fond le
  // mois suivant, sans qu'aucune vente n'ait bouge.
  const out = buildAffiliatePayouts(
    [ligne({ saleAt: ilYA(2), saleCents: 4700, commissionCents: 2742 })],
    MAINTENANT,
  );
  assert.equal(out.months[0].netCents, 1958);
  assert.equal(out.totals.payableCents, 0);
  assert.equal(out.totals.guaranteeCents, 2742);
});

test("l'historique est borne a 12 mois", () => {
  const lignes = Array.from({ length: 20 }, (_, i) =>
    ligne({ saleAt: `2025-${String((i % 12) + 1).padStart(2, "0")}-05T10:00:00Z` }),
  );
  assert.ok(buildAffiliatePayouts(lignes, MAINTENANT).months.length <= 12);
});

// ── LES CAS QUI NE DOIVENT RIEN CASSER ──

test("une liste vide rend des zeros, pas une erreur", () => {
  const out = buildAffiliatePayouts([], MAINTENANT);
  assert.deepEqual(out.affiliates, []);
  assert.deepEqual(out.months, []);
  assert.equal(out.totals.payableCents, 0);
  assert.equal(out.totals.sellers, 0);
});

test("une ligne sans identifiant d'affiliee est ecartee", () => {
  // Sans `sa` on ne sait a QUI verser. La compter dans un total
  // fabriquerait une dette sans destinataire.
  const out = buildAffiliatePayouts(
    [ligne({ sa: "" }), ligne({ sa: "   " }), ligne({ sa: "sa0016" })],
    MAINTENANT,
  );
  assert.equal(out.affiliates.length, 1);
});

test("des montants absurdes ne produisent jamais de negatif", () => {
  const out = buildAffiliatePayouts(
    [
      ligne({ saleCents: -500, commissionCents: -200 }),
      ligne({ saleCents: Number.NaN, commissionCents: Number.NaN }),
    ],
    MAINTENANT,
  );
  assert.equal(out.totals.salesCents, 0);
  assert.equal(out.totals.payableCents, 0);
});

// ── LES DEUX MOITIÉS ──

test("l'ecran DIT quand une moitie manque", () => {
  // Regle du 8 juin : on n'affiche pas un total dont le denominateur
  // ment. "Tu dois 240 EUR" alors que l'Atelier manque a l'air juste, et
  // se provisionne.
  const src = fs.readFileSync(
    path.join(process.cwd(), "components/admin/AffiliesCard.tsx"),
    "utf8",
  );
  assert.ok(src.includes("INCOMPLETS"), "l'ecran ne signale plus une source manquante");
  const carte = src.indexOf("manquantes.length > 0");
  const chiffres = src.indexOf("À verser");
  assert.ok(carte > 0 && chiffres > carte, "l'avertissement passe APRES les chiffres");
});

test("les deux sources sont lues en parallele et ne jettent jamais", () => {
  const src = fs.readFileSync(
    path.join(process.cwd(), "lib/admin/affiliateSources.ts"),
    "utf8",
  );
  assert.ok(src.includes("Promise.all"), "les deux serveurs s'attendent l'un l'autre");
  // Un `throw` ici ferait tomber tout l'ecran pour une panne qui ne
  // concerne qu'une moitie.
  assert.ok(!/^\s*throw /m.test(src), "une source qui tombe fait tomber l'ecran");
});
