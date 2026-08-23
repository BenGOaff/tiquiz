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

// NOTE, et c'est une decision de Bene, pas de moi : l'app utilise DEJA
// l'ecriture inclusive a trois endroits ("affilié·e", "Prêt·e à booster",
// "inscrit·e"), et le quiz sait meme inserer une variante selon le genre.
// Ici on a tourne les phrases autrement plutot que d'ajouter des points
// medians, parce que ca marche dans les 7 langues alors que le point
// median n'existe qu'en francais. Si Bene tranche pour l'inclusif, c'est
// ce fichier qu'il faudra reecrire, et les trois chaines ci-dessus avec.
