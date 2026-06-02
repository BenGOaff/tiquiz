// app/api/admin/webhook-dry-run/route.ts
//
// Endpoint READ-ONLY pour tester le routage du webhook Systeme.io
// SANS déclencher d'achat réel (Béné 2 juin 2026 — "j'ai plus de
// thune, même pas 1€ pour tester, il faut vérifier autrement").
//
// MÉCANISME : prend un payload SIO en POST (le même format que ce que
// SIO enverrait), passe par la MÊME logique d'inférence que le webhook
// de prod (lib/sio/webhookInference.ts), et retourne le résultat
// d'analyse sans rien écrire en DB.
//
// AUTH : header `X-Dry-Run-Secret` doit matcher SYSTEME_IO_WEBHOOK_SECRET.
// On réutilise le même secret que le webhook prod (déjà en place chez
// Béné, pas de nouvelle env à créer).
//
// USAGE typique (depuis le shell) :
//   curl -X POST https://quiz.tipote.com/api/admin/webhook-dry-run \
//     -H "Content-Type: application/json" \
//     -H "X-Dry-Run-Secret: $SYSTEME_IO_WEBHOOK_SECRET" \
//     -d '{ "funnel": { "url": "https://www.tipote.fr/tiquiz-mensuel-plus" } }'
//
//   → { ok: true, plan: "monthly_plus", source: "url", ... }
//
// USAGE depuis le script de test : npm run test:webhook (cf.
// scripts/test-webhook-routing.mjs).

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { inferPlanFromPayload } from "@/lib/sio/webhookInference";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WEBHOOK_SECRET = process.env.SYSTEME_IO_WEBHOOK_SECRET;

function secretMatches(received: string | null | undefined, expected: string | undefined): boolean {
  if (!received || !expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!WEBHOOK_SECRET) {
    return NextResponse.json(
      { ok: false, error: "SYSTEME_IO_WEBHOOK_SECRET non configuré côté serveur." },
      { status: 500 },
    );
  }

  const received = req.headers.get("x-dry-run-secret");
  if (!secretMatches(received, WEBHOOK_SECRET)) {
    return NextResponse.json(
      { ok: false, error: "Forbidden (X-Dry-Run-Secret invalide)" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body invalide — JSON attendu." },
      { status: 400 },
    );
  }

  const result = inferPlanFromPayload(body);

  return NextResponse.json({
    ok: true,
    dryRun: true,
    inference: result,
    note:
      result.plan === null
        ? "Aucun plan inférable — vérifie que ton payload contient une URL connue OU un offer-price-id legacy."
        : `Plan résolu : ${result.plan} (via ${result.source}). RIEN n'a été écrit en DB.`,
  });
}
