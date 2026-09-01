// tests/logic/blog-mise-en-page.test.mts
//
// LA MISE EN PAGE DES ARTICLES (Béné, 1er septembre 2026).
//
// "Regarde la mise en page est pourrie [...] avec des chiffres
// incohérents. Chiffres ajoutés aux sauts de ligne au lieu des vraies
// phrases. Des sauts de ligne énormes dans les paragraphes et des
// espaces minimum entre les titres... bref c'est n'importe quoi.
// J'ai des gens qui vont LIRE ces pages donc elles doivent être
// nickel !"
//
// Ce test porte ce qu'ELLE a vu, et il l'exige sur le contenu DÉPLOYÉ :
// il appelle la MÊME fonction que `npm run blog:reparer`, donc le
// contenu est propre exactement quand la réparation ne change plus rien.
// Un test qui n'exercerait qu'une chaîne écrite à la main aurait été
// vert le jour du bug.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  corrigerStructure,
  nettoyerMiseEnPage,
  normaliserNiveauxTitres,
  retirerBanniereEnTete,
} from "@/lib/blog/miseEnPage";
import type { Bloc } from "@/lib/blog/articles";

const DOSSIER = path.join(process.cwd(), "content", "blog");

function articles(): { nom: string; data: Record<string, unknown> }[] {
  return fs
    .readdirSync(DOSSIER)
    .filter((f) => f.endsWith(".json") && f !== "index.json")
    .map((nom) => ({
      nom,
      data: JSON.parse(fs.readFileSync(path.join(DOSSIER, nom), "utf8")) as Record<string, unknown>,
    }));
}

function toutLeHtml(data: Record<string, unknown>): string {
  const blocs = (data.blocs ?? []) as Record<string, unknown>[];
  return blocs
    .map((b) => {
      if (typeof b.html === "string") return b.html;
      if (Array.isArray(b.questions)) {
        return (b.questions as { reponse?: string }[]).map((q) => q.reponse ?? "").join(" ");
      }
      return "";
    })
    .join("\n");
}

// ─────────────────────────────────────────────────────────────────────
// Ce qu'elle a vu
// ─────────────────────────────────────────────────────────────────────

describe("Ce que l'import a laissé dans les articles", () => {
  test("plus aucun élément de liste vide : c'étaient les numéros fantômes", () => {
    // Sur la liste des sept modèles de titres, ils prenaient les numéros
    // 2, 4, 6, 8 et 10, et les vraies phrases se retrouvaient en 1, 3,
    // 5, 7, 9 et 11. C'est mot pour mot ce qu'elle a lu à l'écran.
    for (const { nom, data } of articles()) {
      const vides = toutLeHtml(data).match(
        /<li>(?:\s|&nbsp;|<br\s*\/?>|<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>)*<\/li>/gi,
      );
      assert.equal(vides, null, `${nom} porte ${vides?.length} element(s) de liste vide(s)`);
    }
  });

  test("plus aucun paragraphe qui ne porte que des sauts de ligne", () => {
    // Les "sauts de ligne énormes" : un paragraphe porte déjà sa marge.
    for (const { nom, data } of articles()) {
      const vides = toutLeHtml(data).match(/<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi);
      assert.equal(vides, null, `${nom} porte ${vides?.length} paragraphe(s) vide(s)`);
    }
  });

  test("plus aucun saut de ligne collé au début d'un paragraphe", () => {
    for (const { nom, data } of articles()) {
      const enTete = toutLeHtml(data).match(/<p[^>]*>\s*<br\s*\/?>/gi);
      assert.equal(enTete, null, `${nom} porte ${enTete?.length} <br> en tete de paragraphe`);
    }
  });

  test("les sept modèles de titres sont bien SEPT, et tous dans la liste", () => {
    // Le titre annonçait sept modèles, la liste en portait six : le
    // septième était tombé HORS de la liste, en paragraphe, juste après
    // le `</ol>`. Elle n'a relevé que la numérotation ; c'est le titre
    // qui mentait qui était le plus grave.
    const a = articles().find((x) => x.nom.startsWith("strategie-quiz-marketing"));
    assert.ok(a, "l'article stratégie doit exister");
    const tout = toutLeHtml(a.data);
    const debut = tout.indexOf("7 modèles de titres");
    assert.ok(debut > 0, "le titre des 7 modèles doit exister");
    // LA PREMIÈRE liste qui suit le titre, et elle seule : prendre tout
    // ce qui vient après compterait les listes des sections suivantes,
    // et le test annoncerait 13 modèles là où il y en a 7.
    const liste = tout.slice(debut).match(/<ol>[\s\S]*?<\/ol>/i)?.[0] ?? "";
    const items = liste.match(/<li>/gi) ?? [];
    assert.equal(items.length, 7, `la liste porte ${items.length} modeles, le titre en annonce 7`);
  });
});

// ─────────────────────────────────────────────────────────────────────
// La hiérarchie des titres, qu'elle n'a pas nommée
// ─────────────────────────────────────────────────────────────────────

describe("La hiérarchie des titres", () => {
  test("un article ouvre ses sections au niveau le plus haut", () => {
    // Sur CINQ articles sur dix, la section s'ouvrait en h3 et ses
    // sous-sections étaient des h2 : une sous-section s'affichait donc
    // PLUS GROSSE que la section qui la contient. C'est ça, ses "espaces
    // minimum entre les titres" : le contraste de taille jouait à
    // l'envers.
    for (const { nom, data } of articles()) {
      const niveaux = ((data.blocs ?? []) as { type?: string; niveau?: number }[])
        .filter((b) => b.type === "titre")
        .map((b) => b.niveau);
      if (niveaux.length === 0) continue;
      assert.equal(niveaux[0], 2, `${nom} ouvre ses sections en h${niveaux[0]}`);
      // Et aucun titre ne remonte au dessus du niveau d'ouverture.
      assert.ok(
        niveaux.every((n) => (n ?? 0) >= 2),
        `${nom} porte un titre au dessus du niveau d'ouverture`,
      );
    }
  });

  test("la règle préserve la structure, elle ne réécrit pas le plan", () => {
    const blocs = [
      { type: "titre", niveau: 3, texte: "Section 1", id: "a" },
      { type: "titre", niveau: 2, texte: "Sous-section", id: "b" },
      { type: "titre", niveau: 3, texte: "Section 2", id: "c" },
    ] as Bloc[];
    const out = normaliserNiveauxTitres(blocs) as { niveau: number }[];
    // Le premier niveau rencontré devient 2, le suivant 3 : la
    // structure RELATIVE est identique, elle est juste à l'endroit.
    assert.deepEqual(out.map((b) => b.niveau), [2, 3, 2]);
  });

  test("un article déjà à l'endroit ne bouge pas d'un caractère", () => {
    const blocs = [
      { type: "titre", niveau: 2, texte: "A", id: "a" },
      { type: "titre", niveau: 3, texte: "A1", id: "b" },
      { type: "titre", niveau: 2, texte: "B", id: "c" },
    ] as Bloc[];
    assert.deepEqual(normaliserNiveauxTitres(blocs), blocs);
  });
});

// ─────────────────────────────────────────────────────────────────────
// La double couverture
// ─────────────────────────────────────────────────────────────────────

describe("La bannière en double", () => {
  test("aucun article ne rouvre sur une image : la page pose déjà sa couverture", () => {
    // Béné : "il faut supprimer l'ancienne couverture, c'est quoi
    // l'intérêt d'avoir deux couvertures ??"
    for (const { nom, data } of articles()) {
      if (!String(data.couverture ?? "").trim()) continue;
      const premier = ((data.blocs ?? []) as { type?: string }[])[0];
      assert.notEqual(premier?.type, "image", `${nom} rouvre sur une image`);
    }
  });

  test("un article SANS couverture garde le droit d'ouvrir sur une image", () => {
    const blocs = [{ type: "image", src: "/x.webp", alt: "" }] as Bloc[];
    assert.equal(retirerBanniereEnTete(blocs, "").length, 1);
    assert.equal(retirerBanniereEnTete(blocs, "/blog/img/couv.webp").length, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// L'invariant qui compte : la réparation ne change plus rien
// ─────────────────────────────────────────────────────────────────────

describe("Le nettoyage est un point fixe", () => {
  test("il ne reste rien à réparer dans le contenu déployé", () => {
    // Le test appelle LA MÊME fonction que le script : le contenu est
    // propre exactement quand la réparation ne change plus rien. Deux
    // copies de la règle finiraient par ne plus être d'accord.
    for (const { nom, data } of articles()) {
      const html = toutLeHtml(data);
      assert.equal(nettoyerMiseEnPage(html), html, `${nom} a encore de la mise en page a nettoyer`);
      assert.equal(corrigerStructure(html).corriges, 0, `${nom} a encore une structure a reparer`);
    }
  });

  test("appliqué deux ou trois fois, le nettoyage rend la même chose", () => {
    // Une règle qui SUPPRIME tourne à chaque `blog:reparer` : si sa
    // sortie n'est pas un point fixe, le contenu se ronge un peu plus à
    // chaque passage et personne ne voit rien avant que ce soit
    // illisible. Trois fois, pas deux : un cycle de période 2 passerait
    // un test qui n'applique que deux fois.
    const cas = [
      "<ol><li><p>Un</p></li><li></li><li><p>Deux</p></li></ol>",
      "<p><br>Texte</p><p><br><br></p><p>Suite<br>ligne</p>",
      "<ul><li></li><li></li></ul>",
      "<p>Rien a changer ici.</p>",
    ];
    for (const c of cas) {
      const un = nettoyerMiseEnPage(c);
      assert.equal(nettoyerMiseEnPage(un), un, c);
      assert.equal(nettoyerMiseEnPage(nettoyerMiseEnPage(un)), un, c);
    }
  });

  test("un <br> AU MILIEU d'un paragraphe est laissé tranquille", () => {
    // Là il sépare volontairement deux lignes : le retirer collerait
    // une adresse postale ou un vers sur une seule ligne.
    const html = "<p>Ligne un<br>Ligne deux</p>";
    assert.equal(nettoyerMiseEnPage(html), html);
  });

  test("une liste qui n'avait que des vides ne laisse pas sa coquille", () => {
    assert.equal(nettoyerMiseEnPage("<p>a</p><ol><li></li><li></li></ol><p>b</p>"), "<p>a</p><p>b</p>");
  });
});
