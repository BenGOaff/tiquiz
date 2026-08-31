// tests/logic/corps-avale-par-cloudflare.test.mts
//
// UN 5xx SUR UN CHEMIN LU PAR UN NAVIGATEUR PERD SA RAISON.
//
// Béné, 31 août 2026 : "le test d'inscription gratuite avec un ref ne
// fonctionne pas : /api/auth/signup 502. On attire du trafic et les
// gens peuvent même pas s'inscrire, ça inspire vachement confiance."
//
// MESURÉ deux fois sur la production, pas déduit : le formulaire de la
// newsletter le matin, l'inscription l'après-midi. Un 502 revient avec
// `error code: 502` en text/plain et `server: cloudflare`, alors qu'un
// 400 revient avec notre JSON intact. **Cloudflare remplace le corps.**
// Et les SIX domaines sont derrière Cloudflare (relevé le même jour).
//
// Conséquence exacte, sur l'inscription : le compte ÉTAIT créé (le
// contact `tiquiz-free` apparaissait dans Systeme.io) et l'écran
// annonçait "Erreur lors de la création du compte", parce que
// `res.json()` échouait sur du text/plain et que `reason` valait
// `undefined`. La phrase juste existait déjà et n'arrivait jamais. Un
// deuxième essai répondait "adresse déjà inscrite".
//
// **RÈGLE : un refus MÉTIER sur un chemin lu par un navigateur répond
// 200 avec `ok: false` et sa raison.** Les 4xx passent intacts et
// gardent leur sens. Un 5xx ne se justifie que là où un FOURNISSEUR
// doit réessayer, c'est à dire dans un webhook, jamais devant un
// formulaire : un navigateur ne réessaie rien tout seul.

import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

/** Les chemins qu'un visiteur ou un client atteint depuis son navigateur. */
const ECRANS = [
  "app/api/auth/signup/route.ts",
  "app/api/newsletter/route.ts",
  "app/api/commande/session/route.ts",
  "app/api/commande/paypal/route.ts",
  "app/api/depart/route.ts",
];

for (const rel of ECRANS) {
  test(`${rel} : aucun 502/503/504, la raison doit arriver`, () => {
    const src = readFileSync(rel, "utf8");
    const code = src
      .split("\n")
      .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*"))
      .join("\n");
    assert.doesNotMatch(
      code,
      /status:\s*50[234]/,
      "Cloudflare remplace le corps : la raison n'arriverait pas a l'ecran",
    );
  });
}

test("les refus de VALIDATION gardent leur 4xx", () => {
  // Ceux-la passent intacts (verifie en production), et un 4xx dit la
  // bonne chose a un client qui a mal rempli. Les retirer ferait perdre
  // l'information dans l'autre sens.
  const signup = readFileSync("app/api/auth/signup/route.ts", "utf8");
  assert.match(signup, /status: 400/);
  assert.match(signup, /status: 409/, "'adresse deja inscrite' est un conflit, pas une panne");
});

test("l'inscription dit que le compte EXISTE quand seul l'email a echoue", () => {
  // C'est le pire enchainement possible : annoncer un echec de creation
  // sur un compte cree, puis repondre "adresse deja inscrite" au
  // deuxieme essai.
  const fr = JSON.parse(readFileSync("messages/fr.json", "utf8")) as {
    signupPage: Record<string, string>;
  };
  assert.match(fr.signupPage.errEmailFailed, /compte est cré/i);
  const form = readFileSync("components/auth/SignupForm.tsx", "utf8");
  assert.match(form, /email_failed: t\("errEmailFailed"\)/);
});

test("les WEBHOOKS gardent leurs 5xx : eux, le reessai les sert", () => {
  // Un fournisseur de paiement REESSAIE sur un 5xx, et c'est
  // exactement ce qu'on veut quand une vente encaissee n'a pas ouvert
  // son acces. La regle ci-dessus ne les concerne pas.
  const src = readFileSync("app/api/commande/webhook/route.ts", "utf8");
  assert.match(src, /status: 502/);
});
