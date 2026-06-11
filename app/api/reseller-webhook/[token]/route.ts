// app/api/reseller-webhook/[token]/route.ts
//
// Webhook entrant GÉNÉRIQUE d'un revendeur (phase 3, Béné 11 juin 2026) :
// provisioning automatique de SES clients depuis SON outil de paiement.
//
//   POST https://quiz.tipote.com/api/reseller-webhook/<token>?plan=monthly&action=activate
//   POST https://quiz.tipote.com/api/reseller-webhook/<token>?action=cancel
//
// - token  : secret unique du revendeur (resellers.webhook_token),
//            rotation possible depuis son panel.
// - plan   : free | monthly | yearly | monthly_plus | yearly_plus
//            (obligatoire pour activate, ignoré pour cancel).
// - action : activate (défaut) | cancel. "upgrade"/"downgrade" sont des
//            alias d'activate (même flux : on pose le plan demandé).
//
// Le payload POST doit simplement contenir l'email de l'acheteur. On
// supporte les formats Systeme.io, Stripe, PayPal et tout JSON via une
// extraction tolérante (chemins connus + scan récursif).
//
// Convention maison : réponse 200 TOUJOURS une fois le token validé
// ({ok:false, reason} en soft fail) pour éviter les tempêtes de retry
// des providers. Token inconnu = 404 (l'endpoint n'existe pas).
//
// GET = ping de test : confirme que l'URL est bien câblée sans rien créer.

import { NextRequest, NextResponse } from "next/server";

import { isResellerAllowedPlan } from "@/lib/reseller";
import {
  activateResellerClient,
  cancelResellerClient,
} from "@/lib/resellerProvisioning";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ token: string }> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Chemins connus, par ordre de priorité : Systeme.io, Stripe, PayPal,
// génériques. Vérifiés AVANT le scan récursif pour éviter de prendre
// un email secondaire du payload (ex. email du marchand).
const KNOWN_EMAIL_PATHS = [
  "contact.email",
  "data.contact.email",
  "customer.email",
  "data.customer.email",
  "data.object.customer_details.email",
  "data.object.customer_email",
  "data.object.billing_details.email",
  "resource.payer.email_address",
  "payer.email_address",
  "buyer_email",
  "customer_email",
  "contact_email",
  "member.email",
  "user.email",
  "email",
];

function getPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const key of path.split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

function findEmailRecursive(obj: unknown, depth = 0): string | null {
  if (!obj || typeof obj !== "object" || depth > 5) return null;
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (
      /email/i.test(key) &&
      typeof value === "string" &&
      EMAIL_RE.test(value.trim())
    ) {
      return value.trim();
    }
  }
  for (const value of Object.values(obj as Record<string, unknown>)) {
    if (value && typeof value === "object") {
      const found = findEmailRecursive(value, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function extractEmail(payload: unknown): string | null {
  for (const path of KNOWN_EMAIL_PATHS) {
    const value = getPath(payload, path);
    if (typeof value === "string" && EMAIL_RE.test(value.trim())) {
      return value.trim();
    }
  }
  return findEmailRecursive(payload);
}

async function findResellerByToken(token: string) {
  if (!token || token.length < 16) return null;
  const { data, error } = await supabaseAdmin
    .from("resellers")
    .select("id,name,status,support_email")
    .eq("webhook_token", token)
    .maybeSingle();
  if (error) {
    console.error("[reseller-webhook] lookup failed", error.message);
    return null;
  }
  return data as {
    id: string;
    name: string;
    status: string;
    support_email: string | null;
  } | null;
}

// GET — ping de test (à utiliser depuis le navigateur ou curl pour
// vérifier que l'URL collée dans SIO/Stripe/PayPal est la bonne).
export async function GET(req: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const reseller = await findResellerByToken(token);
  if (!reseller) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    ping: true,
    reseller: reseller.name,
    active: reseller.status === "active",
  });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const reseller = await findResellerByToken(token);
  if (!reseller) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  if (reseller.status !== "active") {
    // Revendeur suspendu : on n'ouvre RIEN, mais 200 pour ne pas
    // déclencher des retries infinis chez son provider.
    return NextResponse.json({ ok: false, reason: "reseller_suspended" });
  }

  const actionRaw = (req.nextUrl.searchParams.get("action") ?? "activate").toLowerCase();
  const action =
    actionRaw === "upgrade" || actionRaw === "downgrade" ? "activate" : actionRaw;
  const plan = (req.nextUrl.searchParams.get("plan") ?? "").toLowerCase();

  // Payload : JSON d'abord, formulaire urlencoded en secours.
  let payload: unknown = null;
  const rawText = await req.text().catch(() => "");
  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      try {
        payload = Object.fromEntries(new URLSearchParams(rawText).entries());
      } catch {
        payload = null;
      }
    }
  }

  const email = extractEmail(payload);
  if (!email) {
    console.warn(`[reseller-webhook] no email in payload reseller=${reseller.id}`);
    return NextResponse.json({ ok: false, reason: "no_email" });
  }

  if (action === "cancel") {
    const result = await cancelResellerClient({
      reseller,
      email,
      source: "webhook",
    });
    return NextResponse.json({ ok: result.ok, outcome: result.outcome });
  }

  if (action !== "activate") {
    return NextResponse.json({ ok: false, reason: "unknown_action" });
  }
  if (!isResellerAllowedPlan(plan)) {
    return NextResponse.json({ ok: false, reason: "invalid_plan" });
  }

  const result = await activateResellerClient({
    reseller,
    email,
    plan,
    source: "webhook",
  });
  return NextResponse.json({ ok: result.ok, outcome: result.outcome });
}
