// app/api/commande/paypal/webhook/route.ts
//
// PAYPAL NOUS DIT CE QUI ARRIVE À L'ABONNEMENT.
//
// C'est CE fichier qui ouvre et ferme l'accès, jamais la page de retour :
// beaucoup d'acheteurs ne la voient jamais (paiement sur mobile, onglet
// fermé). Un accès qui en dépend, c'est le drame Ivan à l'identique.
//
// -- LES QUATRE GARANTIES, LES MÊMES QUE CÔTÉ STRIPE -------------------
//
// 1. **La signature**, vérifiée avant tout traitement. PayPal ne signe
//    pas avec un secret partagé : on lui REDEMANDE s'il a bien émis
//    l'événement, et cette question exige `PAYPAL_WEBHOOK_ID_OWNER`.
// 2. **L'idempotence**, par l'index unique `(source, event_id)` de
//    `webhook_logs`. PayPal réessaie, un même événement ne doit ouvrir
//    l'accès qu'une fois.
// 3. **On relit l'abonnement chez PayPal** au lieu de croire le corps
//    reçu : la signature prouve l'expéditeur, pas la fraîcheur.
// 4. **Le plan vient du catalogue**, jamais d'une devinette.
//
// -- CE QUI COUPE, ET CE QUI NE COUPE PAS ------------------------------
//
// `CANCELLED` et `EXPIRED` ferment l'accès : l'abonnement est fini.
// `SUSPENDED` ne le ferme PAS. PayPal suspend après trois échecs de
// prélèvement, et couper là mettrait dehors quelqu'un dont la carte
// vient d'expirer et qui va la changer. Même règle que Stripe, qui ne
// coupe pas sur `invoice.payment_failed`. On le journalise fort : c'est
// une situation qui mérite un humain.
//
// On répond 200 même quand on n'a rien fait : un 500 sur un cas compris
// et écarté déclencherait des réessais en boucle.

import { NextRequest, NextResponse } from "next/server";

import { annulerCommissionVente, commissionnerVente } from "@/lib/affiliate/ownerSale";
import { findOwnerProduct } from "@/lib/checkout/catalog";
import { downgradeToFreeByEmail, grantPlanByEmail } from "@/lib/checkout/grantPlan";
import {
  readOwnerPaypal,
  readOwnerPaypalWebhookId,
  type OwnerPaypalAccount,
} from "@/lib/checkout/ownerAccount";
import {
  cancelOwnerPaypalSubscription,
  getOwnerPaypalSubscription,
  verifyOwnerPaypalWebhook,
} from "@/lib/checkout/paypalOwner";
import { rememberPaypalSubscription } from "@/lib/checkout/customerLink";
import { construireFacture } from "@/lib/facture/construire";
import { lireAcheteur } from "@/lib/facture/identite";
import {
  encaissementDepuisSale,
  remboursementDepuisRefund,
  type EncaissementPaypal,
  type RemboursementPaypal,
} from "@/lib/facture/paypalVente";
import { emettreFacture, factureDeLaVente, lireFacturation } from "@/lib/facture/store";
import { verifierVies } from "@/lib/facture/vies";
import { marquerMoisOffertConsomme } from "@/lib/trial/moisOffertCheckout";
import { marquerTraite, prendreLeVerrou } from "@/lib/webhooks/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SOURCE = "paypal";

interface EvenementPaypal {
  id?: string;
  event_type?: string;
  /** L'heure de l'événement chez PayPal. Repli pour dater une facture. */
  create_time?: string;
  resource?: {
    id?: string;
    status?: string;
    /** Sur un PAYMENT.SALE.*, l'abonnement qui a produit ce prélèvement. */
    billing_agreement_id?: string;
    amount?: { total?: string | null; currency?: string | null } | null;
    /** Sur un PAYMENT.SALE.REFUNDED, la vente d'origine. */
    sale_id?: string;
    create_time?: string;
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Le corps BRUT d'abord : la vérification porte sur les octets reçus.
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ ok: false, reason: "unreadable" }, { status: 400 });
  }

  const compte = readOwnerPaypal(process.env);
  const webhookId = readOwnerPaypalWebhookId(process.env);
  if (!compte || !webhookId) {
    console.error(
      "[commande/paypal/webhook] compte ou PAYPAL_WEBHOOK_ID_OWNER absent : " +
        "impossible de verifier quoi que ce soit, on refuse.",
    );
    // 503 et pas 200 : PayPal réessaiera, et une fois la variable posée
    // les ventes de l'intervalle rentreront toutes seules.
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }

  const signe = await verifyOwnerPaypalWebhook({
    compte,
    webhookId,
    headers: req.headers,
    rawBody: raw,
  });
  if (!signe) {
    console.warn("[commande/paypal/webhook] signature refusee");
    return NextResponse.json({ ok: false, reason: "bad_signature" }, { status: 401 });
  }

  let event: EvenementPaypal;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, reason: "unreadable" }, { status: 400 });
  }

  const eventId = String(event.id ?? "").trim() || null;
  const eventType = String(event.event_type ?? "").trim() || null;

  // ── LE VERROU ──
  //
  // Il journalise ET dit si on a le droit de travailler. Avant l'audit
  // du 24 aout, toute ligne existante etait prise pour un doublon : un
  // traitement rate repondait 502 pour demander un reessai, et ce
  // reessai recevait 200 sans rien faire.
  const verrou = await prendreLeVerrou({
    source: SOURCE,
    event_id: eventId,
    event_type: eventType,
    payload: event as unknown as Record<string, unknown>,
    status: "processing",
  });
  if (verrou.action === "doublon") {
    return NextResponse.json({ ok: true, reason: "deja_traite" });
  }
  if (verrou.action === "en_cours") {
    // 409 : PayPal reessaiera. Repondre 200 ici perdrait l'ouverture de
    // l'acces si le traitement en cours echoue.
    return NextResponse.json({ ok: false, reason: "en_cours" }, { status: 409 });
  }

  // LE MARQUAGE EST OBLIGATOIRE, quelle que soit la sortie.
  let reponse: NextResponse;
  try {
    reponse = await traiterEvenement(req, compte, event, eventId, eventType);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[commande/paypal/webhook] traitement interrompu : ${message}`);
    await marquerTraite(SOURCE, eventId, "error", message.slice(0, 500));
    return NextResponse.json({ ok: false, reason: "exception" }, { status: 500 });
  }
  const reussi = reponse.status >= 200 && reponse.status < 300;
  await marquerTraite(SOURCE, eventId, reussi ? "processed" : "error", reussi ? null : `HTTP ${reponse.status}`);
  return reponse;
}

/**
 * Le traitement proprement dit, une fois le verrou pris.
 *
 * Separe de `POST` pour une seule raison : TOUTES ses sorties doivent
 * passer par le marquage, et un `return` oublie au milieu laisserait
 * l'evenement bloque en `processing`.
 */
/**
 * LA FACTURE DE L'ÉCHÉANCE.
 *
 * Béné, 24 août : "PayPal envoie des factures auto ? Si non il faut
 * qu'on les créée..." Vérifié dans notre code, et c'est la seule
 * vérification qui tranche : `lib/checkout/paypalOwner.ts` n'appelle
 * AUCUN point d'entrée de facturation, et l'abonnement qu'on crée ne
 * porte ni adresse ni numéro de TVA. Aucune facture n'existait donc pour
 * une vente PayPal, quoi que PayPal envoie de son côté (un avis de
 * paiement n'est pas une facture : ni numérotation, ni identité complète
 * du vendeur, ni adresse de l'acheteur, ni ventilation de TVA).
 *
 * ON N'ÉCHOUE JAMAIS ICI. Le client a payé, son accès est ouvert : un
 * problème de facturation ne doit pas transformer la réponse en 502,
 * qui ferait rejouer l'ouverture d'accès. On journalise fort, et la
 * facture manquante se rattrape depuis la fiche client.
 */
async function facturerEcheance(args: {
  email: string;
  encaissement: EncaissementPaypal;
  productId: string | null;
  libelle: string;
}): Promise<void> {
  try {
    const acheteur = await lireFacturation({ email: args.email });
    // ON DEMANDE A VIES, ET ON N'ATTEND JAMAIS APRES LUI (Bene, 27 aout
    // 2026 : "un numero bien forme mais inexistant produit une
    // autoliquidation injustifiee, donc de la TVA a ta charge").
    //
    // `verifierVies` ne leve pas et rend `injoignable` au bout de six
    // secondes : la facture sort alors marquee, comme avant. Une piece
    // comptable qui attendrait la Commission europeenne serait pire.
    const vies = acheteur?.tvaNumero
      ? await verifierVies(acheteur.tvaNumero)
      : ("non-verifie" as const);
    const facture = construireFacture(
      "facture",
      {
        provider: "paypal",
        saleRef: args.encaissement.saleRef,
        productId: args.productId,
        libelle: args.libelle,
        currency: args.encaissement.currency,
        totalCents: args.encaissement.totalCents,
        paidAt: args.encaissement.paidAt,
        emailCle: args.email,
      },
      acheteur,
      vies,
    );
    const ligne = await emettreFacture(facture);
    if (!ligne) return;
    console.log(
      `[commande/paypal/webhook] facture ${ligne.numero} emise pour ${args.email}` +
        (facture.aCompleter.length ? ` (a completer : ${facture.aCompleter.join(", ")})` : ""),
    );
  } catch (e) {
    console.error(`[commande/paypal/webhook] facture NON emise : ${(e as Error).message}`);
  }
}

/**
 * L'AVOIR. Un remboursement n'efface pas une facture, il en émet une
 * autre en négatif qui la référence : c'est la loi, et c'est aussi la
 * seule façon de garder une numérotation continue.
 */
async function avoirDuRemboursement(args: {
  email: string;
  remboursement: RemboursementPaypal;
  productId: string | null;
  libelle: string;
}): Promise<void> {
  try {
    const origine = args.remboursement.saleRef
      ? await factureDeLaVente("paypal", args.remboursement.saleRef)
      : null;
    // L'identité vient de la FACTURE D'ORIGINE quand elle existe : un
    // avoir doit porter la même adresse que ce qu'il annule, même si le
    // client a déménagé depuis.
    const acheteur = origine
      ? lireAcheteur(origine.acheteur)
      : await lireFacturation({ email: args.email });
    // UN AVOIR NE REJUGE PAS LA TVA DE LA FACTURE QU'IL ANNULE.
    //
    // Il porte la meme identite (voir juste au dessus) et doit porter le
    // meme regime : un numero devenu invalide entre temps, ou un VIES
    // injoignable ce jour la, produirait un avoir a 21 % pour annuler
    // une facture a 0 %, et les deux pieces ne se compenseraient plus.
    // `non-verifie` reproduit exactement le calcul d'origine.
    const avoir = construireFacture(
      "avoir",
      {
        provider: "paypal",
        saleRef: args.remboursement.refundRef,
        productId: args.productId,
        libelle: origine ? `Remboursement - ${origine.libelle}` : `Remboursement - ${args.libelle}`,
        currency: args.remboursement.currency,
        totalCents: args.remboursement.totalCents,
        paidAt: args.remboursement.paidAt,
        emailCle: args.email,
      },
      acheteur,
      "non-verifie",
    );
    const ligne = await emettreFacture(avoir, origine?.id ?? null);
    if (ligne) {
      console.log(
        `[commande/paypal/webhook] avoir ${ligne.numero} emis pour ${args.email}` +
          (origine ? ` (annule ${origine.numero})` : " (facture d'origine introuvable)"),
      );
    }
  } catch (e) {
    console.error(`[commande/paypal/webhook] avoir NON emis : ${(e as Error).message}`);
  }
}

async function traiterEvenement(
  req: NextRequest,
  compte: OwnerPaypalAccount,
  event: EvenementPaypal,
  eventId: string | null,
  eventType: string | null,
): Promise<NextResponse> {

  // L'ABONNEMENT CONCERNÉ.
  //
  // Sur un `BILLING.SUBSCRIPTION.*`, c'est la ressource elle même. Sur un
  // `PAYMENT.SALE.*`, c'est `billing_agreement_id`. Un événement sans
  // aucun des deux ne nous concerne pas : ce compte PayPal encaisse
  // aussi l'Atelier, dont les commandes ont leur propre webhook.
  const abonnementId =
    String(event.resource?.billing_agreement_id ?? "").trim() ||
    (eventType?.startsWith("BILLING.SUBSCRIPTION.")
      ? String(event.resource?.id ?? "").trim()
      : "");

  if (!abonnementId) {
    return NextResponse.json({ ok: true, ignored: eventType ?? "sans_abonnement" });
  }

  // ON RELIT CHEZ PAYPAL, on ne croit pas le corps reçu.
  const abo = await getOwnerPaypalSubscription({ compte, subscriptionId: abonnementId });
  if (!abo) {
    console.error(
      `[commande/paypal/webhook] abonnement ${abonnementId} illisible chez PayPal (${eventType})`,
    );
    // 502 : on VEUT le réessai, quelqu'un a peut-être payé.
    return NextResponse.json({ ok: false, reason: "unreadable_subscription" }, { status: 502 });
  }

  if (!abo.email) {
    console.error(
      `[commande/paypal/webhook] abonnement ${abonnementId} sans adresse : acces impossible. ` +
        `Intervention necessaire.`,
    );
    return NextResponse.json({ ok: true, reason: "no_email" });
  }

  // ── CE QUI FERME L'ACCÈS ──
  if (eventType === "BILLING.SUBSCRIPTION.CANCELLED" || eventType === "BILLING.SUBSCRIPTION.EXPIRED") {
    const sortie = await downgradeToFreeByEmail({
      email: abo.email,
      source: "paypal_cancel",
      reference: abonnementId,
    });
    console.log(
      `[commande/paypal/webhook] ${eventType} pour ${abo.email} : ` +
        `${sortie.skipped ? `rien a retirer (${sortie.skipped})` : `plan ${sortie.previousPlan} retire`}`,
    );
    return NextResponse.json({ ok: true });
  }

  // ── CE QUI NE FERME RIEN, ET QUI DOIT SE VOIR ──
  if (eventType === "BILLING.SUBSCRIPTION.SUSPENDED") {
    console.error(
      `[commande/paypal/webhook] abonnement ${abonnementId} SUSPENDU par PayPal (${abo.email}) : ` +
        `acces conserve, prelevement arrete. A regarder, c'est un client qui va partir.`,
    );
    return NextResponse.json({ ok: true, reason: "suspended" });
  }

  // ── UN REMBOURSEMENT : l'argent repart, l'accès aussi ──
  if (eventType === "PAYMENT.SALE.REFUNDED") {
    const sortie = await downgradeToFreeByEmail({
      email: abo.email,
      source: "paypal_refund",
      reference: abonnementId,
    });
    // Rembourser sans arrêter l'abonnement re-prélève le mois suivant
    // quelqu'un qui n'a plus rien. Même règle que côté Stripe.
    const stop = await cancelOwnerPaypalSubscription({
      compte,
      subscriptionId: abonnementId,
      raison: "Remboursement",
    });
    if (!stop.ok) {
      console.error(
        `[commande/paypal/webhook] REMBOURSEMENT de ${abo.email} : abonnement NON arrete ` +
          `(${stop.reason}). A arreter A LA MAIN dans PayPal, sinon il sera preleve le mois prochain.`,
      );
    }
    const remboursement = remboursementDepuisRefund(event.resource, event.create_time);

    // LA COMMISSION DE CETTE ÉCHÉANCE LÀ TOMBE, pas les précédentes.
    //
    // Les mois déjà encaissés ont été gagnés et restent acquis : c'est
    // la règle de Béné ("on arrête de payer s'il se barre", pas "on
    // reprend ce qui a été versé"). On vise donc la VENTE remboursée.
    //
    // L'abonnement est passé en plus, pour les lignes d'avant le 26 août
    // qui étaient encore commissionnées à l'activation : sans lui, ces
    // commissions là survivraient à un remboursement.
    await annulerCommissionVente({
      references: [
        remboursement?.saleRef ? `paypal:${remboursement.saleRef}` : null,
        `stripe:${abonnementId}`,
      ],
      motif: "remboursement",
    });
    if (remboursement) {
      await avoirDuRemboursement({
        email: abo.email,
        remboursement,
        productId: abo.productId,
        libelle: findOwnerProduct(abo.productId)?.label ?? "Abonnement Tiquiz",
      });
    }

    console.log(
      `[commande/paypal/webhook] remboursement pour ${abo.email} : ` +
        `${sortie.skipped ? `rien a retirer (${sortie.skipped})` : "plan retire"}`,
    );
    return NextResponse.json({ ok: true });
  }

  // ── LE PRÉLÈVEMENT RÉCURRENT : on l'enregistre, on ne touche à rien ──
  if (eventType === "PAYMENT.SALE.COMPLETED") {
    console.log(
      `[commande/paypal/webhook] echeance encaissee pour ${abo.email} ` +
        `(${event.resource?.amount?.total ?? "?"} EUR, abonnement ${abonnementId})`,
    );
    // C'EST ICI QU'ON FACTURE, et pas à l'activation : un abonnement qui
    // démarre par un mois offert est ACTIVÉ sans qu'un euro ait bougé.
    // Cet événement arrive à chaque échéance, donc la première comme les
    // suivantes, et il porte le montant RÉELLEMENT encaissé (une remise
    // comprise).
    const encaissement = encaissementDepuisSale(event.resource, event.create_time);
    if (encaissement) {
      await facturerEcheance({
        email: abo.email,
        encaissement,
        productId: abo.productId,
        libelle: findOwnerProduct(abo.productId)?.label ?? "Abonnement Tiquiz",
      });
    } else {
      console.error(
        `[commande/paypal/webhook] echeance sans montant lisible pour ${abo.email} : ` +
          `facture NON emise, a faire a la main.`,
      );
    }

    // ── LA COMMISSION, CHAQUE MOIS OÙ LE CLIENT RESTE ABONNÉ ──
    //
    // Béné, 26 août : "on paye bien 40% chaque mois où [le client] reste
    // abonné, pas une seule fois... on arrête de payer s'il se barre
    // c'est tout."
    //
    // C'EST DONC ICI, et nulle part ailleurs : cet événement arrive à
    // CHAQUE prélèvement, et il porte la somme réellement encaissée
    // (une remise comprise). L'activation, elle, ne commissionne plus
    // du tout : sur un abonnement qui démarre par un mois offert,
    // PayPal active sans qu'un euro ait bougé.
    //
    // **La clé est la VENTE, jamais l'abonnement.** Avec l'abonnement
    // pour clé, la deuxième échéance tombait sur la contrainte
    // d'unicité et l'affilié ne touchait plus rien à partir du
    // deuxième mois.
    if (encaissement && encaissement.totalCents > 0) {
      const produit = findOwnerProduct(abo.productId);
      if (produit) {
        await commissionnerVente({
          moyen: "paypal",
          email: abo.email,
          reference: encaissement.saleRef,
          affiliateRef: abo.affiliateRef,
          affiliateCode: abo.affiliateCode,
          amountTotalCents: encaissement.totalCents,
          amountTaxCents: 0,
          product: { id: produit.id, label: produit.label },
        });
      }
    }
    return NextResponse.json({ ok: true, reason: "echeance" });
  }

  // ── CE QUI OUVRE L'ACCÈS ──
  if (eventType !== "BILLING.SUBSCRIPTION.ACTIVATED") {
    return NextResponse.json({ ok: true, ignored: eventType });
  }

  const product = findOwnerProduct(abo.productId);
  if (!product) {
    // Un abonnement payé dont on ne sait pas nommer le produit. On
    // n'invente pas de plan, et on ne se tait pas : c'est la situation
    // exacte d'Ivan, elle appelle une action humaine.
    console.error(
      `[commande/paypal/webhook] abonnement ${abonnementId} ACTIF pour un produit inconnu ` +
        `(${abo.productId}) : plan NON ouvert, intervention necessaire.`,
    );
    return NextResponse.json({ ok: true, reason: "unknown_product" });
  }

  const octroi = await grantPlanByEmail({
    email: abo.email,
    plan: product.plan,
    source: "paypal",
    reference: abonnementId,
    requestOrigin: req.nextUrl.origin,
    planLabel: product.label,
  });

  if (!octroi.ok) {
    console.error(
      `[commande/paypal/webhook] plan NON ouvert pour ${abo.email} (${octroi.reason ?? "inconnu"})`,
    );
    return NextResponse.json({ ok: false, reason: octroi.reason ?? "grant_failed" }, { status: 502 });
  }

  // LE FIL VERS PAYPAL, pour pouvoir arrêter l'abonnement plus tard.
  // Sans lui, le bouton "Arrêter l'abonnement" ne saurait pas quoi
  // arrêter, et le prélèvement continuerait après la fermeture de
  // l'accès. APRÈS l'octroi : c'est lui qui crée le profil.
  const lien = await rememberPaypalSubscription({
    email: abo.email,
    subscriptionId: abonnementId,
  });
  if (!lien.ok) {
    console.warn(
      `[commande/paypal/webhook] abonnement ${abonnementId} non rattache a ${abo.email} ` +
        `(${lien.reason}) : il faudra l'arreter a la main chez PayPal.`,
    );
  }

  console.log(
    `[commande/paypal/webhook] plan ouvert pour ${abo.email} : ${product.id} (${product.plan}), ` +
      `compte ${octroi.created ? "cree" : "existant"}, confirmation ${octroi.loginLinkSent ? "envoyee" : "NON ENVOYEE"}`,
  );

  // ── LE MOIS OFFERT EST CONSOMMÉ ──
  //
  // ICI et pas au bon de commande : un paiement abandonné ne doit pas
  // brûler le cadeau. Le nombre de jours est LU dans le `custom_id`, il
  // n'est pas déduit d'un `sa` présent.
  if (abo.trialDays > 0) {
    await marquerMoisOffertConsomme({
      email: abo.email,
      ref: abo.affiliateCode,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });
  }

  // ── LA COMMISSION DE L'AFFILIÉE ──
  //
  // **Sur le TTC, et c'est une décision de Béné** (22 août : "pour paypal :
  // oui on garde le TTC"). PayPal ne ventile pas la TVA comme Stripe Tax,
  // donc il n'y a pas de HT à isoler : passer une taxe à zéro dit la
  // vérité de cette vente là, au lieu d'inventer un taux. L'affiliée
  // touche donc un peu plus sur une vente PayPal que sur une vente carte,
  // et c'est assumé.
  // ── L'ACTIVATION NE COMMISSIONNE RIEN ──
  //
  // Elle ouvre l'accès, elle ne fait pas rentrer d'argent : un
  // abonnement qui démarre par un mois offert est ACTIVÉ sans qu'un euro
  // ait bougé. Et comme la commission est RÉCURRENTE (Béné, 26 août :
  // "on paye tous les mois"), il n'y a plus de "première fois" à
  // traiter à part : chaque `PAYMENT.SALE.COMPLETED` la crée, y compris
  // celui du premier prélèvement, qui suit l'activation de près.
  //
  // Une mécanique en moins, donc un endroit en moins où l'oublier.

  // ── LA MONTÉE DE PALIER : ON ARRÊTE L'ANCIEN, MAINTENANT SEULEMENT ──
  //
  // Béné, 23 août : "Pour paypal : on dit rien, on facture et on upgrade
  // point barre." PayPal ne sait pas changer le prix d'un abonnement en
  // cours sans repasser par l'accord du client : on en ouvre donc un
  // nouveau, et on arrête l'ancien ICI, une fois le nouveau ACTIVÉ.
  //
  // L'ordre n'est pas un détail. Arrêter d'abord laisserait sans rien
  // quelqu'un qui n'irait pas au bout de l'accord PayPal ; arrêter ici
  // veut dire qu'entre les deux il a payé les deux, pendant quelques
  // secondes. C'est le seul des deux risques qui se rattrape.
  if (abo.remplace) {
    const arret = await cancelOwnerPaypalSubscription({
      compte,
      subscriptionId: abo.remplace,
      raison: "Montee de palier",
    });
    if (!arret.ok) {
      // On CRIE : deux abonnements qui prélèvent la même personne, c'est
      // un remboursement et un client perdu. Le 200 reste, sinon PayPal
      // rejouerait l'ouverture du plan en boucle.
      console.error(
        `[commande/paypal/webhook] ancien abonnement ${abo.remplace} NON arrete pour ` +
          `${abo.email} (${arret.reason ?? "?"}) : A ARRETER A LA MAIN chez PayPal, ` +
          `sinon il est preleve DEUX fois.`,
      );
    } else {
      console.log(
        `[commande/paypal/webhook] ${abo.email} : ancien abonnement ${abo.remplace} arrete ` +
          `apres la montee vers ${product.id}`,
      );
    }
  }

  return NextResponse.json({ ok: true });
}
