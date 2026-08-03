// tests/visual/intro-bounds.spec.ts
//
// Béné, 3 août 2026, pour la deuxième fois : "pourquoi la case du sous
// titre est plus courte que celle du titre ?? Elle a une marge à droite
// que le titre n'a pas et du coup c'est impossible de lui donner la même
// longueur visuellement."
//
// POURQUOI CE TEST N'EST PAS UNE CAPTURE. Le filet visuel a photographié
// cet écran 90 fois sans jamais voir le bug : le sous-titre de la fixture
// se coupe au même mot à 576px et à 672px, donc les pixels étaient
// identiques alors que les BORDS ne l'étaient pas. Mesuré avant
// correction : titre 672px (bord droit 1056), sous-titre 576px (bord
// droit 960). 96px d'écart, invisibles à la capture.
//
// On mesure donc les boîtes, pas les pixels. Un futur `max-w-*` ou
// `mx-auto` posé sur l'un des deux champs fait rougir ce test tout de
// suite, au lieu d'attendre qu'elle le revoie une troisième fois.
import { test, expect } from "@playwright/test";

const ALIGNMENTS = ["left", "centered"] as const;

for (const layout of ALIGNMENTS) {
  test(`titre et sous-titre partagent leurs bords (${layout})`, async ({ page }) => {
    await page.goto(`/visual-test?layout=${layout}&bg=solid`);
    await page.waitForLoadState("networkidle");

    const boxes = await page.evaluate(() => {
      const h1 = document.querySelector("h1");
      const sub =
        document.querySelector("h1 ~ .tiquiz-rich") ?? document.querySelector("h1 ~ p");
      const box = (el: Element | null) =>
        el
          ? {
              left: Math.round(el.getBoundingClientRect().left),
              right: Math.round(el.getBoundingClientRect().right),
            }
          : null;
      return { title: box(h1), subtitle: box(sub) };
    });

    expect(boxes.title, "titre introuvable dans l'écran d'accueil").not.toBeNull();
    expect(boxes.subtitle, "sous-titre introuvable dans l'écran d'accueil").not.toBeNull();
    // 1px de tolérance : un arrondi de sous-pixel n'est pas un décalage.
    expect(Math.abs(boxes.subtitle!.left - boxes.title!.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(boxes.subtitle!.right - boxes.title!.right)).toBeLessThanOrEqual(1);
  });
}
