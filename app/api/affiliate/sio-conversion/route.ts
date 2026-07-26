// app/api/affiliate/sio-conversion/route.ts
// Fallback serveur pour les conversions affiliées (calqué sur Tipote). Le
// tracker JS reste le tracker principal côté client, mais sur certaines pages
// Systeme.io l'event submit ne fire pas -> on capte la conversion via un
// webhook SIO "opt-in" qui transmet le contact complet.
//
// USAGE (Béné, côté Systeme.io) :
//   Automation "contact opt-in sur une page Atelier du Quiz" -> Webhook POST
//   vers https://quizing.tipote.com/api/affiliate/sio-conversion
//
// On en extrait l'email + le sa (depuis "Lien source" / opt_in_url / champ
// sa). Sans sa -> 200 { ok:false, reason:"no_sa" } (pas applicable).
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { extractEmail, extractSaFromPayload } from "@/lib/affiliateTracking";

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
  const sa = extractSaFromPayload(body);
  const pageUrl =
    typeof (body as Record<string, unknown>)?.page_url === "string"
      ? String((body as Record<string, unknown>).page_url).slice(0, 2048)
      : null;

  console.log(
    `[affiliate/sio-conversion] email=${email ?? "(none)"} sa=${sa ?? "(none)"}`,
  );

  if (!email) {
    return NextResponse.json({ ok: false, reason: "no_email" }, { status: 200, headers: CORS });
  }
  if (!sa) {
    return NextResponse.json({ ok: false, reason: "no_sa", email }, { status: 200, headers: CORS });
  }

  try {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: existing } = await supabaseAdmin
      .from("affiliate_conversions")
      .select("id")
      .eq("email", email)
      .eq("sa", sa)
      .gte("created_at", since)
      .limit(1)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ ok: true, action: "skipped_duplicate" }, { headers: CORS });
    }
    const { error } = await supabaseAdmin
      .from("affiliate_conversions")
      .insert({ email, sa, page_url: pageUrl });
    if (error) {
      return NextResponse.json(
        { ok: false, reason: "db_error", error: error.message },
        { status: 500, headers: CORS },
      );
    }
    return NextResponse.json({ ok: true, action: "conversion_recorded" }, { headers: CORS });
  } catch (err) {
    console.error("[affiliate/sio-conversion] unexpected:", err);
    return NextResponse.json({ ok: false, reason: "unexpected" }, { status: 500, headers: CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
