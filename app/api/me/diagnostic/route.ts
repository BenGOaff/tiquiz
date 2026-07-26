// app/api/me/diagnostic/route.ts
// Enregistre l'onboarding business de l'eleve : prenom, niche, type
// d'activite, maturite, monetisation, budget pub. Ecrit sur son propre
// profil (RLS) et marque la completion.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import {
  ACTIVITY_VALUES,
  MATURITY_VALUES,
  MONETIZATION_VALUES,
  ADS_VALUES,
} from "@/lib/businessProfile";

const schema = z.object({
  firstName: z.string().min(1).max(80),
  niche: z.string().min(1).max(300),
  activityType: z.enum(ACTIVITY_VALUES),
  maturity: z.enum(MATURITY_VALUES),
  monetization: z.enum(MONETIZATION_VALUES),
  adsBudget: z.enum(ADS_VALUES),
});

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "unauth" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "bad_body" }, { status: 400 });
  }

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      full_name: parsed.data.firstName.trim(),
      niche: parsed.data.niche.trim(),
      activity_type: parsed.data.activityType,
      maturity: parsed.data.maturity,
      monetization: parsed.data.monetization,
      ads_budget: parsed.data.adsBudget,
      diagnostic_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) return NextResponse.json({ ok: false, reason: "db" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
