// tests/logic/sio-contacts.test.mts
//
// LE CONTRÔLE DES TAGS, ET SON SEUL VRAI PIÈGE.
//
// Béné, 22 août : "QUELLE clé il te manque et pour quoi ? On en a déjà
// créé et connecté... en plus j'ai moi même ma clé connectée en tant
// qu'user : on peut l'utiliser en tant qu'admin aussi ?"
//
// Oui, et j'avais tort de demander autre chose. Reste le vrai risque :
// je n'ai jamais vu un contact renvoyé par leur API, donc je ne sais pas
// où les tags y sont écrits. Un lecteur qui rend une liste vide quand il
// ne comprend pas produirait "aucun écart, tout va bien" sur un compte
// qui en a plein. C'est le pire écran possible, et c'est exactement ce
// que ce fichier interdit.

import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  auditerTags,
  lireContacts,
  readContactEmail,
  readContactTags,
} from "../../lib/sio/contacts.ts";

test("les tags se lisent quelle que soit la forme recue", () => {
  // Trois formes plausibles, aucune verifiee : on les accepte toutes
  // plutot que de parier sur une (drame Ivan, 7 aout).
  assert.deepEqual(readContactTags({ tags: ["tiquiz-mensuel"] }), ["tiquiz-mensuel"]);
  assert.deepEqual(readContactTags({ tags: [{ name: "Tiquiz-Mensuel" }] }), ["tiquiz-mensuel"]);
  assert.deepEqual(readContactTags({ contactTags: [{ tag: "tiquiz-annuel" }] }), ["tiquiz-annuel"]);
  assert.deepEqual(readContactTags({ contact_tags: [] }), []);
});

test("UN CONTACT QU'ON NE SAIT PAS LIRE REND null, JAMAIS une liste vide", () => {
  // C'est toute la garantie de ce module. `[]` voudrait dire "ce contact
  // n'a pas de tag" ; `null` veut dire "je n'ai pas su lire", et l'ecran
  // le DIT au lieu d'annoncer zero ecart.
  assert.equal(readContactTags({ email: "a@b.fr" }), null);
  assert.equal(readContactTags({ tags: "pas-une-liste" }), null);
  assert.equal(readContactTags(null), null);
  assert.equal(readContactTags("bonjour"), null);
});

test("l'adresse se lit, et se normalise", () => {
  assert.equal(readContactEmail({ email: "  A@B.FR " }), "a@b.fr");
  assert.equal(readContactEmail({ contactEmail: "c@d.fr" }), "c@d.fr");
  assert.equal(readContactEmail({}), null);
});

test("les contacts illisibles sont COMPTES, pas avales", () => {
  const lecture = lireContacts([
    { email: "a@b.fr", tags: ["tiquiz-mensuel"] },
    { email: "c@d.fr" }, // pas de champ de tags : illisible
    { tags: [] }, // pas d'adresse : inexploitable, et sans interet
  ]);
  assert.equal(lecture.contacts.length, 1);
  assert.equal(lecture.illisibles, 1);
});

// ── L'AUDIT ──────────────────────────────────────────────────────────

const CONTACTS = lireContacts([
  { email: "ivan@exemple.fr", tags: ["tiquiz-mensuel"] },
  { email: "ok@exemple.fr", tags: ["tiquiz-annuel"] },
  { email: "sanstag@exemple.fr", tags: ["tiquiz-free"] },
]);

test("le cas Ivan remonte, et il remonte EN PREMIER", () => {
  const audit = auditerTags(
    [
      { email: "sanstag@exemple.fr", plan: "monthly" },
      { email: "ivan@exemple.fr", plan: "free" },
      { email: "ok@exemple.fr", plan: "yearly" },
    ],
    CONTACTS,
  );
  assert.equal(audit.ecarts.length, 2);
  // Quelqu'un qui a paye et n'a pas ses acces passe avant tout le reste.
  assert.equal(audit.ecarts[0]?.email, "ivan@exemple.fr");
  assert.equal(audit.ecarts[0]?.ecart, "acces-manquant");
  assert.equal(audit.ecarts[1]?.ecart, "tag-manquant");
  assert.equal(audit.compares, 3);
});

test("on part de NOS comptes, pas de sa liste de contacts", () => {
  // Sa liste Systeme.io porte des annees de contacts venus de tous ses
  // produits : les confronter tous produirait un ecran de bruit.
  const audit = auditerTags([{ email: "ok@exemple.fr", plan: "yearly" }], CONTACTS);
  assert.equal(audit.compares, 1);
  assert.equal(audit.ecarts.length, 0);
});

test("un compte absent de Systeme.io est signale, pas compte comme un ecart", () => {
  const audit = auditerTags([{ email: "nouvelle@exemple.fr", plan: "monthly" }], CONTACTS);
  assert.equal(audit.absentsDeSio, 1);
  assert.equal(audit.compares, 0);
  assert.equal(audit.ecarts.length, 0);
});

test("l'audit transporte le nombre d'illisibles jusqu'a l'ecran", () => {
  const lecture = lireContacts([{ email: "a@b.fr" }, { email: "ok@exemple.fr", tags: [] }]);
  const audit = auditerTags([{ email: "ok@exemple.fr", plan: "free" }], lecture);
  assert.equal(audit.illisibles, 1);
  // Zero ecart AVEC un illisible : l'ecran doit pouvoir nuancer.
  assert.equal(audit.ecarts.length, 0);
});

test("seuls les tags Tiquiz sortent dans la ligne d'ecart", () => {
  // Elle a des dizaines de tags sans rapport ; les afficher tous
  // rendrait la ligne illisible.
  const lecture = lireContacts([
    { email: "ivan@exemple.fr", tags: ["client-2021", "tiquiz-mensuel", "newsletter"] },
  ]);
  const audit = auditerTags([{ email: "ivan@exemple.fr", plan: "free" }], lecture);
  assert.deepEqual(audit.ecarts[0]?.tags, ["tiquiz-mensuel"]);
});
