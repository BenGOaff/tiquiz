// tests/logic/sio-plan-routing.test.mts
//
// UN CLIENT QUI A PAYÉ RESTE EN GRATUIT (drame Ivan, 7 août 2026).
//
// Ivan Pellegry passe du gratuit au mensuel. Côté Systeme.io tout est
// bon : il porte le tag `tiquiz-mensuel`, la vente est encaissée. Côté
// Tiquiz, son compte reste en `free`.
//
// -- CE QUI S'ÉTAIT PASSÉ ----------------------------------------------
//
// En passant les prix à 17 / 170 le 6 août, de NOUVEAUX plans tarifaires
// ont été créés côté Systeme.io ("NV tiquiz mensuel" à 17,00 €, "NV
// Tiquiz annuel" à 170,00 €). Leurs ids sont neufs, donc absents de
// `OFFER_TO_PLAN`. Le webhook route sur l'URL PUIS sur l'id : quand
// aucun des deux ne correspond, il REFUSE d'ouvrir un accès, ce qui est
// le bon comportement (on ne devine jamais un plan payant) mais laisse
// le client dehors.
//
// **Créer un bon de commande côté Systeme.io est une modification de
// code déguisée.** Ce fichier est là pour que ça ne soit plus invisible.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  OFFER_TO_PLAN,
  URL_TO_PLAN,
  inferPlanFromOfferId,
  inferPlanFromUrl,
  normalizeFunnelUrl,
  type TiquizPlan,
} from "../../lib/sio/webhookInference.ts";

/** Les plans payants qu'on vend AUJOURD'HUI. */
const PLANS_VENDUS: TiquizPlan[] = ["monthly", "yearly", "monthly_plus", "yearly_plus"];

test("les plans du nouveau prix sont routes (17 / 170)", () => {
  // Les ids exacts lus dans Systeme.io le 7 août 2026.
  assert.equal(inferPlanFromOfferId("3375217"), "monthly");
  assert.equal(inferPlanFromOfferId("offer-price-3375217"), "monthly");
  assert.equal(inferPlanFromOfferId("3375221"), "yearly");
  assert.equal(inferPlanFromOfferId("offer-price-3375221"), "yearly");
});

test("les paliers PLUS ne tiennent plus qu'a leur URL", () => {
  assert.equal(inferPlanFromOfferId("3278876"), "monthly_plus");
  assert.equal(inferPlanFromOfferId("3278878"), "yearly_plus");
});

test("chaque plan vendu est joignable par une URL ET par un id", () => {
  // C'est la regle qui manquait. Un plan qui n'a qu'une seule voie
  // d'acces tombe des que Béné retouche le tunnel ou le tarif, et le
  // symptome est un client qui paie sans rien recevoir.
  const parUrl = new Set(Object.values(URL_TO_PLAN));
  const parId = new Set(Object.values(OFFER_TO_PLAN));
  for (const plan of PLANS_VENDUS) {
    assert.ok(parUrl.has(plan), `${plan} n'est joignable par aucune URL`);
    assert.ok(parId.has(plan), `${plan} n'est joignable par aucun offer-price-id`);
  }
});

test("les anciens bons continuent de marcher", () => {
  // Des abonnements souscrits a 9 / 90 tournent toujours : leurs
  // renouvellements passent par ces ids.
  assert.equal(inferPlanFromOfferId("3198235"), "monthly");
  assert.equal(inferPlanFromOfferId("3198261"), "yearly");
  assert.equal(inferPlanFromOfferId("3198280"), "lifetime");
});

test("un offre inconnue ne devine JAMAIS un plan payant", () => {
  // Le garde-fou qui a laisse Ivan dehors est le bon : on prefere un
  // client bloque qu'on debloque a la main, a un acces payant ouvert
  // sur une vente qui n'a pas eu lieu.
  assert.equal(inferPlanFromOfferId("9999999"), null);
  assert.equal(inferPlanFromOfferId(""), null);
  assert.equal(inferPlanFromOfferId(null), null);
  assert.equal(inferPlanFromUrl("https://www.tipote.fr/une-page-inconnue"), null);
});

test("les URLs sont reconnues quelle que soit leur forme", () => {
  const attendus = "monthly";
  for (const variante of [
    "https://www.tipote.fr/tiquiz-mensuel",
    "http://tipote.fr/tiquiz-mensuel",
    "https://www.tipote.fr/tiquiz-mensuel/",
    "https://www.tipote.fr/TIQUIZ-MENSUEL",
    "https://www.tipote.fr/tiquiz-mensuel?utm_source=meta",
  ]) {
    assert.equal(inferPlanFromUrl(variante), attendus, `non reconnue : ${variante}`);
  }
  assert.equal(normalizeFunnelUrl("  HTTPS://WWW.Tipote.fr/Tiquiz-Mensuel/  "), "tipote.fr/tiquiz-mensuel");
});

test("les tunnels affilies ouvrent le MEME plan que les tunnels perso", () => {
  // Drame du 27 juin : une vente via lien affilie ne routait sur aucun
  // plan, donc mauvais acces.
  assert.equal(inferPlanFromUrl("https://www.tipote.fr/part-tiquiz-mensuel"), "monthly");
  assert.equal(inferPlanFromUrl("https://www.tipote.fr/part-tiquiz-annuel"), "yearly");
  assert.equal(inferPlanFromUrl("https://www.tipote.fr/tiquiz-mensuel-plus-part"), "monthly_plus");
  assert.equal(inferPlanFromUrl("https://www.tipote.fr/tiquiz-annuel-plus-part"), "yearly_plus");
});

test("aucun id ne route vers deux plans differents", () => {
  // Une faute de copier-coller dans la table donnerait un acces annuel
  // a quelqu'un qui a paye au mois, sans que rien ne le signale.
  const vus = new Map<string, TiquizPlan>();
  for (const [cle, plan] of Object.entries(OFFER_TO_PLAN)) {
    const num = cle.replace(/^offer-price-/, "");
    const deja = vus.get(num);
    if (deja) assert.equal(deja, plan, `l'id ${num} route vers ${deja} ET ${plan}`);
    vus.set(num, plan);
  }
});
