// tests/logic/pilotage-alertes.test.mts
//
// "JE DOIS POUVOIR MARQUER COMME TRAITÉ" (Béné, 29 août 2026).
//
// "C'est un mauvais suivi de la plateforme, pas un vrai sujet." Elle a
// raison : la vente du 11 juin restera sans compte en face pour
// toujours, donc l'alerte ne s'éteindra jamais toute seule. Une alerte
// permanente cesse d'être lue.

import { test } from "node:test";
import assert from "node:assert/strict";

import { trierAlertes, referenceVente, GENRE_VENTE_ORPHELINE } from "@/lib/pilotage/alertes";

const ventes = [
  { ref: "pi_juin", email: "boubetgeorges@gmail.com" },
  { ref: "pi_aout", email: "autre@exemple.fr" },
];

test("une vente marquée traitée sort des alertes", () => {
  const { actives } = trierAlertes(ventes, (v) => v.ref, new Set(["pi_juin"]));
  assert.deepEqual(actives.map((v) => v.ref), ["pi_aout"]);
});

test("MAIS ELLE N'EST PAS EFFACÉE : on peut revenir en arrière", () => {
  // Un clic de travers ne doit pas cacher pour toujours un
  // encaissement sans contrepartie.
  const { traitees } = trierAlertes(ventes, (v) => v.ref, new Set(["pi_juin"]));
  assert.deepEqual(traitees.map((v) => v.ref), ["pi_juin"]);
});

test("UNE VENTE SANS RÉFÉRENCE RESTE ACTIVE", () => {
  // On ne peut rien écrire en base pour elle, donc la ranger dans
  // "traité" la ferait disparaître sans que personne l'ait décidé.
  const { actives, traitees } = trierAlertes(
    [{ ref: "" }, { ref: "  " }],
    (v) => v.ref,
    new Set(["", "  "]),
  );
  assert.equal(actives.length, 2);
  assert.equal(traitees.length, 0);
});

test("rien de traité laisse tout actif", () => {
  const { actives } = trierAlertes(ventes, (v) => v.ref, new Set());
  assert.equal(actives.length, 2);
});

test("la référence est celle de l'ENCAISSEMENT, pas l'adresse", () => {
  // Une adresse peut désigner plusieurs ventes ; la référence identifie
  // l'argent et ne bouge pas.
  assert.equal(referenceVente({ ref: "pi_3Abc" }), "pi_3Abc");
  assert.equal(GENRE_VENTE_ORPHELINE, "vente-orpheline");
});
