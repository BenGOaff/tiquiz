// tests/logic/visuels-perimes.test.mts
//
// LES QUATRE CAPTURES DE L'ARTICLE QUI RECRUTE LES AFFILIES
//
// Trouvees le 8 septembre en REGARDANT les images une par une. Deux
// vivaient en production en francais depuis le 29 aout :
//
//   - le tableau de bord affilie explique de coller `?sa=...` sur une
//     URL tipote.fr. Depuis le 24 aout, ce lien NE PAIE PLUS PERSONNE ;
//   - le simulateur de commissions affiche 9 EUR/mois et 90 EUR/an, le
//     tarif d'avant le 6 aout, pendant que le corps de l'article annonce
//     17 EUR depuis le 31 aout. La page se contredisait elle meme.
//
// Ce sont des DESSINS : aucun remplacement de texte ne les atteint, et
// c'est pour ca qu'ils se retirent au lieu de se corriger.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import { VISUELS_PERIMES, visuelPerime } from "../../lib/blog/visuelsPerimes.ts";
import { normaliserImages } from "../../lib/blog/imagesArticle.ts";
import { listerArticles, lireArticle } from "../../lib/blog/articles.ts";
import { LANGUES_PUBLIQUES } from "../../lib/site/langues.ts";

const RACINE = path.resolve(import.meta.dirname, "..", "..");
const empreinte = (p: string) =>
  crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex").slice(0, 16);

test("chaque retrait porte sa RAISON, sinon le prochain passage le remet", () => {
  assert.ok(VISUELS_PERIMES.length > 0, "une liste vide rendrait ce fichier muet");
  for (const v of VISUELS_PERIMES) {
    assert.ok(v.raison.length > 30, `${v.chemin} : la raison doit être écrite`);
    assert.match(v.chemin, /^\/blog\/img\//, v.chemin);
  }
});

test("UN VISUEL REDESSINÉ FAIT ROUGIR CE TEST, il ne reste pas masqué", () => {
  // LE PIÈGE QUE CE CAS FERME : retirer par le chemin seul suffirait à
  // masquer POUR TOUJOURS une image que Béné redessine sous le même nom,
  // et personne ne le verrait. L'empreinte est ce qui rend le retrait
  // réversible : le jour où le fichier change, on l'apprend ici.
  for (const v of VISUELS_PERIMES) {
    const p = path.join(RACINE, "public", v.chemin);
    assert.ok(fs.existsSync(p), `${v.chemin} n'existe plus : retire son entrée`);
    assert.equal(
      empreinte(p),
      v.empreinte,
      `${v.chemin} a été redessiné : retire son entrée de VISUELS_PERIMES pour le republier`,
    );
  }
});

test("aucun article ne PUBLIE un visuel écarté", () => {
  let vus = 0;
  for (const langue of LANGUES_PUBLIQUES) {
    for (const r of listerArticles(langue)) {
      const a = lireArticle(r.slug, langue);
      if (!a) continue;
      const avant = a.blocs.filter((b) => b.type === "image" && visuelPerime(b.src));
      vus += avant.length;
      for (const b of normaliserImages(a.blocs)) {
        if (b.type !== "image") continue;
        assert.ok(!visuelPerime(b.src), `${langue} / ${r.slug} publie ${b.src}`);
      }
    }
  }
  // Un test qui ne peut plus echouer ment : si plus aucun article ne
  // portait ces blocs, c'est que le contenu a bouge et que la liste est
  // a relire.
  assert.equal(
    vus,
    VISUELS_PERIMES.length,
    "les entrées de VISUELS_PERIMES ne correspondent plus aux blocs des articles",
  );
});

test("LE RETRAIT PASSE AVANT L'APPARIEMENT, sinon il emporte une variante VIVANTE", () => {
  // CE CAS EST LE SEUL QUI DISTINGUE L'ORDRE, et il a fallu le mesurer
  // pour le trouver : mon premier jet posait deux voisins identiques et
  // ecartes, ce qui rend zero image dans LES DEUX ordres. Un test qui ne
  // distingue pas ce qu'il est cense distinguer est pire qu'un test
  // absent.
  //
  // Ce qui distingue vraiment : `apparierVariantes` fusionne le grand et
  // le petit en `{ ...grand, mobile: petit.src }`, donc le bloc qui
  // survit ne porte plus que le `src` du GRAND. Un retrait qui passerait
  // apres emporterait la variante telephone VIVANTE avec lui, et rien ne
  // le dirait : la page afficherait juste un schema de moins.
  const grandPerime = VISUELS_PERIMES[0]!.chemin;
  const petitVivant = grandPerime.replace(/(\.[a-z0-9]+)$/i, "-mobile$1");
  assert.ok(!visuelPerime(petitVivant), "la variante temoin doit etre VIVANTE");

  const blocs = [
    { type: "image", src: grandPerime, alt: "" },
    { type: "image", src: petitVivant, alt: "" },
  ] as const;

  const apres = normaliserImages(blocs as never).filter((b) => b.type === "image");
  assert.equal(apres.length, 1, "la variante vivante doit survivre au retrait du grand");
  assert.equal((apres[0] as { src: string }).src, petitVivant);
  assert.ok(!visuelPerime((apres[0] as { src: string }).src));
});
