// tests/logic/email-pas-un-motif.test.mts
//
// UNE ADRESSE EMAIL N'EST PAS UN MOTIF DE RECHERCHE (31 août 2026).
//
// Dans un LIKE Postgres, `_` remplace n'importe quel caractere, et `_`
// est parfaitement legal dans une adresse. `jean_dupont@gmail.com`
// cherche en ILIKE matche donc `jeanXdupont@gmail.com`, c'est a dire
// le compte de QUELQU'UN D'AUTRE.
//
// Les deux pires cas de ce depot :
// - `UPDATE profiles ... WHERE email ILIKE <adresse>` (le mois offert),
//   sans limite : il ecrit sur le profil d'un autre ;
// - la recherche du compte apres un paiement, qui peut ouvrir le plan
//   sur le mauvais compte.

import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

import { echapperMotifLike } from "@/lib/db/motifLike";

/** Tous les fichiers qui cherchent un compte par son adresse. */
const SURVEILLES = [
  "app/api/commande/webhook/route.ts",
  "app/api/billing/change-plan/route.ts",
  "app/api/partner/grant-plus-trial/route.ts",
  "lib/trial/moisOffertCheckout.ts",
];

test("les jokers de LIKE sont neutralises", () => {
  assert.equal(echapperMotifLike("jean_dupont@gmail.com"), "jean\\_dupont@gmail.com");
  assert.equal(echapperMotifLike("a%b@gmail.com"), "a\\%b@gmail.com");
  // Le backslash s'echappe EN PREMIER, sinon on echapperait les barres
  // qu'on vient d'ajouter.
  assert.equal(echapperMotifLike("a\\_b@x.com"), "a\\\\\\_b@x.com");
});

test("une adresse ordinaire n'est pas touchee", () => {
  // Echapper ne doit RIEN changer au cas courant, sinon la correction
  // casserait des connexions qui marchaient.
  for (const ok of ["bene@tipote.com", "jean.dupont@gmail.com", "a+b@x.co.uk"]) {
    assert.equal(echapperMotifLike(ok), ok);
  }
});

test("la casse reste ignoree : on echappe, on ne passe pas a .eq", () => {
  // `.eq` serait plus simple et casserait une connexion partout ou la
  // colonne porte une majuscule (imports Systeme.io). C'est pire que
  // le bug corrige, donc on garde `.ilike`.
  for (const f of SURVEILLES) {
    const src = readFileSync(f, "utf8");
    assert.match(src, /\.ilike\("email"/, `${f} : la recherche doit rester insensible a la casse`);
  }
});

test("aucune recherche de compte ne passe une adresse BRUTE a ilike", () => {
  for (const f of SURVEILLES) {
    const src = readFileSync(f, "utf8");
    const nus = src.match(/\.ilike\(\s*"email",\s*(?!echapperMotifLike)[a-zA-Z][\w.]*\s*\)/g) ?? [];
    assert.deepEqual(nus, [], `${f} passe une adresse brute a ilike : ${nus.join(", ")}`);
    assert.match(src, /echapperMotifLike/, `${f} n'appelle pas l'echappement`);
  }
});
