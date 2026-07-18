// app/api/me/affiliate/route.ts
// L'élève enregistre / met à jour son identifiant affilié Systeme.io.
// RLS : il ne touche que sa propre ligne profiles. On valide le format sa...
// et on horodate la 1re activation (affiliate_opted_in_at).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { normalizeAffiliateId, isValidAffiliateId } from "@/lib/affiliate";

const schema = z.object({
  // On accepte l'ID brut OU un lien collé : normalizeAffiliateId extrait le sa.
  affiliateId: z.string().max(200),
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

  const sa = normalizeAffiliateId(parsed.data.affiliateId);
  if (sa && !isValidAffiliateId(sa)) {
    return NextResponse.json({ ok: false, reason: "bad_format" }, { status: 400 });
  }

  // 1re activation : on pose affiliate_opted_in_at si pas déjà fait.
  const { data: existing } = await supabase
    .from("profiles")
    .select("affiliate_opted_in_at")
    .eq("id", user.id)
    .maybeSingle();
  const alreadyOptedIn = Boolean(
    (existing as { affiliate_opted_in_at: string | null } | null)?.affiliate_opted_in_at,
  );

  const update: Record<string, unknown> = {
    sio_affiliate_id: sa || null,
    updated_at: new Date().toISOString(),
  };
  if (sa && !alreadyOptedIn) {
    update.affiliate_opted_in_at = new Date().toISOString();
  }

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) return NextResponse.json({ ok: false, reason: "db" }, { status: 400 });

  return NextResponse.json({ ok: true, affiliateId: sa });
}
