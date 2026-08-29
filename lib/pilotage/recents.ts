// lib/pilotage/recents.ts
//
// "JE VEUX VOIR MES DERNIERS CONTACTS, MES DERNIÈRES VENTES" (Béné, 29
// août 2026), "un aperçu général clair, sans blabla".
//
// Trois listes courtes, et une seule règle qui les gouverne : **le plus
// récent en premier, et une date qu'on ne sait pas lire ne remonte pas
// en tête.** Ça a l'air évident et c'est exactement ce qui casse : un
// tri sur une chaîne vide ou sur `null` place la ligne au sommet dans la
// moitié des moteurs, donc l'écran s'ouvre sur ce qu'on connaît le
// moins bien.
//
// PUR : ni horloge ni base. Les listes arrivent, on les range.

import type { Person } from "@/lib/admin/people";
import type { Sale } from "@/lib/checkout/sales";

/** Le temps d'une date, ou `null` quand elle est illisible. */
function instant(v: string | null | undefined): number | null {
  const t = Date.parse(String(v ?? ""));
  return Number.isFinite(t) ? t : null;
}

/**
 * Range du plus récent au plus ancien, les dates illisibles À LA FIN.
 *
 * Elles ne disparaissent pas : une ligne qu'on écarte en silence est
 * une ligne dont personne ne s'occupera jamais.
 */
export function parDateDesc<T>(
  lignes: readonly T[],
  date: (x: T) => string | null | undefined,
): T[] {
  return [...lignes].sort((a, b) => {
    const ta = instant(date(a));
    const tb = instant(date(b));
    if (ta === null && tb === null) return 0;
    if (ta === null) return 1;
    if (tb === null) return -1;
    return tb - ta;
  });
}

/** Les derniers comptes créés. */
export function derniersContacts(people: readonly Person[], combien = 6): Person[] {
  return parDateDesc(people, (p) => p.createdAt).slice(0, combien);
}

/**
 * Les dernières ventes, toutes personnes confondues.
 *
 * Une vente REMBOURSÉE reste dans la liste : elle a eu lieu, et c'est
 * justement ce qu'on veut voir passer. C'est l'affichage qui la marque,
 * pas ce tri qui la cache.
 */
export function dernieresVentes(
  people: readonly Person[],
  combien = 6,
): { vente: Sale; email: string; nom: string | null }[] {
  const toutes = people.flatMap((p) =>
    p.sales.map((vente) => ({ vente, email: p.email, nom: p.name })),
  );
  return parDateDesc(toutes, (x) => x.vente.paidAt).slice(0, combien);
}
