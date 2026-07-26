// app/api/affiliate/track/route.ts
// Reçoit les events du tracker client (public/widgets/affiliate-tracker.js)
// posés sur la page de vente tipote.fr/atelier-du-quiz :
//   - type=click      -> affiliate_clicks
//   - type=conversion -> affiliate_conversions (dedup email+sa < 24h)
// Body envoyé en text/plain (pas de preflight CORS). Toujours 200 (soft fail).
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SA_RE } from "@/lib/affiliateTracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function isEmail(v: unknown): v is string {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export async function POST(req: NextRequest) {
  // Le tracker envoie en text/plain : on parse le corps brut en JSON.
  let body: Record<string, unknown> = {};
  try {
    const text = await req.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_body" }, { status: 200, headers: CORS });
  }

  const type = String(body.type ?? "");
  const sa = String(body.sa ?? "").trim();
  if (!SA_RE.test(sa)) {
    return NextResponse.json({ ok: false, reason: "bad_sa" }, { status: 200, headers: CORS });
  }
  const pageUrl = typeof body.page_url === "string" ? body.page_url.slice(0, 2048) : null;

  try {
    if (type === "click") {
      const referrer = typeof body.referrer === "string" ? body.referrer.slice(0, 2048) : null;
      await supabaseAdmin.from("affiliate_clicks").insert({ sa, page_url: pageUrl, referrer });
      return NextResponse.json({ ok: true, action: "click" }, { headers: CORS });
    }

    if (type === "conversion") {
      const email = isEmail(body.email) ? String(body.email).trim().toLowerCase() : null;
      if (!email) {
        return NextResponse.json({ ok: false, reason: "no_email" }, { status: 200, headers: CORS });
      }
      // Dedup soft : même (email, sa) dans les 24h -> skip.
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { data: existing } = await supabaseAdmin
        .from("affiliate_conversions")
        .select("id")
        .eq("email", email)
        .eq("sa", sa)
        .gte("created_at", since)
        .limit(1)
        .maybeSingle();
      if (!existing) {
        await supabaseAdmin.from("affiliate_conversions").insert({ email, sa, page_url: pageUrl });
      }
      return NextResponse.json({ ok: true, action: "conversion" }, { headers: CORS });
    }

    return NextResponse.json({ ok: false, reason: "bad_type" }, { status: 200, headers: CORS });
  } catch (err) {
    console.error("[affiliate/track] error:", err);
    return NextResponse.json({ ok: false, reason: "error" }, { status: 200, headers: CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
