// tests/logic/expediteur-emails.test.mts
//
// "LES FACTURES, ALERTES ETC DOIVENT ÊTRE ENVOYÉS VIA TIQUIZ.FR AUSSI."
// (Béné, 30 août 2026, en basculant l'expéditeur sur son nouveau
// domaine.)
//
// La bascule elle même ne demandait aucun code : toutes les adresses
// sortent d'une variable d'environnement. Ce qui demandait du code,
// c'est ce qui rend la bascule FIABLE :
//
//   - la résolution était recopiée dans 7 fichiers, avec un ordre de
//     priorité INVERSÉ dans l'un d'eux. Une règle recopiée finit
//     toujours par en oublier un ;
//   - une valeur portant déjà un nom (`Tiquiz <hello@tiquiz.fr>`)
//     donnait un nom en double, donc un refus de Resend, donc PLUS
//     AUCUN email, liens de connexion compris ;
//   - un oubli de la variable renvoyait tout sur l'ancien domaine, en
//     silence.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  adresseExpediteur,
  adresseNue,
  tiquizFrom,
  REPLI_EXPEDITEUR,
} from "../../lib/email/tiquizShell.ts";
import {
  verifierExpediteur,
  formaterExpediteur,
  domaineDe,
} from "../../lib/env/expediteur.ts";

const TIQUIZ = { SUPPORT_FROM_EMAIL: "hello@tiquiz.fr" };

test("la variable posee gagne, et le nom vient du code", () => {
  assert.equal(adresseExpediteur(TIQUIZ), "hello@tiquiz.fr");
  assert.equal(tiquizFrom(TIQUIZ), "Tiquiz <hello@tiquiz.fr>");
  assert.equal(tiquizFrom(TIQUIZ, "Béné de Tiquiz"), "Béné de Tiquiz <hello@tiquiz.fr>");
});

test("SUPPORT_FROM_EMAIL passe devant RESELLER_FROM_EMAIL, PARTOUT", () => {
  const deux = { SUPPORT_FROM_EMAIL: "hello@tiquiz.fr", RESELLER_FROM_EMAIL: "vieux@tipote.com" };
  assert.equal(adresseExpediteur(deux), "hello@tiquiz.fr");
});

test("une adresse deja nommee dans le .env ne casse PAS les envois", () => {
  // C'est le piege du jour de la bascule : le nom est ecrit par le code,
  // donc `Tiquiz <Tiquiz <...>>` serait refuse par Resend et plus aucun
  // email ne partirait. On rattrape au lieu de tomber.
  assert.equal(adresseNue("Tiquiz <hello@tiquiz.fr>"), "hello@tiquiz.fr");
  assert.equal(
    tiquizFrom({ SUPPORT_FROM_EMAIL: "Tiquiz <hello@tiquiz.fr>" }),
    "Tiquiz <hello@tiquiz.fr>",
  );
});

test("sans variable on retombe sur le domaine VERIFIE, jamais sur le nouveau", () => {
  // Un repli doit etre ce qui marche a coup sur. Mettre tiquiz.fr ici
  // ferait partir en spam tous les emails d'un serveur ou la variable a
  // ete oubliee.
  assert.equal(adresseExpediteur({}), REPLI_EXPEDITEUR);
  assert.equal(REPLI_EXPEDITEUR, "hello@tipote.com");
});

test("une valeur vide ou illisible ne produit jamais un expediteur vide", () => {
  assert.equal(adresseExpediteur({ SUPPORT_FROM_EMAIL: "   " }), REPLI_EXPEDITEUR);
  assert.equal(adresseNue("<>"), REPLI_EXPEDITEUR);
  assert.equal(adresseNue(""), REPLI_EXPEDITEUR);
});

// --- le garde-fou de demarrage ---------------------------------------

test("l'oubli de la variable CRIE, il ne se devine pas", () => {
  const d = verifierExpediteur({ brut: undefined, domainesAttendus: ["tiquiz.fr"] });
  assert.equal(d.ok, false);
  assert.equal(d.ok === false && d.genre, "absente");
  const msg = formaterExpediteur(d, "TIQUIZ");
  assert.ok(msg !== null, "aucun message : l'oubli passerait inapercu");
  assert.ok(msg.includes("SUPPORT_FROM_EMAIL"), msg);
  assert.ok(msg.includes("hello@tipote.com"), "le message ne dit pas d'ou partent les emails");
});

test("le nom en double est signale a part : il empeche TOUT envoi", () => {
  const d = verifierExpediteur({
    brut: "Tiquiz <hello@tiquiz.fr>",
    domainesAttendus: ["tiquiz.fr"],
  });
  assert.equal(d.ok === false && d.genre, "nom-en-double");
});

test("un domaine inattendu est signale, pas corrige", () => {
  const d = verifierExpediteur({ brut: "hello@ailleurs.fr", domainesAttendus: ["tiquiz.fr"] });
  assert.equal(d.ok === false && d.genre, "domaine-inattendu");
});

test("la bonne configuration ne dit rien du tout", () => {
  const d = verifierExpediteur({ brut: "hello@tiquiz.fr", domainesAttendus: ["tiquiz.fr"] });
  assert.equal(d.ok, true);
  assert.equal(formaterExpediteur(d, "TIQUIZ"), null);
});

test("le domaine se lit sur le DERNIER arobase", () => {
  assert.equal(domaineDe("hello@tiquiz.fr"), "tiquiz.fr");
  assert.equal(domaineDe("HELLO@Tiquiz.FR"), "tiquiz.fr");
  assert.equal(domaineDe("sans-arobase"), "");
});

// --- plus aucune copie de la resolution ------------------------------

test("aucun fichier ne recalcule l'expediteur dans son coin", () => {
  const racine = process.cwd();
  const fautifs: string[] = [];
  const parcourir = (rel: string) => {
    for (const e of fs.readdirSync(path.join(racine, rel), { withFileTypes: true })) {
      const p = path.join(rel, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === ".next") continue;
        parcourir(p);
      } else if (p.endsWith(".ts") || p.endsWith(".tsx")) {
        const src = fs.readFileSync(path.join(racine, p), "utf8");
        // Le seul endroit qui a le droit de nommer le repli est le
        // module qui le DEFINIT, plus ce test.
        // On vise le CODE, pas un commentaire qui raconte l'histoire :
        // un test qui rougit pour rien finit desactive.
        if (
          src.includes("process.env.RESELLER_FROM_EMAIL") &&
          !p.endsWith("lib/email/tiquizShell.ts") &&
          !p.endsWith("instrumentation.ts")
        ) {
          fautifs.push(p);
        }
      }
    }
  };
  for (const d of ["lib", "app"]) parcourir(d);
  assert.deepEqual(fautifs, [], "la resolution de l'expediteur est de nouveau recopiee : " + fautifs);
});
