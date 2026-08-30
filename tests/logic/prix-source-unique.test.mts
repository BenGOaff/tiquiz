// tests/logic/prix-source-unique.test.mts
//
// UN SEUL ENDROIT DIT LE PRIX.
//
// Béné, 30 août 2026 : "un vrai gros audit des tarifs, méthodes de
// vente, affiliation parce qu'on découvre encore des boulettes que tu
// es censé avoir audité. Je veux que MAINTENANT ce soit super solide et
// fiable à tous les niveaux, plus d'erreur nulle part."
//
// -- CE QUE L'AUDIT A TROUVÉ -------------------------------------------
//
// `lib/planLimits.ts` portait une DEUXIÈME table de prix
// (`PRICING_PLUS`), écrite en dur, sous un commentaire qui affirmait
// être "la source de vérité unique". Elle alimente les messages d'upsell
// de six routes. Le jour où le prix du PLUS bouge sur le bon de
// commande, ces six messages continuent d'annoncer l'ancien, et rien
// ne le signale.
//
// Et `app/llms.txt/route.ts` annonçait "17 EUR par mois ou 170 EUR par
// an" en dur, en oubliant les deux paliers PLUS. Ce fichier est lu par
// des moteurs d'IA : un prix périmé y est pire qu'une absence de prix,
// parce qu'il sera cité.
//
// Ce test interdit la réapparition d'une deuxième table.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { OWNER_CATALOG } from "../../lib/checkout/catalog.ts";
import { PRICING_PLUS, plusUpsellText } from "../../lib/planLimits.ts";

test("les prix d'upsell sont DERIVES du catalogue", () => {
  assert.match(PRICING_PLUS.monthlyPlus.price, /29/);
  assert.match(PRICING_PLUS.yearlyPlus.price, /290/);
  // Et ils suivent le catalogue : si le catalogue change, ceci change.
  assert.equal(
    PRICING_PLUS.monthlyPlus.price.replace(/\D/g, ""),
    String(OWNER_CATALOG["mensuel-plus"].amountCents / 100),
  );
  assert.equal(
    PRICING_PLUS.yearlyPlus.price.replace(/\D/g, ""),
    String(OWNER_CATALOG["annuel-plus"].amountCents / 100),
  );
});

test("PLUS s'ecrit en capitales, et l'espace avant € est insecable", () => {
  for (const v of [PRICING_PLUS.monthlyPlus, PRICING_PLUS.yearlyPlus]) {
    assert.match(v.label, /PLUS/, v.label);
    assert.ok(!/\bPlus\b/.test(v.label), "un libelle ecrit 'Plus' et pas 'PLUS' : " + v.label);
    assert.ok(!/\d €/.test(v.price), "espace secable avant € : " + v.price);
  }
  assert.match(plusUpsellText(), /PLUS/);
});

/** Les fichiers de l'app, hors dependances et hors le catalogue. */
function sources(): { chemin: string; src: string }[] {
  const out: { chemin: string; src: string }[] = [];
  const visiter = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name.startsWith(".")) continue;
        visiter(p);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(e.name)) continue;
      if (p.endsWith(path.join("lib", "checkout", "catalog.ts"))) continue;
      out.push({ chemin: p, src: fs.readFileSync(p, "utf8") });
    }
  };
  for (const d of ["app", "lib", "components"]) visiter(path.join(process.cwd(), d));
  return out;
}

test("aucun prix Tiquiz n'est ecrit en dur hors du catalogue", () => {
  // On vise le CODE, pas les commentaires : ceux-ci racontent l'histoire
  // ("un annuel a 170 € et dix mensuels a 17 €...") et un test qui
  // rougit dessus finirait desactive.
  const fautifs: string[] = [];
  for (const { chemin, src } of sources()) {
    // On SUIT l'etat des commentaires de bloc, `{/* ... */}` compris :
    // ceux-ci racontent l'histoire ("un annuel a 170 € et dix mensuels a
    // 17 €...") et un test qui rougit dessus finirait desactive.
    let dansBloc = false;
    src.split("\n").forEach((l, i) => {
      const nue = l.trim();
      const ouvre = l.includes("/*");
      const ferme = l.includes("*/");
      const etaitDansBloc = dansBloc;
      if (ouvre && !ferme) dansBloc = true;
      else if (ferme) dansBloc = false;
      if (etaitDansBloc || (ouvre && ferme) || (ouvre && !ferme)) return;
      if (nue.startsWith("//") || nue.startsWith("*")) return;

      // UN PRIX ANNONCE, pas un nombre qui passe. On exige la MONNAIE
      // ET un rythme ou une preposition de prix : ca attrape
      // "29€/mois" et "17 EUR par mois", et ca laisse passer un exemple
      // de comparaison dans un prompt ("17 € vs 50 €").
      if (/\b(17|29|170|290)\s?(€|EUR)\s?(\/\s?(mois|an)\b|par (mois|an)\b)/i.test(l)) {
        fautifs.push(`${chemin.replace(process.cwd() + "/", "")}:${i + 1}`);
      }
    });
  }
  assert.deepEqual(
    fautifs,
    [],
    "prix ecrit en dur hors du catalogue : " + fautifs.join(", "),
  );
});
