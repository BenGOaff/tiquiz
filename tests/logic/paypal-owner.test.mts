// tests/logic/paypal-owner.test.mts
//
// PAYPAL SUR LE BON DE COMMANDE DE TIQUIZ.
//
// Béné, 23 août 2026 : "on peut revenir à paypal Tiquiz : j'ai déjà créé
// l'app et ajouté ce qu'il faut dans le .env."
//
// -- CE QUI REND CE CHANTIER DIFFÉRENT DE L'ATELIER --------------------
//
// L'Atelier vend un ACHAT UNIQUE (API Orders) : une commande, une
// capture, terminé. Tiquiz vend des ABONNEMENTS (API Subscriptions) : un
// produit, un plan, un abonnement, et un cycle de vie à écouter. Les
// deux se ressemblent en surface et ne font pas le même métier. Copier
// l'un sur l'autre aurait donné un paiement unique de 17 € au lieu d'un
// abonnement mensuel, et personne ne l'aurait vu avant le deuxième mois.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { OWNER_CATALOG } from "../../lib/checkout/catalog.ts";
import {
  buildCustomId,
  CUSTOM_ID_MAX,
  paypalAmount,
  paypalAmountToCents,
  paypalInterval,
  paypalOwnerBase,
  readCustomId,
  readSubscription,
} from "../../lib/checkout/paypalOwner.ts";

function lire(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

// ── LES MONTANTS ──

test("les euros de PayPal ne sont pas des centimes", () => {
  assert.equal(paypalAmount(1700), "17.00");
  assert.equal(paypalAmount(29000), "290.00");
  assert.equal(paypalAmount(1), "0.01");
  // Et le retour, parce que c'est lui qui sert de base a une commission.
  assert.equal(paypalAmountToCents("17.00"), 1700);
  assert.equal(paypalAmountToCents(""), 0);
  assert.equal(paypalAmountToCents(null), 0);
  assert.equal(paypalAmountToCents("bof"), 0);
});

test("le bac a sable et le reel ne sont pas la meme adresse", () => {
  // Le piege numero un : des identifiants REELS envoyes a l'API du bac a
  // sable sont refuses, avec un message qui ne dit pas pourquoi.
  assert.equal(paypalOwnerBase("live"), "https://api-m.paypal.com");
  assert.equal(paypalOwnerBase("test"), "https://api-m.sandbox.paypal.com");
});

test("les quatre paliers vendus sont des abonnements", () => {
  for (const produit of Object.values(OWNER_CATALOG)) {
    assert.ok(
      paypalInterval(produit),
      `${produit.id} n'a pas de periodicite : il partirait en achat unique`,
    );
  }
  // Un produit sans periodicite est refuse, pas transforme en mensuel.
  assert.equal(paypalInterval({ ...OWNER_CATALOG.mensuel, interval: null }), null);
});

// ── LE `custom_id` : CE QU'ON REFUSE DE PERDRE ──

test("l'adresse SAISIE voyage avec la commande", () => {
  // PayPal renvoie l'adresse du COMPTE PayPal, qui n'est pas toujours
  // celle saisie chez nous (compte du conjoint, adresse pro). Ouvrir
  // l'acces sur celle-la fabrique un compte orphelin : c'est ce que
  // l'Atelier a rencontre le 7 aout sur les commandes de bonus.
  const id = buildCustomId({
    productId: "mensuel",
    email: "bene@tipote.fr",
    affiliateRef: "sa00168442b1c2d3e4f5a6b7c8d9",
  });
  const lu = readCustomId(id);
  assert.equal(lu.productId, "mensuel");
  assert.equal(lu.email, "bene@tipote.fr");
  assert.equal(lu.affiliateRef, "sa00168442b1c2d3e4f5a6b7c8d9");
});

test("quand ca ne tient pas, on lache le sa, JAMAIS l'adresse", () => {
  // PayPal borne `custom_id` a 127 caracteres. Perdre l'adresse, c'est
  // un acheteur qui paie et n'a rien ; perdre le `sa`, c'est une
  // attribution qui retombe sur la conversion par email, qui existe.
  const longue = `${"a".repeat(80)}@tipote.fr`;
  const id = buildCustomId({
    productId: "annuel-plus",
    email: longue,
    affiliateRef: "sa00168442b1c2d3e4f5a6b7c8d9",
  });
  assert.ok(id.length <= CUSTOM_ID_MAX, "custom_id trop long : PayPal refuserait la commande");
  const lu = readCustomId(id);
  assert.equal(lu.email, longue, "l'adresse a ete sacrifiee");
  assert.equal(lu.affiliateRef, null, "le sa aurait du partir en premier");
});

test("un custom_id vide ne fabrique pas de fausses valeurs", () => {
  const vide = { productId: null, email: null, affiliateRef: null, trialDays: 0, remplace: null };
  assert.deepEqual(readCustomId(""), vide);
  assert.deepEqual(readCustomId(null), vide);
});

test("les jours offerts voyagent avec la commande, ils ne se devinent pas", () => {
  // Le webhook doit savoir qu'un mois a ete offert pour le marquer
  // comme consomme. Le deduire d'un `sa` present serait faux : un `sa`
  // peut etre la sans qu'aucun essai n'ait ete ouvert (personne qui a
  // deja eu son mois, auto-affiliation refusee), et marquer un cadeau
  // jamais fait priverait quelqu'un du sien.
  const avec = readCustomId(
    buildCustomId({
      productId: "mensuel",
      email: "a@b.fr",
      affiliateRef: "sa00168442b1c2d3e4f5a6b7c8d9",
      trialDays: 30,
    }),
  );
  assert.equal(avec.trialDays, 30);
  assert.equal(avec.email, "a@b.fr");

  const sans = readCustomId(buildCustomId({ productId: "mensuel", email: "a@b.fr" }));
  assert.equal(sans.trialDays, 0);
});

test("meme quand le sa est sacrifie, les jours offerts survivent", () => {
  // L'ordre de sacrifice compte : l'adresse d'abord (un acces perdu ne
  // se rattrape pas), les jours ensuite (un cadeau non trace se voit
  // dans l'admin), le sa en premier a partir.
  const longue = `${"a".repeat(80)}@tipote.fr`;
  const lu = readCustomId(
    buildCustomId({
      productId: "annuel-plus",
      email: longue,
      affiliateRef: "sa00168442b1c2d3e4f5a6b7c8d9",
      trialDays: 30,
    }),
  );
  assert.equal(lu.email, longue);
  assert.equal(lu.affiliateRef, null);
  assert.equal(lu.trialDays, 30);
});

// ── LA LECTURE D'UN ABONNEMENT ──

test("l'adresse saisie gagne sur celle du compte PayPal", () => {
  const info = readSubscription({
    status: "ACTIVE",
    custom_id: "mensuel|saisie@tipote.fr|",
    subscriber: { email_address: "compte-paypal@example.com" },
    billing_info: { last_payment: { amount: { value: "17.00" } } },
  });
  assert.equal(info.email, "saisie@tipote.fr");
  assert.equal(info.actif, true);
  assert.equal(info.amountCents, 1700);
  assert.equal(info.productId, "mensuel");
});

test("sans adresse saisie, on retombe sur celle du compte plutot que rien", () => {
  const info = readSubscription({
    status: "ACTIVE",
    custom_id: null,
    subscriber: { email_address: "compte-paypal@example.com" },
  });
  assert.equal(info.email, "compte-paypal@example.com");
});

test("APPROVED compte comme actif, CANCELLED non", () => {
  // APPROVED : approuve, activation imminente. C'est ce que voit
  // l'acheteur au retour immediat, et lui dire "en attente" alors qu'il
  // vient de payer serait un cul-de-sac.
  assert.equal(readSubscription({ status: "APPROVED" }).actif, true);
  assert.equal(readSubscription({ status: "ACTIVE" }).actif, true);
  assert.equal(readSubscription({ status: "CANCELLED" }).actif, false);
  assert.equal(readSubscription({ status: "SUSPENDED" }).actif, false);
  assert.equal(readSubscription({}).actif, false);
});

// ── CE QUE LE CODE DOIT FAIRE, ET QU'AUCUN TEST UNITAIRE NE VOIT ──

test("on ne prend pas de vrai argent tant que rien n'ouvre l'acces", () => {
  // Sans identifiant de webhook, aucune confirmation PayPal ne peut etre
  // verifiee : l'abonnement serait preleve et l'acheteur n'aurait rien.
  const src = lire("app/api/commande/paypal/route.ts");
  assert.ok(
    /compte\.mode === "live" && !readOwnerPaypalWebhookId/.test(src),
    "le garde-fou du webhook a saute : une vente pourrait etre prelevee sans acces",
  );
});

test("le webhook verifie la signature AVANT de rien faire", () => {
  const src = lire("app/api/commande/paypal/webhook/route.ts");
  // Les APPELS, pas les imports : ceux-ci sont ranges par ordre
  // alphabetique en haut du fichier (meme piege que apres-paiement).
  const iVerif = src.indexOf("await verifyOwnerPaypalWebhook(");
  const iOctroi = src.indexOf("await grantPlanByEmail(");
  assert.ok(iVerif > 0 && iOctroi > iVerif, "un corps non signe peut ouvrir un acces");
  assert.ok(src.includes("logWebhookEvent"), "plus d'idempotence : PayPal reessaie");
  // On relit chez PayPal : la signature prouve l'expediteur, pas la
  // fraicheur de l'objet.
  assert.ok(src.includes("getOwnerPaypalSubscription"), "on croit le corps recu sur parole");
});

test("SUSPENDED ne coupe PAS l'acces", () => {
  // PayPal suspend apres trois echecs de prelevement. Couper la mettrait
  // dehors quelqu'un dont la carte vient d'expirer et qui va la changer.
  // Meme regle que Stripe sur invoice.payment_failed.
  const src = lire("app/api/commande/paypal/webhook/route.ts");
  // La fenetre s'arrete au `return` de CE cas : plus loin commence le
  // remboursement, qui lui ferme l'acces a juste titre.
  const i = src.indexOf('if (eventType === "BILLING.SUBSCRIPTION.SUSPENDED")');
  assert.ok(i > 0, "le cas SUSPENDED a disparu du webhook");
  const bloc = src.slice(i, src.indexOf('reason: "suspended"', i));
  assert.ok(!bloc.includes("downgradeToFreeByEmail"), "une suspension ferme desormais l'acces");
  assert.ok(bloc.includes("acces conserve"), "le journal ne dit plus ce qui a ete decide");
});

test("un remboursement ARRETE l'abonnement PayPal", () => {
  // Rembourser sans arreter re-preleve le mois suivant quelqu'un qui n'a
  // plus rien. Meme regle que cote Stripe.
  const src = lire("app/api/commande/paypal/webhook/route.ts");
  const i = src.indexOf('PAYMENT.SALE.REFUNDED"');
  const bloc = src.slice(i, i + 900);
  assert.ok(bloc.includes("cancelOwnerPaypalSubscription"), "le remboursement laisse tourner l'abonnement");
});

test("la commission PayPal est sur le TTC, et c'est une DECISION", () => {
  // Bene, 22 aout : "pour paypal : oui on garde le TTC." PayPal ne
  // ventile pas la TVA comme Stripe Tax : passer une taxe a zero dit la
  // verite de cette vente la, au lieu d'inventer un taux.
  const src = lire("app/api/commande/paypal/webhook/route.ts");
  assert.ok(src.includes("amountTaxCents: 0"), "la base de commission a change sans decision");
  assert.ok(/TTC/.test(src), "la decision n'est plus expliquee la ou elle s'applique");
});

test("l'abonnement PayPal est rattache au compte, sinon on ne peut plus l'arreter", () => {
  const src = lire("app/api/commande/paypal/webhook/route.ts");
  assert.ok(src.includes("rememberPaypalSubscription"), "le fil vers PayPal n'est plus garde");
  // Et l'annulation partagee doit savoir s'en servir.
  const annul = lire("lib/checkout/cancelSubscriptions.ts");
  assert.ok(
    annul.includes("cancelOwnerPaypalSubscription"),
    "arreter un abonnement ne touche plus PayPal : acces coupe, prelevement en cours",
  );
});

test("le script d'installation ecoute exactement ce que la route traite", () => {
  // Un evenement ecoute mais non traite est du bruit ; un evenement
  // traite mais non ecoute ne part jamais, et l'acces ne s'ouvre pas.
  const script = lire("scripts/paypal-setup.mjs");
  const lib = lire("lib/checkout/paypalOwner.ts");
  for (const e of [
    "BILLING.SUBSCRIPTION.ACTIVATED",
    "BILLING.SUBSCRIPTION.CANCELLED",
    "BILLING.SUBSCRIPTION.EXPIRED",
    "BILLING.SUBSCRIPTION.SUSPENDED",
    "PAYMENT.SALE.COMPLETED",
    "PAYMENT.SALE.REFUNDED",
  ]) {
    assert.ok(script.includes(e), `${e} n'est pas demande a PayPal`);
    assert.ok(lib.includes(e), `${e} n'est plus dans la liste de reference`);
  }
});

test("la migration du fil PayPal existe et se replie", () => {
  const sql = lire("supabase/migrations/20260823_paypal_subscription.sql");
  assert.ok(/ADD COLUMN IF NOT EXISTS paypal_subscription_id/.test(sql));
  assert.ok(/NOTIFY pgrst/.test(sql), "PostgREST ne rechargera pas son schema");
  const lien = lire("lib/checkout/customerLink.ts");
  assert.ok(
    /colonne_absente/.test(lien),
    "sans repli, un deploiement en avance sur la migration perd le fil en silence",
  );
});

test("le bouton PayPal est rendu dans TOUTES les branches du bon de commande", () => {
  // Bene, 23 aout : "je ne vois pas paypal sur mon bon de commande test.
  // Uniquement Stripe." Le bloc etait rendu dans la branche d'erreur et
  // dans celle sans cle Stripe, et OUBLIE dans la seule que voit un
  // acheteur quand tout va bien.
  //
  // Meme defaut que le `poseSa` du middleware : un bloc conditionnel
  // recopie dans chaque `return`, et celui qu'on oublie est celui qui
  // compte.
  const src = lire("app/commande/[produit]/CommandeClient.tsx");
  const corps = src.slice(src.indexOf("const blocPaypal ="));

  const rendus = (corps.match(/\{blocPaypal\}/g) ?? []).length;
  assert.ok(rendus >= 3, `le bloc PayPal n'est rendu que ${rendus} fois : une branche l'oublie`);

  // Et NOMMEMENT la branche normale, celle du formulaire Stripe monte.
  const brancheNormale = corps.slice(corps.indexOf("EmbeddedCheckoutProvider"));
  assert.ok(
    brancheNormale.includes("{blocPaypal}"),
    "la branche ou tout va bien ne rend pas PayPal : c'est exactement le bug du 23 aout",
  );
});

// ── LA MONTÉE DE PALIER ────────────────────────────────────────────────
//
// Béné, 23 août 2026 : "Pour paypal : on dit rien, on facture et on
// upgrade point barre." PayPal ne sait pas changer le prix d'un
// abonnement en cours : on en ouvre un neuf, et l'ancien s'arrête une
// fois le nouveau ACTIVÉ. Le lien entre les deux voyage dans le
// `custom_id`, et le perdre laisserait la personne prélevée DEUX fois.

test("un custom_id ecrit AVANT la montee de palier se relit comme avant", () => {
  // Le 5e champ est en dernier : les abonnements deja en cours ne
  // doivent pas se relire de travers le jour du deploiement.
  const ancien = "mensuel|a@b.fr|sa00168442b1c2d3e4f5a6b7c8d9|30";
  const lu = readCustomId(ancien);
  assert.equal(lu.productId, "mensuel");
  assert.equal(lu.email, "a@b.fr");
  assert.equal(lu.trialDays, 30);
  assert.equal(lu.remplace, null);
});

test("sans montee, le custom_id ne change pas d'un caractere", () => {
  const sans = buildCustomId({ productId: "mensuel", email: "a@b.fr", affiliateRef: null, trialDays: 0 });
  assert.equal(sans, "mensuel|a@b.fr||");
  assert.equal(readCustomId(sans).remplace, null);
});

test("l'abonnement remplace voyage, et se relit", () => {
  const id = buildCustomId({
    productId: "mensuel-plus",
    email: "a@b.fr",
    affiliateRef: null,
    trialDays: 0,
    remplace: "I-BW452GLLEP1G",
  });
  const lu = readCustomId(id);
  assert.equal(lu.productId, "mensuel-plus");
  assert.equal(lu.remplace, "I-BW452GLLEP1G");
  assert.ok(id.length <= CUSTOM_ID_MAX);
});

test("quand ca deborde, c'est le `sa` qui part, jamais l'abonnement remplace", () => {
  // Perdre le `sa` coute une attribution, qui retombe sur la conversion
  // par email. Perdre l'abonnement remplace coute un DOUBLE prelevement.
  const longue = `${"a".repeat(80)}@exemple.fr`;
  const id = buildCustomId({
    productId: "mensuel-plus",
    email: longue,
    affiliateRef: "sa00168442b1c2d3e4f5a6b7c8d9",
    trialDays: 0,
    remplace: "I-BW452GLLEP1G",
  });
  const lu = readCustomId(id);
  assert.equal(lu.affiliateRef, null, "le sa aurait du partir en premier");
  assert.equal(lu.remplace, "I-BW452GLLEP1G", "l'abonnement remplace a ete sacrifie");
});
