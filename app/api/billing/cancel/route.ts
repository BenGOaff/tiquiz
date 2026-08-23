// app/api/billing/cancel/route.ts
//
// LA CLIENTE ARRÊTE SON ABONNEMENT, TOUTE SEULE.
//
// Béné, 23 août : "l'user doit aussi pouvoir le faire en toute
// autonomie". C'était déjà le cas, mais seulement pour Systeme.io.
//
// -- LE BUG D'ARGENT QUE CETTE ROUTE PORTAIT ---------------------------
//
// Elle ne connaissait QUE Systeme.io. Depuis que nous encaissons nous
// mêmes, une abonnée Stripe qui cliquait "Annuler mon abonnement"
// tombait dans la branche "aucun abonnement Systeme.io actif", qui
// **retirait son plan en local et répondait ok**. Accès coupé, et
// Stripe qui prélève toujours. La pire combinaison possible, et elle
// est arrivée le jour même du premier vrai paiement.
//
// La décision vit maintenant dans `lib/checkout/cancelSubscriptions.ts`,
// partagée avec le bouton de l'admin : deux écrans qui décideraient la
// même chose chacun de leur côté finissent toujours par se contredire.
//
// Le corps accepte l'ancien vocabulaire (`WhenBillingCycleEnds`, `Now`)
// pour ne rien casser dans l'écran de réglages.

import { NextRequest, NextResponse } from "next/server";

import { annulerAbonnementsDe } from "@/lib/checkout/cancelSubscriptions";
import { normaliserQuand } from "@/lib/checkout/subscriptionCancel";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Le serveur renvoie la RAISON, l'interface dit comment le dire. */
const PHRASES: Record<string, string> = {
  already_free: "Tu n'as pas d'abonnement actif.",
  lifetime_plan: "Ton accès est à vie, il n'y a rien à annuler.",
  invalid_email: "Ton compte n'a pas d'adresse email utilisable.",
  not_configured: "Le paiement n'est pas configuré sur ce serveur. Écris-nous, on s'en occupe.",
  missing_permission: "Nous n'avons pas pu arrêter l'abonnement chez Stripe. Écris-nous, on s'en occupe.",
  provider_refused: "Le fournisseur a refusé l'annulation. Écris-nous, on s'en occupe.",
  sio_unreachable: "Systeme.io n'est pas joignable. Réessaie dans quelques minutes.",
  network: "La connexion a échoué. Réessaie dans quelques minutes.",
  unreadable: "Nous n'avons pas pu vérifier ton abonnement. Réessaie dans quelques minutes.",
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { cancel?: unknown };
  const quand = normaliserQuand(body.cancel);

  const r = await annulerAbonnementsDe({
    email: user.email,
    quand,
    source: "billing_cancel",
  });

  if (!r.ok) {
    const message = PHRASES[r.reason ?? ""] ?? PHRASES.unreadable;
    // 400 pour ce qui vient de l'état du compte, 502 pour ce qui vient
    // d'un fournisseur : elle n'a rien à refaire dans le premier cas, et
    // tout à refaire dans le seconde.
    const cote = r.reason === "already_free" || r.reason === "lifetime_plan" || r.reason === "invalid_email";
    return NextResponse.json(
      { ok: false, error: r.reason, message },
      { status: cote ? 400 : 502 },
    );
  }

  console.log(
    `[billing/cancel] ${user.email} : ${r.arretes.length} abonnement(s) arrete(s) ` +
      `(${r.arretes.map((a) => a.fournisseur).join(", ") || "aucun"}), ` +
      `plan ${r.planRetire ? "retire" : "conserve jusqu'a la fin de periode"}`,
  );

  return NextResponse.json({
    ok: true,
    cancel_mode: quand,
    arretes: r.arretes,
    downgraded_immediately: r.planRetire,
    // La date jusqu'à laquelle elle garde ce qu'elle a payé, quand Stripe
    // nous la donne. L'écran peut l'afficher au lieu d'un vague "bientôt".
    finLe: r.arretes.find((a) => a.finLe)?.finLe ?? null,
  });
}
