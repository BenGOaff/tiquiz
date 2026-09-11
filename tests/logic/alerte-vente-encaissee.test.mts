// tests/logic/alerte-vente-encaissee.test.mts
//
// UNE VENTE ENCAISSÉE PAR NOTRE BON DE COMMANDE PRÉVIENT BÉNÉ (11 septembre 2026).
//
// Béné : "il me faut aussi une alerte quand je fais une nouvelle vente
// via notre système, par email."
//
// -- CE QUE CE FILET TIENT ---------------------------------------------
//
// 1. LE CONTENU. Trois natures, trois emails différents : une première
//    vente, un renouvellement, un mois offert. Et PayPal, qui ne sait
//    pas dire lequel : on le DIT, on ne devine pas.
// 2. L'ORDRE. L'alerte part APRÈS l'accès, la facture et la commission,
//    à chacun des trois points d'encaissement. Une alerte qui passerait
//    devant pourrait faire perdre une commission sur un échec d'envoi.
// 3. UN SEUL EMAIL PAR VENTE. Un abonnement Stripe est annoncé sur la
//    facture, jamais aussi au checkout : sinon deux emails pour la même
//    vente.
// 4. UN SEUL ENVOI PAR ALERTE. Les trois alertes existantes envoyaient
//    à `[...ADMIN_EMAILS]`, deux adresses, la même boîte : le double
//    que Béné a fait retirer côté Atelier le 25 août.
// 5. LE DOUBLON SYSTEME.IO SE JOURNALISE. Un appel écarté ne laissait
//    aucune ligne, donc "jamais reçu" et "reçu puis écarté" se lisaient
//    pareil.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ADMIN_ALERT_EMAILS, ADMIN_EMAILS } from "@/lib/adminEmails";
import { LIBELLE_VERDICT, demandeUneAction, readCallVerdict } from "@/lib/admin/webhookRows";
import {
  contenuAlerteVente,
  montantLisible,
  natureDeLaFactureStripe,
  type VenteAlertee,
} from "@/lib/ventes/alerteVente";
import { sansCommentaires } from "./aide/sansCommentaires.mts";

const source = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const STRIPE = "app/api/commande/webhook/route.ts";
const PAYPAL = "app/api/commande/paypal/webhook/route.ts";
const SIO = "app/api/systeme-io/webhook/route.ts";
const TIRET_LONG = /[–—]/;

const base: VenteAlertee = {
  app: "Tiquiz",
  moyen: "stripe",
  nature: "premiere",
  email: "fatima@example.com",
  nom: "Fatima",
  produit: "Tiquiz mensuel",
  montantCents: 1700,
  devise: "eur",
  reference: "in_123",
  compteCree: true,
  lienAdmin: "https://quiz.tipote.com/admin/clients/fatima%40example.com",
};

// ── 1. le contenu ──

test("la nature d'une facture Stripe : premiere, essai, echeance", () => {
  assert.equal(natureDeLaFactureStripe("subscription_create", 1700), "premiere");
  assert.equal(natureDeLaFactureStripe("subscription_create", 0), "essai");
  assert.equal(natureDeLaFactureStripe("subscription_cycle", 1700), "echeance");
  assert.equal(natureDeLaFactureStripe("subscription_update", 1200), "echeance");
  assert.equal(natureDeLaFactureStripe(undefined, 1700), "echeance");
});

test("le montant se lit avec deux decimales, dans la devise", () => {
  assert.match(montantLisible(1700, "eur"), /17,00\s?€/);
  assert.match(montantLisible(567, "eur"), /5,67\s?€/);
  assert.match(montantLisible(2900, "usd"), /29,00/);
});

test("chaque nature a son objet, et l'objet porte le montant et le produit", () => {
  const premiere = contenuAlerteVente(base);
  assert.match(premiere.subject, /^Nouvelle vente Tiquiz/);
  assert.match(premiere.subject, /17,00\s?€/);
  assert.match(premiere.subject, /Tiquiz mensuel/);

  const echeance = contenuAlerteVente({ ...base, nature: "echeance" });
  assert.match(echeance.subject, /^Échéance encaissée Tiquiz/);
  assert.match(echeance.html, /renouvellement/);

  const essai = contenuAlerteVente({ ...base, nature: "essai", montantCents: 0 });
  assert.match(essai.subject, /^Nouvel essai Tiquiz/);
  assert.match(essai.subject, /mois offert/);
  assert.match(essai.html, /rien n'a été prélevé/);

  const inconnue = contenuAlerteVente({ ...base, moyen: "paypal", nature: "inconnue", compteCree: null });
  assert.match(inconnue.subject, /^Encaissement Tiquiz/);
  assert.match(inconnue.html, /PayPal ne dit pas/);
  assert.ok(!/compte/i.test(inconnue.html.replace(/Ouvrir sa fiche/i, "")), "compteCree null : aucune phrase sur le compte");
});

test("le corps dit qui, quoi, combien, par quel moyen, et mene a la fiche", () => {
  const c = contenuAlerteVente(base);
  for (const attendu of ["Fatima (fatima@example.com)", "Tiquiz mensuel", "carte bancaire (Stripe)", "in_123", "Le compte vient d'être créé."]) {
    assert.ok(c.html.includes(attendu), `manque dans le html : ${attendu}`);
    assert.ok(c.texte.includes(attendu), `manque dans le texte : ${attendu}`);
  }
  assert.ok(c.html.includes(`href="${base.lienAdmin}"`));
  assert.ok(contenuAlerteVente({ ...base, compteCree: false }).html.includes("Le compte existait déjà."));
});

test("ce qui vient de l'exterieur est echappe", () => {
  const c = contenuAlerteVente({ ...base, nom: "<script>alert(1)</script>", produit: 'Tiquiz "PLUS" & co' });
  assert.ok(!c.html.includes("<script>"), "un nom saisi au paiement ne devient jamais du HTML");
  assert.ok(c.html.includes("&lt;script&gt;"));
  assert.ok(c.html.includes("&quot;PLUS&quot; &amp; co"));
});

test("aucun tiret cadratin dans ce que Bene lit", () => {
  for (const nature of ["premiere", "echeance", "essai", "inconnue"] as const) {
    const c = contenuAlerteVente({ ...base, nature });
    assert.doesNotMatch(c.subject, TIRET_LONG);
    assert.doesNotMatch(c.html, TIRET_LONG);
    assert.doesNotMatch(c.texte, TIRET_LONG);
  }
});

// ── 2 et 3. l'ordre, et un seul email par vente ──

test("Stripe : l'achat unique alerte APRES la commission, et seulement lui", () => {
  const code = sansCommentaires(source(STRIPE));
  const bloc = code.indexOf("if (product.interval === null) {");
  assert.ok(bloc > 0, "le bloc de l'achat unique existe");
  const finBloc = code.indexOf("return NextResponse.json({ ok: true, granted: true });", bloc);
  const dedans = code.slice(bloc, finBloc);
  const commission = dedans.indexOf("commissionnerVente(");
  const alerte = dedans.indexOf("alerterVenteEncaissee(");
  assert.ok(commission > 0 && alerte > commission, "l'alerte part apres la commission, dans le bloc de l'achat unique");
  assert.match(dedans, /nature: "premiere"/);
  // Un abonnement n'est PAS annonce au checkout : il l'est sur la facture.
  const avantBloc = code.slice(0, bloc);
  assert.ok(!avantBloc.includes("alerterVenteEncaissee("), "aucune alerte avant le bloc de l'achat unique");
});

test("Stripe : chaque facture payee alerte APRES la commission, avec sa nature", () => {
  const code = sansCommentaires(source(STRIPE));
  const branche = code.indexOf('if (eventType === "invoice.paid") {');
  assert.ok(branche > 0);
  const fin = code.indexOf("}", branche);
  const dedans = code.slice(branche, fin);
  const commission = dedans.indexOf("commissionnerEcheance(abonnement, objet)");
  const alerte = dedans.indexOf("alerterEcheance(abonnement, objet)");
  assert.ok(commission > 0 && alerte > commission);
  // La nature vient de la facture, jamais d'une constante.
  const fn = code.indexOf("async function alerterEcheance(");
  const corps = code.slice(fn, code.indexOf("async function commissionnerEcheance(", fn));
  assert.match(corps, /natureDeLaFactureStripe\(facture\.billing_reason, paye\)/);
  assert.match(corps, /montantCents: paye/);
  assert.ok(!/nature: "premiere"/.test(corps), "la nature n'est pas ecrite en dur");
});

test("PayPal : l'echeance alerte APRES la commission, et dit qu'elle ne sait pas si c'est la premiere", () => {
  const code = sansCommentaires(source(PAYPAL));
  const branche = code.indexOf('if (eventType === "PAYMENT.SALE.COMPLETED") {');
  const fin = code.indexOf('return NextResponse.json({ ok: true, reason: "echeance" });', branche);
  const dedans = code.slice(branche, fin);
  const commission = dedans.lastIndexOf("commissionnerVente(");
  const alerte = dedans.indexOf("alerterVenteEncaissee(");
  assert.ok(commission > 0 && alerte > commission, "l'alerte part apres la commission");
  assert.match(dedans, /nature: "inconnue"/);
  assert.match(dedans, /montantCents: encaissement\.totalCents/);
  assert.ok(!/nature: "premiere"/.test(code), "PayPal ne peut pas annoncer une premiere echeance");
});

test("l'alerte de vente ne leve jamais et passe par le seul chemin d'envoi", () => {
  const code = sansCommentaires(source("lib/email/venteEncaisseeAlerte.ts"));
  assert.match(code, /alerterAdmins\(/);
  assert.match(code, /try \{/);
  assert.ok(!code.includes("ADMIN_EMAILS"), "les destinataires ne se decident pas ici");
  assert.ok(!code.includes("throw "), "une alerte qui echoue ne change jamais la reponse au webhook");
});

// ── 4. un seul envoi par alerte ──

test("alerterAdmins fait UN envoi, a la liste des alertes, sans boucle", () => {
  const code = sansCommentaires(source("lib/email/alerteAdmin.ts"));
  assert.equal((code.match(/await fetch\(/g) ?? []).length, 1);
  assert.ok(!/for\s*\(/.test(code), "aucune boucle dans le seul chemin d'alerte");
  assert.match(code, /to: \[\.\.\.ADMIN_ALERT_EMAILS\]/);
  assert.ok(!/\[\.\.\.ADMIN_EMAILS\]/.test(code));
});

test("les trois alertes existantes n'envoient plus a la liste des admins entiere", () => {
  for (const f of ["lib/email/saleRefusedAlert.ts", "lib/email/supportAlertEmail.ts", "lib/email/commentaireBlogAlerte.ts"]) {
    const code = sansCommentaires(source(f));
    assert.ok(!/\[\.\.\.ADMIN_EMAILS\]/.test(code), `${f} envoie encore a toutes les adresses admin`);
    assert.match(code, /to: \[\.\.\.ADMIN_ALERT_EMAILS\]/, f);
  }
});

test("la liste des alertes ne porte aucune adresse en double, et chaque adresse peut entrer", () => {
  assert.ok(ADMIN_ALERT_EMAILS.length >= 1);
  assert.equal(new Set(ADMIN_ALERT_EMAILS.map((e) => e.toLowerCase())).size, ADMIN_ALERT_EMAILS.length);
  for (const e of ADMIN_ALERT_EMAILS) {
    assert.ok(ADMIN_EMAILS.map((a) => a.toLowerCase()).includes(e.toLowerCase()), `${e} recoit des alertes sans pouvoir entrer`);
  }
});

// ── 5. le doublon Systeme.io se journalise ──

test("un appel Systeme.io ecarte comme doublon laisse une ligne, jamais 'processed'", () => {
  const code = sansCommentaires(source(SIO));
  const debut = code.indexOf("if (dup) {");
  assert.ok(debut > 0);
  const fin = code.indexOf("duplicate: true", debut);
  const branche = code.slice(debut, fin);
  assert.match(branche, /logWebhook\(/, "le doublon est journalise avant d'etre ecarte");
  assert.match(branche, /status: "duplicate"/);
  assert.ok(!/status: "processed"/.test(branche), "un doublon ne verrouille rien");
});

test("une ligne 'duplicate' se lit 'doublon', et ne demande aucune action", () => {
  const v = readCallVerdict({ source: "systeme_io", eventType: "customer.sale.completed", status: "duplicate", error: "duplicate_retry", planNow: null } as never);
  assert.equal(v, "doublon");
  assert.equal(demandeUneAction(v), false);
  assert.equal(LIBELLE_VERDICT.doublon.ton, "info");
  assert.doesNotMatch(LIBELLE_VERDICT.doublon.aide, TIRET_LONG);
});
