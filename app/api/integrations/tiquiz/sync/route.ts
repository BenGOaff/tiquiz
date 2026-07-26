// app/api/integrations/tiquiz/sync/route.ts
// Rafraichit les metriques Tiquiz de l'eleve connecte (bouton Actualiser
// + synchro auto si le snapshot est ancien). Renvoie les metriques et les
// badges nouvellement debloques pour la celebration cote client.
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { syncMetrics } from "@/lib/integrations/tiquiz";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "unauth" }, { status: 401 });

  const { metrics, newBadges } = await syncMetrics(user.id);
  return NextResponse.json({ ok: true, metrics, newBadges });
}
