// lib/admin/moisOffertDigest.ts
//
// LES MOIS OFFERTS, VUS DEPUIS L'ADMIN.
//
// Béné, 23 août 2026 : "Il faut aussi tracker les tricheurs qui veulent
// s'autoaffilier : même adresse email, même adresse IP etc."
//
// Le moteur (`lib/trial/moisOffert.ts`) REFUSE ce qu'il peut refuser
// avant le paiement. Deux cas lui échappent, et par construction :
//
//   - `deja_recu` : sur le formulaire carte, l'adresse est saisie DANS
//     Stripe, donc inconnue avant le paiement. Un deuxième mois peut
//     s'ouvrir, et on ne le reprend pas (reprendre un essai commencé,
//     c'est prélever quelqu'un qui ne s'y attend pas) ;
//   - `meme_ip` : accordé volontairement, parce qu'une IP partagée
//     c'est aussi un couple, deux collègues, une salle de formation.
//
// Les deux doivent donc REMONTER, sinon la promesse "on track les
// tricheurs" ne tient pas. Cette fonction est pure : elle prend la
// liste des personnes et rend ce que l'écran affiche.

import type { Person } from "@/lib/admin/people";

export interface MoisOffertLigne {
  email: string;
  name: string | null;
  grantedAt: string | null;
  sa: string | null;
  flag: string | null;
}

export interface MoisOffertDigest {
  /** Combien de mois offerts, en tout. */
  total: number;
  /** Ceux qui méritent un oeil, les plus récents d'abord. */
  aRegarder: MoisOffertLigne[];
  /** Combien de chaque motif, pour dire QUOI sans lire la liste. */
  parMotif: Record<string, number>;
}

/** Le plus récent d'abord, en tolérant une date illisible. */
function parDateDesc(a: MoisOffertLigne, b: MoisOffertLigne): number {
  const ta = a.grantedAt ? Date.parse(a.grantedAt) : Number.NaN;
  const tb = b.grantedAt ? Date.parse(b.grantedAt) : Number.NaN;
  if (!Number.isFinite(ta) && !Number.isFinite(tb)) return 0;
  if (!Number.isFinite(ta)) return 1;
  if (!Number.isFinite(tb)) return -1;
  return tb - ta;
}

export function buildMoisOffertDigest(people: Person[]): MoisOffertDigest {
  const aRegarder: MoisOffertLigne[] = [];
  const parMotif: Record<string, number> = {};
  let total = 0;

  for (const p of people) {
    const mo = p.moisOffert;
    if (!mo) continue;
    total += 1;
    if (!mo.flag) continue;
    parMotif[mo.flag] = (parMotif[mo.flag] ?? 0) + 1;
    aRegarder.push({
      email: p.email,
      name: p.name,
      grantedAt: mo.grantedAt,
      sa: mo.sa,
      flag: mo.flag,
    });
  }

  aRegarder.sort(parDateDesc);
  return { total, aRegarder, parMotif };
}
