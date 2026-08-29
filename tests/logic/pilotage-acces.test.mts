// tests/logic/pilotage-acces.test.mts
//
// PERSONNE D'AUTRE QUE BÉNÉ (29 août 2026).
//
// "Personne d'autre que moi ne doit jamais accéder à cette page. Je
// voudrais pas qu'un petit malin trouve une porte dérobée."
//
// Deux trous existaient, et le second est celui qui se répète dans ces
// dépôts : sur un SOUS-DOMAINE, le middleware voit le chemin AVANT le
// rewrite. Un gate sur le pathname y est donc mort, exactement comme le
// `pathname.startsWith("/affiliate")` du 8 juin côté Tipote.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  HOTE_PILOTAGE,
  estHotePilotage,
  exigeAdmin,
  normaliserHote,
} from "@/lib/pilotage/acces";

test("le chemin /pilotage exige un admin, sur n'importe quel domaine", () => {
  for (const h of ["quiz.tipote.com", HOTE_PILOTAGE, "exemple-cliente.fr", null]) {
    assert.ok(exigeAdmin(h, "/pilotage"), String(h));
    assert.ok(exigeAdmin(h, "/pilotage/clients"), String(h));
    assert.ok(exigeAdmin(h, "/pilotage/clients/eric@exemple.fr"), String(h));
  }
});

test("/admin exige toujours un admin, il n'a pas bougé", () => {
  assert.ok(exigeAdmin("quiz.tipote.com", "/admin"));
  assert.ok(exigeAdmin("quiz.tipote.com", "/admin/clients/x@y.fr"));
});

test("SUR LE SOUS-DOMAINE, TOUT EXIGE UN ADMIN, même un chemin inconnu", () => {
  // Le middleware voit `/clients`, pas `/pilotage/clients` : un gate sur
  // le pathname y serait mort. Et c'est une liste d'EXCEPTIONS, pas une
  // liste d'autorisations : un ecran ajoute demain est protege d'office.
  assert.ok(exigeAdmin(HOTE_PILOTAGE, "/"));
  assert.ok(exigeAdmin(HOTE_PILOTAGE, "/clients"));
  assert.ok(exigeAdmin(HOTE_PILOTAGE, "/ventes"));
  assert.ok(exigeAdmin(HOTE_PILOTAGE, "/un-truc-invente-demain"));
  assert.ok(exigeAdmin(HOTE_PILOTAGE, "/dashboard"));
  assert.ok(exigeAdmin(HOTE_PILOTAGE, "/quizzes"));
});

test("mais on peut S'Y CONNECTER, sinon c'est une boucle", () => {
  // Rediriger /login vers /login est un domaine sur lequel personne ne
  // peut entrer, y compris elle.
  for (const p of ["/login", "/auth/callback", "/api/auth/signup", "/_next/static/x.js"]) {
    assert.ok(!exigeAdmin(HOTE_PILOTAGE, p), p);
  }
});

test("un autre domaine garde son comportement normal", () => {
  // Le quiz public d'une creatrice ne doit surtout pas demander un
  // compte admin.
  assert.ok(!exigeAdmin("quiz.tipote.com", "/q/mon-quiz"));
  assert.ok(!exigeAdmin("exemple-cliente.fr", "/mon-quiz"));
  assert.ok(!exigeAdmin("quiz.tipote.com", "/dashboard"));
});

test("le host se compare SANS le port et sans la casse", () => {
  assert.ok(estHotePilotage("PILOTAGE.TIPOTE.COM"));
  assert.ok(estHotePilotage("pilotage.tipote.com:443"));
  assert.equal(normaliserHote("  Pilotage.Tipote.com:3001 "), HOTE_PILOTAGE);
});

test("un host empilé par un proxy ne contourne pas le gate", () => {
  // Un `X-Forwarded-Host` mal configure peut empiler plusieurs valeurs.
  // On prend la premiere, jamais la chaine brute : sinon la comparaison
  // echoue et le sous-domaine n'est plus protege.
  assert.ok(estHotePilotage("pilotage.tipote.com, quiz.tipote.com"));
});

test("un host absent ne protège rien de plus, mais ne casse rien", () => {
  assert.ok(!estHotePilotage(null));
  assert.ok(!estHotePilotage(""));
  assert.ok(!exigeAdmin(null, "/dashboard"));
});

test("LE MIDDLEWARE APPELLE VRAIMENT CE GATE, et ne fail-open plus dessus", () => {
  // Le 29 aout, `/pilotage` etait absent de PROTECTED_PREFIXES : tout le
  // bloc d'authentification etait saute, et la ligne
  // `pathname.startsWith("/pilotage")` ecrite dedans etait du code mort.
  // Un test qui ne regarde que la fonction pure n'aurait rien vu.
  const src = readFileSync(resolve(process.cwd(), "middleware.ts"), "utf8");
  assert.ok(src.includes("exigeAdmin("), "le middleware n'utilise pas le gate");
  assert.ok(
    src.includes("Fail-open") && src.includes("exigeAdmin"),
    "le fail-open doit etre explicitement borne au cas non-admin",
  );
});
