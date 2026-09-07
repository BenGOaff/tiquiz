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

// L'ADRESSE DE LA LANDING, ET ELLE N'EST PAS `/`.
//
// Bene, 6 septembre 2026 : "montre moi la landing sur la page apercu
// 8f2 etc pas directement en page d'accueil, on la valide d'abord
// ensemble." `tiquiz.fr/` sert donc encore sa page de vente ; la
// landing vit derriere ce slug introuvable, en noindex.
const LANDING = "/apercu-landing-8f2c9d41?lang=fr";

// OÙ VIVENT SES ANIMATIONS DEPUIS LE 6 SEPTEMBRE, ET C'EST SA DÉCISION.
//
// La landing courte ne porte AUCUN de ses blocs animés : les sections
// qu'ils illustraient sont parties sur `/fonctionnalites/<slug>`
// ("rien n'est à jeter, tout est à déplacer"). Le fait que ce test
// mesure n'a pas bougé d'un pouce (un bloc levé de sa page est INERTE
// tant que le déclencheur ne pose pas sa classe) ; c'est la page qui le
// porte qui a changé.
//
// ON RETARGETE, ON NE RELÂCHE PAS. Un test qu'on assouplit parce qu'il
// rougit ne protège plus rien, et c'est exactement ce bloc là qui a
// trouvé trois animations figées pour toujours le 5 septembre.
const PAGE_ANIMEE = "/fonctionnalites/generation-ia";

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
  await page.goto(PAGE_ANIMEE, { waitUntil: "domcontentloaded" });

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
  await page.goto(PAGE_ANIMEE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);

  await page.evaluate(() =>
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }),
  );
  await page.waitForTimeout(800);

  // On remonte au MILIEU de la page, mesuré et pas écrit en dur : un
  // `12000` calibré sur la longue landing renverrait tout en haut d'une
  // page de fonctionnalité, donc ne regarderait rien de ce qui a été
  // franchi, donc passerait au vert sans rien vérifier.
  await page.evaluate(() =>
    window.scrollTo({ top: document.documentElement.scrollHeight / 2, behavior: "instant" }),
  );
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

/**
 * L'ANIMATION DU TAG JOUE VRAIMENT, ET LE CARROUSEL DÉFILE.
 *
 * Béné, 7 septembre 2026, sur le paragraphe des intégrations : "c'est
 * long, il faut faire un effort pour comprendre. Fais une animation qui
 * relate ça." Une animation INERTE serait pire que le paragraphe : elle
 * prend la place et ne dit rien.
 *
 * ON MESURE LE GESTE, PAS L'ÉTAT AU REPOS (leçon du 2 septembre). Le
 * bloc est servi RÉVÉLÉ, donc une capture au repos le montre déjà
 * terminé : ce qui prouve qu'il joue, c'est qu'il PASSE par un état
 * intermédiaire (le menu ouvert) avant son état final.
 *
 * -- ET IL LUI FAUT SON PROPRE CONTEXTE, C'EST TOUT LE SUJET ---------
 *
 * `playwright.visual.config.ts` pose `reducedMotion: "reduce"` pour
 * TOUT le filet, et c'est juste : une capture d'écran doit être stable.
 * Mais sous cette préférence, le CSS de ces deux blocs coupe exprès ce
 * qu'on vient mesurer (`.tqtag-liste{display:none}`, le carrousel
 * arrêté). MESURÉ : ce test sortait rouge sur les trois viewports, en
 * annonçant "l'animation est inerte" sur une animation qui marche.
 *
 * C'est encore un contrôle qui ne distingue pas ce qu'il est censé
 * distinguer, et c'était le mien. Le geste n'existe que sans la
 * préférence : on mesure donc là où il existe.
 */
test.describe("le mouvement, mesuré là où il existe", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("l'animation du tag joue, et le carrousel de témoignages défile", async ({ page }) => {
    await page.goto(LANDING, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    // On descend jusqu'à l'animation SANS la révéler d'avance : le
    // déclencheur retire la classe au montage sur les blocs hors écran.
    const boite = await page.locator(".tqtag").boundingBox();
    if (!boite) throw new Error("l'animation du tag n'est pas dans la page");
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), boite.y - 300);

    const opacite = (s: string) =>
      page.evaluate((sel) => {
        const el = document.querySelector(sel);
        return el ? Number(getComputedStyle(el).opacity) : -1;
      }, s);

    // Le menu s'ouvre entre 1,0 s et 2,1 s : on regarde au milieu.
    await page.waitForTimeout(1500);
    const listeOuverte = await opacite(".tqtag-liste");

    // Puis la scène finit : le tag choisi et la carte Systeme.io.
    await page.waitForTimeout(4200);
    const choisi = await opacite(".tqtag-choisi");
    const arrivee = await opacite(".tqtag-camp");

    expect(
      listeOuverte,
      `le menu de tags ne s'ouvre jamais (opacité ${listeOuverte}) : l'animation est inerte`,
    ).toBeGreaterThan(0.5);
    expect(choisi, "le tag choisi n'apparaît pas dans le champ").toBeGreaterThan(0.9);
    expect(arrivee, "le contact n'arrive jamais dans Systeme.io").toBeGreaterThan(0.9);

    // LE CARROUSEL : deux mesures à 900 ms d'écart. Une piste figée rend
    // deux fois la même matrice, et c'est exactement ce qu'on refuse.
    const piste = ".tqtm-piste";
    const t1 = await page.evaluate((s) => getComputedStyle(document.querySelector(s)!).transform, piste);
    await page.waitForTimeout(900);
    const t2 = await page.evaluate((s) => getComputedStyle(document.querySelector(s)!).transform, piste);
    expect(t2, `le carrousel de témoignages ne défile pas (${t1})`).not.toBe(t1);
  });
});
