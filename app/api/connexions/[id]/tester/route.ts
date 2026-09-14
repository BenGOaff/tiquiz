// app/api/connexions/[id]/tester/route.ts
//
// "Est-ce que cette connexion répond encore ?" Un contact en lecture,
// et l'état est réécrit d'après la réponse : `ok` remet les compteurs
// d'alerte à zéro (une prochaine coupure préviendra de nouveau),
// `deconnecte` dit pourquoi. Un test qui ne distingue pas "le jeton est
// mort" de "l'outil est en panne" enverrait ressaisir un jeton valide.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { jetonCourant, lireConnexion, marquerEtatConnexion } from "@/lib/integrations/store";
import { validerCompteGhl } from "@/lib/integrations/adaptateurs/gohighlevel";
import { classerEchecEnvoi } from "@/lib/integrations/decision";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const row = await lireConnexion(user.id, id);
    if (!row) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

    const jeton = await jetonCourant(row);
    if (!jeton) {
      await marquerEtatConnexion(id, "deconnecte", { erreur: "jeton illisible ou rafraichissement refuse" });
      return NextResponse.json({ ok: true, etat: "deconnecte", raison: "JETON_REFUSE" });
    }
    const v = await validerCompteGhl(jeton);
    if (v.ok) {
      await marquerEtatConnexion(id, "ok");
      return NextResponse.json({ ok: true, etat: "ok" });
    }
    const classe = classerEchecEnvoi(v.status);
    if (classe === "deconnecte") {
      await marquerEtatConnexion(id, "deconnecte", { erreur: v.erreur ?? null });
      return NextResponse.json({ ok: true, etat: "deconnecte", raison: "JETON_REFUSE" });
    }
    // Temporaire ou refus de contenu : on ne touche pas à l'état, on le dit.
    return NextResponse.json({ ok: true, etat: row.etat, raison: classe === "temporaire" ? "OUTIL_INDISPONIBLE" : "REFUSE", detail: v.erreur ?? null });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
