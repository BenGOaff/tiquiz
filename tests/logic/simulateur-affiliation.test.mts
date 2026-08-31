// tests/logic/simulateur-affiliation.test.mts
//
// LE SIMULATEUR DE LA PAGE AFFILIATION.
//
// Béné, 31 août 2026 : "la calculatrice sur la page affiliation est
// bordélique : je veux voir combien je gagne chaque mois en fonction de
// mes affiliés, et de leurs plans."
//
// Ce que le test fige, c'est ce qu'ELLE a demandé : un chiffre MENSUEL,
// un MÉLANGE de formules, et le taux appliqué au TOTAL des filleuls.
//
// Et surtout la BASE : les commissions se calculent hors taxes
// (décision du 19 août, `COMMISSION_BASE = "ht"` chez Tipote). Un
// simulateur qui annoncerait 40 % du TTC promettrait 20 % de plus que
// ce qui sera versé : c'est exactement le drame du 19 août, où l'app
// affichait 32,90 € et payait 27,42 €.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { describe } from "node:test";

import {
  COMMISSION_BASE_PCT,
  commissionCentsAuTaux,
  simulerParPlan,
  tauxCommissionPct,
} from "@/lib/site/recompenseAffiliation";
import { OWNER_CATALOG } from "@/lib/checkout/catalog";

describe("La rente mensuelle, à partir d'un mélange de formules", () => {
  test("UN FILLEUL MENSUEL RAPPORTE 40 % DU HT, jamais du TTC", () => {
    // 17,00 EUR TTC -> 14,17 EUR HT -> 5,67 EUR. Le blog annonçait
    // 6,80 EUR (40 % du TTC) : 20 % de plus que ce qui sera versé.
    assert.equal(commissionCentsAuTaux("mensuel", 40), 567);
    assert.equal(OWNER_CATALOG.mensuel.amountCents, 1700);
  });

  test("le total est MENSUEL, et une formule annuelle y est LISSÉE", () => {
    // Un filleul annuel paie une fois par an : le porter dans un total
    // mensuel suppose qu'on étale sa commission sur douze mois. C'est
    // la seule façon d'additionner deux récurrences, et l'écran le dit.
    const s = simulerParPlan({ annuel: 12 });
    const parAn = 12 * commissionCentsAuTaux("annuel", s.tauxPct);
    assert.equal(s.mensuelCents, Math.round(parAn / 12));
    assert.equal(s.annuelCents, Math.round(parAn));
  });

  test("LE TAUX S'APPLIQUE AU TOTAL DES FILLEULS, pas palier par palier", () => {
    // C'est ce que fait `attributeSale` chez Tipote : le taux est posé
    // sur l'AFFILIÉ (`recompense_commission_pct`), pas sur la vente.
    // Découper par palier donnerait un taux plus bas que celui versé.
    const s = simulerParPlan({ mensuel: 6, annuel: 6 });
    assert.equal(s.filleuls, 12);
    assert.equal(s.tauxPct, tauxCommissionPct(12));
    assert.ok(s.tauxPct > COMMISSION_BASE_PCT, `taux ${s.tauxPct}`);
  });

  test("le total est la somme des lignes affichées, au centime près", () => {
    // Arrondir chaque ligne puis les additionner ferait que le total
    // affiché ne serait pas la somme des lignes affichées. C'est le
    // genre d'écart qu'un affilié relève, et qui coûte la confiance.
    const s = simulerParPlan({ mensuel: 7, annuel: 3, "mensuel-plus": 5 });
    const somme = s.lignes.reduce((t, l) => t + l.mensuelCents, 0);
    assert.ok(Math.abs(somme - s.mensuelCents) <= s.lignes.length, `${somme} vs ${s.mensuelCents}`);
  });

  test("zéro filleul ne promet rien", () => {
    const s = simulerParPlan({});
    assert.equal(s.filleuls, 0);
    assert.equal(s.mensuelCents, 0);
    assert.equal(s.annuelCents, 0);
  });

  test("une saisie absurde ne casse pas l'écran", () => {
    // Le champ est un `<input type=number>` : on y colle ce qu'on veut.
    const s = simulerParPlan({ mensuel: -5, annuel: Number.NaN });
    assert.equal(s.filleuls, 0);
    assert.equal(s.mensuelCents, 0);
  });

  test("les quatre formules du catalogue sont proposées", () => {
    // Un palier vendu et absent du simulateur, c'est une vente que
    // l'affilié ne sait pas qu'il peut faire.
    const s = simulerParPlan({});
    assert.deepEqual(
      s.lignes.map((l) => l.produit),
      ["mensuel", "annuel", "mensuel-plus", "annuel-plus"],
    );
  });
});

const SRC = fs.readFileSync(
  path.join(process.cwd(), "components/site/SimulateurAffiliation.tsx"),
  "utf8",
);

describe("L'écran montre les deux options, il n'arbitre plus", () => {
  test("il ne demande plus SON abonnement avant de montrer un chiffre", () => {
    const src = SRC;
    // Interroger quelqu'un sur un abonnement qu'il n'a pas encore, sur
    // la page qui doit le convaincre, c'est une porte fermée.
    assert.ok(!src.includes("planPerso"), "le plan perso ne doit plus etre demande");
    assert.ok(!src.includes("Ton propre abonnement"), "l'ancien bloc est encore la");
  });

  test("il n'arbitre plus entre les deux récompenses", () => {
    // "Ce que tu as intérêt à choisir" est une décision qui se prend
    // dans l'espace affilié, avec ses VRAIS filleuls.
    const src = SRC;
    assert.ok(!src.includes("gagnante"), "l'arbitrage est encore la");
    assert.ok(src.includes("Augmenter tes commissions"), "l'option 1 doit etre nommee");
    assert.ok(src.includes("Faire baisser ton abonnement"), "l'option 2 doit etre nommee");
  });

  test("LE CHIFFRE MENSUEL EST L'ÉLÉMENT PRINCIPAL", () => {
    const src = SRC;
    // Sa question est mensuelle. Le total sur douze mois reste dit,
    // mais en dessous.
    assert.ok(src.includes("Ta rente, chaque mois"), "le titre du resultat");
    assert.ok(
      src.indexOf("Ta rente, chaque mois") < src.indexOf("Augmenter tes commissions"),
      "le chiffre doit passer AVANT les deux options",
    );
  });

  test("le lissage annuel est DIT à l'écran, jamais caché", () => {
    const src = SRC;
    assert.match(SRC, /lissée sur douze mois/);
    assert.match(SRC, /hors taxes/);
  });
});
