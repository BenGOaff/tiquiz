#!/usr/bin/env node
// scripts/check-schema.mjs
//
// Détecte les migrations Tiquiz "en retard" en prod en vérifiant que
// chaque table/colonne attendue EXISTE réellement dans la DB. Né de
// la panne 2 juin 2026 matin (quizzes.survey_thanks_heading manquait
// → tous les quiz publics ont retourné 404 jusqu'à ce que Béné applique
// manuellement la migration).
//
// Mécanisme : pour chaque colonne attendue, on tente un SELECT qui
// l'utilise explicitement. Si Supabase renvoie l'erreur PGRST204
// (column does not exist), on note la migration en retard.
//
// Le script NE TENTE PAS d'appliquer les migrations — c'est un check
// READ-ONLY. À lancer après chaque déploiement, avant de pousser du
// nouveau code qui dépend de ces colonnes.
//
// Usage :
//   SUPABASE_URL=... \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//     node scripts/check-schema.mjs
//
// Exit code : 0 si tout existe, 1 si une migration est en retard.

import { createClient } from "@supabase/supabase-js";

// Tolère plusieurs noms de variables (env varie selon repo).
const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_PROJECT_URL;
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE ??
  process.env.SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("ENV manquantes pour check:schema.\n");
  if (!SUPABASE_URL) {
    console.error("URL Supabase introuvable. Variantes cherchées :");
    console.error("  SUPABASE_URL  |  NEXT_PUBLIC_SUPABASE_URL  |  SUPABASE_PROJECT_URL");
  }
  if (!SERVICE_ROLE_KEY) {
    console.error("Service-role key introuvable. Variantes cherchées :");
    console.error("  SUPABASE_SERVICE_ROLE_KEY  |  SUPABASE_SERVICE_ROLE");
    console.error("  SERVICE_ROLE_KEY  |  SUPABASE_SECRET_KEY");
  }
  const supaVars = Object.keys(process.env)
    .filter((k) => /SUPABASE|SERVICE_ROLE/i.test(k))
    .sort();
  if (supaVars.length > 0) {
    console.error("\nVariables présentes dans l'env qui matchent SUPABASE/SERVICE_ROLE :");
    for (const k of supaVars) console.error(`  - ${k}`);
  } else {
    console.error("\nAucune variable SUPABASE* dans l'env — as-tu bien fait `set -a; . .env.local; set +a` ?");
  }
  process.exit(2);
}

const supa = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

let pass = 0;
let fail = 0;
const missing = [];

function ok(label) {
  pass += 1;
  console.log(`  ✓ ${label}`);
}
function ko(label, detail) {
  fail += 1;
  missing.push(`${label} — ${detail}`);
  console.log(`  ✗ ${label} — ${detail}`);
}

/**
 * Liste des structures DB attendues. Une entrée par migration récente
 * qui ajoute du SQL côté schéma. À chaque nouvelle migration, ajouter
 * ici les colonnes/tables qu'elle crée.
 *
 * Format : { migration: filename, table: name, columns: string[] }
 */
const EXPECTED = [
  // ── Multiprofils foundation (juin 2026) ─────────────────────────
  {
    migration: "20260603_multiprofils_foundation",
    table: "projects",
    columns: ["id", "user_id", "name", "is_default", "created_at", "updated_at"],
  },
  {
    migration: "20260603_multiprofils_foundation",
    table: "quizzes",
    columns: ["project_id"],
  },
  {
    migration: "20260603_multiprofils_foundation",
    table: "business_events",
    columns: ["project_id"],
  },
  {
    migration: "20260603_multiprofils_foundation",
    table: "user_milestones",
    columns: ["project_id"],
  },
  // popquizzes : la table peut ne pas exister sur tous les déploiements,
  // donc on skip le check colonne (la migration elle-même la garde sous
  // DO $ block conditionnel)

  // ── Survey thanks (panne 2 juin matin) ──────────────────────────
  {
    migration: "20260603_quizzes_survey_thanks",
    table: "quizzes",
    columns: ["survey_thanks_heading", "survey_thanks_body"],
  },

  // ── Survey AI analysis (juin 2026) ──────────────────────────────
  {
    migration: "20260605_survey_ai_analysis",
    table: "quizzes",
    columns: ["survey_ai_analysis", "survey_ai_analysis_at"],
  },

  // ── Project visual identity (alignement Tipote) ─────────────────
  {
    migration: "20260605_project_visual_identity",
    table: "projects",
    columns: ["accent_color", "icon_emoji", "use_branding_logo"],
  },

  // ── Business profiles per-project (phase 4 multiprofils) ────────
  {
    migration: "20260606_business_profiles_per_project",
    table: "business_profiles",
    columns: [
      "id",
      "user_id",
      "project_id",
      "onboarding_completed",
      "brand_logo_url",
      "brand_color_primary",
      "brand_color_accent",
      "brand_font",
      "brand_website_url",
      "saved_palettes",
      "brand_tone",
      "target_audience",
      "default_meta_pixel_id",
      "default_ga4_measurement_id",
      "default_google_ads_conversion_id",
      "default_google_ads_conversion_label",
      "default_meta_capi_token",
      "default_share_domain",
      "share_site_name",
    ],
  },

  // ── sio_api_keys per-project (phase 6 multiprofils) ─────────────
  {
    migration: "20260607_sio_api_keys_per_project",
    table: "sio_api_keys",
    columns: ["project_id"],
  },
];

/**
 * Vérifie qu'un SELECT explicite sur cette liste de colonnes ne renvoie
 * pas PGRST204 (column does not exist). On limite à 1 row pour minimiser
 * le coût même sur les grosses tables.
 */
async function checkTableColumns(migration, table, columns) {
  const label = `[${migration}] ${table} (${columns.length} col)`;
  try {
    const { error } = await supa.from(table).select(columns.join(",")).limit(1);
    if (error) {
      // PGRST204 = column not found, PGRST205 = table not found
      if (error.code === "PGRST204" || /column.*does not exist/i.test(error.message)) {
        ko(label, `MIGRATION EN RETARD : ${error.message}`);
        return;
      }
      if (error.code === "PGRST205" || /relation.*does not exist/i.test(error.message)) {
        ko(label, `TABLE ABSENTE : ${error.message}`);
        return;
      }
      // Autre erreur (RLS, etc.) : on n'est pas sûr si c'est lié au schéma
      ko(label, `erreur DB inattendue : ${error.code} ${error.message}`);
      return;
    }
    ok(label);
  } catch (e) {
    ko(label, `exception : ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function main() {
  console.log(`▶ Check schema Tiquiz (${SUPABASE_URL})`);
  console.log(`  ${EXPECTED.length} migrations à vérifier`);

  // Grouper par migration pour affichage plus clair
  const byMigration = new Map();
  for (const e of EXPECTED) {
    if (!byMigration.has(e.migration)) byMigration.set(e.migration, []);
    byMigration.get(e.migration).push(e);
  }

  for (const [migration, entries] of byMigration) {
    console.log(`\n● ${migration}`);
    for (const e of entries) {
      await checkTableColumns(e.migration, e.table, e.columns);
    }
  }

  console.log("\n────────────────────────");
  console.log(`Résultat : ${pass} ✓ / ${fail} ✗`);
  if (fail > 0) {
    console.log("\nMIGRATIONS EN RETARD :");
    for (const m of missing) console.log("  - " + m);
    console.log("\nApplique-les manuellement sur Supabase Studio :");
    console.log("  https://supabase.com/dashboard → SQL Editor → coller le contenu");
    console.log("  des fichiers .sql concernés dans supabase/migrations/.");
    process.exit(1);
  }
  console.log("Toutes les migrations attendues sont appliquées.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Erreur fatale :", e);
  process.exit(2);
});
