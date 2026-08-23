// lib/support/creerTicket.ts
//
// UN SEUL ENDROIT QUI ÉCRIT UN TICKET.
//
// Trois portes mènent ici : le formulaire de Tiquiz, le formulaire du
// centre d'aide commun (servi par Tipote, relayé par
// `/api/partner/support-ticket`), et l'escalade du chat d'aide. Si
// chacune écrivait sa ligne, elles finiraient par ne plus enregistrer
// les mêmes champs, et la file d'attente afficherait des tickets à
// moitié vides sans que personne comprenne pourquoi.
//
// La validation est la MÊME pour les trois : ce qui protège la file
// d'un envoi accidentel doit protéger toutes les portes, pas seulement
// celle qu'on a écrite en premier.

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  type TicketEntrant,
  type TicketPropre,
  type TicketRefus,
} from "@/lib/support/ticketEntrant";

export { preparerTicket } from "@/lib/support/ticketEntrant";
export type { TicketEntrant, TicketPropre, TicketRefus };

/**
 * Écrit le ticket. Rend la raison en cas de refus, jamais un booléen nu.
 *
 * REPLI SUR L'ANCIENNE FORME : `product` et `conversation` sont arrivés
 * le 23 août. Si la migration n'est pas encore passée en prod,
 * PostgREST rejette l'écriture ENTIÈRE sur une colonne inconnue, donc
 * sans ce repli un déploiement en avance sur la migration perdrait
 * TOUS les tickets, en silence. C'est exactement le drame de
 * `quiz_events.meta` (15 jours de statistiques perdues).
 */
export async function ecrireTicket(
  ticket: TicketPropre,
  userId: string | null,
): Promise<{ ok: boolean; reason?: TicketRefus }> {
  const complet = {
    user_id: userId,
    email: ticket.email,
    name: ticket.name || null,
    subject: ticket.subject || null,
    message: ticket.message,
    page: ticket.page || null,
    locale: ticket.locale,
    status: "open",
    product: ticket.product,
    conversation: ticket.conversation,
  };

  const { error } = await supabaseAdmin.from("support_tickets").insert(complet);
  if (!error) return { ok: true };

  const colonneInconnue = /column .* does not exist|schema cache/i.test(error.message);
  if (colonneInconnue) {
    console.warn(
      `[support] colonnes product/conversation absentes : ticket ecrit sans elles. ` +
        `Migration 20260823_support_tickets_produit.sql a passer sur Supabase.`,
    );
    const { product, conversation, ...sansNouveautes } = complet;
    void product;
    void conversation;
    const repli = await supabaseAdmin.from("support_tickets").insert(sansNouveautes);
    if (!repli.error) return { ok: true };
    console.error(`[support] demande PERDUE pour ${ticket.email} : ${repli.error.message}`);
    return { ok: false, reason: "write_failed" };
  }

  // Un refus se NOMME, et surtout il se JOURNALISE : une demande perdue
  // en silence, c'est une cliente qui attend une réponse qui ne viendra
  // jamais.
  console.error(`[support] demande PERDUE pour ${ticket.email} : ${error.message}`);
  return { ok: false, reason: "write_failed" };
}
