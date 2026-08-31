// lib/checkout/subscriptionCancel.ts
//
// ARRÊTER UN ABONNEMENT PRIS SUR NOTRE BON DE COMMANDE.
//
// Béné, 23 août 2026 : "je veux annuler et rembourser mon achat test
// depuis mon dashboard admin. Il me faut un bouton pour annuler l'abo
// directement (l'user doit aussi pouvoir le faire en toute autonomie) et
// un différent pour rembourser (ce qui sera plus rare)."
//
// -- CE QUE CE FICHIER RÉPARE, ET C'EST UN BUG D'ARGENT -----------------
//
// `/api/billing/cancel` existait déjà, et il ne connaissait QUE
// Systeme.io. Depuis que nous encaissons nous mêmes, une abonnée Stripe
// qui cliquait "Annuler mon abonnement" tombait dans la branche "aucun
// abonnement Systeme.io actif", qui **retirait son plan en local et
// renvoyait ok**. Résultat : accès coupé, et Stripe qui continue de
// prélever tous les mois. La pire combinaison possible.
//
// -- ANNULER N'EST PAS REMBOURSER --------------------------------------
//
// Ce sont deux gestes, ils n'ont ni la même fréquence ni la même
// conséquence, et les confondre coûte de l'argent dans les deux sens :
//
// | Geste | Ce qui se passe | Défaut |
// |---|---|---|
// | annuler | plus de prélèvement | elle garde l'accès jusqu'à la fin de la période PAYÉE |
// | rembourser | l'argent revient | l'accès se ferme tout de suite, et l'abonnement DOIT être arrêté |
//
// Un remboursement qui n'arrête pas l'abonnement re-prélève le mois
// suivant quelqu'un qui n'a plus accès. C'est pour ça que le
// remboursement passe par `"immediat"`, jamais par le défaut.
//
// Aucun `server-only` : les décisions sont pures et doivent être
// testables. Les appels réseau vivent ici aussi, mais derrière des
// fonctions qui prennent la clé en paramètre.

import { finDePeriodeAbonnement } from "@/lib/checkout/formeStripe";

/** Quand l'abonnement s'arrête. */
export type CancelQuand = "fin-de-periode" | "immediat";

/**
 * Le défaut est `fin-de-periode`, et ce n'est pas un détail de confort.
 *
 * Elle a payé son mois. Le lui couper à la seconde où elle clique, c'est
 * lui prendre ce qu'elle a acheté, et c'est le genre de geste qui fait
 * écrire un avis. `immediat` existe pour le remboursement, où l'argent
 * repart, donc l'accès aussi.
 */
export function normaliserQuand(raw: unknown): CancelQuand {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "immediat" || v === "now" || v === "immediately") return "immediat";
  return "fin-de-periode";
}

/**
 * Cet abonnement coûte-t-il encore de l'argent au client ?
 *
 * On liste ce qui est VIVANT, pas ce qui est "actif" : `past_due` et
 * `unpaid` prélèvent encore (Stripe réessaie), `paused` peut repartir.
 * Ne garder que `active` laisserait tourner un abonnement en impayé,
 * c'est à dire exactement celui qu'une cliente veut arrêter.
 */
const VIVANTS = new Set(["active", "trialing", "past_due", "unpaid", "paused"]);

export function estAbonnementVivant(status: unknown): boolean {
  return VIVANTS.has(String(status ?? "").trim().toLowerCase());
}

export interface AbonnementOwner {
  id: string;
  status: string;
  /** Fin de la période déjà payée, en ISO. `null` si Stripe ne la donne pas. */
  finLe: string | null;
}

/** Les secondes de Stripe en ISO. `exp`/`current_period_end` sont en SECONDES. */
export function secondesEnIso(v: unknown): string | null {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n * 1000).toISOString();
}

/**
 * Lit la liste renvoyée par Stripe, SANS supposer sa forme.
 *
 * C'est la leçon du drame Ivan : on ne raisonne pas sur la forme
 * supposée d'un payload. Une entrée illisible est ignorée, jamais
 * devinée.
 */
export function lireAbonnements(json: unknown): AbonnementOwner[] {
  const data = (json as { data?: unknown } | null)?.data;
  if (!Array.isArray(data)) return [];
  const sortie: AbonnementOwner[] = [];
  for (const brut of data) {
    const o = brut as { id?: unknown; status?: unknown } | null;
    const id = String(o?.id ?? "").trim();
    if (!id) continue;
    sortie.push({
      id,
      status: String(o?.status ?? "").trim().toLowerCase(),
      // La date de fin a quitté la racine de l'abonnement pour ses
      // LIGNES dans les versions récentes de l'API : `finLe` est la
      // date qu'on ANNONCE à quelqu'un qui résilie ("ton accès tient
      // jusqu'au ..."). Lue au seul premier niveau, elle disparaissait
      // de l'écran sans qu'aucune erreur ne le dise.
      finLe: secondesEnIso(finDePeriodeAbonnement(brut)),
    });
  }
  return sortie;
}

const STRIPE_API = "https://api.stripe.com";

/**
 * Les abonnements VIVANTS de ce client chez nous.
 *
 * `status=all` volontaire : le filtre `status=active` de Stripe exclut
 * `past_due` et `trialing`, donc laisserait en place l'abonnement qu'on
 * cherche justement à arrêter. On filtre nous mêmes, avec notre
 * définition, qui est testée.
 */
export async function listerAbonnementsOwner(
  key: string,
  customerId: string,
): Promise<{ ok: boolean; abonnements: AbonnementOwner[] }> {
  const id = String(customerId ?? "").trim();
  if (!id) return { ok: true, abonnements: [] };
  try {
    const res = await fetch(
      `${STRIPE_API}/v1/subscriptions?customer=${encodeURIComponent(id)}&status=all&limit=100`,
      { headers: { Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) {
      console.error(`[abonnement] liste refusee par Stripe pour ${id} : HTTP ${res.status}`);
      // `ok: false` et pas une liste vide : "je n'ai pas pu regarder" et
      // "il n'y a rien" n'appellent pas la même suite. Confondre les deux
      // ferait retirer un plan alors qu'un prélèvement continue.
      return { ok: false, abonnements: [] };
    }
    const json = await res.json();
    return { ok: true, abonnements: lireAbonnements(json).filter((a) => estAbonnementVivant(a.status)) };
  } catch (e) {
    console.error(`[abonnement] liste injoignable : ${(e as Error).message}`);
    return { ok: false, abonnements: [] };
  }
}

/**
 * Arrête un abonnement chez Stripe.
 *
 * `fin-de-periode` -> `cancel_at_period_end=true` : plus aucun
 * prélèvement, l'accès tient jusqu'à la date déjà payée, et Stripe
 * enverra `customer.subscription.deleted` ce jour là. C'est notre
 * webhook qui coupera, donc une seule décision, à un seul endroit.
 *
 * `immediat` -> `DELETE` : l'abonnement meurt maintenant.
 */
export async function annulerAbonnementOwner(
  key: string,
  subscriptionId: string,
  quand: CancelQuand,
): Promise<{ ok: boolean; finLe: string | null; reason?: string }> {
  const id = String(subscriptionId ?? "").trim();
  if (!id) return { ok: false, finLe: null, reason: "no_subscription" };
  try {
    const res =
      quand === "immediat"
        ? await fetch(`${STRIPE_API}/v1/subscriptions/${encodeURIComponent(id)}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${key}` },
          })
        : await fetch(`${STRIPE_API}/v1/subscriptions/${encodeURIComponent(id)}`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "cancel_at_period_end=true",
          });
    const json = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    if (!res.ok) {
      const detail = json.error?.message ?? `HTTP ${res.status}`;
      console.error(`[abonnement] Stripe refuse d'arreter ${id} : ${detail}`);
      // LA CAUSE LA PLUS PROBABLE EST UNE PERMISSION MANQUANTE : la clé
      // restreinte doit avoir "Abonnements" en ÉCRITURE. Le serveur
      // renvoie la RAISON, l'écran sait comment le dire.
      const manquePermission = res.status === 403 || /permission|not have access/i.test(detail);
      return { ok: false, finLe: null, reason: manquePermission ? "missing_permission" : "provider_refused" };
    }
    return { ok: true, finLe: secondesEnIso(finDePeriodeAbonnement(json)) };
  } catch (e) {
    console.error(`[abonnement] reseau : ${(e as Error).message}`);
    return { ok: false, finLe: null, reason: "network" };
  }
}

/**
 * ARRÊTE TOUS LES ABONNEMENTS VIVANTS D'UN CLIENT STRIPE.
 *
 * Sert deux chemins : l'annulation demandée, et le REMBOURSEMENT. Le
 * second est le plus important, parce que l'oubli y coûte de l'argent
 * dans le mauvais sens : rembourser sans arrêter l'abonnement re-prélève
 * le mois suivant quelqu'un dont l'accès est déjà fermé.
 */
export async function arreterAbonnementsStripe(
  key: string,
  customerId: string,
  quand: CancelQuand,
): Promise<{ ok: boolean; arretes: string[]; reason?: string }> {
  const liste = await listerAbonnementsOwner(key, customerId);
  if (!liste.ok) return { ok: false, arretes: [], reason: "unreadable" };
  const arretes: string[] = [];
  let echec: string | undefined;
  for (const abo of liste.abonnements) {
    const r = await annulerAbonnementOwner(key, abo.id, quand);
    if (r.ok) arretes.push(abo.id);
    else echec = echec ?? r.reason ?? "provider_refused";
  }
  return { ok: !echec, arretes, reason: echec };
}
