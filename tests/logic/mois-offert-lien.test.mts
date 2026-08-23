// tests/logic/mois-offert-lien.test.mts
//
// LE CADEAU EST RÉSERVÉ AU SYSTÈME COURANT, LA VENTE NE L'EST PAS.
//
// Béné, 23 août 2026 : "on le met sur l'espace affilié en expliquant que
// c'est uniquement avec le système d'affiliation en cours et pas sur les
// anciens liens systeme io (qui restent valides mais ne seront plus ceux
// à utiliser dans le futur)". Et : "uniquement sur les liens affiliés
// n'oublie pas, c'est pas pour celui qui tombe sur la page de vente tout
// seul".
//
// Le piège que ce fichier fige : les deux générations de liens portent
// le MÊME `?sa=`. Déduire la génération du `sa` reviendrait à offrir le
// mois sur les anciens liens, c'est à dire exactement ce qui est exclu.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  MO_COOKIE,
  MO_PARAM,
  MO_VALUE,
  lienOuvreLeMoisOffert,
  marqueurPresent,
  pageOuvreLeMoisOffert,
} from "../../lib/affiliate/moisOffertLien.ts";
import { JOURS_MOIS_OFFERT_ANNONCE } from "../../lib/trial/moisOffert.ts";

function lire(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

const SA = "sa1234567890abcdef1234";
const AUTRE_SA = "safedcba0987654321fedc";

// ── LE MARQUEUR ──

test("le marqueur n'est reconnu que sur sa valeur exacte", () => {
  assert.equal(marqueurPresent(MO_VALUE), true);
  assert.equal(marqueurPresent(" 1 "), true);
  assert.equal(marqueurPresent("0"), false);
  assert.equal(marqueurPresent("true"), false);
  assert.equal(marqueurPresent(null), false);
  assert.equal(marqueurPresent(undefined), false);
});

// ── LE COOKIE PORTE L'IDENTIFIANT, PAS UN "OUI" ──

test("le cookie doit designer le MEME lien que celui qui commissionne", () => {
  assert.equal(lienOuvreLeMoisOffert(SA, SA), true);
  // Venue une fois par un lien recent, elle achete par un ANCIEN lien :
  // c'est l'ancien qui est paye, donc c'est lui qui decide du cadeau.
  assert.equal(lienOuvreLeMoisOffert(AUTRE_SA, SA), false);
  assert.equal(lienOuvreLeMoisOffert(SA, null), false);
  assert.equal(lienOuvreLeMoisOffert(null, SA), false);
  // Personne n'est venu par un lien du tout : pas de cadeau.
  assert.equal(lienOuvreLeMoisOffert(null, null), false);
});

test("un cookie qui dit oui sans nommer le lien n'ouvre rien", () => {
  // Le piege exact : un "oui" flottant offrirait le mois sur n'importe
  // quel lien suivant, ancien Systeme.io compris.
  assert.equal(lienOuvreLeMoisOffert(SA, "1"), false);
  assert.equal(lienOuvreLeMoisOffert(SA, "true"), false);
});

// ── CE QUE LE BON DE COMMANDE ANNONCE ──

test("l'URL gagne sur le cookie, comme pour l'attribution", () => {
  // Premier chargement par un lien recent : le cookie n'est pas encore
  // relisible, la page doit quand meme annoncer le cadeau.
  assert.equal(
    pageOuvreLeMoisOffert({ saUrl: SA, moUrl: "1", saCookie: null, moCookie: null }),
    true,
  );
  // Arrivee par un ANCIEN lien alors qu'un cookie recent traine : c'est
  // l'ancien lien qui sera commissionne, donc pas de cadeau annonce.
  assert.equal(
    pageOuvreLeMoisOffert({ saUrl: AUTRE_SA, moUrl: null, saCookie: SA, moCookie: SA }),
    false,
  );
  // Navigation interne : plus rien dans l'URL, le cookie prend le relais.
  assert.equal(
    pageOuvreLeMoisOffert({ saUrl: null, moUrl: null, saCookie: SA, moCookie: SA }),
    true,
  );
});

test("celui qui tombe sur la page de vente tout seul ne voit rien", () => {
  assert.equal(
    pageOuvreLeMoisOffert({ saUrl: null, moUrl: null, saCookie: null, moCookie: null }),
    false,
  );
  // Et un marqueur ecrit a la main, sans lien, ne cree pas de cadeau.
  assert.equal(
    pageOuvreLeMoisOffert({ saUrl: null, moUrl: "1", saCookie: null, moCookie: null }),
    false,
  );
});

// ── LA MÉCANIQUE EST UN PARAMÈTRE, PAS UNE DÉDUCTION ──

test("essaiPourCeCheckout exige `lienCourant`", () => {
  const src = lire("lib/trial/moisOffertCheckout.ts");
  assert.match(src, /lienCourant: boolean;/);
  assert.match(src, /if \(!args\.lienCourant\) return SANS_ESSAI\("lien_ancien"\);/);
});

test("les deux bons de commande lisent le marqueur dans le COOKIE", () => {
  // Dans le corps de la requete, n'importe qui pourrait l'ecrire.
  for (const f of ["app/api/commande/session/route.ts", "app/api/commande/paypal/route.ts"]) {
    const src = lire(f);
    assert.match(src, /lienCourant: lienOuvreLeMoisOffert\(/, `${f} : marqueur non lu`);
    assert.match(src, /req\.cookies\.get\(MO_COOKIE\)/, `${f} : marqueur lu ailleurs que dans le cookie`);
    assert.ok(!/lienCourant:\s*(true|!!\s*body|body\.)/.test(src), `${f} : marqueur pris dans le corps`);
  }
});

// ── LE MIDDLEWARE ──

test("le middleware pose le marqueur, httpOnly, et jamais sans `sa`", () => {
  const src = lire("middleware.ts");
  assert.match(src, /marqueurPresent\(req\.nextUrl\.searchParams\.get\(MO_PARAM\)\)/);
  // "!!sa &&" : un `?mo=1` seul ne designe personne.
  assert.match(src, /const marqueMoisOffert = !!sa &&/);
  // La valeur est l'identifiant, pas un "oui".
  assert.match(src, /res\.cookies\.set\(MO_COOKIE, sa!/);
  const bloc = src.slice(src.indexOf("res.cookies.set(MO_COOKIE"));
  assert.match(bloc.slice(0, 600), /httpOnly: true/);
});

// ── LE NOMBRE DE JOURS VIT À UN SEUL ENDROIT ──

test("les 30 jours ne sont ecrits qu'une fois", () => {
  assert.equal(JOURS_MOIS_OFFERT_ANNONCE, 30);
  const checkout = lire("lib/trial/moisOffertCheckout.ts");
  assert.match(checkout, /export const JOURS_MOIS_OFFERT = JOURS_MOIS_OFFERT_ANNONCE;/);
  // Le bon de commande annonce CE nombre, il ne le reecrit pas.
  const page = lire("app/commande/[produit]/page.tsx");
  assert.match(page, /JOURS_MOIS_OFFERT_ANNONCE/);
  assert.ok(!/30 jours offerts/.test(page), "le nombre est ecrit en dur dans la page");
});

// ── L'ÉCRAN N'ANNONCE PAS CE QUE LE SERVEUR REFUSERA ──

test("le bon de commande n'annonce le cadeau que sur un lien affilie", () => {
  const page = lire("app/commande/[produit]/page.tsx");
  assert.match(page, /pageOuvreLeMoisOffert\(\{/);
  assert.match(page, /moisOffertAnnonce/);
  // Le nom du cookie ne se reecrit pas a la main.
  assert.match(page, /MO_COOKIE/);
  assert.equal(MO_COOKIE, "tq_mo");
  assert.equal(MO_PARAM, "mo");
});
