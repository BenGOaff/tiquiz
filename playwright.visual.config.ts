// playwright.visual.config.ts
//
// Tests VISUELS de non-regression du quiz public (distincts des smoke E2E de
// playwright.config.ts qui valident une instance deployee). Ici on demarre un
// serveur local avec la page fixture /visual-test (quiz de demo en dur, aucune
// base requise) et on compare des captures d'ecran a des references commitees.
//
// Pourquoi : retours Bene/Veronique, des casses de layout (footer en 3e
// colonne en split, carte collee en haut sur ecrans hauts) invisibles sans
// rendu reel. Ce filet les attrape AVANT deploiement.
//
//   npm run test:visual          -> compare aux references (a lancer avant deploy)
//   npm run test:visual:update   -> re-genere les references (changement VOULU)
import { defineConfig, devices } from "@playwright/test";

const PORT = 4123;

export default defineConfig({
  testDir: "./tests/visual",
  timeout: 60_000,
  fullyParallel: true,
  // 1 retry : les captures peuvent flaker d'un chouia (timing d'anim,
  // police) ; un vrai casse de layout echoue aussi au retry.
  retries: 1,
  reporter: [["list"]],
  expect: {
    toHaveScreenshot: {
      // Tolerance anti-flakiness (anti-aliasing des polices) sans laisser
      // passer un vrai casse de layout.
      maxDiffPixelRatio: 0.02,
    },
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    contextOptions: { reducedMotion: "reduce" },
    screenshot: "off",
    trace: "off",
    // Chromium systeme si present (env Claude Code : /opt/pw-browsers/chromium,
    // version differente de celle attendue par @playwright/test). En local,
    // poser PW_CHROMIUM_PATH ou laisser playwright utiliser son navigateur.
    ...(process.env.PW_CHROMIUM_PATH || require("fs").existsSync("/opt/pw-browsers/chromium")
      ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" } }
      : {}),
  },
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: `http://localhost:${PORT}/visual-test?layout=centered`,
    timeout: 240_000,
    reuseExistingServer: true,
    env: {
      VISUAL_TEST: "1",
      // Envs factices : la page fixture ne touche jamais la base ; le
      // middleware est fail-open sur erreur Supabase.
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://dummy.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "dummy-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "dummy-service-role",
    },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    // Ecran haut : le cas Veronique (ratio non 16:9).
    { name: "tall", use: { ...devices["Desktop Chrome"], viewport: { width: 1200, height: 1600 } } },
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
  ],
});
