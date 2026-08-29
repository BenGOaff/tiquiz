// app/api/admin/pilotage/revendeurs/route.ts
//
// LES REVENDEURS ET LEURS FACTURES, EN UN APPEL.
//
// Deux routes existaient déjà (`/api/admin/resellers` et
// `/api/admin/reseller-invoices`), et l'écran d'admin les appelait
// séparément. Ici on lit les deux en parallèle et on rend des lignes
// DÉJÀ RECOLLÉES : sans ça, le composant referait la jointure, donc la
// jointure vivrait dans un composant, donc elle ne serait pas testée.
//
// Les décisions (palier suivant, impayé, ordre, totaux) vivent dans
// `lib/pilotage/revendeurs.ts`, pur et testé. Cette route lit.

import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/adminEmails";
import { commissionRateFor, isPaidPlan } from "@/lib/reseller";
import {
  construireRevendeurs,
  resumerRevendeurs,
  trierRevendeurs,
  type EntreeFacture,
  type EntreeRevendeur,
  type PalierRevendeur,
} from "@/lib/pilotage/revendeurs";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  try {
    const [revRes, cliRes, facRes] = await Promise.all([
      supabaseAdmin
        .from("resellers")
        .select("id,user_id,name,status,commission_tiers,created_at")
        .order("created_at", { ascending: true }),
      supabaseAdmin.from("profiles").select("reseller_id,plan").not("reseller_id", "is", null),
      supabaseAdmin
        .from("reseller_invoices")
        .select("id,reseller_id,period,total_cents,status,created_at,paid_at")
        .order("period", { ascending: false })
        .limit(2000),
    ]);

    if (revRes.error) throw revRes.error;

    // LA LICENCE EST LE COMPTE PAYANT, jamais le compte. `isPaidPlan`
    // tranche, et n'est pas réécrit ici : facturer sur les comptes
    // facturerait au mauvais palier.
    const portefeuille = new Map<string, { total: number; licences: number; free: number }>();
    for (const c of (cliRes.data as { reseller_id: string; plan: string }[] | null) ?? []) {
      const p = portefeuille.get(c.reseller_id) ?? { total: 0, licences: 0, free: 0 };
      p.total += 1;
      if (isPaidPlan(c.plan)) p.licences += 1;
      else p.free += 1;
      portefeuille.set(c.reseller_id, p);
    }

    const brutes =
      (revRes.data as
        | {
            id: string;
            user_id: string;
            name: string | null;
            status: string | null;
            commission_tiers: PalierRevendeur[] | null;
            created_at: string | null;
          }[]
        | null) ?? [];

    // L'adresse du compte revendeur, pour pouvoir ouvrir sa fiche.
    const emails: Record<string, string | null> = {};
    if (brutes.length > 0) {
      const { data } = await supabaseAdmin
        .from("profiles")
        .select("user_id,email")
        .in("user_id", brutes.map((r) => r.user_id));
      for (const p of (data as { user_id: string; email: string | null }[] | null) ?? []) {
        emails[p.user_id] = p.email;
      }
    }

    const revendeurs: EntreeRevendeur[] = brutes.map((r) => {
      const p = portefeuille.get(r.id) ?? { total: 0, licences: 0, free: 0 };
      const tiers = (r.commission_tiers ?? []) as PalierRevendeur[];
      return {
        id: r.id,
        name: r.name,
        email: emails[r.user_id] ?? null,
        status: r.status,
        createdAt: r.created_at,
        clientCount: p.total,
        licenceCount: p.licences,
        freeCount: p.free,
        currentRate: commissionRateFor(p.licences, tiers),
        tiers,
      };
    });

    const factures: EntreeFacture[] = (
      (facRes.data as
        | {
            id: string;
            reseller_id: string;
            period: string | null;
            total_cents: number | null;
            status: string | null;
            created_at: string | null;
            paid_at: string | null;
          }[]
        | null) ?? []
    ).map((f) => ({
      id: f.id,
      resellerId: f.reseller_id,
      period: f.period,
      totalCents: Number(f.total_cents) || 0,
      status: f.status,
      createdAt: f.created_at,
      paidAt: f.paid_at,
    }));

    const lignes = trierRevendeurs(construireRevendeurs({ revendeurs, factures }));

    return NextResponse.json({
      ok: true,
      lignes,
      resume: resumerRevendeurs(lignes),
      // CE QU'ON N'A PAS PU LIRE SE DIT. Un tableau de factures vide
      // parce que la table manque est indiscernable d'un revendeur à
      // jour de tout.
      manque: {
        factures: Boolean(facRes.error),
        portefeuilles: Boolean(cliRes.error),
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[pilotage/revendeurs] lecture impossible : ${message}`);
    return NextResponse.json({ ok: false, reason: "read_failed" }, { status: 500 });
  }
}
