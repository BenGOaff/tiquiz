// lib/admin/churnDigest.ts
//
// CE QU'ELLES ONT RÉPONDU QUAND ELLES SONT PARTIES.
//
// Béné, 21 août : "qui a arrêté son abo : lui envoyer un mail pour lui
// demander pourquoi et **consigner ces réponses pour level up l'outil**."
//
// L'email et la page de réponse écrivent dans `subscription_churn`. Sans
// cet écran, tout ça finirait en colonne que personne n'ouvre : les
// raisons seraient bien enregistrées, et illisibles. Une donnée qu'on
// ne montre pas n'existe pas, exactement comme une nouveauté qu'on ne
// montre pas (drame Jocelyne, 3 août).
//
// -- CE QU'ON COMPTE, ET CE QU'ON NE COMPTE PAS ------------------------
//
// On ne regarde QUE les gens dont le départ est enregistré (`partant` =
// il a résilié et court jusqu'à la fin de sa période, `parti` = c'est
// fini). Quelqu'un qui n'a jamais rien annulé n'a pas de départ à
// commenter.
//
// **Aucun pourcentage.** Sur trois départs, "67% partent pour le prix"
// désigne deux personnes et se lit comme une tendance. C'est exactement
// le défaut du funnel de Jocelyne (4 août) : un pourcentage calculé sur
// un effectif minuscule dérive et fait corriger la mauvaise chose. Ici,
// des comptes et des phrases, rien d'autre.
//
// -- DEUX SOURCES, ET ELLES NE DISENT PAS LA MÊME CHOSE ----------------
//
// - `feedback` : la case cochée dans le portail Stripe au moment de
//   résilier. Utile pour trier, pauvre en information.
// - `comment` : ce qu'elle a ÉCRIT, chez Stripe ou sur notre page.
//
// La case cochée se compte, la phrase se lit. Les deux vivent côte à
// côte : une case sans phrase reste un signal, une phrase sans case
// reste la vraie matière.

import type { Person } from "./people";

/** Une personne partie, et ce qu'elle a dit. */
export interface ChurnVoice {
  email: string;
  name: string | null;
  /** Fin d'abonnement effective, sinon la date d'annulation. */
  quand: string | null;
  /** La case cochée chez Stripe, telle quelle (l'écran la traduit). */
  motif: string | null;
  /** Ce qu'elle a écrit. `null` quand elle n'a rien écrit. */
  texte: string | null;
  /** Toujours vrai ici : c'est ce qui fait entrer la ligne. */
  parti: boolean;
}

export interface ChurnDigest {
  /** Nombre de départs enregistrés (partants + partis). */
  total: number;
  /** Les cases cochées, la plus fréquente d'abord. Jamais de %. */
  parMotif: { motif: string; count: number }[];
  /** Celles qui ont écrit quelque chose, la plus récente d'abord. */
  voix: ChurnVoice[];
  /** Départs sans un mot. On le dit : ça borne ce que les voix valent. */
  sansReponse: number;
}

/** Au delà, l'écran devient un mur. Le reste vit dans la table. */
export const MAX_VOIX = 40;

function quandDePersonne(p: Person): string | null {
  return p.churn?.endedAt ?? p.churn?.cancelledAt ?? null;
}

export function buildChurnDigest(people: readonly Person[]): ChurnDigest {
  const partis = (people ?? []).filter(
    (p) => p.churn && (p.status === "partant" || p.status === "parti"),
  );

  const compteur = new Map<string, number>();
  const voix: ChurnVoice[] = [];
  let sansReponse = 0;

  for (const p of partis) {
    const motif = (p.churn?.feedback ?? "").trim() || null;
    if (motif) compteur.set(motif, (compteur.get(motif) ?? 0) + 1);

    const texte = (p.churn?.comment ?? "").trim() || null;
    if (texte) {
      voix.push({
        email: p.email,
        name: p.name,
        quand: quandDePersonne(p),
        motif,
        texte,
        parti: true,
      });
    } else if (!motif) {
      // Ni case cochee ni phrase : elle est partie sans rien dire.
      sansReponse += 1;
    }
  }

  voix.sort((a, b) => {
    // Sans date, on passe derriere : une ligne sans repere ne doit pas
    // squatter le haut de la liste.
    if (!a.quand && !b.quand) return 0;
    if (!a.quand) return 1;
    if (!b.quand) return -1;
    return a.quand < b.quand ? 1 : a.quand > b.quand ? -1 : 0;
  });

  const parMotif = [...compteur.entries()]
    .map(([motif, count]) => ({ motif, count }))
    .sort((a, b) => (b.count !== a.count ? b.count - a.count : a.motif < b.motif ? -1 : 1));

  return { total: partis.length, parMotif, voix: voix.slice(0, MAX_VOIX), sansReponse };
}
