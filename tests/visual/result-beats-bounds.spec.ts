// tests/visual/result-beats-bounds.spec.ts
//
// Béné, 3 août 2026, sur la page de résultat en 4 temps :
// "l'encart est tout pété, il monte presque sur le menu de gauche."
//
// Le pont était le SEUL des quatre temps à porter un fond plein. Il était
// donc le seul dont on voyait le bord, et le moindre écart de gouttière
// avec les trois autres sautait aux yeux. Il portait en plus la couleur de
// marque, celle des boutons : "ça entraîne de la confusion".
//
// Les quatre temps partagent maintenant le même gabarit. Ce test le
// MESURE au lieu de le photographier : une capture ne dirait pas si le
// décalage vient d'un padding ou d'un débordement, et surtout elle ne
// rougirait pas pour deux pixels, qui suffisent pourtant à donner
// l'impression d'un encart "pété".
import { test, expect } from "@playwright/test";

import { advance } from "./flow";

test("les 4 temps du résultat partagent le même bord gauche", async ({ page }) => {
  // preview_name = mode aperçu créateur : la soumission ne POste rien, donc
  // aucune base n'est nécessaire. Même parcours que le filet de captures.
  await page.goto("/visual-test?layout=centered&bg=solid&beats=1&preview_name=Camille");
  // `advance` reclique tant que l'écran suivant n'est pas là : le premier
  // clic peut tomber avant l'hydratation React et rester sans effet.
  await advance(page, "Commencer le quiz", "Quand tu lances un projet");
  await advance(page, "Un plan detaille", "Je garde ce qui marche");
  await page.getByText("Je garde ce qui marche").click();
  await page.getByPlaceholder("ton@email.com").fill("test@example.com");
  const consent = page.getByRole("checkbox");
  if (await consent.count()) await consent.first().check();
  await page.getByRole("button", { name: "Voir mon profil" }).click();
  await expect(page.getByText("L'architecte").first()).toBeVisible();
  await page.waitForTimeout(600);

  // On mesure les bords de TOUT ce que le visiteur lit dans la colonne :
  // le nom du profil, le chapô, et chacun des temps. Comparer les temps
  // entre eux ne suffisait pas : ils étaient parfaitement alignés... 20 px
  // à droite du titre, ce qui est exactement ce que Béné a vu.
  const box = await page.evaluate(() => {
    const col = document.querySelector("h2")?.closest("div")?.parentElement;
    if (!col) return null;
    const read = (el: Element | null) =>
      el ? Math.round(el.getBoundingClientRect().left) : null;
    const title = read(document.querySelector("h2"));
    // Les temps : les blocs de la colonne qui portent un titre coloré.
    const beats = Array.from(col.querySelectorAll<HTMLElement>(":scope > div"))
      .filter((el) => el.getBoundingClientRect().width > 200)
      .map((el) => Math.round(el.getBoundingClientRect().left));
    return { title, beats };
  });

  expect(box, "colonne de résultat introuvable").not.toBeNull();
  expect(box!.title, "titre du profil introuvable").not.toBeNull();
  expect(box!.beats.length, "aucun bloc mesuré").toBeGreaterThan(1);

  const all = [box!.title as number, ...box!.beats];
  const min = Math.min(...all);
  const max = Math.max(...all);
  // 1px de tolérance pour les arrondis sous-pixel.
  expect(
    max - min,
    `tout doit partir du même bord que le titre. Mesuré : titre ${box!.title}, blocs ${JSON.stringify(box!.beats)}`,
  ).toBeLessThanOrEqual(1);
});
