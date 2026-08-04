// Captures de reference du quiz public : matrice dispositions x ecrans.
// Chaque test charge la fixture /visual-test (quiz de demo en dur), navigue
// jusqu'a l'ecran vise comme un vrai visiteur, et compare le rendu complet
// a la reference commitee. Un casse de layout (footer qui migre, carte
// collee en haut, fond qui ne couvre pas) fait echouer le diff.
import { test, expect, type Page } from "@playwright/test";

import { advance } from "./flow";

const LAYOUTS = [
  { name: "centered", qs: "layout=centered&bg=solid" },
  { name: "split", qs: "layout=split&bg=solid" },
  { name: "left-gradient", qs: "layout=left&bg=gradient" },
  { name: "centered-image-bg", qs: "layout=centered&bg=image" },
  { name: "cover-intro", qs: "layout=centered&intro=cover&bg=solid" },
] as const;

/**
 * Attend que la HAUTEUR DU DOCUMENT soit stable avant de capturer.
 *
 * Les captures sont en `fullPage` : leur hauteur est celle du document.
 * Si quoi que ce soit arrive en retard (police, image, transition), la
 * capture sort en 878px au lieu de 844px et le diff echoue pour une
 * raison qui n'a rien a voir avec le layout. Un `waitForTimeout` fixe ne
 * protege de rien : il suffit que la machine soit chargee ce jour-la.
 *
 * Vu le 1er aout 2026 : `cover-intro > capture` en mobile, rouge au
 * premier essai, vert au retry. Un filet qui clignote ne sert a rien :
 * a la longue on cesse de le croire, et le jour ou il attrape un vrai
 * casse de layout, personne ne regarde.
 */
async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => {
      let last = -1;
      let stable = 0;
      let frames = 0;
      const tick = () => {
        const h = document.documentElement.scrollHeight;
        stable = h === last ? stable + 1 : 0;
        last = h;
        // 5 frames identiques = pose. 180 frames (~3s) = garde-fou, on
        // rend la main plutot que de bloquer la suite indefiniment.
        if (stable >= 5 || ++frames > 180) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  });
}

async function gotoFixture(page: Page, qs: string) {
  await page.goto(`/visual-test?${qs}`);
  // Le bandeau "Mode apercu" (DOM imperatif) doit disparaitre des
  // captures : volatil, pas du layout.
  //
  // DEUX PIEGES, les deux ont fait clignoter le filet (1er aout 2026) :
  //
  // 1. L'attribut reel est `data-tipote-preview-banner` (heritage du port
  //    Tipote), pas `data-tiquiz-`. Le selecteur ne matchait donc RIEN et
  //    le bandeau etait la depuis le debut.
  // 2. Le bandeau est en `position:fixed`, il n'ajoute pas de hauteur lui
  //    meme. Mais son effet pose `document.body.style.paddingTop` : +34px
  //    sur la hauteur du document, donc sur une capture `fullPage`. Le
  //    masquer ne suffit pas, il faut annuler le padding. Un `!important`
  //    de feuille de style bat un style inline sans `!important`.
  //
  // Selon que l'effet arrivait avant ou apres la capture, on obtenait
  // 900px ou 934px : rouge, puis vert au retry.
  await page.addStyleTag({
    content: `
      [data-tipote-preview-banner],
      [data-tiquiz-preview-banner] { display: none !important; }
      body { padding-top: 0 !important; }
    `,
  });
  // Bouton de demarrage visible = quiz monte et police chargee.
  await expect(page.getByText("Commencer le quiz")).toBeVisible();
  await page.waitForTimeout(400);
}

async function startQuiz(page: Page) {
  // `advance` reclique tant que l'ecran suivant n'est pas la : le premier
  // clic peut tomber avant l'hydratation React et rester sans effet, ce
  // qui faisait clignoter le filet (cf. tests/visual/flow.ts).
  await advance(page, "Commencer le quiz", "Quand tu lances un projet");
  await page.waitForTimeout(400);
}

async function answerAllQuestions(page: Page) {
  await advance(page, "Un plan detaille", "Ta relation aux outils");
  await page.getByText("Je garde ce qui marche").click();
  await page.waitForTimeout(400);
}

for (const layout of LAYOUTS) {
  test.describe(layout.name, () => {
    test("intro", async ({ page }) => {
      await gotoFixture(page, layout.qs);
      await settle(page);
      await expect(page).toHaveScreenshot(`${layout.name}-intro.png`, { fullPage: true });
    });

    test("question", async ({ page }) => {
      await gotoFixture(page, layout.qs);
      await startQuiz(page);
      await settle(page);
      await expect(page).toHaveScreenshot(`${layout.name}-question.png`, { fullPage: true });
    });

    test("capture", async ({ page }) => {
      await gotoFixture(page, layout.qs);
      await startQuiz(page);
      await answerAllQuestions(page);
      await expect(page.getByText("Ton profil est pret !")).toBeVisible();
      await page.waitForTimeout(400);
      await settle(page);
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
      await settle(page);
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
      await settle(page);
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
      await settle(page);
      await expect(page).toHaveScreenshot(`${layout.name}-result.png`, { fullPage: true });
    });
  });
}
