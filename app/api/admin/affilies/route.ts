// app/api/admin/affilies/route.ts
//
//   GET  ->  { ok: true, affiliates, months, totals, sources }
//
// Ce que Béné demande : "les affiliés : qui vend, combien, mes
// factures... les sommes à sortir aux affiliés chaque mois pour calculer
// mon bénéfice restant."
//
// -- CETTE ROUTE NE CALCULE RIEN ---------------------------------------
//
// Elle va chercher les lignes dans les deux bases et passe le tout à
// `buildAffiliatePayouts()`, testée. Le cycle d'une commission (garantie
// 30 jours, puis à verser, puis versé) est celui que l'affiliée voit sur
// son propre écran : deux endroits qui calculent la même chose finissent
// toujours par se contredire, et ici la contradiction porterait sur un
// montant dû à quelqu'un.
//
// -- ADMIN SEULEMENT ---------------------------------------------------
//
// Ce sont les revenus de Béné et les gains de ses affiliées.

import { NextResponse } from "next/server";

import { buildAffiliatePayouts } from "@/lib/admin/affiliatePayouts";
import { fetchAffiliateCommissions } from "@/lib/admin/affiliateSources";
import { isAdminEmail } from "@/lib/adminEmails";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  const { rows, sources } = await fetchAffiliateCommissions(process.env);
  const { affiliates, months, totals } = buildAffiliatePayouts(rows, new Date());

  return NextResponse.json({ ok: true, affiliates, months, totals, sources });
}
