// lib/checkout/remiseAbonnement.ts
//
// LA REMISE QU'UN AFFILIÉ A GAGNÉE SUR SON PROPRE ABONNEMENT.
//
// Béné, 25 août 2026 : "il a 10 affiliés abonnés, son abonnement baisse
// de 10 %, il en a 20 il gagne 20 %, il en a 100 ben il paye plus rien."
//
// Le décompte de ses filleuls vit chez Tipote (le registre des affiliés
// y est) ; l'abonnement vit ici (c'est nous qui encaissons). Aucune des
// deux apps ne peut décider seule, et copier l'une chez l'autre donnerait
// deux vérités qui divergeraient à la première panne.
//
// -- CE MODULE NE FAIT QUE DÉCIDER -------------------------------------
//
// Pas de base, pas de réseau : la pose chez Stripe vit dans la tâche
// planifiée. Une décision enfermée dans une route n'est pas testable,
// donc pas testée, donc c'est là que les bugs s'installent.

/** Ce que Tipote nous dit d'un affilié. */
export type RemiseGagnee = { email: string; pct: number };

/** Ce qu'un abonnement porte déjà comme remise, chez Stripe. */
export type RemisePosee = { pct: number | null; couponId: string | null };

export type ActionRemise =
  /** Rien à faire : ce qui est posé est déjà le bon. */
  | { action: "rien" }
  /** Poser ou remplacer la remise. */
  | { action: "poser"; pct: number }
  /** Retirer la remise : il n'y a plus droit. */
  | { action: "retirer" };

/**
 * Ce qu'il faut faire de l'abonnement de cette personne.
 *
 * `posee` est un PARAMÈTRE OBLIGATOIRE : sans lui, on reposerait la même
 * remise tous les mois, et chaque pose crée un coupon chez Stripe. Au
 * bout d'un an on aurait douze coupons pour une seule remise, et le
 * jour où l'un d'eux se cumulerait, personne ne saurait d'où il vient.
 *
 * LE RETRAIT EST EXPLICITE, jamais un effet de bord. Une remise qui
 * disparaît est une HAUSSE de prix pour quelqu'un : elle doit être
 * décidée, visible dans le journal, et jamais la conséquence silencieuse
 * d'une liste qu'on n'a pas su lire (c'est pour ça que la porte de
 * Tipote répond 502 plutôt que de rendre une liste vide).
 */
export function actionRemise(args: {
  gagnee: number | null;
  posee: RemisePosee;
}): ActionRemise {
  const voulu = Number(args.gagnee ?? 0);
  const valide = Number.isFinite(voulu) && voulu > 0 && voulu <= 100 ? Math.round(voulu) : 0;
  const actuel = Number(args.posee.pct ?? 0);

  if (valide === 0) {
    return args.posee.couponId ? { action: "retirer" } : { action: "rien" };
  }
  if (actuel === valide) return { action: "rien" };
  return { action: "poser", pct: valide };
}

/**
 * La remise DÉJÀ posée sur un abonnement Stripe, lue sans supposer sa
 * forme.
 *
 * Stripe a fait évoluer ce champ : un abonnement porte soit un
 * `discount` (l'ancienne forme, un objet), soit `discounts` (un tableau).
 * Lire une seule des deux marcherait aujourd'hui et casserait à la
 * prochaine version de l'API : c'est la leçon du drame Ivan, où on
 * raisonnait sur la forme SUPPOSÉE d'un payload.
 */
export function lireRemisePosee(abonnement: Record<string, unknown> | null): RemisePosee {
  if (!abonnement) return { pct: null, couponId: null };
  const candidats: unknown[] = [];
  const d = abonnement.discount;
  if (d) candidats.push(d);
  const liste = abonnement.discounts;
  if (Array.isArray(liste)) candidats.push(...liste);

  for (const c of candidats) {
    if (!c || typeof c !== "object") continue;
    const coupon = (c as { coupon?: unknown }).coupon;
    if (!coupon || typeof coupon !== "object") continue;
    const pct = Number((coupon as { percent_off?: unknown }).percent_off);
    const id = String((coupon as { id?: unknown }).id ?? "").trim();
    if (Number.isFinite(pct) && pct > 0) return { pct: Math.round(pct), couponId: id || null };
  }
  return { pct: null, couponId: null };
}

/** Le coupon Stripe qui porte une remise de fidélité. */
export function couponFidelite(pct: number): Record<string, string | number> {
  return {
    percent_off: pct,
    // `forever` et remplacé à chaque changement : la remise vaut tant
    // qu'il garde ses filleuls, et le recalcul mensuel la corrige.
    duration: "forever",
    name: `Programme d'affiliation -${pct} %`,
    max_redemptions: 1,
    "metadata[fidelite_affilie]": "1",
    "metadata[pct]": String(pct),
  };
}
