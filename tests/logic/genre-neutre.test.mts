// tests/logic/genre-neutre.test.mts
//
// ON NE VEND PAS QU'À DES FEMMES.
//
// Béné, 23 août 2026, sur la page de remerciement du bon de commande :
// "'Et te voilà dans Tiquiz, prête à créer ton premier quiz' : c'est
// genré automatiquement ou tu pars du principe que je ne vends qu'à des
// femmes ?? Ce qui n'est PAS le cas évidemment."
//
// Elle a raison, et les prénoms de ce dépôt le disent tout seuls :
// François Xavier, Éric, Maurice, Ivan. Un accord au féminin sur la
// première page qu'un client voit après avoir payé, c'est un message qui
// dit "ce produit n'est pas pour toi", trente secondes après qu'il ait
// sorti sa carte.
//
// Ce n'était pas un oubli isolé : l'accueil des emails était genré dans
// QUATRE langues (es, it, pt, pt-BR), et l'écran de session expirée en
// français et en italien.
//
// **La sortie n'est pas l'écriture inclusive**, que Béné n'utilise pas :
// c'est de tourner la phrase autrement. "Prête à créer" devient "avec
// tout ce qu'il faut pour créer", "Bienvenida" devient "Te damos la
// bienvenida", "Tu as été déconnectée" devient "Ta session a expiré".
// Aucun point médian, et personne n'est exclu.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function lire(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

/** Les accords au féminin qui s'adressaient à l'acheteur, et leur langue. */
const INTERDITS: readonly { fichier: string; motif: RegExp; quoi: string }[] = [
  {
    fichier: "app/commande/[produit]/retour/page.tsx",
    motif: /voilà dans Tiquiz, prête/,
    quoi: "la page de remerciement accorde au féminin",
  },
  { fichier: "lib/email/signupContent.ts", motif: /Bienvenida a Tiquiz/, quoi: "accueil espagnol genré" },
  { fichier: "lib/email/signupContent.ts", motif: /Benvenuta in Tiquiz/, quoi: "accueil italien genré" },
  { fichier: "lib/email/signupContent.ts", motif: /Bem-vinda ao Tiquiz/, quoi: "accueil portugais genré" },
  { fichier: "lib/email/planOpenedContent.ts", motif: /Bienvenida a Tiquiz/, quoi: "accueil espagnol genré" },
  { fichier: "lib/email/planOpenedContent.ts", motif: /Benvenuta in Tiquiz/, quoi: "accueil italien genré" },
  { fichier: "lib/email/planOpenedContent.ts", motif: /Bem-vinda ao Tiquiz/, quoi: "accueil portugais genré" },
  { fichier: "messages/fr.json", motif: /Tu as été déconnectée/, quoi: "session expirée accordée au féminin" },
  { fichier: "messages/it.json", motif: /Sei stata disconnessa/, quoi: "session expirée accordée au féminin" },
];

test("aucun accord au feminin dans ce que lit un acheteur", () => {
  for (const { fichier, motif, quoi } of INTERDITS) {
    assert.ok(!motif.test(lire(fichier)), `${fichier} : ${quoi}`);
  }
});

test("on ne s'adresse jamais a la lectrice en accordant au feminin", () => {
  // Le motif general, pour attraper ce qu'on n'a pas encore ecrit.
  // Volontairement restreint a l'ADRESSE DIRECTE ("tu es connectée") :
  // un accord avec un nom feminin ("analyse prête", "vidéo prête") est
  // parfaitement correct et ne doit pas faire rougir ce test. Un filet
  // qui crie pour rien finit desactive.
  const src = lire("messages/fr.json");
  const motif = /\b[Tt]u (?:es|as été|seras|étais|sois) [a-zà-ÿ]+ée\b/g;
  const trouves = src.match(motif) ?? [];
  assert.deepEqual(trouves, [], `adresse genrée : ${trouves.join(", ")}`);
});

test("les tournures neutres sont bien la, pas juste l'ancien texte efface", () => {
  // Un test qui verifie seulement une ABSENCE passe au vert si quelqu'un
  // supprime la phrase. On verifie donc aussi ce qui doit s'y trouver.
  assert.match(
    lire("app/commande/[produit]/retour/page.tsx"),
    /te voilà dans Tiquiz, avec tout ce qu'il faut/,
    "la page de remerciement a perdu sa phrase d'accueil",
  );
  assert.match(lire("messages/fr.json"), /Ta session a expiré/, "l'ecran de session expiree a change");
  for (const f of ["lib/email/signupContent.ts", "lib/email/planOpenedContent.ts"]) {
    assert.match(lire(f), /Te damos la bienvenida/, `${f} : accueil espagnol`);
    assert.match(lire(f), /Ti diamo il benvenuto/, `${f} : accueil italien`);
    assert.match(lire(f), /Boas-vindas/, `${f} : accueil portugais`);
  }
});

// ── L'INCLUSIF N'ÉTAIT PAS LA SORTIE NON PLUS (Béné, 24 août 2026) ──
//
// "'Toute affiliée' arrête de penser que je n'ai que des users
// féminines putain !!! d'où ça vient cette merde ??"
//
// Le 23 août, trois chaînes avaient été LAISSÉES en écriture inclusive
// ("Devenir affilié·e", "Prêt·e à booster", "Pas encore inscrit·e"), en
// attendant qu'elle tranche. Elle a tranché : la sortie est la même que
// partout ailleurs, on TOURNE LA PHRASE. Le point médian n'existe qu'en
// français, et les mêmes chaînes en espagnol et en italien étaient
// parties en "Lista/o" et "Pronta/o", qui ne sont pas mieux : elles
// listent les deux genres au lieu de n'en imposer aucun.
//
// -> "Rejoindre le programme d'affiliation", "On booste ton business
// aujourd'hui ?", "Pas encore dans le programme ?". Rien à accorder,
// donc rien à oublier dans les 7 langues.

/** Ce que le quiz sait faire pour SA créatrice n'est pas notre copy. */
const EXCEPTIONS_INCLUSIF: readonly RegExp[] = [
  // L'éditeur propose d'insérer une variante selon le genre dans le
  // texte d'un quiz : cette aide DOIT montrer un exemple ("cher·e"),
  // sinon la fonctionnalité ne s'explique pas.
  /Insérer une variante selon le genre/,
];

test("aucun point median ni double forme dans ce que lit un utilisateur", () => {
  const motif = /"[^"]*(?:[A-Za-zÀ-ÿ]·[a-zà-ÿ]{1,3}|[A-Za-zÀ-ÿ]{3,}\/[ao](?![A-Za-zÀ-ÿ]))[^"]*"/g;
  const fautes: string[] = [];
  for (const locale of ["fr", "en", "es", "it", "pt", "pt-BR", "ar"]) {
    const fichier = `messages/${locale}.json`;
    for (const ligne of lire(fichier).match(motif) ?? []) {
      if (EXCEPTIONS_INCLUSIF.some((e) => e.test(ligne))) continue;
      fautes.push(`${fichier} : ${ligne}`);
    }
  }
  assert.deepEqual(fautes, [], `tourner la phrase au lieu d'accorder :\n${fautes.join("\n")}`);
});

test("les tournures neutres du 24 aout sont bien la", () => {
  const fr = lire("messages/fr.json");
  assert.match(fr, /Rejoindre le programme d'affiliation/, "le CTA affiliation a disparu");
  assert.match(fr, /On booste ton business aujourd'hui/, "la rotation du dashboard a disparu");
  assert.match(fr, /Pas encore dans le programme/, "l'invite affiliation a disparu");
});
