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
