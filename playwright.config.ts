// playwright.config.ts
//
// Config E2E Tiquiz (port direct du pattern Tipote). Filet de sécurité
// sur les routes publiques critiques — pas une suite exhaustive.
//
// Lancement :
//   BASE_URL=https://quiz.tipote.com \
//   SMOKE_QUIZ_ID=<id-quiz-actif> \
//   SMOKE_PAGE_SLUG=<slug-d'une-page-active> \
//   SMOKE_POPQUIZ_ID=<id-d'un-popquiz-actif> \
//     npx playwright test
//
// Par défaut, BASE_URL = https://quiz.tipote.com (la prod actuelle). Pour
// tester en local : BASE_URL=http://localhost:3000.
//
// Pas de webServer auto-spawné : ces tests valident une instance DÉJÀ
// déployée, pas un build local éphémère.

import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "https://quiz.tipote.com";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
