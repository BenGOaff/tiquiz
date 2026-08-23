// lib/support/tickets.ts
//
// LES RÈGLES DU SUPPORT, HORS DE TOUT COMPOSANT.
//
// Béné, 22 août : "pourquoi ne pas lier le compte client à l'aide au
// ticketing ?"
//
// Tout ce qui décide ici (l'état d'un ticket, ce qui est urgent, ce
// qu'on affiche d'un message) est une règle métier, donc une fonction
// pure et testée. Enfermée dans un composant React, elle ne serait pas
// testable, donc pas testée, donc exactement là où les bugs s'installent
// (règle du 1er août).

export type TicketStatus = "open" | "replied" | "closed";

export const TICKET_STATUSES: readonly TicketStatus[] = ["open", "replied", "closed"];

export interface Ticket {
  id: string;
  email: string;
  name: string | null;
  subject: string | null;
  message: string;
  page: string | null;
  status: TicketStatus;
  adminReply: string | null;
  repliedAt: string | null;
  locale: string;
  createdAt: string;
  /**
   * De quel produit parle la demande.
   *
   * Depuis le 23 aout, la file est commune aux trois apps : sans cette
   * colonne, Bene lirait "je n'ai pas recu mes acces" sans savoir s'il
   * s'agit de Tiquiz ou de L'Atelier, et repondrait a cote.
   */
  product: string;
}

/** Une valeur venue de la base, ramenée à un statut qu'on connaît. */
export function readTicketStatus(v: unknown): TicketStatus {
  const s = String(v ?? "").trim().toLowerCase();
  return (TICKET_STATUSES as readonly string[]).includes(s) ? (s as TicketStatus) : "open";
}

/**
 * DEPUIS COMBIEN DE TEMPS ELLE ATTEND, EN HEURES.
 *
 * `maintenant` est un PARAMÈTRE, jamais un `Date.now()` interne : un
 * test qui dépend de l'horloge est un test qui clignote, et un test qui
 * clignote est pire que pas de test (leçon du 1er août).
 */
export function heuresDAttente(ticket: Pick<Ticket, "createdAt">, maintenant: Date): number {
  const t = Date.parse(ticket.createdAt);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, (maintenant.getTime() - t) / 3_600_000);
}

/**
 * Au delà de ce délai, un ticket sans réponse devient une cliente qui se
 * demande si quelqu'un l'a lue.
 *
 * 24 heures : c'est ce qu'on peut tenir seule, et c'est déjà long quand
 * on est bloquée devant un paiement.
 */
export const DELAI_ALERTE_HEURES = 24;

/** Ce ticket demande-t-il une action MAINTENANT ? */
export function estEnRetard(ticket: Pick<Ticket, "status" | "createdAt">, maintenant: Date): boolean {
  if (ticket.status !== "open") return false;
  return heuresDAttente(ticket, maintenant) >= DELAI_ALERTE_HEURES;
}

/**
 * L'ORDRE DE LA FILE : ce qui attend le plus longtemps passe devant.
 *
 * Les ouverts d'abord, du plus ancien au plus récent (celui qui attend
 * depuis trois jours passe avant celui d'il y a une heure), puis les
 * répondus, puis les clos, du plus récent au plus ancien.
 *
 * Trier les ouverts du plus RÉCENT au plus ancien enterrerait justement
 * ceux qu'on a déjà fait attendre.
 */
export function trierFile(tickets: readonly Ticket[]): Ticket[] {
  const rang: Record<TicketStatus, number> = { open: 0, replied: 1, closed: 2 };
  return [...tickets].sort((a, b) => {
    if (rang[a.status] !== rang[b.status]) return rang[a.status] - rang[b.status];
    const ta = Date.parse(a.createdAt) || 0;
    const tb = Date.parse(b.createdAt) || 0;
    return a.status === "open" ? ta - tb : tb - ta;
  });
}

export interface ResumeFile {
  ouverts: number;
  enRetard: number;
  repondus: number;
  clos: number;
}

/** De quoi écrire un badge honnête sans recompter dans le composant. */
export function resumerFile(tickets: readonly Ticket[], maintenant: Date): ResumeFile {
  return {
    ouverts: tickets.filter((t) => t.status === "open").length,
    enRetard: tickets.filter((t) => estEnRetard(t, maintenant)).length,
    repondus: tickets.filter((t) => t.status === "replied").length,
    clos: tickets.filter((t) => t.status === "closed").length,
  };
}

/**
 * Ce qu'un ticket devient quand on y répond.
 *
 * La règle est un PARAMÈTRE explicite et pas une déduction dans la
 * route : répondre à un ticket clos ne doit pas le rouvrir, et
 * l'ancienne implémentation de Tipote écrasait le statut sans se poser
 * la question.
 */
export function statutApresReponse(actuel: TicketStatus): TicketStatus {
  return actuel === "closed" ? "closed" : "replied";
}

/**
 * Le message ramené à une ligne, pour la file.
 *
 * On coupe sur un ESPACE, jamais au milieu d'un mot : une file remplie
 * de mots tronqués se lit mal, et on la survole cent fois par semaine.
 */
export function apercu(message: string, max = 120): string {
  const plat = String(message ?? "").replace(/\s+/g, " ").trim();
  if (plat.length <= max) return plat;
  const coupe = plat.slice(0, max);
  const espace = coupe.lastIndexOf(" ");
  return `${(espace > max * 0.6 ? coupe.slice(0, espace) : coupe).trimEnd()}...`;
}
