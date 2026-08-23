// lib/support/ticketEntrant.ts
//
// CE QU'ON ACCEPTE D'ECRIRE DANS LA FILE, ET CE QU'ON REFUSE.
//
// A part de l'ECRITURE (`creerTicket.ts`) parce que celle-ci importe
// `supabaseAdmin`, qui exige les variables d'environnement AU CHARGEMENT
// du module : un test qui importerait le tout planterait avant la
// premiere assertion. C'est la regle du depot, ecrite le 1er aout : une
// logique qu'on ne peut pas importer n'est pas testee, donc c'est
// exactement la que les bugs s'installent.
//
// Trois portes arrivent ici : le formulaire de Tiquiz, le formulaire du
// centre d'aide commun (relaye par `/api/partner/support-ticket`) et
// l'escalade du robot d'aide. La validation est la MEME pour les trois :
// ce qui protege la file d'un envoi accidentel doit proteger toutes les
// portes, pas seulement celle qu'on a ecrite en premier.

import { normaliserProduit } from "@/lib/support/produit";

export interface TicketEntrant {
  email: string;
  name?: string | null;
  subject?: string | null;
  message: string;
  page?: string | null;
  locale?: string | null;
  product?: unknown;
  /** L'échange avec le robot d'aide, quand le ticket vient de là. */
  conversation?: unknown;
  /** L'identité, quand une session existait. Jamais exigée. */
  userId?: string | null;
}

export type TicketRefus = "invalid_email" | "message_trop_court" | "write_failed";

export interface TicketPropre {
  email: string;
  name: string;
  subject: string;
  message: string;
  page: string;
  locale: string;
  product: string;
  conversation: { role: string; content: string }[];
}

/**
 * Nettoie et VALIDE, sans écrire. Pure, donc testable.
 *
 * Rend la raison du refus plutôt qu'une phrase : l'interface existe en
 * 7 langues, c'est elle qui sait comment le dire. Même règle que la
 * suppression d'un quiz (3 août) et que l'import PDF (7 août).
 */
export function preparerTicket(entree: TicketEntrant): { ok: true; ticket: TicketPropre } | { ok: false; reason: TicketRefus } {
  const email = String(entree.email ?? "").trim().toLowerCase().slice(0, 320);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, reason: "invalid_email" };
  }

  const message = String(entree.message ?? "").trim().slice(0, 5000);
  // Dix caractères : de quoi refuser un formulaire envoyé par erreur,
  // sans jamais refuser une vraie question courte.
  if (message.length < 10) return { ok: false, reason: "message_trop_court" };

  const brut = Array.isArray(entree.conversation) ? entree.conversation : [];
  const conversation = brut
    .slice(0, 30)
    .map((m) => {
      const o = m as { role?: unknown; content?: unknown } | null;
      const role = String(o?.role ?? "").trim().toLowerCase();
      return {
        role: role === "assistant" ? "assistant" : "user",
        // `trim` avant la coupe : une ligne d'espaces n'apporte rien et
        // ferait un tour de conversation vide dans la file.
        content: String(o?.content ?? "").trim().slice(0, 4000),
      };
    })
    .filter((m) => m.content.length > 0);

  return {
    ok: true,
    ticket: {
      email,
      name: String(entree.name ?? "").trim().slice(0, 100),
      subject: String(entree.subject ?? "").trim().slice(0, 200),
      message,
      page: String(entree.page ?? "").trim().slice(0, 300),
      locale: String(entree.locale ?? "fr").trim().slice(0, 8) || "fr",
      product: normaliserProduit(entree.product),
      conversation,
    },
  };
}
