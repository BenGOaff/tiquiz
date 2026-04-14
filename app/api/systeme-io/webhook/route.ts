// app/api/systeme-io/webhook/route.ts
// Webhook Systeme.io pour Tiquiz — crée/upgrade les users après achat.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";

const WEBHOOK_SECRET = process.env.SYSTEME_IO_WEBHOOK_SECRET;
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://quiz.tipote.com").trim();

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } },
);

// Plans Tiquiz: free | paid | beta
type TiquizPlan = "free" | "paid" | "beta";

// Mapping des offer price IDs Systeme.io vers plan Tiquiz
const OFFER_TO_PLAN: Record<string, TiquizPlan> = {
  // Mensuel
  "offer-price-3198235": "paid",
  "3198235": "paid",
  // Annuel
  "offer-price-3198261": "paid",
  "3198261": "paid",
  // Beta (lifetime)
  "offer-price-3198280": "beta",
  "3198280": "beta",
};

function inferPlan(offerId: string): TiquizPlan | null {
  if (!offerId) return null;
  const id = String(offerId).trim().toLowerCase();
  if (id in OFFER_TO_PLAN) return OFFER_TO_PLAN[id];
  if (`offer-price-${id}` in OFFER_TO_PLAN) return OFFER_TO_PLAN[`offer-price-${id}`];
  const num = id.match(/(\d{5,})/);
  if (num) {
    if (num[1] in OFFER_TO_PLAN) return OFFER_TO_PLAN[num[1]];
    if (`offer-price-${num[1]}` in OFFER_TO_PLAN) return OFFER_TO_PLAN[`offer-price-${num[1]}`];
  }
  return null;
}

function deepGet(obj: any, path: string): any {
  return path.split(".").reduce((o, k) => o?.[k], obj);
}

function extractStr(body: any, paths: string[]): string | null {
  for (const p of paths) {
    const v = deepGet(body, p);
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return null;
}

export async function GET() {
  return NextResponse.json({ error: "POST only. URL: https://quiz.tipote.com/api/systeme-io/webhook?secret=YOUR_SECRET" }, { status: 405 });
}

export async function POST(req: NextRequest) {
  try {
    const secret = req.nextUrl.searchParams.get("secret");
    if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
    }

    let rawBody: any;
    try { const text = await req.text(); rawBody = JSON.parse(text); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

    // Log webhook
    try { await supabaseAdmin.from("webhook_logs").insert({ source: "systeme_io", payload: rawBody, received_at: new Date().toISOString() } as any); } catch {}

    const email = extractStr(rawBody, ["customer.email", "data.customer.email", "email"])?.toLowerCase();
    if (!email) return NextResponse.json({ error: "No email" }, { status: 400 });

    const firstName = extractStr(rawBody, ["customer.fields.first_name", "data.customer.fields.first_name", "first_name"]);
    const lastName = extractStr(rawBody, ["customer.fields.surname", "data.customer.fields.surname", "last_name"]);

    const offerId = extractStr(rawBody, [
      "pricePlan.id", "data.pricePlan.id", "data.offer_price_plan.id", "data.offer_price.id", "product_id",
    ]) ?? "";

    const plan = inferPlan(offerId);
    console.log(`[Tiquiz webhook] email=${email} offerId=${offerId} plan=${plan}`);

    // Create or find user
    let userId: string;
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email, email_confirm: true, user_metadata: { first_name: firstName, last_name: lastName },
    });

    if (created?.user) {
      userId = created.user.id;
    } else if (createErr?.message?.toLowerCase().includes("already been registered")) {
      const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const found = ((authData as any)?.users ?? []).find((u: any) => u.email?.toLowerCase() === email);
      if (!found) return NextResponse.json({ error: "User exists but not found" }, { status: 500 });
      userId = found.id;
    } else {
      throw createErr;
    }

    // Resolve plan
    let finalPlan = plan;
    if (!finalPlan) {
      const { data: existing } = await supabaseAdmin.from("profiles").select("plan").eq("user_id", userId).maybeSingle();
      const ep = existing?.plan;
      finalPlan = (ep && ep !== "free") ? ep as TiquizPlan : "beta";
      console.warn(`[Tiquiz webhook] Unknown offer ${offerId}, defaulting to ${finalPlan}`);
    }

    // Upsert profile
    await supabaseAdmin.from("profiles").upsert({
      user_id: userId, email, first_name: firstName, last_name: lastName,
      plan: finalPlan, updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    // Magic link
    await supabaseAnon.auth.signInWithOtp({
      email, options: { emailRedirectTo: `${APP_URL}/auth/callback`, shouldCreateUser: false },
    }).catch(() => {});

    return NextResponse.json({ ok: true, email, user_id: userId, plan: finalPlan, magic_link_sent: true });
  } catch (err) {
    console.error("[Tiquiz webhook] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
