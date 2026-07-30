// Captures de reference du quiz public : matrice dispositions x ecrans.
// Chaque test charge la fixture /visual-test (quiz de demo en dur), navigue
// jusqu'a l'ecran vise comme un vrai visiteur, et compare le rendu complet
// a la reference commitee. Un casse de layout (footer qui migre, carte
// collee en haut, fond qui ne couvre pas) fait echouer le diff.
import { test, expect, type Page } from "@playwright/test";

const LAYOUTS = [
  { name: "centered", qs: "layout=centered&bg=solid" },
  { name: "split", qs: "layout=split&bg=solid" },
  { name: "left-gradient", qs: "layout=left&bg=gradient" },
  { name: "centered-image-bg", qs: "layout=centered&bg=image" },
  { name: "cover-intro", qs: "layout=centered&intro=cover&bg=solid" },
] as const;

async function gotoFixture(page: Page, qs: string) {
  await page.goto(`/visual-test?${qs}`);
  // Le bandeau "Mode apercu" (DOM imperatif, position:fixed) bouge de
  // quelques pixels selon le timing : volatil, pas du layout. On le masque
  // pour des captures deterministes.
  await page.addStyleTag({ content: "[data-tiquiz-preview-banner]{display:none !important}" });
  // Bouton de demarrage visible = quiz monte et police chargee.
  await expect(page.getByText("Commencer le quiz")).toBeVisible();
  await page.waitForTimeout(400);
}

async function startQuiz(page: Page) {
  await page.getByText("Commencer le quiz").click();
  await expect(page.getByText("Quand tu lances un projet")).toBeVisible();
  await page.waitForTimeout(400);
}

async function answerAllQuestions(page: Page) {
  await page.getByText("Un plan detaille").click();
  await expect(page.getByText("Ta relation aux outils")).toBeVisible();
  await page.getByText("Je garde ce qui marche").click();
  await page.waitForTimeout(400);
}

for (const layout of LAYOUTS) {
  test.describe(layout.name, () => {
    test("intro", async ({ page }) => {
      await gotoFixture(page, layout.qs);
      await expect(page).toHaveScreenshot(`${layout.name}-intro.png`, { fullPage: true });
    });

    test("question", async ({ page }) => {
      await gotoFixture(page, layout.qs);
      await startQuiz(page);
      await expect(page).toHaveScreenshot(`${layout.name}-question.png`, { fullPage: true });
    });

    test("capture", async ({ page }) => {
      await gotoFixture(page, layout.qs);
      await startQuiz(page);
      await answerAllQuestions(page);
      await expect(page.getByText("Ton profil est pret !")).toBeVisible();
      await page.waitForTimeout(400);
      await expect(page).toHaveScreenshot(`${layout.name}-capture.png`, { fullPage: true });
    });

    test("bonus", async ({ page }) => {
      // Ecran de partage bonus, insere entre capture et resultat quand la
      // viralite est activee (bonus=1 dans la fixture).
      await gotoFixture(page, `${layout.qs}&bonus=1&preview_name=Camille`);
      await startQuiz(page);
      await answerAllQuestions(page);
      await page.getByPlaceholder("ton@email.com").fill("test@example.com");
      const consent = page.getByRole("checkbox");
      if (await consent.count()) await consent.first().check();
      await page.getByRole("button", { name: "Voir mon profil" }).click();
      await expect(page.getByText("Avant de découvrir tes résultats")).toBeVisible();
      await page.waitForTimeout(600);
      await expect(page).toHaveScreenshot(`${layout.name}-bonus.png`, { fullPage: true });
    });

    test("result-score", async ({ page }) => {
      // Mode scoring multi-axes (Veronique juillet 2026) : jauge du score
      // global + barres par axe sur la page de resultat.
      await gotoFixture(page, `${layout.qs}&score=1&preview_name=Camille`);
      await startQuiz(page);
      await answerAllQuestions(page);
      await page.getByPlaceholder("ton@email.com").fill("test@example.com");
      const consent = page.getByRole("checkbox");
      if (await consent.count()) await consent.first().check();
      await page.getByRole("button", { name: "Voir mon profil" }).click();
      // 50% = jauge globale calculee (3 points sur 6) -> le mode scoring
      // multi-axes est bien actif, pas le fallback X / Y.
      await expect(page.getByText("50%").first()).toBeVisible();
      await expect(page.getByText("Organisation")).toBeVisible();
      await page.waitForTimeout(600);
      await expect(page).toHaveScreenshot(`${layout.name}-result-score.png`, { fullPage: true });
    });

    test("result", async ({ page }) => {
      // preview_name = mode apercu createur : l'ecran capture s'affiche mais
      // la soumission ne POste rien (aucune base requise) et mene au resultat.
      await gotoFixture(page, `${layout.qs}&preview_name=Camille`);
      await startQuiz(page);
      await answerAllQuestions(page);
      await page.getByPlaceholder("ton@email.com").fill("test@example.com");
      const consent = page.getByRole("checkbox");
      if (await consent.count()) await consent.first().check();
      await page.getByRole("button", { name: "Voir mon profil" }).click();
      await expect(page.getByText("L'architecte").first()).toBeVisible();
      await page.waitForTimeout(600);
      await expect(page).toHaveScreenshot(`${layout.name}-result.png`, { fullPage: true });
    });
  });
}
