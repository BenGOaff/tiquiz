// app/api/admin/clients/abonnement/route.ts
//
// ARRÊTER L'ABONNEMENT DE QUELQU'UN, DEPUIS LA FICHE CLIENT.
//
//   POST { email, quand }  ->  { ok: true, arretes: [...] }
//                          ->  { ok: false, reason }
//
// Béné, 23 août : "il me faut un bouton pour annuler l'abo directement
// et un différent pour rembourser (ce qui sera plus rare)."
//
// **Ce sont deux gestes, et c'est pour ça qu'il y a deux boutons.**
// Annuler arrête le prélèvement et laisse l'accès jusqu'à la date déjà
// payée. Rembourser rend l'argent, ferme l'accès, et doit donc arrêter
// l'abonnement TOUT DE SUITE, sans quoi le mois suivant est prélevé à
// quelqu'un qui n'a plus rien.
//
// La décision vit dans `lib/checkout/cancelSubscriptions.ts`, la MÊME
// que le bouton de la cliente. L'admin ne peut pas dériver de ce que
// vit la cliente : sinon un jour l'une des deux annulations oubliera un
// fournisseur, et personne ne le saura avant un relevé bancaire.

import { NextRequest, NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/adminEmails";
import { annulerAbonnementsDe } from "@/lib/checkout/cancelSubscriptions";
import { normaliserQuand } from "@/lib/checkout/subscriptionCancel";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  let body: { email?: string; quand?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email.includes("@")) {
    return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 });
  }

  const quand = normaliserQuand(body.quand);
  const r = await annulerAbonnementsDe({ email, quand, source: `admin_cancel:${user.email}` });

  if (!r.ok) {
    console.error(`[admin/abonnement] ${user.email} n'a pas pu arreter ${email} : ${r.reason}`);
    // 409 quand c'est l'ÉTAT du compte qui s'y oppose (déjà gratuit, plan
    // à vie) : ce n'est pas une panne, et un 400 laisserait croire à une
    // requête mal formée. Même règle que la suppression d'un quiz.
    const etat = r.reason === "already_free" || r.reason === "lifetime_plan";
    return NextResponse.json({ ok: false, reason: r.reason }, { status: etat ? 409 : 502 });
  }

  console.log(
    `[admin/abonnement] ${user.email} a arrete ${r.arretes.length} abonnement(s) de ${email} ` +
      `(${quand}), plan ${r.planRetire ? "retire" : "conserve"}`,
  );

  return NextResponse.json({
    ok: true,
    quand,
    arretes: r.arretes,
    planRetire: r.planRetire,
    aucunAbonnement: r.aucunAbonnement,
    finLe: r.arretes.find((a) => a.finLe)?.finLe ?? null,
  });
}
