// tests/visual/responsive-site.spec.ts
//
// LE SITE PUBLIC TIENT DANS L'ECRAN, ET RIEN N'EST HORS D'ATTEINTE.
//
// Béné, 7 septembre 2026 : "pense évidemment au responsive pour tout."
//
// -- POURQUOI CE FILET EXISTE, ET IL VIENT D'UNE MESURE ---------------
//
// En posant son bloc des autres outils, il a suffi de le REGARDER sur
// un téléphone pour voir le téléphone coupé à gauche et les trois
// cartes coupées à droite. Mesuré ensuite sur les onze pages du site
// aux quatre largeurs, deux AUTRES blocs étaient dans le même cas
// depuis le 6 septembre, sur des pages déjà en relecture :
//
//   viralite-trafic   +46 px   (sa deuxième carte de chiffres)
//   ton-branding      +26 px   (son panneau de réglages)
//
// AUCUNE CAPTURE NE POUVAIT LE VOIR : la page ne débordait pas, elle
// s'affichait très bien, et le contenu manquant ne manquait à personne
// sauf à la lectrice.
//
// -- ET IL MESURE CE QUE LE NAVIGATEUR APPLIQUE ----------------------
//
// La correction a d'abord été SERVIE sans aucun effet : un guillemet
// double orphelin traînait en fin de feuille, et un guillemet non fermé
// fait abandonner à l'analyseur CSS tout ce qui suit. La règle était
// dans le HTML, lisible, et morte.
//
// Un test qui aurait cherché la règle dans la source serait donc sorti
// VERT sur une page cassée. On demande au navigateur, jamais au
// fichier : c'est la leçon du 22 août, appliquée au CSS.

import { test, expect } from "@playwright/test";

/**
 * Les pages publiques du site, celles qu'un visiteur froid ouvre.
 *
 * LA LISTE EST ÉCRITE À LA MAIN, ET CE N'EST PAS L'IDÉAL : une liste
 * oublie la page ajoutee demain (c'est exactement ce qui est arrive a
 * /generateur-de-quiz, cree le 8 septembre et absent de ce filet
 * jusqu'au meme jour). Elle n'est pas DERIVEE de PAGES_PUBLIQUES parce
 * que ce module en porte d'autres (/affiliation, /a-propos,
 * /integrations, les articles) qui n'ont jamais ete mesurees ici : les
 * ajouter d'un coup est un chantier a part, et un filet qui rougit sur
 * des pages qu'on n'a pas regardees finit desactive.
 *
 * -> Toute page publique ajoutee s'ajoute ICI le jour ou elle est
 *    ecrite.
 */
const PAGES = [
  "/apercu-landing-8f2c9d41",
  "/generateur-de-quiz",
  "/tarifs",
  "/fonctionnalites",
  "/fonctionnalites/generation-ia",
  "/fonctionnalites/connexion-systeme-io",
  "/fonctionnalites/resultats-par-profil",
  "/fonctionnalites/quiz-profil-ou-score",
  "/fonctionnalites/partage-et-viralite",
  "/fonctionnalites/sondages-et-popquiz",
  "/fonctionnalites/branding-et-langues",
  "/fonctionnalites/ou-placer-son-quiz",
  // LES DEUX ARTICLES QUI ONT BOUGE LE 8 SEPTEMBRE, et eux seuls.
  //
  // Le premier porte le nouveau bloc VIDEO (une facade en 16/9 qui n'a
  // jamais ete mesuree sur un telephone), le second la fin restauree du
  // cas client (deux listes, deux cartes et une FAQ de six questions).
  //
  // Les huit autres articles restent hors de ce filet : les ajouter
  // d'un coup est le chantier que l'en-tete de ce fichier nomme, et un
  // filet qui rougit sur des pages qu'on n'a pas regardees finit
  // desactive.
  "/blog/avis-tiquiz",
  "/blog/cas-client-jocelyne-tdah",
];

test.describe("le site public tient dans l'écran", () => {
  for (const url of PAGES) {
    test(`aucun débordement horizontal sur ${url}`, async ({ page }) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(300);
      const m = await page.evaluate(() => {
        const de = document.documentElement;
        // Ce qui dépasse vraiment, nommé : un message qui dit
        // seulement "ça déborde" fait rouvrir le navigateur à la main.
        const larges = [...document.body.querySelectorAll("*")]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && (r.right > de.clientWidth + 2 || r.left < -2);
          })
          .slice(0, 4)
          .map((el) => `${el.tagName}.${String(el.className).slice(0, 40)}`);
        return { trop: de.scrollWidth - de.clientWidth, larges };
      });
      expect(
        m.trop,
        `la page déborde de ${m.trop} px : ${m.larges.join(" | ")}`,
      ).toBeLessThanOrEqual(2);
    });

    test(`aucun contenu d'île hors d'atteinte sur ${url}`, async ({ page }) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(300);
      // ON MESURE LES DEUX ENSEMBLE, et c'est tout le sujet : une île
      // plus large que sa boîte n'est un défaut QUE si on ne peut pas
      // la faire défiler. Les blocs sont dessinés pour un grand écran,
      // donc dépasser est normal ; être coupé sans recours ne l'est
      // pas.
      const coupes = await page.evaluate(() =>
        [...document.querySelectorAll("[data-anim-vente]")]
          .map((el) => ({
            nom: el.getAttribute("data-anim-vente"),
            trop: el.scrollWidth - el.clientWidth,
            peutGlisser: getComputedStyle(el).overflowX !== "visible",
          }))
          .filter((x) => x.trop > 2 && !x.peutGlisser),
      );
      expect(
        coupes.map((c) => `${c.nom} (+${c.trop} px)`),
        "ce contenu est coupé et rien ne permet d'y accéder",
      ).toEqual([]);
    });
  }

  test("la règle qui héberge ses îles est APPLIQUÉE, pas seulement servie", async ({
    page,
    viewport,
  }) => {
    // LE GARDE-FOU DU GUILLEMET ORPHELIN. Une règle avalée par une
    // chaîne CSS non fermée reste lisible dans le fichier et dans le
    // HTML : seul le navigateur sait qu'elle est morte.
    test.skip((viewport?.width ?? 0) > 900, "la règle ne vaut que sous 900 px");
    await page.goto("/apercu-landing-8f2c9d41", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    const applique = await page.evaluate(() => {
      const el = document.querySelector("[data-anim-vente]");
      return el ? getComputedStyle(el).overflowX : null;
    });
    expect(
      applique,
      "le navigateur ne voit pas la règle d'hébergement : une déclaration en amont l'a peut-être avalée",
    ).not.toBe("visible");
  });
});
