// tests/logic/landing.test.mts
//
// LA LANDING NE RECOPIE AUCUN PRIX NI AUCUNE FONCTIONNALITÉ.
//
// Béné, 4 septembre 2026 : "putain mais tu les as les fonctionnalités
// pour les tarifs : sur la page de vente, et puis dans le code !!"
//
// Elle avait raison. Le bloc tarifs de la landing n'affichait aucune
// fonctionnalité, et j'avais annoncé que c'était parce que je ne savais
// pas ce que le gratuit ouvre. `lib/checkout/avantages.ts` est LA source
// depuis le 2 septembre, et `FREE_LIMITS` porte les limites du gratuit :
// il n'y avait rien à demander, seulement à lire.
//
// Ce que ce filet tient, dans l'ordre d'importance :
//
//   1. les prix viennent de `OWNER_CATALOG`, jamais écrits dans le module ;
//   2. les lignes viennent de `avantages.ts`, jamais réécrites ;
//   3. les limites du gratuit viennent de `FREE_LIMITS`, et TOUS les
//      trous sont bouchés (le bug du 4 septembre : `replace` avec une
//      chaîne ne remplace que la première occurrence, donc l'écran
//      affichait "1 quiz et {quiz} sondage" alors que `tsc` était vert) ;
//   4. aucune langue écrite ne laisse un champ à trou.

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  LANDING,
  avantagesPartages,
  colonnesDeTarif,
  contenuLanding,
} from "@/lib/site/landing";
import {
  AVANTAGES_COMMUNS,
  AVANTAGES_NOUVEAUX,
  AVANTAGES_PAYANTS,
  AVANTAGES_PLUS,
} from "@/lib/checkout/avantages";
import { OWNER_CATALOG, formatOwnerPrice } from "@/lib/checkout/catalog";
import { FREE_LIMITS } from "@/lib/planLimits";

import { readFileSync } from "node:fs";
import { join } from "node:path";

const SOURCE = readFileSync(join(process.cwd(), "lib/site/landing.ts"), "utf8");
/** Le module SANS ses commentaires : sinon un contrôle tombe sur sa propre explication. */
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

describe("la landing lit les tarifs, elle ne les recopie pas", () => {
  test("aucun prix n'est écrit dans le module", () => {
    for (const id of ["mensuel", "annuel", "mensuel-plus", "annuel-plus"] as const) {
      const euros = String(Math.round(OWNER_CATALOG[id].amountCents / 100));
      assert.ok(
        !new RegExp(`["'\`][^"'\`]*\\b${euros}\\s*€`).test(CODE),
        `le prix ${euros} € est écrit en dur dans lib/site/landing.ts`,
      );
    }
  });

  test("les trois colonnes portent les prix du catalogue", () => {
    const c = colonnesDeTarif(LANDING.fr);
    assert.equal(c.length, 3);
    assert.equal(c[1].prix, formatOwnerPrice(OWNER_CATALOG["mensuel"]));
    assert.ok(c[1].prixAn?.includes(formatOwnerPrice(OWNER_CATALOG["annuel"])));
    assert.equal(c[2].prix, formatOwnerPrice(OWNER_CATALOG["mensuel-plus"]));
    assert.ok(c[2].prixAn?.includes(formatOwnerPrice(OWNER_CATALOG["annuel-plus"])));
    // Le gratuit n'est pas au catalogue : il n'a pas de prix annuel.
    assert.equal(c[0].prixAn, null);
  });

  test("les fonctionnalités viennent de avantages.ts, au mot près", () => {
    const c = colonnesDeTarif(LANDING.fr);
    assert.deepEqual([...c[1].lignes], AVANTAGES_PAYANTS.map((a) => a.texte));
    assert.deepEqual([...c[2].lignes], AVANTAGES_PLUS.map((a) => a.texte));
    assert.deepEqual(
      [...avantagesPartages()],
      [...AVANTAGES_COMMUNS, ...AVANTAGES_NOUVEAUX].map((a) => a.texte),
    );
  });

  test("les limites du gratuit viennent de FREE_LIMITS", () => {
    for (const langue of Object.keys(LANDING)) {
      const lignes = colonnesDeTarif(LANDING[langue])[0].lignes.join(" | ");
      assert.ok(
        lignes.includes(String(FREE_LIMITS.maxQuizzesPerMode)),
        `${langue} : la limite de quiz n'apparaît pas`,
      );
      assert.ok(
        lignes.includes(String(FREE_LIMITS.visibleLeadsPerMonth)),
        `${langue} : la limite de réponses visibles n'apparaît pas`,
      );
    }
  });

  test("AUCUN champ à trou ne sort à l'écran", () => {
    // Le bug du 4 septembre : `replace("{quiz}", …)` ne remplaçait que
    // la première occurrence, et la ligne en portait deux. `tsc` était
    // vert, l'écran affichait "1 quiz et {quiz} sondage".
    for (const langue of Object.keys(LANDING)) {
      const t = LANDING[langue];
      const rendu = [
        ...colonnesDeTarif(t).flatMap((c) => [c.nom, c.prix, c.cadence, c.prixAn ?? "", ...c.lignes]),
        ...avantagesPartages(),
      ].join(" | ");
      assert.ok(
        !/[{][a-z]+[}]/.test(rendu),
        `${langue} : un champ à trou reste affiché -> ${rendu.match(/[{][a-z]+[}]/g)?.join(", ")}`,
      );
    }
  });
});

describe("les langues écrites", () => {
  test("une langue inconnue retombe sur l'anglais, jamais sur le français", () => {
    assert.equal(contenuLanding("de").langue, "en");
    assert.equal(contenuLanding(null).langue, "en");
    assert.equal(contenuLanding("fr").langue, "fr");
    // Une variante régionale retombe sur sa langue de base.
    assert.equal(contenuLanding("en-GB").langue, "en");
  });

  test("aucun tiret cadratin dans le texte affiché", () => {
    for (const langue of Object.keys(LANDING)) {
      const t = LANDING[langue];
      const tout = JSON.stringify(t);
      assert.ok(
        !/[—–]/.test(tout),
        `${langue} : tiret cadratin ou demi-cadratin dans le texte de la landing`,
      );
    }
  });
});
