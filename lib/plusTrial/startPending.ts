// lib/plusTrial/startPending.ts
//
// Démarrage DIFFÉRÉ de l'essai Plus Atelier.
//
// L'essai est octroyé à l'achat (plan=*_plus + affiliate_trial_pending_days,
// affiliate_trial_expires_at NULL). Son compte à rebours ne démarre qu'à la
// CRÉATION du premier quiz/sondage (retour Béné : un élève peut arriver sur
// l'Atelier sans commencer son quiz tout de suite, il ne doit perdre aucun
// jour). On pose alors affiliate_trial_expires_at = now + pending_days et on
// efface le marqueur.
//
// Idempotent : le garde-fou `.is(expires_at, null)` empêche tout double
// démarrage (course / créations concurrentes). Best-effort : ne throw JAMAIS,
// ne bloque jamais la création du quiz.

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function startPendingAtelierTrial(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("affiliate_trial_pending_days, affiliate_trial_expires_at")
      .eq("user_id", userId)
      .maybeSingle();
    const row = data as
      | { affiliate_trial_pending_days?: number | null; affiliate_trial_expires_at?: string | null }
      | null;
    const pendingDays = row?.affiliate_trial_pending_days;
    if (typeof pendingDays === "number" && pendingDays > 0 && !row?.affiliate_trial_expires_at) {
      const startedAt = new Date();
      const expiresAt = new Date(startedAt.getTime() + pendingDays * 24 * 3600 * 1000);
      await supabaseAdmin
        .from("profiles")
        .update({
          affiliate_trial_expires_at: expiresAt.toISOString(),
          affiliate_trial_pending_days: null,
          updated_at: startedAt.toISOString(),
        })
        .eq("user_id", userId)
        .is("affiliate_trial_expires_at", null);
    }
  } catch {
    /* best-effort : ne jamais bloquer la création du quiz */
  }
}
