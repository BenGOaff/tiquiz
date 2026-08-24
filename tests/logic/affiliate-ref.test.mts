// tests/logic/affiliate-ref.test.mts
//
// NOS LIENS NE PORTENT PLUS LE `sa` DE SYSTEME.IO.
//
// Béné, 24 août 2026 : "je ne veux surtout pas de sa dans les nouveaux
// liens sinon y'a forcément un moment où on va merder, trouver autre
// chose nom de zeus ! Y'a pas que ce système, c'est celui de systeme io
// c'est tout !!"
//
// Ce que ce fichier fige :
//   - le FORMAT d'un code, identique des deux côtés (un code accepté
//     chez Tipote et refusé ici, c'est une affiliée jamais payée) ;
//   - l'URL gagne sur le cookie, comme partout ailleurs ;
//   - les deux générations de liens voyagent dans des champs SÉPARÉS,
//     donc personne n'a à deviner laquelle il a reçue ;
//   - le mois offert s'ouvre sur un `?ref=` et jamais sur un `?sa=`,
//     sans le moindre marqueur.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  pickRef,
  readRef,
  readRefFromBrowser,
  REF_COOKIE,
  REF_MAX_AGE_SECONDS,
  REF_MAX_LENGTH,
  REF_MIN_LENGTH,
  REF_PARAM,
} from "../../lib/affiliate/refLien.ts";
import { SA_MAX_AGE_SECONDS } from "../../lib/affiliate/sa.ts";

function lire(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

// ── LE FORMAT ──

test("un code se dicte : minuscules, chiffres, tirets", () => {
  assert.equal(readRef("jocelyne"), "jocelyne");
  assert.equal(readRef("jocelyne-dupre"), "jocelyne-dupre");
  assert.equal(readRef("bene2026"), "bene2026");
  // La casse et les espaces autour ne comptent pas : elle le tape a la
  // main dans une bio Instagram.
  assert.equal(readRef("  Jocelyne  "), "jocelyne");
});

test("tout ce qui n'a pas la forme d'un code est JETE", () => {
  // Ces valeurs finissent dans une requete SQL et dans un versement.
  for (const mauvais of [
    "",
    "jo",                       // trop court
    "a".repeat(REF_MAX_LENGTH + 1),
    "-jocelyne",                // tiret en tete
    "jocelyne-",                // tiret en queue
    "jocelyne dupre",           // espace
    "jocelyne@dupre",
    "../admin",
    "jocelyne'; drop table--",
    null,
    undefined,
    42,
  ]) {
    assert.equal(readRef(mauvais as unknown), null, JSON.stringify(mauvais));
  }
});

test("un `sa` de Systeme.io n'est PAS un code valide", () => {
  // 28 caracteres : au dela de REF_MAX_LENGTH. Un ancien identifiant ne
  // peut donc pas se faire passer pour un code, meme par accident.
  assert.equal(readRef("sa00168442b1c2d3e4f5a6b7c8d9"), null);
});

test("les longueurs sont celles de Tipote", () => {
  // Un code accepte la-bas et refuse ici serait une affiliee jamais
  // payee, et rien ne le signalerait.
  assert.equal(REF_MIN_LENGTH, 3);
  assert.equal(REF_MAX_LENGTH, 20);
  assert.equal(readRef("abc"), "abc");
  assert.equal(readRef("a".repeat(20)), "a".repeat(20));
});

// ── QUI GAGNE ──

test("l'URL gagne sur le cookie : c'est le DERNIER lien qui ferme la vente", () => {
  // Elle arrive par le lien de Martine, ne paie pas, revient par celui
  // de Christian et achete : c'est Christian qui a ferme la vente.
  assert.equal(pickRef("christian", "martine"), "christian");
  assert.equal(pickRef(null, "martine"), "martine");
  assert.equal(pickRef("", "martine"), "martine");
  // Une valeur d'URL illisible ne doit pas effacer le cookie.
  assert.equal(pickRef("pas valide !!", "martine"), "martine");
  assert.equal(pickRef(null, null), null);
});

test("le navigateur lit le meme code que le serveur", () => {
  assert.equal(readRefFromBrowser("?ref=jocelyne", ""), "jocelyne");
  assert.equal(readRefFromBrowser("", `${REF_COOKIE}=martine`), "martine");
  assert.equal(readRefFromBrowser("?ref=christian", `${REF_COOKIE}=martine`), "christian");
  // Un autre cookie du meme prefixe ne doit pas etre pris pour le notre.
  assert.equal(readRefFromBrowser("", "tq_sa=sa00168442b1c2d3e4f5a6b7c8d9"), null);
  // Rien du tout : le cas le plus frequent, ce n'est pas une anomalie.
  assert.equal(readRefFromBrowser("", ""), null);
});

test("une query ou un cookie abime ne fait jamais lever", () => {
  for (const q of ["", "???", "%%%", "ref=", "ref=%E0%A4%A"]) {
    assert.doesNotThrow(() => readRefFromBrowser(q, ""));
  }
  for (const c of ["", ";;;", "=", "tq_ref", "tq_ref=%E0%A4%A"]) {
    assert.doesNotThrow(() => readRefFromBrowser("", c));
  }
});

// ── LE MIDDLEWARE ──

test("le middleware range les DEUX generations, chacune dans son cookie", () => {
  const src = lire("middleware.ts");
  assert.match(src, /readRef\(req\.nextUrl\.searchParams\.get\(REF_PARAM\)\)/);
  assert.match(src, /readSa\(req\.nextUrl\.searchParams\.get\(SA_PARAM\)\)/);
  assert.match(src, /res\.cookies\.set\(REF_COOKIE, ref/);
  assert.match(src, /res\.cookies\.set\(SA_COOKIE, sa/);
});

test("les deux cookies durent UN AN", () => {
  // Bene, 26 aout : "son cookie est pose pour 1 an". Deux durees
  // differentes donneraient deux reponses pour la meme promesse selon
  // le chemin emprunte par l'acheteur.
  assert.equal(REF_MAX_AGE_SECONDS, 365 * 24 * 60 * 60);
  assert.equal(REF_MAX_AGE_SECONDS, SA_MAX_AGE_SECONDS);
});

test("le marqueur `mo=1` a disparu : le nom du parametre suffit", () => {
  // Un marqueur en moins, c'est un endroit en moins ou on pouvait
  // l'oublier. Le mois offert s'ouvre sur un `?ref=`, point.
  assert.equal(fs.existsSync(path.join(process.cwd(), "lib/affiliate/moisOffertLien.ts")), false);
  assert.equal(REF_PARAM, "ref");
  assert.equal(REF_COOKIE, "tq_ref");
});

// ── LE MOIS OFFERT ──

test("le cadeau s'ouvre sur un `ref`, jamais sur un `sa`", () => {
  const src = lire("lib/trial/moisOffertCheckout.ts");
  // La signature ne prend QUE le code public : un checkout arrive par
  // un ancien lien n'a rien a passer, donc pas de cadeau.
  assert.match(src, /export async function essaiPourCeCheckout\(args: \{[\s\S]{0,900}?\bref: string \| null;/);
  assert.ok(!/\bsa: string \| null;/.test(src), "le `sa` ouvre encore le mois offert");
});

test("le bon de commande annonce le cadeau sur un lien affilie, et seulement la", () => {
  const src = lire("app/commande/[produit]/page.tsx");
  assert.match(src, /pickRef\(refUrl, boite\.get\(REF_COOKIE\)\?\.value\)/);
  // Plus aucune trace du marqueur.
  assert.ok(!/MO_COOKIE|pageOuvreLeMoisOffert/.test(src));
});

// ── LES DEUX CHAMPS RESTENT SÉPARÉS ──

test("le checkout envoie `ref` ET `sa`, jamais l'un pour l'autre", () => {
  const client = lire("app/commande/[produit]/CommandeClient.tsx");
  assert.match(client, /ref: refAffiliee\(\), sa: saAffiliee\(\)/);

  for (const f of ["app/api/commande/session/route.ts", "app/api/commande/paypal/route.ts"]) {
    const src = lire(f);
    assert.match(src, /readRef\(body\.ref\)/, `${f} : le code n'est pas lu`);
    assert.match(src, /readSa\(body\.sa\)/, `${f} : le sa n'est pas lu`);
    // Le piege a eviter : lire le `sa` dans le champ `ref`.
    assert.ok(!/readSa\(body\.ref\)/.test(src), `${f} : le sa est lu dans le champ ref`);
  }
});

test("la commission recoit les deux champs, separement", () => {
  const src = lire("lib/affiliate/ownerSale.ts");
  assert.match(src, /affiliate_ref: readSa\(vente\.affiliateRef\)/);
  assert.match(src, /affiliate_code: readRefCode\(vente\.affiliateCode\)/);
});
