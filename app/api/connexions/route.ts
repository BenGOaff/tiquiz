// app/api/connexions/route.ts
//
// GET  : les connexions CRM du projet actif (jamais un secret, ni
//        chiffré ni en clair).
// POST : en créer une, après l'avoir VALIDÉE chez l'outil. Une clé
//        fausse est la première cause des "mes leads ne partent pas" :
//        on refuse tout de suite plutôt que d'échouer en silence sur
//        chaque lead pendant des semaines (règle des clés Systeme.io).
//
// Deux façons de connecter GoHighLevel à la main (le bouton OAuth vit
// dans `gohighlevel/oauth`) :
//   - un SOUS-COMPTE : { nom, token, locationId } ;
//   - une AGENCE : { mode: "agence", token, companyId } -> une ligne par
//     sous-compte trouvé, chacune validée à part. Ce qui est refusé est
//     RENDU, jamais avalé : l'écran l'affiche.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { creerConnexion, listerConnexions, oauthGhlConfigure } from "@/lib/integrations/store";
import { estFournisseurCrm } from "@/lib/integrations/fournisseurs";
import { listerSousComptesGhl, validerCompteGhl } from "@/lib/integrations/adaptateurs/gohighlevel";
import { classerEchecEnvoi } from "@/lib/integrations/decision";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    const connexions = await listerConnexions(user.id);
    return NextResponse.json({ ok: true, connexions, oauth: { gohighlevel: oauthGhlConfigure() } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}

function raisonDuRefus(status: number, erreur?: string): string {
  const classe = classerEchecEnvoi(status);
  if (classe === "deconnecte") return "JETON_REFUSE";
  if (classe === "temporaire") return "OUTIL_INDISPONIBLE";
  if (/location/i.test(erreur ?? "")) return "SOUS_COMPTE_INCONNU";
  return "REFUSE";
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const fournisseur = String(body?.fournisseur ?? "").trim();
    if (!estFournisseurCrm(fournisseur)) {
      return NextResponse.json({ ok: false, error: "FOURNISSEUR_INCONNU" }, { status: 400 });
    }
    const token = String(body?.token ?? "").trim();
    if (!token) return NextResponse.json({ ok: false, error: "JETON_REQUIS" }, { status: 400 });

    if (String(body?.mode ?? "") === "agence") {
      const companyId = String(body?.companyId ?? "").trim();
      if (!companyId) return NextResponse.json({ ok: false, error: "COMPANY_ID_REQUIS" }, { status: 400 });
      const liste = await listerSousComptesGhl(token, companyId);
      if (!liste.ok) {
        return NextResponse.json({ ok: false, error: raisonDuRefus(liste.status, liste.erreur), detail: liste.erreur ?? null });
      }
      const creees: string[] = [];
      const refusees: Array<{ nom: string; raison: string }> = [];
      for (const sc of liste.sousComptes) {
        const v = await validerCompteGhl({ token, locationId: sc.id });
        if (!v.ok) {
          refusees.push({ nom: sc.name, raison: raisonDuRefus(v.status, v.erreur) });
          continue;
        }
        try {
          await creerConnexion({
            userId: user.id,
            fournisseur,
            nom: sc.name,
            secret: { kind: "pit", token },
            config: { locationId: sc.id, companyId, mode: "jeton", portee: "agence" },
          });
          creees.push(sc.name);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          refusees.push({ nom: sc.name, raison: /duplicate|unique/i.test(msg) ? "NOM_PRIS" : "REFUSE" });
        }
      }
      return NextResponse.json({ ok: true, creees, refusees });
    }

    const nom = String(body?.nom ?? "").trim().slice(0, 80);
    const locationId = String(body?.locationId ?? "").trim();
    if (!nom) return NextResponse.json({ ok: false, error: "NOM_REQUIS" }, { status: 400 });
    if (!locationId) return NextResponse.json({ ok: false, error: "LOCATION_ID_REQUIS" }, { status: 400 });

    const v = await validerCompteGhl({ token, locationId });
    if (!v.ok) {
      return NextResponse.json({ ok: false, error: raisonDuRefus(v.status, v.erreur), detail: v.erreur ?? null });
    }
    try {
      const connexion = await creerConnexion({
        userId: user.id,
        fournisseur,
        nom,
        secret: { kind: "pit", token },
        config: { locationId, mode: "jeton", portee: "sous-compte" },
      });
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
