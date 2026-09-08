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
import { contenuNewsletter, phraseEchecNewsletter } from "@/lib/site/newsletter";
import { LANGUES_PUBLIQUES } from "@/lib/site/langues";

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

test("chaque raison de refus a une phrase a l'ecran, dans les deux langues", () => {
  // Un `ok: false` muet envoie la personne reessayer dix fois (regle du
  // 3 aout). Le serveur rend la RAISON, l'ecran rend la phrase : encore
  // faut-il que l'ecran les connaisse toutes.
  //
  // -- CE GARDE-FOU A SUIVI LE TEXTE (8 septembre 2026) ---------------
  //
  // Il lisait la SOURCE de `FormulaireNewsletter.tsx` et y cherchait
  // les cinq cles. Le jour ou la page est passee en anglais, les
  // phrases ont demenage dans `lib/site/newsletter.ts` et le composant
  // n'a plus porte une seule phrase : le test a rougi sur du code
  // parfaitement juste. Un garde-fou qui fige un EMPLACEMENT empeche de
  // deplacer le texte ; celui-ci mesure le COMPORTEMENT, donc il suit.
  const RAISONS = [
    "email_manquant",
    "email_invalide",
    "consentement_manquant",
    "trop_de_demandes",
    "indisponible",
  ] as const;

  for (const langue of LANGUES_PUBLIQUES) {
    const t = contenuNewsletter(langue).formulaire;
    const vues = new Set<string>();
    for (const raison of RAISONS) {
      const phrase = phraseEchecNewsletter(t, raison, "hello@tiquiz.fr");
      assert.ok(phrase.trim().length > 0, `${langue} : la raison ${raison} n'a aucune phrase`);
      assert.ok(
        !phrase.includes("{contact}"),
        `${langue} : la raison ${raison} laisse un {contact} a trou`,
      );
      // DEUX RAISONS QUI RENDENT LA MEME PHRASE, c'est une raison
      // oubliee qui retombe sur `indisponible` sans que rien ne le
      // dise : la personne lit "ce n'est pas de ta faute" alors qu'il
      // lui manque juste une case a cocher.
      assert.ok(!vues.has(phrase), `${langue} : la raison ${raison} recopie une autre phrase`);
      vues.add(phrase);
    }

    // Et une raison INCONNUE retombe sur `indisponible`, jamais sur sa
    // propre cle affichee telle quelle.
    assert.equal(
      phraseEchecNewsletter(t, "une_raison_qui_n_existe_pas", "hello@tiquiz.fr"),
      phraseEchecNewsletter(t, "indisponible", "hello@tiquiz.fr"),
    );
    assert.ok(t.reseau.trim().length > 0, `${langue} : la panne reseau n'a aucune phrase`);
  }

  // ET LE COMPOSANT NE PORTE PLUS UNE SEULE PHRASE : deux endroits qui
  // portent le texte d'un meme ecran finissent toujours par ne plus
  // dire la meme chose.
  const src = fs.readFileSync(
    path.join(process.cwd(), "components/site/FormulaireNewsletter.tsx"),
    "utf8",
  );
  assert.ok(
    src.includes("phraseEchecNewsletter"),
    "le formulaire ne delegue plus la traduction des raisons",
  );
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
