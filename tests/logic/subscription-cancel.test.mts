// tests/logic/subscription-cancel.test.mts
//
// ANNULER N'EST PAS REMBOURSER, ET LES DEUX DOIVENT ARRÊTER LE COMPTEUR.
//
// Béné, 23 août 2026, juste après son premier vrai paiement : "je veux
// annuler et rembourser mon achat test depuis mon dashboard admin. Il me
// faut un bouton pour annuler l'abo directement (l'user doit aussi
// pouvoir le faire en toute autonomie) et un différent pour rembourser
// (ce qui sera plus rare)."
//
// En allant les écrire, deux bugs d'argent sont sortis, et les deux
// étaient invisibles tant que personne n'avait payé pour de vrai :
//
// 1. `/api/billing/cancel` ne connaissait QUE Systeme.io. Une abonnée
//    Stripe qui cliquait "Annuler mon abonnement" tombait dans la
//    branche "aucun abonnement actif", qui retirait son plan en local et
//    répondait ok. **Accès coupé, prélèvement Stripe qui continue.**
// 2. Le remboursement ne touchait pas à l'abonnement. On rendait
//    l'argent, on fermait l'accès, et Stripe re-prélevait le mois
//    suivant quelqu'un qui n'avait plus rien.
//
// Les deux sont de la même famille que le drame de Véronique : une
// logique écrite pour un cas (Systeme.io) appliquée telle quelle à un
// autre (nos propres encaissements).

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  estAbonnementVivant,
  lireAbonnements,
  normaliserQuand,
  secondesEnIso,
} from "../../lib/checkout/subscriptionCancel.ts";

function lire(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

// ── LA DÉCISION ──

test("le defaut est la fin de periode : elle garde ce qu'elle a paye", () => {
  assert.equal(normaliserQuand(undefined), "fin-de-periode");
  assert.equal(normaliserQuand(""), "fin-de-periode");
  assert.equal(normaliserQuand("n'importe quoi"), "fin-de-periode");
  // L'ancien vocabulaire de l'ecran de reglages doit continuer a marcher.
  assert.equal(normaliserQuand("WhenBillingCycleEnds"), "fin-de-periode");
  assert.equal(normaliserQuand("Now"), "immediat");
  assert.equal(normaliserQuand("immediat"), "immediat");
});

test("un abonnement en impaye est VIVANT : c'est celui qu'on veut arreter", () => {
  // Ne garder que `active` laisserait tourner exactement l'abonnement
  // qu'une cliente cherche a stopper, et Stripe continue d'y reessayer.
  for (const st of ["active", "trialing", "past_due", "unpaid", "paused"]) {
    assert.equal(estAbonnementVivant(st), true, `${st} devrait etre vivant`);
  }
  for (const st of ["canceled", "incomplete_expired", "", null, undefined, "ended"]) {
    assert.equal(estAbonnementVivant(st), false, `${String(st)} ne devrait pas etre vivant`);
  }
});

test("on lit la liste de Stripe sans supposer sa forme", () => {
  const abos = lireAbonnements({
    data: [
      { id: "sub_1", status: "ACTIVE", current_period_end: 1_700_000_000 },
      { id: "", status: "active" },
      { status: "active" },
      null,
      { id: "sub_2", status: "past_due" },
    ],
  });
  assert.deepEqual(
    abos.map((a) => a.id),
    ["sub_1", "sub_2"],
    "une entree sans identifiant doit etre ignoree, jamais devinee",
  );
  assert.equal(abos[0].status, "active", "le statut doit etre normalise en minuscules");
  assert.equal(abos[0].finLe, new Date(1_700_000_000_000).toISOString());
  assert.equal(abos[1].finLe, null);
  assert.deepEqual(lireAbonnements(null), []);
  assert.deepEqual(lireAbonnements({ data: "pas un tableau" }), []);
});

test("les secondes de Stripe ne sont pas des millisecondes", () => {
  // Confondre les deux placerait la fin de periode en 1970, donc
  // afficherait "acces conserve jusqu'au 20 janvier 1970".
  assert.equal(secondesEnIso(1_700_000_000), new Date(1_700_000_000_000).toISOString());
  assert.equal(secondesEnIso(0), null);
  assert.equal(secondesEnIso("bof"), null);
});

// ── CE QUE LE CODE DOIT FAIRE, ET QU'AUCUN TEST UNITAIRE NE VOIT ──

test("l'annulation regarde les DEUX fournisseurs", () => {
  const src = lire("lib/checkout/cancelSubscriptions.ts");
  assert.ok(src.includes("listerAbonnementsOwner"), "les abonnements Stripe ne sont plus listes");
  assert.ok(src.includes("listSubscriptionsForContact"), "les abonnements Systeme.io ne sont plus listes");
  assert.ok(src.includes("annulerAbonnementOwner"), "on n'arrete plus rien chez Stripe");
  assert.ok(src.includes("cancelSubscription"), "on n'arrete plus rien chez Systeme.io");
});

test("on ne retire JAMAIS un plan parce qu'on n'a pas pu regarder", () => {
  // Le bug exact du 23 aout : "je n'ai rien trouve" et "je n'ai pas pu
  // regarder" traites pareil, donc acces coupe pendant que Stripe
  // prelevait toujours.
  const src = lire("lib/checkout/cancelSubscriptions.ts");
  assert.ok(
    /if \(rienTrouve && !toutLu\)[\s\S]{0,400}return \{\s*ok: false/.test(src),
    "un controle en erreur ne bloque plus la retrogradation",
  );
  assert.ok(
    src.includes("const retirerMaintenant = args.quand === \"immediat\" || rienTrouve"),
    "la regle de retrogradation a change sans que ce test le dise",
  );
});

test("la route cliente et la route admin partagent la MEME decision", () => {
  // Deux ecrans qui decideraient chacun de leur cote finiraient par se
  // contredire : un jour l'un des deux oublierait un fournisseur.
  for (const route of [
    "app/api/billing/cancel/route.ts",
    "app/api/admin/clients/abonnement/route.ts",
  ]) {
    const src = lire(route);
    assert.ok(src.includes("annulerAbonnementsDe"), `${route} n'appelle plus la decision commune`);
  }
});

test("la route cliente ne connait plus SEULEMENT Systeme.io", () => {
  const src = lire("app/api/billing/cancel/route.ts");
  assert.ok(
    !src.includes("listSubscriptionsForContact"),
    "la route est revenue a son ancien code, qui ignorait les abonnements Stripe",
  );
});

test("l'admin est verifie cote SERVEUR, jamais seulement a l'ecran", () => {
  const src = lire("app/api/admin/clients/abonnement/route.ts");
  assert.ok(src.includes("isAdminEmail"), "n'importe qui peut arreter l'abonnement de n'importe qui");
});

test("un remboursement ARRETE l'abonnement, sinon on re-preleve le mois suivant", () => {
  const src = lire("app/api/commande/webhook/route.ts");
  const iRefund = src.indexOf("async function surRemboursement");
  assert.ok(iRefund > 0, "la branche de remboursement a disparu");
  const bloc = src.slice(iRefund);
  assert.ok(
    bloc.includes("arreterAbonnementsStripe"),
    "le remboursement ne stoppe plus l'abonnement : la personne sera prelevee le mois prochain sans acces",
  );
  assert.ok(
    /arreterAbonnementsStripe\([^)]*"immediat"\)/.test(bloc),
    "le remboursement n'arrete plus l'abonnement TOUT DE SUITE",
  );
});

test("les quatre paliers vendus peuvent etre annules depuis les reglages", () => {
  // `monthly_plus` et `yearly_plus` ne voyaient AUCUN bouton : leur seul
  // recours etait de nous ecrire.
  const src = lire("components/settings/SettingsClient.tsx");
  for (const plan of ["monthly", "yearly", "monthly_plus", "yearly_plus"]) {
    assert.ok(
      new RegExp(`currentPlan === "${plan}"`).test(src),
      `${plan} ne voit pas le bouton d'annulation`,
    );
  }
});

test("la fiche client propose ARRETER, distinct de REMBOURSER", () => {
  const src = lire("components/admin/ClientFiche.tsx");
  assert.ok(src.includes("annulerAbonnement"), "le bouton d'annulation a disparu de la fiche");
  assert.ok(src.includes("rembourser"), "le bouton de remboursement a disparu de la fiche");
  assert.ok(
    src.includes("/api/admin/clients/abonnement"),
    "la fiche n'appelle plus la route d'annulation",
  );
});
