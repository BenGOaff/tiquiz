// app/api/affiliate/sio-sale/route.ts
// Webhook de VENTE Systeme.io -> crée la commission affiliée (source de
// vérité du suivi des gains). Calqué sur l'attribution affiliate Tipote.
//
// USAGE (Béné, côté Systeme.io) :
//   Automation "Vente d'un produit" (Atelier du Quiz OU abonnement Tiquiz)
//   -> Webhook POST vers https://quizing.tipote.com/api/affiliate/sio-sale
//
// On extrait email + order id + montant + produit + sa, on détecte le produit
// (Quizing 70% / Tiquiz 40%) et on attribue à l'affilié. Idempotent
// (unique source_app + sio_order_id). Toujours 200 pour éviter les retries SIO
// sur les cas non applicables (vente sans affilié, produit hors périmètre).
import { NextRequest, NextResponse } from "next/server";
import {
  attributeQuizingSale,
  detectProduct,
  extractAmountCents,
  extractEmail,
  extractFunnelUrl,
  extractOfferId,
  extractOrderId,
  extractProductName,
  extractSaFromPayload,
} from "@/lib/affiliateTracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

async function parseBody(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    try {
      const text = await req.text();
      return Object.fromEntries(new URLSearchParams(text).entries());
    } catch {
      return null;
    }
  }
}

export async function POST(req: NextRequest) {
  const body = await parseBody(req);
  if (!body) {
    return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400, headers: CORS });
  }

  const email = extractEmail(body);
  const orderId = extractOrderId(body);
  const productName = extractProductName(body);
  const offerId = extractOfferId(body);
  const funnelUrl = extractFunnelUrl(body);
  const saHint = extractSaFromPayload(body);
  const amountCents = extractAmountCents(body);
  const product = detectProduct(funnelUrl, offerId, productName);

  console.log(
    `[affiliate/sio-sale] email=${email ?? "(none)"} order=${orderId ?? "(none)"} amount=${amountCents} url=${funnelUrl ?? "(none)"} offer=${offerId ?? "(none)"} product=${product?.source_app ?? "(none)"}`,
  );

  if (!email || !orderId) {
    return NextResponse.json({ ok: false, reason: "missing_fields" }, { status: 200, headers: CORS });
  }
  if (!product) {
    // Produit hors périmètre (ni Atelier du Quiz ni Tiquiz).
    return NextResponse.json({ ok: false, reason: "not_our_product" }, { status: 200, headers: CORS });
  }

  const result = await attributeQuizingSale({
    email,
    sio_order_id: orderId,
    sale_amount_cents: amountCents,
    product,
    product_name: productName,
    sa_hint: saHint,
    raw_payload: body,
  });

  // 200 dans tous les cas non-erreur pour ne pas faire retry SIO inutilement.
  const httpStatus = result.status === "error" ? 500 : 200;
  return NextResponse.json({ ok: result.status === "attributed", ...result }, { status: httpStatus, headers: CORS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
