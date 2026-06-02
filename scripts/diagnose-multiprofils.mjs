#!/usr/bin/env node
// scripts/diagnose-multiprofils.mjs
//
// Diagnostic DB du chantier multiprofils Tiquiz (phases 1 → 5).
// Lit la base avec service_role et vérifie les INVARIANTS qui doivent
// tenir en permanence pour que le multiprofils ne casse pas les quiz
// en ligne :
//
//   I-1. Chaque user (profiles) a AU MOINS 1 projet.
//   I-2. Chaque user a EXACTEMENT 1 projet is_default=true.
//   I-3. Tout quiz a project_id non-null (sauf quizzes anonymes
//        embed_session_id != null, voilà le seul cas autorisé).
//   I-4. Tout popquiz a project_id non-null.
//   I-5. Toute row business_events a project_id non-null.
//   I-6. Toute row user_milestones a project_id non-null.
//   I-7. Chaque projet a au plus 1 business_profile (via UNIQUE).
//   I-8. Chaque projet par défaut a un business_profile (sinon
//        merge fallback fonctionne, mais "compte neuf" est cassé).
//   I-9. Chaque quiz pointe sur un projet QUI EXISTE et appartient
//        au MÊME user (pas de cross-tenant via project_id forgé).
//  I-10. Chaque sio_api_key a un project_id non-null
//        (post-backfill 20260607).
//  I-11. Au plus 1 sio_api_key is_default=true par (user, project)
//        (partial UNIQUE INDEX one_default_per_user_project tient).
//
// Usage :
//   SUPABASE_URL=... \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//     node scripts/diagnose-multiprofils.mjs
//
// Exit code : 0 si tous les invariants tiennent, 1 sinon.
// Output : liste détaillée des anomalies (user_id, project_id, etc.).

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("ENV manquantes : SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
  process.exit(2);
}

const supa = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

let pass = 0;
let fail = 0;
const anomalies = [];

function ok(label) {
  pass += 1;
  console.log(`  ✓ ${label}`);
}
function ko(label, items = []) {
  fail += 1;
  anomalies.push({ label, items });
  console.log(`  ✗ ${label}${items.length ? ` (${items.length} cas)` : ""}`);
}

async function I1_usersHaveProjects() {
  console.log("\n[I-1] Chaque user a au moins 1 projet");
  const { data: profiles } = await supa.from("profiles").select("user_id").not("user_id", "is", null);
  const userIds = (profiles ?? []).map((p) => p.user_id);
  if (userIds.length === 0) return ok("aucun profile (DB vide)");

  const { data: projects } = await supa
    .from("projects")
    .select("user_id")
    .in("user_id", userIds);
  const owners = new Set((projects ?? []).map((p) => p.user_id));
  const missing = userIds.filter((u) => !owners.has(u));
  if (missing.length === 0) ok(`${userIds.length} users → tous ont au moins 1 projet`);
  else ko("users sans projet", missing.slice(0, 20));
}

async function I2_usersHaveExactlyOneDefault() {
  console.log("\n[I-2] Chaque user a EXACTEMENT 1 projet is_default=true");
  const { data: defaults } = await supa
    .from("projects")
    .select("user_id, id")
    .eq("is_default", true);
  const byUser = new Map();
  for (const row of defaults ?? []) {
    byUser.set(row.user_id, (byUser.get(row.user_id) ?? 0) + 1);
  }
  const multiple = [];
  for (const [user, count] of byUser) {
    if (count > 1) multiple.push({ user_id: user, count });
  }
  if (multiple.length === 0) {
    ok(`${byUser.size} users ont 1 seul is_default — UNIQUE INDEX tient`);
  } else {
    ko("users avec PLUSIEURS is_default — UNIQUE INDEX cassé", multiple);
  }
}

async function I3_quizzesHaveProjectId() {
  console.log("\n[I-3] Tout quiz authentifié a project_id non-null");
  const { data: orphans } = await supa
    .from("quizzes")
    .select("id, user_id, embed_session_id")
    .is("project_id", null)
    .not("user_id", "is", null);
  if (!orphans || orphans.length === 0) {
    ok("aucun quiz authentifié orphelin");
  } else {
    ko("quizzes avec user_id mais sans project_id", orphans.slice(0, 20));
  }
}

async function I4_popquizzesHaveProjectId() {
  console.log("\n[I-4] Tout popquiz a project_id non-null");
  try {
    const { data: orphans } = await supa
      .from("popquizzes")
      .select("id, user_id")
      .is("project_id", null);
    if (!orphans || orphans.length === 0) {
      ok("aucun popquiz orphelin");
    } else {
      ko("popquizzes sans project_id", orphans.slice(0, 20));
    }
  } catch {
    ok("table popquizzes absente — skip");
  }
}

async function I5_businessEventsHaveProjectId() {
  console.log("\n[I-5] Tout business_event a project_id non-null");
  const { count } = await supa
    .from("business_events")
    .select("id", { count: "exact", head: true })
    .is("project_id", null);
  if (!count) ok("aucun business_event orphelin");
  else ko(`${count} business_events sans project_id`);
}

async function I6_milestonesHaveProjectId() {
  console.log("\n[I-6] Tout user_milestone a project_id non-null");
  const { count } = await supa
    .from("user_milestones")
    .select("id", { count: "exact", head: true })
    .is("project_id", null);
  if (!count) ok("aucun user_milestone orphelin");
  else ko(`${count} user_milestones sans project_id`);
}

async function I7_businessProfilesUnique() {
  console.log("\n[I-7] business_profiles UNIQUE(user_id, project_id)");
  const { data: rows } = await supa
    .from("business_profiles")
    .select("user_id, project_id");
  const seen = new Map();
  const dups = [];
  for (const r of rows ?? []) {
    const key = `${r.user_id}::${r.project_id}`;
    if (seen.has(key)) dups.push(r);
    else seen.set(key, 1);
  }
  if (dups.length === 0) ok(`${seen.size} business_profiles uniques`);
  else ko("doublons business_profiles", dups.slice(0, 10));
}

async function I8_defaultProjectsHaveBusinessProfile() {
  console.log("\n[I-8] Chaque projet par défaut a un business_profile");
  const { data: defaults } = await supa
    .from("projects")
    .select("id, user_id")
    .eq("is_default", true);
  if (!defaults || defaults.length === 0) return ok("aucun projet par défaut");

  const projectIds = defaults.map((p) => p.id);
  const CHUNK = 500;
  const seen = new Set();
  for (let i = 0; i < projectIds.length; i += CHUNK) {
    const slice = projectIds.slice(i, i + CHUNK);
    const { data: bps } = await supa
      .from("business_profiles")
      .select("project_id")
      .in("project_id", slice);
    for (const bp of bps ?? []) seen.add(bp.project_id);
  }
  const missing = defaults.filter((p) => !seen.has(p.id));
  if (missing.length === 0) ok(`${defaults.length} projets par défaut → tous ont un business_profile`);
  else
    ko(
      "projets par défaut SANS business_profile (backfill 20260606 incomplet ?)",
      missing.slice(0, 20),
    );
}

async function I9_quizzesPointToOwnerProjects() {
  console.log("\n[I-9] Tout quiz pointe sur un projet du MÊME user (pas de cross-tenant)");
  const { data: quizzes } = await supa
    .from("quizzes")
    .select("id, user_id, project_id")
    .not("project_id", "is", null)
    .not("user_id", "is", null);
  if (!quizzes || quizzes.length === 0) return ok("aucun quiz scopé");

  const projectIds = [...new Set(quizzes.map((q) => q.project_id))];
  const CHUNK = 500;
  const projectOwners = new Map();
  for (let i = 0; i < projectIds.length; i += CHUNK) {
    const slice = projectIds.slice(i, i + CHUNK);
    const { data: projects } = await supa
      .from("projects")
      .select("id, user_id")
      .in("id", slice);
    for (const p of projects ?? []) projectOwners.set(p.id, p.user_id);
  }
  const mismatches = [];
  for (const q of quizzes) {
    const owner = projectOwners.get(q.project_id);
    if (owner === undefined) {
      mismatches.push({ ...q, reason: "project_id introuvable" });
    } else if (owner !== q.user_id) {
      mismatches.push({ ...q, reason: `project owned by ${owner}, quiz by ${q.user_id}` });
    }
  }
  if (mismatches.length === 0) ok(`${quizzes.length} quizzes cohérents avec leur projet`);
  else ko("CROSS-TENANT DÉTECTÉ — quizzes attachés à un projet d'un autre user", mismatches.slice(0, 10));
}

async function I10_sioApiKeysHaveProjectId() {
  console.log("\n[I-10] Tout sio_api_key a project_id non-null");
  try {
    const { count } = await supa
      .from("sio_api_keys")
      .select("id", { count: "exact", head: true })
      .is("project_id", null);
    if (!count) ok("aucune clé orpheline (backfill 20260607 OK)");
    else
      ko(
        `${count} sio_api_keys sans project_id (migration 20260607 non appliquée ou backfill incomplet)`,
      );
  } catch {
    ok("table sio_api_keys absente — skip");
  }
}

async function I11_sioApiKeysOneDefaultPerProject() {
  console.log("\n[I-11] Au plus 1 sio_api_key is_default=true par (user, project)");
  try {
    const { data: defaults } = await supa
      .from("sio_api_keys")
      .select("user_id, project_id")
      .eq("is_default", true);
    const counts = new Map();
    for (const r of defaults ?? []) {
      const key = `${r.user_id}::${r.project_id ?? "null"}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const multiple = [];
    for (const [key, count] of counts) {
      if (count > 1) {
        const [user_id, project_id] = key.split("::");
        multiple.push({ user_id, project_id, count });
      }
    }
    if (multiple.length === 0) {
      ok(`${counts.size} (user, project) ont au plus 1 default — INDEX UNIQUE tient`);
    } else {
      ko(
        "PLUSIEURS sio_api_keys is_default=true par (user, project) — INDEX cassé",
        multiple,
      );
    }
  } catch {
    ok("table sio_api_keys absente — skip");
  }
}

async function main() {
  console.log(`▶ Diagnostic multiprofils Tiquiz (${SUPABASE_URL})`);
  await I1_usersHaveProjects();
  await I2_usersHaveExactlyOneDefault();
  await I3_quizzesHaveProjectId();
  await I4_popquizzesHaveProjectId();
  await I5_businessEventsHaveProjectId();
  await I6_milestonesHaveProjectId();
  await I7_businessProfilesUnique();
  await I8_defaultProjectsHaveBusinessProfile();
  await I9_quizzesPointToOwnerProjects();
  await I10_sioApiKeysHaveProjectId();
  await I11_sioApiKeysOneDefaultPerProject();

  console.log("\n────────────────────────");
  console.log(`Résultat : ${pass} ✓ / ${fail} ✗`);
  if (fail > 0) {
    console.log("\nDétail des anomalies :");
    for (const a of anomalies) {
      console.log(`  • ${a.label}`);
      for (const item of a.items.slice(0, 5)) {
        console.log("      " + JSON.stringify(item));
      }
      if (a.items.length > 5) console.log(`      … (+${a.items.length - 5} autres)`);
    }
    process.exit(1);
  }
  console.log("Tous les invariants tiennent.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Erreur fatale :", e);
  process.exit(2);
});
