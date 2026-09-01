// tests/logic/sio-tags.test.mts
//
// LES MÊMES ÉTIQUETTES DES DEUX CÔTÉS (Béné, 22 août).
//
// "on utilise les mêmes pour ceux qui vont payer via notre système comme
// ça je ne suis pas perdue."
//
// Ses automatisations et ses séquences d'emails sont bâties sur ces
// tags. Un client payé par notre bon de commande et mal taggé sort de
// tous ses scénarios sans que rien ne le signale.
//
// Et le contrôle d'écart, en bas de ce fichier, est celui qui aurait
// rattrapé Ivan le jour même : `tiquiz-mensuel` chez Systeme.io, `free`
// chez nous, pendant qu'on attendait qu'il écrive.

import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  PLAN_TO_TAG,
  TAGS_TIQUIZ,
  comparerTagEtPlan,
  readPlanFromTag,
  readSioTag,
} from "../../lib/sio/tags.ts";

test("les tags sont ceux qui existent VRAIMENT dans son compte", () => {
  // Relevés le 22 août 2026. Un tag inventé serait créé en double à la
  // première vente, et sa liste porterait deux tags qui veulent
  // dire la même chose.
  for (const tag of Object.values(PLAN_TO_TAG)) {
    assert.ok(
      (TAGS_TIQUIZ as readonly string[]).includes(tag),
      `${tag} n'existe pas dans son compte Systeme.io`,
    );
  }
});

test("chaque palier a son etiquette", () => {
  assert.equal(readSioTag("monthly"), "tiquiz-mensuel");
  assert.equal(readSioTag("yearly"), "tiquiz-annuel");
  assert.equal(readSioTag("monthly_plus"), "tiquiz-mensuel-plus");
  assert.equal(readSioTag("yearly_plus"), "tiquiz-annuel-plus");
  assert.equal(readSioTag("free"), "tiquiz-free");
  assert.equal(readSioTag("lifetime"), "tiquiz-beta");
});

test("un palier inconnu ne pose AUCUN tag", () => {
  // Poser un tag au flair etiquetterait un client dans le mauvais
  // segment, et une sequence partirait a la mauvaise personne.
  assert.equal(readSioTag("bidule"), null);
  assert.equal(readSioTag(null), null);
  assert.equal(readSioTag(""), null);
});

test("la variante americaine dit la devise, pas le produit", () => {
  assert.equal(readPlanFromTag("tiquiz-mensuel-us"), "monthly");
  assert.equal(readPlanFromTag("tiquiz-annuel-us"), "yearly");
});

test("un tag qui n'est pas un palier ne devient pas un palier", () => {
  assert.equal(readPlanFromTag("tiquiz-affilié"), null);
  assert.equal(readPlanFromTag("tiquiz-visiteur"), null);
  assert.equal(readPlanFromTag("autre-chose"), null);
});

// ── LE CONTRÔLE D'ÉCART ──────────────────────────────────────────────

test("le cas Ivan : marque payant chez eux, gratuit chez nous", () => {
  assert.equal(
    comparerTagEtPlan({ tags: ["tiquiz-mensuel"], planChezNous: "free" }),
    "acces-manquant",
  );
});

test("payant chez nous sans etiquette en face", () => {
  assert.equal(
    comparerTagEtPlan({ tags: ["tiquiz-free"], planChezNous: "monthly" }),
    "tag-manquant",
  );
});

test("les deux sont payants mais pas au meme palier", () => {
  assert.equal(
    comparerTagEtPlan({ tags: ["tiquiz-annuel"], planChezNous: "monthly" }),
    "palier-different",
  );
});

test("un changement de palier en cours ne declenche pas de fausse alerte", () => {
  // Le temps que l'ancien tag soit retire, le contact porte les deux.
  assert.equal(
    comparerTagEtPlan({
      tags: ["tiquiz-mensuel", "tiquiz-annuel"],
      planChezNous: "yearly",
    }),
    null,
  );
});

test("tout va bien = rien a dire", () => {
  assert.equal(comparerTagEtPlan({ tags: ["tiquiz-mensuel"], planChezNous: "monthly" }), null);
  // Gratuit des deux cotes : ce n'est pas un ecart.
  assert.equal(comparerTagEtPlan({ tags: ["tiquiz-free"], planChezNous: "free" }), null);
  assert.equal(comparerTagEtPlan({ tags: [], planChezNous: "free" }), null);
  assert.equal(comparerTagEtPlan({ tags: [], planChezNous: null }), null);
});
