// tests/logic/remise-abonnement-affilie.test.mts
//
// Béné, 25 août 2026 : "il a 10 affiliés abonnés, son abonnement baisse
// de 10 %, il en a 20 il gagne 20 %, il en a 100 ben il paye plus rien."
//
// Ce fichier surveille le côté TIQUIZ : ce qui est POSÉ sur un
// abonnement. Le décompte et le choix vivent chez Tipote, avec le
// registre des affiliés, et leur test aussi.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  actionRemise,
  couponFidelite,
  lireRemisePosee,
} from "../../lib/checkout/remiseAbonnement.ts";

// ── Ce qu'on fait de l'abonnement ────────────────────────────────────

test("on ne repose PAS une remise déjà bonne", () => {
  // Chaque pose crée un coupon chez Stripe. Sans ce contrôle, on aurait
  // douze coupons par an pour une seule remise, et le jour où l'un
  // d'eux se cumulerait, personne ne saurait d'où il vient.
  assert.deepEqual(
    actionRemise({ gagnee: 20, posee: { pct: 20, couponId: "co_1" } }),
    { action: "rien" },
  );
});

test("une remise qui change est REMPLACÉE", () => {
  assert.deepEqual(
    actionRemise({ gagnee: 30, posee: { pct: 20, couponId: "co_1" } }),
    { action: "poser", pct: 30 },
  );
  // Et une baisse aussi : le recalcul est mensuel, il corrige dans les
  // deux sens.
  assert.deepEqual(
    actionRemise({ gagnee: 10, posee: { pct: 20, couponId: "co_1" } }),
    { action: "poser", pct: 10 },
  );
});

test("plus de filleuls actifs : la remise est RETIRÉE", () => {
  assert.deepEqual(
    actionRemise({ gagnee: 0, posee: { pct: 20, couponId: "co_1" } }),
    { action: "retirer" },
  );
});

test("sans remise gagnée ni remise posée, on ne touche à rien", () => {
  // C'est le cas de l'immense majorité des abonnés : ils ne sont pas
  // affiliés, et cette tâche ne doit rien faire sur leur abonnement.
  assert.deepEqual(
    actionRemise({ gagnee: 0, posee: { pct: null, couponId: null } }),
    { action: "rien" },
  );
  assert.deepEqual(
    actionRemise({ gagnee: null, posee: { pct: null, couponId: null } }),
    { action: "rien" },
  );
});

test("un pourcentage absurde ne pose RIEN", () => {
  // Sur de l'argent, un doute se tranche en faveur du prix plein.
  for (const p of [-10, 101, NaN, Infinity]) {
    const a = actionRemise({ gagnee: p, posee: { pct: null, couponId: null } });
    assert.equal(a.action, "rien", `pct ${p}`);
  }
});

// ── Lire ce qui est déjà posé, sans supposer la forme ────────────────

test("la remise posée se lit dans les DEUX formes de Stripe", () => {
  // Stripe a fait évoluer ce champ : un abonnement porte soit un
  // `discount` (objet), soit `discounts` (tableau). Lire une seule des
  // deux marcherait aujourd'hui et casserait à la prochaine version de
  // l'API : c'est la leçon du drame Ivan (raisonner sur la forme
  // SUPPOSÉE d'un payload).
  assert.deepEqual(
    lireRemisePosee({ discount: { coupon: { id: "co_a", percent_off: 20 } } }),
    { pct: 20, couponId: "co_a" },
  );
  assert.deepEqual(
    lireRemisePosee({ discounts: [{ coupon: { id: "co_b", percent_off: 30 } }] }),
    { pct: 30, couponId: "co_b" },
  );
});

test("un abonnement sans remise se lit comme tel", () => {
  assert.deepEqual(lireRemisePosee(null), { pct: null, couponId: null });
  assert.deepEqual(lireRemisePosee({}), { pct: null, couponId: null });
  assert.deepEqual(lireRemisePosee({ discounts: [] }), { pct: null, couponId: null });
  // Une remise en montant fixe n'est pas une remise en pourcentage : on
  // ne la lit pas comme telle, on la laisse tranquille.
  assert.deepEqual(
    lireRemisePosee({ discounts: [{ coupon: { id: "co_c", amount_off: 500 } }] }),
    { pct: null, couponId: null },
  );
});

test("le coupon de fidélité se reconnaît et ne sert qu'une fois", () => {
  const c = couponFidelite(20);
  assert.equal(c.percent_off, 20);
  assert.equal(c.duration, "forever");
  assert.equal(c.max_redemptions, 1);
  assert.equal(c["metadata[fidelite_affilie]"], "1");
});

// ── Ce que la tâche planifiée ne doit JAMAIS faire ───────────────────

test("une liste illisible ne retire la remise de PERSONNE", () => {
  // "Je n'ai pas pu regarder" et "personne n'y a droit" n'appellent pas
  // la même suite. Les confondre serait une hausse de prix pour tout le
  // monde, sur une panne réseau.
  const src = readFileSync("app/api/cron/remise-affilies/route.ts", "utf8");
  assert.match(src, /gagnees === null/);
  assert.match(src, /liste_illisible/);
  // Et un abonnement qu'on n'a pas pu lister non plus.
  assert.match(src, /if \(!ok\) continue;/);
});

test("une baisse de remise est DITE dans le journal", () => {
  // Une remise qui baisse est une hausse de prix pour quelqu'un : ça ne
  // se fait pas en silence.
  const src = readFileSync("app/api/cron/remise-affilies/route.ts", "utf8");
  assert.match(src, /BAISSE, son prix remonte/);
  assert.match(src, /remise RETIREE/);
});
