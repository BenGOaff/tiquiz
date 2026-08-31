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
import { REF_MAX_AGE_SECONDS } from "@/lib/affiliate/refLien";
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
    assert.match(paypal, /annulerCommissionVente\(\{[\s\S]{0,300}?motif: "remboursement"/);
  });

  test("LA CLÉ D'ANNULATION EST CELLE DE LA CRÉATION", () => {
    // `commissionnerVente` écrit `<moyen>:<reference>` dans
    // `sio_order_id`. Une clé qui ne correspond pas n'annule rien, en
    // silence, ce qui est exactement le bug qu'on ferme. C'est pour ça
    // que l'appelant passe la clé ENTIÈRE, préfixe compris.
    assert.match(ownerSale, /const ref = `\$\{vente\.moyen\}:\$\{reference\}`/);
    assert.match(ownerSale, /sio_order_id: cle,/);
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

describe("On paie chaque mois ou le client reste abonne", () => {
  test("L'ACTIVATION PAYPAL NE COMMISSIONNE RIEN", () => {
    // Elle ouvre l'accès, elle ne fait pas rentrer d'argent : un
    // abonnement qui démarre par un mois offert est ACTIVÉ sans qu'un
    // euro ait bougé. La commission naissait alors sur une vente à
    // zéro, mûrissait en 21 jours, et partait AVANT le premier
    // prélèvement, qui tombe au 30e.
    const activation = paypal.slice(paypal.indexOf('eventType !== "BILLING.SUBSCRIPTION.ACTIVATED"'));
    assert.ok(
      !activation.includes("commissionnerVente"),
      "l'activation commissionne de nouveau",
    );
    assert.match(activation, /L'ACTIVATION NE COMMISSIONNE RIEN/);
  });

  test("CHAQUE ÉCHÉANCE PAYPAL COMMISSIONNE, sur la clé de LA VENTE", () => {
    // Avec l'abonnement pour clé, la deuxième échéance tombait sur la
    // contrainte d'unicité et l'affilié ne touchait plus rien à partir
    // du deuxième mois.
    // On borne au BLOC de l'echeance (jusqu'a son `return`), pas a un
    // nombre de caracteres : un commentaire ajoute au dessus poussait
    // l'appel hors de la fenetre et faisait rougir un code juste.
    const debut = paypal.indexOf('eventType === "PAYMENT.SALE.COMPLETED"');
    const fin = paypal.indexOf('reason: "echeance"', debut);
    const echeance = paypal.slice(debut, fin > debut ? fin : undefined);
    assert.match(echeance, /reference: encaissement\.saleRef/);
    assert.match(echeance, /moyen: "paypal"/);
  });

  test("LE CHECKOUT STRIPE NE COMMISSIONNE QUE LES ACHATS UNIQUES", () => {
    // Un abonnement est commissionné facture par facture. Commissionner
    // au checkout EN PLUS ferait deux commissions sur le premier mois,
    // sous deux clés différentes, donc sans que l'unicité les voie.
    assert.match(stripe, /if \(product\.interval === null\) \{[\s\S]{0,400}?commissionnerVente/);
  });

  test("CHAQUE FACTURE STRIPE PAYÉE COMMISSIONNE, sur la clé de LA FACTURE", () => {
    assert.match(stripe, /commissionnerEcheance\(abonnement, objet\)/);
    assert.match(stripe, /eventType === "invoice\.paid"/);
    const bloc = stripe.slice(stripe.indexOf("async function commissionnerEcheance("));
    assert.match(bloc, /reference: factureId/);
    // Sur ce qui a VRAIMENT été encaissé, jamais le prix du catalogue :
    // une remise, un prorata ou une TVA différente changent la somme.
    assert.match(bloc, /facture\.amount_paid/);
  });

  test("LE MOIS OFFERT SE RÈGLE TOUT SEUL, sans un drapeau de plus", () => {
    // La facture d'essai vaut 0, donc pas de commission ; la première
    // vraie échéance en crée une. Plus aucun code ne lit
    // `free_month_days` pour decider d'une commission.
    assert.equal(commissionBaseCents(0, 0), 0);
    const bloc = stripe.slice(stripe.indexOf("async function commissionnerEcheance("));
    assert.ok(!bloc.includes("free_month_days"), "la commission depend de nouveau d'un drapeau");
    assert.match(bloc, /if \(paye <= 0\) return;/);
  });

  test("UNE FACTURE SANS IDENTIFIANT NE COMMISSIONNE PAS", () => {
    // Elle serait impossible à dédupliquer, donc rejouée à chaque
    // reessai du webhook : mieux vaut une commission manquante, qui se
    // rattrape, qu'une commission versée douze fois.
    const bloc = stripe.slice(stripe.indexOf("async function commissionnerEcheance("));
    assert.match(bloc, /if \(!factureId\)/);
    assert.match(bloc, /impossible a dedupliquer/);
  });

  test("UN REMBOURSEMENT N'ANNULE QUE L'ÉCHÉANCE REMBOURSÉE", () => {
    // Les mois déjà encaissés ont été gagnés et restent acquis : Béné
    // dit "on arrête de payer s'il se barre", pas "on reprend ce qui a
    // été versé".
    assert.match(stripe, /charge as \{ invoice\?: unknown \}/);
    assert.match(stripe, /references: \[/);
    assert.match(paypal, /remboursement\?\.saleRef \? `paypal:\$\{remboursement\.saleRef\}`/);
  });

  test("LE MOYEN DE PAIEMENT PRÉFIXE LA CLÉ", () => {
    // Le préfixe était `stripe:` pour tout le monde, PayPal compris :
    // ça marchait par accident, et une clé qui ment sur sa provenance
    // est introuvable le jour où il faut la retrouver à la main.
    assert.match(ownerSale, /const ref = `\$\{vente\.moyen\}:\$\{reference\}`/);
    assert.match(ownerSale, /moyen: "stripe" \| "paypal";/);
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

// ── 6. LE RATTACHEMENT À VIE, CÔTÉ INSCRIPTION ──────────────────────

describe("Une inscription gratuite rattache a son affilie", () => {
  const signup = lire("app/api/auth/signup/route.ts");
  const rattacher = lire("lib/affiliate/rattacherInscrit.ts");

  test("L'INSCRIPTION LIT LES DEUX COOKIES", () => {
    // Elle n'en lisait AUCUN : la règle "inscrit en free sur son lien =
    // son affilié à vie" ne marchait que via Systeme.io, dont l'optin
    // appelle `sio-conversion`. Sur nos pages, l'affilié perdait son
    // prospect à l'expiration du cookie.
    assert.match(signup, /rattacherInscrit\(\{/);
    assert.match(signup, /req\.cookies\.get\(REF_COOKIE\)/);
    assert.match(signup, /req\.cookies\.get\(SA_COOKIE\)/);
  });

  test("APRÈS la création du compte, et jamais avant", () => {
    // Un rattachement qui échoue ne doit pas priver quelqu'un de son
    // inscription : un compte non créé est un client perdu tout de
    // suite, un rattachement manquant se rattrape.
    const iCompte = signup.indexOf("generateLink");
    const iRattache = signup.indexOf("rattacherInscrit({");
    assert.ok(iCompte > 0 && iRattache > iCompte, "le rattachement passe avant la creation");
  });

  test("ET IL NE FAIT JAMAIS ÉCHOUER L'INSCRIPTION", () => {
    assert.match(rattacher, /Promise<void>/);
    assert.match(rattacher, /catch \(e\)/);
    assert.match(rattacher, /AbortSignal\.timeout\(8000\)/);
  });

  test("SANS LIEN AFFILIÉ, aucun aller-retour reseau", () => {
    // C'est le cas NORMAL et le plus fréquent : la majorité des
    // inscriptions n'ont pas d'affilié. Appeler Tipote pour rien
    // ralentirait toutes les inscriptions.
    assert.match(rattacher, /if \(!ref && !sa\) return;/);
  });

  test("LE COOKIE DURE UN AN, donc le rattachement est encore possible", () => {
    // Les deux moitiés de la même promesse : le cookie porte le lien
    // jusqu'à l'inscription, l'inscription le grave à vie.
    assert.equal(REF_MAX_AGE_SECONDS, 365 * 24 * 60 * 60);
  });
});

// ── LE CANAL D'UN LIEN AFFILIÉ (Béné, 29 août 2026) ──────────────────
//
// "On leur attribue un code par défaut qui sera toujours valable, plus
// la possibilité de le personnaliser et de tracker avec ?sc=youtube ou
// un truc du genre."
//
// Le canal existait déjà, sous le nom `c`. On accepte donc les DEUX
// noms : renommer sec ferait perdre le canal des liens déjà partagés,
// en silence, et un canal perdu ne se retrouve pas.

test("le canal se lit sous ?sc=, le nom qu'on ecrit desormais", async () => {
  const { canalDeLUrl, CANAL_PARAM } = await import("@/lib/affiliate/signalerClic");
  assert.equal(CANAL_PARAM, "sc");
  assert.equal(canalDeLUrl(new URLSearchParams("ref=eric&sc=youtube")), "youtube");
});

test("UN ANCIEN LIEN EN ?c= CONTINUE DE MARCHER", async () => {
  // Des liens le portent peut-etre deja. Un canal perdu ne se retrouve
  // pas : le clic est passe.
  const { canalDeLUrl } = await import("@/lib/affiliate/signalerClic");
  assert.equal(canalDeLUrl(new URLSearchParams("ref=eric&c=newsletter")), "newsletter");
});

test("les deux ensemble : le NOTRE gagne", async () => {
  // Quelqu'un qui ecrit les deux a probablement corrige son lien sans
  // retirer l'ancien.
  const { canalDeLUrl } = await import("@/lib/affiliate/signalerClic");
  assert.equal(canalDeLUrl(new URLSearchParams("sc=youtube&c=vieux")), "youtube");
});

test("aucun canal reste null, on n'invente pas d'etiquette", async () => {
  // Inventer une valeur ferait apparaitre un canal que personne n'a
  // ecrit, et fausserait la comparaison entre ses canaux.
  const { canalDeLUrl } = await import("@/lib/affiliate/signalerClic");
  assert.equal(canalDeLUrl(new URLSearchParams("ref=eric")), null);
  assert.equal(canalDeLUrl(new URLSearchParams("sc=%20%20")), null);
});
