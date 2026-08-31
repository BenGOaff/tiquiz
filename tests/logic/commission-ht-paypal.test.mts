// tests/logic/commission-ht-paypal.test.mts
//
// UNE VENTE PAYPAL PAIE L'AFFILIÉE SUR LE HT, COMME UNE VENTE CARTE.
//
// Béné, 31 août 2026 : "pour l'affiliation on fait uniquement 40 % etc.
// sur le HT. Débrouille toi pour que sur PayPal ça marche aussi, il y a
// forcément un moyen de calculer chez nous la TVA si concerné ou pas et
// le montant de la commission, de manière fiable et stable."
//
// -- CE QUE LE CODE FAISAIT, ET POURQUOI ÇA NE SE VOYAIT PAS ----------
//
// Le webhook PayPal envoyait `amountTaxCents: 0` et, juste à côté,
// `base: "ht"` à Tipote. **Le champ disait "hors taxes", le nombre
// était TTC.** Un paramètre obligatoire ne protège de rien quand on lui
// ment : Tipote faisait confiance au champ et ne retirait rien.
//
// Sur le mensuel à 17 € : 40 % de 17,00 € font 6,80 € au lieu de 40 %
// de 14,17 € qui font 5,67 €. 1,13 € de trop, par échéance et par
// abonné, tous les mois, et deux affiliées payées différemment pour la
// même vente selon le moyen de paiement de leur filleul.
//
// -- LE MOYEN QU'ELLE CHERCHAIT EXISTAIT DÉJÀ -------------------------
//
// Depuis le 24 août, c'est NOUS qui émettons la facture d'une vente
// PayPal : `construireFacture` résout le régime (pays, numéro de TVA,
// réponse de VIES) et décompose le TTC. Le webhook lit désormais la
// taxe de CETTE facture là. Montant facturé et montant commissionné
// sortent du même calcul, par construction.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { describe } from "node:test";

import { commissionBaseCents } from "@/lib/checkout/commissionBase";
import { construireFacture } from "@/lib/facture/construire";
import { taxeEstUnRepli, taxePaypalCents } from "@/lib/facture/taxeVentePaypal";

const RACINE = process.cwd();
const WEBHOOK = fs.readFileSync(
  path.join(RACINE, "app/api/commande/paypal/webhook/route.ts"),
  "utf8",
);

/** Une facture PayPal comme le webhook la construit, pour ce pays là. */
function factureDe(pays: string | null, numeroTva: string | null, totalCents = 1700) {
  return construireFacture(
    "facture",
    {
      provider: "paypal",
      saleRef: "SALE-1",
      productId: "mensuel",
      libelle: "Tiquiz Mensuel",
      currency: "eur",
      totalCents,
      paidAt: "2026-08-31T10:00:00.000Z",
      emailCle: "acheteur@exemple.fr",
    },
    { pays, tvaNumero: numeroTva } as Parameters<typeof construireFacture>[2],
    numeroTva ? "valide" : "non-verifie",
  );
}

describe("La TVA d'une vente PayPal se calcule chez nous", () => {
  test("UN ACHETEUR FRANÇAIS : 17,00 EUR TTC -> commission sur 14,17 EUR", () => {
    const f = factureDe("FR", null);
    const taxe = taxePaypalCents(f, 1700);
    assert.equal(taxe, 283, "la TVA francaise sur 17,00 EUR TTC");
    assert.equal(commissionBaseCents(1700, taxe), 1417);
    // 40 % du HT = 5,67 EUR, et non 6,80 EUR.
    assert.equal(Math.round(1417 * 0.4), 567);
  });

  test("UN PROFESSIONNEL EN AUTOLIQUIDATION paie une commission sur TOUT", () => {
    // Il n'y a pas de TVA sur cette vente : le HT EST le TTC, et
    // retirer 20 % "par principe" sous-paierait l'affiliée.
    const f = factureDe("BE", "BE0123456789");
    const taxe = taxePaypalCents(f, 1700);
    assert.equal(taxe, 0);
    assert.equal(commissionBaseCents(1700, taxe), 1700);
  });

  test("UN ACHETEUR HORS UE : pas de TVA, donc rien à retirer", () => {
    const f = factureDe("CA", null);
    assert.equal(taxePaypalCents(f, 1700), 0);
  });

  test("UN ACHETEUR EUROPÉEN paie le taux de SON pays, pas le nôtre", () => {
    // Guichet unique : un particulier allemand paie 19 %, pas 20 %.
    const fr = taxePaypalCents(factureDe("FR", null), 1700);
    const de = taxePaypalCents(factureDe("DE", null), 1700);
    assert.ok(de > 0 && de !== fr, `DE ${de} vs FR ${fr} : le taux doit differer`);
  });

  test("LA TAXE COMMISSIONNÉE EST CELLE DE LA FACTURE, au centime", () => {
    // Deux calculs separes finissent toujours par se contredire, et ici
    // la contradiction se compte en euros verses.
    for (const pays of ["FR", "DE", "ES", "IT", "PT", "CA"]) {
      const f = factureDe(pays, null);
      assert.equal(taxePaypalCents(f, 1700), Math.abs(f.tvaCents), `pays ${pays}`);
      assert.equal(commissionBaseCents(1700, taxePaypalCents(f, 1700)), Math.abs(f.htCents));
    }
  });
});

describe("Sans facture, on ne devine pas : on retient, et on crie", () => {
  test("PAS DE FACTURE -> taux du pays du vendeur, jamais zéro", () => {
    // Zero voudrait dire "vente sans TVA", ce qui serait faux neuf fois
    // sur dix. Le repli SOUS-paie (rattrapable au lot suivant) plutot
    // que de SUR-payer (un virement parti ne revient pas).
    const taxe = taxePaypalCents(null, 1700);
    assert.equal(taxe, 283);
    assert.ok(taxeEstUnRepli(null, 1700), "le repli doit se signaler");
  });

  test("une taxe absurde tombe dans le repli au lieu d'etre appliquee", () => {
    assert.ok(taxeEstUnRepli({ totalCents: 1700, tvaCents: 9999 }, 1700));
    assert.ok(taxeEstUnRepli({ totalCents: 1700, tvaCents: Number.NaN }, 1700));
    assert.equal(taxePaypalCents({ totalCents: 1700, tvaCents: 9999 }, 1700), 283);
  });

  test("une taxe LÉGITIMEMENT à zéro n'est PAS un repli", () => {
    // L'autoliquidation et le hors-UE donnent zero, et c'est la verite
    // de ces ventes la : les traiter comme un repli sous-paierait
    // l'affiliee de 20 % a chaque vente professionnelle.
    assert.equal(taxeEstUnRepli({ totalCents: 1700, tvaCents: 0 }, 1700), false);
    assert.equal(taxePaypalCents({ totalCents: 1700, tvaCents: 0 }, 1700), 0);
  });

  test("un encaissement à zéro ne produit ni taxe ni alerte", () => {
    assert.equal(taxePaypalCents(null, 0), 0);
    assert.equal(taxeEstUnRepli(null, 0), false);
  });
});

describe("Le webhook PayPal ne repasse plus zéro", () => {
  test("il ne reste AUCUN `amountTaxCents: 0` dans le webhook", () => {
    // C'etait le bug, dans sa forme la plus simple.
    assert.ok(
      !/amountTaxCents:\s*0\b/.test(WEBHOOK),
      "une taxe a zero en dur : la commission repart sur le TTC",
    );
  });

  test("il passe la taxe CALCULÉE, et il crie quand il ne l'a pas", () => {
    assert.match(WEBHOOK, /taxePaypalCents\(/);
    assert.match(WEBHOOK, /taxeEstUnRepli\(/);
    assert.match(WEBHOOK, /amountTaxCents:\s*taxe\b/);
  });

  test("AUCUN TAUX DE TVA N'EST ÉCRIT EN DUR dans le webhook", () => {
    // Un acheteur belge, un professionnel en autoliquidation et un
    // acheteur hors UE n'ont pas la meme taxe : un taux de memoire les
    // paierait tous les trois faux.
    assert.ok(!/\b0\.2\b|\*\s*1\.2\b|\/\s*1\.2\b/.test(WEBHOOK), "un taux de TVA en dur");
  });
});
