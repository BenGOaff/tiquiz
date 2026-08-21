// lib/checkout/churn.ts
//
// CONSIGNER UN DÉPART D'ABONNEMENT.
//
// Béné, 21 août : "qui a arrêté son abo : lui envoyer un mail pour lui
// demander pourquoi et consigner ces réponses pour level up l'outil".
//
// La décision de couper ou non vit dans `subscriptionLifecycle.ts`, qui
// est pur et testé. Ce fichier ne décide de rien : il écrit.
//
// -- UNE LIGNE PAR ABONNEMENT, PAS UNE PAR ÉVÉNEMENT -------------------
//
// Stripe envoie plusieurs `customer.subscription.updated` pour un seul
// départ. Sans clé stable, le tableau de bord compterait trois départs
// pour un client, et Béné conclurait à une hémorragie. C'est le drame
// des entrées dupliquées dans la distribution par résultat (8 juin), sur
// une donnée qui pèse beaucoup plus lourd.
//
// La clé est `(provider, reference)`, avec `reference` = l'identifiant
// de l'abonnement chez Stripe. Elle est portée par un index unique en
// base, donc c'est Postgres qui tranche, pas nous.
//
// -- ON N'ÉCRASE JAMAIS CE QU'ON A APPRIS ------------------------------
//
// Un `update` naïf remettrait `stripe_comment` à `null` au premier
// événement suivant qui n'en porte pas, et on perdrait la seule phrase
// que le client ait écrite. On ne met à jour QUE les champs renseignés.

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface ChurnRecord {
  email: string;
  userId?: string | null;
  provider?: string;
  /** L'identifiant de l'abonnement chez le fournisseur. */
  reference: string | null;
  plan?: string | null;
  amountCents?: number | null;
  currency?: string | null;
  /** Fin de la période payée. */
  endsAt?: string | null;
  /** L'accès a été retiré à cette date. */
  endedAt?: string | null;
  stripeFeedback?: string | null;
  stripeComment?: string | null;
  /** Il a annulé sa résiliation. */
  reactivatedAt?: string | null;
  /**
   * NE CRÉER AUCUNE LIGNE : ne compléter que si le départ existe déjà.
   *
   * Indispensable, et pas un détail de confort. Stripe envoie un
   * `customer.subscription.updated` pour à peu près tout : une carte mise
   * à jour, un changement d'adresse, une TVA renseignée. Insérer sur
   * chacun remplirait la table de "départs" qui n'en sont pas, et le
   * tableau de bord annoncerait une hémorragie à Béné.
   *
   * On ne consigne un départ que sur une INTENTION DE PARTIR ou sur une
   * fin réelle. Le reste ne fait que compléter ce qui existe.
   */
  updateOnly?: boolean;
}

/** Retire les champs absents : on ne remplace jamais une valeur par du vide. */
function seulementRenseignes(o: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Enregistre ou complète un départ.
 *
 * Ne jette jamais : un échec d'écriture ne doit pas faire échouer le
 * webhook, sinon Stripe réessaie en boucle un événement qu'on a déjà
 * traité côté accès. On le DIT en revanche, fort, dans les journaux :
 * un départ non consigné est une information perdue pour toujours.
 */
export async function recordChurn(
  entree: ChurnRecord,
): Promise<{ ok: boolean; reason?: string }> {
  const email = String(entree.email ?? "").trim().toLowerCase();
  if (!email) return { ok: false, reason: "no_email" };

  const provider = String(entree.provider ?? "stripe").trim() || "stripe";
  const reference = String(entree.reference ?? "").trim() || null;

  const champs = seulementRenseignes({
    user_id: entree.userId,
    plan: entree.plan,
    amount_cents: entree.amountCents,
    currency: entree.currency,
    ends_at: entree.endsAt,
    ended_at: entree.endedAt,
    stripe_feedback: entree.stripeFeedback,
    stripe_comment: entree.stripeComment,
    reactivated_at: entree.reactivatedAt,
  });

  try {
    if (reference) {
      // Y a-t-il deja une ligne pour cet abonnement ?
      const { data: existante } = await supabaseAdmin
        .from("subscription_churn")
        .select("id")
        .eq("provider", provider)
        .eq("reference", reference)
        .maybeSingle();

      if (existante?.id) {
        const { error } = await supabaseAdmin
          .from("subscription_churn")
          .update({ ...champs, updated_at: new Date().toISOString() })
          .eq("id", existante.id);
        if (error) throw error;
        return { ok: true };
      }
    }

    if (entree.updateOnly) {
      // Rien à compléter, et on ne crée pas : ce n'est pas un départ.
      return { ok: true, reason: "nothing_to_update" };
    }

    const { error } = await supabaseAdmin.from("subscription_churn").insert({
      email,
      provider,
      reference,
      ...champs,
    });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // La table peut ne pas exister si la migration n'est pas passée. On
    // le dit en clair, avec le nom du fichier : c'est exactement ce qui
    // a coûté quinze jours de statistiques en juin.
    console.error(
      `[churn] depart NON consigne pour ${email} (${reference ?? "sans reference"}) : ${message}. ` +
        `Si la table est absente, appliquer supabase/migrations/20260821_subscription_churn.sql.`,
    );
    return { ok: false, reason: "write_failed" };
  }
}
