#!/usr/bin/env node
// scripts/test-webhook-routing.mjs
//
// Suite de tests POUR le routage webhook Systeme.io (Béné 2 juin 2026 :
// "j'ai plus de thune, même pas 1€ pour tester"). Au lieu de déclencher
// des achats SIO réels, on POST des payloads simulés contre l'endpoint
// admin dry-run (/api/admin/webhook-dry-run) qui passe par la MÊME
// logique que le webhook prod — sans rien écrire en DB.
//
// 28 cas testés couvrant :
//   - Les 5 URLs Tipote.fr (gratuit / mensuel / annuel / mensuel-plus / annuel-plus)
//   - Variations courantes (https://, www., trailing slash, query string, casse)
//   - Anciens offer-price-id (legacy : 3198235, 3198261, 3198280)
//   - Payloads SIO realistes (data.funnel.url, order.source_url, etc.)
//   - Cas négatifs (URL inconnue, payload vide → plan=null attendu)
//
// USAGE :
//   BASE_URL=https://quiz.tipote.com \
//   SYSTEME_IO_WEBHOOK_SECRET=... \
//     node scripts/test-webhook-routing.mjs
//
// Local :
//   BASE_URL=http://localhost:3000 ... node scripts/test-webhook-routing.mjs
//
// Exit 0 si tout passe, 1 sinon.

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const SECRET = process.env.SYSTEME_IO_WEBHOOK_SECRET;

if (!SECRET) {
  console.error("ENV manquante : SYSTEME_IO_WEBHOOK_SECRET");
  console.error("  → la trouve dans .env / .env.local côté Tiquiz (la même que le webhook prod).");
  process.exit(2);
}

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

async function dryRun(payload) {
  const res = await fetch(BASE_URL + "/api/admin/webhook-dry-run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Dry-Run-Secret": SECRET,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    return { httpError: res.status, body: await res.text().catch(() => null) };
  }
  return await res.json();
}

async function expectPlan(label, payload, expected) {
  const out = await dryRun(payload);
  if (out.httpError) {
    ko(label, `HTTP ${out.httpError} ${out.body?.slice(0, 100) ?? ""}`);
    return;
  }
  const got = out.inference?.plan ?? null;
  if (got === expected) {
    const src = out.inference?.source;
    ok(`${label} → ${got ?? "null"} (via ${src})`);
  } else {
    ko(label, `attendu=${expected ?? "null"} got=${got ?? "null"} (source=${out.inference?.source})`);
  }
}

const TESTS = [
  // ── 5 URLs canoniques ────────────────────────────────────────────
  {
    label: "URL canonique mensuel+ (funnel.url)",
    payload: { funnel: { url: "https://www.tipote.fr/tiquiz-mensuel-plus" } },
    expected: "monthly_plus",
  },
  {
    label: "URL canonique annuel+ (funnel.url)",
    payload: { funnel: { url: "https://www.tipote.fr/tiquiz-annuel-plus" } },
    expected: "yearly_plus",
  },
  {
    label: "URL canonique mensuel (funnel.url)",
    payload: { funnel: { url: "https://www.tipote.fr/tiquiz-mensuel" } },
    expected: "monthly",
  },
  {
    label: "URL canonique annuel (funnel.url)",
    payload: { funnel: { url: "https://www.tipote.fr/tiquiz-annuel" } },
    expected: "yearly",
  },
  {
    label: "URL canonique gratuit (funnel.url)",
    payload: { funnel: { url: "https://www.tipote.fr/tiquiz-gratuit" } },
    expected: "free",
  },

  // ── Variations de format URL ─────────────────────────────────────
  {
    label: "URL sans www (mensuel+)",
    payload: { funnel: { url: "https://tipote.fr/tiquiz-mensuel-plus" } },
    expected: "monthly_plus",
  },
  {
    label: "URL http au lieu de https",
    payload: { funnel: { url: "http://www.tipote.fr/tiquiz-mensuel-plus" } },
    expected: "monthly_plus",
  },
  {
    label: "URL avec trailing slash",
    payload: { funnel: { url: "https://www.tipote.fr/tiquiz-mensuel-plus/" } },
    expected: "monthly_plus",
  },
  {
    label: "URL avec query string UTM",
    payload: {
      funnel: { url: "https://www.tipote.fr/tiquiz-mensuel-plus?utm_source=ig&utm_campaign=lancement" },
    },
    expected: "monthly_plus",
  },
  {
    label: "URL avec fragment",
    payload: { funnel: { url: "https://www.tipote.fr/tiquiz-annuel-plus#offre" } },
    expected: "yearly_plus",
  },
  {
    label: "URL en uppercase",
    payload: { funnel: { url: "HTTPS://WWW.TIPOTE.FR/TIQUIZ-MENSUEL-PLUS" } },
    expected: "monthly_plus",
  },

  // ── Paths alternatifs dans le payload ────────────────────────────
  {
    label: "Path data.funnel.url",
    payload: { data: { funnel: { url: "https://www.tipote.fr/tiquiz-mensuel-plus" } } },
    expected: "monthly_plus",
  },
  {
    label: "Path funnel_step.url",
    payload: { funnel_step: { url: "https://www.tipote.fr/tiquiz-annuel-plus" } },
    expected: "yearly_plus",
  },
  {
    label: "Path data.funnel_step.url",
    payload: { data: { funnel_step: { url: "https://www.tipote.fr/tiquiz-mensuel-plus" } } },
    expected: "monthly_plus",
  },
  {
    label: "Path order.source_url",
    payload: { order: { source_url: "https://www.tipote.fr/tiquiz-mensuel-plus" } },
    expected: "monthly_plus",
  },
  {
    label: "Path checkout_url",
    payload: { checkout_url: "https://www.tipote.fr/tiquiz-annuel-plus" },
    expected: "yearly_plus",
  },
  {
    label: "Path data.order.checkout_url",
    payload: { data: { order: { checkout_url: "https://www.tipote.fr/tiquiz-mensuel-plus" } } },
    expected: "monthly_plus",
  },

  // ── Différence mensuel vs mensuel+ (anti-régression) ─────────────
  {
    label: "Anti-confusion : tiquiz-mensuel ≠ tiquiz-mensuel-plus",
    payload: { funnel: { url: "https://www.tipote.fr/tiquiz-mensuel" } },
    expected: "monthly",
  },
  {
    label: "Anti-confusion : tiquiz-annuel ≠ tiquiz-annuel-plus",
    payload: { funnel: { url: "https://www.tipote.fr/tiquiz-annuel" } },
    expected: "yearly",
  },

  // ── Legacy offer-price-id (anciens bons de commande uniques) ─────
  {
    label: "Legacy ID mensuel 9€ (pricePlan.id=3198235)",
    payload: { pricePlan: { id: "offer-price-3198235" } },
    expected: "monthly",
  },
  {
    label: "Legacy ID annuel 90€ (3198261)",
    payload: { pricePlan: { id: "3198261" } },
    expected: "yearly",
  },
  {
    label: "Legacy ID lifetime 57€ (offer-price-3198280)",
    payload: { data: { pricePlan: { id: "offer-price-3198280" } } },
    expected: "lifetime",
  },

  // ── Priorité : URL > offer-id ────────────────────────────────────
  {
    label: "Priorité URL > offerId quand les 2 sont présents",
    payload: {
      funnel: { url: "https://www.tipote.fr/tiquiz-annuel-plus" },
      pricePlan: { id: "offer-price-3198235" }, // dirait "monthly" si on prenait l'ID
    },
    expected: "yearly_plus",
  },

  // ── Payload SIO ambigu (offerprice-dc9c3e75 partagé) ────────────
  {
    label: "Nouveau ID partagé + URL mensuel+ → monthly_plus via URL",
    payload: {
      pricePlan: { id: "offerprice-dc9c3e75" },
      funnel: { url: "https://www.tipote.fr/tiquiz-mensuel-plus" },
    },
    expected: "monthly_plus",
  },
  {
    label: "Nouveau ID partagé + URL annuel+ → yearly_plus via URL",
    payload: {
      pricePlan: { id: "offerprice-dc9c3e75" },
      funnel: { url: "https://www.tipote.fr/tiquiz-annuel-plus" },
    },
    expected: "yearly_plus",
  },

  // ── Cas négatifs (plan attendu = null) ───────────────────────────
  {
    label: "Payload vide → plan null",
    payload: {},
    expected: null,
  },
  {
    label: "URL inconnue → plan null",
    payload: { funnel: { url: "https://www.tipote.fr/quelque-chose-dautre" } },
    expected: null,
  },
  {
    label: "Offer-id inconnu sans URL → plan null",
    payload: { pricePlan: { id: "offerprice-dc9c3e75" } },
    expected: null,
  },
];

async function main() {
  console.log(`▶ Test routage webhook Tiquiz contre ${BASE_URL}`);
  console.log(`  ${TESTS.length} cas à vérifier (aucun achat réel, juste l'inférence)\n`);

  for (const t of TESTS) {
    await expectPlan(t.label, t.payload, t.expected);
  }

  console.log("\n────────────────────────");
  console.log(`Résultat : ${pass} ✓ / ${fail} ✗`);
  if (fail > 0) {
    console.log("\nÉchecs :");
    for (const f of failures) console.log("  - " + f);
    process.exit(1);
  }
  console.log("Routage webhook validé. Le code est prêt à recevoir les vrais achats SIO.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Erreur fatale :", e);
  process.exit(2);
});
