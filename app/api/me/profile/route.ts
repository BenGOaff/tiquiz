// app/api/me/profile/route.ts
// Mise a jour du profil par l'eleve lui-meme (RLS : il ne touche que le
// sien). Champs editables : prenom, niche, activite, maturite,
// monetisation, budget pub. Ne touche pas a diagnostic_completed_at.
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

export async function PATCH(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "unauth" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "bad_body" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.firstName.trim(),
      niche: parsed.data.niche.trim(),
      activity_type: parsed.data.activityType,
      maturity: parsed.data.maturity,
      monetization: parsed.data.monetization,
      ads_budget: parsed.data.adsBudget,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return NextResponse.json({ ok: false, reason: "db" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
