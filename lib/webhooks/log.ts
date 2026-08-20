// lib/webhooks/log.ts
//
// LE JOURNAL DES APPELS REÇUS, ET L'IDEMPOTENCE QUI VA AVEC.
//
// Une seule écriture fait les deux choses à la fois : elle garde la trace
// de l'appel, et elle dit s'il avait déjà été traité. C'est la base de
// données qui tranche, via un index unique, pas un `select` suivi d'un
// `insert` qui laisserait une fenêtre entre les deux.
//
// SUR TIQUIZ, CET INDEX EST PARTIEL, et c'est important de le savoir :
//
//   (source, event_id) where event_id is not null
//                        and source in ('stripe', 'paypal')
//
// (migration 20260820_owner_webhook_idempotency.sql)
//
// Il ne couvre QUE nos ventes à nous. La route Systeme.io journalise
// plusieurs fois le même événement (`received`, puis `processed` ou
// `error`), donc un index global sur `(source, event_id)` refuserait de
// se créer sur la base existante. Systeme.io garde son propre index,
// celui de la migration 012, et son propre fonctionnement.
//
// Tant que cette migration n'est pas appliquée, `duplicate` vaut
// TOUJOURS `false` sur Tiquiz : un réessai de Stripe ouvrirait le plan
// une deuxième fois.
//
// -- POURQUOI CE FICHIER EXISTE (20 août 2026) -------------------------
//
// Le paiement Stripe avait besoin d'un journal idempotent. Le webhook
// Systeme.io en a un aussi, mais d'une autre forme : il fait un `select`
// puis un `insert`, et il avale les erreurs d'écriture. Les deux
// mécaniques ne sont pas équivalentes, et celle-ci est la plus sûre :
// l'insertion et le contrôle sont la MÊME opération, donc il n'y a pas
// de fenêtre entre les deux. Stripe sait très bien envoyer deux fois le
// même événement en même temps.
//
// Le webhook Systeme.io n'a pas été rebranché ici : il traite les vraies
// ventes de Béné aujourd'hui, et changer sa mécanique d'idempotence
// demande une passe attentive, pas un effet de bord. C'est la prochaine
// étape de rangement, et elle est notée comme telle.
//
// -- ET LE JOURNAL N'EST PAS DÉCORATIF ---------------------------------
//
// Le 7 août, c'est le journal de production qui a tranché en dix secondes
// le drame Ivan, après deux diagnostics à l'aveugle. Une vente absente de
// cette table n'est jamais arrivée jusqu'à nous : ça se lit, ça ne se
// déduit pas.

import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
 * Écrit la ligne, et dit si cet événement avait déjà été traité.
 *
 * `duplicate: true` veut dire "on a déjà fait le travail" : l'appelant
 * doit s'arrêter là et répondre 200. Sans ça, un réessai de Stripe ou de
 * Systeme.io rejouerait une vente, et un remboursement rejoué rouvrirait
 * un accès révoqué.
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
  // Conflit sur l'index unique (source, event_id) = event déjà traité.
  if (error && (error.code === "23505" || /duplicate key/i.test(error.message))) {
    return { duplicate: true };
  }
  return { duplicate: false };
}
