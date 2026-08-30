// tests/logic/affiliate-links.test.mts
//
// L'AFFILIATION NE PASSE PLUS PAR LA FORMATION.
//
// Béné, 6 août 2026 : "mon lien d'affiliation dans tiquiz mène sur
// l'atelier, c'est quoi la logique ??? Tous les membres de tiquiz ne
// sont pas membres de l'atelier. Tu dois mettre le lien de
// https://affiliate.tipote.com/ et sur l'accueil d'affiliate : le lien
// d'inscription pour ceux qui veulent voir l'espace affilié :
// https://www.tipote.fr/tiquiz/affiliation."
//
// -- LES DEUX CHOSES QU'ON MÉLANGEAIT ----------------------------------
//
// L'ATELIER est une FORMATION. L'AFFILIATION est un PROGRAMME, ouvert à
// tout le monde. La carte "Mon lien d'affiliation" faisait dépendre le
// second du premier : elle n'apparaissait qu'aux élèves de l'Atelier, et
// les envoyait sur une page interne de la formation.
//
// -- ET LES TROIS ADRESSES QU'IL NE FAUT PAS CONFONDRE -----------------
//
//   affiliate.tipote.com          le tableau de bord (demande un compte)
//   tipote.fr/tiquiz/affiliation  l'inscription (ouverte à tous)
//   tipote.fr/atelier-du-quiz     la formation, qui n'a rien à voir
//
// Envoyer un curieux sur le tableau de bord le bloque sur un écran de
// connexion ; envoyer un affilié sur la page d'inscription lui fait
// relire ce qu'il connaît déjà. Les deux erreurs se ressemblent et se
// paient de la même façon : la personne repart.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  AFFILIATE_DASHBOARD_URL,
  AFFILIATE_SIGNUP_URL,
  AFFILIATE_ATELIER_URL,
  ATELIER_SALES_URL,
} from "../../lib/affiliateUrls.ts";

test("les adresses sont distinctes et pointent au bon endroit", () => {
  assert.equal(AFFILIATE_DASHBOARD_URL, "https://affiliate.tipote.com");
  // RAPATRIEE LE 30 AOUT 2026. Elle designait un tunnel Systeme.io qui
  // decrit l'ANCIEN programme (identifiant ?sa=, versement chez eux,
  // pas de mois offert) : un affilie envoye la lisait des regles qui ne
  // sont plus celles qu'on applique.
  assert.equal(AFFILIATE_SIGNUP_URL, "https://tiquiz.fr/affiliation");
  assert.equal(AFFILIATE_ATELIER_URL, "https://tiquiz.fr/affiliation-atelier");
  // RAPATRIEE LE 30 AOUT, apres verification dans le depot de l'Atelier.
  // L'exception qui la gardait chez Systeme.io disait que l'Atelier ne
  // lisait que `?sa=` et tenait son propre registre : les deux sont
  // faux depuis que `commissionnerVente` interroge Tipote EN PREMIER
  // avec `affiliate_code` et `source_app: "atelier"`.
  assert.equal(ATELIER_SALES_URL, "https://atelierduquiz.fr/");

  const toutes = [
    AFFILIATE_DASHBOARD_URL,
    AFFILIATE_SIGNUP_URL,
    AFFILIATE_ATELIER_URL,
    ATELIER_SALES_URL,
  ];
  assert.equal(new Set(toutes).size, 4, "deux de ces adresses sont identiques");
});

/** Les fichiers de l'app, hors dépendances et hors le module d'adresses. */
function fichiersApp(): { chemin: string; src: string }[] {
  const out: { chemin: string; src: string }[] = [];
  const visiter = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name.startsWith(".")) continue;
        visiter(p);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(e.name)) continue;
      if (p.endsWith(path.join("lib", "affiliateUrls.ts"))) continue;
      out.push({ chemin: p, src: fs.readFileSync(p, "utf8") });
    }
  };
  for (const d of ["components", "app", "lib"]) visiter(path.join(process.cwd(), d));
  return out;
}

test("aucun écran n'envoie vers l'affiliation DE L'ATELIER", () => {
  // C'est le lien exact que Béné a vu. La page existe toujours et reste
  // accessible depuis l'Atelier : ce qu'on interdit, c'est d'y envoyer
  // quelqu'un depuis Tiquiz, où rien ne dit qu'il faut la formation.
  const coupables = fichiersApp()
    .filter((f) => /quizing\.tipote\.com\/affiliation/.test(f.src))
    .map((f) => f.chemin);
  assert.deepEqual(
    coupables,
    [],
    `ces fichiers renvoient l'affiliation vers la formation : ${coupables.join(", ")}`,
  );
});

test("aucune de ces adresses n'est réécrite en dur", () => {
  // Le drame de l'Atelier du 3 août : une URL écrite en dur à deux
  // endroits ne se corrige jamais qu'à moitié. On l'a vérifié le jour
  // même en trouvant l'aller réparé et le retour périmé, dans deux repos
  // différents.
  const motifs: [string, RegExp][] = [
    ["affiliate.tipote.com", /["'`]https:\/\/affiliate\.tipote\.com/],
    ["tipote.fr/tiquiz/affiliation", /["'`]https:\/\/www\.tipote\.fr\/tiquiz\/affiliation/],
    ["tipote.fr/atelier-du-quiz", /["'`]https:\/\/www\.tipote\.fr\/atelier-du-quiz/],
  ];
  for (const [nom, rx] of motifs) {
    const coupables = fichiersApp()
      .filter((f) => rx.test(f.src))
      .map((f) => f.chemin);
    assert.deepEqual(
      coupables,
      [],
      `${nom} est écrit en dur au lieu de passer par lib/affiliateUrls.ts : ${coupables.join(", ")}`,
    );
  }
});

test("la carte affiliation ne dépend plus du statut Atelier", () => {
  // Le coeur du retour de Béné : "tous les membres de tiquiz ne sont pas
  // membres de l'atelier". Si un futur passage remet un `hasAtelier` sur
  // cette carte, le lien redevient invisible pour la majorité des gens.
  const sidebar = fs.readFileSync(
    path.join(process.cwd(), "components/AppSidebar.tsx"),
    "utf8",
  );
  const i = sidebar.indexOf("AFFILIATE_DASHBOARD_URL}");
  assert.ok(i > 0, "la carte du tableau de bord affilié a disparu de la sidebar");

  // La condition qui précède immédiatement le lien.
  const avant = sidebar.slice(Math.max(0, i - 400), i);
  const derniereCondition = avant.lastIndexOf("{locale ===");
  assert.ok(derniereCondition >= 0, "condition d'affichage introuvable");
  const condition = avant.slice(derniereCondition);
  assert.ok(
    !condition.includes("hasAtelier"),
    "la carte affiliation est de nouveau conditionnée à l'Atelier",
  );
});
