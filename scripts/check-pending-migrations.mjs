#!/usr/bin/env node
// scripts/check-pending-migrations.mjs (L'Atelier du Quiz)
//
// Detecte AUTOMATIQUEMENT les migrations Supabase non appliquees en lisant
// TOUS les .sql de supabase/migrations/ et en testant l'existence des
// tables / colonnes qu'ils declarent, via l'API REST (PostgREST).
//
// Robuste sur Node 20 : pas de supabase-js (qui exige WebSocket), juste
// fetch. Charge aussi le .env tout seul, donc PAS besoin de `set -a; . .env`.
//
// Usage (sur le serveur) :
//   cd ~/quizing && npm run check:migrations-pending
//
// Exit : 0 si tout est applique, 1 si au moins 1 migration en retard.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");

// ── Chargement best-effort du .env (sans l'executer, donc pas de bug de
//    caractere special comme avec `. .env`). On ne surcharge pas une var
//    deja presente dans l'environnement.
function loadDotenv() {
  for (const name of [".env", ".env.local"]) {
    const p = join(ROOT, name);
    if (!existsSync(p)) continue;
    const content = readFileSync(p, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const m = line.match(/^(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/i);
      if (!m) continue;
      let val = m[2];
      // Retire des guillemets entourants eventuels.
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[m[1]] === undefined) process.env[m[1]] = val;
    }
  }
}
loadDotenv();

const SUPABASE_URL = (
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_PROJECT_URL ??
  ""
).replace(/\/$/, "");
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE ??
  process.env.SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("ENV manquantes : NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (cherchees dans .env)");
  process.exit(2);
}

const HEADERS = { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` };

async function probe(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, { headers: HEADERS });
  const text = await res.text().catch(() => "");
  return { status: res.status, text };
}

function isMissingTable(r) {
  return r.status === 404 || /PGRST205|could not find the table|relation .* does not exist/i.test(r.text);
}
function isMissingColumn(r) {
  return /PGRST204|42703|column .* does not exist|could not find the .* column/i.test(r.text);
}

async function tableExists(table) {
  const r = await probe(`${table}?select=*&limit=1`);
  if (r.status === 200 || r.status === 206) return { exists: true };
  if (isMissingTable(r)) return { exists: false, reason: r.text.slice(0, 160) };
  return { exists: true, warning: `${r.status} ${r.text.slice(0, 120)}` };
}

async function columnExists(table, col) {
  const r = await probe(`${table}?select=${encodeURIComponent(col)}&limit=1`);
  if (r.status === 200 || r.status === 206) return { exists: true };
  if (isMissingTable(r)) return { exists: false, reason: `TABLE ABSENTE` };
  if (isMissingColumn(r)) return { exists: false, reason: r.text.slice(0, 160) };
  return { exists: true, warning: `${r.status} ${r.text.slice(0, 120)}` };
}

function parseSql(sql) {
  const stripped = sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*--.*$/gm, "");
  const tables = new Set();
  const columnsByTable = new Map();

  const createRe = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?["']?(\w+)["']?/gi;
  for (const m of stripped.matchAll(createRe)) tables.add(m[1].toLowerCase());

  const alterBlockRe = /alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:public\.)?["']?(\w+)["']?([\s\S]*?);/gi;
  for (const m of stripped.matchAll(alterBlockRe)) {
    const table = m[1].toLowerCase();
    const addColRe = /\badd\s+(?:column\s+)?(?:if\s+not\s+exists\s+)?["']?(\w+)["']?/gi;
    for (const c of m[2].matchAll(addColRe)) {
      const col = c[1].toLowerCase();
      if (["constraint", "primary", "foreign", "unique", "check", "index"].includes(col)) continue;
      if (!columnsByTable.has(table)) columnsByTable.set(table, new Set());
      columnsByTable.get(table).add(col);
    }
  }
  return { tables, columnsByTable };
}

async function main() {
  console.log(`> check:migrations-pending L'Atelier du Quiz (${SUPABASE_URL})`);
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  console.log(`  ${files.length} fichiers .sql a scanner`);

  let totalChecks = 0;
  let totalFails = 0;
  const failedMigrations = [];

  for (const file of files) {
    const { tables, columnsByTable } = parseSql(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
    if (tables.size === 0 && columnsByTable.size === 0) continue;

    const fails = [];
    for (const t of tables) {
      totalChecks += 1;
      const r = await tableExists(t);
      if (!r.exists) fails.push(`TABLE ${t} ABSENTE : ${r.reason}`);
    }
    for (const [t, cols] of columnsByTable) {
      for (const c of cols) {
        totalChecks += 1;
        const r = await columnExists(t, c);
        if (!r.exists) fails.push(`${t}.${c} ABSENT : ${r.reason}`);
      }
    }

    if (fails.length > 0) {
      totalFails += fails.length;
      failedMigrations.push({ file, fails });
      console.log(`\nX ${file}`);
      for (const f of fails) console.log(`    ${f}`);
    } else {
      console.log(`OK ${file}`);
    }
  }

  console.log("\n------------------------");
  console.log(`Resultat : ${totalChecks - totalFails} ok / ${totalFails} manquants sur ${totalChecks} checks (${files.length} fichiers)`);

  if (failedMigrations.length > 0) {
    console.log("\n🚨 MIGRATIONS A APPLIQUER SUR SUPABASE (L'Atelier du Quiz) :");
    for (const m of failedMigrations) console.log(`  - supabase/migrations/${m.file}`);
    console.log("\nStudio L'Atelier du Quiz -> SQL Editor -> coller chaque fichier -> Run, puis relancer ce script.");
    process.exit(1);
  }
  console.log("Toutes les migrations detectables sont appliquees. ok");
  process.exit(0);
}

main().catch((e) => {
  console.error("Erreur fatale :", e);
  process.exit(2);
});
