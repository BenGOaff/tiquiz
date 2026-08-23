// app/api/compte/mes-infos/route.ts
//
// LE CLIENT LIT ET MET À JOUR SES PROPRES INFOS DE FACTURATION.
//
//   GET  -> { ok, facturation, factures }
//   PUT  { facturation } -> { ok }
//
// Béné, 24 août : "que je puisse mettre à jour si demande du client :
// lui aussi doit avoir ces infos et pouvoir les mettre à jour."
//
// -- CE QUE METTRE À JOUR VEUT DIRE, ET CE QUE ÇA NE VEUT PAS DIRE -----
//
// Ça change les factures À VENIR. Ça ne touche AUCUNE facture déjà
// émise, et ce n'est pas une limite technique : une facture émise ne se
// modifie pas, c'est la loi. Une erreur sur une facture passée se
// corrige par un avoir suivi d'une nouvelle facture, et c'est Béné qui
// le fait depuis la fiche client.
//
// Si on lisait l'adresse COURANTE à l'affichage d'une facture, un simple
// déménagement réécrirait tout l'historique, en silence. C'est pour ça
// que l'identité est recopiée DANS la facture au moment de l'émission.
//
// -- LA SESSION FAIT FOI, JAMAIS LE CORPS ------------------------------
//
// L'adresse email vient de `auth.getUser()`, jamais du JSON reçu : sinon
// n'importe qui pourrait lire et réécrire la facturation de n'importe
// qui en envoyant une autre adresse.

import { NextRequest, NextResponse } from "next/server";

import { lireAcheteur, manques } from "@/lib/facture/identite";
import { ecrireFacturation, facturesDe, lireFacturation } from "@/lib/facture/store";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function quiEst() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function GET(): Promise<NextResponse> {
  const user = await quiEst();
  if (!user?.email) {
    return NextResponse.json({ ok: false, reason: "not_signed_in" }, { status: 401 });
  }

  const facturation = await lireFacturation({ userId: user.id, email: user.email });
  const factures = await facturesDe(user.email);

  return NextResponse.json({
    ok: true,
    facturation,
    // Ce qui manque est calculé PAR LA MÊME fonction que celle qui
    // décide, à l'émission, si une facture est complète. Deux règles
    // écrites séparément finiraient par ne pas dire la même chose, et
    // c'est l'écran qui mentirait.
    manques: manques(facturation ?? lireAcheteur({})),
    factures: factures.map((f) => ({
      numero: f.numero,
      genre: f.genre,
      libelle: f.libelle,
      currency: f.currency,
      totalCents: f.total_cents,
      htCents: f.ht_cents,
      tvaCents: f.tva_cents,
      tvaTauxBp: f.tva_taux_bp,
      issuedAt: f.issued_at,
      paidAt: f.paid_at,
    })),
  });
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const user = await quiEst();
  if (!user?.email) {
    return NextResponse.json({ ok: false, reason: "not_signed_in" }, { status: 401 });
  }

  let body: { facturation?: unknown };
  try {
    body = (await req.json()) as { facturation?: unknown };
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 });
  }

  const acheteur = lireAcheteur(body.facturation);
  const ecrit = await ecrireFacturation({
    email: user.email,
    userId: user.id,
    // L'email de facturation peut différer de celui du compte (une
    // comptable reçoit souvent les factures d'un compte qui n'est pas le
    // sien). Sans valeur saisie, on retombe sur celui du compte.
    acheteur: { ...acheteur, email: acheteur.email ?? user.email },
    source: "client",
  });

  if (!ecrit.ok) {
    // Un `ok: false` produit TOUJOURS quelque chose à l'écran (3 août) :
    // le serveur renvoie la RAISON, l'interface la traduit.
    return NextResponse.json({ ok: false, reason: ecrit.reason ?? "base" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, manques: manques(acheteur) });
}
