// lib/webhooks/log.ts
//
// LE JOURNAL DES APPELS REÇUS, ET LE VERROU QUI VA AVEC.
//
// -- LE BUG QUE CE FICHIER PORTAIT (trouvé à l'audit du 24 août 2026) --
//
// L'ancienne version écrivait UNE ligne `received` avant de travailler,
// et considérait tout conflit sur l'index unique comme "déjà traité".
//
// Conséquence : dès que le traitement ÉCHOUAIT (Supabase indisponible
// une seconde, Stripe injoignable, une colonne manquante), la route
// répondait 502 pour demander un réessai, et **ce réessai était refusé
// par notre propre journal**. La ligne existait, donc le réessai était
// pris pour un doublon, donc on répondait 200, donc Stripe arrêtait de
// réessayer.
//
// Une vente encaissée dont le premier traitement rate n'ouvrait donc
// JAMAIS l'accès, et le symptôme était l'absence de symptôme : le
// journal disait "reçu", le client avait payé, personne n'avait rien.
// Huit chemins de nos deux webhooks répondaient 502 en comptant sur un
// réessai qui ne pouvait pas arriver.
//
// -- LA CORRECTION : LE STATUT FAIT PARTIE DU VERROU -------------------
//
// L'index unique ne couvre plus QUE les lignes en cours ou terminées :
//
//   (source, event_id) where status in ('processing','processed')
//                        and source in ('stripe','paypal')
//
// (migration 20260824_webhook_lock.sql, qui remplace celui du 20 août.)
//
// C'est exactement la forme de l'index de la migration 012, qui protège
// déjà le webhook Systeme.io depuis mars, et qui n'avait pas été reprise.
//
// Trois cas, et ils sont tous nécessaires :
//
//   - rien en base           -> on prend le verrou et on travaille ;
//   - une ligne `processed`  -> c'est un vrai doublon, on s'arrête ;
//   - une ligne `processing` -> quelqu'un travaille, ou son travail est
//     mort en route. Fraîche, on demande un réessai plus tard ; VIEILLE,
//     on reprend le travail.
//
// Un échec écrit `error`, qui SORT de l'index : le réessai suivant peut
// donc reprendre. C'est tout l'intérêt.
//
// -- ET LE JOURNAL N'EST PAS DÉCORATIF ---------------------------------
//
// Le 7 août, c'est le journal de production qui a tranché en dix secondes
// le drame Ivan, après deux diagnostics à l'aveugle. Une vente absente de
// cette table n'est jamais arrivée jusqu'à nous : ça se lit, ça ne se
// déduit pas.

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { lireVerrou, type VerdictVerrou } from "@/lib/webhooks/verrouRegles";

export { REPRISE_APRES_MS, lireVerrou, type VerdictVerrou } from "@/lib/webhooks/verrouRegles";

export interface WebhookLogRow {
  /** Qui nous appelle : `systeme_io`, `stripe`, ... */
  source: string;
  /** L'identifiant de l'événement CHEZ L'APPELANT. C'est lui qui dédoublonne. */
  event_id: string | null;
  event_type: string | null;
  payload: unknown;
  status: string;
  error?: string | null;
}

/**
 * Prend le verrou de traitement pour cet événement.
 *
 * Écrit la ligne du journal au passage : les deux gestes n'en font
 * qu'un, donc il n'y a aucune fenêtre entre "je regarde" et "j'écris".
 *
 * Sans `event_id`, il n'y a rien à dédoublonner : on journalise et on
 * traite (c'est le cas d'un appelant qui ne numérote pas ses envois).
 */
export async function prendreLeVerrou(row: WebhookLogRow): Promise<VerdictVerrou> {
  const { error } = await supabaseAdmin.from("webhook_logs").insert({
    source: row.source,
    event_id: row.event_id,
    event_type: row.event_type,
    payload: row.payload,
    // `processing` et pas `received` : c'est CE statut qui est dans
    // l'index, donc c'est lui qui tient le verrou.
    status: "processing",
    error: row.error ?? null,
  });

  if (!error) return { action: "traiter" };

  const conflit = error.code === "23505" || /duplicate key/i.test(error.message);
  if (!conflit) {
    // Le journal est en panne. On TRAITE quand même : refuser une vente
    // encaissée parce qu'on n'arrive pas à écrire une ligne de journal
    // serait pire que le risque de doublon. On crie, par contre.
    console.error(
      `[webhook] journal indisponible (${error.message}) : traitement quand meme, ` +
        `doublon possible sur ${row.source}/${row.event_id ?? "?"}.`,
    );
    return { action: "traiter" };
  }

  return await relireLeVerrou(row);
}

/** Que dit la ligne qui nous a bloqués ? */
async function relireLeVerrou(row: WebhookLogRow): Promise<VerdictVerrou> {
  const { data, error } = await supabaseAdmin
    .from("webhook_logs")
    .select("id, status, received_at")
    .eq("source", row.source)
    .eq("event_id", row.event_id)
    .in("status", ["processing", "processed"])
    .order("received_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    // On sait qu'il y a eu conflit, donc une ligne existe. Ne pas
    // pouvoir la relire est le cas où on ne SAIT pas : on s'arrête,
    // parce que rejouer une vente coûte plus cher que la retarder, et
    // le fournisseur réessaiera.
    console.error(
      `[webhook] verrou illisible sur ${row.source}/${row.event_id ?? "?"} : on ne traite pas.`,
    );
    return { action: "en_cours" };
  }

  const ligne = data as { id: string; status: string; received_at: string };
  // LA DÉCISION est pure et testée (`verrouRegles.ts`). Ici on ne fait
  // que lui donner la ligne et l'heure.
  const verdict = lireVerrou(ligne, Date.now());
  if (verdict.action !== "traiter") return verdict;

  // Le traitement précédent est mort en route. On REPREND, et on
  // repousse l'horodatage pour que le suivant ne reprenne pas par
  // dessus nous.
  await supabaseAdmin
    .from("webhook_logs")
    .update({ received_at: new Date().toISOString(), status: "processing" })
    .eq("id", ligne.id);
  console.warn(
    `[webhook] traitement precedent abandonne sur ${row.source}/${row.event_id ?? "?"} : on reprend.`,
  );
  return { action: "traiter" };
}

/**
 * Le travail est fini. Sans cet appel, l'événement reste `processing`,
 * donc il sera REPRIS deux minutes plus tard : c'est le filet, pas le
 * fonctionnement normal.
 */
export async function marquerTraite(
  source: string,
  eventId: string | null,
  statut: "processed" | "error" = "processed",
  detail?: string | null,
): Promise<void> {
  if (!eventId) return;
  try {
    const { error } = await supabaseAdmin
      .from("webhook_logs")
      .update({ status: statut, error: detail ?? null })
      .eq("source", source)
      .eq("event_id", eventId)
      .eq("status", "processing");
    if (error) {
      console.error(`[webhook] marquage ${statut} impossible sur ${source}/${eventId} : ${error.message}`);
    }
  } catch (e) {
    console.error(`[webhook] marquage impossible : ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * L'ancienne porte, gardée pour les appelants qui ne font que
 * JOURNALISER (le webhook Systeme.io, qui a sa propre mécanique et ses
 * lignes multiples). Elle n'a jamais tenu de verrou.
 */
export async function logWebhookEvent(row: WebhookLogRow): Promise<{ duplicate: boolean }> {
  const { error } = await supabaseAdmin.from("webhook_logs").insert({
    source: row.source,
    event_id: row.event_id,
    event_type: row.event_type,
    payload: row.payload,
    status: row.status,
    error: row.error ?? null,
  });
  if (error && (error.code === "23505" || /duplicate key/i.test(error.message))) {
    return { duplicate: true };
  }
  return { duplicate: false };
}
