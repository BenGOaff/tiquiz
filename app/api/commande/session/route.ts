// app/api/commande/session/route.ts
//
// DÉMARRE LE PAIEMENT D'UN ABONNEMENT TIQUIZ.
//
//   POST { produit, k, ref? }  ->  { ok: true, clientSecret, mode }
//                              ->  { ok: false, reason }
//
// Jumeau de la route de l'Atelier. La seule différence est ce que le
// catalogue contient : ici des abonnements, là-bas un achat unique. Le
// code ne le devine pas, il lit l'`interval` du produit.
//
// Le navigateur envoie l'identifiant du produit, JAMAIS le prix : celui
// ci vient du catalogue, côté serveur. Un montant reçu du client serait
// un montant négociable par le client.
//
// Cette route n'ouvre AUCUN accès : elle crée une intention de paiement.
// L'accès s'ouvre dans le webhook, quand Stripe confirme l'argent.

import { NextRequest, NextResponse } from "next/server";

import { findOwnerProduct } from "@/lib/checkout/catalog";
import { readOwnerStripe, readOwnerStripeWebhookSecret } from "@/lib/checkout/ownerAccount";
import { createOwnerCheckoutSession } from "@/lib/checkout/stripeCheckout";
import { readSa } from "@/lib/affiliate/sa";
import { essaiPourCeCheckout } from "@/lib/trial/moisOffertCheckout";
import { lienOuvreLeMoisOffert, MO_COOKIE } from "@/lib/affiliate/moisOffertLien";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { isSalesOpen } from "@/lib/sales/previewGate";
import { checkoutReturnBase } from "@/lib/sales/salesHosts";
import { resolveAppUrl } from "@/lib/authLinks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { produit?: string; k?: string; ref?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 });
  }

  // La porte du chantier. Tant qu'elle est fermée, ce bon de commande
  // n'existe pour personne, et on ne dit pas qu'il existe.
  if (!isSalesOpen(body.k, req.headers.get("host"), process.env)) {
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  }

  const product = findOwnerProduct(body.produit);
  if (!product) {
    return NextResponse.json({ ok: false, reason: "unknown_product" }, { status: 404 });
  }

  const compte = readOwnerStripe(process.env);
  if (!compte) {
    console.error(
      "[commande] STRIPE_SECRET_KEY_OWNER absente ou invalide sur ce serveur : aucun paiement possible.",
    );
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }

  // ON N'ENCAISSE PAS DE VRAI ARGENT TANT QUE RIEN N'OUVRE L'ACCÈS.
  //
  // Sans secret de webhook, rien ne peut valider la confirmation de
  // Stripe, donc une vraie vente serait encaissée et le client n'aurait
  // rien. C'est le drame Ivan, sauf que cette fois l'argent serait sur
  // notre compte. En mode test on laisse passer : personne n'est débité.
  //
  // Et ici l'enjeu est plus grand qu'à l'Atelier : ce sont des
  // ABONNEMENTS. Une vente non ouverte ne serait pas une déception unique
  // mais un prélèvement mensuel en face de rien.
  if (compte.mode === "live" && !readOwnerStripeWebhookSecret(process.env)) {
    console.error(
      "[commande] cle LIVE posee sans STRIPE_WEBHOOK_SECRET_OWNER : paiement refuse, " +
        "sinon un abonnement serait preleve sans ouvrir d'acces.",
    );
    return NextResponse.json({ ok: false, reason: "live_without_webhook" }, { status: 503 });
  }

  // ON RAMENE L'ACHETEUR LA OU IL A ACHETE.
  //
  // Sur tiquiz.fr il n'a aucune cle dans son URL : le renvoyer sur le
  // domaine canonique lui donnerait une page 404 juste apres avoir paye.
  // `checkoutReturnBase` n'accepte que NOS domaines de vente, donc un
  // Host falsifie ne peut pas detourner le retour.
  const base = checkoutReturnBase(
    req.nextUrl.origin,
    resolveAppUrl(process.env.NEXT_PUBLIC_APP_URL, req.nextUrl.origin),
  );
  const retour = `${base}/commande/${product.id}/retour?session_id={CHECKOUT_SESSION_ID}&k=${encodeURIComponent(String(body.k ?? ""))}`;

  // ── LE MOIS OFFERT PAR UNE AFFILIÉE ──
  //
  // Béné, 23 août : "passe par mon lien et reçois un mois offert", et
  // "s'il prend mensuel il a 30j gratos à mensuel. S'il prend mensuel
  // plus : il a 30j gratos à mensuel plus."
  //
  // `readSa` et pas un `slice()` : une valeur tronquée garde la FORME
  // d'un identifiant valide, passe tous les contrôles, et ne désigne
  // personne. La commission ET le cadeau seraient perdus en silence.
  const sa = readSa(body.ref);

  // L'adresse si une session est ouverte : elle permet le contrôle
  // complet du non-cumul AVANT le paiement. Anonyme, on accorde et on
  // vérifie après (cf. `moisOffertCheckout.ts`).
  let emailConnu: string | null = null;
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    emailConnu = user?.email ?? null;
  } catch {
    emailConnu = null;
  }

  const essai = await essaiPourCeCheckout({
    sa,
    // Le marqueur du systeme courant, pose par le middleware. Il se lit
    // dans le COOKIE et jamais dans le corps de la requete : le corps
    // vient du navigateur, donc n'importe qui pourrait l'ecrire.
    lienCourant: lienOuvreLeMoisOffert(sa, req.cookies.get(MO_COOKIE)?.value),
    email: emailConnu,
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  });
  if (essai.jours > 0) {
    console.log(
      `[commande] ${essai.jours} jours offerts sur ${product.id} (lien ${sa})` +
        (essai.signale ? ` A VERIFIER : ${essai.signale}` : ""),
    );
  }

  const result = await createOwnerCheckoutSession({
    key: compte.key,
    product,
    returnUrl: retour,
    affiliateRef: sa,
    trialDays: essai.jours,
  });

  if (!result.ok || !result.clientSecret) {
    console.error(`[commande] Stripe a refuse : ${result.reason} / ${result.detail ?? ""}`);
    // 502 : ce n'est pas la requête de l'acheteur qui est en cause, c'est
    // ce qu'il y a derrière. Un 400 l'enverrait chercher chez lui.
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    clientSecret: result.clientSecret,
    // L'écran DOIT pouvoir dire "mode test" : un formulaire qui accepte la
    // carte 4242 sans rien prélever ressemble trait pour trait à une vraie
    // vente, et on ne s'en aperçoit qu'en cherchant un virement.
    mode: compte.mode,
  });
}
