// tests/visual/landing-paddings.spec.ts
//
// LES PADDINGS SE MESURENT, ILS NE SE PHOTOGRAPHIENT PAS.
//
// Béné, 4 septembre 2026 : "un truc sur lequel toutes les IA se plantent :
// les paddings hauts et bas. Je veux au moins 100px en haut et 100px en
// bas pour chaque section sauf le hero si pas adapté."
//
// Mesuré avant correction sur la landing : le hero était à 72/84, la FAQ
// à 70/70, le bandeau de fin à 96/96, et TOUT tombait à 60 en dessous de
// 900 px de large. Aucune capture d'écran n'aurait fait rougir quoi que
// ce soit : une section trop serrée reste une section qui s'affiche.
//
// C'est le même geste que `intro-bounds.spec.ts` (3 août) : on MESURE
// des boîtes au lieu de les photographier, parce qu'une capture ne voit
// pas un bord qui bouge quand le texte se coupe au même mot.
//
// ET IL VÉRIFIE AUSSI QUE SES ANIMATIONS TOURNENT. Les blocs levés de sa
// page de vente sont INERTES sans le déclencheur qui pose `tqz-visible`
// (mesuré : 0 élément animé sans lui, 23 avec). Un bloc animé qui ne
// s'animerait plus s'afficherait quand même : là encore, seule la mesure
// le dit.

import { test, expect } from "@playwright/test";

const LANDING = "/apercu-landing-8f2c9d41?lang=fr";

/** Le minimum qu'elle demande, en pixels, en haut ET en bas. */
const MINIMUM = 100;

test("chaque section de la landing porte au moins 100 px en haut et en bas", async ({ page }) => {
  await page.goto(LANDING, { waitUntil: "domcontentloaded" });
  // Les polices auto hébergées peuvent décaler la mise en page ; les
  // paddings n'en dépendent pas, mais on attend un rendu stable.
  await page.waitForTimeout(400);

  const sections = await page.evaluate(() =>
    Array.from(document.querySelectorAll("main.tql > section")).map((s, i) => {
      const c = getComputedStyle(s);
      return {
        rang: i,
        classe: (s as HTMLElement).className,
        haut: parseFloat(c.paddingTop),
        bas: parseFloat(c.paddingBottom),
      };
    }),
  );

  expect(sections.length, "la landing doit avoir des sections").toBeGreaterThan(6);

  const trop = sections.filter((s) => s.haut < MINIMUM || s.bas < MINIMUM);
  expect(
    trop,
    `sections sous ${MINIMUM} px : ` +
      trop.map((s) => `#${s.rang} (${s.classe}) ${s.haut}/${s.bas}`).join(", "),
  ).toEqual([]);
});

test("les blocs animés levés de la page de vente s'animent vraiment", async ({ page }) => {
  await page.goto(LANDING, { waitUntil: "domcontentloaded" });

  // ON DESCEND VRAIMENT : sa mécanique pose `tqz-visible` quand le bloc
  // arrive à 85 % du viewport. Sans défiler, on mesurerait un bloc qui
  // n'a pas encore reçu son signal, et le test serait faux dans les deux
  // sens.
  const hauteur = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < hauteur; y += 500) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(600);

  const blocs = await page.evaluate(() =>
    Array.from(document.querySelectorAll("[data-anim-vente]")).map((d) => {
      let animes = 0;
      for (const el of d.querySelectorAll("*")) {
        const a = getComputedStyle(el).animationName;
        if (a && a !== "none") animes++;
      }
      const r = d.getBoundingClientRect();
      return {
        bloc: (d as HTMLElement).dataset.animVente ?? "?",
        animes,
        largeur: Math.round(r.width),
        hauteur: Math.round(r.height),
      };
    }),
  );

  expect(blocs.length, "les blocs animés doivent être posés").toBeGreaterThan(0);
  for (const b of blocs) {
    expect(b.animes, `${b.bloc} : aucun élément animé, le bloc est inerte`).toBeGreaterThan(5);
    expect(b.largeur, `${b.bloc} : le bloc ne prend aucune place`).toBeGreaterThan(100);
    // Le premier jet servait la variante MOBILE sur un grand écran :
    // elle mesurait 10463 px de haut. Une hauteur absurde est le signe
    // qu'on sert la mauvaise variante.
    expect(b.hauteur, `${b.bloc} : hauteur absurde, mauvaise variante ?`).toBeLessThan(1200);
  }
});
