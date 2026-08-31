// tests/logic/partner-tag.test.mts
//
// LA PORTE QUI ÉTIQUETTE POUR L'ATELIER (31 août 2026).
//
// Béné : "du coup c'est bon aussi pour les ventes ? Les bons tags
// seront attribués aux bons acheteurs ?"
//
// Pour Tiquiz oui. Pour l'ATELIER, non : son bon de commande n'avait
// jamais posé la moindre étiquette. Tout ce qui sait parler à
// Systeme.io vit dans CE dépôt (la clé du compte propriétaire, la
// création du contact, la recherche paginée d'étiquette) : l'Atelier
// demande, il ne recopie pas.

import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

const ROUTE = readFileSync("app/api/partner/tag/route.ts", "utf8");

test("le secret partage se compare en temps constant", () => {
  // Une comparaison naive s'arrete au premier caractere different : son
  // TEMPS raconte combien de caracteres sont justes (audit du 24 aout).
  assert.match(ROUTE, /safeEqual\(req\.headers\.get\("x-partner-secret"\)/);
  assert.doesNotMatch(ROUTE, /!==\s*SHARED/);
  // Un secret absent ne doit pas ouvrir la porte a une chaine vide.
  assert.match(ROUTE, /!SHARED \|\|/);
});

test("l'identite recue d'une autre app est NETTOYEE", () => {
  // Elle finit dans la fiche contact de Systeme.io : elle passe par le
  // meme nettoyage que ce qui arrive d'un formulaire.
  assert.match(ROUTE, /lireAcheteur\(corps\.acheteur\)/);
});

test("la porte ne CREE jamais une etiquette", () => {
  // C'est ce qui la rend sure : meme un nom fautif ne peut pas polluer
  // sa liste avec une etiquette en double. Elle delegue a
  // `poserTagParNomDetaille`, qui refuse une etiquette inconnue.
  assert.match(ROUTE, /poserTagParNomDetaille/);
  assert.doesNotMatch(ROUTE, /method: "POST"[\s\S]*\/tags/);
});

test("elle repond 200 meme quand la pose echoue", () => {
  // L'appelant est un webhook de paiement : un 5xx lui ferait croire a
  // une panne et declencherait des reessais sur une vente deja traitee.
  // Il lit la RAISON, pas le statut.
  const apres = ROUTE.slice(ROUTE.indexOf("const pose = await poserTagParNomDetaille"));
  assert.doesNotMatch(apres, /status:\s*5\d\d/);
  assert.match(apres, /ok: pose\.ok, raison: pose\.raison/);
});

test("un corps sans adresse ou sans tag est refuse en 400", () => {
  assert.match(ROUTE, /raison: "adresse_ou_tag_vide" \}, \{ status: 400 \}/);
});
