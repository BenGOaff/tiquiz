// lib/checkout/customerLink.ts
//
// ON GARDE LE FIL ENTRE UN COMPTE TIQUIZ ET SON CLIENT STRIPE.
//
// Sans ce fil, l'abonné ne peut pas changer sa carte, on ne peut pas
// retrouver son abonnement, et le tableau de bord ne peut rapprocher une
// vente d'un compte que par l'adresse email, qui change.
//
// -- POURQUOI ON NE L'AVAIT PAS ----------------------------------------
//
// Le chantier du bon de commande ne s'était fixé qu'un objectif :
// "l'argent rentre, l'accès s'ouvre". Il le fait bien. Mais il jetait
// l'identifiant du client Stripe, qui ne servait à rien ce jour là et
// devient indispensable dès qu'on veut faire vivre l'abonnement.
//
// -- ON N'ÉCRASE PAS UN LIEN EXISTANT PAR DU VIDE ----------------------
//
// Une écriture naïve remettrait la colonne à `null` au premier événement
// qui n'en porte pas, et l'abonné perdrait son bouton sans que personne
// ne comprenne pourquoi.

import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Retient le client Stripe d'un compte, à partir de son adresse.
 *
 * Ne jette jamais : rater ce lien ne doit pas faire échouer un webhook
 * qui vient d'ouvrir un accès. Un accès ouvert sans le lien est un
 * désagrément ; un webhook en erreur qui rejoue en boucle est un vrai
 * problème.
 */
export async function rememberStripeCustomer(args: {
  email: string;
  customerId: string | null | undefined;
}): Promise<{ ok: boolean; reason?: string }> {
  const email = String(args.email ?? "").trim().toLowerCase();
  const customer = String(args.customerId ?? "").trim();
  if (!email) return { ok: false, reason: "no_email" };
  if (!customer) return { ok: false, reason: "no_customer" };

  try {
    // On passe par `auth.users` : `profiles` est indexe sur l'utilisateur,
    // pas sur l'adresse, et c'est deja comme ca que le reste du chantier
    // retrouve un compte.
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ stripe_customer_id: customer })
      .eq("email", email)
      .select("user_id");

    if (error) throw error;
    if (!data || data.length === 0) {
      // Pas de profil a cette adresse : ce n'est pas une panne, c'est un
      // achat dont le compte n'existe pas encore ou porte une autre
      // adresse. On le dit sans crier.
      return { ok: false, reason: "no_profile" };
    }
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(
      `[customerLink] lien Stripe NON enregistre pour ${email} : ${message}. ` +
        `Si la colonne est absente, appliquer supabase/migrations/20260821_stripe_customer.sql.`,
    );
    return { ok: false, reason: "write_failed" };
  }
}

/** Le client Stripe de ce compte, ou `null` s'il n'en a pas. */
export async function readStripeCustomerId(userId: string): Promise<string | null> {
  const id = String(userId ?? "").trim();
  if (!id) return null;
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", id)
      .maybeSingle();
    if (error) throw error;
    const v = String(data?.stripe_customer_id ?? "").trim();
    return v || null;
  } catch (e) {
    console.error(
      `[customerLink] lecture du lien Stripe impossible : ${e instanceof Error ? e.message : String(e)}`,
    );
    return null;
  }
}

/**
 * LE FIL VERS PAYPAL, l'équivalent du client Stripe.
 *
 * Sans lui, le bouton "Arrêter l'abonnement" ne saurait pas QUOI
 * arrêter : on fermerait l'accès en laissant le prélèvement tourner,
 * c'est à dire exactement le bug d'argent trouvé le 23 août sur
 * l'annulation.
 *
 * Repli si la colonne n'existe pas encore : PostgREST rejette la mise à
 * jour ENTIÈRE sur une colonne inconnue, donc sans ce filet un
 * déploiement en avance sur la migration ferait échouer l'appel après
 * l'octroi. L'accès serait ouvert, le fil perdu, et le message dirait
 * quoi appliquer.
 */
export async function rememberPaypalSubscription(args: {
  email: string;
  subscriptionId: string | null | undefined;
}): Promise<{ ok: boolean; reason?: string }> {
  const email = String(args.email ?? "").trim().toLowerCase();
  const abonnement = String(args.subscriptionId ?? "").trim();
  if (!email) return { ok: false, reason: "no_email" };
  if (!abonnement) return { ok: false, reason: "no_subscription" };

  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ paypal_subscription_id: abonnement })
      .eq("email", email)
      .select("user_id");

    if (error) {
      if (/column .* does not exist|schema cache/i.test(error.message)) {
        console.warn(
          "[customerLink] colonne paypal_subscription_id absente : migration " +
            "20260823_paypal_subscription.sql a passer sur Supabase.",
        );
        return { ok: false, reason: "colonne_absente" };
      }
      throw error;
    }
    if (!data || data.length === 0) return { ok: false, reason: "no_profile" };
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(
      `[customerLink] abonnement PayPal NON rattache a ${email} : ${message}. ` +
        `Il faudra l'arreter a la main chez PayPal.`,
    );
    return { ok: false, reason: "write_failed" };
  }
}
