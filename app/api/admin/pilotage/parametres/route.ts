// app/api/admin/pilotage/parametres/route.ts
//
// CE QUE LE PROCESSUS A VRAIMENT SOUS LA MAIN.
//
// `npm run check:prod` lit le `.env` du dépôt. Cette route lit le
// PROCESSUS, et ce n'est pas la même question : le 22 août, les deux
// `.env` étaient justes et les deux apps servaient quand même la base de
// l'autre, parce que `pm2 restart --update-env` avait poussé un terminal
// pollué dans le processus. Un contrôle qui lit le fichier ne voit pas
// ça.
//
// ELLE NE REND JAMAIS UNE VALEUR SECRÈTE. `lireReglages` s'en charge, et
// un test l'exige : cette réponse finit dans un onglet réseau, parfois
// dans un copier-coller.

import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/adminEmails";
import { lireCleSupabase, refDepuisUrl } from "@/lib/env/supabaseProject";
import {
  contradictions,
  lireReglages,
  modePaypal,
  modeStripe,
} from "@/lib/pilotage/parametres";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

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

  const env = process.env;
  const lecture = lireCleSupabase(String(env.SUPABASE_SERVICE_ROLE_KEY ?? ""));

  return NextResponse.json({
    ok: true,
    reglages: lireReglages(env),
    contradictions: contradictions(env),
    // Un MODE et un identifiant de projet ne sont pas des secrets, et ce
    // sont eux qui rendent un diagnostic évident.
    stripe: modeStripe(env.STRIPE_SECRET_KEY_OWNER),
    paypal: modePaypal(env.PAYPAL_ENV_OWNER),
    supabase: {
      refUrl: refDepuisUrl(String(env.NEXT_PUBLIC_SUPABASE_URL ?? "")),
      refCle: lecture.etat === "jwt" ? lecture.ref : null,
      cleLisible: lecture.etat,
    },
  });
}
