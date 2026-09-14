// app/api/connexions/[id]/route.ts
// PATCH  : renommer, mettre en pause ou reprendre, passer par défaut,
//          ou coller un nouveau jeton (revalidé avant d'être écrit).
// DELETE : supprimer. Les quiz qui la visaient retombent sur le défaut
//          du projet (ON DELETE SET NULL côté base).

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { lireConnexion, majConnexion, supprimerConnexion } from "@/lib/integrations/store";
import { validerCompteGhl } from "@/lib/integrations/adaptateurs/gohighlevel";
import { classerEchecEnvoi } from "@/lib/integrations/decision";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const patch: Parameters<typeof majConnexion>[2] = {};
    if (typeof body?.nom === "string") patch.nom = body.nom;
    if (typeof body?.actif === "boolean") patch.actif = body.actif;
    if (typeof body?.estDefaut === "boolean") patch.estDefaut = body.estDefaut;

    if (typeof body?.token === "string" && body.token.trim()) {
      const cible = await lireConnexion(user.id, id);
      if (!cible) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
      const locationId = String((cible.config as Record<string, unknown>)?.locationId ?? "");
      const v = await validerCompteGhl({ token: body.token.trim(), locationId });
      if (!v.ok) {
        const classe = classerEchecEnvoi(v.status);
        return NextResponse.json({ ok: false, error: classe === "deconnecte" ? "JETON_REFUSE" : classe === "temporaire" ? "OUTIL_INDISPONIBLE" : "REFUSE" });
      }
      patch.secret = { kind: "pit", token: body.token.trim() };
      patch.config = { mode: "jeton" };
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: false, error: "NOTHING_TO_UPDATE" }, { status: 400 });
    }
    try {
      const connexion = await majConnexion(user.id, id, patch);
      if (!connexion) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
      return NextResponse.json({ ok: true, connexion });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/duplicate|unique/i.test(msg)) return NextResponse.json({ ok: false, error: "NOM_PRIS" }, { status: 409 });
      throw e;
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    await supprimerConnexion(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
