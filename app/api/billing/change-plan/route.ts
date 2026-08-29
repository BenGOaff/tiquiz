// app/api/billing/change-plan/route.ts
//
// MONTER DE PALIER SANS REPAYER CE QUI EST DÉJÀ PAYÉ.
//
// Béné, 23 août 2026 : "l'user paye 17€ pour le mois et veut upgrader à
// tiquiz plus : on retire les 17€ qu'il a payés déjà pour lui faire
// payer le complément pour le mois en cours et la bonne somme le mois
// d'après ?" Puis : "Pour stripe oui on met le prorata en route. Pour
// paypal : on dit rien, on facture et on upgrade point barre."
//
// -- LE BUG D'ARGENT QUE CETTE ROUTE FERME -----------------------------
//
// Jusqu'ici, un abonné qui voulait le Plus cliquait sur le bon de
// commande du Plus. Il ouvrait donc un DEUXIÈME abonnement, pendant que
// le premier continuait de le prélever. Il ne s'en apercevait qu'au
// relevé suivant, et c'est un remboursement plus un client perdu. Même
// famille que les deux bugs d'argent du 23 août.
//
// -- DEUX VERBES, ET ILS NE SE CONFONDENT PAS --------------------------
//
//   GET  -> où j'en suis, et ce que ça coûterait. Ne facture RIEN.
//   POST -> on applique, et la carte est débitée.
//
// Un aperçu qui facturerait serait une catastrophe silencieuse : la
// personne ouvre un écran pour REGARDER et découvre un prélèvement. Deux
// méthodes HTTP différentes, c'est la seule séparation qu'un navigateur
// ne peut pas confondre (un préchargement fait des GET).
//
// -- ET LE PLAN S'OUVRE PAR LE WEBHOOK, PAS ICI ------------------------
//
// La mise à jour émet `customer.subscription.updated`, et c'est le
// chemin habituel qui ouvre l'accès. Ouvrir aussi ici donnerait deux
// endroits qui décident du plan, et deux moitiés d'une même décision
// finissent toujours par se contredire : quatre fois dans ce dépôt.

import { NextRequest, NextResponse } from "next/server";

import { resolveAppUrl } from "@/lib/authLinks";
import { ciblesPossibles, deciderChangement, sensVers } from "@/lib/checkout/planChange";
import {
  annulerDescenteProgrammee,
  apercuChangement,
  appliquerChangement,
  lireDescenteProgrammee,
  lireLigneAbonnement,
  programmerDescente,
} from "@/lib/checkout/planChangeStripe";
import {
  readOwnerPaypal,
  readOwnerPaypalWebhookId,
  readOwnerStripe,
} from "@/lib/checkout/ownerAccount";
import { createOwnerPaypalSubscription, getOwnerPaypalSubscription } from "@/lib/checkout/paypalOwner";
import { retrieveOwnerSubscription } from "@/lib/checkout/stripeCheckout";
import { estAbonnementVivant, listerAbonnementsOwner } from "@/lib/checkout/subscriptionCancel";
import { checkoutReturnBase } from "@/lib/sales/salesHosts";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Le serveur renvoie la RAISON, l'écran dit comment le dire.
 *
 * Ces phrases sont un filet, pas l'i18n : elles évitent un écran muet
 * (règle du `ok: false`, 3 août) le jour où une raison nouvelle n'a pas
 * encore sa traduction.
 */
const PHRASES: Record<string, string> = {
  produit_inconnu: "Ce palier n'existe pas.",
  deja_sur_ce_palier: "Tu es déjà sur ce palier.",
  descente_non_geree:
    "Pour passer à un palier moins cher, arrête ton abonnement : tu gardes ton accès jusqu'à la date déjà payée, puis tu reprends le palier que tu veux.",
  // PAYPAL N'A PAS D'ÉQUIVALENT DU CALENDRIER DE STRIPE : on ne peut
  // pas y programmer un changement pour l'échéance suivante sans un
  // nouvel accord du client, dont la date d'effet exacte dépend de leur
  // côté. Plutôt que d'inventer une mécanique sur de l'argent, on dit la
  // sortie qui marche, celle qui ne lui reprend rien de ce qu'elle a
  // payé.
  descente_paypal:
    "Ton abonnement est chez PayPal, qui ne sait pas programmer un changement de palier. Arrête ton abonnement : tu gardes ton accès jusqu'à la date déjà payée, puis tu reprends le palier que tu veux.",
  pas_d_abonnement: "Tu n'as pas d'abonnement en cours chez nous.",
  pas_notre_abonnement:
    "Ton abonnement n'a pas été pris sur notre bon de commande. Écris-nous, on s'en occupe.",
  not_configured: "Le paiement n'est pas configuré sur ce serveur. Écris-nous, on s'en occupe.",
  live_without_webhook: "Le paiement PayPal n'est pas complètement configuré sur ce serveur.",
  stripe_refused: "Stripe a refusé le changement. Écris-nous, on s'en occupe.",
  paypal_refused: "PayPal a refusé le changement. Écris-nous, on s'en occupe.",
  unreadable: "Nous n'avons pas pu lire ton abonnement. Réessaie dans quelques minutes.",
};

/** Ce qui vient de l'état du compte (400) vs d'un fournisseur (502). */
const COTE_CLIENT = new Set([
  "produit_inconnu",
  "deja_sur_ce_palier",
  "descente_non_geree",
  "descente_paypal",
  "pas_d_abonnement",
  "pas_notre_abonnement",
]);

function refus(raison: string): NextResponse {
  return NextResponse.json(
    { ok: false, reason: raison, message: PHRASES[raison] ?? PHRASES.unreadable },
    { status: COTE_CLIENT.has(raison) ? 400 : 502 },
  );
}

async function adresseConnectee(): Promise<string | null> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? null;
}

// ── OÙ EN EST CETTE PERSONNE ─────────────────────────────────────────
//
// Une même adresse peut avoir un abonnement chez l'un ou chez l'autre.
// On regarde PayPal d'abord parce que sa lecture ne coûte qu'un appel et
// qu'elle tranche : si elle a un abonnement PayPal vivant, c'est celui
// là qu'on monte, et Stripe n'a rien à voir là dedans.

type Contexte =
  | { ok: true; fournisseur: "paypal"; produit: string | null; abonnementId: string }
  | {
      ok: true;
      fournisseur: "stripe";
      produit: string | null;
      abonnementId: string;
      key: string;
      customerId: string;
      itemId: string;
    }
  | { ok: false; raison: string };

async function contexteDe(email: string): Promise<Contexte> {
  const { data: profil } = await supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id, paypal_subscription_id")
    .ilike("email", email)
    .maybeSingle();
  const ligne = (profil ?? {}) as { stripe_customer_id?: string; paypal_subscription_id?: string };

  // ── PayPal ──
  const comptePaypal = readOwnerPaypal(process.env);
  const paypalId = String(ligne.paypal_subscription_id ?? "").trim();
  if (comptePaypal && paypalId) {
    const abo = await getOwnerPaypalSubscription({ compte: comptePaypal, subscriptionId: paypalId });
    // Un abonnement PayPal éteint n'est pas un abonnement à monter : on
    // continue vers Stripe au lieu de refuser.
    if (abo?.actif) {
      return { ok: true, fournisseur: "paypal", produit: abo.productId, abonnementId: paypalId };
    }
  }

  // ── Stripe ──
  const compte = readOwnerStripe(process.env);
  if (!compte) return { ok: false, raison: paypalId ? "unreadable" : "not_configured" };

  const customerId = String(ligne.stripe_customer_id ?? "").trim();
  if (!customerId) return { ok: false, raison: "pas_d_abonnement" };

  const liste = await listerAbonnementsOwner(compte.key, customerId);
  // "Je n'ai pas pu regarder" et "il n'y a rien" n'appellent pas la même
  // suite : la même distinction que l'annulation du 23 août. Confondre
  // les deux ferait afficher "tu n'as pas d'abonnement" à quelqu'un qui
  // en a un, et il en prendrait un deuxième.
  if (!liste.ok) return { ok: false, raison: "unreadable" };
  const vivant = liste.abonnements.find((a) => estAbonnementVivant(a.status));
  if (!vivant) return { ok: false, raison: "pas_d_abonnement" };

  const sub = await retrieveOwnerSubscription(compte.key, vivant.id);
  if (!sub) return { ok: false, raison: "unreadable" };
  const { itemId, produit } = lireLigneAbonnement(sub);
  if (!itemId) return { ok: false, raison: "pas_notre_abonnement" };

  return {
    ok: true,
    fournisseur: "stripe",
    produit,
    abonnementId: vivant.id,
    key: compte.key,
    customerId,
    itemId,
  };
}

// ── CE QUE ÇA COÛTERAIT ──────────────────────────────────────────────

/**
 * La fin de la période DÉJÀ PAYÉE, lue chez Stripe.
 *
 * On ne la calcule pas : ajouter un mois à une date d'achat se trompe
 * dès qu'il y a eu un essai, une pause ou un changement de cycle, et
 * une date fausse annoncée à une cliente est pire que pas de date.
 */
async function finDePeriode(args: {
  key: string;
  subscriptionId: string;
}): Promise<string | null> {
  const sub = await retrieveOwnerSubscription(args.key, args.subscriptionId);
  const fin = (sub as { current_period_end?: unknown } | null)?.current_period_end;
  return typeof fin === "number" ? new Date(fin * 1000).toISOString() : null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const email = await adresseConnectee();
  if (!email) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const ctx = await contexteDe(email);
  if (!ctx.ok) return refus(ctx.raison);

  const demande = req.nextUrl.searchParams.get("produit");

  // SANS `produit` : l'écran veut juste savoir où il en est et ce qu'il
  // peut proposer. Aucun appel de facturation, donc rien à attendre.
  if (!demande) {
    // UN CHANGEMENT DÉJÀ PROGRAMMÉ SE VOIT, ET SE DÉFAIT. Une descente
    // qu'on ne peut ni voir ni annuler serait pire que pas de descente
    // du tout : elle découvrirait le nouveau palier un matin, sans se
    // souvenir de l'avoir demandé.
    const programme =
      ctx.fournisseur === "stripe"
        ? await lireDescenteProgrammee({ key: ctx.key, subscriptionId: ctx.abonnementId })
        : null;

    return NextResponse.json({
      ok: true,
      fournisseur: ctx.fournisseur,
      actuel: ctx.produit,
      cibles: ciblesPossibles(ctx.produit),
      // Le sens de chaque cible : les deux ne se présentent pas pareil,
      // l'une se paie maintenant, l'autre s'annonce pour une date.
      sens: Object.fromEntries(
        ciblesPossibles(ctx.produit).map((id) => [id, sensVers(ctx.produit, id)]),
      ),
      programme,
    });
  }

  const decision = deciderChangement({ actuelId: ctx.produit, cibleId: demande });
  if (!decision.ok || !decision.cible || !decision.proration) {
    return refus(decision.raison ?? "unreadable");
  }

  // UNE DESCENTE NE SE FACTURE PAS : elle s'annonce.
  //
  // Rien n'est prélevé aujourd'hui, et rien ne change avant l'échéance.
  // Ce que l'écran doit montrer, ce n'est donc pas un montant à payer,
  // c'est une DATE et le prix qui s'appliquera à partir d'elle.
  if (decision.quand === "fin-de-periode") {
    if (ctx.fournisseur === "paypal") return refus("descente_paypal");
    const fin = await finDePeriode({ key: ctx.key, subscriptionId: ctx.abonnementId });
    return NextResponse.json({
      ok: true,
      fournisseur: "stripe",
      actuel: ctx.produit,
      cible: decision.cible.id,
      sens: "descente",
      aPayerCents: 0,
      ensuiteCents: decision.cible.amountCents,
      currency: decision.cible.currency,
      prorata: false,
      effetLe: fin,
    });
  }

  // PAYPAL NE SAIT PAS FAIRE DE PRORATA.
  //
  // Il n'a pas d'équivalent de `proration_behavior` : changer le prix
  // d'un abonnement en cours passe par un nouvel accord du client et
  // n'applique le nouveau tarif qu'au cycle suivant. On ouvre donc un
  // abonnement neuf, et la personne paie le palier demandé, sans crédit
  // du temps déjà payé sur l'ancien. C'est la décision de Béné.
  //
  // On affiche quand même le MONTANT : ne pas expliquer le prorata est
  // une chose, laisser quelqu'un valider une somme qu'il ne connaît pas
  // en est une autre.
  if (ctx.fournisseur === "paypal") {
    return NextResponse.json({
      ok: true,
      fournisseur: "paypal",
      actuel: ctx.produit,
      cible: decision.cible.id,
      aPayerCents: decision.cible.amountCents,
      ensuiteCents: decision.cible.amountCents,
      currency: decision.cible.currency,
      prorata: false,
    });
  }

  const apercu = await apercuChangement({
    key: ctx.key,
    customerId: ctx.customerId,
    subscriptionId: ctx.abonnementId,
    itemId: ctx.itemId,
    cible: decision.cible,
    proration: decision.proration,
  });
  if (!apercu.ok) {
    console.error(`[change-plan] apercu refuse pour ${email} : ${apercu.detail ?? "?"}`);
    return refus("stripe_refused");
  }

  return NextResponse.json({
    ok: true,
    fournisseur: "stripe",
    actuel: ctx.produit,
    cible: decision.cible.id,
    // Ce qui part MAINTENANT, crédit du temps non consommé déduit. Le
    // montant vient de Stripe, jamais d'une soustraction faite ici : un
    // montant affiché différent du montant prélevé est pire que pas de
    // montant du tout.
    aPayerCents: apercu.aPayerCents ?? 0,
    ensuiteCents: apercu.ensuiteCents ?? decision.cible.amountCents,
    currency: apercu.currency ?? decision.cible.currency,
    prorata: true,
  });
}

// ── ON APPLIQUE ──────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const email = await adresseConnectee();
  if (!email) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { produit?: unknown; annuler?: unknown };
  const ctx = await contexteDe(email);
  if (!ctx.ok) return refus(ctx.raison);

  // ANNULER UN CHANGEMENT PROGRAMMÉ. Elle a changé d'avis avant
  // l'échéance : on détache le calendrier et l'abonnement reste
  // exactement ce qu'il est.
  if (body.annuler === true) {
    if (ctx.fournisseur !== "stripe") return refus("descente_paypal");
    const prog = await lireDescenteProgrammee({
      key: ctx.key,
      subscriptionId: ctx.abonnementId,
    });
    if (!prog) return NextResponse.json({ ok: true, rienAAnnuler: true });
    const out = await annulerDescenteProgrammee({ key: ctx.key, scheduleId: prog.scheduleId });
    if (!out.ok) {
      console.error(`[change-plan] annulation refusee pour ${email} : ${out.detail ?? "?"}`);
      return refus("stripe_refused");
    }
    console.log(`[change-plan] ${email} annule son changement programme.`);
    return NextResponse.json({ ok: true, annule: true });
  }

  const decision = deciderChangement({ actuelId: ctx.produit, cibleId: String(body.produit ?? "") });
  if (!decision.ok || !decision.cible || !decision.proration) {
    return refus(decision.raison ?? "unreadable");
  }

  // LA DESCENTE EST PROGRAMMÉE, PAS APPLIQUÉE.
  //
  // Rien n'est prélevé, rien ne change avant l'échéance, et l'accès
  // qu'elle a payé reste entier jusque là. Le plan sera ouvert par le
  // WEBHOOK le jour de la bascule, comme pour n'importe quelle vente.
  if (decision.quand === "fin-de-periode") {
    if (ctx.fournisseur === "paypal") return refus("descente_paypal");
    const r = await programmerDescente({
      key: ctx.key,
      subscriptionId: ctx.abonnementId,
      cible: decision.cible,
    });
    if (!r.ok) {
      console.error(`[change-plan] descente refusee pour ${email} : ${r.detail ?? "?"}`);
      return refus("stripe_refused");
    }
    console.log(
      `[change-plan] ${email} : ${ctx.produit ?? "?"} -> ${decision.cible.id} ` +
        `programme pour le ${r.effetLe}. Le plan sera ouvert par le webhook ce jour la.`,
    );
    return NextResponse.json({
      ok: true,
      fournisseur: "stripe",
      cible: decision.cible.id,
      label: decision.cible.label,
      programme: true,
      effetLe: r.effetLe,
    });
  }

  if (ctx.fournisseur === "paypal") {
    return monterViaPaypal(req, email, ctx.abonnementId, decision.cible);
  }

  const r = await appliquerChangement({
    key: ctx.key,
    subscriptionId: ctx.abonnementId,
    itemId: ctx.itemId,
    cible: decision.cible,
    proration: decision.proration,
  });
  if (!r.ok) {
    console.error(`[change-plan] refus Stripe pour ${email} : ${r.detail ?? "?"}`);
    return refus("stripe_refused");
  }

  console.log(
    `[change-plan] ${email} : ${ctx.produit ?? "?"} -> ${decision.cible.id} ` +
      `(abonnement ${r.subscriptionId}). Le plan sera ouvert par le webhook.`,
  );

  return NextResponse.json({
    ok: true,
    fournisseur: "stripe",
    cible: decision.cible.id,
    label: decision.cible.label,
  });
}

// ── LA MONTÉE DE PALIER CHEZ PAYPAL ──────────────────────────────────
//
// Béné, 23 août 2026 : "Pour paypal : on dit rien, on facture et on
// upgrade point barre. Les autres se posent moins de questions lol."
//
// On ouvre un abonnement neuf au palier demandé, et on arrête l'ancien
// UNE FOIS le nouveau activé (dans le webhook, jamais ici).
//
// L'ordre n'est pas un détail. Arrêter d'abord laisserait sans rien
// quelqu'un qui n'irait pas au bout de l'accord PayPal ; arrêter après
// veut dire qu'entre les deux il a les deux, quelques secondes. C'est le
// seul des deux risques qui se rattrape.
async function monterViaPaypal(
  req: NextRequest,
  email: string,
  ancienId: string,
  cible: import("@/lib/checkout/catalog").OwnerProduct,
): Promise<NextResponse> {
  const compte = readOwnerPaypal(process.env);
  if (!compte) return refus("not_configured");

  // Même garde que sur le bon de commande : sans identifiant de webhook,
  // rien ne pourrait vérifier l'activation, donc l'ancien abonnement ne
  // serait jamais arrêté et la personne serait prélevée deux fois.
  if (compte.mode === "live" && !readOwnerPaypalWebhookId(process.env)) {
    console.error("[change-plan] compte PayPal LIVE sans PAYPAL_WEBHOOK_ID_OWNER : montee refusee.");
    return refus("live_without_webhook");
  }

  const base = checkoutReturnBase(
    req.nextUrl.origin,
    resolveAppUrl(process.env.NEXT_PUBLIC_APP_URL, req.nextUrl.origin),
  );

  const result = await createOwnerPaypalSubscription({
    compte,
    product: cible,
    email,
    returnUrl: `${base}/commande/${cible.id}/retour`,
    cancelUrl: `${base}/settings`,
    // PAS de mois offert sur une montée : le cadeau sert à faire ESSAYER
    // Tiquiz, et elle l'utilise déjà. `essaiPourCeCheckout` le refuserait
    // de toute façon, mais ne pas le demander est plus clair que de
    // compter sur un refus.
    trialDays: 0,
    // C'est CE champ qui fera arrêter l'ancien, une fois le nouveau
    // activé. Le perdre laisserait deux abonnements prélever la même
    // personne.
    remplace: ancienId,
  });

  if (!result.ok || !result.approveUrl) {
    console.error(
      `[change-plan] PayPal a refuse pour ${email} : ${result.reason} / ${result.detail ?? ""}`,
    );
    return refus("paypal_refused");
  }

  console.log(
    `[change-plan] ${email} -> ${cible.id} chez PayPal ` +
      `(l'ancien ${ancienId} sera arrete a l'activation)`,
  );

  return NextResponse.json({
    ok: true,
    fournisseur: "paypal",
    cible: cible.id,
    label: cible.label,
    // L'écran DOIT l'ouvrir : PayPal demande son accord avant de
    // prélever le nouveau palier.
    approveUrl: result.approveUrl,
  });
}
