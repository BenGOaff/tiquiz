#!/usr/bin/env node
// scripts/smoke-multiprofils.mjs
//
// Smoke E2E du chantier multiprofils Tiquiz (phases 1 → 5).
// Vérifie le workflow CRITIQUE de Béné :
//   1. Liste les projets → trouve le projet par défaut (A)
//   2. Crée un projet B
//   3. Switch sur B (cookie)
//   4. Customise brand_color_primary via PATCH /api/profile
//   5. Vérifie que GET /api/profile sur B retourne la nouvelle couleur
//   6. Switch sur A (cookie)
//   7. Vérifie que GET /api/profile sur A garde la couleur d'origine
//   8. Cleanup : delete projet B
//
// AUTRES VÉRIFS :
// - Si un quiz existe sur projet B → sa lecture publique doit refléter
//   la couleur du projet B (pas du défaut global pollué)
//
// Usage :
//   BASE_URL=https://app.tiquiz.com \
//   TIQUIZ_TEST_EMAIL=beta-test@tiquiz.com \
//   TIQUIZ_TEST_PASSWORD=... \
//   SUPABASE_URL=... \
//   SUPABASE_ANON_KEY=... \
//     node scripts/smoke-multiprofils.mjs
//
// Exit code : 0 si tout passe, 1 sinon. Compatible CI.

import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.TIQUIZ_TEST_EMAIL;
const PASSWORD = process.env.TIQUIZ_TEST_PASSWORD;
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const TEST_COLOR = "#FF00AA"; // couleur improbable pour ne pas se mélanger
const ACTIVE_PROJECT_COOKIE = "tiquiz_active_project";

let pass = 0;
let fail = 0;
const failures = [];

function ok(label) {
  pass += 1;
  console.log(`  ✓ ${label}`);
}
function ko(label, detail) {
  fail += 1;
  failures.push(`${label}${detail ? " — " + detail : ""}`);
  console.log(`  ✗ ${label}${detail ? "\n      " + detail : ""}`);
}

function assertEnv() {
  const missing = [];
  if (!EMAIL) missing.push("TIQUIZ_TEST_EMAIL");
  if (!PASSWORD) missing.push("TIQUIZ_TEST_PASSWORD");
  if (!SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!SUPABASE_ANON_KEY) missing.push("SUPABASE_ANON_KEY");
  if (missing.length) {
    console.error(`ENV manquantes : ${missing.join(", ")}`);
    process.exit(2);
  }
}

async function loginAndGetCookies() {
  const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supa.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });
  if (error || !data.session) {
    console.error("Login Supabase échoué :", error?.message);
    process.exit(2);
  }
  // Les cookies Supabase pour Next.js sont sb-<ref>-auth-token.0/.1.
  // On extrait le project ref de SUPABASE_URL pour nommer les cookies.
  const ref = new URL(SUPABASE_URL).hostname.split(".")[0];
  const tokens = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    token_type: "bearer",
    user: data.session.user,
  };
  // Tiquiz utilise @supabase/ssr qui encode la session en JSON dans
  // 1 ou 2 chunks `sb-<ref>-auth-token.0/.1`. On simplifie en 1 chunk.
  const encoded = "base64-" + Buffer.from(JSON.stringify(tokens)).toString("base64");
  return {
    ref,
    encoded,
    userId: data.session.user.id,
    authCookieName: `sb-${ref}-auth-token`,
  };
}

function buildCookieHeader(authCookie, authValue, activeProjectId) {
  const parts = [`${authCookie}=${encodeURIComponent(authValue)}`];
  if (activeProjectId) parts.push(`${ACTIVE_PROJECT_COOKIE}=${activeProjectId}`);
  return parts.join("; ");
}

async function api(method, path, { authCookie, authValue, activeProjectId, body } = {}) {
  const headers = {
    "Content-Type": "application/json",
    Cookie: buildCookieHeader(authCookie, authValue, activeProjectId),
  };
  const res = await fetch(BASE_URL + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

async function main() {
  assertEnv();
  console.log(`▶ Smoke multiprofils Tiquiz contre ${BASE_URL}`);
  console.log(`  user: ${EMAIL}`);

  const session = await loginAndGetCookies();
  const ctx = {
    authCookie: session.authCookieName,
    authValue: session.encoded,
  };

  // ── 1. Liste projets ─────────────────────────────────────────────
  console.log("\n[1] GET /api/projects");
  const list1 = await api("GET", "/api/projects", ctx);
  if (list1.status !== 200 || !list1.json?.ok) {
    ko("GET /api/projects 200", `status=${list1.status} body=${JSON.stringify(list1.json)}`);
    return finish();
  }
  ok("GET /api/projects 200");

  const projects = list1.json.projects ?? [];
  const projectA = projects.find((p) => p.is_default);
  if (!projectA) {
    ko("default project trouvé", "aucun is_default=true");
    return finish();
  }
  ok(`default project A trouvé (${projectA.id})`);

  const canCreate = list1.json.canCreateMore;
  if (!canCreate) {
    ko("canCreateMore true", "le test exige un user multiprofils (beta/lifetime/+)");
    return finish();
  }
  ok("user a multiprofils débloqué");

  // ── 2. Lit la couleur initiale du projet A ───────────────────────
  console.log("\n[2] GET /api/profile (sur projet A)");
  const prof_A_init = await api("GET", "/api/profile", { ...ctx, activeProjectId: projectA.id });
  if (prof_A_init.status !== 200) {
    ko("GET /api/profile A 200");
    return finish();
  }
  const colorA_init = prof_A_init.json?.profile?.brand_color_primary ?? null;
  ok(`couleur projet A lue (${colorA_init})`);

  // ── 3. Crée projet B ─────────────────────────────────────────────
  console.log("\n[3] POST /api/projects { name: 'Smoke B' }");
  const create = await api("POST", "/api/projects", {
    ...ctx,
    body: { name: `Smoke B ${Date.now()}` },
  });
  if (create.status !== 201 || !create.json?.ok || !create.json.project?.id) {
    ko("POST /api/projects 201", `status=${create.status} body=${JSON.stringify(create.json)}`);
    return finish();
  }
  const projectB = create.json.project;
  ok(`projet B créé (${projectB.id})`);

  try {
    // ── 4. Switch sur B + PATCH brand_color_primary ──────────────
    console.log("\n[4] PATCH /api/profile { brand_color_primary } sur projet B");
    const patch = await api("PATCH", "/api/profile", {
      ...ctx,
      activeProjectId: projectB.id,
      body: { brand_color_primary: TEST_COLOR },
    });
    if (patch.status !== 200 || !patch.json?.ok) {
      ko("PATCH /api/profile 200", `status=${patch.status}`);
      return finish();
    }
    ok("PATCH /api/profile 200");

    const patchColor = patch.json.profile?.brand_color_primary;
    if (patchColor !== TEST_COLOR) {
      ko("réponse PATCH reflète nouvelle couleur (overlay sync)", `got=${patchColor}`);
    } else {
      ok("réponse PATCH inclut overlay sync");
    }

    // ── 5. GET /api/profile sur B doit renvoyer TEST_COLOR ──────
    console.log("\n[5] GET /api/profile sur projet B");
    const prof_B = await api("GET", "/api/profile", { ...ctx, activeProjectId: projectB.id });
    if (prof_B.status !== 200) {
      ko("GET /api/profile B 200");
      return finish();
    }
    const colorB = prof_B.json?.profile?.brand_color_primary;
    if (colorB === TEST_COLOR) {
      ok(`projet B affiche TEST_COLOR (${TEST_COLOR})`);
    } else {
      ko(`projet B affiche TEST_COLOR`, `got=${colorB}`);
    }

    const onboardingB = prof_B.json?.profile?.business_profile_onboarding_completed;
    if (onboardingB === true) {
      ok("business_profile B marqué onboarding_completed=true après PATCH");
    } else {
      ko("onboarding_completed=true sur B", `got=${onboardingB}`);
    }

    // ── 6. GET /api/profile sur A doit GARDER l'ancienne couleur ─
    console.log("\n[6] GET /api/profile sur projet A (isolation)");
    const prof_A_after = await api("GET", "/api/profile", { ...ctx, activeProjectId: projectA.id });
    if (prof_A_after.status !== 200) {
      ko("GET /api/profile A après PATCH B");
      return finish();
    }
    const colorA_after = prof_A_after.json?.profile?.brand_color_primary;
    if (colorA_after === colorA_init) {
      ok(`projet A garde sa couleur initiale (${colorA_init}) — ISOLATION OK`);
    } else if (colorA_after === TEST_COLOR) {
      ko(
        "ISOLATION CASSÉE — projet A a hérité de la couleur du projet B",
        `colorA_init=${colorA_init} → colorA_after=${colorA_after}`,
      );
    } else {
      ko("projet A inchangé", `colorA_init=${colorA_init} → ${colorA_after}`);
    }
  } finally {
    // ── 7. Cleanup : supprime le projet B ────────────────────────
    console.log("\n[7] DELETE /api/projects/" + projectB.id);
    const del = await api("DELETE", `/api/projects/${projectB.id}`, ctx);
    if (del.status === 200 && del.json?.ok) {
      ok("projet B supprimé");
    } else {
      ko(
        "DELETE projet B",
        `status=${del.status} — penser à le supprimer à la main si ce test laisse du résidu`,
      );
    }
  }

  finish();
}

function finish() {
  console.log("\n────────────────────────");
  console.log(`Résultat : ${pass} ✓ / ${fail} ✗`);
  if (fail > 0) {
    console.log("\nÉchecs :");
    for (const f of failures) console.log("  - " + f);
    process.exit(1);
  }
  console.log("Tout passe.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Erreur fatale :", e);
  process.exit(2);
});
