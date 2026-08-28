// tests/logic/tour-guide.test.mts
//
// LE TOUR GUIDÉ DOIT DÉCRIRE L'APPLICATION D'AUJOURD'HUI.
//
// Drame Gwenn, 10 juin 2026 : la page "Mes projets" était grisée pendant
// le tour, sans aucune bulle pour avancer, donc bloquée. Cause : l'item
// de menu "quizzes" avait été renommé "projects" et le tour n'avait pas
// suivi. La règle a été écrite en commentaire dans useTutorial.ts, et
// une règle écrite en commentaire n'est pas une règle : rien ne la
// vérifiait.
//
// Audit du 27 août 2026 : l'accueil s'adressait au lecteur AU MASCULIN
// dans 5 langues. Le filet genre-neutre du 24 août n'attrapait que le
// féminin, donc "Prêt ?" passait.
//
// Ce que ce fichier NE teste PAS, et c'est délibéré : l'écran de fin
// envoie vers les réglages pour y poser la clé API Systeme.io, et c'est
// juste. J'avais conclu de la sortie de Systeme.io côté VENTE qu'il
// fallait le rétrograder partout. Béné, 27 août : "ça reste LE outil de
// BASE pour Tiquiz, synchro des leads, automatisations". La synchro des
// leads est le coeur du produit : aller chercher sa clé EST l'étape
// suivante.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const sidebar = readFileSync("components/AppSidebar.tsx", "utf8");
const hook = readFileSync("hooks/useTutorial.ts", "utf8");
const modal = readFileSync("components/tutorial/TourCompleteModal.tsx", "utf8");

/** Les clés d'items de MENU_ITEMS, dans leur ordre d'affichage. */
function clesDuMenu(): string[] {
  const bloc = sidebar.slice(sidebar.indexOf("const MENU_ITEMS = ["));
  const fin = bloc.indexOf("] as const;");
  assert.ok(fin > 0, "MENU_ITEMS introuvable dans AppSidebar");
  return [...bloc.slice(0, fin).matchAll(/\{\s*key:\s*"([^"]+)"/g)].map((m) => m[1]);
}

/** Les URL de MENU_ITEMS, rangées par clé. */
function urlsDuMenu(): Map<string, string> {
  const bloc = sidebar.slice(sidebar.indexOf("const MENU_ITEMS = ["));
  const fin = bloc.indexOf("] as const;");
  const paires = [...bloc.slice(0, fin).matchAll(/\{\s*key:\s*"([^"]+)",\s*url:\s*"([^"]+)"/g)];
  return new Map(paires.map((m) => [m[1], m[2]]));
}

/** Ce que `shouldHighlight` accepte, phase par phase. */
function elementsMisEnAvant(): string[] {
  return [...hook.matchAll(/if \(phase === "tour_[a-z_]+"\) return element === "([^"]+)"/g)]
    .map((m) => m[1]);
}

test("chaque entrée du menu a son étape dans le tour", () => {
  const menu = clesDuMenu();
  const tour = elementsMisEnAvant();
  assert.ok(menu.length > 0, "aucune clé lue dans MENU_ITEMS");
  for (const cle of menu) {
    assert.ok(
      tour.includes(cle),
      `l'entrée de menu "${cle}" n'a aucune étape de tour : la bulle ne s'ouvrira jamais dessus`,
    );
  }
});

test("aucune étape du tour ne vise une entrée de menu disparue", () => {
  // C'est LE bug de Gwenn : le tour grise un écran et attend un élément
  // qui n'existe plus, donc plus rien pour avancer.
  const menu = clesDuMenu();
  for (const cible of elementsMisEnAvant()) {
    assert.ok(
      menu.includes(cible),
      `l'étape de tour vise "${cible}", absent de MENU_ITEMS : écran grisé sans bulle`,
    );
  }
});

test("le tour envoie vers l'URL réelle de chaque entrée", () => {
  const urls = urlsDuMenu();
  const bloc = hook.slice(hook.indexOf("export const PHASE_TO_URL"));
  const paires = [...bloc.slice(0, bloc.indexOf("};")).matchAll(/(tour_[a-z_]+):\s*"([^"]+)"/g)];
  assert.ok(paires.length > 0, "PHASE_TO_URL introuvable");
  for (const [, phase, url] of paires) {
    // La page doit exister : une étape qui pousse vers une route morte
    // sort la personne du tour sur un 404.
    const chemin = `app${url}/page.tsx`;
    assert.ok(existsSync(chemin), `${phase} pousse vers ${url}, or ${chemin} n'existe pas`);
  }
  // Et l'URL de l'étape "projets" reste celle de l'entrée de menu.
  assert.equal(urls.get("projects"), "/quizzes");
});

test("l'accueil du tour ne s'adresse pas au lecteur au masculin", () => {
  // "On ne vend pas qu'à des femmes" vaut dans les deux sens : le filet
  // genre-neutre attrapait le féminin, jamais le masculin par défaut.
  // Ces cinq mots sont ceux qui étaient VRAIMENT là, en adresse directe.
  const MASCULIN: readonly RegExp[] = [
    /\bPrêt\s*\?/,
    /¿\s*Listo\s*\?/,
    /\bPronto\s*\?/,
    /\bBravo,\s*sai\b/,
    /مستعد؟/,
  ];
  for (const l of ["fr", "en", "es", "it", "pt", "pt-BR", "ar"]) {
    const t = JSON.parse(readFileSync(`messages/${l}.json`, "utf8")).tutorial;
    const texte = Object.values(t).join(" | ");
    for (const motif of MASCULIN) {
      assert.ok(
        !motif.test(texte),
        `${l} : le tour s'adresse au lecteur au masculin (${motif})`,
      );
    }
  }
});
