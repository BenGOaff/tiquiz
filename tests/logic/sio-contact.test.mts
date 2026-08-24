// tests/logic/sio-contact.test.mts
//
// UN ACHETEUR QUI N'EXISTE PAS CHEZ SYSTEME.IO N'EXISTE POUR PERSONNE.
//
// Béné, 24 août 2026 : son système doit remplacer Systeme.io pour les
// ventes et l'affiliation, "sauf pour les emails".
//
// C'est cette exception qui crée le trou. `poserTagAchat` posait
// l'étiquette qui déclenche ses séquences, mais elle abandonnait quand
// le contact n'existait pas là-bas. Or c'est le cas NORMAL de quelqu'un
// qui achète sur notre bon de commande sans jamais toucher un tunnel :
// pas de bienvenue, pas de relance, pas de segment, et rien pour le
// signaler puisque l'accès s'ouvre normalement. Le code le disait
// lui-même en commentaire depuis le 22 août.
//
// LES SLUGS SONT RELEVÉS, PAS DEVINÉS. Lus dans son compte le 25 août
// (`GET /contact_fields`). Le piège est immédiat : le nom de famille
// s'appelle `surname`, pas `last_name`. Un slug inventé est accepté par
// l'API et IGNORÉ : le champ resterait vide pour toujours, sans erreur,
// et ça se verrait dans un email adressé à "Bonjour ".

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { describe } from "node:test";

import {
  LOCALES_SIO,
  SLUGS,
  champsContact,
  corpsCreationContact,
  localeSio,
} from "@/lib/sio/contactFields";
import { lireAcheteur } from "@/lib/facture/identite";

const lire = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

const acheteur = lireAcheteur({
  prenom: "Marie", nom: "Dupont", societe: "ACME SARL", tvaNumero: "FR38909349045",
  adresse1: "12 rue des Lilas", codePostal: "34000", ville: "Montpellier", pays: "FR",
});

describe("Les champs de la fiche contact", () => {
  test("LE PIÈGE : le nom de famille s'appelle `surname`", () => {
    // `last_name` serait accepté par l'API et ignoré en silence.
    assert.equal(SLUGS.nom, "surname");
    assert.equal(SLUGS.prenom, "first_name");
  });

  test("tout ce qu'on sait part, y compris la facturation", () => {
    const champs = champsContact(acheteur);
    const par = Object.fromEntries(champs.map((c) => [c.slug, c.value]));
    assert.equal(par.first_name, "Marie");
    assert.equal(par.surname, "Dupont");
    assert.equal(par.company_name, "ACME SARL");
    assert.equal(par.tax_number, "FR38909349045");
    assert.equal(par.street_address, "12 rue des Lilas");
    assert.equal(par.postcode, "34000");
    assert.equal(par.city, "Montpellier");
    assert.equal(par.country, "FR");
  });

  test("ON N'ENVOIE JAMAIS UN CHAMP VIDE", () => {
    // Systeme.io traite une chaîne vide comme une valeur : écraser un
    // prénom saisi à la main par du vide se verrait dans ses emails
    // avant de se voir ici.
    const champs = champsContact(lireAcheteur({ prenom: "Marie" }));
    assert.deepEqual(champs, [{ slug: "first_name", value: "Marie" }]);
  });

  test("pas d'acheteur : aucun champ, jamais une exception", () => {
    assert.deepEqual(champsContact(null), []);
    assert.deepEqual(champsContact(undefined), []);
  });

  test("le pays part en ISO deux lettres", () => {
    // C'est ce que le champ `country` attend, et c'est déjà la forme
    // normalisée de notre `Acheteur`.
    const par = Object.fromEntries(champsContact(acheteur).map((c) => [c.slug, c.value]));
    assert.match(par.country, /^[A-Z]{2}$/);
  });
});

describe("La langue du contact", () => {
  test("nos 7 langues tombent sur une valeur acceptée", () => {
    for (const l of ["fr", "en", "es", "it", "pt", "ar"]) {
      assert.equal(localeSio(l), l, `${l} devrait passer tel quel`);
    }
  });

  test("pt-BR retombe sur pt", () => {
    // `pt-BR` n'est PAS dans l'énumération de Systeme.io. Sans ce repli,
    // la création ENTIÈRE serait refusée pour un client brésilien.
    assert.equal(localeSio("pt-BR"), "pt");
    assert.equal(localeSio("fr-CA"), "fr");
  });

  test("une langue inconnue ne part pas du tout", () => {
    // Un contact sans langue reçoit quand même les emails ; un contact
    // non créé ne reçoit rien.
    assert.equal(localeSio("klingon"), null);
    assert.equal(localeSio(""), null);
    assert.equal(localeSio(null), null);
  });

  test("l'énumération est celle relevée dans son compte", () => {
    assert.ok(LOCALES_SIO.includes("ar"));
    assert.ok(!LOCALES_SIO.includes("pt-BR"));
  });
});

describe("Le corps de la création", () => {
  test("une création complète", () => {
    const c = corpsCreationContact({ email: "Marie@Exemple.FR", locale: "fr", acheteur });
    assert.equal(c?.email, "marie@exemple.fr");
    assert.equal(c?.locale, "fr");
    assert.equal(c?.fields?.length, 8);
  });

  test("UNE ADRESSE INVALIDE NE CRÉE RIEN", () => {
    // Un contact fantôme ferait rebondir ses envois et abîmerait sa
    // délivrabilité pour tout le monde.
    assert.equal(corpsCreationContact({ email: "pas-une-adresse" }), null);
    assert.equal(corpsCreationContact({ email: "" }), null);
    assert.equal(corpsCreationContact({ email: "a@b" }), null);
  });

  test("sans langue ni identité, on crée quand même", () => {
    // Il a payé : il doit entrer dans la liste, même si on ne sait rien
    // d'autre de lui. C'est la règle du 7 août appliquée aux emails.
    const c = corpsCreationContact({ email: "bob@exemple.fr" });
    assert.equal(c?.email, "bob@exemple.fr");
    assert.equal(c?.locale, undefined);
    assert.equal(c?.fields, undefined);
  });
});

describe("Les règles qui ne se voient pas dans un écran", () => {
  test("poserTagAchat CRÉE le contact au lieu d'abandonner", () => {
    const src = lire("lib/sio/appliquerTag.ts");
    assert.match(src, /assurerContact\(/);
    // L'ancien comportement : chercher, puis abandonner. S'il revient,
    // le trou revient avec lui.
    assert.ok(
      !/const contactId = await trouverContact\(/.test(src),
      "poserTagAchat ne doit plus se contenter de CHERCHER le contact",
    );
  });

  test("on RE-CHERCHE après un refus de création", () => {
    // Deux webhooks simultanés créent la course, et Systeme.io refuse le
    // second doublon. Ce refus veut dire "il existe", pas "ça a raté".
    const src = lire("lib/sio/appliquerTag.ts");
    const creation = src.indexOf('sioUserRequest<{ id?: number }>(apiKey, "/contacts"');
    assert.ok(creation > 0, "la création de contact a changé de forme");
    assert.match(src.slice(creation), /const apres = await trouverContact\(/);
  });

  test("ON NE CRÉE JAMAIS UNE ÉTIQUETTE MANQUANTE", () => {
    // Règle du 22 août, inchangée : une étiquette créée par nous avec
    // une faute se retrouverait en double dans sa liste, et ses
    // automatisations continueraient de pointer l'ancienne.
    const src = lire("lib/sio/appliquerTag.ts");
    assert.match(src, /On ne CRÉE jamais l'étiquette manquante/);
    assert.ok(
      !/sioUserRequest[^\n]*"\/tags"[^\n]*\n?[^\n]*method: "POST"/.test(src),
      "aucune création d'étiquette",
    );
  });

  test("l'identité passée vient de la facturation, pas d'un payload", () => {
    // Le prénom d'un payload PayPal est celui du COMPTE PayPal, qui
    // n'est pas toujours celui du client (compte du conjoint, adresse
    // pro). La facturation, elle, est saisie par la personne.
    const src = lire("lib/checkout/grantPlan.ts");
    assert.match(src, /lireFacturation\(\{ email \}\)/);
    assert.match(src, /poserTagAchat\(email, args\.plan, \{/);
  });
});
