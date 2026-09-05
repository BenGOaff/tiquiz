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

  // ON DESCEND VRAIMENT, ET C'EST À PRENDRE AU MOT.
  //
  // Le premier jet faisait `window.scrollTo(0, y)` toutes les 40 ms.
  // MESURÉ le 5 septembre, position par position : `scrollY` restait
  // entre 250 et 760 alors qu'on demandait jusqu'à 26200, et il
  // RECULAIT parfois. `globals.css` pose `scroll-behavior: smooth` :
  // chaque appel lançait une animation que le suivant interrompait.
  // Le test ne descendait donc pas la page, et son résultat dépendait
  // du pas choisi (pas de 400 : le bloc s'anime ; pas de 500 : il reste
  // inerte). Un test qui ne fait pas ce qu'il annonce est pire qu'un
  // test absent.
  //
  // `behavior: "instant"` place la fenêtre au lieu de l'y emmener, et
  // c'est aussi le geste d'une lectrice qui appuie sur Fin ou clique
  // une ancre : le cas exact que le déclencheur doit tenir.
  const hauteur = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < hauteur; y += 500) {
    await page.evaluate((v) => window.scrollTo({ top: v, behavior: "instant" }), y);
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(600);

  // Et on VÉRIFIE qu'on est bien descendu : sans ça, le test dirait la
  // même chose sur une page qu'il n'a jamais parcourue.
  const arrivee = await page.evaluate(() => Math.round(window.scrollY));
  expect(arrivee, "le test n'a pas réussi à descendre la page").toBeGreaterThan(hauteur / 2);

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
    // LE SEUIL DIT "INERTE", IL NE COMPTE PAS. Le premier jet exigeait
    // plus de 5, calibré sur des blocs qui en portent 23 à 31 ; il
    // rougissait donc sur `viralite-trafic`, qui en déclare SIX et en
    // anime cinq, c'est à dire un bloc qui s'anime parfaitement. Ce
    // contrôle existe pour attraper un bloc à ZÉRO (le cas mesuré le
    // 5 septembre), pas pour arbitrer entre 5 et 6.
    expect(b.animes, `${b.bloc} : aucun élément animé, le bloc est inerte`).toBeGreaterThan(0);
    expect(b.largeur, `${b.bloc} : le bloc ne prend aucune place`).toBeGreaterThan(100);
    // Le premier jet servait la variante MOBILE sur un grand écran :
    // elle mesurait 10463 px de haut. Une hauteur absurde est le signe
    // qu'on sert la mauvaise variante.
    //
    // LE SEUIL NE DÉPARTAGE RIEN À LA LIMITE, et c'est ce qui compte.
    // Mesuré le 5 septembre : le plus haut des blocs légitimes est la
    // variante mobile de son comparatif, 1390 px sur un viewport de
    // 844, servie par la media query de sa propre île. Le cas fautif
    // faisait 10463. Un seuil à 1200 tranchait donc entre deux blocs
    // justes ; à 3000 il est loin des deux groupes et ne constate qu'un
    // écart qui existe.
    expect(b.hauteur, `${b.bloc} : hauteur absurde, mauvaise variante ?`).toBeLessThan(3000);
  }
});

test("un saut d'un seul coup ne laisse aucun bloc figé", async ({ page }) => {
  // LE CAS D'UNE VRAIE LECTRICE, et celui que le test précédent ne peut
  // pas voir : elle appuie sur Fin, elle clique une ancre du menu, elle
  // jette la molette. Le bloc est franchi sans qu'aucune image de la
  // page ne le montre dans la fenêtre.
  //
  // MESURÉ le 5 septembre, avec l'ancienne condition `bottom > -40` :
  // opt-in-vs-quiz, tes-pixels et ton-branding restaient à ZÉRO élément
  // animé, donc figés dans leur état d'avant l'animation, pour toujours.
  // Ils s'affichaient très bien : rien ne le disait.
  await page.goto(LANDING, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);

  await page.evaluate(() =>
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }),
  );
  await page.waitForTimeout(800);

  // On remonte au milieu : c'est là qu'on REGARDE ce qui a été franchi.
  await page.evaluate(() => window.scrollTo({ top: 12000, behavior: "instant" }));
  await page.waitForTimeout(400);

  const figes = await page.evaluate(() =>
    Array.from(document.querySelectorAll("[data-anim-vente]"))
      .map((d) => {
        let animes = 0;
        for (const el of d.querySelectorAll("*")) {
          if (getComputedStyle(el).animationName !== "none") animes++;
        }
        return { bloc: (d as HTMLElement).dataset.animVente ?? "?", animes };
      })
      .filter((b) => b.animes === 0)
      .map((b) => b.bloc),
  );

  expect(figes, `blocs figés après un saut : ${figes.join(", ")}`).toEqual([]);
});
