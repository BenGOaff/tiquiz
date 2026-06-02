// tests/e2e/public-quiz.spec.ts
//
// Tests de non-régression sur les routes publiques critiques Tiquiz.
// Port direct du pattern Tipote (tests/e2e/public-quiz.spec.ts). Phase
// 7 ROADMAP_RETENTION.md.
//
// Pourquoi : la panne 2 juin matin (404 généralisé sur les quiz publics
// à cause d'une migration en retard) aurait été détectée en 30s par ces
// tests s'ils tournaient en CI. La famille de bugs qui CASSE de manière
// silencieuse pour les users qui embed leurs quiz / popquiz sur leur
// blog (= la pub qui tourne dessus pour eux) :
//
//   1. Headers : iframe autorisée (X-Frame-Options absent + CSP
//      frame-ancestors *)
//   2. La page se charge (status 200, contenu visible, pas white-screen)
//   3. OG meta présents (preview iMessage / WhatsApp / Slack)
//   4. Funnel basique : bouton de démarrage cliquable
//   5. /track répond 200 (jamais 4xx, pour ne pas polluer la console
//      des visiteurs)
//
// Tests SKIPPÉS automatiquement si SMOKE_*_ID / SMOKE_*_SLUG absent.
// Permet au CI de tourner sans casser quand les secrets ne sont pas
// fournis. À configurer dans GitHub Secrets pour le run programmé.

import { test, expect, type APIResponse } from "@playwright/test";

const QUIZ_ID = process.env.SMOKE_QUIZ_ID;
const PAGE_SLUG = process.env.SMOKE_PAGE_SLUG;
const POPQUIZ_ID = process.env.SMOKE_POPQUIZ_ID;

const skipIf = (cond: boolean, reason: string) => test.skip(cond, reason);

// ═══════════════════════════════════════════════════════════════════
// /q/[quizId] — viewer public quiz / sondage
// ═══════════════════════════════════════════════════════════════════

test.describe("Quiz public /q/[id]", () => {
  test.beforeEach(() => {
    skipIf(!QUIZ_ID, "SMOKE_QUIZ_ID non fourni");
  });

  test("headers : iframe permise (X-Frame-Options absent + CSP frame-ancestors *)", async ({
    request,
    baseURL,
  }) => {
    const response = (await request.get(`/q/${QUIZ_ID}`)) as APIResponse;
    expect(response.status(), `URL ${baseURL}/q/${QUIZ_ID}`).toBe(200);

    const headers = response.headers();

    // PITFALL X (Tiquiz) : NE JAMAIS poser X-Frame-Options sur /q/
    // — sinon les iframes des users (JB, imagelys et co qui embed
    // leurs quiz sur leur blog WordPress) cassent silencieusement.
    expect(
      headers["x-frame-options"],
      "X-Frame-Options présent → iframe cassée chez les users qui embed",
    ).toBeUndefined();

    // CSP frame-ancestors * AUTORISÉ partout (alternative au header
    // X-Frame-Options pour la même garantie). Si absente OU avec
    // 'self' uniquement, l'embed casse.
    const csp = headers["content-security-policy"] ?? "";
    if (csp) {
      // Si une CSP est posée, elle DOIT contenir frame-ancestors *
      expect(
        csp,
        "CSP présente mais frame-ancestors ne permet pas l'embed externe",
      ).toMatch(/frame-ancestors\s+\*/i);
    }
    // Si pas de CSP du tout : OK, le navigateur autorise par défaut.
  });

  test("la page se charge et affiche du contenu visible", async ({ page }) => {
    const response = await page.goto(`/q/${QUIZ_ID}`, {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status(), "status HTTP page publique").toBe(200);

    // Garde-fou contre une white-screen-of-death. Le body doit avoir
    // du contenu visible.
    const bodyText = await page.locator("body").innerText({ timeout: 5_000 });
    expect(bodyText.length, "Body vide → quiz cassé").toBeGreaterThan(20);
  });

  test("metadata Open Graph présents (titre + url)", async ({ page }) => {
    await page.goto(`/q/${QUIZ_ID}`, { waitUntil: "domcontentloaded" });

    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(
      ogTitle,
      "og:title manquant → preview iMessage/WhatsApp dégradé",
    ).toHaveCount(1);

    const ogUrl = page.locator('meta[property="og:url"]');
    await expect(ogUrl, "og:url manquant").toHaveCount(1);

    const ogUrlContent = await ogUrl.getAttribute("content");
    expect(ogUrlContent, "og:url vide").toBeTruthy();
    if (ogUrlContent) {
      expect(
        () => new URL(ogUrlContent),
        "og:url n'est pas une URL absolue valide",
      ).not.toThrow();
      // Si l'URL diffère du host de la requête → custom domain, normal.
      const requestedHost = new URL(page.url()).host;
      const ogHost = new URL(ogUrlContent).host;
      if (ogHost !== requestedHost) {
        test.info().annotations.push({
          type: "info",
          description: `og:url host=${ogHost} ≠ requête=${requestedHost} (normal si domaine custom)`,
        });
      }
    }
  });

  test("intro → start : un bouton de démarrage est cliquable (sauf sondages)", async ({
    page,
  }) => {
    await page.goto(`/q/${QUIZ_ID}`, { waitUntil: "domcontentloaded" });

    const startCandidates = page.getByRole("button", {
      name: /(démarre|commenc|start|c'est parti|on y va|let's go|découvr)/i,
    });

    const count = await startCandidates.count();
    if (count === 0) {
      // Possible : sondage qui démarre direct sur Q1, ou start button
      // personnalisé non matché par la regex. Pas un fail hard.
      test.info().annotations.push({
        type: "info",
        description:
          "Aucun bouton de démarrage typé trouvé — peut être un sondage ou un start custom",
      });
      return;
    }
    await expect(startCandidates.first()).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════
// /track — endpoint analytics public
// ═══════════════════════════════════════════════════════════════════

test.describe("Quiz public — tracking endpoints", () => {
  test.beforeEach(() => {
    skipIf(!QUIZ_ID, "SMOKE_QUIZ_ID non fourni");
  });

  test("/track retourne 200 (jamais 4xx, même pour bot/owner)", async ({ request }) => {
    // PITFALL D : /track doit TOUJOURS répondre 200 même quand il
    // refuse de logger (bot, owner exclu, dédup 24h, etc.). Un 4xx
    // dans la console du visiteur donne l'impression d'un bug app.
    const response = await request.post(`/api/quiz/${QUIZ_ID}/track`, {
      data: { event: "view" },
      headers: { "Content-Type": "application/json" },
    });
    expect(response.status(), "/track doit toujours répondre 200").toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════
// /p/[slug] — landing pages publiques (sales pages générées)
// ═══════════════════════════════════════════════════════════════════

test.describe("Landing page publique /p/[slug]", () => {
  test.beforeEach(() => {
    skipIf(!PAGE_SLUG, "SMOKE_PAGE_SLUG non fourni");
  });

  test("la page se charge (200 + content visible)", async ({ page }) => {
    const response = await page.goto(`/p/${PAGE_SLUG}`, {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status(), "status HTTP /p/").toBe(200);

    const bodyText = await page.locator("body").innerText({ timeout: 5_000 });
    expect(bodyText.length, "Body vide → landing cassée").toBeGreaterThan(20);
  });

  test("headers : pas de X-Frame-Options bloquant", async ({ request }) => {
    const response = (await request.get(`/p/${PAGE_SLUG}`)) as APIResponse;
    expect(response.status()).toBe(200);
    const headers = response.headers();
    expect(
      headers["x-frame-options"],
      "X-Frame-Options posé → iframe cassée",
    ).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════
// /pq/[popquizId] — viewer popquiz (vidéo + cuepoints)
// ═══════════════════════════════════════════════════════════════════

test.describe("Popquiz public /pq/[id]", () => {
  test.beforeEach(() => {
    skipIf(!POPQUIZ_ID, "SMOKE_POPQUIZ_ID non fourni");
  });

  test("la page se charge (200 + content visible)", async ({ page }) => {
    const response = await page.goto(`/pq/${POPQUIZ_ID}`, {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status(), "status HTTP /pq/").toBe(200);

    const bodyText = await page.locator("body").innerText({ timeout: 5_000 });
    expect(bodyText.length, "Body vide → popquiz cassé").toBeGreaterThan(20);
  });

  test("headers : iframe autorisée", async ({ request }) => {
    const response = (await request.get(`/pq/${POPQUIZ_ID}`)) as APIResponse;
    expect(response.status()).toBe(200);
    const headers = response.headers();
    expect(
      headers["x-frame-options"],
      "X-Frame-Options posé sur /pq/ → embed cassé",
    ).toBeUndefined();
  });
});
