// tests/logic/newsletter.test.mts
//
// L'INSCRIPTION À LA NEWSLETTER (Béné, 30 août 2026).
//
// "Envoyer les contacts vers systeme io avec tag déjà existant et règle
// aussi." Le tag a été LU dans son compte le jour même : `newsletter`,
// créé le 30 juillet 2022, posé par la règle active 1273770 quand
// quelqu'un s'inscrit à son formulaire.
//
// Ce test fige le nom : un tag inventé mettrait ces inscrits dans un
// segment que ses newsletters n'adressent pas, et personne ne le
// verrait avant qu'un inscrit ne se plaigne de ne rien recevoir.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  TAG_NEWSLETTER,
  emailPlausible,
  jugerInscription,
  normaliserEmail,
  normaliserPrenom,
} from "../../lib/newsletter/inscription.ts";

test("le tag est celui qui existe deja dans son compte", () => {
  assert.equal(TAG_NEWSLETTER, "newsletter");
});

test("sans consentement, on n'inscrit personne", () => {
  // Inscrire quelqu'un a une liste de diffusion sans accord explicite
  // n'est pas une facilite, c'est une infraction. Et la case cochee
  // cote navigateur ne prouve rien : on la reverifie ici.
  const v = jugerInscription({ email: "gwenn@exemple.fr" });
  assert.deepEqual(v, { ok: false, raison: "consentement_manquant" });
});

test("une adresse plausible passe, une adresse absurde non", () => {
  assert.ok(emailPlausible("gwenn@exemple.fr"));
  assert.ok(emailPlausible("jean-marc.dupont+quiz@sous.domaine.co.uk"));
  assert.ok(!emailPlausible("gwenn"));
  assert.ok(!emailPlausible("gwenn@exemple"));
  assert.ok(!emailPlausible("gwenn @exemple.fr"));
  assert.ok(!emailPlausible("a@b.c@d.fr"));
  assert.ok(!emailPlausible("gwenn@exemple..fr"));
  assert.ok(!emailPlausible(""));
});

test("le domaine est mis en minuscules, la partie locale NON", () => {
  // La partie locale est sensible a la casse selon la norme. La forcer
  // en minuscules confondrait deux boites differentes ailleurs que chez
  // Gmail, et enverrait la newsletter a quelqu'un qui ne l'a pas
  // demandee.
  assert.equal(normaliserEmail("  Jean.Dupont@Exemple.FR "), "Jean.Dupont@exemple.fr");
});

test("le prenom est nettoye et borne", () => {
  assert.equal(normaliserPrenom("  Gwenn   Marie "), "Gwenn Marie");
  assert.equal(normaliserPrenom(""), null);
  assert.equal(normaliserPrenom(null), null);
  assert.equal(normaliserPrenom("x".repeat(200))?.length, 60);
});

test("une inscription complete est acceptee", () => {
  const v = jugerInscription({
    email: " Gwenn@Exemple.FR ",
    prenom: " Gwenn ",
    consentement: true,
  });
  assert.deepEqual(v, { ok: true, email: "Gwenn@exemple.fr", prenom: "Gwenn" });
});

test("chaque raison de refus a une phrase a l'ecran", () => {
  // Un `ok: false` muet envoie la personne reessayer dix fois (regle du
  // 3 aout). Le serveur rend la RAISON, l'ecran rend la phrase : encore
  // faut-il que l'ecran les connaisse toutes.
  const src = fs.readFileSync(
    path.join(process.cwd(), "components/site/FormulaireNewsletter.tsx"),
    "utf8",
  );
  for (const raison of [
    "email_manquant",
    "email_invalide",
    "consentement_manquant",
    "trop_de_demandes",
    "indisponible",
  ]) {
    assert.ok(src.includes(raison), `la raison ${raison} n'a aucune phrase`);
  }
});

test("le tag n'est jamais CREE s'il a disparu", () => {
  // Un tag cree par nous avec une faute se retrouverait en double dans
  // sa liste, et ses automatisations continueraient de pointer
  // l'ancienne (regle du 22 aout).
  const src = fs.readFileSync(path.join(process.cwd(), "lib/sio/appliquerTag.ts"), "utf8");
  assert.ok(
    /l'etiquette \$\{tag\} n'existe pas/.test(src) || /n'existe pas chez Systeme\.io/.test(src),
    "la pose ne signale plus l'etiquette absente",
  );
  assert.ok(
    !/method: "POST",\s*body: \{ name:/.test(src),
    "quelqu'un a ajoute la creation d'etiquette",
  );
});
