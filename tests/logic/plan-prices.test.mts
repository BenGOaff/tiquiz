// tests/logic/plan-prices.test.mts
//
// LE PRIX PUBLIC EST LE MÊME DANS LES 7 LANGUES.
//
// Béné, 6 août 2026 : "j'ai modifié le tarif de tiquiz au public : 17€
// et 170€ au lieu de 9€ et 90€ : il faut mettre à jour partout où c'est
// cité."
//
// "Partout" voulait dire 40 fichiers, et le tarif de la grille des plans
// vit dans SEPT fichiers de traduction. C'est exactement la forme de bug
// qui traîne : on corrige le français, on voit l'écran corrigé, et une
// cliente italienne continue de lire l'ancien prix pendant des mois sans
// que personne le sache.
//
// La preuve que ce n'est pas théorique : avant ce passage, `en.json`
// affichait "$9" et "$90" (des DOLLARS, alors que tout est facturé en
// euros par Systeme.io) pendant que ses propres plans Plus affichaient
// bien "€29" et "€290". Personne ne l'avait vu.
//
// Le test ne fige PAS un montant : Béné change ses prix quand elle veut,
// et un test qui l'oblige à venir ici serait un test qui gêne. Il exige
// seulement que les sept langues racontent la même chose, et que la
// promesse "2 mois offerts" reste vraie en arithmétique.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = join(process.cwd(), "messages");
const LOCALES = readdirSync(DIR).filter((f) => f.endsWith(".json"));

/** Les clés de prix de la grille des plans, et leur période. */
const MONTHLY = ["planProPrice", "planMonthlyPlusPrice"] as const;
const YEARLY = ["planYearlyPrice", "planYearlyPlusPrice"] as const;
const ALL = ["planFreePrice", ...MONTHLY, ...YEARLY] as const;

type Bag = Record<string, Record<string, string>>;

function messages(locale: string): Bag {
  return JSON.parse(readFileSync(join(DIR, locale), "utf8")) as Bag;
}

/** Le montant, quel que soit le symbole et sa place ("€17", "17 €"). */
function amount(raw: string): number {
  const m = String(raw).match(/[\d.,]+/);
  assert.ok(m, `pas de nombre dans "${raw}"`);
  return Number(m[0].replace(/\s/g, "").replace(",", "."));
}

/** Le namespace qui porte la grille. Trouvé, pas supposé. */
function priceNamespace(bag: Bag): string {
  const ns = Object.keys(bag).find(
    (k) => bag[k] && typeof bag[k] === "object" && "planProPrice" in bag[k],
  );
  assert.ok(ns, "aucun namespace ne porte planProPrice");
  return ns;
}

test("les 7 langues affichent le MÊME prix pour chaque plan", () => {
  assert.ok(LOCALES.length >= 7, `seulement ${LOCALES.length} langues trouvées`);

  const reference: Record<string, number> = {};
  for (const locale of LOCALES) {
    const bag = messages(locale);
    const ns = priceNamespace(bag);
    for (const key of ALL) {
      const raw = bag[ns][key];
      assert.ok(raw != null, `${locale} : ${key} manquant`);
      const value = amount(raw);
      if (reference[key] == null) reference[key] = value;
      assert.equal(
        value,
        reference[key],
        `${locale} affiche ${raw} pour ${key}, les autres langues disent ${reference[key]}`,
      );
    }
  }
});

test("aucune langue n'affiche un prix en dollars", () => {
  // Tout est encaissé en euros par Systeme.io. Un prix en dollars est un
  // prix faux, pas une traduction.
  for (const locale of LOCALES) {
    const bag = messages(locale);
    const ns = priceNamespace(bag);
    for (const key of ALL) {
      const raw = bag[ns][key];
      assert.ok(!raw.includes("$"), `${locale} : ${key} vaut "${raw}", en dollars`);
      assert.ok(raw.includes("€"), `${locale} : ${key} vaut "${raw}", sans euro`);
    }
  }
});

test('"2 mois offerts" tient l\'arithmétique : annuel = 10 x mensuel', () => {
  // La promesse est écrite dans planYearlyF2 / planYearlyPlusF2. Si un
  // jour un prix bouge tout seul, c'est elle qui devient un mensonge, et
  // c'est le genre de mensonge qu'une cliente calcule en dix secondes.
  const bag = messages(LOCALES[0]);
  const ns = priceNamespace(bag);
  const paires: [string, string][] = [
    ["planProPrice", "planYearlyPrice"],
    ["planMonthlyPlusPrice", "planYearlyPlusPrice"],
  ];
  for (const [mois, an] of paires) {
    assert.equal(
      amount(bag[ns][an]),
      amount(bag[ns][mois]) * 10,
      `${an} (${bag[ns][an]}) n'est pas 10 mois de ${mois} (${bag[ns][mois]})`,
    );
  }
});
