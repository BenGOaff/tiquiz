// tests/logic/sio-plan-routing.test.mts
//
// UN CLIENT QUI A PAYÉ RESTE EN GRATUIT (drame Ivan, 7 août 2026).
//
// Ivan Pellegry passe du gratuit au mensuel. Côté Systeme.io tout est
// bon : il porte le tag `tiquiz-mensuel`, la vente est encaissée. Côté
// Tiquiz, son compte reste en `free`.
//
// -- CE QUI S'ÉTAIT PASSÉ, CONFIRMÉ PAR LE JOURNAL ---------------------
//
// En passant les prix à 17 / 170 le 6 août, de NOUVEAUX plans tarifaires
// ont été créés côté Systeme.io ("NV tiquiz mensuel" à 17,00 €, id
// 3375217). Le bon de commande garde son URL, mais il vend désormais ce
// nouveau plan.
//
// Le journal de production montre la suite exactement : l'appel arrive,
// il porte `pricePlan.id = 3375217` et AUCUNE URL de tunnel, l'id est
// inconnu, la route répond `unknown_offer:3375217` et refuse. Le refus
// est le bon comportement (on ne devine jamais un plan payant), mais il
// laisse dehors un client qui a payé.
//
// **Créer un bon de commande côté Systeme.io est une modification de
// code déguisée.** Ce fichier est là pour que ça ne soit plus invisible.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  FALLBACK_PAID_PLAN,
  OFFER_TO_PLAN,
  inferPlanFromAmount,
  inferPlanFromPayload,
  isConfirmedSaleEvent,
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

test("les paliers PLUS ont enfin un id, en plus de leur URL", () => {
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

// ── LA FORME RÉELLE D'UNE VENTE, RELEVÉE EN PRODUCTION ────────────────
//
// Journal du 7 août 2026, commande d'Ivan :
//
//   11:56-11:57  subscription.payment.failed   tunnel: -   offre: 3375217
//   11:58        customer.sale.completed       tunnel: -   offre: 3375217
//   (la veille)  free_optin      tunnel: tipote.fr/tiquiz-gratuit   offre: -
//
// **L'ÉVÉNEMENT DE VENTE NE PORTE AUCUNE URL DE TUNNEL.** Seul l'optin
// gratuit en a une. Le routage par URL, qui passe en premier, ne peut donc
// RIEN faire sur une vente : l'offer-price-id est la seule voie qui reste.
//
// C'est l'inverse de ce que je croyais en corrigeant mon premier
// diagnostic. J'avais raisonné "les URLs n'ont pas changé, donc le routage
// par URL aurait dû marcher", sans vérifier qu'il y avait une URL dans le
// payload. Il n'y en a pas. **Deux fois de suite, l'erreur a été de
// raisonner sur la forme supposée du payload au lieu de la regarder.**
//
// Ce bloc fige la forme observée : si un jour une vente cesse d'être
// reconnue, ce test dira si c'est la forme du payload qui a bougé.


test("une vente reelle (sans URL, avec pricePlan.id) est reconnue", () => {
  const venteIvan = {
    type: "customer.sale.completed",
    customer: { email: "client@exemple.fr" },
    pricePlan: { id: 3375217 },
  };
  const r = inferPlanFromPayload(venteIvan);
  assert.equal(r.sourceUrl, null, "la vente ne porte pas d'URL, c'est le point");
  assert.equal(r.planFromUrl, null);
  assert.equal(r.plan, "monthly", "la vente d'Ivan doit desormais ouvrir le mensuel");
  assert.equal(r.source, "offer", "seul l'id peut trancher sur un evenement de vente");
});

test("l'annuel au nouveau prix passe par la meme voie", () => {
  const r = inferPlanFromPayload({
    type: "customer.sale.completed",
    customer: { email: "c@e.fr" },
    pricePlan: { id: 3375221 },
  });
  assert.equal(r.plan, "yearly");
  assert.equal(r.source, "offer");
});

test("les paliers PLUS aussi, et c'est ce qui les sauve", () => {
  // Ils ne tenaient QUE par leur URL depuis le 2 juin. Or une vente n'en
  // porte pas : ils etaient donc irroutables sur un evenement de vente,
  // exactement comme Ivan, sans que personne l'ait vu.
  for (const [id, attendu] of [
    [3278876, "monthly_plus"],
    [3278878, "yearly_plus"],
  ] as const) {
    const r = inferPlanFromPayload({
      type: "customer.sale.completed",
      customer: { email: "c@e.fr" },
      pricePlan: { id },
    });
    assert.equal(r.plan, attendu, `le palier ${attendu} reste irroutable sur une vente`);
  }
});

test("l'optin gratuit, lui, porte bien son URL", () => {
  // La forme observee la veille : pas d'offre, mais une URL de tunnel.
  const r = inferPlanFromPayload({
    type: "free_optin",
    contact: { email: "c@e.fr" },
    funnel: { url: "https://www.tipote.fr/tiquiz-gratuit" },
  });
  assert.equal(r.plan, "free");
  assert.equal(r.source, "url");
});

// ── UNE VENTE ENCAISSÉE OUVRE TOUJOURS UN ACCÈS ──────────────────────
//
// Béné, 7 août 2026 : "pourquoi une vente refusée ? Il a payé le client,
// il doit recevoir ses accès, point barre."
//
// Elle a raison. Ce qui est ambigu sur une offre inconnue, ce n'est pas
// QU'IL a payé (l'événement est une vente confirmée), c'est QUEL palier.
// On répond donc à la vraie question : le montant s'il est reconnaissable,
// sinon le palier de base.

test("le montant tranche entre la base et le palier PLUS", () => {
  // En centimes, comme l'API Systeme.io les renvoie.
  assert.equal(inferPlanFromAmount(1700), "monthly");
  assert.equal(inferPlanFromAmount(17000), "yearly");
  assert.equal(inferPlanFromAmount(2900), "monthly_plus");
  assert.equal(inferPlanFromAmount(29000), "yearly_plus");
});

test("le montant est aussi compris en euros", () => {
  // Selon l'evenement, SIO envoie tantot 1700, tantot "17.00".
  assert.equal(inferPlanFromAmount("17.00"), "monthly");
  assert.equal(inferPlanFromAmount(170), "yearly");
  assert.equal(inferPlanFromAmount("29"), "monthly_plus");
  assert.equal(inferPlanFromAmount("290"), "yearly_plus");
});

test("un montant remise ne devine PAS un palier au hasard", () => {
  // Correspondance exacte uniquement : sinon un code promo ouvrirait un
  // PLUS a quelqu'un qui a paye la base. Il retombera sur le repli.
  assert.equal(inferPlanFromAmount(1200), null);
  assert.equal(inferPlanFromAmount(0), null);
  assert.equal(inferPlanFromAmount("gratuit"), null);
  assert.equal(inferPlanFromAmount(null), null);
});

test("le repli est le palier de BASE, jamais un PLUS", () => {
  // `monthly` ouvre exactement les memes fonctionnalites que `yearly`
  // (seule la facturation differe), et c'est le moins cher : se tromper
  // ne coute rien au client et ne donne jamais un PLUS par accident.
  assert.equal(FALLBACK_PAID_PLAN, "monthly");
  assert.notEqual(FALLBACK_PAID_PLAN, "monthly_plus");
  assert.notEqual(FALLBACK_PAID_PLAN, "yearly_plus");
});

test("une vente confirmee est reconnue comme telle", () => {
  // Le type exact releve dans le journal d'Ivan.
  assert.equal(isConfirmedSaleEvent("customer.sale.completed"), true);
  assert.equal(isConfirmedSaleEvent("SALE_NEW"), true);
  assert.equal(isConfirmedSaleEvent("order.completed"), true);
  assert.equal(isConfirmedSaleEvent("Vente confirmee"), true);
});

test("ce qui n'est PAS une vente n'ouvre rien", () => {
  // Le garde-fou : sans lui, n'importe quel appel mal configure
  // ouvrirait un acces payant a lui tout seul.
  assert.equal(isConfirmedSaleEvent("free_optin"), false);
  assert.equal(isConfirmedSaleEvent("contact.updated"), false);
  assert.equal(isConfirmedSaleEvent(""), false);
  assert.equal(isConfirmedSaleEvent(null), false);
});
