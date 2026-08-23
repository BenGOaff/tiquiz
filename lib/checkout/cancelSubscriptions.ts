// lib/checkout/cancelSubscriptions.ts
//
// UN SEUL ENDROIT QUI ARRÊTE UN ABONNEMENT, POUR LES DEUX BOUTONS.
//
// Béné, 23 août : un bouton pour la cliente (autonomie), un bouton dans
// l'admin (elle, pour dépanner). Deux écrans, une seule décision : si
// chacun écrivait la sienne, ils finiraient par se contredire. C'est le
// défaut le plus cher de ce dépôt (les réseaux de partage, le score,
// l'alignement du sous-titre, la disposition des réponses).
//
// -- POURQUOI ON REGARDE LES DEUX FOURNISSEURS -------------------------
//
// Une même personne peut avoir un abonnement Systeme.io (ses ventes
// historiques) ET un abonnement Stripe (notre bon de commande). Elles
// prélèvent séparément. N'en arrêter qu'un laisse l'autre tourner, et
// personne ne s'en aperçoit avant le relevé bancaire suivant.
//
// -- ET ON NE RETIRE JAMAIS UN PLAN "PARCE QU'ON N'A RIEN TROUVÉ" ------
//
// C'est le bug qu'on répare. L'ancienne route ne connaissait que
// Systeme.io : une abonnée Stripe tombait dans "aucun abonnement actif",
// son plan passait en gratuit, et Stripe continuait de la prélever.
//
// Règle : on n'aligne le plan sur `free` que si les DEUX contrôles ont
// pu s'exécuter et n'ont rien trouvé. Un contrôle en erreur veut dire
// "je ne sais pas", jamais "il n'y a rien".

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { downgradeToFreeByEmail } from "@/lib/checkout/grantPlan";
import { readOwnerPaypal, readOwnerStripe } from "@/lib/checkout/ownerAccount";
import { cancelOwnerPaypalSubscription } from "@/lib/checkout/paypalOwner";
import {
  annulerAbonnementOwner,
  listerAbonnementsOwner,
  type CancelQuand,
} from "@/lib/checkout/subscriptionCancel";
import {
  cancelSubscription,
  findContactByEmail,
  listSubscriptionsForContact,
} from "@/lib/systemeIoClient";

/** Les plans qui n'ont AUCUN abonnement derrière : rien à arrêter. */
const PLANS_A_VIE: ReadonlySet<string> = new Set(["beta", "lifetime"]);

export interface AbonnementArrete {
  fournisseur: "stripe" | "paypal" | "systeme-io";
  id: string;
  /** La date jusqu'à laquelle l'accès est payé, en ISO. */
  finLe: string | null;
}

export interface AnnulationResultat {
  ok: boolean;
  /** Ce qui a vraiment été arrêté. Vide et `ok` : il n'y avait rien. */
  arretes: AbonnementArrete[];
  /** Le plan a-t-il été retiré tout de suite ? */
  planRetire: boolean;
  /** Aucun abonnement vivant, chez aucun des deux fournisseurs. */
  aucunAbonnement: boolean;
  /** Renseignée quand `ok` est faux. */
  reason?: string;
  /** Le plan porté avant l'appel, pour l'écran qui affiche le résultat. */
  planAvant: string | null;
}

/**
 * Arrête tous les abonnements vivants de cette adresse.
 *
 * `quand` est un PARAMÈTRE OBLIGATOIRE, jamais deviné : c'est ce qui
 * distingue une annulation (elle garde ce qu'elle a payé) d'un
 * remboursement (l'argent repart, l'accès aussi).
 */
export async function annulerAbonnementsDe(args: {
  email: string;
  quand: CancelQuand;
  /** D'où vient la demande, pour le journal des changements de plan. */
  source: string;
}): Promise<AnnulationResultat> {
  const email = String(args.email ?? "").trim().toLowerCase();
  if (!email.includes("@")) {
    return { ok: false, arretes: [], planRetire: false, aucunAbonnement: false, reason: "invalid_email", planAvant: null };
  }

  const { data: profil } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  const planAvant =
    String((profil as { plan?: string | null } | null)?.plan ?? "").trim().toLowerCase() || null;

  if (!planAvant || planAvant === "free") {
    return { ok: false, arretes: [], planRetire: false, aucunAbonnement: true, reason: "already_free", planAvant };
  }
  if (PLANS_A_VIE.has(planAvant)) {
    // Double protection : l'écran cache le bouton, et la route refuse
    // quand même. Un plan à vie n'a pas d'abonnement à arrêter, et le
    // retirer serait un accès payé qui disparaît.
    return { ok: false, arretes: [], planRetire: false, aucunAbonnement: true, reason: "lifetime_plan", planAvant };
  }

  const arretes: AbonnementArrete[] = [];
  let toutLu = true;
  let echec: string | null = null;

  // ── STRIPE, notre bon de commande ──
  const compte = readOwnerStripe(process.env);
  const clientStripe =
    String((profil as { stripe_customer_id?: string | null } | null)?.stripe_customer_id ?? "").trim();
  if (compte && clientStripe) {
    const liste = await listerAbonnementsOwner(compte.key, clientStripe);
    if (!liste.ok) toutLu = false;
    for (const abo of liste.abonnements) {
      const r = await annulerAbonnementOwner(compte.key, abo.id, args.quand);
      if (r.ok) {
        arretes.push({ fournisseur: "stripe", id: abo.id, finLe: r.finLe ?? abo.finLe });
      } else {
        toutLu = false;
        echec = echec ?? r.reason ?? "provider_refused";
      }
    }
  } else if (clientStripe && !compte) {
    // On SAIT qu'elle a payé chez nous et on ne peut pas vérifier : ne
    // surtout pas conclure qu'il n'y a rien.
    toutLu = false;
    echec = echec ?? "not_configured";
  }

  // ── PAYPAL, notre bon de commande aussi ──
  //
  // **PayPal ne connaît pas la fin de période.** Chez Stripe,
  // `cancel_at_period_end` laisse l'accès courir jusqu'à la date payée ;
  // ici, `cancel` arrête le prélèvement tout de suite, et c'est tout ce
  // que PayPal sait faire. On ne fait donc PAS semblant : le
  // prélèvement s'arrête maintenant dans les deux cas, et c'est NOUS qui
  // tenons l'accès jusqu'à la date déjà payée quand elle a choisi la fin
  // de période (le plan n'est pas retiré plus bas).
  //
  // Conséquence honnête, à dire à l'écran : sur PayPal, "fin de période"
  // veut dire "tu gardes l'accès jusqu'à la date payée", pas "PayPal te
  // prélèvera encore une fois".
  const comptePaypal = readOwnerPaypal(process.env);
  const aboPaypal =
    String((profil as { paypal_subscription_id?: string | null } | null)?.paypal_subscription_id ?? "").trim();
  if (comptePaypal && aboPaypal) {
    const r = await cancelOwnerPaypalSubscription({
      compte: comptePaypal,
      subscriptionId: aboPaypal,
      raison: args.quand === "immediat" ? "Remboursement" : "Annulation demandee",
    });
    if (r.ok) {
      arretes.push({ fournisseur: "paypal", id: aboPaypal, finLe: null });
    } else {
      toutLu = false;
      echec = echec ?? r.reason ?? "provider_refused";
    }
  } else if (aboPaypal && !comptePaypal) {
    // On SAIT qu'il a payé en PayPal et on ne peut pas vérifier : ne
    // surtout pas conclure qu'il n'y a rien.
    toutLu = false;
    echec = echec ?? "not_configured";
  }

  // ── SYSTEME.IO, les ventes historiques ──
  let contactId = Number((profil as { sio_contact_id?: unknown } | null)?.sio_contact_id ?? 0);
  if (!Number.isFinite(contactId) || contactId <= 0) {
    try {
      const trouve = await findContactByEmail(email);
      contactId = trouve?.id ?? 0;
    } catch (e) {
      console.error(`[abonnement] contact Systeme.io illisible pour ${email} : ${(e as Error).message}`);
      toutLu = false;
      contactId = 0;
    }
  }
  if (contactId > 0) {
    try {
      const subs = await listSubscriptionsForContact(contactId, { limit: 50, order: "desc" });
      const vivants = subs.filter((s) => {
        const st = String(s.status ?? "").toLowerCase();
        return st === "active" || st === "trialing";
      });
      for (const s of vivants) {
        await cancelSubscription({
          id: String(s.id),
          cancel: args.quand === "immediat" ? "Now" : "WhenBillingCycleEnds",
        });
        arretes.push({ fournisseur: "systeme-io", id: String(s.id), finLe: null });
      }
    } catch (e) {
      console.error(`[abonnement] Systeme.io injoignable pour ${email} : ${(e as Error).message}`);
      toutLu = false;
      echec = echec ?? "sio_unreachable";
    }
  }

  // ── CE QU'ON FAIT DU PLAN ──
  //
  // Rien arrêté et tout lu : les deux fournisseurs sont muets, donc plus
  // personne ne la prélève. On aligne le plan, c'est le cas de la
  // cliente dont l'abonnement a été annulé ailleurs et qui reste bloquée
  // sur un plan payant.
  //
  // Rien arrêté mais un contrôle en erreur : on ne touche à RIEN. C'est
  // exactement le bug qu'on répare.
  const rienTrouve = arretes.length === 0;
  if (rienTrouve && !toutLu) {
    return {
      ok: false,
      arretes,
      planRetire: false,
      aucunAbonnement: false,
      reason: echec ?? "unreadable",
      planAvant,
    };
  }

  const retirerMaintenant = args.quand === "immediat" || rienTrouve;
  let planRetire = false;
  if (retirerMaintenant) {
    const sortie = await downgradeToFreeByEmail({
      email,
      source: args.source,
      reference: arretes.map((a) => a.id).join(",") || null,
    });
    planRetire = sortie.ok && !sortie.skipped;
  } else {
    // Fin de période : le plan RESTE, elle a payé jusque là. C'est le
    // webhook `customer.subscription.deleted` qui coupera le jour venu,
    // donc une seule décision, à un seul endroit.
    try {
      await supabaseAdmin.from("plan_change_log").insert({
        target_email: email,
        old_plan: planAvant,
        new_plan: planAvant,
        reason: `${args.source}:fin_de_periode:${arretes.map((a) => a.id).join(",")}`,
      });
    } catch {
      // journal best-effort : il ne doit jamais empêcher une annulation.
    }
  }

  return { ok: true, arretes, planRetire, aucunAbonnement: rienTrouve, planAvant };
}
