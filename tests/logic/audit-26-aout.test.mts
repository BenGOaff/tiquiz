// tests/logic/audit-26-aout.test.mts
//
// L'AUDIT DU 26 AOÛT, CÔTÉ VENTE.
//
// Béné : "je veux que tout soit fiable, stable, précis... pour tous les
// cas de figure (upgrades downgrades, remboursement annulation demandes
// etc... auto affiliation factures affiliés, factures clients etc...)"
//
// Trois trous d'argent, et ils ont tous la même forme, celle du 1er
// août : **une logique écrite pour un cas, appliquée telle quelle à un
// autre.**
//
//  1. un remboursement ne touchait PAS à la commission ;
//  2. un impayé n'était écouté NULLE PART ;
//  3. le MOIS OFFERT commissionnait à l'envers sur les deux
//     fournisseurs : PayPal payait avant le premier euro, Stripe ne
//     payait jamais.
//
// Ce qui a changé le 25 août, c'est le prix de l'erreur : c'est nous qui
// virons maintenant, et un virement ne se reprend pas.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { describe } from "node:test";

import { memeBoite, normaliserEmail } from "@/lib/trial/moisOffert";
import { memePersonne } from "@/lib/affiliate/memeAdresse";
import { commissionBaseCents } from "@/lib/checkout/commissionBase";

const lire = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

const stripe = lire("app/api/commande/webhook/route.ts");
const paypal = lire("app/api/commande/paypal/webhook/route.ts");
const ownerSale = lire("lib/affiliate/ownerSale.ts");

// ── 1. LA COMMISSION TOMBE AVEC LA VENTE ────────────────────────────

describe("Une vente qui tombe ne paie personne", () => {
  test("LE REMBOURSEMENT STRIPE ANNULE LA COMMISSION", () => {
    assert.match(stripe, /annulerCommissionVente\(\{/);
    assert.match(stripe, /motif,/);
  });

  test("LE REMBOURSEMENT PAYPAL AUSSI", () => {
    assert.match(paypal, /annulerCommissionVente\(\{ reference: abonnementId, motif: "remboursement" \}\)/);
  });

  test("LA CLÉ D'ANNULATION EST CELLE DE LA CRÉATION", () => {
    // `commissionnerVente` écrit `stripe:<reference>` dans
    // `sio_order_id`. Une clé qui ne correspond pas n'annule rien, en
    // silence, ce qui est exactement le bug qu'on ferme.
    assert.match(ownerSale, /const ref = `stripe:\$\{reference\}`/);
    assert.match(ownerSale, /sio_order_id: `stripe:\$\{reference\}`/);
  });

  test("L'ANNULATION NE FAIT JAMAIS ÉCHOUER LE REMBOURSEMENT", () => {
    // Un remboursement doit fermer l'accès même si Tipote ne répond pas ;
    // l'inverse ferait rejouer le remboursement en boucle.
    const bloc = ownerSale.slice(ownerSale.indexOf("export async function annulerCommissionVente"));
    assert.match(bloc, /Promise<void>/);
    assert.match(bloc, /catch \(e\)/);
    assert.match(bloc, /AbortSignal\.timeout\(8000\)/);
  });

  test("UNE COMMISSION DÉJÀ VERSÉE EST SIGNALÉE, pas réécrite", () => {
    const bloc = ownerSale.slice(ownerSale.indexOf("export async function annulerCommissionVente"));
    assert.match(bloc, /DEJA VERSEE/);
    assert.match(bloc, /tropTard/);
  });
});

// ── 2. L'IMPAYÉ ─────────────────────────────────────────────────────

describe("Quand la banque reprend l'argent", () => {
  test("`funds_withdrawn` FERME, `created` ne ferme rien", () => {
    // Une contestation se conteste : couper l'accès de quelqu'un qui va
    // gagner son litige nous ferait perdre un client pour rien.
    assert.match(stripe, /charge\.dispute\.funds_withdrawn/);
    assert.match(stripe, /surRemboursement\(event, "impaye"\)/);
    assert.match(stripe, /charge\.dispute\.created/);
    assert.match(stripe, /acces conserve, rien retire/);
  });

  test("UN IMPAYÉ N'EST JAMAIS PARTIEL, et l'objet reçu n'est pas le même", () => {
    // Sur un litige, `data.object` est un LITIGE : il n'a ni
    // `amount_refunded` ni `refunded`, donc `readRefundOutcome` y
    // répondrait "aucun remboursement" et on ne ferait rien. La mécanique
    // est un PARAMÈTRE, jamais une lecture de la forme reçue.
    assert.match(stripe, /if \(motif === "remboursement"\) \{[\s\S]{0,300}?readRefundOutcome/);
  });

  test("NOS CONDITIONS LE PROMETTAIENT DÉJÀ", () => {
    // Le texte annonçait ce que le code ne faisait pas, exactement comme
    // les CGV et le bon de commande le 22 août. Un test qui ne peut plus
    // échouer ment : celui ci exige que la promesse reste écrite.
    const cgv = lire("lib/legal/affiliate.ts");
    assert.match(cgv, /remboursement|refund/i);
    assert.match(cgv, /chargeback|impay/i);
  });
});

// ── 3. LE MOIS OFFERT, ET LES DEUX BUGS OPPOSÉS ─────────────────────

describe("Le mois offert et la commission", () => {
  test("PAYPAL NE COMMISSIONNE PLUS À L'ACTIVATION QUAND IL Y A UN ESSAI", () => {
    // PayPal ACTIVE sans qu'un euro ait bougé : la commission naissait
    // sur une vente à zéro, mûrissait en 21 jours, et partait AVANT le
    // premier prélèvement, qui tombe au 30e.
    assert.match(paypal, /if \(abo\.trialDays > 0\) \{[\s\S]{0,400}?commission REPORTEE/);
  });

  test("ELLE PART À L'ÉCHÉANCE, avec la MÊME clé", () => {
    // Donc la deuxième échéance tombe sur la contrainte d'unicité et ne
    // paie pas deux fois. Un abonnement sans essai est commissionné à
    // l'activation : l'échéance est alors un doublon, et c'est voulu.
    const echeance = paypal.slice(paypal.indexOf('eventType === "PAYMENT.SALE.COMPLETED"'));
    assert.match(echeance.slice(0, 3000), /commissionnerVente\(\{[\s\S]{0,300}?reference: abonnementId/);
  });

  test("STRIPE : UNE VENTE AVEC ESSAI EST À ZÉRO AU CHECKOUT", () => {
    // C'est la cause du bug miroir : `amount_total` vaut 0, donc la base
    // vaut 0, donc AUCUNE commission n'était créée, et rien ne la créait
    // plus jamais ensuite. L'affilié promouvait le mois offert et
    // n'était payé sur aucune de ces ventes.
    assert.equal(commissionBaseCents(0, 0), 0);
  });

  test("STRIPE LA CRÉE À LA PREMIÈRE FACTURE PAYÉE", () => {
    assert.match(stripe, /commissionnerEcheanceOfferte/);
    assert.match(stripe, /eventType === "invoice\.paid"/);
    // Gaté sur la mécanique : sur une vente sans essai la commission est
    // déjà partie au checkout, et repasser ici en créerait une SECONDE
    // sous une autre clé.
    assert.match(stripe, /free_month_days[\s\S]{0,200}?if \(jours <= 0\) return;/);
    // Sur ce qui a VRAIMENT été encaissé, jamais le prix du catalogue.
    assert.match(stripe, /facture\.amount_paid/);
  });

  test("LA CLÉ EST L'ABONNEMENT, donc une seule commission", () => {
    const bloc = stripe.slice(stripe.indexOf("async function commissionnerEcheanceOfferte"));
    assert.match(bloc, /reference: subId/);
  });
});

// ── 4. LA BASE DE COMMISSION EST DITE ───────────────────────────────

describe("Sur quoi on paie", () => {
  test("NOTRE CHECKOUT DIT QU'IL ENVOIE DU HT", () => {
    // `commissionBaseCents` a déjà retiré la TVA : sans ce champ, Tipote
    // lisait le montant comme du TTC et le rabotait une deuxième fois.
    assert.match(ownerSale, /base: "ht"/);
  });

  test("le HT reste le TTC quand la taxe est absente ou absurde", () => {
    // On ne devine JAMAIS un taux : un taux inventé produirait un
    // versement faux qui a l'air juste.
    assert.equal(commissionBaseCents(1700, 0), 1700);
    assert.equal(commissionBaseCents(1700, 283), 1417);
    assert.equal(commissionBaseCents(1700, 1700), 1700);
    assert.equal(commissionBaseCents(1700, -5), 1700);
  });
});

// ── 5. UNE SEULE RÈGLE POUR L'AUTO-AFFILIATION ──────────────────────

describe("S'affilier à soi même", () => {
  test("LE CADEAU ET L'ARGENT SUIVENT LA MÊME RÈGLE", () => {
    // Elle était enfermée dans `moisOffert.ts`, donc elle ne gardait que
    // le mois offert. La commission, elle, comparait les adresses
    // brutes : on protégeait le cadeau mieux que le versement.
    // La MEME fonction, pas deux qui se ressemblent : c'est la seule
    // forme qui ne peut pas diverger au prochain passage.
    assert.equal(memeBoite, memePersonne);
    assert.ok(memeBoite("bene+x@gmail.com", "b.e.n.e@googlemail.com"));
    assert.equal(normaliserEmail("B.E.N.E+promo@GoogleMail.com"), "bene@gmail.com");
  });

  test("`moisOffert` DÉLÈGUE, il ne redéfinit plus la règle", () => {
    const src = lire("lib/trial/moisOffert.ts");
    assert.match(src, /from "@\/lib\/affiliate\/memeAdresse"/);
    assert.ok(!src.includes("const DOMAINES_GMAIL"), "la regle est de nouveau dupliquee");
  });
});
