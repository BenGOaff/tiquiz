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

test("les 4 temps du résultat partagent le même bord gauche", async ({ page }) => {
  // preview_name = mode aperçu créateur : la soumission ne POste rien, donc
  // aucune base n'est nécessaire. Même parcours que le filet de captures.
  await page.goto("/visual-test?layout=centered&bg=solid&beats=1&preview_name=Camille");
  await expect(page.getByText("Commencer le quiz")).toBeVisible();
  await page.getByText("Commencer le quiz").click();
  await page.getByText("Un plan detaille").click();
  await page.getByText("Je garde ce qui marche").click();
  await page.getByPlaceholder("ton@email.com").fill("test@example.com");
  const consent = page.getByRole("checkbox");
  if (await consent.count()) await consent.first().check();
  await page.getByRole("button", { name: "Voir mon profil" }).click();
  await expect(page.getByText("L'architecte").first()).toBeVisible();
  await page.waitForTimeout(600);

  const lefts = await page.evaluate(() => {
    // Les temps sont les blocs à filet vertical de la colonne de contenu.
    const blocks = Array.from(document.querySelectorAll<HTMLElement>("[class*='border-l-']"))
      .filter((el) => el.offsetParent !== null && el.getBoundingClientRect().width > 200);
    return blocks.map((el) => Math.round(el.getBoundingClientRect().left));
  });

  expect(lefts.length, "aucun temps rendu : la fixture n'est pas en mode 4 temps").toBeGreaterThan(1);
  const min = Math.min(...lefts);
  const max = Math.max(...lefts);
  // 1px de tolérance pour les arrondis sous-pixel.
  expect(max - min, `bords gauches désalignés : ${JSON.stringify(lefts)}`).toBeLessThanOrEqual(1);
});
