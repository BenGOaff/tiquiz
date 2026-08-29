// tests/logic/plan-change.test.mts
//
// MONTER DE PALIER SANS PAYER DEUX FOIS.
//
// Béné, 23 août 2026 : "l'user paye 17€ pour le mois et veut upgrader à
// tiquiz plus : on retire les 17€ qu'il a payés déjà pour lui faire
// payer le complément pour le mois en cours et la bonne somme le mois
// d'après ?" Puis : "Pour stripe oui on met le prorata en route. Pour
// paypal : on dit rien, on facture et on upgrade point barre."
//
// Ce que ce fichier fige, et qui se compte en euros :
//   - le SENS du changement ne se lit pas sur le prix (l'annuel coûte
//     plus cher d'un coup et moins cher au mois) ;
//   - une descente ne s'applique pas tout de suite, sinon on retire à
//     quelqu'un ce qu'il a déjà payé ;
//   - le plan s'ouvre à UN seul endroit, et seulement s'il a bougé.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { OWNER_CATALOG, produitPourPlan } from "../../lib/checkout/catalog.ts";
import {
  ciblesPossibles,
  deciderChangement,
  estPlus,
  idProduitStripe,
  monteeVersProduit,
  ouvertureDemandee,
  sensDuChangement,
  sensVers,
} from "../../lib/checkout/planChange.ts";
import { estPlanAVie, PLANS_A_VIE } from "../../lib/checkout/plansAVie.ts";

function lire(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

// ── LE SENS ──

test("monter de niveau est une montee, quel que soit le rythme", () => {
  assert.equal(sensDuChangement(OWNER_CATALOG.mensuel, OWNER_CATALOG["mensuel-plus"]), "montee");
  assert.equal(sensDuChangement(OWNER_CATALOG.annuel, OWNER_CATALOG["annuel-plus"]), "montee");
  assert.equal(sensDuChangement(OWNER_CATALOG.mensuel, OWNER_CATALOG["annuel-plus"]), "montee");
});

test("passer du mois a l'annee est une montee, PAS une descente", () => {
  // Le piege : l'annuel revient MOINS cher au mois (170/12 = 14,17 €
  // contre 17 €). Un classement par prix rangerait le passage a l'annee
  // dans les descentes, donc le refuserait, alors que c'est la meilleure
  // nouvelle possible pour la tresorerie.
  assert.equal(sensDuChangement(OWNER_CATALOG.mensuel, OWNER_CATALOG.annuel), "montee");
  assert.equal(
    sensDuChangement(OWNER_CATALOG["mensuel-plus"], OWNER_CATALOG["annuel-plus"]),
    "montee",
  );
});

test("redescendre de niveau est une descente, meme en payant plus", () => {
  // mensuel-plus (29 €/mois) -> annuel (170 €/an) : la facture du jour
  // est plus grosse, et pourtant il PERD des fonctionnalites.
  assert.equal(sensDuChangement(OWNER_CATALOG["mensuel-plus"], OWNER_CATALOG.annuel), "descente");
  assert.equal(sensDuChangement(OWNER_CATALOG["annuel-plus"], OWNER_CATALOG.mensuel), "descente");
  assert.equal(sensDuChangement(OWNER_CATALOG.annuel, OWNER_CATALOG.mensuel), "descente");
});

test("le meme palier n'est ni une montee ni une descente", () => {
  for (const p of Object.values(OWNER_CATALOG)) {
    assert.equal(sensDuChangement(p, p), "identique");
  }
});

test("le niveau se lit sur le PLAN, jamais sur le libelle", () => {
  // Un libelle se traduit, se renomme, se raccourcit. Le plan est ce
  // qui ouvre les fonctionnalites : c'est lui la verite.
  assert.equal(estPlus(OWNER_CATALOG["mensuel-plus"]), true);
  assert.equal(estPlus(OWNER_CATALOG["annuel-plus"]), true);
  assert.equal(estPlus(OWNER_CATALOG.mensuel), false);
  assert.equal(estPlus(OWNER_CATALOG.annuel), false);
});

// ── LA DÉCISION ──

test("une montee passe, avec le prorata demande explicitement", () => {
  const d = deciderChangement({ actuelId: "mensuel", cibleId: "mensuel-plus" });
  assert.equal(d.ok, true);
  assert.equal(d.sens, "montee");
  // C'est CE mot qui fait creer la facture de difference tout de suite.
  assert.equal(d.proration, "always_invoice");
});

test("UNE DESCENTE EST ACCEPTEE, ET ELLE ATTEND L'ECHEANCE", () => {
  // Bene, 29 aout : "je veux que le downgrade soit pris en compte sans
  // desabonnement cote user." L'ancien refus obligeait a resilier pour
  // descendre, et beaucoup ne reviennent pas.
  //
  // Ce qu'on n'applique PAS tout de suite, c'est le changement : elle a
  // paye sa periode au tarif fort, on ne lui reprend pas ce qu'elle a
  // achete (regle de l'annulation du 23 aout).
  const d = deciderChangement({ actuelId: "mensuel-plus", cibleId: "mensuel" });
  assert.equal(d.ok, true);
  assert.equal(d.sens, "descente");
  assert.equal(d.quand, "fin-de-periode");
  assert.equal(d.proration, "none", "une descente ne facture RIEN aujourd'hui");
});

test("une MONTEE, elle, prend effet tout de suite et se facture", () => {
  const d = deciderChangement({ actuelId: "mensuel", cibleId: "mensuel-plus" });
  assert.equal(d.ok, true);
  assert.equal(d.quand, "immediat");
  assert.equal(d.proration, "always_invoice");
});

test("LE MOMENT EST UN CHAMP, jamais deduit du sens par l'appelant", () => {
  // Deduire marcherait aujourd'hui et casserait au premier cas qui ne
  // suit pas la regle. Le champ est rendu, l'appelant le lit.
  for (const [actuel, cible] of [
    ["mensuel", "mensuel-plus"],
    ["mensuel-plus", "mensuel"],
    ["mensuel", "annuel"],
  ]) {
    const d = deciderChangement({ actuelId: actuel, cibleId: cible });
    assert.ok(d.quand, `${actuel} -> ${cible} doit dire QUAND`);
  }
});

test("un palier inconnu ne facture rien", () => {
  assert.equal(deciderChangement({ actuelId: "mensuel", cibleId: "gratuit" }).raison, "produit_inconnu");
  assert.equal(deciderChangement({ actuelId: "mensuel", cibleId: null }).raison, "produit_inconnu");
});

test("sans palier actuel lisible, on refuse au lieu de deviner", () => {
  // Facturer une montee a quelqu'un qui descend lui prendrait de
  // l'argent pour MOINS de service.
  const d = deciderChangement({ actuelId: null, cibleId: "mensuel-plus" });
  assert.equal(d.ok, false);
  assert.equal(d.raison, "pas_notre_abonnement");
});

test("demander son propre palier ne facture rien", () => {
  assert.equal(deciderChangement({ actuelId: "mensuel", cibleId: "mensuel" }).raison, "deja_sur_ce_palier");
});

test("les cibles proposees sont TOUS les autres paliers, dans les deux sens", () => {
  // Depuis le 29 aout, une descente se propose comme une montee : elle
  // ne se fait plus en resiliant. Ce qui n'est jamais propose, c'est son
  // propre palier.
  assert.deepEqual(ciblesPossibles("mensuel").sort(), ["annuel", "annuel-plus", "mensuel-plus"]);
  assert.deepEqual(ciblesPossibles("annuel-plus").sort(), ["annuel", "mensuel", "mensuel-plus"]);
  assert.ok(!ciblesPossibles("mensuel").includes("mensuel" as never));
  assert.deepEqual(ciblesPossibles("inconnu"), []);
});

test("et chaque cible dit DANS QUEL SENS elle va", () => {
  // Les deux ne se presentent pas pareil : l'une se paie maintenant,
  // l'autre s'annonce pour une date. L'ecran doit pouvoir les
  // distinguer sans refaire le calcul.
  assert.equal(sensVers("mensuel", "mensuel-plus"), "montee");
  assert.equal(sensVers("mensuel-plus", "mensuel"), "descente");
  assert.equal(sensVers("mensuel", "annuel"), "montee", "passer a l'annee est une montee");
  assert.equal(sensVers("mensuel", "mensuel"), "identique");
  assert.equal(sensVers("inconnu", "mensuel"), null);
});

// ── LE PRODUIT STRIPE ──

test("un palier = UN produit Stripe, toujours le meme", () => {
  // Sans identifiant fixe, chaque montee creerait un produit de plus :
  // le tableau de bord de Bene se remplirait de doublons et le rapport
  // de ventes par produit deviendrait illisible.
  assert.equal(idProduitStripe(OWNER_CATALOG["mensuel-plus"]), "tiquiz_mensuel_plus");
  assert.equal(idProduitStripe(OWNER_CATALOG.annuel), "tiquiz_annuel");
  const ids = Object.values(OWNER_CATALOG).map(idProduitStripe);
  assert.equal(new Set(ids).size, ids.length, "deux paliers partagent un produit Stripe");
});

// ── CE QUE LE WEBHOOK OUVRE ──

test("le plan s'ouvre quand il a VRAIMENT change", () => {
  const o = ouvertureDemandee({
    produitFacture: "mensuel-plus",
    vivant: true,
    planActuel: "monthly",
    aVie: false,
  });
  assert.equal(o?.plan, "monthly_plus");
  assert.equal(o?.produit, "mensuel-plus");
});

test("rien n'a bouge : SILENCE, sinon un email part a chaque carte mise a jour", () => {
  // Stripe envoie `customer.subscription.updated` pour a peu pres tout.
  assert.equal(
    ouvertureDemandee({ produitFacture: "mensuel", vivant: true, planActuel: "monthly", aVie: false }),
    null,
  );
});

test("un abonnement mort n'ouvre rien", () => {
  assert.equal(
    ouvertureDemandee({ produitFacture: "mensuel-plus", vivant: false, planActuel: "monthly", aVie: false }),
    null,
  );
});

test("un acces A VIE ne se remplace jamais par un abonnement", () => {
  // Ce serait retirer a quelqu'un ce qu'il a paye une fois pour toutes.
  for (const plan of PLANS_A_VIE) {
    assert.equal(
      ouvertureDemandee({ produitFacture: "mensuel-plus", vivant: true, planActuel: plan, aVie: true }),
      null,
      plan,
    );
  }
  assert.equal(estPlanAVie("LIFETIME"), true);
  assert.equal(estPlanAVie(" beta "), true);
  assert.equal(estPlanAVie("monthly"), false);
  assert.equal(estPlanAVie(null), false);
});

test("un produit facture inconnu n'ouvre rien", () => {
  assert.equal(
    ouvertureDemandee({ produitFacture: "offre-mystere", vivant: true, planActuel: "free", aVie: false }),
    null,
  );
  assert.equal(
    ouvertureDemandee({ produitFacture: null, vivant: true, planActuel: "free", aVie: false }),
    null,
  );
});

// ── UN SEUL ENDROIT OUVRE LE PLAN ──

test("la route de changement n'ouvre PAS le plan elle meme", () => {
  // Deux endroits qui ouvriraient l'acces finiraient par se contredire :
  // quatrieme exemplaire du meme defaut dans ce depot.
  const src = lire("app/api/billing/change-plan/route.ts");
  assert.ok(!src.includes("grantPlanByEmail"), "la route ouvre le plan de son cote");
  // Et c'est bien le webhook qui s'en charge.
  const webhook = lire("app/api/commande/webhook/route.ts");
  assert.match(webhook, /ouvertureDemandee\(/);
});

test("l'apercu ne facture rien, et il est sur un GET", () => {
  // Un prefetch de navigateur fait des GET : un apercu qui facturerait
  // preleverait quelqu'un qui a juste ouvert un ecran. La separation
  // par methode HTTP est la seule qu'un navigateur ne confond pas.
  const src = lire("app/api/billing/change-plan/route.ts");
  assert.match(src, /export async function GET\(/);
  assert.match(src, /export async function POST\(/);
  const get = src.slice(src.indexOf("export async function GET("), src.indexOf("// ── ON APPLIQUE"));
  assert.ok(!get.includes("appliquerChangement"), "le GET applique le changement");
  assert.ok(get.includes("apercuChangement"), "le GET n'affiche aucun montant");
});

test("PayPal arrete l'ancien abonnement APRES l'activation du nouveau", () => {
  // Arreter d'abord laisserait sans rien quelqu'un qui n'irait pas au
  // bout de l'accord PayPal. Ne jamais l'arreter le preleverait DEUX
  // fois, et il ne le verrait qu'au releve suivant.
  const route = lire("app/api/billing/change-plan/route.ts");
  assert.match(route, /remplace: ancienId/);
  assert.ok(
    !route.includes("cancelOwnerPaypalSubscription"),
    "la route arrete l'ancien avant que le nouveau soit actif",
  );
  const webhook = lire("app/api/commande/paypal/webhook/route.ts");
  assert.match(webhook, /if \(abo\.remplace\)/);
});

test("aucun mois offert sur une montee de palier", () => {
  // Le cadeau sert a faire ESSAYER Tiquiz. Elle l'utilise deja.
  const route = lire("app/api/billing/change-plan/route.ts");
  assert.match(route, /trialDays: 0/);
});

// ── L'ÉCRAN NE ROUVRE PAS UN DEUXIÈME ABONNEMENT ─────────────────────
//
// LE BUG QUE CETTE SECTION FERME : jusqu'ici, un abonné qui voulait le
// Plus cliquait sur le bon de commande du Plus. Il ouvrait donc un
// DEUXIÈME abonnement pendant que le premier continuait de le prélever,
// et il ne s'en apercevait qu'au relevé suivant.

test("l'ecran traduit son plan en produit, sans recopier la table", () => {
  assert.equal(produitPourPlan("monthly")?.id, "mensuel");
  assert.equal(produitPourPlan("monthly_plus")?.id, "mensuel-plus");
  assert.equal(produitPourPlan("yearly")?.id, "annuel");
  assert.equal(produitPourPlan("yearly_plus")?.id, "annuel-plus");
  // Un plan qui n'est pas vendu par ce catalogue ne propose rien.
  assert.equal(produitPourPlan("lifetime"), null);
  assert.equal(produitPourPlan("free"), null);
  assert.equal(produitPourPlan(null), null);
});

test("un bouton de montee ne s'affiche que si c'en est une", () => {
  const cibles = ciblesPossibles("mensuel");
  assert.equal(monteeVersProduit("monthly_plus", cibles), "mensuel-plus");
  assert.equal(monteeVersProduit("yearly", cibles), "annuel");
  // Son propre palier : rien a proposer.
  assert.equal(monteeVersProduit("monthly", cibles), null);
  // Une descente EST proposee depuis le 29 aout : le bouton existe, et
  // c'est le dialogue qui annonce une date au lieu d'un montant.
  assert.equal(monteeVersProduit("monthly", ciblesPossibles("mensuel-plus")), "mensuel");
  // Le gratuit n'est pas un palier vendu : on n'y descend pas, on
  // resilie.
  assert.equal(monteeVersProduit("free", cibles), null);
});

test("l'ecran des formules passe par la route, pas par le bon de commande", () => {
  const src = lire("components/settings/SettingsClient.tsx");
  assert.match(src, /\/api\/billing\/change-plan/);
  // La branche de montee doit passer AVANT celle du lien de commande,
  // sinon un abonne rouvre un deuxieme abonnement.
  const iMontee = src.indexOf("monteeVersProduit(planKey");
  const iLien = src.indexOf("plan.ctaKey && effectiveCheckoutUrl ? (");
  assert.ok(iMontee > 0, "l'ecran ne propose aucune montee");
  assert.ok(iLien > 0, "le lien du bon de commande a disparu");
  assert.ok(iMontee < iLien, "le lien du bon de commande gagne sur la montee");

  // Un client de REVENDEUR passe avant les deux, et c'est voulu : il
  // paie son prestataire, pas nous. Le monter sur notre abonnement lui
  // prendrait de l'argent au nom de quelqu'un d'autre.
  const iRevendeur = src.indexOf("managedBilling?.managed && planKey && effectiveCheckoutUrl");
  assert.ok(iRevendeur > 0 && iRevendeur < iMontee, "le client de revendeur n'est plus prioritaire");
});

test("le montant vient du serveur, jamais d'une soustraction faite a l'ecran", () => {
  // Un montant affiche different du montant preleve est pire que pas de
  // montant du tout.
  const src = lire("components/settings/SettingsClient.tsx");
  assert.match(src, /aPayerCents: d\.aPayerCents/);
  assert.ok(
    !/amountCents\s*-\s*/.test(src),
    "l'ecran recalcule la difference au lieu de la demander",
  );
});
