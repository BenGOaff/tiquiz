// tests/logic/checkout-catalog.test.mts
//
// LE DRAME IVAN, EN TEST.
//
// 7 août 2026 : Ivan Pellegry paie son abonnement mensuel, son compte
// reste en gratuit. Aucun bug de code. Le prix était passé de 9 à 17 €
// cinq jours plus tôt, ce qui avait créé une nouvelle offre chez
// Systeme.io, dont l'identifiant n'avait été ajouté nulle part.
//
// La leçon, écrite dans AGENTS.md : "quand un tarif change, il y a trois
// choses à faire, pas une". Ce test est là pour que la deuxième et la
// troisième ne puissent plus être oubliées en silence.
//
// Il ne teste pas des fonctions, il teste une COHÉRENCE entre deux
// listes qui parlent du même argent et qui vivent dans deux fichiers.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  OWNER_CATALOG,
  OWNER_PRODUCT_ORDER,
  findOwnerProduct,
  formatOwnerPrice,
  ownerBillingKey,
  planForOwnerProduct,
} from "../../lib/checkout/catalog.ts";
import { inferPlanFromAmount } from "../../lib/sio/webhookInference.ts";

test("un identifiant inconnu ne vend RIEN", () => {
  // L'absence de configuration ferme, comme partout ailleurs. Un
  // identifiant que nous n'avons jamais émis ne peut pas figurer dans un
  // lien que nous avons envoyé.
  for (const inconnu of [null, undefined, "", "   ", "gratuit", "lifetime", "../mensuel", "MENSUEL2"]) {
    assert.equal(findOwnerProduct(inconnu), null, `"${inconnu}" a trouvé un produit`);
    assert.equal(planForOwnerProduct(inconnu), null);
  }
});

test("la casse et les espaces ne changent pas le produit vendu", () => {
  // Une adresse recopiée à la main dans un mail, avec une majuscule.
  assert.equal(findOwnerProduct("  Mensuel ")?.id, "mensuel");
  assert.equal(findOwnerProduct("ANNUEL-PLUS")?.id, "annuel-plus");
});

test("chaque produit ouvre un plan, et deux produits n'ouvrent jamais le meme", () => {
  const plans = new Set<string>();
  for (const p of Object.values(OWNER_CATALOG)) {
    assert.ok(p.plan, `${p.id} n'ouvre aucun plan`);
    assert.equal(plans.has(p.plan), false, `${p.plan} est ouvert par deux produits`);
    plans.add(p.plan);
  }
});

test("aucun produit n'ouvre le gratuit ni un plan a vie", () => {
  // Un paiement qui ouvre `free` serait un client qui paie pour rien ;
  // `lifetime` et `beta` sont des cohortes fermées, on ne les vend plus.
  for (const p of Object.values(OWNER_CATALOG)) {
    assert.ok(
      !["free", "lifetime", "beta"].includes(p.plan),
      `${p.id} ouvre ${p.plan}, qui ne se vend pas`,
    );
  }
});

test("les montants sont des entiers de centimes, strictement positifs", () => {
  for (const p of Object.values(OWNER_CATALOG)) {
    assert.ok(Number.isInteger(p.amountCents), `${p.id} : ${p.amountCents} n'est pas un entier`);
    assert.ok(p.amountCents > 0, `${p.id} : montant nul ou négatif`);
    // Un prix en euros écrit par erreur (17 au lieu de 1700) passerait
    // les deux contrôles ci-dessus et vendrait 0,17 €.
    assert.ok(p.amountCents >= 100, `${p.id} : ${p.amountCents} centimes, un prix en euros a du se glisser la`);
  }
});

test("LE DRAME IVAN : tout prix du catalogue est reconnu par le repli Systeme.io", () => {
  // Tant que les deux systèmes tournent en parallèle, une vente peut
  // encore arriver par Systeme.io. Son dernier recours avant le repli
  // aveugle, c'est le MONTANT. Si un prix change ici sans changer
  // là-bas, une vente Systeme.io au nouveau tarif retombe sur
  // `FALLBACK_PAID_PLAN` au lieu du bon palier : exactement ce qui est
  // arrivé à Ivan, en plus silencieux.
  for (const p of Object.values(OWNER_CATALOG)) {
    const devine = inferPlanFromAmount(p.amountCents);
    assert.equal(
      devine,
      p.plan,
      `${p.id} vaut ${p.amountCents} centimes et ouvre ${p.plan}, mais le repli Systeme.io ` +
        `y répond ${devine}. Ajoute la ligne manquante dans AMOUNT_TO_PLAN ` +
        `(lib/sio/webhookInference.ts).`,
    );
  }
});

test("l'ordre d'affichage contient TOUS les produits, une fois chacun", () => {
  // Un palier oublié dans l'ordre, c'est un palier invisible à l'écran :
  // il existe, il est payable par son adresse, et personne ne le voit.
  assert.deepEqual(
    [...OWNER_PRODUCT_ORDER].sort(),
    Object.keys(OWNER_CATALOG).sort(),
    "l'ordre d'affichage et le catalogue ne contiennent pas les mêmes produits",
  );
  assert.equal(new Set(OWNER_PRODUCT_ORDER).size, OWNER_PRODUCT_ORDER.length, "doublon dans l'ordre");
});

test("le prix affiche garde ses centimes et sa devise", () => {
  const mensuel = OWNER_CATALOG.mensuel;
  const affiche = formatOwnerPrice(mensuel, "fr-FR");
  assert.match(affiche, /17/, `prix affiché inattendu : ${affiche}`);
  assert.match(affiche, /,00/, `les centimes ont disparu : ${affiche}`);
  assert.match(affiche, /€/, `la devise a disparu : ${affiche}`);
});

test("la recurrence est une CLE, pas une phrase", () => {
  // Le bon de commande existe en 7 langues : le catalogue dit de quoi il
  // s'agit, l'interface sait comment le dire. Même règle que les raisons
  // d'erreur renvoyées par le serveur.
  assert.equal(ownerBillingKey(OWNER_CATALOG.mensuel), "monthly");
  assert.equal(ownerBillingKey(OWNER_CATALOG.annuel), "yearly");
  assert.equal(
    ownerBillingKey({ ...OWNER_CATALOG.mensuel, interval: null }),
    "once",
  );
});

test("le catalogue est la SEULE liste de prix du repo", () => {
  // Le vrai risque n'est pas qu'un prix soit faux, c'est qu'il soit
  // écrit ailleurs une deuxième fois. Ce test interdit qu'un montant en
  // centimes réapparaisse en dur dans un écran ou une route.
  const racine = process.cwd();
  const montants = Object.values(OWNER_CATALOG).map((p) => String(p.amountCents));
  const fautifs: string[] = [];

  const parcourir = (dossier: string) => {
    for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
      if (entree.name === "node_modules" || entree.name.startsWith(".")) continue;
      const chemin = path.join(dossier, entree.name);
      if (entree.isDirectory()) {
        parcourir(chemin);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entree.name)) continue;
      const src = fs.readFileSync(chemin, "utf8");
      for (const m of montants) {
        // `amount_cents` du modèle revendeur porte les prix DU REVENDEUR,
        // qui n'ont rien à voir avec ceux de Béné : on ne cherche que les
        // nombres écrits en dur.
        const regex = new RegExp(`(?<![\\d_])${m}(?![\\d_])`);
        if (regex.test(src)) fautifs.push(`${path.relative(racine, chemin)} : ${m}`);
      }
    }
  };

  for (const d of ["app", "components"]) {
    const chemin = path.join(racine, d);
    if (fs.existsSync(chemin)) parcourir(chemin);
  }

  assert.deepEqual(
    fautifs,
    [],
    `des montants du catalogue sont réécrits en dur :\n${fautifs.join("\n")}\n` +
      `Importe OWNER_CATALOG au lieu de recopier le nombre.`,
  );
});
