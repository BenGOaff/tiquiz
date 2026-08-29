// tests/logic/pilotage-periode.test.mts
//
// "JE PEUX CHOISIR LA PÉRIODE DÈS L'ACCUEIL" (Béné, 29 août 2026).
//
// "Fais vraiment un truc intelligent qui me permet de bien voir ce que
// je veux quand je veux, partout."
//
// Chaque borne de ce module découpe un chiffre d'affaires. Un jour de
// trop ou de moins ne se voit sur aucun écran : ça se voit en comparant
// avec la banque, trois semaines plus tard.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  lirePeriode,
  resoudrePeriode,
  dansLaPeriode,
  moisCouverts,
  tronqueeParLeJournal,
  normaliserJour,
  versQuery,
  PERIODE_DEFAUT,
  CHOIX_PERIODE,
} from "@/lib/pilotage/periode";

const MAINTENANT = new Date("2026-08-29T12:00:00Z");
const q = (s: string) => new URLSearchParams(s);

test("LES DEUX BORNES SONT INCLUSES", () => {
  // "Du 1er au 31" doit contenir le 31, sinon le dernier jour du mois
  // manque à tous les totaux et personne ne le remarque avant de
  // comparer avec sa banque.
  const p = lirePeriode(q("debut=2026-08-01&fin=2026-08-31"), MAINTENANT);
  assert.equal(dansLaPeriode("2026-08-01T00:00:00Z", p), true);
  assert.equal(dansLaPeriode("2026-08-31T23:59:59Z", p), true);
  assert.equal(dansLaPeriode("2026-07-31T23:59:59Z", p), false);
  assert.equal(dansLaPeriode("2026-09-01T00:00:00Z", p), false);
});

test("le mois dernier s'arrête au dernier jour du mois dernier", () => {
  const p = resoudrePeriode("mois-dernier", MAINTENANT);
  assert.equal(p.debut, "2026-07-01");
  assert.equal(p.fin, "2026-07-31");
});

test("ce mois commence au 1er, pas il y a 30 jours", () => {
  const p = resoudrePeriode("ce-mois", MAINTENANT);
  assert.equal(p.debut, "2026-08-01");
  assert.equal(p.fin, "2026-08-29");
});

test("7 jours en contient SEPT, aujourd'hui compris", () => {
  // Un `- 7 jours` naif en donne huit. C'est le genre d'ecart qui ne se
  // voit jamais a l'ecran.
  const p = resoudrePeriode("7j", MAINTENANT);
  assert.equal(p.debut, "2026-08-23");
  assert.equal(p.fin, "2026-08-29");
});

test("DES BORNES À L'ENVERS SE REMETTENT DANS L'ORDRE", () => {
  // Quelqu'un qui tape le 31 puis le 1er veut ce mois là, pas un
  // message d'erreur.
  const p = lirePeriode(q("debut=2026-08-31&fin=2026-08-01"), MAINTENANT);
  assert.equal(p.debut, "2026-08-01");
  assert.equal(p.fin, "2026-08-31");
});

test("une valeur illisible retombe sur le défaut, sans refuser l'écran", () => {
  // Un ecran qui refuserait de s'afficher parce qu'un parametre est de
  // travers est un ecran qu'on ne peut plus ouvrir depuis un vieux
  // favori.
  assert.equal(lirePeriode(q("periode=n-importe-quoi"), MAINTENANT).id, PERIODE_DEFAUT);
  assert.equal(lirePeriode(q(""), MAINTENANT).id, PERIODE_DEFAUT);
  assert.equal(lirePeriode(q("debut=hier"), MAINTENANT).id, PERIODE_DEFAUT);
});

test("des dates sur mesure GAGNENT sur un identifiant", () => {
  // C'est le choix le plus precis, donc le plus intentionnel.
  const p = lirePeriode(q("periode=7j&debut=2026-01-01&fin=2026-03-31"), MAINTENANT);
  assert.equal(p.id, "sur-mesure");
  assert.equal(p.debut, "2026-01-01");
});

test("ON DIT QUAND LA PÉRIODE DÉPASSE CE QU'ON A", () => {
  // Le journal des encaissements a ete pose le 7 aout 2026. Demander
  // 12 mois ne peut pas rendre 12 mois, et un total tronque qui ne le
  // dit pas fait prendre des decisions sur un chiffre faux.
  assert.equal(tronqueeParLeJournal(resoudrePeriode("12m", MAINTENANT)), true);
  assert.equal(tronqueeParLeJournal(resoudrePeriode("tout", MAINTENANT)), true);
  assert.equal(tronqueeParLeJournal(resoudrePeriode("7j", MAINTENANT)), false);
});

test("le graphique prend autant de colonnes que la période a de mois", () => {
  assert.equal(moisCouverts(resoudrePeriode("7j", MAINTENANT), MAINTENANT), 1);
  assert.equal(moisCouverts(resoudrePeriode("ce-mois", MAINTENANT), MAINTENANT), 1);
  assert.equal(moisCouverts(resoudrePeriode("90j", MAINTENANT), MAINTENANT), 3);
  assert.equal(moisCouverts(resoudrePeriode("12m", MAINTENANT), MAINTENANT), 12);
  // Sans borne haute, un graphique de cent colonnes n'apprend rien.
  assert.equal(moisCouverts(lirePeriode(q("debut=2000-01-01"), MAINTENANT), MAINTENANT), 24);
});

test("une date qu'on ne sait pas lire n'est jamais DANS la période", () => {
  const p = resoudrePeriode("30j", MAINTENANT);
  assert.equal(dansLaPeriode(null, p), false);
  assert.equal(dansLaPeriode("", p), false);
  assert.equal(dansLaPeriode("bientot", p), false);
});

test("la période voyage dans l'URL, donc une vue se met en favori", () => {
  assert.equal(versQuery(resoudrePeriode("90j", MAINTENANT)), "periode=90j");
  assert.equal(
    versQuery(lirePeriode(q("debut=2026-08-01&fin=2026-08-31"), MAINTENANT)),
    "debut=2026-08-01&fin=2026-08-31",
  );
});

test("normaliserJour n'accepte QUE AAAA-MM-JJ", () => {
  assert.equal(normaliserJour("2026-08-29"), "2026-08-29");
  assert.equal(normaliserJour("29/08/2026"), null);
  assert.equal(normaliserJour("2026-8-9"), null);
  assert.equal(normaliserJour(null), null);
});

test("chaque choix proposé sait se résoudre", () => {
  for (const c of CHOIX_PERIODE) {
    const p = resoudrePeriode(c.id, MAINTENANT);
    assert.ok(p.libelle.length > 0, c.id);
    if (p.debut && p.fin) assert.ok(p.debut <= p.fin, c.id);
  }
});
