// tests/logic/affiliate-own-checkout.test.mts
//
// UNE AFFILIÉE QUI ENVOIE DU MONDE SUR NOTRE DOMAINE DOIT ÊTRE PAYÉE.
//
// Le bug que ces tests figent n'a AUCUN symptôme visible : la page de
// vente s'affiche, la carte passe, le plan s'ouvre, l'argent arrive.
// Seule l'affiliée constate qu'il ne se passe rien chez elle, et elle
// n'a aucun moyen de le prouver. C'est le pire type de panne, et le
// seul filet possible est ici.
//
// Jumeau de `tests/logic/affiliate-own-checkout.test.mts` côté Atelier.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  pickSa,
  readSa,
  readSaFromBrowser,
  SA_COOKIE,
  SA_MAX_AGE_SECONDS,
  SA_PARAM,
} from "../../lib/affiliate/sa.ts";
import { commissionBaseCents } from "../../lib/checkout/commissionBase.ts";

const SA = "sa00168442b1c2d3e4f5a6b7c8d9";

// ── L'IDENTIFIANT ──

test("un sa bien forme passe, tout le reste est jete", () => {
  assert.equal(readSa(SA), SA);
  assert.equal(readSa(` ${SA} `), SA);
  // Il finit dans une requete et dans un versement : on ne fait jamais
  // confiance a ce qui arrive d'une URL publique.
  assert.equal(readSa("sa"), null);
  assert.equal(readSa("saZZZZ"), null);
  assert.equal(readSa("' or 1=1--"), null);
  assert.equal(readSa(""), null);
  assert.equal(readSa(null), null);
  assert.equal(readSa(undefined), null);
  assert.equal(readSa(42), null);
  assert.equal(readSa({}), null);
});

test("l'URL gagne sur le cookie : c'est la derniere affiliee qui a ferme la vente", () => {
  const autre = "sa99968442b1c2d3e4f5a6b7c8d9";
  assert.equal(pickSa(autre, SA), autre);
  // Un parametre absent ne doit PAS effacer le cookie : quelqu'un qui
  // navigue de page en page perd son `?sa=` des le premier clic.
  assert.equal(pickSa(null, SA), SA);
  assert.equal(pickSa("nimportequoi", SA), SA);
  assert.equal(pickSa(null, null), null);
});

test("le navigateur retrouve le sa dans l'URL ou dans le cookie", () => {
  assert.equal(readSaFromBrowser(`?${SA_PARAM}=${SA}`, ""), SA);
  assert.equal(readSaFromBrowser("", `${SA_COOKIE}=${SA}`), SA);
  assert.equal(
    readSaFromBrowser("", `autre=1; ${SA_COOKIE}=${encodeURIComponent(SA)}; encore=2`),
    SA,
  );
  // Un cookie dont le nom RESSEMBLE au notre ne compte pas.
  assert.equal(readSaFromBrowser("", `x_${SA_COOKIE}=${SA}`), null);
  // Aucune affiliee : c'est le cas normal, et ca ne doit rien casser.
  assert.equal(readSaFromBrowser("?k=abc", "session=xyz"), null);
  assert.equal(readSaFromBrowser("", ""), null);
});

test("le cookie dure UN AN, comme chez Systeme.io", () => {
  // Bene, 26 aout : "son cookie est pose pour 1 an sur le device de son
  // prospect." C'etait 90 jours : un prospect qui cliquait en janvier et
  // achetait en juin ne payait plus personne, alors que le programme
  // promet un an. Un quiz se partage longtemps, et une decision
  // d'abonnement se prend rarement le jour du clic.
  assert.equal(SA_MAX_AGE_SECONDS, 365 * 24 * 60 * 60);
});

// ── LA BASE DE COMMISSION ──

test("on paie sur le HT, jamais sur le TTC", () => {
  // Mensuel a 17 euros TTC, TVA 20% : 1700 - 283 = 1417.
  assert.equal(commissionBaseCents(1700, 283), 1417);
  // 40% de 1417 = 567 c. Sur le TTC ce serait 680 c, soit 1,13 euro de
  // trop a CHAQUE echeance, verse sans que rien ne le signale.
  assert.equal(Math.round(1417 * 0.4), 567);
  assert.equal(Math.round(1700 * 0.4), 680);
});

test("une taxe absente ne fabrique JAMAIS un taux de TVA", () => {
  assert.equal(commissionBaseCents(1700, 0), 1700);
  assert.equal(commissionBaseCents(1700, null), 1700);
  assert.equal(commissionBaseCents(1700, undefined), 1700);
  assert.equal(commissionBaseCents(1700, "pas un nombre"), 1700);
});

test("une taxe absurde ne rend jamais un HT negatif", () => {
  assert.equal(commissionBaseCents(1700, -100), 1700);
  assert.equal(commissionBaseCents(1700, 1700), 1700);
  assert.equal(commissionBaseCents(1700, 99999), 1700);
});

test("pas de vente, pas de base", () => {
  assert.equal(commissionBaseCents(0, 0), 0);
  assert.equal(commissionBaseCents(-1, 0), 0);
  assert.equal(commissionBaseCents(null, 0), 0);
});

// ── LA CHAÎNE, EN TROIS PIÈCES ──

test("1. le middleware range le sa des la premiere page", () => {
  const mw = fs.readFileSync(path.join(process.cwd(), "middleware.ts"), "utf8");
  assert.ok(mw.includes("SA_COOKIE"), "le middleware ne pose plus le cookie");
  assert.ok(mw.includes("readSa("), "le middleware ecrit une valeur non validee dans un cookie");
  // La page de vente est justement celle ou le lien atterrit.
  const i = mw.indexOf("url.pathname = `/apercu/vente/");
  assert.ok(i > 0, "la reecriture de la page de vente a disparu");
  assert.ok(
    mw.slice(i, i + 200).includes("poseSa("),
    "la page de vente ne pose pas le cookie : le lien d'affiliation ne sert a rien",
  );
});

test("poseSa ne s'appelle pas lui meme", () => {
  // Ecrit apres m'etre fait le coup : une substitution automatique avait
  // transforme le `return res` DE la fonction en `return poseSa(res)`.
  // Recursion infinie a chaque requete, donc tout le site par terre, et
  // le compilateur n'y voyait rien.
  const mw = fs.readFileSync(path.join(process.cwd(), "middleware.ts"), "utf8");
  const debut = mw.indexOf("const poseSa =");
  assert.ok(debut > 0, "poseSa a disparu du middleware");
  const fin = mw.indexOf("\n  };", debut);
  assert.ok(fin > debut, "le corps de poseSa est introuvable");
  assert.ok(
    !mw.slice(debut + 20, fin).includes("poseSa("),
    "poseSa s'appelle lui meme : recursion infinie sur chaque requete",
  );
});

test("2. le bon de commande transmet le sa, sans passer par un etat React", () => {
  const src = fs.readFileSync(
    path.join(process.cwd(), "app/commande/[produit]/CommandeClient.tsx"),
    "utf8",
  );
  assert.ok(src.includes("readSaFromBrowser"), "le bon de commande ne lit plus le sa");
  // Un effet de CE composant tourne APRES ceux de ses enfants : le
  // fournisseur Stripe aurait deja demande la session. Lire dans un
  // `useState` rempli par un effet perdrait la commission, sans que rien
  // ne s'affiche de travers.
  assert.ok(
    !/useEffect\([^)]*setSa/.test(src),
    "le sa est repasse par un etat : il arrivera trop tard",
  );
  assert.ok(src.includes("ref: refAffiliee()"), "la session Stripe ne porte plus le sa");
});

test("3. le webhook cree la commission, APRES le plan", () => {
  const src = fs.readFileSync(
    path.join(process.cwd(), "app/api/commande/webhook/route.ts"),
    "utf8",
  );
  const iPlan = src.indexOf("grantPlanByEmail(");
  const iCommission = src.indexOf("commissionnerVente(");
  assert.ok(iCommission > 0, "le webhook ne cree aucune commission");
  assert.ok(
    iCommission > iPlan,
    "on commissionne AVANT d'ouvrir le plan : une commission qui echoue priverait " +
      "un acheteur de ce qu'il a paye",
  );
});

test("la reference de commission porte son moyen de paiement", () => {
  // Elle vit dans la MEME colonne que les numeros de commande
  // Systeme.io, et la contrainte d'unicite est (source_app,
  // sio_order_id). Sans prefixe, deux numerotations independantes
  // finissent par se percuter, et la deuxieme vente serait
  // silencieusement traitee comme un doublon.
  //
  // Le prefixe etait `stripe:` pour TOUT LE MONDE, PayPal compris : ca
  // marchait par accident (les identifiants ne se ressemblent pas), mais
  // une cle qui ment sur sa provenance est introuvable le jour ou il
  // faut la retrouver a la main. Depuis le 26 aout le moyen est un
  // parametre, comme dans le depot de l'Atelier.
  const src = fs.readFileSync(path.join(process.cwd(), "lib/affiliate/ownerSale.ts"), "utf8");
  assert.ok(src.includes("`${vente.moyen}:${reference}`"), "la reference n'est plus prefixee");
});

test("sans secret partage, on le DIT au lieu de se taire", () => {
  // L'absence ferme, mais elle ne se tait pas : sans ce secret AUCUNE
  // vente ne paie personne, et rien d'autre ne le signalerait.
  const src = fs.readFileSync(path.join(process.cwd(), "lib/affiliate/ownerSale.ts"), "utf8");
  const i = src.indexOf("AFFILIATE_INTERNAL_SECRET");
  assert.ok(i > 0, "le secret n'est plus lu");
  assert.ok(
    src.slice(i, i + 700).includes("console.error"),
    "un secret manquant passerait en silence",
  );
});

test("aucun taux de commission n'est ecrit en dur ici", () => {
  // Le taux vit chez Tipote (lib/affiliate/attribution.ts), qui est la
  // source de verite des commissions. Un pourcentage recopie de ce cote
  // finirait par diverger, et personne ne s'en apercevrait avant un
  // versement.
  for (const f of [
    "lib/affiliate/ownerSale.ts",
    "app/api/commande/webhook/route.ts",
    "lib/checkout/catalog.ts",
  ]) {
    const src = fs.readFileSync(path.join(process.cwd(), f), "utf8");
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .filter((l) => !l.trim().startsWith("//"))
      .join("\n");
    assert.ok(!/[^0-9.]0\.[47]\b/.test(code), `${f} contient un taux de commission en dur`);
  }
});

test("le montant Systeme.io ne passe plus par parseInt", () => {
  // `parseInt("17.00")` vaut 17, donc 17 CENTIMES, donc une commission a
  // 7 centimes. On ne sait pas laquelle des deux formes arrive, et c'est
  // precisement pour ca qu'on passe par la fonction qui traite les deux
  // (drame Ivan : raisonner sur la forme SUPPOSEE d'un payload).
  const src = fs.readFileSync(
    path.join(process.cwd(), "app/api/systeme-io/webhook/route.ts"),
    "utf8",
  );
  assert.ok(
    src.includes("readSioAmountCents(totalPriceRaw)"),
    "le montant affilie Systeme.io est reparti sur un pari",
  );
  assert.ok(
    !/saleAmountCents\s*=\s*totalPriceRaw\s*\?\s*parseInt/.test(src),
    "parseInt est revenu sur le montant affilie",
  );
});
